const client = require("./mongoClient");
const axios = require('axios');
const util = require("./util");
const sqlClient = require("./sqlClient");
const consumtionClient = require("./sqlClientConsumption");
const config = require('../config');
const async = require("async");
const { getDataTobeStored, handleErrorWhileDataStore } = require("./shared");
const { allowDataStoreInSQL } = require("./sqlMappingData");

const connectDatabase = async () => {
    try {
        const con = await client.connect();
        const dbName = client.db(config.mongoDBName).databaseName;

        console.log(`Mongo Database successfully connected with ${dbName} at ${new Date().toUTCString()}`);
    } catch (err) {
        console.log(`Mongo Database connection Error:- at ${new Date().toUTCString()} `);
        console.log(err);
    } finally {
        // await client.close();
    }
}

connectDatabase().then(() => {
    console.log("MongoDB Connect Promise fulfilled.");
    connectSqlDatabase().then(() => {
        console.log(`PostgreSQL Connect Promise fulfilled.`);

        if ((config.sqlDBHost === config.consumptionSqlDBHost) && (config.sqlDBName === config.consumptionSqlDBName)) {
            console.log("No new connection created for consumption_db becoz both dbHost and dbName are same.");
        }
        else {
            connectConsumptionDatabase().then(() => {
                console.log(`Consumption DB PostgreSQL Connect Promise fulfilled.`);
            }).catch((error) => {
                console.log(`Consumption DB PostgreSQL Database connection Error:- at ${new Date().toUTCString()} `);
                console.log(error);
            })
        }

    }).catch((error) => {
        console.log(`PostgreSQL Database connection Error:- at ${new Date().toUTCString()} `);
        console.log(error);
    })
}).catch((err) => {
    console.log(`Mongo Database connection Error from connectDatabase method :- at ${new Date().toUTCString()} `);
    console.log(err);
});

const connectSqlDatabase = async () => {
    let connect;
    try {
        connect = await sqlClient.connect();
        console.log(`PostgreSQL Database successfully connected with ${connect.database} at ${new Date().toUTCString()}`);
    } catch (error) {
        console.log(`Got PostgreSQL Connection Error:- at ${new Date().toUTCString()}`);
        console.log(error);
    }
    finally {
        if (connect)
            connect.release();
    }
}

const connectConsumptionDatabase = async () => {
    let connect;
    try {
        connect = await consumtionClient.connect();
        console.log(`PostgreSQL Consumption Database successfully connected with ${connect.database} at ${new Date().toUTCString()}`);
    } catch (error) {
        console.log(`Got Consumption DB PostgreSQL Connection Error:- at ${new Date().toUTCString()}`);
        console.log(error);
    }
    finally {
        if (connect)
            connect.release();
    }
}

class DB {
    getDatabase(dbName) {
        return client.db(dbName);
    }

    //common util method to update a document by sending docRef, filter & data
    updateInDB(dbRef, filter, document, callback, calledFrom = "") {
        try {
            if (document._id) delete document._id;
            if (document.submittedOn) delete document.submittedOn;
            if (document.oldPassword) delete document.oldPassword;
            
            if (calledFrom !== 'LogIn') {
                document.lastUpdatedOn = util.generateTimestamp();
            }
            
            let that = this;
            let isDataStoreAllowedInSQL = false;
            
            if (dbRef.collectionName == "document_metadata" && document.documentId) {
                async.waterfall(
                    [
                        function (callback) {
                            let projection = { projection: { rawPrediction: 0, _id: 0 } };
                            let documentId = document.documentId;
                            
                            dbRef.findOne({
                                documentId: documentId,
                            }, projection,
                            function (err, doc) {
                                if (err) {
                                    console.log(`In updateInDB method, some error occured while quering mongodb for documentId ${documentId} at ${new Date().toUTCString()}`);
                                    console.log(err);
                                    callback(err, null);
                                } else if (!doc) {
                                    console.log(`In updateInDB method, Document not found in mongodb for documentId ${documentId} at ${new Date().toUTCString()}`);
                                    callback("Document not Found", null);
                                } else {
                                    let status_from = doc.status;
                                    let status_to = document.status;
                                    
                                    //check data should be update/store in SQL DB or not --> 08-02-2023
                                    isDataStoreAllowedInSQL = allowDataStoreInSQL(doc, document);
                                    console.log(`In updateInDB method, isDataStoreAllowedInSQL Stauts : ${isDataStoreAllowedInSQL}`);
                                    
                                    if (status_from && status_to && status_from !== status_to) {
                                        if (JSON.parse(config.statusChangeEventConfig).eventTrigger == 1) {
                                            console.log(`In updateInDB method, condition matches for triggering event. So entering in triggerEventOnStatusChange method for documentId ${document.documentId}..`);
                                                document["status_from"] = status_from;
                                                document["status_to"] = status_to;
                                                that.triggerEventOnStatusChange(document, doc, callback) //updated API 12-10-2022
                                            }
                                            else{
                                                //code changed for documents not getting updated on click of DONE button when eventTrigger flag is 0
                                                callback(null, false);
                                            }
                                        }
                                        else {
                                            console.log(`In updateInDB method, document found, but condition (status_from !== status_to) doesn't matched at ${new Date().toUTCString()}...becoz document details were as follows..`);
                                            console.log(`documentId:- ${documentId}, status_from:- ${status_from}, status_to:- ${status_to}`);
                                            callback(null, false);
                                        }
                                    }
                                }
                            );
                        }
                    ],
                    function (err, doc) {
                        console.log(`<----After check for triggerEvent for documentId ${document.documentId} at ${new Date().toUTCString()}, Response was---->`);
                        console.log(`Err:${err}, Result:${doc}`);
                        console.log(`Now updating metadata collection for documentId ${document.documentId} at ${new Date().toUTCString()}..`);

                        if (document.status_from)
                            delete document.status_from;
                        if (document.status_to)
                            delete document.status_to;

                        that.saveData(dbRef, filter, document, callback, 0, isDataStoreAllowedInSQL);
                    }
                );
            }
            else {
                that.saveData(dbRef, filter, document, callback, 1, isDataStoreAllowedInSQL);
            }
        } catch (error) {
            console.log(`Error occured in updateInDB method for documentId ${document.documentId} :- at ${new Date().toUTCString()}..`);
            console.log(error);
            callback(null, {});
        }
    }

    saveData(dbRef, filter, document, callback, calledFrom, conditionForDataStoreInSQL) {

        dbRef.findOneAndUpdate(
            filter, {
            $set: document
        }, {
            upsert: false,
            returnOriginal: false
        },
            function (err, result) {
                if (err) {
                    console.log(`Update collection failed for documentId ${document.documentId} at ${new Date().toUTCString()} from saveData method because..`);
                    console.log(err);
                    util.handleServerError(err, result, callback);
                    return;
                }
                if (!result) {
                    console.log(`Result not came while saving data in mongodb for documentId ${document.documentId} at ${new Date().toUTCString()} from saveData method.`);
                    util.handleServerError(err, result, callback);
                    return;
                }
                if (result && result.value && result.value._id) {
                    delete result.value._id;
                    if (calledFrom == 0) {
                        console.log(`Document Metadata successfully updated and exited from saveData method at ${new Date().toUTCString()}.`);
                    }
                    //TODO new changes for 12-10-2022
                    if (conditionForDataStoreInSQL && config.storeDataInPostgreSQL == 1) {
                        console.log(`Both Condition matches for storing DataInPostgreSQL. So entering in getDataTobeStored method for documentId ${document.documentId}..`);
                        getDataTobeStored(document.documentId)
                    }
                }

                util.handleServerError(err, result.value, callback);
            }
        );
    }

    //TODO NEW method that will be triggered from updateResult API when doc status is changes.
    triggerEventOnStatusChange = async (document, doc, callback) => {
        console.log("");
        console.log(`Entered in triggerEventOnStatusChange method.. at ${new Date().toUTCString()}`);

        let docCopy = JSON.parse(JSON.stringify(doc));
        let documentCopy = JSON.parse(JSON.stringify(document));

        const { documentId, status_from, status_to } = document;
        const { rootPath, aegSasKey, topic, subject, eventType } = JSON.parse(config.statusChangeEventConfig);
        const headers = { 'Content-Type': 'application/json', 'aeg-sas-key': aegSasKey }

        if (docCopy && docCopy.rawPrediction) {
            delete docCopy.rawPrediction;
        }

        if (documentCopy && documentCopy.rawPrediction) {
            delete documentCopy.rawPrediction;
        }

        console.log("Old Document details inside triggerEventOnStatusChange as follows:-" + JSON.stringify(docCopy));
        console.log("");
        console.log("New Document details inside triggerEventOnStatusChange as follows:-" + JSON.stringify(documentCopy));

        let merged = { ...docCopy, ...documentCopy };
        let dataPayload = {
            status_from: status_from,
            status_to: status_to,
            documentId: documentId,
            document: merged
        }

        if (status_to == 'DELETED' && document.deleteReason) {
            dataPayload["reason"] = document.deleteReason;
        }

        const eventPayload = [{
            topic,
            subject,
            eventType,
            eventTime: new Date().toISOString(),
            id: new Date().toISOString(),
            data: dataPayload,
            dataVersion: "",
            metadataVersion: "1"
        }]

        console.log("");
        console.log(`Final Payload sent to triggerEvent API for documentId ${documentId} was...at ${new Date().toUTCString()}`);
        console.log(JSON.stringify(eventPayload));
        console.log("");

        try {
            const response = await axios.post(rootPath, eventPayload, { headers: headers })
            if (response && response.status == 200) {
                console.log(`Exited from triggerEventOnStatusChange method after Microsoft trigger event successfully for documentId ${documentId}. at ${new Date().toUTCString()}`);
                callback(null, true);
            } else {
                console.log(`Exited from triggerEventOnStatusChange method without trigger for documentId ${documentId} bcoz:-.at ${new Date().toUTCString()}`);
                console.log(response);
                callback(null, false);
            }
        } catch (error) {
            console.log(`Exited from triggerEventOnStatusChange function with below error for documentId ${documentId} at ${new Date().toUTCString()}`);
            console.log(error);
            callback(null, false);
        }
    }
}

module.exports = new DB();
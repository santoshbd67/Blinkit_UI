const _ = require("lodash");
const async = require("async");
const config = require("../config");
const dbutil = require("../util/db");
const resUtil = require("../util/resUtil");
const util = require("../util/util");
const validator = require("../util/validatorUtil");
const axios = require('axios');
const extractionResultUtil = require("../util/extractionResultUtil");

const db = dbutil.getDatabase(config.mongoDBName);
const userCollection = db.collection("users");
const docCollection = db.collection("document_metadata");
const resultCollection = db.collection("document_result");
const roleCollection = db.collection("roles");
const userVendorMapCollection = db.collection("UserVendorMap");
const analyticsMetadataColl = db.collection("document_analytics_metadata");
const rawPredictionCollection = db.collection("document_rawPrediction");

const externalService = require("./externalService");
const sharedService = require('./sharedService');
const tokenService = require("./tokenService");
const reportService = require("./reportService");
const { selectQuery } = require("../util/sqlQueries");

class DocumentService {
    constructor(config) {
        this.config = config;
    }

    /*
     * API to add a document to the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Create a document id and insert a new record into the document_metadata table
     * 3. Call the preprocessor
     * 4. Update document_metadata table with response of the preprocessor
     *
     * @param {HttpRequest} req
     * @param {HttpResponse} res
     */
    addDocument(req, res) {
        let reqData = req.body.request;
        const that = this;
        const apiParams = {
            id: "api.document.add",
            msgid: req.body.params ? req.body.params.msgid : "",
        };
 
        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {                   
            console.log(`${new Date().toUTCString()} : Entered addDocument - documentId ${reqData.documentId}`);
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "addDocument", callback);
                },
                function (validatorRes, callback) {
                    docCollection.countDocuments({ documentId: reqData.documentId },
                        function (err, count) {
                            if (err) {
                                callback({
                                    status: 500,
                                    err: "INTERNAL_SERVER_ERROR",
                                    errmsg: "Error while adding document",
                                },
                                    null
                                );
                            } else if (count) {
                                if (
                                    reqData.checkDuplicate !== null &&
                                    reqData.checkDuplicate === "true"
                                ) {
                                    console.log(`${new Date().toUTCString()} : checkDuplicate in Payload, document already exists Duplicate Document Id error - documentId ${reqData.documentId}`);
                                    callback({
                                        status: 409,
                                        err: "CONFLICT",
                                        errmsg: "Duplicate Document Id",
                                    },
                                        null
                                    );
                                } else {
                                    callback(null, validatorRes);
                                }
                            } else {
                                callback(null, validatorRes);
                            }
                        }
                    );
                },
                function (value1, callback) {
                    value1.submittedOn = util.generateTimestamp();
                    value1.status = "NEW";
                    value1["ace"] = 2; //added on 22/08/2022
                    docCollection.replaceOne({ documentId: value1.documentId },
                        value1, { upsert: true },
                        function (err, document) {
                            if (document && document.ops && document.ops.length)
                                util.handleServerError(err, document.ops[0], callback);
                            else util.handleServerError(err, null, callback);
                        }
                    );
                },
                function (value2, callback) {
                    externalService.callPreprocessor(req.body, callback);
                },
                function (value3, callback) {
                    if(config.DETAILED_LOGGING == 1){
                        console.log(`${new Date().toUTCString()} : Preprocessor Response - documentId ${reqData.documentId}`);
                        console.log(value3);
                    }
                    value3.result.documentId = reqData.documentId;

                    const filter = {
                        documentId: value3.result.documentId,
                    };

                    config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : calling updateInDB - documentId ${reqData.documentId}`);
                    dbutil.updateInDB(docCollection, filter, value3.result, callback);
                },
                function (documentData, callback) {
                    if (reqData.create_rpa_data === true && documentData) {
                        config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : Condition satisfied for RPA metadata insertion - documentId ${reqData.documentId}`);
                        reportService.insertRPAData(documentData);
                    }
                    callback(null, documentData);
                }
            ],
            function (err, result) {
                if (err) {
                    console.log(`${new Date().toUTCString()} : Error in addDocument API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    console.log(err);
                    resUtil.handleError(req, res, err);
                    return;
                }
                
                if (!result) {
                    console.log(`${new Date().toUTCString()} : No result in addDocument API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                // Jhasketan / Radha - can we send back the result from the updated data from Pre-processor in the result here.
                // Line 120 value3.result - needs to be sent back instead of result.
                config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : success addDocument - documentId ${reqData.documentId}`);

                resUtil.OK(res, apiParams, result);
                return;
            }
        );
    }

    /*
    * API to update a document to the TAPP service. Following are the step performed in the API sequentially.
    * 1. Validate the request
    * 2. Update the document 
    * 3. Call the extraction service
    * 4. Update document with the response

    * @param {HttpRequest} req 
    * @param {HttpResponse} res 
    */
    updateDocument(req, res) {
        let reqData = req.body.request;
        const that = this;
        const apiParams = {
            id: "api.document.update",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {
            console.log(`${new Date().toUTCString()} : Entered updateDocument - documentId ${reqData.documentId}`);
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "updateDocument", callback);
                },
                function (data, callback) {
                    if(reqData.status === 'REASSIGN'){
                        userCollection.find({ userId: req.headers.userid }).limit(1).toArray(function (err, userDetails) {
                            if (userDetails) {
                                if (userDetails && userDetails.length) {
                                    data['reassignedBy'] = userDetails[0].emailId;
                                    callback(null, data);
                                } else { // when no user found with given userId
                                    data['reassignedBy'] = sharedService.encrypt("InvalidUser");
                                    callback(null, data)
                                }
                            } else { // when some error occured while querying.
                                data['reassignedBy'] = sharedService.encrypt("QueryError");
                                callback(null, data)
                            }
                        });
                    }else{
                        callback(null,data)
                    }
                },
                function (value1, callback) {
                    if(config.DETAILED_LOGGING == 1){
                        console.log(`${new Date().toUTCString()} : updateDocument Success validate - documentId ${reqData.documentId}`);
                        console.log(value1);
                    }
                    const filter = {
                        documentId: value1.documentId,
                    };
                    // check stp is present while update document and if stp is true then set ACE to Yes(1) too.
                    if (value1 && value1.stp && value1.stp == true) {
                        value1["ace"] = 1;
                    }
                    dbutil.updateInDB(docCollection, filter, value1, callback);
                },
                function (updateRes, callback) { // Added newly 27-07-2022
                    config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : updateDocument Success updateInDB 1 - documentId ${reqData.documentId}`);
                    

                    if (updateRes && updateRes.status && updateRes.status == "NEW") {
                        config.DETAILED_LOGGING == 1 && console.log('document status NEW');
                        externalService.callPreprocessor(req.body, callback);
                    } else {
                        config.DETAILED_LOGGING == 1 && console.log('document status others');
                        callback(null, updateRes);
                    }
                },
                function (value2, callback) {
                    config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : updateDocument Success callPreprocessor - documentId ${reqData.documentId}`);
                    if (value2 && value2.status && value2.status == "READY_FOR_EXTRACTION" && config.autoExtraction === "true") {
                        config.DETAILED_LOGGING == 1 && console.log("READY_FOR_EXTRACTION");
                        externalService.callExtraction(req.body, callback);
                    }
                    else if (value2 && value2.result) {
                        config.DETAILED_LOGGING == 1 && console.log("Result exist after callPreprocessor");
                        callback(null, value2);
                    }
                    else {
                        config.DETAILED_LOGGING == 1 && console.log("Result not exist");
                        callback(null, true);
                    }
                },
                function (value3, callback) {
                    config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : updateDocument Success callExtraction - documentId ${reqData.documentId}`);
                    if (value3 && typeof value3 == "boolean") {
                        config.DETAILED_LOGGING == 1 && console.log("If value3 is boolean");
                        callback(null, reqData);
                    } else {
                        config.DETAILED_LOGGING == 1 && console.log("If value3 is not boolean");
                        value3.result.documentId = reqData.documentId;
                        const filter = {
                            documentId: value3.result.documentId,
                        };
                        dbutil.updateInDB(docCollection, filter, value3.result, callback);
                    }
                },
                function (updateRes, callback) {
                    config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : updateDocument Success updateInDB 2 - documentId ${reqData.documentId}`);
                    if (updateRes && updateRes.status) {
                        config.DETAILED_LOGGING == 1 && console.log(`updateRes status ${updateRes.status}`);
                        resultCollection.findOneAndUpdate(
                            { documentId: reqData.documentId }, {
                            $set: { status: updateRes.status }
                        }, {
                            upsert: false,
                            returnOriginal: false
                        },
                            function (err, result) {
                                if (err) {
                                    console.log(`${new Date().toUTCString()} : Error in resultCollection findOneAndUpdate - documentId ${reqData.documentId}`);
                                    console.log(err);
                                }
                                if (!result) {
                                    console.log(`${new Date().toUTCString()} : Result NULL in resultCollection findOneAndUpdate - documentId ${reqData.documentId}`);
                                }
                                callback(null, updateRes);
                            }
                        );
                    } else {
                        config.DETAILED_LOGGING == 1 && console.log(`updateRes status others`);
                        callback(null, updateRes);
                    }
                }
            ],
            function (err, resultData) {
                if (err) {
                    console.log(`${new Date().toUTCString()} : Error in updateDocument API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    console.log(err);
                    resUtil.handleError(req, res, err);
                    return;
                }
                if (!resultData) {
                    console.log(`${new Date().toUTCString()} : No result in updateDocument API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }
                config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : success updateDocument - documentId ${reqData.documentId}`);
                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /*
    * API to remove a document to the TAPP service. Following are the step performed in the API sequentially.
    * 1. Validate the request
    * 2. Remove the document from mongoDB
    * 3. Remove the document from sql
    * 4. documentId's should match in payload and params
    */
    removeDocument(req, res) {
        let reqData = req.body.request;
        const apiParams = {
            id: "api.document.remove",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        
        if (req.params.id !== reqData.documentId) {
            apiParams.err = "Invalid Request";
            apiParams.errmsg = reqData.documentId? "documentId's not matching" : "documentId not found in payload";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {
            console.log(`${new Date().toUTCString()} : Entered removeDocument - documentId ${reqData.documentId}`);
        }

        const whereClause = `document_id='${reqData.documentId}'`

        async.waterfall(
            [
                function (callback) {
                    validator.validate({documentId:reqData.documentId}, "removeDocument", callback);
                },
                function (filter, callback) {
                    docCollection.findOneAndDelete(filter,function(err,result){
                        let responseMsg = "Not Found";   
                        if(err){
                            responseMsg = "Error in docCollection findOneAndDelete";
                            console.log(responseMsg);
                            console.log(err);
                        }

                        if(!result){
                            responseMsg = "Result is NULL in docCollection findOneAndDelete";
                            console.log(responseMsg);
                        }

                        if(result){
                            responseMsg = result.value? "Success" : responseMsg;
                        }

                        callback(null,{filter,document_metadata:responseMsg})
                    })
                },
                function (value1, callback) {
                    resultCollection.findOneAndDelete(value1.filter,function(err,result){
                        let responseMsg = "Not Found";   
                        if(err){
                            responseMsg = "Error in resultCollection findOneAndDelete";
                            console.log(responseMsg);
                            console.log(err);
                        }

                        if(!result){
                            responseMsg = "Result is NULL in resultCollection findOneAndDelete";
                            console.log(responseMsg);
                        }

                        if(result){
                            responseMsg = result.value? "Success" : responseMsg;
                        }

                        callback(null,{...value1,document_result:responseMsg})
                    })
                },
                function (value2, callback) {
                    reportService.generateQuery('delete', config.metaDataTable, whereClause).then(response=>{
                        let responseMsg = "Not Found";   
                        if(response.code == "EXEC_FAILED"){
                            responseMsg = "Failure";
                        }                  
                        if (response && response.rowCount > 0) {
                            responseMsg = "Success"
                        }

                        callback(null,{...value2,[config.metaDataTable]: responseMsg})
                    })
                },
                function (value3, callback) {
                    reportService.generateQuery('delete', config.resultDataTable, whereClause).then(response=>{     
                        let responseMsg = "Not Found";
                        if(response.code == "EXEC_FAILED"){
                            responseMsg = "Failure";
                        } 
                        if (response && response.rowCount > 0) {
                            responseMsg = "Success"
                        }
                        callback(null,{...value3,[config.resultDataTable]:responseMsg})
                    })
                },
                function (value4, callback) {
                    reportService.generateQuery('delete', config.rpaMetaDataTable, whereClause).then(response=>{                    
                        let responseMsg = "Not Found"; 
                        if(response.code == "EXEC_FAILED"){
                            responseMsg = "Failure";
                        }
                        if (response && response.rowCount > 0) {
                            responseMsg = "Success"
                        }
                        callback(null,{...value4,[config.rpaMetaDataTable]:responseMsg})
                    })
                }
            ],
            function (err, resultData) {
                if (err) {
                    console.log(`${new Date().toUTCString()} : Error in removeDocument API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    console.log(err);
                    resUtil.handleError(req, res, err);
                    return;
                }
                if (!resultData) {
                    console.log(`${new Date().toUTCString()} : No result in removeDocument API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }
                delete resultData.filter
                config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : success removeDocument - documentId ${reqData.documentId}`);
                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /*
     * API to get document metadata from documentId . Following are the step performed in the API sequentially.
     * 1. Send the document metadata for the requested documentId
     */
    getDocument(req, res) {
        const apiParams = {
            id: "api.document.get",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };
        if (!(apiParams && apiParams.id)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        let result = {};

        let userId = req.headers.userId;
        let projection = { _id: 0 };

        if (userId) {
            projection = { _id: 0, rawPrediction: 0 }
        }
        let that = this;
        docCollection.findOne({
            documentId: req.params.id
        }, { projection: projection },
            function (err, doc) {
                if (err) {
                    apiParams.err = err;
                    return resUtil.ERROR(res, apiParams, result);
                }
                if (!doc) {
                    return resUtil.NOTFOUND(res, apiParams, result);
                }
                that.decryptDocData(doc)
                result.document = doc;
                return resUtil.OK(res, apiParams, result);
            }
        );
    }

    /*
     * API to add a document result to the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Add result data to DB
     * @param {HttpRequest} req
     * @param {HttpResponse} res
     */
    addResult(req, res) {
        let reqData = req.body.request;
        const apiParams = {
            id: "api.result.add",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        const that = this;

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {
            console.log(`${new Date().toUTCString()} : Entered addResult - documentId ${reqData.documentId}`);
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "addResult", callback);
                },
                function (validatorRes, callback) {
                    resultCollection.countDocuments({ documentId: reqData.documentId },
                        function (err, count) {
                            if (err) {
                                callback({
                                    status: 500,
                                    err: "INTERNAL_SERVER_ERROR",
                                    errmsg: "Error while adding document result",
                                },
                                    null
                                );
                            } else if (count) {
                                console.log(`${new Date().toUTCString()} : document already exists, Duplicate Document Id error - documentId ${reqData.documentId}`);
                                callback({
                                    status: 409,
                                    err: "CONFLICT",
                                    errmsg: "Duplicate Document Id",
                                },
                                    null
                                );
                            } else {
                                callback(null, validatorRes);
                            }
                        }
                    );
                },
                function (response, callback) {

                    // encrypt fields value before saving.
                    that.encryptFieldValues(response);

                    resultCollection.insertOne(response, function (err, document) {
                        util.handleServerError(err, document.ops[0], callback);
                    });
                },
                function (response2, callback) {
                    // get total fields, overall accuracy and number of errors from the result. store this info in document metadata.
                    that
                        .calculateAccuracy(response2)
                        .then((res) => {
                            let payload;

                            // commented to fix the issue status changes from ExtractionInProgress to REVIEW_COMPLETED as on 15-06-2022

                            // if (res >= config.confidenceThreshold) {
                            //     if (config.reviewSubmitURL) {
                            //         externalService.callAfterReviewComplete();
                            //     }
                            //     that.mergeResultToMetadata(reqData,"AddResult");

                            //     payload = {
                            //         documentId: reqData.documentId,
                            //         status: "REVIEW_COMPLETED",
                            //         statusMsg: "Review is Complete"
                            //     };
                            // }
                            // else {
                            //     payload = {
                            //         documentId: reqData.documentId,
                            //         status: "REVIEW",
                            //     };
                            // }

                            payload = {
                                documentId: reqData.documentId
                            };

                            let resultAggregates = extractionResultUtil.getAggregates(reqData);

                            _.assign(payload, resultAggregates);

                            const filter = {
                                documentId: payload.documentId,
                            };
                            config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : calling mergeResultToMetadata - documentId ${reqData.documentId}`);
                            that.mergeResultToMetadata(response2, "AddResult"); //Added on 23-01-2023 by Kanak
                            dbutil.updateInDB(docCollection, filter, payload, callback);
                        })
                        .catch((err) => {
                            callback({
                                status: 500,
                                err: "INTERNAL SERVER ERROR",
                                errmsg: "Error while updating the document status",
                            },
                                null
                            );
                        });
                },
            ],
            function (err, result) {
                if (err) {
                    console.log(`${new Date().toUTCString()} : Error in AddResult API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    console.log(err);
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!result) {
                    console.log(`${new Date().toUTCString()} : No result in AddResult API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }
                config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : success AddResult - documentId ${reqData.documentId}`);
                resUtil.OK(res, apiParams, result);
                return;
            }
        );
    }

    /*
     * API to get document result from documentId . Following are the step performed in the API sequentially.
     * 1. Send the document result for the requested documentId
     */
    getResult(req, res) {
        let apiParams = {
            id: "api.result.get",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        if (!(apiParams && apiParams.id)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : Entered getResult - documentId ${req.params.id}`);

        let isKeyProvided = false;
        if (req.headers.tokenid === config.tokenId) {
            isKeyProvided = true;
        }
        let result = {};
        let that = this;

        if (!isKeyProvided) {
            config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : called from outside UI - documentId ${req.params.id}`);
            resultCollection.findOne({
                documentId: req.params.id,
            },
                function (err, doc) {
                    if (err) {
                        apiParams.err = err;
                        return resUtil.ERROR(res, apiParams, result);
                    }
                    if (!doc) {
                        apiParams.err = "document not found";
                        return resUtil.NOTFOUND(res, apiParams, result);
                    }
                    that.decryptDocData(doc);
                    that.decryptFieldValues(doc);
                    result.document = doc;

                    console.log(`${new Date().toUTCString()} : success  getResult - documentId ${req.params.id}`);
                    return resUtil.OK(res, apiParams, result);
                }
            );
        }
        else {
            config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : called from inside UI - documentId ${req.params.id}`);
            async.waterfall(
                [
                    function (callback) {
                        resultCollection.findOne({
                            documentId: req.params.id,
                        }, function (err, doc) {
                            if (err) {
                                apiParams.err = err;
                                return resUtil.ERROR(res, apiParams, result);
                            }
                            if (!doc) {
                                apiParams.err = "document not found";
                                return resUtil.NOTFOUND(res, apiParams, result);
                            }
                            callback(null, doc)
                        }
                        );
                    },
                    function (docRes, callback) {
                        that.decryptFieldValues(docRes);
                        callback(null, docRes)
                    },
                ],
                function (err, doc) {
                    if (err) {
                        console.log(`${new Date().toUTCString()} : Error in getResult API - documentId ${req.params.id}`);
                        console.log(err);
                        apiParams.err = err;
                        return resUtil.ERROR(res, apiParams, result);
                    }
                    if (!doc) {
                        console.log(`${new Date().toUTCString()} : document not found getResult API - documentId ${req.params.id}`);
                        apiParams.err = "document not found";
                        return resUtil.NOTFOUND(res, apiParams, result);
                    }
                    that.decryptDocData(doc)
                    result.document = doc;
                    config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : success getResult - documentId ${req.params.id}`);
                    return resUtil.OK(res, apiParams, result);
                }
            );
        }
    }

    /*
    * API to update a document result to the TAPP service. Following are the step performed in the API sequentially.
    * 1. Validate the request
    * 2. Update the concerned document result

    * @param {HttpRequest} req 
    * @param {HttpResponse} res 
    */
    updateResult(req, res) {
        let reqData = req.body.request;
        let reviewTime = req.body.reviewTime;
        let reassignReviewTime = req.body.reassignReviewTime;
        if (reviewTime) {
            reviewTime = Math.ceil(Number(reviewTime));
        }
        if (reassignReviewTime) {
            reassignReviewTime = Math.ceil(Number(reassignReviewTime));
        }
        let reviewedBy;
        let ReviewerId;
        const action =
            req.body && req.body.params && req.body.params.action ?
                req.body.params.action :
                null;

        const apiParams = {
            id: "api.result.update",
            msgid: req.body.params ? req.body.params.msgid : "",
        };
        const that = this;
        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        let aceValue = 0;
        let reassignReviewedBy;

        if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {
            console.log(`${new Date().toUTCString()} : Entered updateResult - documentId ${reqData.documentId}`);
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "updateResult", callback);
                },
                function (valRes, callback) {
                    const filter = { documentId: reqData.documentId };
                    docCollection.find(filter).toArray(function (err, docs) {
                        if (docs) {
                            reqData['userId'] = docs[0].userId;
                        }
                        callback(err, docs)
                    });
                },
                function (docData, callback) {
                    if (action && action.search("submit") > -1 && req.headers.userid) {
                        userCollection.find({ userId: req.headers.userid }).limit(1).toArray(function (err, userDetails) {
                            if (userDetails && userDetails.length) {
                                ReviewerId = userDetails[0].userId;

                                if(reassignReviewTime){
                                    reassignReviewedBy = userDetails[0].emailId;
                                }else{
                                    reviewedBy = userDetails[0].emailId;
                                }

                                callback(null, userDetails[0]);
                            } else {
                                // when some error occured while querying.
                                console.log(`${new Date().toUTCString()} : error in userQueryResponse - userId ${req.headers.userid}`);
                                console.log(userDetails);
                                reviewedBy = sharedService.encrypt("QueryError");
                                ReviewerId = 0;
                                callback(null, docData)
                            }
                        });
                    } else {
                        reviewedBy = sharedService.encrypt("3rdParty");
                        ReviewerId = 1;
                        if (!req.headers.userid && config.DETAILED_LOGGING == 1) {
                            console.log(`${new Date().toUTCString()} : userid not exist - userId ${req.headers.userid}`);
                        }
                        callback(null, docData);
                    }
                },
                function (userResponse, callback) {
                    const filter = { documentId: reqData.documentId };

                    //action && action.search("submit") > -1 ? reqData.status = "REVIEW_COMPLETED" : reqData.status = "REVIEW"   //gaurav
                    if (action && action.search("submit") > -1) {
                        reqData.status = "REVIEW_COMPLETED";
                        reqData.ReviewerId = ReviewerId;
                        reqData.reviewedAt = util.generateTimestamp();
                    }
                    //  else { // on click of save status getting chaged to REVIEW 
                    //     reqData.status = "REVIEW"; 
                    // }
                    // encrypt fields value before saving.
                    if(reassignReviewedBy){
                        reqData.reassignReviewedBy = reassignReviewedBy;
                    }else{
                        reqData.reviewedBy = reviewedBy;
                    }
                    aceValue = that.encryptFieldValues(reqData);

                    dbutil.updateInDB(resultCollection, filter, reqData, callback);
                },
                function (response3, callback) {
                    let payload;
                    if (action && action.search("submit") > -1) {
                        if (config.reviewSubmitURL)
                            externalService.callAfterReviewComplete(reqData);
                        payload = {
                            documentId: reqData.documentId,
                            status: "REVIEW_COMPLETED",
                            statusMsg: "Review is Complete",
                            ReviewerId: ReviewerId,
                            ace: aceValue,
                            reviewedAt: util.generateTimestamp()
                        };

                        if(reassignReviewedBy && reassignReviewTime){
                            payload['reassignReviewedBy'] = reassignReviewedBy;
                            payload['reassignReviewTime'] = reassignReviewTime;
                        }else{
                            payload['reviewedBy'] = reviewedBy;
                            payload['totalReviewedTime'] = reviewTime;
                        }

                    } else {
                        payload = {
                            documentId: reqData.documentId,
                            // status: "REVIEW", // on click of save status getting chaged to REVIEW 
                        };

                        if(reassignReviewTime){
                            payload['reassignReviewTime'] = reassignReviewTime;
                        }else{
                            payload['totalReviewedTime'] = reviewTime;
                        }

                    }

                    const filter = {
                        documentId: payload.documentId,
                    };
                    config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : calling mergeResultToMetadata - documentId ${reqData.documentId}`);
                    that.mergeResultToMetadata(reqData, "UpdateResult");
                    dbutil.updateInDB(docCollection, filter, payload, callback);
                },
            ],
            function (err, result) {
                if (err) {
                    console.log(`${new Date().toUTCString()} : Error in updateResult API - documentId ${reqData.documentId}`);
                    console.log(reqData)
                    console.log(err);
                    return resUtil.handleError(req, res, err);
                } else {
                    config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : success updateResult - documentId ${reqData.documentId}`);
                    return resUtil.OK(res, apiParams, result);
                }
            }
        );
    }

    /* 
         * API to validate all the fieldIds of the document Result.Following are the step performed in the Method sequentially.
         * 1. Validate the request
         * 2. send the request to the axios server document ID and callback url
         * 3. send the response back to the browser.
    */
    validateResult(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.result.validate",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.documentId)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {
            console.log(`${new Date().toUTCString()} : Entered validateResult - documentId ${reqData.documentId}`);
        }

        async.waterfall(
            [
                function (callback) {
                    let validateAPIPath = config.businessRuleValidationAPIRootPath + "document/BizRuleValidate";
                    let payload = {
                        documentId: reqData.documentId,
                        callBackUrl: config.callbackUrlForValidationAPI,
                        UI_validation: true
                    }
                    if(config.DETAILED_LOGGING == 1){
                        console.log(`${new Date().toUTCString()} : Url - ${validateAPIPath} called for validateResult - documentId ${reqData.documentId}`);
                        console.log(payload);
                    }

                    axios.post(validateAPIPath, payload)
                        .then(function (response) {
                            if (response && response.data) {
                                callback(null, response.data)
                            }
                            else {
                                console.log(`${new Date().toUTCString()} : Error in python validateResult API - documentId ${reqData.documentId}`);
                                console.log(response);
                                callback(null, { status: 500, msg: 'Unable to validate the rules' })
                            }
                        })
                        .catch(function (error) {
                            console.log(`${new Date().toUTCString()} : Catch Error in python validateResult API - documentId ${reqData.documentId}`);
                            console.log(error);
                            // callback(null, { status_code: 200, msg: error, list_fields: [] })
                            callback(null, { status: 500, msg: 'Unable to validate the rules' })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    console.log(`${new Date().toUTCString()} : Error in validateResult API - documentId ${reqData.documentId}`);
                    console.log(reqData);
                    console.log(err);
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    console.log(`${new Date().toUTCString()} : No result in validateResult API - documentId ${reqData.documentId}`);
                    console.log(reqData);

                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : success validateResult - documentId ${reqData.documentId}`);
                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /*
     * API to check document status from documentId whether extraction is completed or still in progress . Following are the step performed in the API sequentially.
     * 1. Send the document result for the requested documentId
     */
    checkDocStatus(req, res) {
        let apiParams = {
            id: "api.checkstatus.get",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        if (!(apiParams && apiParams.id)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        let result = {};
        docCollection.findOne({ documentId: req.query.documentId },
            function (err, doc) {
                result.document = doc;
                result.status = 'IN_PROGRESS';
                if (err) {
                    apiParams.err = err;
                    result.status = 'ERROR';
                    return resUtil.ERROR(res, apiParams, result);
                }
                if (!doc) {
                    result.status = 'ERROR';
                    return resUtil.NOTFOUND(res, apiParams, result);
                }
                if (doc.status == 'COMPLETED') {
                    result.status = 'COMPLETED';
                    return resUtil.OK(res, apiParams, result);
                }
                return resUtil.OK(res, apiParams, result);
            }
        );
    }

    /*
    * API to get Document Details from the metadata. Following are the step performed in the API sequentially.
    * 1. documentId is mandatory key in request payload
    * fetch data from doc collection on basis of docId and projection
    * return response to the client
    */
    getDocumentInfo(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.document.getInfo",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };
        if (!(reqData && reqData.documentId)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        let result = {};
        let projection = { _id: 0 }
        for (let key in reqData) {
            projection[key] = 1;
        }
        let that = this;

        docCollection.findOne({
            documentId: reqData.documentId
        }, { projection: projection },
            function (err, doc) {
                if (err) {
                    apiParams.err = err;
                    return resUtil.ERROR(res, apiParams, result);
                }
                if (!doc) {
                    return resUtil.NOTFOUND(res, apiParams, result);
                }

                that.decryptDocData(doc)
                result.document = doc;
                return resUtil.OK(res, apiParams, result);
            }
        );
    }

    /* 
   * API to get Document Details from the metadata. Following are the step performed in the API sequentially.
   * 1. documentId is mandatory key in request payload
   * fetch data from doc collection on basis of docId and projection
   * return response to the client
   */
    getRawPredictionExistance(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.document.getRawPredictionExistance",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };
        if (!(reqData && reqData.documentId)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        config.DETAILED_LOGGING == 1 && console.log(reqData);
        let result = {};
        let query = { $and: [{ 'documentId': reqData.documentId }, { "rawPrediction": { $exists: true } }] }

        rawPredictionCollection.countDocuments(query, function (err, count) {
            if (err) {
                apiParams.err = err;
                result.count = 0;
                return resUtil.ERROR(res, apiParams, result);
            }

            result.count = count;
            return resUtil.OK(res, apiParams, result);
        })
    }

    /* 
    * API to calculate the actual Consumption Data either documents or paiges. Following are the step performed in the API sequentially.
    * 1. check the CONSUMPTION_FOR from the config and on that basis calculate the ACTUAL_DATA and
    * return response to the client
    */
    async getActualConsumptionData(req, res) {

        const apiParams = {
            id: "api.document.getActualConsumptionData",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        // const filter = {
        //     //userId: req.headers.userid,
        //     status: { '$nin': ['FAILED', 'EXTRACTION_IN_PROGRESS', 'NEW'] }
        // };

        // let resObject = {
        //     ACTUAL_DATA: 0,
        //     CONSUMPTION_UNIT: config.CONSUMPTION_UNIT
        // }

        config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : Entered getActualConsumptionData`);

        let resObject = {
            ACTUAL_DATA: '-/-',
            CONSUMPTION_UNIT: 'documents'
        }

        try {
            // switch (config.CONSUMPTION_UNIT) {
            //     case 'documents':
            //         // docCollection.aggregate([{
            //         //     $match: filter,
            //         // }
            //         // ]).toArray(function (err, docs) {
            //         //     if (err) {
            //         //         apiParams.err = err;
            //         //         return resUtil.ERROR(res, apiParams, err);
            //         //     } else {
            //         //         resObject.ACTUAL_DATA = docs.length;
            //         //         return resUtil.OK(res, apiParams, resObject);
            //         //     }
            //         // });
            //         docCollection.countDocuments(filter, (err, count) => {
            //             if (err) {
            //                 apiParams.err = err;
            //                 return resUtil.ERROR(res, apiParams, err);
            //             } else {
            //                 resObject.ACTUAL_DATA = count;
            //                 return resUtil.OK(res, apiParams, resObject);
            //             }
            //         })
            //         break;
            //     case 'pages':
            //         docCollection.aggregate([{
            //             $match: filter,
            //         },
            //         {
            //             $group: {
            //                 _id: null,
            //                 totalPageCount: {
            //                     $sum: "$pageCount"
            //                 },
            //             }
            //         }
            //         ]).toArray(function (err, docs) {
            //             if (err) {
            //                 apiParams.err = err;
            //                 return resUtil.ERROR(res, apiParams, err);
            //             } else {
            //                 if (docs.length > 0) {
            //                     resObject.ACTUAL_DATA = docs[0].totalPageCount;
            //                 }
            //                 return resUtil.OK(res, apiParams, resObject);
            //             }
            //         });
            //         break;
            //     default: return resUtil.OK(res, apiParams, resObject);
            // }

            //Added new way as per Hari's suggestion by kanak on 15-03-2023
            //check whether consumption data exists or not in table
            const tableName = config.consumptionSqlDBTable;
            const subsId = config.consumptionSubscriptionId;
            let WhereClause = `sub_id='${subsId}'`;

            let ifDataExists = await selectQuery(tableName, WhereClause, 'CONSUMPTION_DB')
            config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : Checking isDataExists for consumptionDB in ${tableName} - subscriptionId ${subsId}`);

            if (ifDataExists && ifDataExists.rows && ifDataExists.rows.length > 0) {
                if(config.DETAILED_LOGGING == 1){
                    console.log("consumption_db response(only rows printing)");
                    console.log(ifDataExists.rows);
                }

                let { allotted, pages_extracted, docs_extracted, type } = ifDataExists.rows[0];

                if (allotted && pages_extracted && docs_extracted && type) {
                    if (type == 'tapp') {
                        resObject.ACTUAL_DATA = `${docs_extracted}/${allotted}`;
                        resObject.CONSUMPTION_UNIT = 'documents';
                    }
                    else {
                        resObject.ACTUAL_DATA = `${pages_extracted}/${allotted}`;
                        resObject.CONSUMPTION_UNIT = 'pages';
                    }
                }
            }
            else {
                console.log("consumption_db response");
                console.log(ifDataExists);
            }

            config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : success getActualConsumptionData`);

            return resUtil.OK(res, apiParams, resObject);

        } catch (error) {
            console.log(`${new Date().toUTCString()} : Error in getActualConsumptionData API`);
            console.log(error);
            return resUtil.ERROR(res, apiParams, error);
        }
    }

    /*
     * API to add a query for document result to the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Find the document metadata exists or not
     * 3. Create payload & send it to external sharepoint API to register a query
     * 4. If query is registered, save in document result.
     * 5. If query is not registered, show appropriate message
     */
    addQueryForResult(req, res) {
        let reqData = req.body.request;

        const action =
            req.body && req.body.params && req.body.params.action ?
                req.body.params.action :
                null;

        const apiParams = {
            id: "api.result.query.add",
            msgid: req.body.params ? req.body.params.msgid : "",
        };
        const that = this;
        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "addQueryForResult", callback);
                },
                function (validationResponse, callback) {
                    docCollection.findOne({
                        documentId: reqData.documentId,
                    },
                        function (err, doc) {
                            if (err) {
                                apiParams.err = err;
                                callback({
                                    status: 500,
                                    err: "INTERNAL SERVER ERROR",
                                    errmsg: "Unable to fetch document",
                                },
                                    null
                                );
                            } else if (!doc) {
                                // return resUtil.NOTFOUND(res, apiParams, result);
                                callback({
                                    status: 404,
                                    err: "NOT FOUND",
                                    errmsg: "Document not found",
                                },
                                    null
                                );
                            } else {
                                callback(null, doc);
                            }
                        }
                    );
                },
                function (document, callback) {
                    // const payload = { ...document, ...reqData };
                    // callback(null,payload);
                    let baseFormat = "q_x_yyyyyyyyyyy";
                    baseFormat = baseFormat.replace(/[y]/g, (c) => {
                        let r = (Math.random() * 16) | 0,
                            v = c == "x" ? r : (r & 0x3) | 0x8;
                        return v.toString(16);
                    });
                    let timestamp = new Date().getTime();
                    timestamp = timestamp.toString();
                    baseFormat = baseFormat.replace("x", timestamp);
                    reqData.queryId = baseFormat;
                    externalService.addQueryForResult(reqData, callback);
                },
                function (queryResponse, callback) {

                    resultCollection.findOne({
                        documentId: reqData.documentId,
                    },
                        function (err, doc) {
                            if (err) {
                                apiParams.err = err;
                                callback({
                                    status: 500,
                                    err: "INTERNAL SERVER ERROR",
                                    errmsg: "Unable to fetch documents",
                                },
                                    null
                                );
                            } else if (!doc) {
                                callback({
                                    status: 404,
                                    err: "NOT FOUND",
                                    errmsg: "Document not found",
                                },
                                    null
                                );
                            } else {
                                callback(null, doc);
                            }
                        }
                    );
                },
                function (document, callback) {
                    const filter = {
                        documentId: reqData.documentId,
                    };

                    let payload;
                    if (document.query && document.query.length) {
                        document.query.push(reqData);
                    } else {
                        document.query = [reqData];
                    }
                    payload = { query: document.query };
                    dbutil.updateInDB(resultCollection, filter, payload, callback);
                },
                function (updateResponse, callback) {
                    const docFilter = {
                        documentId: reqData.documentId,
                    };
                    const payload = {
                        statusMsg: "Awaiting Query Resolution"
                    };
                    dbutil.updateInDB(docCollection, docFilter, payload, callback);
                }
            ],
            function (err, result) {
                if (err) {
                    return resUtil.handleError(req, res, err);
                } else {
                    return resUtil.OK(res, apiParams, result);
                }
            }
        );
    }

    /*
    * API to update query for a document result to the TAPP service. Following are the step performed in the API sequentially.
    * 1. Validate the request
    * 2. Find the document with documentId & queryId
    * 3. Update query data in payload
    * 4. Send the payload to update the document result
    */
    updateQueryForResult(req, res) {
        let reqData = req.body.request;
        let reqParams = req.params;

        const apiParams = {
            id: "api.result.query.update",
            msgid: req.body.params ? req.body.params.msgid : "",
        };
        const that = this;
        if (!(
            req.body &&
            reqParams &&
            reqParams.documentId &&
            reqParams.queryId &&
            req.body.request &&
            typeof req.body.request == "object"
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "updateQueryForResult", callback);
                },
                function (validationResponse, callback) {
                    delete reqData.documentId;
                    delete reqData.queryId;
                    resultCollection.findOne({
                        documentId: reqParams.documentId,
                        "query.queryId": reqParams.queryId,
                    },
                        function (err, doc) {
                            if (err) {
                                apiParams.err = err;
                                callback({
                                    status: 500,
                                    err: "INTERNAL SERVER ERROR",
                                    errmsg: "Unable to retrieve query",
                                },
                                    null
                                );
                            } else if (!doc) {
                                callback({
                                    status: 404,
                                    err: "NOT FOUND",
                                    errmsg: "Query not found",
                                },
                                    null
                                );
                            } else {
                                callback(null, doc);
                            }
                        }
                    );
                },
                function (document, callback) {
                    if (document.query && document.query.length) {
                        let foundAt = -1;
                        document.query.forEach((qry, index) => {
                            if (qry.queryId === reqParams.queryId) {
                                foundAt = index;
                            }
                        });
                        document.query[foundAt] = {
                            ...document.query[foundAt],
                            ...reqData,
                        };
                        if (foundAt > -1) {
                            callback(null, document);
                        } else {
                            callback({
                                status: 404,
                                err: "NOT FOUND",
                                errmsg: "Query not found",
                            },
                                null
                            );
                        }
                    } else {
                        callback({
                            status: 404,
                            err: "NOT FOUND",
                            errmsg: "Query not found",
                        },
                            null
                        );
                    }
                },
                function (result, callback) {
                    dbutil.updateInDB(
                        resultCollection, { documentId: reqParams.documentId },
                        result,
                        callback
                    );
                },
            ],
            function (err, result) {
                if (err) {
                    return resUtil.handleError(req, res, err);
                } else {
                    return resUtil.OK(res, apiParams, result);
                }
            }
        );
    }

    /*
    * API to delete a query for a document result through the TAPP service. Following are the step performed in the API sequentially.
    * 1. Validate the request
    * 2. Find the document with documentId & queryId
    * 3. Delete the specific query data in payload
    * 4. Send the payload to update the document result after delete

    * @param {HttpRequest} req 
    * @param {HttpResponse} res 
    */
    deleteQueryForResult(req, res) {
        let reqParams = req.params;
        let mainDocument;
        const apiParams = {
            id: "api.result.query.delete",
            msgid: req.body.params ? req.body.params.msgid : "",
        };
        const that = this;
        if (!(
            reqParams &&
            reqParams.documentId &&
            reqParams.queryId
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    resultCollection.findOne({
                        documentId: reqParams.documentId,
                        "query.queryId": reqParams.queryId,
                    },
                        function (err, doc) {
                            if (err) {
                                apiParams.err = err;
                                callback({
                                    status: 500,
                                    err: "INTERNAL SERVER ERROR",
                                    errmsg: "Unable to retrieve query",
                                },
                                    null
                                );
                            } else if (!doc) {
                                callback({
                                    status: 404,
                                    err: "NOT FOUND",
                                    errmsg: "Query not found",
                                },
                                    null
                                );
                            } else {
                                callback(null, doc);
                            }
                        }
                    );
                },
                function (document, callback) {
                    mainDocument = document;
                    const payload = reqParams;
                    externalService.deleteQueryForResult(payload, callback);
                },
                function (document, callback) {
                    mainDocument.query = mainDocument.query.filter(each => each.queryId !== reqParams.queryId);
                    callback(null, mainDocument);
                },
                function (documentRes, callback) {
                    dbutil.updateInDB(
                        resultCollection, { documentId: reqParams.documentId }, { query: documentRes.query },
                        callback
                    );
                },
            ],
            function (err, result) {
                if (err) {
                    return resUtil.handleError(req, res, err);
                } else {
                    return resUtil.OK(res, apiParams, result);
                }
            }
        );
    }

    /** API to find documents
     * API to find document metadata . Following are the step performed in the API sequentially.
     * 1. Send the document metadata for the requested query
     */
    findDocuments(req, res) {
        let userReq = req.body.request;
        const apiParams = {
            id: "api.document.find",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            const that = this;
            // that.getDocuments(reqData,callback);
            async.waterfall(
                [
                    //TODO add this function to all api's call including signup
                    function (callback) {
                        if (userReq.token) {
                            tokenService.validateToken(userReq.token, callback);
                        } else {
                            callback(null, userReq);
                        }
                    },
                    //TODO added this function for client-admin role to add document-types in filter on 08-12-2022 for BCP client
                    function (tokenRes, callback) {
                        const userId = (userReq.filter && userReq.filter.userId) ? userReq.filter.userId : tokenRes.userId;
                        if (config.DOCTYPES_VISIBILITY == 1 && tokenRes.role == 'clientadmin') {
                            userCollection.findOne({
                                userId: userId
                            }, { projection: { _id: 0 } },
                                function (err, user) {
                                    if (err) {
                                        callback(err, null)
                                    }
                                    if (!user) {
                                        callback(err, null)
                                    }
                                    if (!Object.keys(userReq.filter).includes('docType')) { // for KGS                                            
                                        userReq.filter['docType'] = user.documentType
                                    }
                                    callback(null, tokenRes)
                                }
                            );
                        }
                        else {
                            callback(null, tokenRes)
                        }
                    },
                    function (tokenRes, callback) {
                        roleCollection.find({}).toArray(function (err, roles) {
                            if (roles && roles.length) {
                                callback(null, tokenRes, roles)
                            } else {
                                callback(err, tokenRes, null)
                            }
                        });
                    },
                    function (tokenRes, rolesRes, callback) {
                        if (tokenRes && tokenRes.role) {
                            userReq["role"] = tokenRes.role;

                            switch (tokenRes.role) {
                                case 'admin':
                                    if (userReq.filter.calledFrom == "user-settings")
                                        delete userReq.filter.calledFrom;
                                    if (userReq.filter.calledFrom != "extractionAssist")
                                        that.formfilterSearchKey(userReq);
                                    that.getDocuments(userReq, callback);
                                    break;
                                case 'clientadmin':
                                    // for processing route
                                    if (userReq.filter.calledFrom !== "user-settings") {
                                        // first get userIds under clientadmin domain
                                        // let useremail = sharedService.decrypt(userReq.emailId);
                                        let useremail = userReq.emailId;
                                        let userdomain = (useremail.split('@')[1]);
                                        userdomain = sharedService.encrypt(userdomain);

                                        let validRoles = ['admin'];
                                        let mappedRoleIds = that.getMappedRoleIds(rolesRes, validRoles);

                                        let filter = { role: { $nin: mappedRoleIds }, userdomain: userdomain }
                                        let userIds = [];

                                        userCollection.find(filter).sort({ userId: 1 })
                                            .toArray(function (err, users) {
                                                if (err) {
                                                    callback(null, userIds);
                                                } else {
                                                    if (users) {
                                                        users.forEach(each => {
                                                            if (each.isActive) {
                                                                userIds.push(each.userId)
                                                            }
                                                        });
                                                        userReq.filter['userId'] = userIds
                                                        if (userReq.filter.calledFrom != "extractionAssist")
                                                            that.formfilterSearchKey(userReq);
                                                        that.getDocuments(userReq, callback);
                                                    } else {
                                                        callback(null, userIds);
                                                    }
                                                }
                                            });
                                    }
                                    else { // for individual users under client domain
                                        delete userReq.filter.calledFrom;
                                        that.formfilterSearchKey(userReq);
                                        that.getDocuments(userReq, callback);
                                    }
                                    break;
                                case 'bot':
                                    // for processing route
                                    let validRoles = ['clientadmin', 'admin', 'viewer'];
                                    let mappedRoleIds = that.getMappedRoleIds(rolesRes, validRoles);

                                    rolesRes.filter((roleObj) => {
                                        if (validRoles.includes(roleObj.role)) {
                                            mappedRoleIds.push((roleObj._id).toString());
                                        }
                                    })

                                    let useremail = userReq.emailId;
                                    let userdomain = (useremail.split('@')[1]);
                                    userdomain = sharedService.encrypt(userdomain);
                                    let filter = { role: { $nin: mappedRoleIds }, userdomain: userdomain }
                                    let userIds = [];

                                    userCollection.find(filter).sort({ userId: 1 })
                                        .toArray(function (err, users) {
                                            if (err) {
                                                callback(null, userIds);
                                            } else {
                                                if (users) {
                                                    users.forEach(each => {
                                                        if (each.isActive) {
                                                            userIds.push(each.userId)
                                                        }
                                                    });
                                                    userReq.filter['userId'] = userIds;
                                                    that.formfilterSearchKey(userReq);
                                                    that.getDocuments(userReq, callback);
                                                } else {
                                                    callback(null, userIds);
                                                }
                                            }
                                        });
                                    break;
                                default: // when tokenRes.role !== "clientadmin" && tokenRes.role !== "admin" && tokenRes.role !== "bot"
                                    if (tokenRes.role == "viewer") {
                                        let useremail = userReq.emailId;
                                        let userdomain = (useremail.split('@')[1]);
                                        userdomain = sharedService.encrypt(userdomain);

                                        let validRoles = ['clientadmin', 'admin', 'viewer'];
                                        let mappedRoleIds = that.getMappedRoleIds(rolesRes, validRoles);

                                        let filter = { role: { $nin: mappedRoleIds }, userdomain: userdomain }
                                        let userIds = [];

                                        userCollection.find(filter).sort({ userId: 1 })
                                            .toArray(function (err, users) {
                                                if (err) {
                                                    callback(null, userIds);
                                                } else {
                                                    if (users) {
                                                        users.forEach(each => {
                                                            if (each.isActive) {
                                                                userIds.push(each.userId)
                                                            }
                                                        });
                                                        userIds.push(userReq.filter['userId'])
                                                        userReq.filter['userId'] = userIds;
                                                        that.formfilterSearchKey(userReq);
                                                        that.getDocuments(userReq, callback);
                                                    } else {
                                                        callback(null, userIds);
                                                    }
                                                }
                                            });
                                    }
                                    else {
                                        that.formfilterSearchKey(userReq);
                                        that.getDocuments(userReq, callback);
                                    }
                                    break;
                            }
                        } else {
                            /* assuming called from third party source 
                            added by kanak as on 10-06-2022 as per Hari's change request*/
                            config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : Find API Without token`);
                            userReq.filter = userReq && userReq.filter ? util.getSearchQuery(userReq.filter) : {};
                            if (userReq.filter.status && userReq.filter.status == 'OTHERS') {
                                // it should fetch all the status except 'FAILED','REVIEW','REVIEW_COMPLETED','DELETED'
                                userReq.filter.status = { '$nin': ['FAILED', 'REVIEW', 'REVIEW_COMPLETED', 'DELETED','REASSIGN', 'RPA_PROCESSED', 'RPA_PROCESSING', 'RPA_FAILED', 'RPA_PENDING_APPROVAL'] }
                            }
                            that.getDocuments(userReq, callback);
                            //callback(null, []);
                        }
                    }
                ],
                function (err, result) {
                    if (err) {
                        resUtil.handleError(req, res, err);
                    } else if (result) {
                        resUtil.OK(res, apiParams, result);
                    } else {
                        resUtil.BADREQUEST(res, apiParams, {});
                    }
                }
            );
        }
    }

    /*
    * API to search document metadata . Following are the step performed in the API sequentially.
    * 1. Send the search query value inside request of request body
    * 2. If it matches partially/fully with invoiceNumber or documentId it returns the matched documents
    */
    searchDocuments(req, res) {
        const apiParams = {
            id: "api.document.search",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        const that = this;

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            let userReq = req.body.request;
            async.waterfall(
                [
                    function (callback) {
                        if (userReq.token) {
                            tokenService.validateToken(userReq.token, callback);
                        } else {
                            callback(null, userReq);
                        }
                    },
                    function (tokenRes, callback) {
                        if (tokenRes && tokenRes.role) {
                            callback(null, []);
                            // if (tokenRes.role !== "admin") {
                            //     userVendorMapCollection
                            //         .find({ userId: tokenRes.userId })
                            //         .toArray(function (err, docs) {
                            //             if (err) {
                            //                 callback({
                            //                     status: 500,
                            //                     err: "INTERNAL SERVER ERROR",
                            //                     errmsg: "Unable to fetch documents",
                            //                 },
                            //                     null
                            //                 );
                            //             } else if (docs) {
                            //                 if (docs && docs.length) {
                            //                     let vendors = [];
                            //                     docs.forEach((doc) => {
                            //                         if (doc.vendorId) vendors.push(doc.vendorId);
                            //                     });

                            //                     // NEW STARTS HERE

                            //                     if (
                            //                         userReq.filter.vendorId &&
                            //                         typeof userReq.filter.vendorId === "object"
                            //                     ) {
                            //                         if (userReq.filter.vendorId.length) {
                            //                             userReq.filter.vendorId.forEach((each, index) => {
                            //                                 if (!vendors.includes(each)) {
                            //                                     delete userReq.filter.vendorId.splice(index, 1);
                            //                                 }
                            //                             });
                            //                         } else {
                            //                             userReq.filter.vendorId = vendors;
                            //                         }

                            //                         callback(null, vendors);
                            //                     } else if (
                            //                         userReq.filter.vendorId &&
                            //                         typeof userReq.filter.vendorId === "string"
                            //                     ) {
                            //                         if (!vendors.includes(userReq.filter.vendorId)) {
                            //                             callback({
                            //                                 status: 403,
                            //                                 err: "AUTHENTICATION ERROR",
                            //                                 errmsg: "Not allowed to view this document",
                            //                             },
                            //                                 null
                            //                             );
                            //                         } else {
                            //                             callback(null, vendors);
                            //                         }
                            //                     } else {
                            //                         //if no vendorId filter is given, show list of documents for allowed documents only
                            //                         userReq.filter.vendorId = vendors;
                            //                         callback(null, []);
                            //                     }

                            //                     //NEW ENDS HERE
                            //                 } else {
                            //                     callback({
                            //                         status: 403,
                            //                         err: "AUTHENTICATION ERROR",
                            //                         errmsg: "Not allowed to view this document",
                            //                     },
                            //                         null
                            //                     );
                            //                 }
                            //             } else {
                            //                 callback({
                            //                     status: 404,
                            //                     err: "NOT FOUND",
                            //                     errmsg: "no document to show",
                            //                 },
                            //                     null
                            //                 );
                            //                 // callback(
                            //                 //   {
                            //                 //     status: 404,
                            //                 //     err: "NOT FOUND",
                            //                 //     errmsg: "vendor list not found"
                            //                 //   },
                            //                 //   null
                            //                 // );
                            //             }
                            //         });
                            // } else {
                            //     //ADMIN
                            //     //SHOW ALL

                            //     //not authorized
                            //     callback(null, []);
                            // }
                        } else {
                            //not authorized
                            callback(null, []);
                        }
                    },
                    function (changedFilter, callback) {
                        that.searchDocumentCustomFilter(userReq, callback);
                    },
                ],
                function (err, result) {
                    if (err) {
                        resUtil.handleError(req, res, err);
                    } else if (result) {
                        resUtil.OK(res, apiParams, result);
                    } else {
                        resUtil.BADREQUEST(res, apiParams, {});
                    }
                }
            );
        }
    }

    /*
     * API to find document result. Following are the step performed in the API sequentially.
     * 1. Send the document result for the requested query
     */
    findResults(req, res) {
        let apiParams = {
            id: "api.result.find",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!req.body.request && typeof req.body.request !== "object") {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }
        const filter = util.getSearchQuery(req.body.request.filter);
        const skip = req.body.request.offset || 0;
        const limit = req.body.request.limit || this.config.defaultResultSize;
        const page = req.body.request.page || 1;
        let result = {};
        resultCollection.countDocuments(filter, function (err, count) {
            if (err) {
                apiParams.err = err;
                return resUtil.ERROR(res, apiParams, result);
            }
            result.count = count;
            if (result.count > 0) {
                resultCollection
                    .aggregate([{
                        $match: filter,
                    },
                    {
                        $skip: skip,
                    },
                    {
                        $limit: limit,
                    },
                    {
                        $lookup: {
                            from: "document_metadata",
                            localField: "documentId",
                            foreignField: "documentId",
                            as: "document",
                        },
                    },
                    ])
                    .toArray(function (err, result2) {
                        result.documents = result2;
                        if (err) {
                            apiParams.err = err;
                            return resUtil.ERROR(res, apiParams, result);
                        }
                        return resUtil.OK(res, apiParams, result);
                    });
            } else {
                return resUtil.OK(res, apiParams, result);
            }
        });
    }

    /*
        API to aggregate document stats 
        NOTE - this MAY belong in dashboard Services - but its here, so as to not cause merge issues with work done by Rayulu
        and since this is a pure document stats, which can be displayed in multiple places, its here.

        1. Get total number of invoices processed - no status
        2. Get number of invoices pending extraction - READY_FOR_EXTRACTION
        3. Get number of invoices pending review - REVIEW
        4. Get number of invoices pending failed - FAILED
    */
    getDocumentStats(req, res) {
        let apiParams = {
            id: "api.document.stats",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        if (!(apiParams && apiParams.id)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        //For total only get documents which have a status equal to the processing stages.

        docCollection
            .aggregate([{
                $facet: {
                    TOTAL: [{
                        $match: {
                            $or: [{
                                status: "NEW",
                            },
                            {
                                status: "PRE_PROCESSING",
                            },
                            {
                                status: "READY_FOR_EXTRACTION",
                            },
                            {
                                status: "EXTRACTION_INPROGRESS",
                            },
                            {
                                status: "EXTRACTION_DONE",
                            },
                            {
                                status: "REVIEW",
                            },
                            {
                                status: "REVIEW_COMPLETED",
                            },
                            {
                                status: "RPA_PROCESSING",
                            },
                            {
                                status: "PROCESSED",
                            },
                            {
                                status: "REJECTED",
                            },
                            {
                                status: "INVALID",
                            },
                            {
                                status: "FAILED",
                            },
                            ],
                        },
                    },
                    {
                        $count: "TOTAL",
                    },
                    ],
                    NEW: [{
                        $match: {
                            status: "NEW",
                        },
                    },
                    {
                        $count: "NEW",
                    },
                    ],
                    PRE_PROCESSING: [{
                        $match: {
                            status: "PRE_PROCESSING",
                        },
                    },
                    {
                        $count: "PRE_PROCESSING",
                    },
                    ],
                    EXTRACTION_INPROGRESS: [{
                        $match: {
                            status: "EXTRACTION_INPROGRESS",
                        },
                    },
                    {
                        $count: "EXTRACTION_INPROGRESS",
                    },
                    ],
                    EXTRACTION_FAILED: [{
                        $match: {
                            status: "FAILED",
                            stage: "EXTRACTION",
                        },
                    },
                    {
                        $count: "EXTRACTION_FAILED",
                    },
                    ],
                    EXTRACTION_DONE: [{
                        $match: {
                            status: "EXTRACTION_DONE",
                        },
                    },
                    {
                        $count: "EXTRACTION_DONE",
                    },
                    ],
                    READY_FOR_EXTRACTION: [{
                        $match: {
                            status: "READY_FOR_EXTRACTION",
                        },
                    },
                    {
                        $count: "READY_FOR_EXTRACTION",
                    },
                    ],
                    REVIEW: [{
                        $match: {
                            status: "REVIEW",
                        },
                    },
                    {
                        $count: "REVIEW",
                    },
                    ],
                    REVIEW_COMPLETED: [{
                        $match: {
                            status: "REVIEW_COMPLETED",
                        },
                    },
                    {
                        $count: "REVIEW_COMPLETED",
                    },
                    ],
                    RPA_PROCESSING: [{
                        $match: {
                            status: "RPA_PROCESSING",
                        },
                    },
                    {
                        $count: "RPA_PROCESSING",
                    },
                    ],
                    PROCESSED: [{
                        $match: {
                            status: "PROCESSED",
                        },
                    },
                    {
                        $count: "PROCESSED",
                    },
                    ],
                    FAILED: [{
                        $match: {
                            status: "FAILED",
                            stage: {
                                $ne: "EXTRACTION",
                            },
                        },
                    },
                    {
                        $count: "FAILED",
                    },
                    ],
                    INVALID: [{
                        $match: {
                            status: "INVALID",
                        },
                    },
                    {
                        $count: "INVALID",
                    },
                    ],
                    REJECTED: [{
                        $match: {
                            status: "REJECTED",
                        },
                    },
                    {
                        $count: "REJECTED",
                    },
                    ],
                },
            },
            {
                $project: {
                    TOTAL: {
                        $arrayElemAt: ["$TOTAL.TOTAL", 0],
                    },
                    NEW: {
                        $arrayElemAt: ["$NEW.NEW", 0],
                    },
                    PRE_PROCESSING: {
                        $arrayElemAt: ["$PRE_PROCESSING.PRE_PROCESSING", 0],
                    },
                    READY_FOR_EXTRACTION: {
                        $arrayElemAt: ["$READY_FOR_EXTRACTION.READY_FOR_EXTRACTION", 0],
                    },
                    EXTRACTION_INPROGRESS: {
                        $arrayElemAt: ["$EXTRACTION_INPROGRESS.EXTRACTION_INPROGRESS", 0],
                    },
                    EXTRACTION_FAILED: {
                        $arrayElemAt: ["$EXTRACTION_FAILED.EXTRACTION_FAILED", 0],
                    },
                    EXTRACTION_DONE: {
                        $arrayElemAt: ["$EXTRACTION_DONE.EXTRACTION_DONE", 0],
                    },
                    REVIEW: {
                        $arrayElemAt: ["$REVIEW.REVIEW", 0],
                    },
                    REVIEW_COMPLETED: {
                        $arrayElemAt: ["$REVIEW_COMPLETED.REVIEW_COMPLETED", 0],
                    },
                    RPA_PROCESSING: {
                        $arrayElemAt: ["$RPA_PROCESSING.RPA_PROCESSING", 0],
                    },
                    PROCESSED: {
                        $arrayElemAt: ["$PROCESSED.PROCESSED", 0],
                    },
                    FAILED: {
                        $arrayElemAt: ["$FAILED.FAILED", 0],
                    },
                    INVALID: {
                        $arrayElemAt: ["$INVALID.INVALID", 0],
                    },
                    REJECTED: {
                        $arrayElemAt: ["$REJECTED.REJECTED", 0],
                    },
                },
            },
            ])
            .toArray(function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!result) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, result);
                return;
            });
    }

    /*
    * API to to generate a documentId
    1.This returns a unique documentId whenever called
    */
    getDocumentId(req, res) {
        let apiParams = {
            id: "api.document.get.documentId",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        let baseFormat = "doc_x_yyyyyyyyyyy";
        baseFormat = baseFormat.replace(/[y]/g, (c) => {
            let r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        let timestamp = new Date().getTime();
        timestamp = timestamp.toString();
        baseFormat = baseFormat.replace("x", timestamp);

        return resUtil.OK(res, apiParams, {
            id: baseFormat,
        });
    }

    /*
    * API to to delete a document. Following are the step performed in the API sequentially.
    * 1. Delete the document metadata
    * 2. Delete the document result
    * 3. Send data to ui as to which of the above two may have failed or passed using success status, true or false;
    */
    deleteDocument(req, res) {
        let reqData = req.body.request;
        let deletedBy
        const apiParams = {
            id: "api.document.delete",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(reqData && reqData.documentId)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {
            console.log(`${new Date().toUTCString()} : Entered deleteDocument - documentId ${reqData.documentId}`);
        }

        async.waterfall(
            [
                function (callback) {
                    userCollection.find({ userId: req.headers.userid }).limit(1).toArray(function (err, userDetails) {
                        if (userDetails) {
                            if (userDetails && userDetails.length) {
                                deletedBy = userDetails[0].emailId;
                                callback(null, userDetails[0]);
                            } else { // when no user found with given userId
                                deletedBy = sharedService.encrypt("InvalidUser");
                                callback(null, {})
                            }
                        } else { // when some error occured while querying.
                            deletedBy = sharedService.encrypt("QueryError");
                            callback(null, {})
                        }
                    });
                },
                function (userData, callback) {
                    async.parallel(
                        async.reflectAll([
                            function (callback) {
                                const filter = {
                                    documentId: reqData.documentId
                                };
                                const data = {
                                    status: 'DELETED',
                                    deleteReason: reqData.reason,
                                    deleteTime: req.body.ts,
                                    documentId: reqData.documentId,
                                    deletedBy: deletedBy,
                                    totalReviewedTime: reqData.totalReviewTime
                                }
                                dbutil.updateInDB(docCollection, filter, data, callback);
                            },
                            function (callback) {
                                resultCollection.findOneAndUpdate(
                                    { documentId: reqData.documentId },
                                    {
                                        $set: {
                                            status: 'DELETED',
                                            deleteReason: reqData.reason,
                                            deleteTime: req.body.ts,
                                            deletedBy: deletedBy,
                                        }
                                    },
                                    function (err, document) {
                                        callback(err, document)
                                    }
                                );
                            },
                            function (callback) {
                                analyticsMetadataColl.findOneAndUpdate(
                                    { documentId: reqData.documentId },
                                    {
                                        $set: {
                                            status: 'DELETED',
                                            deleteReason: reqData.reason,
                                            deleteTime: req.body.ts,
                                            deletedBy: deletedBy,
                                            totalReviewedTime: reqData.totalReviewTime
                                        }
                                    },
                                    function (err, document) {
                                        callback(err, document)
                                    }
                                );
                            },
                        ]),
                        function (err, result) {
                            if (err) {
                                resUtil.handleError(req, res, err);
                                return;
                            }

                            if (!result) {
                                resUtil.NOTFOUND(res, apiParams, {});
                                return;
                            }
                            resUtil.OK(res, apiParams, result);
                            return;
                        }
                    );
                }
            ]
        );
    }

    /*
    * API to to purge a document. Following are the step performed in the API sequentially.
    * 1. Delete the specified fields like InvoiceNo,TotalAmount from the doc collection
    * 2. Delete the documentInfo,documentLineItems from the result collection
    * 3. set the status to PURGED in both collections
    * 4. Send data to the requested party.;
    */
    purgeDocument(req, res) {
        let reqData = req.body.request;
        const apiParams = {
            id: "api.document.purge",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(reqData && reqData.documentId)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {
            console.log(`${new Date().toUTCString()} : Entered purgeDocument - documentId ${reqData.documentId}`);
        }

        async.waterfall([
            function (callback) {
                let correctedFields = [];
                resultCollection.findOne({
                    documentId: reqData.documentId
                }, { projection: { _id: 0, documentInfo: 1 } },
                    function (err, doc) {
                        if (err) {
                            callback(null, correctedFields)
                        }
                        if (!doc) {
                            callback(null, correctedFields)
                        }
                        else {
                            //TODO 22-08-2022
                            if (doc && doc.documentInfo && doc.documentInfo.length > 0) {
                                doc.documentInfo.forEach(obj => {
                                    if (obj.hasOwnProperty("correctedValue")) {
                                        correctedFields.push(obj.fieldId)
                                    }
                                });
                            }
                            callback(null, correctedFields)
                        }
                    }
                );
            },
            function (correctedFields, callback) {
                const filter = {
                    documentId: reqData.documentId
                };
                config.DETAILED_LOGGING == 1 && console.log(JSON.parse(config.KeysToBeDeletedFromDocColl));
                docCollection.findOneAndUpdate(
                    { documentId: reqData.documentId },
                    { $unset: JSON.parse(config.KeysToBeDeletedFromDocColl) },
                    { returnOriginal: false },
                    function (err, updatedDocument) {
                        if (updatedDocument && updatedDocument.value) {
                            updatedDocument.value['statusBeforePurge'] = updatedDocument.value.status;
                            if (correctedFields && correctedFields.length > 0) {
                                updatedDocument.value['correctedFields'] = correctedFields;
                            }

                            // don't update status of document after PURGING
                            // updatedDocument.value.status = 'PURGED';
                            updatedDocument.value['documentPurged'] = 1; 
                            
                            updatedDocument.value['purgedAt'] = util.generateTimestamp();
                            dbutil.updateInDB(docCollection, filter, updatedDocument.value, callback);
                        } else {
                            callback({
                                status: 404,
                                err: "Not Found",
                                errmsg: "No Document Found"
                            }, null)
                        }
                    }
                );
            },
            function (docRes, callback) {
                resultCollection.findOneAndUpdate(
                    { documentId: reqData.documentId },
                    {
                        $unset: JSON.parse(config.KeysToBeDeletedFromResultColl),
                        $set: {
                            status: 'PURGED',
                            purgedAt: util.generateTimestamp()
                        }
                    },
                    function (err, updatedResult) {
                        callback(err, updatedResult)
                    }
                );
            }
        ],
            function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }
                if (!result) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }
                let response = {
                    documentId: reqData.documentId,
                    Message: "Document Purged successfully"
                };

                if (reqData && reqData.documentId && config.DETAILED_LOGGING == 1) {
                    console.log(`${new Date().toUTCString()} : success purgeDocument - documentId ${reqData.documentId}`);
                }

                resUtil.OK(res, apiParams, response);
                return;
            }
        );
    }

    /* By kanak
    * API to update multiple documents on the basis of docIds in the metadata and result collection. Following are the step performed in the API sequentially.
    * 1. get the docs from metadata and result collection on basis of documentIds.
    * 2. then update each doc's VendorId and re-save them.
    */
    updateManyDocuments(req, res) {
        let reqData = req.body.request;
        const that = this;
        const apiParams = {
            id: "api.document.updateMany",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object" && reqData.documentIds)) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    docCollection.find({ documentId: { $in: reqData.documentIds } }).toArray(function (err, docs) {
                        callback(err, docs)
                    });
                },
                function (docsFromMetaData, callback) {
                    resultCollection.find({ documentId: { $in: reqData.documentIds } }).toArray(function (err, docsFromResColls) {
                        callback(err, docsFromMetaData, docsFromResColls)
                    });
                },
                function (docsFromMetaData, docsFromResColls, callback) {

                    docsFromMetaData.forEach((doc, index) => {
                        let obj = reqData.vendorIds.find(o => o.documentId === doc.documentId);
                        doc.vendorId = obj.VendorId;
                    })
                    docsFromResColls.forEach((doc, index) => {
                        let obj = reqData.vendorIds.find(o => o.documentId === doc.documentId);
                        doc.vendorId = obj.VendorId;
                    })

                    callback(null, docsFromMetaData, docsFromResColls)
                },
                function (docsFromMetaData, docsFromResColls, callback) {
                    let operations = [];

                    docsFromMetaData.forEach(doc => {
                        operations.push({
                            updateMany: {
                                filter: { documentId: doc.documentId },
                                update: { $set: { "vendorId": doc.vendorId } }
                            }
                        })
                    })
                    docsFromResColls.forEach(doc => {
                        operations.push({
                            updateMany: {
                                filter: { documentId: doc.documentId },
                                update: { $set: { "vendorId": doc.vendorId } }
                            }
                        })
                    })
                    docCollection.bulkWrite(operations, { upsert: true }, function (err, r) {
                        resultCollection.bulkWrite(operations, { upsert: true }, function (err, res) {
                            callback(err, res);
                        });
                    });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }
                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /** API to get total no of documents uploaded by the user -- kanak
      Following are the step performed in the API sequentially.
     * 1. Send total no of documents to the fronend
     */
    getTotalDocs(req, res) {
        const apiParams = {
            id: "api.document.getTotalDocs",
        };
        if (!(apiParams && apiParams.id)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        const filter = {
            userId: req.headers.userid,
            submittedOn: {
                '$gte': new Date().setHours(0, 0, 0, 0)
            }
        };

        let result = {};

        docCollection.aggregate([{
            $match: filter,
        },
        {
            $group: {
                _id: null,
                totalPageCount: {
                    $sum: "$pageCount"
                },
            }
        }
        ]).toArray(function (err, docs) {
            // result.documents = docs;
            if (err) {
                apiParams.err = err;
                return resUtil.ERROR(res, apiParams, err);
            } else {
                return resUtil.OK(res, apiParams, docs)
            }
        });
    }

    /* by Kanak
     * API to update those documents for which any Action(RaiseTicket/Approve/MarkedAsDone) has been taken. Following are the step performed in the API sequentially.
     * 1. fetch those docs which have given VendorId and ReviewCompleted
     * 2. update extractionAssist flag either 1,2 or 3.
     * 3. flag 1 is for RaiseTicket and 2 is for Approve and 3 is for MarkedAsDone.
     */
    setExtAssistFlag(req, res) {
        let userReq = req.body.request;
        const apiParams = {
            id: "api.document.setExtAssistFlag",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        let fieldIds = userReq.filter.selectedFieldIds;
        let action = userReq.filter.action; // value should be 1(for RaiseTicket) or 2(for Approve)

        async.waterfall([
            function (callback) {
                if (userReq.token) {
                    tokenService.validateToken(userReq.token, callback);
                } else {
                    callback(null, userReq);
                }
            },
            function (tokenRes, callback) {
                const filter = userReq && userReq.filter ? util.getSearchQuery(userReq.filter) : {};

                delete filter.selectedFieldIds;
                delete filter.action;

                resultCollection
                    .aggregate([
                        {
                            $lookup: {
                                from: "document_metadata",
                                localField: "documentId",
                                foreignField: "documentId",
                                as: "document_metadata_data",
                            }
                        },
                        {
                            $match: filter,
                        },
                        {
                            $project: {
                                _id: 0,
                                documentId: 1,
                                documentInfo: 1,
                                document_metadata_data: 1
                            }
                        },
                        {
                            $sort: {
                                submittedOn: -1,
                            },
                        }
                    ])
                    .toArray(function (err, docs) {
                        if (err) {
                            callback({
                                status: 500,
                                err: "INTERNAL_SERVER_ERROR",
                                errmsg: "error while fetching document list",
                            },
                                null
                            );
                        } else {
                            let resultData = []
                            let result = {}
                            // docs.forEach(element => {
                            //     let Data;
                            //     Data = element.document_metadata_data[0];
                            //     delete element.document_metadata_data
                            //     Data.docs_result = []
                            //     Data.docs_result[0] = element
                            //     resultData.push(Data)
                            // });
                            docs.forEach(element => {
                                if (element && element.document_metadata_data.length > 0) {
                                    let data = {};
                                    data = element.document_metadata_data[0];
                                    delete element.document_metadata_data;
                                    data["docs_result"] = []
                                    data.docs_result.push(element);
                                    resultData.push(data)
                                }
                            });
                            result.documents = resultData
                            callback(null, result);
                        }
                    });
            },
            function (docsRes, callback) {
                let docsInfo = []
                if (docsRes && docsRes.documents.length > 0) {
                    fieldIds.forEach(fieldId => {
                        docsRes.documents.forEach(element => {
                            let obj = element.docs_result[0].documentInfo.find(o => o.fieldId === fieldId);
                            if (obj) {
                                obj["extractionAssist"] = Number(action);
                            }
                            docsInfo.push(element.docs_result[0]);
                        });
                    })
                }
                callback(null, docsInfo);
            },
            function (docs, callback) {
                if (docs.length > 0) {
                    let operations = [];
                    docs.forEach(doc => {
                        operations.push({
                            updateMany: {
                                filter: { documentId: doc.documentId },
                                update: { $set: { "documentInfo": doc.documentInfo } }
                            }
                        })
                    })
                    resultCollection.bulkWrite(operations, { upsert: true }, function (err, r) {
                        callback(err, r);
                    });
                } else {
                    callback(null, [])
                }
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (result) {
                resUtil.OK(res, apiParams, result);
            } else {
                resUtil.BADREQUEST(res, apiParams, {});
            }
        });
    }

    //<-------------------AAAAAAAAAAAAAAAA------REVIEWER APIS STARTS------AAAAAAAAAAAAAAAA----------------->

    /* by Kanak 
    * API to get the documents for the Reviewer. Following are the step performed in the API sequentially.
    * 1. fetch those docs which have in Review status and document_review_status is not UnderReview. 
    * 2. send the response back to the UI.
    */

    getDocumentsForReviewer(req, res) {
        let userReq = req.body.request;
        let filter = userReq.filter;
        const apiParams = {
            id: "api.document.getDocumentsForReviewer",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        let limit;

        if (!(userReq && userReq.limit)) {
            limit =
                typeof this.config.defaultResultSize === "string" ?
                    parseInt(this.config.defaultResultSize) :
                    this.config.defaultResultSize;
        } else {
            limit = userReq.limit;
        }

        const page = userReq.page || 1;
        const skip = limit * (page - 1);
        let result = {};
        let that = this;

        async.waterfall([
            function (callback) {
                if (userReq.token) {
                    tokenService.validateToken(userReq.token, callback);
                } else {
                    callback(null, userReq);
                }
            },
            function (tokenRes, callback) {
                if (config.DOCTYPES_VISIBILITY == 1) {
                    userCollection.findOne({
                        userId: tokenRes.userId
                    }, { projection: { _id: 0 } },
                        function (err, user) {
                            if (err) {
                                callback(err, null)
                            }
                            if (!user) {
                                callback(err, null)
                            }
                            callback(null, user)
                        }
                    );
                }
                else {
                    callback(null, tokenRes)
                }
            },
            function (userRes, callback) {

                const userId = filter.userId;
                delete filter.userId;

                let query;
                switch (filter.status) {
                    case 'REVIEW':
                        query = { $and: [{ status: "REVIEW" }, { document_review_status: { $ne: 'UNDER REVIEW' } }] };
                        break;
                    case 'REVIEW_COMPLETED':
                        query = { $and: [{ status: "REVIEW_COMPLETED" }] };
                        break;
                    case 'FAILED':
                        query = { $and: [{ status: "FAILED" }] };
                        break;
                    case 'DELETED':
                        query = { $and: [{ status: 'DELETED' }] };
                        break;
                    case 'REASSIGN':
                        query = { $and: [{ status: 'REASSIGN' }] };
                        break;
                    case 'EXTRACTION_INPROGRESS':
                        query = { $and: [{ status: 'EXTRACTION_INPROGRESS' }] };
                        break;
                    case 'NEW':
                        query = { $and: [{ status: 'NEW' }] };
                        break;
                    case 'PRE_PROCESSING':
                        query = { $and: [{ status: 'PRE_PROCESSING' }] };
                        break;
                    case 'PROCESSED':
                        query = { $and: [{ status: 'PROCESSED' }] };
                        break;
                    case 'RPA_PROCESSED':
                        query = { $and: [{ status: 'RPA_PROCESSED' }] };
                        break;
                    case 'RPA_PROCESSING':
                        query = { $and: [{ status: 'RPA_PROCESSING' }] };
                        break;
                    case 'RPA_FAILED':
                        query = { $and: [{ status: 'RPA_FAILED' }] };
                        break;
                    case 'RPA_PENDING_APPROVAL':
                        query = { $and: [{ status: 'RPA_PENDING_APPROVAL' }] };
                        break;
                    case 'OTHERS':
                        query = { $and: [{ status: { '$nin': ['FAILED', 'REVIEW', 'REVIEW_COMPLETED', 'DELETED','REASSIGN', 'RPA_PROCESSED', 'RPA_PROCESSING', 'RPA_FAILED', 'RPA_PENDING_APPROVAL'] } }] };
                        break;
                    default: // Submission
                        query = { $and: [{ status: { $exists: true } }] }
                        break;
                }

                if (Object.keys(filter).includes('stp')) { // this is for stp only                   
                    if (query.$and && query.$and.length) {
                        query.$and.push({
                            stp: filter.stp
                        })
                    }
                }

                if (Object.keys(filter).includes('ace')) { // this is for ace only                   
                    if (query.$and && query.$and.length) {
                        query.$and.push({
                            ace: filter.ace
                        })
                    }
                }

                if (Object.keys(filter).includes('approvalStatus')) { // this is for approvalStatus only                   
                    if (query.$and && query.$and.length) {
                        query.$and.push({
                            approvalStatus: filter.approvalStatus
                        })
                    }
                }

                if (filter.submittedOn && Object.keys(filter).includes('submittedOn')) { // this is for submittedOn only                   
                    filter = Object.keys(filter).includes('submittedOn') ? util.getSearchQuery(filter) : {};
                    if (query.$and && query.$and.length) {
                        query.$and.push({
                            submittedOn: filter.submittedOn
                        })
                    }
                }

                if (Object.keys(filter).includes('vendorName')) { // this is for vendorName only                   
                    if (query.$and && query.$and.length) {
                        query.$and.push({
                            vendorName: filter.vendorName
                        })
                    }
                }

                if (filter.searchKey) { // this is for searching only
                    const searchKey = filter.searchKey;
                    if (query.$and && query.$and.length) {
                        query.$and.push({
                            $or: [
                                { documentId: new RegExp(that.validateRegExp(searchKey), "g") },
                                // { docType: new RegExp(that.validateRegExp(searchKey), "g") },
                                // { orgType: new RegExp(that.validateRegExp(searchKey), "g") },

                                { fileName: new RegExp(that.validateRegExp(searchKey), "g") }, // added new 24-05-2022
                                { invoiceNumber: new RegExp(that.validateRegExp(sharedService.encrypt(searchKey)), "g") },
                                // { currency: new RegExp(that.validateRegExp(searchKey), "g") },
                                // { vendorId: new RegExp(that.validateRegExp(searchKey), "g") },
                                // { totalAmount: new RegExp(that.validateRegExp(searchKey), "g") }
                            ],
                        })
                    }
                }

                if (Object.keys(filter).includes('docType')) { // docType                  
                    if (query.$and && query.$and.length) {
                        query.$and.push({
                            docType: { $in: filter.docType }
                        })
                    }
                }
                else {
                    if (config.DOCTYPES_VISIBILITY == 1) { // for KGS
                        if (query.$and && query.$and.length) {
                            query.$and.push({
                                docType: { $in: userRes.documentType }
                            })
                        }
                    }
                }

                if (Object.keys(filter).includes('priorityRanking')) { // PriorityRanking                  
                    if (query.$and && query.$and.length) {
                        query.$and.push({
                            priorityRanking: { $in: filter.priorityRanking }
                        })
                    }
                }

                if(config.DETAILED_LOGGING == 1){
                    console.log("Below Query Executed for Reviewer");
                    console.log(JSON.stringify(query));
                }

                docCollection.countDocuments(query, function (err, count) {
                    if (err) {
                        callback({
                            status: 500,
                            err: "INTERNAL_SERVER_ERROR",
                            errmsg: "error while fetching document list",
                        },
                            null
                        );
                    } else {
                        result.count = count;
                        result.page = page;
                        result.perPageRecords = limit;


                        docCollection
                            .aggregate([
                                { $match: query },
                                { $project: { _id: 0, rawPrediction: 0, pages: 0 } },
                                { $sort: { priorityRanking: 1 ,submittedOn: 1}},
                                { $skip: skip },
                                { $limit: limit }
                            ])
                            .toArray(function (err, docs) {
                                if (err) {
                                    callback({
                                        status: 500,
                                        err: "INTERNAL_SERVER_ERROR",
                                        errmsg: "error while fetching document list",
                                    },
                                        null
                                    );
                                } else {
                                    docs.forEach(element => {
                                        that.decryptDocData(element)
                                    });
                                    result.documents = docs;
                                    callback(null, result);
                                }
                            });
                    }
                });
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (result) {
                resUtil.OK(res, apiParams, result);
            } else {
                resUtil.BADREQUEST(res, apiParams, {});
            }
        });
    }

    /* by Kanak
        * API to get the document status whwether it is UnderReview or not. Following are the step performed in the API sequentially.
        * 1. get the document by Id and then validate document_review_status
        * 2. send the response back to the UI.
    */
    getDocumentReviewStatus(req, res) {
        const apiParams = {
            id: "api.document.get",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };
        if (!(apiParams && apiParams.id)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        let result = {};

        docCollection.findOne({
            documentId: req.params.id
        }, { projection: { _id: 0, rawPrediction: 0, pages: 0 } },
            function (err, doc) {

                if (err) {
                    apiParams.err = err;
                    return resUtil.ERROR(res, apiParams, result);
                }
                if (!doc) {
                    return resUtil.NOTFOUND(res, apiParams, result);
                }
                else if (doc.status == 'REVIEW' && doc.document_review_status == 'UNDER REVIEW') {
                    result.DocumentStatus = 'UNDER REVIEW'
                }
                // else if (doc.status == 'REVIEW_COMPLETED') {
                //     result.DocumentStatus = 'REVIEW_COMPLETED'
                // }
                else {
                    result.DocumentStatus = 'GO AHEAD';
                }
                //result.document = doc;
                return resUtil.OK(res, apiParams, result);
            }
        );
    }

    /* by Kanak
        * API to get the single document for Reviewer. Following are the step performed in the API sequentially.
        * 1. get the document whose status is Review and document_review_status is not UnderReview
        * 2. send the response back to the UI.
    */
    getSingleDocumentForReviewer(req, res) {

        const apiParams = {
            id: "api.document.getSingleDocumentForReviewer",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        if (!(apiParams)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        // let query = { $and: [{ status: "REVIEW" }, { document_review_status: { $ne: 'UNDER REVIEW' } }] };
        // let projection = { projection: { rawPrediction: 0, _id: 0 } };

        // docCollection.find(query, projection)
        //     .sort({
        //         submittedOn: 1
        //     })
        //     .limit(20)
        //     .toArray(function (err, result) {
        //         if (err) {
        //             resUtil.handleError(req, res, err);
        //         } else if (result) {
        //             let newResult = [];
        //             if (result.length > 0) {
        //                 result = result[Math.floor(Math.random() * result.length)]; // pick random one document from the docs
        //                 newResult.push(result);
        //             }

        //             resUtil.OK(res, apiParams, newResult);
        //         } else {
        //             resUtil.BADREQUEST(res, apiParams, {});
        //         }
        //     });

        let userReq = req.body.request;

        async.waterfall([
            function (callback) {
                if (userReq.token) {
                    tokenService.validateToken(userReq.token, callback);
                } else {
                    callback({ error: "token not provided" }, null);
                }
            },
            function (tokenRes, callback) {
                if (config.DOCTYPES_VISIBILITY == 1) {
                    userCollection.findOne({
                        userId: tokenRes.userId
                    }, { projection: { _id: 0 } },
                        function (err, user) {
                            if (err) {
                                callback(err, null)
                            }
                            if (!user) {
                                callback(err, null)
                            }
                            callback(null, user)
                        }
                    );
                }
                else {
                    callback(null, tokenRes)
                }
            },
            function (userRes, callback) {
                let query = { $and: [{ status: "REVIEW" }, { document_review_status: { $ne: 'UNDER REVIEW' } }] };
                let projection = { projection: { rawPrediction: 0, _id: 0 } };

                if (config.DOCTYPES_VISIBILITY == 1) { // For KGS
                    query = { $and: [{ status: "REVIEW" }, { docType: { $in: userRes.documentType } }, { document_review_status: { $ne: 'UNDER REVIEW' } }] }
                }
                docCollection.find(query, projection)
                    .sort({
                        priorityRanking:1,submittedOn: 1
                    })
                    .limit(2)
                    .toArray(function (err, result) {
                        if (err) {
                            callback(err, {});
                        } else if (result) {
                            let newResult = [];
                            if (result.length > 0) {
                                result = result[Math.floor(Math.random() * result.length)]; // pick random one document from the docs
                                newResult.push(result);
                            }
                            callback(null, newResult);
                            //resUtil.OK(res, apiParams, newResult);
                        } else {
                            callback(err, {});
                            //resUtil.BADREQUEST(res, apiParams, {});
                        }
                    });
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (result) {
                resUtil.OK(res, apiParams, result);
            } else {
                resUtil.BADREQUEST(res, apiParams, {});
            }
        });
    }

    /* by Kanak
       * API to get the total documents reviewd by Reviewer. Following are the step performed in the API sequentially.
       * 1. get the documents reviewed by the Reviewer in the last 24 hours (From 12:00 a.m to current Time)
       * 2. send the response back to the UI.
   */
    getTotalDocumentsReviewed(req, res) {
        const apiParams = {
            id: "api.document.getTotalDocumentsReviewed",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        if (!(apiParams) && !req.params.id) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        let emailId;

        async.waterfall([
            function (callback) {
                userCollection.find({ userId: req.params.id }).limit(1).toArray(function (err, userDetails) {
                    if (userDetails) {
                        if (userDetails.length) {
                            emailId = userDetails[0].emailId;
                            callback(null, userDetails[0]);
                        } else { // when no user found with given userId
                            emailId = undefined;
                            callback(null, {})
                        }
                    } else { // when some error occured while querying.
                        emailId = undefined;
                        callback(null, {})
                    }
                });
            },
            function (userRes, callback) {
                if (emailId != undefined) {
                    let query = {
                        $and: [
                            { status: "REVIEW_COMPLETED" },
                            { reviewedBy: emailId },
                            {
                                reviewedAt: {
                                    '$gte': new Date().setHours(0, 0, 0, 0),
                                    '$lte': new Date().getTime()
                                }
                            }
                        ]
                    };
                    let projection = { projection: { documentId: 1 } };

                    docCollection.find(query, projection)
                        .sort({
                            submittedOn: -1
                        })
                        .toArray(function (err, result) {
                            if (err) {
                                callback(err, null)
                            } else if (result) {
                                callback(null, result)
                            } else {
                                callback({}, null)
                            }
                        });
                }
                else {
                    callback(null, [])
                }
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (result) {
                resUtil.OK(res, apiParams, result);
            } else {
                resUtil.BADREQUEST(res, apiParams, {});
            }
        });
    }

    //<---------------------XXXXXXXXXXXX----REVIEWER APIS ENDS--XXXXXXXXXXXX--------------------->

    //<--------------------XXXXXXXXXXXX------APPROVER APIS STARTS --XXXXXXXXX-------------------->

    getDocumentsForApprover(req, res) {
        let userReq = req.body.request;
        // let filter = userReq.filter;
        const apiParams = {
            id: "api.document.getDocumentsForApprover",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        let that = this;
        async.waterfall([
            function (callback) {
                if (userReq.token) {
                    tokenService.validateToken(userReq.token, callback);
                } else {
                    callback(null, userReq);
                }
            }, function (tokenRes, callback) {
                const userId = (userReq.filter && userReq.filter.userId) ? userReq.filter.userId : tokenRes.userId;
                if (tokenRes.role == 'approver') {
                    userCollection.findOne({
                        userId: userId
                    }, { projection: { _id: 0 } },
                        function (err, user) {
                            if (err) {
                                callback(err, null)
                            }
                            if (!user) {
                                callback(err, null)
                            }
                            if (!Object.keys(userReq.filter).includes('docType')) { // for KGS                                            
                                userReq.filter['docType'] = user.documentType
                            }
                            callback(null, tokenRes)
                        }
                    );
                }
                else {
                    callback(null, tokenRes)
                }
            },
            function (tokenRes, callback) {
                const userId = userReq.filter.userId;
                delete userReq.filter.userId;
                that.formfilterSearchKey(userReq);
                let filter = userReq && userReq.filter ? userReq.filter : {};
                let limit;

                if (!(userReq && userReq.limit)) {
                    limit =
                        typeof this.config.defaultResultSize === "string" ?
                            parseInt(this.config.defaultResultSize) :
                            this.config.defaultResultSize;
                } else {
                    limit = userReq.limit;
                }
                const page = userReq.page || 1;
                const skip = limit * (page - 1);
                let result = {};
                docCollection.countDocuments(filter, function (err, count) {
                    if (err) {
                        callback({
                            status: 500,
                            err: "INTERNAL_SERVER_ERROR",
                            errmsg: "error while fetching document list",
                        },
                            null
                        );
                    } else {
                        result.count = count;
                        result.page = page;
                        result.perPageRecords = limit;
                        docCollection
                            .aggregate([
                                { $match: filter },
                                { $project: { _id: 0, rawPrediction: 0, pages: 0 } },
                                { $sort: { submittedOn: 1 }, },
                                { $skip: skip },
                                { $limit: limit }
                            ])
                            .toArray(function (err, docs) {
                                if (err) {
                                    callback({
                                        status: 500,
                                        err: "INTERNAL_SERVER_ERROR",
                                        errmsg: "error while fetching document list",
                                    },
                                        null
                                    );
                                } else {
                                    docs.forEach(element => {
                                        that.decryptDocData(element)
                                    });
                                    result.documents = docs;
                                    callback(null, result);
                                }
                            });
                    }
                });
            }
        ], function (err, result) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (result) {
                resUtil.OK(res, apiParams, result);
            } else {
                resUtil.BADREQUEST(res, apiParams, {});
            }
        });
    }

    //<---------------------XXXXXXXXXXXX----APPROVER APIS ENDS--XXXXXXXXXXXX--------------------->

    //<-----------xxxxxxxxxxxx----RAWPREDICTION STARTS----xxxxxxxxxxxxxxxxxxxx-------------------->

    addRawPrediction(req, res) {
        let reqData = req.body.request;
        const that = this;
        const apiParams = {
            id: "api.rawPrediction.add",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            req.body &&
            req.body.request &&
            req.body.request &&
            typeof req.body.request == "object"
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "addRawPrediction", callback);
                },
                function (validateRes, callback) {

                    rawPredictionCollection.findOne({
                        $or: [{
                            documentId: reqData.documentId
                        }]
                    },
                        function (err, data) {
                            if (err) callback(err, null);
                            else if (data) {
                                callback({
                                    status: 409,
                                    err: "CONFLICT",
                                    errmsg: "Duplicate documentId"
                                },
                                    null
                                );
                            } else {
                                callback(null, {});
                            }
                        }
                    );
                },
                function (userRes, callback) {
                    rawPredictionCollection.insertOne(reqData, function (err1, doc1) {
                        if (doc1 && doc1.ops && doc1.ops.length)
                            util.handleServerError(err1, doc1.ops[0], callback);
                        else util.handleServerError(err1, null, callback);
                    });
                }
            ],
            function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }
                if (!result) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }
                if (result._id) {
                    resUtil.OK(res, apiParams, { message: "Raw Prediction added successfully." });
                    return;
                }

            }
        );
    }

    updateRawPrediction(req, res) {
        let reqData = req.body.request;
        const that = this;
        const apiParams = {
            id: "api.rawPrediction.update",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            req.body &&
            req.body.request &&
            req.body.request &&
            typeof req.body.request == "object"
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "updateRawPrediction", callback);
                },
                function (validateRes, callback) {
                    rawPredictionCollection.findOneAndUpdate({
                        documentId: reqData.documentId
                    }, {
                        $set: reqData
                    },
                        function (err, document) {
                            util.handleServerError(err, document.value, callback);
                        }
                    )
                }
            ],
            function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }
                if (!result) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, { message: 'Raw Prediction updated Successfully' });
                return;
            }
        );
    }

    getRawPrediction(req, res) {
        let apiParams = {
            id: "api.rawPrediction.get",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        if (!(apiParams && apiParams.id)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        async.waterfall(
            [
                function (callback) {
                    rawPredictionCollection.findOne({
                        documentId: req.params.id
                    }, { projection: { _id: 0 } }, function (err, doc) {
                        if (err) {
                            apiParams.err = err;
                            return resUtil.ERROR(res, apiParams, {});
                        }
                        if (!doc) {
                            apiParams.err = "DocumentId not found";
                            return resUtil.NOTFOUND(res, apiParams, {});
                        }
                        callback(null, doc)
                    }
                    );
                },
            ],
            function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }
                if (!result) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }
                resUtil.OK(res, apiParams, result);
                return;
            }
        );

    }

    deleteRawPrediction(req, res) {
        let apiParams = {
            id: "api.rawPrediction.delete",
            msgid: req.body && req.body.params ? req.body.params.msgid : "",
        };

        if (!(apiParams && apiParams.id)) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }
        rawPredictionCollection
            .findOneAndDelete({
                documentId: req.params.id
            })
            .then(deletedRawPrediction => {
                if (deletedRawPrediction && deletedRawPrediction["lastErrorObject"]["n"]) {
                    let result = { message: 'Raw Prediction Deleted Successfully' }
                    resUtil.OK(res, apiParams, result);
                }
                else {
                    resUtil.NOTFOUND(res, apiParams, { message: "Incorrect documentId." });
                }
            })
            .catch(err => {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }
            });
    }

    //<-----------xxxxxxxxxxxx----RAWPREDICTION ENDS----------------------------------->

    //<-----------AAAAAAAAAAAAAAAA----UTILITY METHODS STARTS------AAAAAAAAAAAAAAAA---------------------------->

    //internal method for encryption of documentInfo or LineItems
    encryptFieldValues(result) {
        let isACE = 1;
        if (result && result.documentInfo && result.documentInfo.length > 0) {
            result.documentInfo.forEach(doc => {
                if (doc.hasOwnProperty("fieldValue")) {
                    doc.fieldValue = sharedService.encrypt(doc.fieldValue);
                }
                if (doc.hasOwnProperty("correctedValue")) {
                    isACE = 0;
                    doc.correctedValue = sharedService.encrypt(doc.correctedValue);
                }
                if (doc.hasOwnProperty("selectedLines")) { // added for point and shoot selected lines data
                    doc.selectedLines.forEach(element => {
                        element.line_text = sharedService.encrypt(element.line_text);
                    });
                }
            });
        }
        if (result && result.documentLineItems && result.documentLineItems.length > 0) {
            result.documentLineItems.forEach(doc => {
                if (doc.fieldset && doc.fieldset.length > 0) {
                    doc.fieldset.forEach(fieldset => {
                        if (fieldset.hasOwnProperty("fieldValue")) {
                            fieldset.fieldValue = sharedService.encrypt(fieldset.fieldValue);
                        }
                        if (fieldset.hasOwnProperty("correctedValue")) {
                            fieldset.correctedValue = sharedService.encrypt(fieldset.correctedValue);
                        }
                    });
                }
            });
        }
        return isACE;
    }

    //internal method for decryption of documentInfo or LineItems
    decryptFieldValues(docRes) {
        if (docRes && docRes.documentInfo && docRes.documentInfo.length > 0) {
            docRes.documentInfo.forEach(element => {
                element.fieldValue = sharedService.decrypt(element.fieldValue);
                if (element.correctedValue) {
                    element.correctedValue = sharedService.decrypt(element.correctedValue);
                }
                if (element.selectedLines) {
                    element.selectedLines.forEach(doc => {
                        doc.line_text = sharedService.decrypt(doc.line_text);
                    });
                }
            });
        }

        if (docRes && docRes.documentLineItems && docRes.documentLineItems.length > 0) {
            docRes.documentLineItems.forEach(doc => {
                if (doc.fieldset && doc.fieldset.length > 0) {
                    doc.fieldset.forEach(fieldset => {
                        if (fieldset.hasOwnProperty("fieldValue")) {
                            fieldset.fieldValue = sharedService.decrypt(fieldset.fieldValue);
                        }
                        if (fieldset.hasOwnProperty("correctedValue")) {
                            fieldset.correctedValue = sharedService.decrypt(fieldset.correctedValue);
                        }
                    });
                }
            });
        }
    }

    //internal method for mergeResult To Metadata collection
    async mergeResultToMetadata(result, calledFrom) {
        config.DETAILED_LOGGING == 1 && console.log(`${new Date().toUTCString()} : Entered mergeResultToMetadata from ${calledFrom} - documentId ${result.documentId}`);

        let fieldsToUpdate = config.mergeFieldsResultAndMetadata.split(",");
        if(config.DETAILED_LOGGING == 1){
            console.log(`Fields to Update in config file are:- `);
            console.log(fieldsToUpdate);
        }

        let filteredList = result.documentInfo.filter((each) => {
            return fieldsToUpdate.includes(each.fieldId);
        });

        if(config.DETAILED_LOGGING == 1){
            console.log(`So found FiltereList - documentId ${result.documentId}`);
            console.log(JSON.stringify(filteredList));
        }

        let documentUpdate = { documentId: result.documentId };
        filteredList.forEach((each) => {
            if (each.fieldId == 'vendorName') {
                config.DETAILED_LOGGING == 1 && console.log(`filteredList contains vendorName field for ${result.documentId}`);
                if (each.hasOwnProperty("correctedValue")) {
                    if(config.DETAILED_LOGGING == 1){
                        console.log("correctedValue Condition");
                        console.log("Before encrypting correctedValue", JSON.stringify(each.correctedValue));
                    }
                    each.correctedValue = sharedService.encrypt(sharedService.decrypt(each.correctedValue).trim().toLocaleUpperCase())
                    config.DETAILED_LOGGING == 1 && console.log("After encrypting correctedValue", JSON.stringify(each.correctedValue));
                }
                else if (each.hasOwnProperty("fieldValue")) {
                    if(config.DETAILED_LOGGING == 1){
                        console.log("fieldValue Condition");
                        console.log("Before encrypting fieldValue", JSON.stringify(each.fieldValue));
                    }
                    each.fieldValue = sharedService.encrypt(sharedService.decrypt(each.fieldValue).trim().toLocaleUpperCase())
                    config.DETAILED_LOGGING == 1 && console.log("After encrypting fieldValue", JSON.stringify(each.fieldValue));
                }
            }
            if (each.hasOwnProperty("correctedValue")) {
                documentUpdate[each.fieldId] = each.correctedValue;
            } else if (each.hasOwnProperty("fieldValue")) {
                documentUpdate[each.fieldId] = each.fieldValue;
            }
        });

        dbutil.updateInDB(
            docCollection, { documentId: documentUpdate.documentId },
            documentUpdate,
            function (err, result) {
                if (err) {
                    console.log(`${new Date().toUTCString()} : Error in updateInDB after adding or updating result - documentId ${documentUpdate.documentId}`);
                    console.log(err);
                }
            }
        );
    }

    //internal method for calculateAccuracy for documentInfo or LineItems
    async calculateAccuracy(docResult) {
        let totalItems = 0;
        let confidenceCount = 0;
        let totalConfidence = 0;
        totalItems += docResult.documentInfo.length;

        docResult.documentInfo.forEach((each) => {
            if (each.confidence) {
                confidenceCount += 1;
                totalConfidence += each.confidence;
            }
        });

        docResult.documentLineItems.forEach((lineItem) => {
            totalItems += lineItem.fieldset.length;
            lineItem.fieldset.forEach((field) => {
                if (field.confidence) {
                    confidenceCount += 1;
                    totalConfidence += field.confidence;
                }
            });
        });

        return totalConfidence / confidenceCount;
    }

    //internal method for searchDocumentCustomFilter
    searchDocumentCustomFilter(userReq, callback) {

        if (userReq.filter && userReq.filter.vendorName) {
            userReq.filter.vendorName = sharedService.encrypt(userReq.filter.vendorName.trim())
        }

        const secondFilter =
            userReq && userReq.filter && userReq.filter.vendorId ?
                util.getSearchQuery({ vendorId: userReq.filter.vendorId }) : {};
        const searchKey = userReq.filter.searchKey;
        // const searchKey = util.getSearchQuery(req.body.request.filter.searchKey);

        let limit;

        if (!(userReq && userReq.limit)) {
            limit =
                typeof this.config.defaultResultSize === "string" ?
                    parseInt(this.config.defaultResultSize) :
                    this.config.defaultResultSize;
        } else {
            limit = userReq.limit;
        }

        const page = userReq.page || 1;
        const skip = limit * (page - 1);
        let result = {};

        // const filter = {
        //     $and: [{
        //         $or: [
        //             { documentId: new RegExp(this.validateRegExp(searchKey), "g") },
        //             //{ docType: new RegExp(this.validateRegExp(searchKey), "g") },
        //             //{ orgType: new RegExp(this.validateRegExp(searchKey), "g") },

        //             { fileName: new RegExp(this.validateRegExp(searchKey), "g") }, // added new 24-05-2022
        //             { invoiceNumber: new RegExp(this.validateRegExp(sharedService.encrypt(searchKey)), "g") },
        //             // { currency: new RegExp(this.validateRegExp(searchKey), "g") },
        //             // { vendorId: new RegExp(this.validateRegExp(searchKey), "g") },
        //             // { totalAmount: new RegExp(this.validateRegExp(searchKey), "g") }
        //         ],
        //     },
        //         secondFilter,
        //     ],
        // };

        const filter = this.getCustomizedFilter(searchKey, secondFilter);

        docCollection.countDocuments(filter, function (err, count) {
            if (err) {
                callback({
                    status: 500,
                    err: "INTERNAL_SERVER_ERROR",
                    errmsg: "error while fetching document list",
                },
                    null
                );
            } else {
                result.count = count;
                result.page = page;
                result.perPageRecords = limit;

                // if (result.count > 0) {
                docCollection
                    .aggregate([{
                        $match: filter,
                    },
                    {
                        $sort: {
                            submittedOn: -1,
                        },
                    },
                    {
                        $skip: skip,
                    },
                    {
                        $limit: limit,
                    },
                    {
                        $lookup: {
                            from: "vendor",
                            localField: "vendorId",
                            foreignField: "vendorId",
                            as: "vendor",
                        },
                    },
                    ])
                    .toArray(function (err, docs) {
                        result.documents = docs;
                        if (err) {
                            callback({
                                status: 500,
                                err: "INTERNAL_SERVER_ERROR",
                                errmsg: "error while fetching document list",
                            },
                                null
                            );
                        } else {
                            callback(null, result);
                        }

                        // result.count = docs.length;
                        // return resUtil.OK(res, apiParams, result);
                    });
            }
        });
    }

    getCustomizedFilter(searchKey, mainFilter) {
        const filter = {
            $and: [{
                $or: [
                    { documentId: new RegExp(this.validateRegExp(searchKey), "g") },
                    //{ docType: new RegExp(this.validateRegExp(searchKey), "g") },
                    //{ orgType: new RegExp(this.validateRegExp(searchKey), "g") },

                    { fileName: new RegExp(this.validateRegExp(searchKey), "g") },
                    { invoiceNumber: new RegExp(this.validateRegExp(sharedService.encrypt(searchKey)), "g") },
                    //{ currency: new RegExp(this.validateRegExp(searchKey), "g") },
                    //{ vendorId: new RegExp(this.validateRegExp(searchKey), "g") },
                    //{ totalAmount: new RegExp(this.validateRegExp(searchKey), "g") }
                ],
            },
                mainFilter,
            ],
        };

        return filter;
    }

    //internal method for getUsersListOf ClientAdmin
    getUsersListOfClientAdmin(userReq, callback) {
        let userIds = [];
        userCollection.find(userReq.filter).sort({ userId: 1 })
            .toArray(function (err, users) {
                if (err) {
                    callback(null, userIds);
                } else {
                    if (users) {
                        users.forEach(each => {
                            if (each.isActive) {
                                userIds.push(each.userId)
                            }
                        });
                        callback(null, userIds);
                    } else {
                        callback(null, userIds);
                    }
                }
            });
    }

    //internal method for getDocuments on basis of request filter
    getDocuments(userReq, callback) {
        //const filter = userReq && userReq.filter ? util.getSearchQuery(userReq.filter) : {};
        let filter = userReq && userReq.filter ? userReq.filter : {};

        let limit;

        if (!(userReq && userReq.limit)) {
            limit =
                typeof this.config.defaultResultSize === "string" ?
                    parseInt(this.config.defaultResultSize) :
                    this.config.defaultResultSize;
        } else {
            limit = userReq.limit;
        }

        const page = userReq.page || 1;
        const skip = limit * (page - 1);
        let result = {};
        let that = this;

        // For Processing
        if (filter.calledFrom == !'extractionAssist' || filter.calledFrom == undefined) {
            //let filter = userReq && userReq.filter ? util.getSearchQuery(userReq.filter) : {};

            let filter = userReq && userReq.filter ? userReq.filter : {};
            config.DETAILED_LOGGING == 1 && console.log(filter);

            docCollection.countDocuments(filter, function (err, count) {
                if (err) {
                    callback({
                        status: 500,
                        err: "INTERNAL_SERVER_ERROR",
                        errmsg: "error while fetching document list",
                    },
                        null
                    );
                } else {
                    result.count = count;
                    result.page = page;
                    result.perPageRecords = limit;

                    docCollection
                        .aggregate([
                            { $match: filter },
                            { $project: { _id: 0, rawPrediction: 0, pages: 0 } },
                            { $sort: { submittedOn: -1 }, },
                            { $skip: skip },
                            { $limit: limit },
                        ])
                        .toArray(function (err, docs) {

                            if (err) {
                                callback({
                                    status: 500,
                                    err: "INTERNAL_SERVER_ERROR",
                                    errmsg: "error while fetching document list",
                                },
                                    null
                                );
                            } else {
                                docs.forEach(element => {
                                    that.decryptDocData(element)
                                });
                                result.documents = docs;
                                callback(null, result);
                            }
                        });
                }
            });
        }
        else { // For Extraction Assist 
            delete filter.calledFrom;
            filter.status = 'REVIEW_COMPLETED';
            if (userReq.filter.userId) {
                userReq.filter.userId = { "$in": userReq.filter.userId }
            }
            resultCollection.countDocuments(filter, function (err, count) {
                if (err) {
                    callback({
                        status: 500,
                        err: "INTERNAL_SERVER_ERROR",
                        errmsg: "error while fetching document list",
                    },
                        null
                    );
                } else {
                    result.count = count;
                    result.page = page;
                    result.perPageRecords = limit;
                    // delete filter.status  
                    resultCollection
                        .aggregate([
                            {
                                $lookup: {
                                    from: "document_metadata",
                                    // localField: "documentId",
                                    // foreignField: "documentId",
                                    let: { document_Id: "$documentId" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr:
                                                    { $eq: ["$$document_Id", "$documentId"] }
                                            }
                                        },
                                        {
                                            $project: {
                                                _id: 0,
                                                documentId: 1, fileName: 1, status: 1, submittedOn: 1, createdOn: 1,
                                                lastUpdatedOn: 1, lastProcessedOn: 1, pageCount: 1, totalFields: 1,
                                                errors: 1, accuracy: 1, vendorId: 1, overall_score: 1, resultDownloadLink: 1,
                                            }
                                        }],
                                    as: "document_metadata_data",
                                }
                            },
                            // {
                            //     $lookup: {
                            //         from: "document_analytics_metadata",
                            //         localField: "documentId",
                            //         foreignField: "documentId",
                            //         as: "docs_analytics_data"
                            //     }
                            // },
                            // {
                            //     $match: {documentInfo : { $elemMatch : { extractionAssist : 0}},
                            //     "status" :'REVIEW_COMPLETED'
                            // },
                            // },
                            {
                                $match: filter,
                            },
                            {
                                $project: {
                                    documentInfo: 1,
                                    documentLineItems: 1,
                                    _id: 0,
                                    documentId: 1,
                                    vendorId: 1,
                                    document_metadata_data: 1,
                                }
                            },
                            // {
                            //     $sort: {
                            //         submittedOn: -1,
                            //     },
                            // },
                            // {
                            //     $skip: skip,
                            // },
                            // {
                            //     $limit: limit,
                            // }
                        ])
                        .toArray(function (err, docs) {
                            if (err) {
                                callback({
                                    status: 500,
                                    err: "INTERNAL_SERVER_ERROR",
                                    errmsg: "error while fetching document list",
                                },
                                    null
                                );
                            } else {
                                // result.count = docs.length;
                                // result.page = page;
                                // result.perPageRecords = limit;
                                let resultData = []
                                docs.forEach(element => {
                                    if (element && element.document_metadata_data.length > 0) {
                                        let data = {};
                                        data = element.document_metadata_data[0];
                                        delete element.document_metadata_data;
                                        data["docs_result"] = []
                                        data.docs_result.push(element);
                                        resultData.push(data)
                                    }
                                });
                                result.documents = resultData;
                                callback(null, result);
                            }
                        });
                }
            })
        }
    }

    //internal method for get all roleIds from the roles array
    getMappedRoleIds(rolesArray, validRoles) {
        let mappedRoleIds = [];

        rolesArray.filter((roleObj) => {
            if (validRoles.includes(roleObj.role)) {
                mappedRoleIds.push((roleObj._id).toString());
            }
        })
        return mappedRoleIds;
    }

    //internal method for appending the search filter in db format
    formfilterSearchKey(userReq) {
        userReq.filter = userReq && userReq.filter ? util.getSearchQuery(userReq.filter) : {};
        if (userReq.filter.status && userReq.filter.status == 'OTHERS') {
            // it should fetch all the status except 'FAILED','REVIEW','REVIEW_COMPLETED','DELETED'
            userReq.filter.status = { '$nin': ['FAILED', 'REVIEW', 'REVIEW_COMPLETED', 'DELETED', 'REASSIGN','RPA_PROCESSED', 'RPA_PROCESSING', 'RPA_FAILED', 'RPA_PENDING_APPROVAL'] }
        }

        if (userReq.filter && userReq.filter.vendorName) {
            userReq.filter.vendorName = sharedService.encrypt(userReq.filter.vendorName.trim())
        }

        if (userReq.filter.searchKey) {
            let mainFilter = userReq && userReq.filter ? userReq.filter : {};
            const searchKey = userReq.filter.searchKey;
            delete mainFilter.searchKey;
            // const filter = {
            //     $and: [{
            //         $or: [
            //             { documentId: new RegExp(this.validateRegExp(searchKey), "g") },
            //             //{ docType: new RegExp(this.validateRegExp(searchKey), "g") },
            //             //{ orgType: new RegExp(this.validateRegExp(searchKey), "g") },

            //             { fileName: new RegExp(this.validateRegExp(searchKey), "g") },
            //             { invoiceNumber: new RegExp(this.validateRegExp(sharedService.encrypt(searchKey)), "g") },
            //             //{ currency: new RegExp(this.validateRegExp(searchKey), "g") },
            //             //{ vendorId: new RegExp(this.validateRegExp(searchKey), "g") },
            //             //{ totalAmount: new RegExp(this.validateRegExp(searchKey), "g") }
            //         ],
            //     },
            //         mainFilter,
            //     ],
            // };
            const filter = this.getCustomizedFilter(searchKey, mainFilter);
            userReq.filter = filter
        }
    }

    //internal method to decrypt the encrypted keys
    decryptDocData(doc) {
        if (doc && doc.reviewedBy) {
            doc.reviewedBy = sharedService.decrypt(doc.reviewedBy)
        }
        if (doc && doc.deletedBy) {
            doc.deletedBy = sharedService.decrypt(doc.deletedBy)
        }
        if (doc && doc.reassignedBy) {
            doc.reassignedBy = sharedService.decrypt(doc.reassignedBy)
        }
        if (doc && doc.reassignReviewedBy) {
            doc.reassignReviewedBy = sharedService.decrypt(doc.reassignReviewedBy)
        }
        if (doc && doc.invoiceNumber) {
            doc.invoiceNumber = sharedService.decrypt(doc.invoiceNumber)
        }
        if (doc && doc.totalAmount) {
            doc.totalAmount = sharedService.decrypt(doc.totalAmount)
        }
        if (doc && doc.invoiceDate) {
            doc.invoiceDate = sharedService.decrypt(doc.invoiceDate)
        }
        if (doc && doc.vendorName) {
            doc.vendorName = sharedService.decrypt(doc.vendorName)
        }
        return doc;
    }

    validateRegExp(searchKey){
        const validRegExp = searchKey.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
        return validRegExp
    }
    //<------------XXXXXXXXXXXX---UTILITY METHODS ENDS------XXXXXXXXXXXX---------------------------->
}
module.exports = new DocumentService(config);
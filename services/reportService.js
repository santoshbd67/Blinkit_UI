const config = require("../config");
const sqlCon = require("../util/sqlClient");
const resUtil = require("../util/resUtil");
const async = require("async");
const { getDataTobeStored } = require("../util/shared");
const { metadata_Mapping, result_Mapping, sqlTables, dataTypeCheck, valueCheckInRPATable } = require("../util/sqlMappingData");
const { selectQuery, insertQuery, updateQuery, deleteQuery } = require("../util/sqlQueries");

class ReportService {
    constructor(config) {
        this.config = config;
    }

    //<============================REST APIs Starts===================================>

    getRecords = async (req, res) => {
        const apiParams = {
            id: "api.reports.get",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        // const selectQuery = "SELECT * FROM test_report";
        // const response = await sqlCon.query(selectQuery)

        let tableName = sqlTables.metaData;
        let mappingObject;

        switch (req.query.type) {
            case "1":
            case 1: tableName = sqlTables.metaData;
                mappingObject = metadata_Mapping;
                break;

            case "2":
            case 2: tableName = sqlTables.result;
                mappingObject = result_Mapping;
                break;

            case "3":
            case 3: tableName = sqlTables.rpaMetaData;
                break;
        }

        let whereClause = '';
        let docId = req.query.documentId;

        if (req.query && docId) {
            whereClause = (docId.startsWith("'")) ? `document_id=${docId}` : `document_id='${docId}'`
        }

        const response = await this.generateQuery('select', tableName, whereClause)

        if (!response) {
            console.log(response);
            resUtil.handleError(req, res, { status: 500, err: 'Some internal error' });
            return;
        }

        if (response.rows.length > 0 && tableName != sqlTables.rpaMetaData) { // for mapping db_columns to requiredFormat like document_id ==> Document ID
            response.rows.forEach(element => {
                Object.keys(element).forEach(key => {
                    //this.updateKey(element, key, mappingObject);
                    let oldKey = key;
                    let requiredEntry = Object.entries(mappingObject).find(entry => {
                        if (entry[0] === key) {
                            return entry[1];
                        }
                    });
                    let newKey = (requiredEntry && requiredEntry.length > 0) ? requiredEntry[1] : key;
                    element[newKey] = element[oldKey];
                    delete element[oldKey];
                })
            });
        }

        resUtil.OK(res, apiParams, { msg: "data fetched successfully", data: response.rows });
    }

    insertRecords = async (req, res) => {
        try {
            console.log(`Entered in insertRecords API at ${new Date().toUTCString()} with below data.`);
            console.log(req.body.request);

            const apiParams = {
                id: "api.reports.add",
                msgid: req.body.params ? req.body.params.msgid : ""
            };

            let reqData = req.body.request;

            if (!(req.body && reqData && typeof reqData == "object" && reqData.tableName && reqData.data && typeof reqData.data == "object")) {
                apiParams.err = "Invalid Request";
                console.log(`From InsertRecord Returned with 'Invalid Request' response at ${new Date().toUTCString()}`);
                resUtil.BADREQUEST(res, apiParams, {});
                return;
            }

            if (reqData.tableName !== 'rpaMetadata') {
                apiParams.err = "Permission not allowed OR Invalid table name.";
                console.log(`From InsertRecord Returned with ${apiParams.err} response at ${new Date().toUTCString()}`);
                resUtil.BADREQUEST(res, apiParams, {});
                return;
            }

            let tableName;
            let isInvalidValue = false;

            switch (reqData.tableName) {
                case "rpaMetadata":
                    tableName = sqlTables.rpaMetaData;

                    Object.keys(reqData.data).forEach(element => {
                        let name = element;
                        let value = reqData.data[element];

                        if (isInvalidValue) {
                            return;
                        }

                        let response = valueCheckInRPATable(name, value);
                        if (!response.status) {
                            apiParams.err = response.Error;
                            isInvalidValue = true;
                            console.log(`From InsertRecord Returned with -> ${apiParams.err} <- response at ${new Date().toUTCString()}`);
                            resUtil.BADREQUEST(res, apiParams, {});
                            return;
                        }
                    });
                    break;
            }

            if (isInvalidValue) {
                return;
            }

            let dataToBeInsert = this.getColumnsAndValueList(reqData.data);
            let columnList = dataToBeInsert.columnList;
            let valueList = dataToBeInsert.valueList;
            let WhereClause = null;

            const response = await this.generateQuery('insert', tableName, WhereClause, columnList, [valueList]);

            if (!response) {
                console.log(`Got null repsonse in insertRecords API for documentId ${reqData.data.document_id} at ${new Date().toUTCString()}`);
                console.log(response);
                resUtil.handleError(req, res, { status: 500, errmsg: 'Inernal_Server_Error' });
                return;
            }

            if (response && typeof (response) == 'object' && response.code == 'EXEC_FAILED') {
                console.log(`Got error message in insertRecords API for documentId ${reqData.data.document_id} at ${new Date().toUTCString()}`);
                console.log(response);
                resUtil.handleError(req, res, { err: response.message, status: 500, errmsg: 'Inernal_Server_Error' });
                return;
            }

            let responseMsg = "Failed";
            if (response && response.rowCount > 0) {
                responseMsg = `Record with documentId ${reqData.data.document_id} Inserted successfully in ${reqData.tableName} table`
            }

            console.log(`From insertRecords API, Record was successfully inserted in ${reqData.tableName} table for documentId ${reqData.data.document_id} at ${new Date().toUTCString()} `);

            resUtil.OK(res, apiParams, { msg: "Add records", data: responseMsg });
        } catch (error) {
            console.log(`Got exception in insertRecords API for documentId ${reqData.data.document_id} at ${new Date().toUTCString()}`);
            console.log(error);
            resUtil.handleError(req, res, { status: 500, errmsg: 'Inernal_Server_Error' });
        }
    }

    updateRecords = async (req, res) => {
        try {
            console.log(`Entered in updateRecords API at ${new Date().toUTCString()} with below data.`);
            console.log(req.body.request);

            const apiParams = {
                id: "api.reports.update",
                msgid: req.body.params ? req.body.params.msgid : ""
            };

            let reqData = req.body.request;

            if (!(
                req.body && reqData && typeof reqData == "object" &&
                reqData.tableName && reqData.data && typeof reqData.data == "object")) {
                apiParams.err = "Invalid Request";
                console.log(`From updateRecords Returned with 'Invalid Request' response at ${new Date().toUTCString()}`);
                resUtil.BADREQUEST(res, apiParams, {});
                return;
            }

            if (reqData.tableName !== 'rpaMetadata') {
                apiParams.err = "Permission not allowed OR Invalid table name.";
                console.log(`From updateRecords Returned with ${apiParams.err} response at ${new Date().toUTCString()}`);
                resUtil.BADREQUEST(res, apiParams, {});
                return;
            }

            if (reqData.tableName === 'rpaMetadata' && !reqData.rpa_message_id && !reqData.rpa_record_id) {
                apiParams.err = "Missing rpa_message_id OR rpa_record_id";
                console.log(`From updateRecords Returned with ${apiParams.err} response at ${new Date().toUTCString()}`);
                resUtil.BADREQUEST(res, apiParams, {});
                return;
            }

            let tableName;
            let WhereClause;
            let isInvalidValue = false;

            switch (reqData.tableName) {
                case "rpaMetadata":
                    tableName = sqlTables.rpaMetaData;
                    WhereClause = `rpa_message_id='${reqData.rpa_message_id}' AND rpa_record_id='${reqData.rpa_record_id}'`

                    Object.keys(reqData.data).forEach(element => {
                        let name = element;
                        let value = reqData.data[element];

                        if (isInvalidValue) {
                            return;
                        }

                        let response = valueCheckInRPATable(name, value);
                        if (!response.status) {
                            apiParams.err = response.Error;
                            isInvalidValue = true;
                            console.log(`From updateRecord Returned with -> ${apiParams.err} <- response at ${new Date().toUTCString()}`);
                            resUtil.BADREQUEST(res, apiParams, {});
                            return;
                        }
                    });

                    break;
            }

            if (isInvalidValue) {
                return;
            }

            let dataToBeReset = this.getDataToBeUpdated(reqData.data);

            const response = await this.generateQuery('update', tableName, WhereClause, null, null, dataToBeReset);

            if (!response) {
                console.log(`Got null repsonse in updateRecords API for documentId ${reqData.data.document_id} at ${new Date().toUTCString()}`);
                console.log(response);
                resUtil.handleError(req, res, { status: 500, err: 'Some internal error' });
                return;
            }

            if (response && typeof (response) == 'object' && response.code == 'EXEC_FAILED') {
                console.log(`Got error message in updateRecords API for documentId ${reqData.data.document_id} at ${new Date().toUTCString()}`);
                console.log(response);
                resUtil.handleError(req, res, { err: response.message, status: 500, errmsg: 'Inernal_Server_Error' });
                return;
            }

            let responseMsg = "Not Found";
            if (response && response.rowCount > 0) {
                responseMsg = `record with documentId ${reqData.data.document_id} updated successfully in ${reqData.tableName} table`
            }

            console.log(`From updateRecords API, Record was successfully updated in ${reqData.tableName} table for documentId ${reqData.data.document_id} at ${new Date().toUTCString()} `);

            resUtil.OK(res, apiParams, { msg: "update records", data: responseMsg });

        } catch (error) {
            console.log(`Got exception in updateRecords API for documentId ${reqData.data.document_id} at ${new Date().toUTCString()}`);
            console.log(error);
            resUtil.handleError(req, res, { status: 500, errmsg: 'Inernal_Server_Error' });
        }
    }

    deleteRecords = async (req, res) => {
        const apiParams = {
            id: "api.reports.delete",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        let reqData = req.body.request;

        if (!(
            req.body && req.body.request && typeof req.body.request == "object" &&
            reqData.WhereCluase && reqData.tableName
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        // const deleteQuery = {
        //     text: `DELETE FROM test_report WHERE report_time = '${reqData.deleteId}'`
        // }

        // const response = await sqlCon.query(deleteQuery);

        let whereClause = reqData.WhereCluase;
        let tableName = reqData.tableName;

        const response = await this.generateQuery('delete', tableName, whereClause);

        if (!response) {
            console.log(response);
            resUtil.handleError(req, res, { status: 500, err: 'Some internal error' });
            return;
        }

        let responseMsg = "Not Found";
        if (response && response.rowCount > 0) {
            responseMsg = "records deleted successfully"
        }

        resUtil.OK(res, apiParams, { msg: "delete records", data: responseMsg });
    }

    bulkInsert = async (req, res) => {
        const apiParams = {
            id: "api.reports.bulkInsert",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        try {
            async.waterfall([
                function (callback) {

                    let documents = [
                        "doc_1666781664079_99898bb988a",
                        "doc_1666781529936_88aa999bb9a",
                        "doc_1666762316083_b899bb99b99",
                        "doc_1666760829027_8bab89a999b"
                    ]

                    callback(null, documents);
                },
                function (documents, callback) {
                    if (documents && documents.length > 0) {
                        documents.forEach(doc => {
                            const response = getDataTobeStored(doc);
                        });
                        callback(null, { message: "Data Stored successfully" })
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
        } catch (error) {
            console.log("Error in bulkInsert API method");
            console.log(error);
            resUtil.handleError(req, res, error);
        }
    }

    //<============================REST APIs Ends===================================>

    //<============================Internal Methods===================================>

    generateQuery = async (queryType, tableName, WhereClause = '', columnList = [], valueList = [], dataToBeReset = '') => {
        try {
            if (!queryType || !tableName) {
                return "Missing QueryType or TableName"
            }
            let responseData;
            switch (queryType.toUpperCase()) {
                case "SELECT":
                    responseData = await selectQuery(tableName, WhereClause);
                    break;
                case "INSERT":
                    responseData = await insertQuery(tableName, WhereClause, columnList, valueList);
                    break;
                case "UPDATE":
                    responseData = await updateQuery(tableName, WhereClause, dataToBeReset)
                    break;
                case "DELETE":
                    responseData = await deleteQuery(tableName, WhereClause)
                    break;
                default:
                    break;
            }
            return responseData;
        } catch (error) {
            console.log(`Got Error in generateQuery method at ${new Date()}:- `);
            console.log(error);
            return null;
        }
    }

    updateKey(element, key, mappingObject) {
        for (let innerKey in mappingObject) {
            if (innerKey === key) {
                element[mappingObject[key]] = element[key]
                delete element[key]
            }
        }
    }

    insertRPAData = async (documentData) => {
        try {
            console.log(`Entered in insertRPAData method with below rpa_data at ${new Date()} for documentId ${documentData.documentId}...`);
            console.log(documentData);

            let columnList = `rpa_message_id,rpa_record_id,rpa_file_name,
                          rpa_file_path,rpa_received_from,rpa_received_comment,
                          rpa_number_files,rpa_recieve_time,rpa_upload_time,
                          rpa_upload_retry_count,rpa_upload_status,rpa_manual_upload_queue,
                          rpa_upload_comment,rpa_upload_mode,document_id`;

            let valueList = [
                documentData.documentId, documentData.documentId, documentData.fileName,
                documentData.fileName, 'UI', 'UI',
                1, documentData.submittedOn, documentData.submittedOn,
                0, 'Success', 0,
                'UI', 'UI', documentData.documentId
            ];

            const queryResponse = await insertQuery(sqlTables.rpaMetaData, null, columnList, [valueList], documentData.documentId)

            if (queryResponse != null) {
                console.log(`Record inserted successfully in rpa_metadata table for documentId:- ${documentData.documentId} at ${new Date().toUTCString()}`);
            }
            else {
                console.log(`Record could not be inserted in rpa_metadata table for documentId:- ${documentData.documentId} at ${new Date().toUTCString()} becoz response was`);
                console.log(queryResponse);
            }
        } catch (error) {
            console.log(`Got Error while insertRPAData method for documentId:- ${documentData.documentId} at ${new Date().toUTCString()}`);
            console.log(error);
            return;
        }
    }

    getColumnsAndValueList(dataObject) {
        const data = {
            valueList: [],
            columnList: ''
        }

        Object.keys(dataObject).forEach(element => {
            if (element) {
                let value = dataObject[element];
                (typeof value === "object") ? data.valueList.push(`{${value}}`) : data.valueList.push(dataTypeCheck(element, value));
                data.columnList = data.columnList ? data.columnList + ', ' + element : data.columnList + element;
            }
        });
        data.valueList = [data.valueList];

        return data;
    }

    getDataToBeUpdated(dataObject) {
        let data = '';
        try {
            Object.keys(dataObject).forEach((element, index) => {

                let columnName = element;//Object.keys(metadata_Mapping).find(key => metadata_Mapping[key] === element);
                let value = dataObject[element];
                value = (typeof value === "object") ? `{${value}}` : dataTypeCheck(columnName, value);

                if (columnName) {
                    if (value != null && typeof (value) == 'string')
                        data += columnName + "='" + value + "'";
                    else
                        data += columnName + "=" + value;

                    if (index != Object.keys(dataObject).length - 1) {
                        data += ",";
                    }
                }
            });
            return data;
        } catch (error) {
            console.log("Error from getDataToBeUpdated method:-");
            console.log(error);
            return data;
        }
    }
}

module.exports = new ReportService(config);


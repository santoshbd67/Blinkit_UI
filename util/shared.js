const axios = require('axios');
const util = require("./util");
const config = require('../config');
const { metadata_Mapping, result_Mapping, sqlTables, dataTypeCheck } = require("./sqlMappingData");
const { selectQuery, insertQuery, updateQuery, deleteQuery } = require("../util/sqlQueries");

const getDataTobeStored = async (documentId) => {
    try {
        console.log(`Entered in getDataTobeStored method for docId ${documentId} at ${new Date().toUTCString()}`);

        let response = await axios.post(config.reportsDataPath, { document_id: documentId })

        console.log(`Python API response for docId ${documentId} retreived successfully at ${new Date().toUTCString()}`);
        console.log(response.data);
        // { status: 'Failure', responseCode: 500, message: 'Failure' }

        console.log(`Now inserting/updating Record for docId ${documentId} in PostgreSQL ..`);
        
        if(response.data.responseCode!==200){
            // if anything goes wrong in python API this if condition will exicute
            console.log(`Got resposeCode ${response.data.responseCode} in getDataTobeStored method for documentId  ${documentId}.. at ${new Date().toUTCString()}`);
            handleErrorWhileDataStore(documentId);
            return { "responseCode": 500 }
        }

        if (response.data.doc_metadata) {
            const tableName = sqlTables.metaData;

            //check whether document exists or not in table
            let WhereClause = `document_id='${documentId}'`;
            let ifDataExists = await selectQuery(tableName, WhereClause)
            console.log(`Checking isDataExists for ${documentId} in ${tableName}..Response(only rows) from metadata table:- `);

            if (ifDataExists && ifDataExists.rows && ifDataExists.rows.length > 0) { //UPDATE
                console.log(`isDataExists Response retreived for ${documentId} and count is ${ifDataExists.rows.length} So updating data..`);
                handleUpdateQueryResponse(tableName, response, WhereClause, documentId);
            }
            else { // INSERT
                console.log(`isDataExists Response retreived for ${documentId} and response is ${ifDataExists} So inserting data..`);
                const queryFormat = "object"; // it is object becoz typeof response.data.doc_metadata == {}
                response.data.doc_metadata["lastUpdated"] = util.generateTimestamp();
                handelInsertQueryResponse(tableName, response.data.doc_metadata, metadata_Mapping, queryFormat, documentId);
            }
        }

        if (config.UPDATE_RPA_METADATA == 1 && response.data.rpa_metadata) {
            const tableName = sqlTables.rpaMetaData;

            //check whether document exists or not in table
            let WhereClause = `document_id='${documentId}'`;
            let ifDataExists = await selectQuery(tableName, WhereClause)
            console.log(`Checking isDataExists for ${documentId} in ${tableName}..Response(only rows) from rpa metadata table:- `);

            if (ifDataExists && ifDataExists.rows && ifDataExists.rows.length > 0) { //UPDATE
                console.log(`isDataExists Response retreived for ${documentId} and count is ${ifDataExists.rows.length} So updating data..`);
                handleUpdateQueryResponse(tableName, response, WhereClause, documentId);
            }
        }

        if (response.data.doc_res) {
            const tblName = sqlTables.result;
            let WhereClause = `document_id='${documentId}'`;

            let ifDataExists = await selectQuery(tblName, WhereClause);
            console.log(`Checking isDataExists for ${documentId} in ${tblName} Response(only rows count) from result table:- at ${new Date().toUTCString()} `);
            console.log(ifDataExists.rows.length);

            const queryFormat = "array"; // it is array becoz typeof response.data.doc_res == []
            if (ifDataExists && ifDataExists.rows && ifDataExists.rows.length > 0) {  //DELETE
                let deleteResponse = await deleteQuery(tblName, WhereClause);
                if (deleteResponse && deleteResponse.rowCount > 0) {
                    console.log("records deleted successfully.");
                }
                handelInsertQueryResponse(tblName, response.data.doc_res, result_Mapping, queryFormat, documentId);
            }
            else {
                handelInsertQueryResponse(tblName, response.data.doc_res, result_Mapping, queryFormat, documentId);
            }
        }
    } catch (error) {
        console.log(`Got Error in getDataTobeStored method for documentId  ${documentId}.. at ${new Date().toUTCString()}`);
        console.log(error);
        handleErrorWhileDataStore(documentId);
        return { "responseCode": 500 }
    }
}

const getCloumnsAndValues = (queryObject, mappingObject, queryFormat) => {
    const data = {
        valueList: [],
        columnList: ''
    }

    /* queryFormat == object will be used for document_metadata table
       queryFormat == array will be used for document_result table */

    try {
        if (queryFormat == 'object') {
            Object.keys(queryObject).forEach(element => {
                let value = queryObject[element];

                element = Object.keys(mappingObject).find(key => mappingObject[key] === element);
                if (element) {
                    //(typeof value === "object") ? data.valueList.push(`{${value}}`) : data.valueList.push(dataTypeCheck(element, value)); //commented on 07-02-2023 for TAPP
                    if (typeof value === "object") {
                        // data.valueList.push(`{${value}}`);
                        if (value == null) {
                            data.valueList.push(value);
                        }
                        else {
                            data.valueList.push(`{${value}}`);
                        }
                    }
                    else {
                        data.valueList.push(dataTypeCheck(element, value));
                    }

                    data.columnList = data.columnList ? data.columnList + ', ' + element : data.columnList + element;
                }
            });
            data.valueList = [data.valueList];
        }

        // here queryObject is expected tob array of objects
        if (queryFormat == 'array') {
            data.columnList = '';

            // create cloumnList
            Object.keys(mappingObject).forEach((key) => {
                data.columnList = data.columnList ? data.columnList + ', ' + key : data.columnList + key;
            })

            // create valueList
            queryObject.forEach((element) => {
                let innerArray = [];

                Object.keys(mappingObject).forEach((innerKey) => {
                    let key = mappingObject[innerKey];
                    let value = null;
                    if (element.hasOwnProperty(key)) {
                        value = element[key]
                    }
                    (typeof value === "object" && value != null) ? innerArray.push(`{${value}}`) : innerArray.push(value);
                });
                data.valueList.push(innerArray);
            })
        }
        return data;
    } catch (error) {
        console.log("Error in getCloumnsAndValues method:- ");
        console.log(error);
        return data;
    }
}

const getDataToBeUpdated = (metadata_object,mapping_object) => {
    let data = '';
    try {
        Object.keys(metadata_object).forEach((element, index) => {            
            
            let columnName = mapping_object? Object.keys(mapping_object).find(key => mapping_object[key] === element):element
            let value = metadata_object[element];
            //value = (typeof value === "object") ? `{${value}}` : dataTypeCheck(columnName, value);//commented on 07-02-2023 for TAPP
            if (typeof value === "object") {
                if (value == null) {
                    value = value;
                }
                else {
                    value = `{${value}}`;
                }
            }
            else {
                value = dataTypeCheck(columnName, value);
            }

            if (columnName) {
                if (value != null && typeof (value) == 'string')
                    data += columnName + "='" + value + "'";
                else
                    data += columnName + "=" + value;

                if (index != Object.keys(metadata_object).length - 1) {
                    data += ",";
                }
            }
        });
        return data;
    } catch (error) {
        console.log("Error in getDataToBeUpdated method:-");
        console.log(error);
        return data;
    }
}

const handelInsertQueryResponse = async (tableName, queryObject, mappingObject, queryFormat, documentId = '') => {
    try {
        console.log(`INSERTING RECORD INTO ${tableName}..`);
        const data = getCloumnsAndValues(queryObject, mappingObject, queryFormat);
        const valueList = data.valueList;
        const columnList = data.columnList;
        let queryResponse = await insertQuery(tableName, null, columnList, valueList);

        if (queryResponse != null) {
            if (queryResponse && typeof (queryResponse) == 'object' && queryResponse.code == 'EXEC_FAILED') {
                console.log(`Got error message in handelInsertQueryResponse method for documentId ${documentId} in table ${tableName} at ${new Date().toUTCString()}`);
                console.log(queryResponse);
            }
            else {
                console.log(`Record inserted in PostgreSQL successfully for documentId ${documentId} in table ${tableName} at ${new Date().toUTCString()}.`);
            }
        }
        else {
            console.log(`Record couldn't be inserted in PostgreSQL for documentId ${documentId} in table ${tableName} at ${new Date().toUTCString()}.`);
        }
    } catch (error) {
        console.log(`Got Error in handelInsertQueryResponse for documentId ${documentId} in table ${tableName} at ${new Date().toUTCString()}.`);
        console.log(error);
        return;
    }
}

const handleUpdateQueryResponse = async (tableName, response, WhereClause, documentId = '') => {
    try {
        console.log(`UPDATING RECORD INTO ${tableName}..`);
        let dataToBeReset = tableName === sqlTables.metaData? getDataToBeUpdated(response.data.doc_metadata,metadata_Mapping) : getDataToBeUpdated(response.data.rpa_metadata);
        let queryResponse = await updateQuery(tableName, WhereClause, dataToBeReset);

        if (queryResponse != null) {
            if (queryResponse && typeof (queryResponse) == 'object' && queryResponse.code == 'EXEC_FAILED') {
                console.log(`Got error message in handleUpdateQueryResponse method for documentId ${documentId} in table ${tableName} at ${new Date().toUTCString()}`);
                console.log(queryResponse);
            }
            else {
                console.log(`Record updated in PostgreSQL successfully for documentId ${documentId} in table ${tableName} at ${new Date().toUTCString()}.`);
            }
        }
        else {
            console.log(`Record couldn't be updated in PostgreSQL for documentId ${documentId} in table ${tableName} at ${new Date().toUTCString()}.`);
        }
    } catch (error) {
        console.log(`Error in handleUpdateQueryResponse for documentId ${documentId} in table ${tableName} at ${new Date().toUTCString()}.`);
        console.log(error);
        return;
    }
}

const handleErrorWhileDataStore = async (documentId) => {
    console.log(`Entered in handleErrorWhileDataStore method for documentId :- ${documentId} at ${util.generateTimestamp()}`);

    try {
        const tableName = sqlTables.metaData;
        //check document exists or not
        let WhereClause = `document_id='${documentId}'`;
        let ifDataExists = await selectQuery(tableName, WhereClause)
        console.log(`From handleErrorWhileDataStore method checking isDataExists for ${documentId} in ${tableName}..Response(only rows) from metadata table:- `);
        console.log(ifDataExists.rows);

        if (ifDataExists && ifDataExists.rows && ifDataExists.rows.length > 0) { //UPDATE
            console.log(`From handleErrorWhileDataStore method UPDATING RECORD INTO ${tableName}.. for ${documentId} at ${util.generateTimestamp()}`);
            let dataToBeReset = "status='ERR'"
            let queryResponse = await updateQuery(tableName, WhereClause, dataToBeReset);

            if (queryResponse != null) {
                if (queryResponse && typeof (queryResponse) == 'object' && queryResponse.code == 'EXEC_FAILED') {
                    console.log(`Got error message in handleErrorWhileDataStore method for table ${tableName} and documentId ${documentId} at ${new Date().toUTCString()}`);
                    console.log(queryResponse);
                }
                else {
                    console.log(`From handleErrorWhileDataStore method Record updated in PostgreSQL successfully for ${documentId} in ${tableName} at ${new Date().toUTCString()}.`);
                }
            }
            else {
                console.log(`From handleErrorWhileDataStore method Record couldn't be updated in PostgreSQL for ${documentId} in ${tableName} at ${new Date().toUTCString()}.`);
            }
        }
        else {
            let obj = {};
            obj["Document ID"] = documentId;
            obj["Status"] = 'ERR';
            obj["lastUpdated"] = util.generateTimestamp();

            const queryFormat = "object";
            console.log(`From handleErrorWhileDataStore method Inserting record for documentId:-  ${documentId}... at ${util.generateTimestamp()}`);
            handelInsertQueryResponse(tableName, obj, metadata_Mapping, queryFormat, documentId);
        }
    } catch (error) {
        console.log(`Error in handleErrorWhileDataStore method for documentId:- ${documentId} at ${util.generateTimestamp()}`);
        console.log(error);
    }
}

const hasWhiteSpace = (s) => {
    return (/\s/).test(s);
}

module.exports = { getDataTobeStored, handleErrorWhileDataStore };
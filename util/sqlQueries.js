const format = require('pg-format');
const sqlCon = require("../util/sqlClient");
const consumptionCon = require("../util/sqlClientConsumption");

const selectQuery = async (tableName, WhereClause, calledFrom = '') => {
    try {
        let selectQuery;
        if (WhereClause)
            selectQuery = format(`SELECT * FROM ${tableName} WHERE ${WhereClause}`)
        else
            selectQuery = format(`SELECT * FROM ${tableName}`)
        console.log(`BELOW SELECT QUERY EXECUTED AT ${new Date().toUTCString()} FOR TABLE ${tableName}`);
        console.log(selectQuery)
        let data = await executeQuery(selectQuery, calledFrom);
        return data;
    } catch (error) {
        console.log(`Got Error in selectQuery method at ${new Date().toUTCString()} `);
        console.log(error);
        return null;
    }
}

const insertQuery = async (tableName, WhereClause, columnList, valueList, documentId = '') => {
    try {
        let insertQuery;
        if (WhereClause) {
            insertQuery = format(`INSERT INTO ${tableName} (${columnList}) VALUES %L WHERE ${WhereClause} returning *`, valueList);
        }
        else {
            insertQuery = format(`INSERT INTO ${tableName} (${columnList}) VALUES %L returning *`, valueList);
        }
        console.log(`BELOW INSERT QUERY EXECUTED AT ${new Date().toUTCString()} FOR TABLE ${tableName}`);
        console.log(insertQuery);
        let data = await executeQuery(insertQuery);
        return data;
    } catch (error) {
        console.log(`Got Error in insertQuery method for documentId ${documentId} at ${new Date().toUTCString()}`);
        console.log(error);
        return null;
    }
}

const updateQuery = async (tableName, WhereClause, dataToBeReset) => {
    try {
        let updateQuery = format(`UPDATE ${tableName} SET ${dataToBeReset} WHERE ${WhereClause} RETURNING *`)
        console.log(`BELOW UPDATE QUERY EXECUTED AT ${new Date().toUTCString()} FOR TABLE ${tableName}`);
        console.log(updateQuery);
        let data = await executeQuery(updateQuery);
        return data;
    } catch (error) {
        console.log(`Got Error in updateQuery method at ${new Date().toUTCString()}`);
        console.log(error);
        return null;
    }
}

const deleteQuery = async (tableName, WhereClause) => {
    try {
        let deleteQuery = format(`DELETE FROM ${tableName} WHERE ${WhereClause}`)
        console.log(`BELOW DELETE QUERY EXECUTED AT ${new Date().toUTCString()} FOR TABLE ${tableName}`);
        console.log(deleteQuery);
        let data = await executeQuery(deleteQuery);
        return data;
    } catch (error) {
        console.log(`Got Error in deleteQuery method at ${new Date().toUTCString()}`);
        console.log(error);
        return null;
    }
}

const executeQuery = async (query, calledFrom = '') => {
    try {
        if (calledFrom === 'CONSUMPTION_DB') {
            const response = await consumptionCon.query(query);
            return response;
        }
        else {
            const response = await sqlCon.query(query);
            return response;
        }

    } catch (error) {
        console.log(`Got Error in executeQuery method at ${new Date().toUTCString()}`);
        console.log(error);
        let res = {
            code: "EXEC_FAILED",
            message: error.message
        }
        return res;
    }
}

module.exports = { selectQuery, insertQuery, updateQuery, deleteQuery, executeQuery };
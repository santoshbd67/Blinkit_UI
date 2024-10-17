var postGreSqlPool = require('pg').Pool;
const config = require('../config');

function getConsumptionDBConnection() {
    const { consumptionSqlDBHost, consumptionSqlDBPort, consumptionSqlDBUsername, consumptionSqlDBPassword, consumptionSqlDBName } = config;
    
    var con = new postGreSqlPool({
        host: consumptionSqlDBHost,
        port: consumptionSqlDBPort,
        user: consumptionSqlDBUsername,
        password: consumptionSqlDBPassword,
        database: consumptionSqlDBName
    })
    return con;
}

module.exports = getConsumptionDBConnection();
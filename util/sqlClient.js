var postGreSqlPool = require('pg').Pool;
const config = require('../config');

function getPostGreSqlConnection() {
    const { sqlDBHost, sqlDBPort, sqlDBUsername, sqlDBPassword, sqlDBName } = config;
    
    var con = new postGreSqlPool({
        host: sqlDBHost,
        port: sqlDBPort,
        user: sqlDBUsername,
        password: sqlDBPassword,
        database: sqlDBName
    })
    return con;
}

module.exports = getPostGreSqlConnection();
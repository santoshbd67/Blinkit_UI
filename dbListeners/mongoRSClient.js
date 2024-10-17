const MongoRSClient = require('mongodb').MongoClient;
const assert = require('assert');
const config = require('../config');

const replicaSetName = process.env.tapp_mongodb_rs_name || 'rs0';
const enableChangeStreams = process.env.tapp_listen_change_streams || false;

// Connection URL
const url = config.mongoDBHost;

// Database Name
const dbName = config.mongoDBName;

// Create a new MongoClient for Replica Set
const mongoRSClient = new MongoRSClient(url + '?replicaSet=' + replicaSetName);

if (enableChangeStreams) {
    try {
        // Use connect method to connect to the Server
        mongoRSClient.connect(function (err) {
            assert.equal(null, err);
            console.log("Connected successfully to replica set");
        });
    } catch (error) {
        console.log("Error while connecting to mongodb replica set.");
        console.log(error);
    }
}

function getReplicaSetDatabase(dbName) {
    return mongoRSClient.db(dbName);
}

module.exports.rsClient = mongoRSClient;
module.exports.getReplicaSetDatabase = getReplicaSetDatabase;
module.exports.listenChangeStreams = enableChangeStreams;
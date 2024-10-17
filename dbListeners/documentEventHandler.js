const _ = require('lodash');
const mongoRSClient = require('./mongoRSClient');
const config = require('../config');
const util = require('../util/util');
const dbutil = require('../util/db');
const TelemetryUtil = require('../telemetry/telemetryService');

const telemetry = new TelemetryUtil({
    "uid": "system"
});
const pdata = {
    "pdata": {
        "id": "com.tapp.dblistener",
        "ver": "1.0",
        "pid": "documentEventHandler"
    }
};

let auditCollection;
let documentCollection;

if (mongoRSClient.listenChangeStreams) {
    const db = mongoRSClient.getReplicaSetDatabase(config.mongoDBName);
    const docsCollection = db.collection('document_metadata');

    const primaryDB = dbutil.getDatabase(config.mongoDBName);
    auditCollection = primaryDB.collection('telemetry_audit');
    documentCollection = primaryDB.collection('document_metadata');

    const changeStream = docsCollection.watch({
        fullDocument: 'updateLookup'
    });
    changeStream.on('change', next => {
        // process next document
        generateAuditEvent(next);
    });
}

function generateAuditEvent(change) {
    let operation = change.operationType;
    let document = change.fullDocument;
    let timestamp = util.generateTimestamp();
    let data = {};
    if (operation == "insert") {
        let props = getProps(document);
        data.props = props;
        data.state = "NEW";
    } else if (operation == "update" && change.updateDescription.updatedFields) {
        let updatedFields = change.updateDescription.updatedFields;
        if (updatedFields.status) {
            let props = getProps(updatedFields);
            data.props = props;
            data.state = updatedFields.status;
            if (data.state == "READY_FOR_EXTRACTION" || data.state == "EXTRACTION_DONE" || data.state == "PROCESSED") {
                data.duration = timestamp - document.lastSubmittedOn;
            } else if (data.state == "REVIEW_COMPLETED") {
                data.duration = timestamp - document.lastExtractedOn;
            } else {
                data.duration = 0;
            }
        }
    }
    if (data.state) {
        let documentId = document.documentId;
        updateDocumentFields(documentId, data.state, document, timestamp);
        let vendorId = document.vendorId;
        let cdata = {};
        if (document.vendorId) {
            cdata.type = "vendor";
            cdata.id = document.vendorId;
        }
        const edata = telemetry.auditEventData(data.props, data.state, data.prevstate, data.duration);
        let telEvent = telemetry.audit({
            data: edata,
            context: {
                "cdata": [cdata]
            },
            tags: [],
            object: {
                "id": documentId,
                "type": "document"
            }
        });
        _.unset(telEvent, "_id");
        auditCollection.insertOne(telEvent, function (err, result) {
            if (err) {
                // TODO: log telemetry error event
                console.log("Failed inserting telemetry event: ", err);
            }
        });
    }
}

function getProps(fields) {
    let props = [];
    _.forIn(fields, function (value, key) {
        if (key != "_id") {
            props.push({
                "prop": key,
                "nv": value
            });
        }
    });
    return props;
}

function updateDocumentFields(documentId, state, dbDoc, timestamp) {
    let document = {};
    
    document.documentId = documentId;
    if (state == "NEW") {
        document.createdOn = timestamp;
    } else if (state == "PRE_PROCESSING" || state == "EXTRACTION_INPROGRESS" || state == "RPA_PROCESSING") {
        document.lastSubmittedOn = timestamp;
    } else if (state == "READY_FOR_EXTRACTION") {
        document.lastPreProcessedOn = timestamp;
        document.preProcessingTime = timestamp - dbDoc.lastSubmittedOn;
    } else if (state == "EXTRACTION_DONE") {
        document.lastExtractedOn = timestamp;
        document.extractionTime = timestamp - dbDoc.lastSubmittedOn;
    } else if (state == "REVIEW_COMPLETED") {
        document.lastReviewedOn = timestamp;
        document.reviewTime = timestamp - dbDoc.lastExtractedOn;
    } else if (state == "PROCESSED") {
        document.lastProcessedOn = timestamp;
        document.rpaProcessingTime = timestamp - dbDoc.lastSubmittedOn;
        document.processingTime = dbDoc.preProcessingTime + dbDoc.extractionTime + dbDoc.rpaProcessingTime;
    }
    document.lastUpdatedOn = timestamp;

    const filter = {
        documentId: document.documentId
    };

    dbutil.updateInDB(documentCollection, filter, document, function (err, result) {
        if (err) {
            console.log('error: ', err);
        }
    });
}
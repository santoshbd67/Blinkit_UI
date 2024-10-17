const _ = require('lodash')
const config = require('../config')
const util = require('./util')

class ExtractionResultUtil {

    constructor(config) {
        this.config = config;
    }

    getAggregates(docResult) {
        let aggregates = {
            "totalFields": 0,
            "accuracy": 0,
            "errors": 0
        };
        let totalConfidence = 0;

        function testConfidence(confidence) {
            return confidence < config.confidenceThreshold;
        }

        function parseDocumentInfo(docInfo) {
            aggregates.totalFields += 1;
            if ((docInfo.confidence && testConfidence(docInfo.confidence)) || !docInfo.confidence) {
                aggregates.errors++;
            }
            if (docInfo.confidence) {
                totalConfidence = totalConfidence + Number(docInfo.confidence);
            }
        }

        function parseDocLineItems(lineItems) {
            if (lineItems && lineItems.length > 0) {
                lineItems.forEach(function (lineItem) {
                    lineItem.fieldset.forEach(function (docInfo) {
                        parseDocumentInfo(docInfo);
                    });
                });
            }
        }

        docResult.documentInfo.forEach(function (docInfo) {
            parseDocumentInfo(docInfo);
        });
        parseDocLineItems(docResult.documentLineItems);
        aggregates.accuracy = util.roundOffTwoDecimals(Number(totalConfidence) / Number(aggregates.totalFields));
        return aggregates;
    }
}

module.exports = new ExtractionResultUtil(config);
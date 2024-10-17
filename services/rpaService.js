const _ = require("lodash");
const async = require("async");
const config = require("../config");
const dbutil = require("../util/db");
const resUtil = require("../util/resUtil");
const util = require("../util/util");
const rpaUtil = require("../util/rpaUtil");
const validator = require("../util/validatorUtil");
const db = dbutil.getDatabase(config.mongoDBName);
const docCollection = db.collection("document_metadata");
const sharedService = require("./sharedService");

class RPAService {
    constructor(config) {
        this.config = config;
    }

    /*
     * API to find RPA Status . Following are the steps performed in the API sequentially.
     * 1. Send the RPA Status for the requested query
     * 2.  Default filter Status will be "REVIEW_COMPLETED" if filter is empty
     */

    getRPADocumentList(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.document.rpa.list",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        // TODO - should we restrict RPA API to only get documents for status "REVIEW_COMPLETED" and not request other statuses?

        let checkFilter = _.isEmpty(req.body.request.filter) ? {
            status: "REVIEW_COMPLETED"
        } :
            req.body.request.filter;

        const filter = util.getSearchQuery(checkFilter);

        let result = {};
        let resultModified = {};
        filter["documentPurged"] = { "$ne" : 1 }
        docCollection.countDocuments(filter, function (err, count) {
            if (err) {
                apiParams.err = err;
                return resUtil.ERROR(res, apiParams, result);
            }
            result.count = count;

            if (result.count > 0) {
                docCollection
                    .aggregate([{
                        $match: filter
                    },
                    {
                        $sort: {
                            submittedOn: -1
                        }
                    },

                    {
                        $lookup: {
                            from: "document_result",
                            localField: "documentId",
                            foreignField: "documentId",
                            as: "document_results"
                        }
                    }
                    ])
                    .toArray(function (err, result2) {
                        let count = 0;
                        result.documents = result2;
                        resultModified = JSON.parse(JSON.stringify(result));
                        resultModified.documents = [];
                        if (result && result.documents && result.documents.length) {
                            result.documents.forEach(each => {
                                if (each.document_results && each.document_results.length) {
                                    count++;
                                    let modifiedObject = {
                                        documentId: each.documentId
                                    };
                                    each.document_results[0].documentInfo.forEach(el => {
                                        modifiedObject[el.fieldId] =
                                            el.correctedValue && el.correctedValue !== "" ?
                                                sharedService.decrypt(el.correctedValue) :
                                                sharedService.decrypt(el.fieldValue); //el.fieldValue
                                    });
                                    modifiedObject.documentLineItems = [];
                                    each.document_results[0].documentLineItems.forEach(row => {
                                        let singleRow = {
                                            rowNumber: row.rowNumber
                                        };

                                        row.fieldset.forEach(field => {
                                            singleRow[field.fieldId] =
                                                field.correctedValue && field.correctedValue !== "" ?
                                                    sharedService.decrypt(field.correctedValue) :
                                                    sharedService.decrypt(field.fieldValue); //el.fieldValue
                                        });
                                        if (row.isDeleted && row.isDeleted == true) { // added by kanak on 14-02-2023 for TAPP/BCP
                                            console.log("Skipping this row because line item is marked deleted.");
                                        }
                                        else {
                                            modifiedObject.documentLineItems.push(singleRow);
                                        }
                                        // modifiedObject.documentLineItems.push(singleRow);

                                    });
                                    modifiedObject.reviewedBy = sharedService.decrypt(each.reviewedBy || each.reassignReviewedBy)
                                    modifiedObject.stp = each.stp
                                    resultModified.documents.push(modifiedObject);
                                }
                            });
                            resultModified.count = count;
                        } else {
                            result.message = "No Document Found";
                            return resUtil.ERROR(res, apiParams, result);
                        }
                        if (err) {
                            apiParams.err = err;
                            return resUtil.ERROR(res, apiParams, result);
                        }
                        return resUtil.OK(res, apiParams, resultModified);
                    });
            } else {
                result.message = "No Records Found";
                return resUtil.OK(res, apiParams, result);
            }
        });
    }

    /*
      * API to update RPA status .Following are the steps Performed in the API sequentially.
       1. Update will be through documentId
       2. if the input status is PROCESSING or SUCCESS, the document status should be updated to RPA_PROCESSING
       3.if the input rpaStage is same as the configured end RPA stage, document status should be updated to SUCCESS
      */

    updateRPADocumentStatus(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.document.rpa.status.update",
            ver: "1.0",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "updateRPADocumentStatus", callback);
                },
                function (value, callback) {
                    value.lastUpdatedOn = util.generateTimestamp();
                    let status = value.status;
                    let updateStatus = undefined;
                    let isLastRpa = reqData.isLastRpaStage;
                    switch (status) {
                        case "PROCESSING":
                            updateStatus = "RPA_PROCESSING";
                            break;
                        case "FAILED":
                            updateStatus = "FAILED";
                            break;
                        case "SUCCESS":
                            if (isLastRpa == 1) {
                                updateStatus = "PROCESSED";
                            } else {
                                updateStatus = "RPA_PROCESSING";
                            }
                            break;
                        default:
                            updateStatus = "RPA_PROCESSING";
                            break;
                    }
                    value.status = updateStatus;

                    let isRPAStageManual = reqData.isNextStageManual;
                    if (isRPAStageManual == 1) {
                        value.manualRPAProcessing = true;
                    }

                    docCollection.updateOne({
                        documentId: value.documentId
                    }, {
                        $set: value
                    }, {
                        upsert: true
                    },
                        function (err, document) {
                            util.handleServerError(err, document.result, callback);
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

                resUtil.OK(res, apiParams, result);
                return;
            }
        );
    }

    /*
     * API to receive the RPA orchestrator logs via webhooks
     */
    webhookResponse(req, res) {
        let reqBody = req.body;
        res.statusCode = 202;
        res.end();
        setTimeout(() => {
            async.waterfall(
                [
                    function (callback) {
                        if (!reqBody.Job) {
                            callback("Job not found in request", reqBody);
                        } else if (reqBody.Job.State !== "Successful") {
                            callback("Job not successful", reqBody);
                        } else {
                            let jobKey = reqBody.Job.Key;
                            const whiteListedJobIds = config.rpaJobIds;
                            if (whiteListedJobIds && whiteListedJobIds.length > 0) {
                                let jobIds = JSON.parse(whiteListedJobIds);
                                if (jobIds.indexOf(jobKey) == -1) {
                                    callback(
                                        "Job not found in the whitelisted configuration",
                                        reqBody
                                    );
                                } else {
                                    callback(null, jobKey);
                                }
                            } else callback(null, jobKey);
                        }
                    },
                    function (jobKey, callback) {
                        rpaUtil.getAccessToken(function (err, accessToken) {
                            callback(err, jobKey, accessToken);
                        });
                    },
                    function (jobKey, accessToken, callback) {
                        rpaUtil.getJobLogs(jobKey, accessToken, callback);
                    },
                    function (jobKey, jobLogs, callback) {
                        rpaUtil.processJobLogs(jobKey, jobLogs, callback);
                    }
                ],
                function (err, result) {
                    if (err) {
                        console.log(
                            "Error processing webhook response",
                            "Err:",
                            err,
                            "| Result:",
                            result,
                            " | reqBody:",
                            reqBody
                        );
                    } else {
                        console.log(
                            "Succesfully processed webhook response | reqBody:",
                            reqBody
                        );
                    }
                }
            );
        }, 10000);
    }
}

module.exports = new RPAService(config);
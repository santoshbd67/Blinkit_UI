const config = require("../config");
const constants = require("../util/constant");
const async = require("async");
const resUtil = require("../util/resUtil");
const dbutil = require("../util/db");
const db = dbutil.getDatabase(config.mongoDBName);
const moment = require("moment");

const docsCollection = db.collection("document_metadata");
const auditCollection = db.collection("telemetry_audit");
const roleCollection = db.collection("roles");
const analyticsMetadataColl = db.collection("document_analytics_metadata");

const sharedService = require('./sharedService');
const userCollection = db.collection("users");
const util = require("../util/util");

class DashboardService {
    constructor(config) {
        this.config = config;
    }

    getStats(req, res) {
        let that = this;
        const apiParams = {
            id: "api.dashboard.stats.read",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        const reqBody = req.body;
        reqBody.userId = req.headers.userid; // added by gaurav
        // async.parallel(
        //     [
        //         function(callback) {
        //             that.getSummaries(reqBody, callback);
        //         },
        //         function(callback) {
        //             that.getRanges(reqBody, callback);
        //         },
        //         function(callback) {
        //             that.getVendorStats(reqBody, callback);
        //         },
        //         function(callback) {
        //             that.getDocTypeStats(reqBody, callback);
        //         },
        //         function(callback) {
        //             that.getOrgTypeStats(reqBody, callback);
        //         },
        //         function(callback) {
        //             that.getGlobalAverages(reqBody, callback);
        //         },
        //         function(callback) {
        //             that.getTimeLineData(reqBody, callback);
        //         },
        //         function(callback) {
        //             that.getTimeLineOverallScoreConfidence(reqBody, callback);
        //         },
        //         function(callback) {
        //             that.getTotalProcessed(reqBody, callback);
        //         }
        //     ],
        //     function(err, results) {
        //         if (err) {
        //             resUtil.handleError(req, res, err);
        //             return;
        //         }
        //         resUtil.OK(res, apiParams, {
        //             summaries: results[0],
        //             ranges: results[1],
        //             vendorStats: results[2],
        //             docTypeStats: results[3],
        //             orgTypeStats: results[4],
        //             globalAverages: results[5],
        //             timeLineData: results[6],
        //             timeLineOverallScoreConfidence: results[7],
        //             totalProcessed: results[8]
        //         });
        //     }
        // );

        async.waterfall(
            [
                function (callback) {
                    roleCollection.find({}).toArray(function (err, roles) {
                        if (roles && roles.length) {
                            callback(null, roles)
                        } else {
                            callback(err, null)
                        }
                    });
                },
                function (rolesRes, callback) {
                    if (reqBody.request.filter.role === "clientadmin") {
                        // for processing route
                        let filter = {}
                        // first get userIds under clientadmin domain
                        //let useremail = sharedService.decrypt(reqBody.request.emailId);
                        let useremail = reqBody.request.emailId;
                        let userdomain = (useremail.split('@')[1]);
                        userdomain = sharedService.encrypt(userdomain);

                        let validRoles = ['admin'];
                        let mappedRoleIds = that.getMappedRoleIds(rolesRes, validRoles);

                        filter = { role: { $nin: mappedRoleIds }, userdomain: userdomain }
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
                                        // second add userIds to the filter
                                        filter["userId"] = userIds
                                        callback(null, filter);

                                        // that.getDocuments(filter, callback);
                                    } else {
                                        callback(null, userIds);
                                    }
                                }
                            });

                    }
                    else {
                        callback(null, [])
                    }
                },
                function (filter, callback) {
                    reqBody["filter"] = filter;
                    async.parallel(
                        [
                            function (callback) {
                                that.getSummaries(reqBody, callback);
                            },
                            function (callback) {
                                that.getRanges(reqBody, callback);
                            },
                            function (callback) {
                                that.getVendorStats(reqBody, callback);
                            },
                            function (callback) {
                                that.getDocTypeStats(reqBody, callback);
                            },
                            function (callback) {
                                that.getOrgTypeStats(reqBody, callback);
                            },
                            function (callback) {
                                that.getGlobalAverages(reqBody, callback);
                            },
                            function (callback) {
                                that.getTimeLineData(reqBody, callback);
                            },
                            function (callback) {
                                that.getTimeLineOverallScoreConfidence(reqBody, callback);
                            },
                            function (callback) {
                                that.getTotalProcessed(reqBody, callback);
                            }
                        ],
                        function (err, results) {
                            if (err) {
                                resUtil.handleError(req, res, err);
                                return;
                            }
                            resUtil.OK(res, apiParams, {
                                summaries: results[0],
                                ranges: results[1],
                                vendorStats: results[2],
                                docTypeStats: results[3],
                                orgTypeStats: results[4],
                                globalAverages: results[5],
                                timeLineData: results[6],
                                timeLineOverallScoreConfidence: results[7],
                                totalProcessed: results[8]
                            });
                        }
                    );
                }
            ]
        );
    }

    getTimeRange(period) {
        let timeRange = {};
        let todayDate = moment().date();
        let currentWeek = moment().week();
        let currentMonth = moment().month();

        if (period == "LAST_24_HOURS") {
            timeRange = {
                min: moment()
                    .date(todayDate - 1)
                    .valueOf(),
                max: moment().valueOf()
            };
        } else if (period == "LAST_7_DAYS") {
            timeRange = {
                min: moment()
                    .date(todayDate - 6)
                    .startOf("day")
                    .valueOf(),
                max: moment().valueOf()
            };
        } else if (period == "LAST_14_DAYS") {
            timeRange = {
                min: moment()
                    .date(todayDate - 13)
                    .startOf("day")
                    .valueOf(),
                max: moment().valueOf()
            };
        } else if (period == "LAST_4_WEEKS") {
            timeRange = {
                min: moment()
                    .week(currentWeek - 3)
                    .startOf("week")
                    .valueOf(),
                max: moment().valueOf()
            };
        } else if (period == "LAST_12_MONTHS") {
            timeRange = {
                min: moment()
                    .month(currentMonth - 11)
                    .startOf("month")
                    .valueOf(),
                max: moment().valueOf()
            };
        }
        return timeRange;
    }

    getSummaries(reqBody, callback) {
        let filter = {};
        filter = this.getUpdatedFilter(reqBody, filter);

        if (reqBody.request && reqBody.request.filter) {
            if (reqBody.request.filter.vendorId) {
                filter["vendorId"] = reqBody.request.filter.vendorId;
            }
            if (reqBody.request.filter.orgTypeId) {
                filter["orgTypeId"] = reqBody.request.filter.orgTypeId;
            }
            if (reqBody.request.filter.docTypeId) {
                filter["docTypeId"] = reqBody.request.filter.docTypeId;
            }
            // if (reqBody.request.filter.role !== 'admin') {
            //     filter["userId"] = reqBody.userId
            // } // added by gaurav
            if (reqBody.request.filter.period) {
                let timeRange = this.getTimeRange(reqBody.request.filter.period);
                if (timeRange.min && timeRange.max) {
                    let minPeriod = parseInt(moment(timeRange.min).format("YYYYMMDD"));
                    let maxPeriod = parseInt(moment(timeRange.max).format("YYYYMMDD"));
                    filter["createdOn"] = { $gt: timeRange.min, $lte: timeRange.max };
                }
            }
        }
        docsCollection
            .aggregate([{
                $lookup: {
                    from: "document_analytics_metadata",
                    localField: "documentId",
                    foreignField: "documentId",
                    as: "docs_analytics_data"
                }
            },
            {
                $unwind: {
                    path: "$docs_analytics_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: filter
            },
            {
                $group: {
                    _id: null,
                    totalDocumentsSubmitted: { $sum: 1 },
                    totalDocumentsReadyForExtraction: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "READY_FOR_EXTRACTION"] }, 1, 0]
                        }
                    },
                    totalDocumentsInReview: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["EXTRACTION_DONE", "REVIEW"]] },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsReadyForPosting: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["REVIEW_COMPLETED"]] }, 1, 0]
                        }
                    },
                    failedDocumentsCount: {
                        $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] }
                    },
                    totalDocumentsPostedToRPA: {
                        $sum: { $cond: [{ $eq: ["$status", "RPA_PROCESSING"] }, 1, 0] }
                    },
                    totalDocumentsProcessed: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["REVIEW", "PROCESSED", "REVIEW_COMPLETED"]] },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsManuallyProcessed: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $in: ["$status", ["REVIEW", "PROCESSED", "REVIEW_COMPLETED"]] },
                                    { $eq: ["$docs_analytics_data.manualIntervention", true] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsAutoProcessed: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $in: ["$status", ["REVIEW", "PROCESSED"]] },
                                    {
                                        $eq: ["$docs_analytics_data.manualIntervention", false]
                                    }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsInProcessing: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "PRE_PROCESSING",
                                        "READY_FOR_EXTRACTION",
                                        "EXTRACTION_INPROGRESS",
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsInPreProcessing: {
                        $sum: { $cond: [{ $in: ["$status", ["PRE_PROCESSING"]] }, 1, 0] }
                    },
                    totalDocumentsInExtraction: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["READY_FOR_EXTRACTION", "EXTRACTION_INPROGRESS"]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsInRPAProcessing: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["REVIEW_COMPLETED", "RPA_PROCESSING"]] },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsFailedInReview: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ["$status", "FAILED"] },
                                    { $eq: ["$stage", "SUBMISSION"] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsFailedInPreProcessing: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ["$status", "FAILED"] },
                                    { $eq: ["$stage", "PRE-PROCESSOR"] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsFailedInExtraction: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ["$status", "FAILED"] },
                                    { $eq: ["$stage", "EXTRACTION"] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsFailedInReview: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ["$status", "FAILED"] },
                                    { $eq: ["$stage", "REVIEW"] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsFailedInRPAProcessing: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ["$status", "FAILED"] },
                                    { $eq: ["$stage", "RPA"] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsExtracted: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING",
                                        "PROCESSED"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsManuallyCorrected: {
                        $sum: {
                            $cond: [{
                                $and: [{
                                    $in: [
                                        "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                    ]
                                },
                                { $eq: ["$docs_analytics_data.manuallyCorrected", true] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsNotCorrected: {
                        $sum: {
                            $cond: [{
                                $and: [{
                                    $in: [
                                        "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                    ]
                                },
                                { $eq: ["$docs_analytics_data.manuallyCorrected", false] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsToBeExtracted: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "NEW",
                                        "PRE_PROCESSING",
                                        "READY_FOR_EXTRACTION",
                                        "EXTRACTION_INPROGRESS"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsPreProcessed: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "READY_FOR_EXTRACTION",
                                        "EXTRACTION_INPROGRESS",
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING",
                                        "PROCESSED"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalPageCount: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["EXTRACTION_DONE", "REVIEW", "PROCESSED", "REVIEW_COMPLETED", "RPA_PROCESSING"]] },
                                { $toInt: "$pageCount" },
                                0
                            ]
                        }
                    },
                    totalSTP: {
                        $sum: {
                            $cond: [
                                { $in: ["$stp", [true]] },
                                { $toInt: "$stp" },
                                0
                            ]
                        }
                    },
                    totalProcessingTime: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"]] },
                                "$processingTime",
                                0
                            ]
                        }
                    },
                    totalPreProcessingTime: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"]] },
                                "$preProcessingTime",
                                0
                            ]
                        }
                    },
                    totalExtractionTime: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["PROCESSED", "REVIEW"]] },
                                "$extractionTime",
                                0
                            ]
                        }
                    },
                    totalRPAProcessingTime: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["PROCESSED", "REVIEW"]] },
                                "$rpaProcessingTime",
                                0
                            ]
                        }
                    },
                    totalAmount: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["PROCESSED"]] }, "$totalAmount", 0]
                        }
                    },
                    totalDocumentsReviewed: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW", "PROCESSED", "REVIEW_COMPLETED"]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalCorrectionTime: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["PROCESSED"]] }, "$reviewTime", 0]
                        }
                    },
                    totalErrors: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "RIVIEW", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.correctedFieldCount",
                                0
                            ]
                        }
                    },
                    totalAccuracy: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.extractionAccuracy",
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalDocumentsSubmitted: 1,
                    totalDocumentsReadyForExtraction: 1,
                    totalDocumentsInReview: 1,
                    totalDocumentsReadyForPosting: 1,
                    failedDocumentsCount: 1,
                    totalDocumentsPostedToRPA: 1,
                    totalDocumentsProcessed: 1,
                    totalDocumentsManuallyProcessed: 1,
                    totalDocumentsAutoProcessed: 1,
                    totalDocumentsInProcessing: 1,
                    totalDocumentsInPreProcessing: 1,
                    totalDocumentsInExtraction: 1,
                    totalDocumentsInRPAProcessing: 1,
                    totalDocumentsFailedInReview: 1,
                    totalDocumentsFailedInPreProcessing: 1,
                    totalDocumentsFailedInExtraction: 1,
                    totalDocumentsFailedInReview: 1,
                    totalDocumentsFailedInRPAProcessing: 1,
                    totalDocumentsExtracted: 1,
                    totalDocumentsManuallyCorrected: 1,
                    totalDocumentsNotCorrected: 1,
                    totalDocumentsToBeExtracted: 1,
                    totalDocumentsPreProcessed: 1,
                    totalPageCount: 1,
                    totalSTP: 1,
                    totalProcessingTime: 1,
                    totalPreProcessingTime: 1,
                    totalExtractionTime: 1,
                    totalRPAProcessingTime: 1,
                    totalAmount: 1,
                    totalDocumentsReviewed: 1,
                    totalCorrectionTime: 1,
                    totalErrors: 1,
                    totalAccuracy: 1,
                    totalDocumentsFailedOutsideExtraction: {
                        $subtract: [
                            "$failedDocumentsCount",
                            "$totalDocumentsFailedInExtraction"
                        ]
                    },
                    avgAmount: {
                        $cond: [
                            { $gt: ["$totalDocumentsProcessed", 0] },
                            { $divide: ["$totalAmount", "$totalDocumentsProcessed"] },
                            0
                        ]
                    },
                    avgAccuracy: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalAccuracy", "$totalDocumentsReviewed"] },
                            0
                        ]
                    },
                    avgProcessingTime: {
                        $cond: [
                            { $gt: ["$totalDocumentsProcessed", 0] },
                            {
                                $divide: ["$totalProcessingTime", "$totalDocumentsProcessed"]
                            },
                            0
                        ]
                    },
                    avgPageCount: {
                        $cond: [
                            { $gt: ["$totalDocumentsProcessed", 0] },
                            { $divide: ["$totalPageCount", "$totalDocumentsProcessed"] },
                            0
                        ]
                    },
                    avgCorrectionTime: {
                        $cond: [
                            { $gt: ["$totalDocumentsProcessed", 0] },
                            {
                                $divide: ["$totalCorrectionTime", "$totalDocumentsProcessed"]
                            },
                            0
                        ]
                    },
                    avgErrors: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalErrors", "$totalDocumentsReviewed"] },
                            0
                        ]
                    }
                }
            }
            ])
            .toArray(function (err, result) {
                console.log("summaries result", result)
                if (err) callback(err);
                else {
                    if (result[0]) {
                        delete result[0]._id;
                    }
                    callback(null, result[0]);
                }
            });
    }

    getRanges(reqBody, callback) {
        let filter = {
            //status: { $in: ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"] }
        };
        //filter["userId"] = reqBody.userId; // added by gaurav
        // if (reqBody.request.filter.role !== 'admin') {
        //     filter["userId"] = reqBody.userId
        // }
        filter = this.getUpdatedFilter(reqBody, filter);
        filter.status = { $in: ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"] }
        if (reqBody.request && reqBody.request.filter) {
            if (reqBody.request.filter.period) {
                let timeRange = this.getTimeRange(reqBody.request.filter.period);
                if (timeRange.min && timeRange.max) {
                    let minPeriod = parseInt(moment(timeRange.min).format("YYYYMMDD"));
                    let maxPeriod = parseInt(moment(timeRange.max).format("YYYYMMDD"));
                    filter["lastReviewedPeriod"] = { $gte: minPeriod, $lte: maxPeriod };
                }
            }
        }

        analyticsMetadataColl
            .aggregate([{
                $match: filter
            },
            {
                $facet: {
                    accuracy: [{
                        $bucket: {
                            groupBy: "$extractionAccuracy",
                            boundaries: constants.accuracyRanges,
                            default: constants.accuracyDefaultRange,
                            output: { count: { $sum: 1 } }
                        }
                    }],
                    errorCount: [{
                        $bucket: {
                            groupBy: "$correctedFieldCount",
                            boundaries: constants.errorCountRanges,
                            default: constants.errorCountDefaultRange,
                            output: { count: { $sum: 1 } }
                        }
                    }]
                }
            }
            ])
            .toArray(function (err, result) {
                if (err) {
                    callback(err);
                }
                if (result) {
                    result[0].accuracy.forEach(elem => {
                        if (constants.accuracyRangeLabels[elem._id]) {
                            elem["range"] = constants.accuracyRangeLabels[elem._id];
                        } else {
                            elem["range"] = elem._id;
                        }
                        delete elem._id;
                    });
                    result[0].errorCount.forEach(elem => {
                        if (constants.errorCountRangeLabels[elem._id]) {
                            elem["range"] = constants.errorCountRangeLabels[elem._id];
                        } else {
                            elem["range"] = elem._id;
                        }
                        delete elem._id;
                    });
                    callback(null, result[0]);
                }
            });
    }

    getVendorStats(reqBody, callback) {
        let filter = {
            //vendorId: { $exists: true }
        };
        // if (reqBody.request.filter.role !== 'admin') {
        //     filter["userId"] = reqBody.userId
        // } // added by gaurav
        filter = this.getUpdatedFilter(reqBody, filter);
        filter.vendorId = { $exists: true }
        if (reqBody.request && reqBody.request.filter) {
            if (reqBody.request.filter.period) {
                let timeRange = this.getTimeRange(reqBody.request.filter.period);
                if (timeRange.min && timeRange.max) {
                    filter["createdOn"] = { $gt: timeRange.min, $lte: timeRange.max };
                }
            }
        }
        docsCollection
            .aggregate([{
                $lookup: {
                    from: "document_analytics_metadata",
                    localField: "documentId",
                    foreignField: "documentId",
                    as: "docs_analytics_data"
                }
            },
            {
                $unwind: {
                    path: "$docs_analytics_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: filter
            },
            {
                $group: {
                    _id: "$vendorId",
                    totalDocumentsSubmitted: { $sum: 1 },
                    totalDocumentsProcessed: {
                        $sum: { $cond: [{ $in: ["$status", ["REVIEW", "PROCESSED"]] }, 1, 0] }
                    },
                    totalDocumentsInProcessing: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "PRE_PROCESSING",
                                        "READY_FOR_EXTRACTION",
                                        "EXTRACTION_INPROGRESS",
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    failedDocumentsCount: {
                        $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] }
                    },
                    totalDocumentsManuallyProcessed: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $in: ["$status", ["PROCESSED"]] },
                                    { $eq: ["$docs_analytics_data.manualIntervention", true] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsAutoProcessed: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $in: ["$status", ["PROCESSED", "REVIEW"]] },
                                    {
                                        $eq: ["$docs_analytics_data.manualIntervention", false]
                                    }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalCorrectionTime: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["PROCESSED"]] }, "$reviewTime", 0]
                        }
                    },
                    totalDocumentsReviewed: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsInReview: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["PROCESSED", "REVIEW"]] },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsExtracted: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING",
                                        "PROCESSED"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsManuallyCorrected: {
                        $sum: {
                            $cond: [{
                                $and: [{
                                    $in: [
                                        "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                    ]
                                },
                                { $eq: ["$docs_analytics_data.manuallyCorrected", true] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsNotCorrected: {
                        $sum: {
                            $cond: [{
                                $and: [{
                                    $in: [
                                        "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                    ]
                                },
                                { $eq: ["$docs_analytics_data.manuallyCorrected", false] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalErrors: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.correctedFieldCount",
                                0
                            ]
                        }
                    },
                    totalAccuracy: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.extractionAccuracy",
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    vendorId: "$_id",
                    totalDocumentsSubmitted: 1,
                    totalDocumentsProcessed: 1,
                    totalDocumentsInProcessing: 1,
                    failedDocumentsCount: 1,
                    totalDocumentsManuallyProcessed: 1,
                    totalDocumentsAutoProcessed: 1,
                    totalCorrectionTime: 1,
                    totalDocumentsReviewed: 1,
                    totalDocumentsExtracted: 1,
                    totalDocumentsInReview: 1,
                    totalDocumentsManuallyCorrected: 1,
                    totalDocumentsNotCorrected: 1,
                    totalErrors: 1,
                    totalAccuracy: 1,
                    avgAccuracy: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalAccuracy", "$totalDocumentsReviewed"] },
                            0
                        ]
                    },
                    avgErrors: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalErrors", "$totalDocumentsReviewed"] },
                            0
                        ]
                    }
                }
            }
            ])
            .toArray(function (err, result) {
                if (err) callback(err);
                else {
                    callback(null, result);
                }
            });
    }

    getGlobalAverages(reqBody, callback) {
        let filter = {};
        // if (reqBody.request.filter.role !== 'admin') {
        //     filter["userId"] = reqBody.userId
        // } // added by gaurav
        filter = this.getUpdatedFilter(reqBody, filter);
        if (reqBody.request && reqBody.request.filter) {
            if (reqBody.request.filter.vendorId) {
                filter["vendorId"] = reqBody.request.filter.vendorId;
            }
        }
        docsCollection
            .aggregate([{
                $lookup: {
                    from: "document_analytics_metadata",
                    localField: "documentId",
                    foreignField: "documentId",
                    as: "docs_analytics_data"
                }
            },
            {
                $unwind: {
                    path: "$docs_analytics_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: filter
            },
            {
                $group: {
                    _id: null,
                    totalDocumentsSubmitted: { $sum: 1 },
                    totalDocumentsProcessed: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]] },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsPreProcessed: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "READY_FOR_EXTRACTION",
                                        "EXTRACTION_INPROGRESS",
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING",
                                        "PROCESSED"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalPageCount: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]] },
                                { $toInt: "$pageCount" },
                                0
                            ]
                        }
                    },
                    totalProcessingTime: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]] },
                                "$processingTime",
                                0
                            ]
                        }
                    },
                    totalAmount: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]] }, "$totalAmount", 0]
                        }
                    },
                    totalDocumentsReviewed: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalCorrectionTime: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["PROCESSED"]] }, "$reviewTime", 0]
                        }
                    },
                    totalErrors: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.correctedFieldCount",
                                0
                            ]
                        }
                    },
                    totalAccuracy: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "REVIEW", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.extractionAccuracy",
                                0
                            ]
                        }
                    },
                    totalOverallScore: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"]] },
                                { $toInt: "$overall_score" },
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    avgAmount: {
                        $cond: [
                            { $gt: ["$totalDocumentsProcessed", 0] },
                            { $divide: ["$totalAmount", "$totalDocumentsProcessed"] },
                            0
                        ]
                    },
                    avgAccuracy: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalAccuracy", "$totalDocumentsReviewed"] },
                            0
                        ]
                    },
                    avgConfidence: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalOverallScore", "$totalDocumentsReviewed"] },
                            0
                        ]
                    },
                    avgProcessingTime: {
                        $cond: [
                            { $gt: ["$totalDocumentsProcessed", 0] },
                            {
                                $divide: ["$totalProcessingTime", "$totalDocumentsProcessed"]
                            },
                            0
                        ]
                    },
                    avgPageCount: {
                        $cond: [
                            { $gt: ["$totalDocumentsProcessed", 0] },
                            { $divide: ["$totalPageCount", "$totalDocumentsProcessed"] },
                            0
                        ]
                    },
                    avgCorrectionTime: {
                        $cond: [
                            { $gt: ["$totalDocumentsProcessed", 0] },
                            {
                                $divide: ["$totalCorrectionTime", "$totalDocumentsProcessed"]
                            },
                            0
                        ]
                    },
                    avgErrors: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalErrors", "$totalDocumentsReviewed"] },
                            0
                        ]
                    }
                }
            }
            ])
            .toArray(function (err, result) {
                if (err) callback(err);
                else {
                    if (result[0]) {
                        delete result[0]._id;
                    }
                    callback(null, result[0]);
                }
            });
    }

    getDocTypeStats(reqBody, callback) {
        let filter = {
            //docTypeId: { $exists: true }
        };
        // if (reqBody.request.filter.role !== 'admin') {
        //     filter["userId"] = reqBody.userId
        // } // added by gaurav
        filter = this.getUpdatedFilter(reqBody, filter);
        filter.docTypeId = { $exists: true };
        if (reqBody.request && reqBody.request.filter) {
            if (reqBody.request.filter.period) {
                let timeRange = this.getTimeRange(reqBody.request.filter.period);
                if (timeRange.min && timeRange.max) {
                    filter["createdOn"] = { $gt: timeRange.min, $lte: timeRange.max };
                }
            }
        }
        docsCollection
            .aggregate([{
                $lookup: {
                    from: "document_analytics_metadata",
                    localField: "documentId",
                    foreignField: "documentId",
                    as: "docs_analytics_data"
                }
            },
            {
                $unwind: {
                    path: "$docs_analytics_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: filter
            },
            {
                $group: {
                    _id: "$docTypeId",
                    totalDocumentsSubmitted: { $sum: 1 },
                    totalDocumentsProcessed: {
                        $sum: { $cond: [{ $in: ["$status", ["REVIEW", "PROCESSED"]] }, 1, 0] }
                    },
                    totalDocumentsInProcessing: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "PRE_PROCESSING",
                                        "READY_FOR_EXTRACTION",
                                        "EXTRACTION_INPROGRESS",
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    failedDocumentsCount: {
                        $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] }
                    },
                    totalDocumentsManuallyProcessed: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $in: ["$status", ["PROCESSED", 'REVIEW']] },
                                    { $eq: ["$docs_analytics_data.manualIntervention", true] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsAutoProcessed: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $in: ["$status", ["PROCESSED", 'REVIEW']] },
                                    {
                                        $eq: ["$docs_analytics_data.manualIntervention", false]
                                    }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalCorrectionTime: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["PROCESSED"]] }, "$reviewTime", 0]
                        }
                    },
                    totalDocumentsReviewed: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsInReview: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["EXTRACTION_DONE", "REVIEW"]] },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsExtracted: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING",
                                        "PROCESSED"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsManuallyCorrected: {
                        $sum: {
                            $cond: [{
                                $and: [{
                                    $in: [
                                        "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                    ]
                                },
                                { $eq: ["$docs_analytics_data.manuallyCorrected", true] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsNotCorrected: {
                        $sum: {
                            $cond: [{
                                $and: [{
                                    $in: [
                                        "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                    ]
                                },
                                { $eq: ["$docs_analytics_data.manuallyCorrected", false] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalErrors: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.correctedFieldCount",
                                0
                            ]
                        }
                    },
                    totalAccuracy: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.extractionAccuracy",
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    docTypeId: "$_id",
                    totalDocumentsSubmitted: 1,
                    totalDocumentsProcessed: 1,
                    totalDocumentsInProcessing: 1,
                    failedDocumentsCount: 1,
                    totalDocumentsManuallyProcessed: 1,
                    totalDocumentsAutoProcessed: 1,
                    totalCorrectionTime: 1,
                    totalDocumentsReviewed: 1,
                    totalDocumentsExtracted: 1,
                    totalDocumentsInReview: 1,
                    totalDocumentsManuallyCorrected: 1,
                    totalDocumentsNotCorrected: 1,
                    totalErrors: 1,
                    totalAccuracy: 1,
                    avgAccuracy: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalAccuracy", "$totalDocumentsReviewed"] },
                            0
                        ]
                    },
                    avgErrors: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalErrors", "$totalDocumentsReviewed"] },
                            0
                        ]
                    }
                }
            }
            ])
            .toArray(function (err, result) {
                if (err) callback(err);
                else {
                    callback(null, result);
                }
            });
    }

    getOrgTypeStats(reqBody, callback) {
        let filter = {
            // orgTypeId: { $exists: true } 
        };
        // if (reqBody.request.filter.role !== 'admin') {
        //     filter["userId"] = reqBody.userId
        // } // added by gaurav
        filter = this.getUpdatedFilter(reqBody, filter);
        filter.orgTypeId = { $exists: true }
        if (reqBody.request && reqBody.request.filter) {
            if (reqBody.request.filter.period) {
                let timeRange = this.getTimeRange(reqBody.request.filter.period);
                if (timeRange.min && timeRange.max) {
                    filter["createdOn"] = { $gt: timeRange.min, $lte: timeRange.max };
                }
            }
        }
        docsCollection
            .aggregate([{
                $lookup: {
                    from: "document_analytics_metadata",
                    localField: "documentId",
                    foreignField: "documentId",
                    as: "docs_analytics_data"
                }
            },
            {
                $unwind: {
                    path: "$docs_analytics_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: filter
            },
            {
                $group: {
                    _id: "$orgTypeId",
                    totalDocumentsSubmitted: { $sum: 1 },
                    totalDocumentsProcessed: {
                        $sum: { $cond: [{ $in: ["$status", ["REVIEW", "PROCESSED"]] }, 1, 0] }
                    },
                    totalDocumentsInProcessing: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "PRE_PROCESSING",
                                        "READY_FOR_EXTRACTION",
                                        "EXTRACTION_INPROGRESS",
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    failedDocumentsCount: {
                        $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] }
                    },
                    totalDocumentsManuallyProcessed: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $in: ["$status", ["PROCESSED"]] },
                                    { $eq: ["$docs_analytics_data.manualIntervention", true] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsAutoProcessed: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $in: ["$status", ["PROCESSED"]] },
                                    {
                                        $eq: ["$docs_analytics_data.manualIntervention", false]
                                    }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalCorrectionTime: {
                        $sum: {
                            $cond: [{ $in: ["$status", ["PROCESSED"]] }, "$reviewTime", 0]
                        }
                    },
                    totalDocumentsReviewed: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsInReview: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["EXTRACTION_DONE", "REVIEW"]] },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsExtracted: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", [
                                        "EXTRACTION_DONE",
                                        "REVIEW",
                                        "REVIEW_COMPLETED",
                                        "RPA_PROCESSING",
                                        "PROCESSED"
                                    ]
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsManuallyCorrected: {
                        $sum: {
                            $cond: [{
                                $and: [{
                                    $in: [
                                        "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                    ]
                                },
                                { $eq: ["$docs_analytics_data.manuallyCorrected", true] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalDocumentsNotCorrected: {
                        $sum: {
                            $cond: [{
                                $and: [{
                                    $in: [
                                        "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                    ]
                                },
                                { $eq: ["$docs_analytics_data.manuallyCorrected", false] }
                                ]
                            },
                                1,
                                0
                            ]
                        }
                    },
                    totalErrors: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.correctedFieldCount",
                                0
                            ]
                        }
                    },
                    totalAccuracy: {
                        $sum: {
                            $cond: [{
                                $in: [
                                    "$status", ["REVIEW_COMPLETED", "RPA_PROCESSING", "PROCESSED"]
                                ]
                            },
                                "$docs_analytics_data.extractionAccuracy",
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalDocumentsSubmitted: 1,
                    totalDocumentsProcessed: 1,
                    totalDocumentsInProcessing: 1,
                    failedDocumentsCount: 1,
                    totalDocumentsManuallyProcessed: 1,
                    totalDocumentsAutoProcessed: 1,
                    totalCorrectionTime: 1,
                    totalDocumentsReviewed: 1,
                    totalDocumentsExtracted: 1,
                    totalDocumentsInReview: 1,
                    totalDocumentsManuallyCorrected: 1,
                    totalDocumentsNotCorrected: 1,
                    totalErrors: 1,
                    totalAccuracy: 1,
                    avgAccuracy: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalAccuracy", "$totalDocumentsReviewed"] },
                            0
                        ]
                    },
                    avgErrors: {
                        $cond: [
                            { $gt: ["$totalDocumentsReviewed", 0] },
                            { $divide: ["$totalErrors", "$totalDocumentsReviewed"] },
                            0
                        ]
                    }
                }
            }
            ])
            .toArray(function (err, result) {
                if (err) callback(err);
                else {
                    callback(null, result);
                }
            });
    }

    getTimeLineData(reqBody, callback) {
        let filter = {
            // status: { $in: ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"] }
        };
        filter = this.getUpdatedFilter(reqBody, filter);
        filter.status = { $in: ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"] }
        if (reqBody.request.filter.orgTypeId) {
            filter["orgTypeId"] = reqBody.request.filter.orgTypeId;
        }
        if (reqBody.request.filter.docTypeId) {
            filter["docTypeId"] = reqBody.request.filter.docTypeId;
        }
        if (reqBody.request && reqBody.request.filter) {
            if (reqBody.request.filter.period) {
                let timeRange = this.getTimeRange(reqBody.request.filter.period);
                if (timeRange.min && timeRange.max) {
                    let minPeriod = parseInt(moment(timeRange.min).format("YYYYMMDD"));
                    let maxPeriod = parseInt(moment(timeRange.max).format("YYYYMMDD"));
                    filter["lastUpdatedPeriod"] = { $gte: minPeriod, $lte: maxPeriod };
                }
            }
        }

        analyticsMetadataColl
            .aggregate([
                // First Stage
                {
                    $match: filter
                },
                // Second Stage
                {
                    $group: {
                        _id: "$lastUpdatedPeriod",
                        count: { $sum: 1 }
                    }
                },
                // Third Stage
                {
                    $sort: { _id: 1 }
                }
            ])
            .toArray(function (err, result) {
                if (err) callback(err);
                else {
                    callback(null, result);
                }
            });
    }

    getTimeLineOverallScoreConfidence(reqBody, callback) {
        let filter = {
            //status: { $in: ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"] }
        };
        filter = this.getUpdatedFilter(reqBody, filter);
        filter.status = { $in: ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"] }
        if (reqBody.request.filter.orgTypeId) {
            filter["orgTypeId"] = reqBody.request.filter.orgTypeId;
        }
        if (reqBody.request.filter.docTypeId) {
            filter["docTypeId"] = reqBody.request.filter.docTypeId;
        }
        if (reqBody.request && reqBody.request.filter) {
            if (reqBody.request.filter.period) {
                let timeRange = this.getTimeRange(reqBody.request.filter.period);
                if (timeRange.min && timeRange.max) {
                    let minPeriod = timeRange.min;
                    let maxPeriod = timeRange.max;
                    filter["lastUpdatedOn"] = { $gte: minPeriod, $lte: maxPeriod };
                }
            }
        }
        docsCollection
            .aggregate([
                // First Stage
                {
                    $match: filter
                },
                // Second Stage
                {
                    $group: {
                        _id: {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": {
                                    "$add": [
                                        new Date(0),
                                        { "$multiply": [1, "$lastUpdatedOn"] }
                                    ]
                                }
                            }
                        },
                        totalDocumentsSubmitted: {
                            $sum: {
                                $cond: [
                                    { $in: ["$status", ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"]] },
                                    { $toInt: 1 },
                                    0
                                ]
                            }
                        },
                        totalOverallScore: {
                            $sum: {
                                $cond: [
                                    { $in: ["$status", ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"]] },
                                    { $toInt: "$overall_score" },
                                    0
                                ]
                            }
                        },
                        totalSTP: {
                            $sum: {
                                $cond: [
                                    { $in: ["$stp", [true]] },
                                    { $toInt: "$stp" },
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: "$_id",
                        count: {
                            $round: [{
                                $cond: [
                                    { $gt: ["$totalDocumentsSubmitted", 0] },
                                    { $divide: ["$totalOverallScore", "$totalDocumentsSubmitted"] },
                                    0
                                ]
                            }, 2]
                        },
                        count_stp: {
                            $multiply: [{
                                $cond: [
                                    { $gt: ["$totalDocumentsSubmitted", 0] },
                                    { $divide: ["$totalSTP", "$totalDocumentsSubmitted"] },
                                    0
                                ]
                            }, 100]
                        }
                    }
                },
                // Third Stage
                {
                    $sort: { _id: 1 }
                }
            ])
            .toArray(function (err, result) {
                if (err) callback(err);
                else {
                    callback(null, result);
                }
            });
    }

    getTotalProcessed(reqBody, callback) {
        let filter = {};
        // if (reqBody.request.filter.role !== 'admin') {
        //     filter["userId"] = reqBody.userId
        // } // added by gaurav

        filter = this.getUpdatedFilter(reqBody, filter);

        docsCollection
            .aggregate([{
                $lookup: {
                    from: "document_analytics_metadata",
                    localField: "documentId",
                    foreignField: "documentId",
                    as: "docs_analytics_data"
                }
            },
            {
                $unwind: {
                    path: "$docs_analytics_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: filter
            },
            {
                $group: {
                    _id: null,
                    totalDocumentsSubmitted: { $sum: 1 },
                    totalDocumentsProcessed: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["PROCESSED", "REVIEW", "REVIEW_COMPLETED"]] },
                                1,
                                0
                            ]
                        }
                    },
                    totalPageCount: {
                        $sum: {
                            $cond: [
                                { $in: ["$status", ["EXTRACTION_DONE", "REVIEW", "PROCESSED", "REVIEW_COMPLETED", "RPA_PROCESSING"]] },
                                { $toInt: "$pageCount" },
                                0
                            ]
                        }
                    },
                }
            }
            ])
            .toArray(function (err, result) {
                if (err) callback(err);
                else {
                    if (result[0]) {
                        delete result[0]._id;
                    }
                    callback(null, result[0]);
                }
            });
    }

    getUpdatedFilter(reqBody, filter) {
        if (reqBody.request.filter.role !== 'admin' && reqBody.request.filter.role !== 'clientadmin') {
            filter["userId"] = reqBody.userId
        }
        else if (reqBody.request.filter.role === 'clientadmin') {
            filter["userId"] = reqBody.filter.userId
            filter = filter ? util.getSearchQuery(filter) : {};
        }

        return filter;
    }

    getMappedRoleIds(rolesArray, validRoles) {
        let mappedRoleIds = [];

        rolesArray.filter((roleObj) => {
            if (validRoles.includes(roleObj.role)) {
                mappedRoleIds.push((roleObj._id).toString());
            }
        })
        return mappedRoleIds;
    }
}

module.exports = new DashboardService(config);
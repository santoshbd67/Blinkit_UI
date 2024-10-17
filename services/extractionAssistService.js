const _ = require("lodash");
const async = require("async");
const config = require("../config");
const dbutil = require("../util/db");
const util = require("../util/util");
const resUtil = require("../util/resUtil");
const request = require("request");
const axios = require('axios');

const db = dbutil.getDatabase(config.mongoDBName);
const docCollection = db.collection("document_metadata");
const resultCollection = db.collection("document_result");
const userCollection = db.collection("users");
const roleCollection = db.collection("roles");
const emailService = require("./emailService");
const tokenService = require("./tokenService");
const sharedService = require('./sharedService');

class ExtractionAssistService {
    constructor(config) {
        this.config = config;
    }

    /* API to get the suggestions from the masterdata format identifier. Following are the step performed in the Method sequentially.
     *
     * 1. Validate the request
     * 2. call the axios endpoint to get the response
     */
    getSuggestions(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.suggestions",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.documentId)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.formatIdentifierRootPath + 'get_suggestion', { document_id: reqData.documentId })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 500, msg: 'Unable to get suggestions' })
                            }
                        })
                        .catch(function (error) {
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to validate the masterdata. Following are the step performed in the Method sequentially.
        *
        * 1. Validate the request
        * 2. call the axios endpoint to validate the response
        * 3. return response retrieved from the api
    */
    validateMasterData(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.validatemasterdata",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object")
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.formatIdentifierRootPath + 'validate', reqData)
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 500, msg: 'Unable to validate the masterdata' })
                            }
                        })
                        .catch(function (error) {
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to create the masterdata. Following are the step performed in the Method sequentially.
        *
        * 1. Validate the request
        * 2. call the axios endpoint to create the masterdata
        * 3. return the response
    */
    createMasterData(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.createmasterdata",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object")
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.formatIdentifierRootPath + 'create', reqData)
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 500, msg: 'Unable to create masterdata' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: 'error' })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to get the all formats and corrections from the result collection. Following are the step performed in the Method sequentially.
       *
       * 1. Validate the request
       * 2. fetch those docs whic have status ReviewCompleted.
       * 3. make list of format and corrections on basis of certain conditions
    */
    getAllFormatsAndCorrections(req, res) {
        let userReq = req.body.request;
        const apiParams = {
            id: "api.document.getAllFormatsAndCorrections",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        let filter = userReq && userReq.filter ? util.getSearchQuery(userReq.filter) : {};
        let responseObj = { Formats: [], Corrections: [], TotalFormats: 0, TotalCorrections: 0 }
        let that = this;

        async.waterfall([
            function (callback) {
                if (userReq.token) {
                    tokenService.validateToken(userReq.token, callback);
                } else {
                    callback(null, userReq);
                }
            },
            function (tokenRes, callback) {
                roleCollection.find({}).toArray(function (err, roles) {
                    if (roles && roles.length) {
                        callback(null, tokenRes, roles)
                    } else {
                        callback(err, tokenRes, null)
                    }
                });
            },
            function (tokenRes, rolesRes, callback) {
                let userIds = [];
                if (tokenRes.role === "clientadmin") {
                    let useremail = userReq.emailId;
                    let userdomain = (useremail.split('@')[1]);
                    userdomain = sharedService.encrypt(userdomain);

                    let validRoles = ['admin'];
                    let mappedRoleIds = that.getMappedRoleIds(rolesRes, validRoles);

                    let insidefilter = { role: { $nin: mappedRoleIds }, userdomain: userdomain }

                    userCollection.find(insidefilter).sort({ userId: 1 })
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
                                    filter['userId'] = userIds
                                    callback(null, userIds)
                                } else {
                                    callback(null, userIds);
                                }
                            }
                        });
                }
                else {
                    callback(null, userIds);
                }
            },
            function (userIds, callback) {
                // let filter = userReq && userReq.filter ? util.getSearchQuery(userReq.filter) : {};
                if (filter.userId) {
                    filter.userId = { "$in": filter.userId }
                }
                resultCollection.find(filter).toArray(function (err, docs) {
                    callback(err, docs)
                });
            },
            function (docs, callback) {
                if (docs) {
                    docs = docs.sort((a, b) => { return a.vendorId.localeCompare(b.vendorId); });

                    docs.forEach((doc, index) => {
                        doc.documentInfo.forEach((docInfo, i) => {
                            if (docInfo.extractionAssist == userReq.selectedTab) {
                                if ((responseObj.Formats.findIndex(object => object.vendorId === doc.vendorId)) === -1) {
                                    responseObj.Formats.push({ id: index, vendorId: doc.vendorId });
                                }
                                if ((responseObj.Corrections.findIndex(object => object.correctionIn === docInfo.fieldId)) === -1) {
                                    responseObj.Corrections.push({ id: i, correctionIn: docInfo.fieldId })
                                }
                            }
                        })
                    })
                    responseObj.Corrections.filter((item, index) => {
                        item.id = index + 1;
                    })
                    responseObj.Formats.filter((item, index) => {
                        item.id = index + 1;
                    })
                    responseObj.TotalFormats = responseObj.Formats.length;
                    responseObj.TotalCorrections = responseObj.Corrections.length;
                }
                callback(null, responseObj);
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
    }

    /* API to get the updated formats(VendorIds) for the given documentIds which have currently 'Unknown' VendorIds. Following are the step performed in the Method sequentially.
        *
        * 1. Validate the request
        * 2. call the axios endpoint to get the response
    */
    getUpdatedVendorNameForUnknownFormats(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.refreshedFormats",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.list_document_id)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.formatIdentifierRootPath + 'refresh_format', { list_document_id: reqData.list_document_id })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 500, msg: 'Unable to get refreshed formats' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to get the avilable templates on basis on VendorId and given FieldNames. Following are the step performed in the Method sequentially.
        *
        * 1. Validate the request
        * 2. call the axios endpoint to get the response
   */
    getTemplates(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.getTemplates",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.document_id
                && reqData.vendor_id && reqData.vendor_name && reqData.list_fields)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.pathFinderRootPath + 'get_templates', {
                        document_id: reqData.document_id,
                        vendor_id: reqData.vendor_id,
                        vendor_name: reqData.vendor_name,
                        list_fields: reqData.list_fields,
                    })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 500, msg: 'Unable to get templates' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }
                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to validate template on basis on VendorId and given FieldNames with formdata template. Following are the step performed in the Method sequentially.
         *
         * 1. Validate the request
         * 2. call the axios endpoint to get the response
    */
    validateTemplate(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.validateTemplate",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.document_id
                && reqData.vendor_id && reqData.vendor_name && reqData.template)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.pathFinderRootPath + 'validate_template',
                        {
                            document_id: reqData.document_id,
                            vendor_id: reqData.vendor_id,
                            vendor_name: reqData.vendor_name,
                            template: reqData.template,
                        })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 500, msg: 'Unable to validate template' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to save template on basis on VendorId and given template list with its data. Following are the step performed in the Method sequentially.
         *
         * 1. Validate the request
         * 2. call the axios endpoint to get the response
    */
    createTemplate(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.createTemplate",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.document_id
                && reqData.vendor_id && reqData.vendor_name && reqData.list_template)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.pathFinderRootPath + 'create_templates',
                        {
                            document_id: reqData.document_id,
                            vendor_id: reqData.vendor_id,
                            vendor_name: reqData.vendor_name,
                            list_template: reqData.list_template,
                        })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 500, msg: 'Unable to create template' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to send the email along with its template data. Following are the step performed in the Method sequentially.
         * gaurav
         * 1. Validate the request
         * 2. send the email to the admin email id with its data
    */
    raiseTicket(req, res) {
        let reqData = req.body.userDetails;

        const thisRef = this;
        const apiParams = {
            id: "api.extraction.pathfinder.raiseTicket",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object")
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    req.body.userDetails.message = thisRef.raiseTicketTemplate(reqData);
                    var today = new Date();
                    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
                    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
                    var dateTime = date + ' ' + time;
                    emailService.sendEmail(req, res, callback, apiParams, {}, `pAIges Pathfinder: Ticket ID - ${reqData.vendor_Id}_ ${dateTime}`)
                },
                function (result) {
                    if (result.Details == 'Success') {
                        resUtil.OK(res, apiParams, result)
                    } else if (result.status == 201) {
                        resUtil.ERROR(res, apiParams, { status: 201, msg: 'Email could not be sent.' })
                        return;
                    } else {
                        resUtil.ERROR(res, apiParams, {
                            status: 500,
                            err: "INTERNAL_SERVER_ERROR",
                            errmsg: "Error while finding Raise Ticket"
                        })
                        return;
                    }
                }],

        );
    }

    // internal method to prepare the template for raise ticket
    raiseTicketTemplate(data) {
        let clientUrl = this.config.clientAddress; //req.headers.referer; //this.config.clientAddress;
        let htmlContent = ` 
        <html>
        <body>
        <h4>Hello, <br></h4>
        <h3>Ticket Details:<br></h3>
        <p>Env Details: <a href="${clientUrl}">${clientUrl}</a><br>
        Vendor ID: ${data.vendor_Id}<br>
        pAIges Document IDs: ${data.document_ids}<br>
        FieldName:${data.fieldNames} <br>
        Link: <a href="${clientUrl}">${clientUrl}</a><br> </p>
        <p>Thanks,<br>Team TAO</p>
        </body>
        </html>
    `
        return htmlContent;
    }

    /* API to get the avilable documents for testing on basis of VendorId. Following are the step performed in the Method sequentially.
         * gaurav
         * 1. Validate the request
         * 2. get the documents from both Processing and EA Queue
    */
    getTestingDocuments(req, res) {
        let reqData = req.body.request;
        let totalIds = [];
        let docIdsList = [];
        let result = {};
        //const filter = reqData && reqData.filter ? util.getSearchQuery(reqData.filter) : {};
        let filter = reqData && reqData.filter ? reqData.filter : {};

        const apiParams = {
            id: "api.extraction.pathfinder.getTestingDocuments",
            msgid: req.body.params ? req.body.params.msgid : "",
        };
        filter = {
            documentInfo: {
                $elemMatch: {
                    extractionAssist: 0
                }
            },
        }

        filter.status = 'REVIEW_COMPLETED';
        filter.vendorId = reqData.vendorId;
        let ids = []
        resultCollection
            .aggregate([
                {
                    $lookup: {
                        from: "document_metadata",
                        // localField: "documentId",
                        // foreignField: "documentId",
                        let: { document_Id: "$documentId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr:
                                        { $eq: ["$$document_Id", "$documentId"] }
                                }
                            },
                            {
                                $project: {
                                    documentId: 1,
                                    _id: 0,
                                    fileName: 1,

                                }
                            }],
                        as: "document_metadata_data",
                    }
                },
                {
                    $match: filter,
                },
                {
                    $sort: {
                        submittedOn: -1,
                    },
                },
                {
                    $limit: 10,
                }
            ])
            .toArray(function (err, docs) {
                if (err) {
                    resUtil.handleError(req, res, err);
                } else {
                    docs.filter((doc) => {
                        ids.push(doc.documentId);
                        docIdsList.push(doc.documentId);
                        totalIds.push({ documentId: doc.documentId, Queue: 'EXTRACTION ASSIST', fileName: doc.document_metadata_data[0].fileName })
                        return doc;
                    })
                    // result.count = result.documents.length
                    let index = totalIds.length;
                    if (index < 10) {
                        docCollection
                            .aggregate([
                                {
                                    $sort: {
                                        submittedOn: -1,
                                    },
                                },
                                {
                                    $limit: 100,
                                }
                            ])
                            .toArray(function (err, docs) {
                                if (err) {
                                    resUtil.handleError(req, res, err);
                                } else {
                                    docs = docs.filter((doc) => {
                                        if (!ids.includes(doc.documentId) && doc.vendorId == reqData.vendorId && index < 10) {
                                            index++;
                                            return doc
                                        }
                                    })
                                    // result.count = result.documents.length
                                    docs.forEach(element => {
                                        // docIdsList.push(element.documentId);
                                        // totalIds.push({ documentId: element.documentId, Queue: 'PROCESSING', fileName: element.fileName })
                                        // result.documents.push(element)
                                        if (docIdsList.length < 10 && totalIds.length < 10) {
                                            docIdsList.push(element.documentId);
                                            totalIds.push({ documentId: element.documentId, Queue: 'PROCESSING', fileName: element.fileName })
                                        }
                                    });
                                    result.IdDetailsList = totalIds
                                    result.docIdsList = docIdsList;

                                    resUtil.OK(res, apiParams, result);
                                }
                            });
                    }
                    else {
                        result.IdDetailsList = totalIds;
                        result.docIdsList = docIdsList;
                        resUtil.OK(res, apiParams, result);
                    }

                }
            });

    }

    /* API to validate all the documents those are listed for Testing from the 'getTestingDocuments' API.  Following are the step performed in the Method sequentially.
         * gaurav
         * 1. Validate the request
         * 2. send the request to the axios server with list of document IDs
    */
    testTemplates(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.testTemplates",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.list_document_id
                && reqData.vendor_id && reqData.vendor_name && reqData.list_template)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.pathFinderRootPath + 'test_templates',
                        {
                            list_document_id: reqData.list_document_id,
                            vendor_id: reqData.vendor_id,
                            vendor_name: reqData.vendor_name,
                            list_template: reqData.list_template,
                        })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 500, msg: 'Unable to test template' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to get all the OCR data for the given Document.  Following are the step performed in the Method sequentially.
         * gaurav
         * 1. Validate the request
         * 2. send the request to the axios server with given document Id.
         * 3. send the response back to the user with the OCR data
    */
    getOCRLines(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.getOCRLinesTemp",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.document_id)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    axios.post(config.pathFinderCorrectionsPath + 'getOCRLinesTemp',
                        {
                            document_id: reqData.document_id,
                        })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                callback(null, { status: 201, msg: 'Unable to get OCR Lines' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
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

    /* API to get all template list for Rules Tab in EA screen.Following are the step performed in the Method sequentially.
        * kanak
        * 1. Validate the request
        * 2. send the request to the axios server with empty object.
        * 3. send the response back to the user
   */
    getRulesData(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.getRulesData",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object")
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    let url = config.pathFinderRootPath + 'get_list_templates';
                    console.log("List Template URL:- " + url);
                    axios.post(url, {})
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                console.log(response);
                                callback(null, { status: 201, msg: 'get_list_templates' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to get all template list for Rules Tab in EA screen.Following are the step performed in the Method sequentially.
        * kanak
        * 1. Validate the request
        * 2. send the request to the axios server with empty object.
        * 3. send the response back to the user
   */
    getMLIdentifiers(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.getMLIdentifiers",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object")
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    let url = config.formatIdentifierRootPath + 'get_list';
                    console.log("Format Identifiers URL Called:- " + url);
                    axios.post(url, {})
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                console.log(response);
                                callback(null, { status: 201, msg: 'get_list' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to delete the template from template creation screen. Following are the step performed in the Method sequentially.
        * kanak
        * 1. Validate the request
        * 2. send the request to the axios server with vendor_name,vendor_id and field_name.
        * 3. send the response back to the user
   */
    deleteTemplate(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.deleteTemplate",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object")
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    let url = config.pathFinderRootPath + 'delete_template';
                    console.log("Delete Template URL:- " + url);

                    axios.post(url, {
                        vendor_name: reqData.vendor_name,
                        vendor_id: reqData.vendor_id,
                        field_name: reqData.field_name
                    })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                console.log(response);
                                callback(null, { status: 201, msg: 'delete_template' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to delete the template from template creation screen. Following are the step performed in the Method sequentially.
       * kanak
       * 1. Validate the request
       * 2. send the request to the axios server with vendor_name,vendor_id and field_name.
       * 3. send the response back to the user
  */
    deleteVendorMasterdata(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.extraction.pathfinder.deleteVendorMasterdata",
            msgid: req.body.params ? req.body.params.msgid : "",
        };

        if (
            !(req.body && reqData && typeof reqData == "object")
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    let url = config.formatIdentifierRootPath + 'delete';
                    console.log("Delete Masterdata URL Called:- " + url);

                    axios.post(url, {
                        vendor_name: reqData.vendor_name,
                        vendor_id: reqData.vendor_id
                    })
                        .then(function (response) {
                            if (response && response.data)
                                callback(null, response.data)
                            else {
                                console.log(response);
                                callback(null, { status: 201, msg: 'master_data could not deleted' })
                            }
                        })
                        .catch(function (error) {
                            console.log(error);
                            callback(null, { status: 500, msg: error })
                        });
                }
            ],
            function (err, resultData) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                }

                if (!resultData) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                }

                resUtil.OK(res, apiParams, resultData);
                return;
            }
        );
    }

    /* API to Update the Deleted VendorIds. Following are the step performed in the Method sequentially.
       * gaurav
        ** This API sets vendorId to 'UNKNOWN' in both colelctions after delete vendor masterdata from the UI.
       * 1. Update VendorId In resultCollection
       * 2. Update VendorId In docCollection
  */
    updateDeletedVendors(req, res) {
        let reqData = req.body.request;
        const apiParams = {
            id: "api.extraction.pathfinder.updateDeletedVendorIds",
            msgid: req.body.params ? req.body.params.msgid : "",
        };
        if (
            !(req.body && reqData && typeof reqData == "object" && reqData.vendorId)
        ) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        let that = this;
        let modifiedResult = {}
        const filter = { vendorId: reqData.vendorId };
        console.log(filter);
        reqData.vendorId = "UNKNOWN";
        try {
            async.waterfall(
                [
                    function (callback) {
                        that.updateManyInDB(resultCollection, filter, reqData, callback)
                    },
                    function (resultCollectionRes, callback) {
                        modifiedResult['updatedIn_ResultCollection'] = resultCollectionRes.updatedDocuments
                        that.updateManyInDB(docCollection, filter, reqData, callback)
                    },
                ],
                function (err, docCollectionRes) {
                    if (err) {
                        resUtil.handleError(req, res, err);
                        return;
                    }
                    if (!docCollectionRes) {
                        resUtil.NOTFOUND(res, apiParams, {});
                        return;
                    }
                    modifiedResult['updatedIn_DocCollection'] = docCollectionRes.updatedDocuments
                    resUtil.OK(res, apiParams, modifiedResult);
                    return;
                }
            );
        } catch (error) {
            console.log("Error in updateMany document in Collection API method");
            console.log(error);
            resUtil.handleError(req, res, error);
        }
    }

    updateManyInDB(dbRef, filter, document, callback) {
        dbRef.updateMany(filter,
            { $set: document }, {
            upsert: false
        },
            function (err, result) {
                if (err) {
                    console.log(`Update collection failed at ${new Date().toUTCString()} from saveData method because..`);
                    console.log(err);
                    util.handleServerError(err, result, callback);
                    return;
                }
                if (!result) {
                    console.log(`Result not came while saving data in mongodb at ${new Date().toUTCString()} from saveData method.`);
                    util.handleServerError(err, result, callback);
                    return;
                }
                util.handleServerError(err, { updatedDocuments: result.result.nModified }, callback);
            }
        )
    }
}

module.exports = new ExtractionAssistService(config);

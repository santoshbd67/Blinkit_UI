const _ = require("lodash");
const async = require("async");
const config = require("../config");
const fs = require("fs");
const constants = require("../util/constant");
const request = require('request');
const azure = require("azure-storage");
const dbutil = require("../util/db");
const util = require("../util/util");
const resUtil = require("../util/resUtil");
const validator = require("../util/validatorUtil");
const db = dbutil.getDatabase(config.mongoDBName);

const storageType = config.storageProvider;
const account = config.storageAccessKey;
const accountKey = config.storageAccessSecret;
const container = config.storageSampleInvoicesContainer;

const vendorCollection = db.collection("vendor");
const userVendorMapCollection = db.collection("UserVendorMap");
const xmlMapCollection = db.collection("XMLMapping");

const logger = require("../logger/logger");

const tokenService = require("./tokenService");

class VendorService {
    constructor(config) {
        this.config = config;
    }

    /*
     * API to add a new vendor through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Check for the vendorId or name if it already exists, duplicate entry check
     * 3.
     */
    addVendor(req, res) {
        let reqData = req.body.request;
        const that = this;
        const apiParams = {
            vendorId: "api.vendor.add",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
                req.body &&
                req.body.request &&
                typeof req.body.request == "object" &&
                (!reqData.xmlMapping ||
                    (reqData.xmlMapping && typeof reqData.xmlMapping === "object"))
            )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function(callback) {
                    validator.validate(reqData, "addVendor", callback);
                },
                function(vendorDuplicateRes, callback) {
                    that.vendorDuplicate(reqData, callback);
                },
                function(value1, callback) {
                    reqData.createdOn = util.generateTimestamp();
                    reqData.lastUpdatedOn = util.generateTimestamp();
                    vendorCollection
                        .find({})
                        .sort({ name: 1 })
                        .toArray(function(err, docs) {
                            if (docs) {
                                vendorCollection.insertOne(reqData, function(err1, doc1) {
                                    if (doc1 && doc1.ops && doc1.ops.length)
                                        util.handleServerError(err1, doc1.ops[0], callback);
                                    else util.handleServerError(err1, null, callback);
                                });
                            } else {
                                callback({
                                        status: 500,
                                        err: "INTERNAL_SERVER_ERROR",
                                        errmsg: "Error while adding vendor"
                                    },
                                    null
                                );
                            }
                        });
                }
            ],
            function(err, result) {
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
     * API to get a list of all vendors through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate token for the request
     * 2. Check the token role is admin or not
     * 3. If token role is admin, return all vendors, else return only allowed vendors(permission is set by admin).
     */
    vendorList(req, res) {
        const apiParams = {
            id: "api.vendor.list",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        const userReq = req.body.request;
        // let filter = userReq.filter;

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            const that = this;
            async.waterfall(
                [
                    function(callback) {
                        if (userReq.token) {
                            tokenService.validateToken(userReq.token, callback);
                        } else {
                            callback(null, userReq);
                        }
                    },
                    function(tokenRes, callback) {
                        if (tokenRes && tokenRes.role) {
                            if (tokenRes.role !== "admin") {
                                //not admin
                                //fetch user vendor mapping

                                userVendorMapCollection
                                    .find({ userId: tokenRes.userId })
                                    .toArray(function(err, docs) {
                                        if (err) {
                                            callback({
                                                    status: 500,
                                                    err: "INTERNAL SERVER ERROR",
                                                    errmsg: "Unable to fetch vendor list"
                                                },
                                                null
                                            );
                                        } else if (docs) {
                                            if (docs && docs.length) {
                                                let vendors = [];
                                                docs.forEach(doc => {
                                                    if (doc.vendorId) vendors.push(doc.vendorId);
                                                });

                                                if (
                                                    userReq.filter.vendorId &&
                                                    typeof userReq.filter.vendorId === "object"
                                                ) {
                                                    if (userReq.filter.vendorId.length) {
                                                        userReq.filter.vendorId.forEach((each, index) => {
                                                            if (!vendors.includes(each)) {
                                                                delete userReq.filter.vendorId.splice(index, 1);
                                                            }
                                                        });
                                                    } else {
                                                        userReq.filter.vendorId = vendors;
                                                    }

                                                    callback(null, vendors);
                                                } else if (
                                                    userReq.filter.vendorId &&
                                                    typeof userReq.filter.vendorId === "string"
                                                ) {
                                                    if (!vendors.includes(userReq.filter.vendorId)) {
                                                        callback({
                                                                status: 403,
                                                                err: "AUTHENTICATION ERROR",
                                                                errmsg: "Not allowed to view this document"
                                                            },
                                                            null
                                                        );
                                                    } else {
                                                        callback(null, vendors);
                                                    }
                                                } else {
                                                    //if no vendorId filter is given, show list of documents for allowed documents only
                                                    userReq.filter.vendorId = vendors;
                                                    callback(null, []);
                                                }
                                            } else {
                                                callback({
                                                        status: 403,
                                                        err: "AUTHENTICATION ERROR",
                                                        errmsg: "Not allowed to view this document"
                                                    },
                                                    null
                                                );
                                            }
                                        } else {
                                            callback({
                                                    status: 404,
                                                    err: "NOT FOUND",
                                                    errmsg: "Vendor list not found"
                                                },
                                                null
                                            );
                                        }
                                    });
                            } else {
                                //ADMIN
                                //SHOW ALL
                                callback(null, []);
                            }
                        } else {
                            //not authorized
                            callback(null, []);
                        }
                    },
                    function(changedFilter, callback) {
                        that.findVendors(userReq, callback);
                    }
                ],
                function(err, result) {
                    if (err) {
                        resUtil.handleError(req, res, err);
                    } else if (result) {
                        resUtil.OK(res, apiParams, result);
                    } else {
                        resUtil.BADREQUEST(res, apiParams, {});
                    }
                }
            );
        }
    }

    /*
     * API to find vendors by some flter criteria through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Filter the vendors & count.
     * 2. If count ===0, show error no vendor found, else return the list of filtered vendors.
     */
    findVendors(userReq, callback) {
        const filter =
            userReq && userReq.filter ? util.getSearchQuery(userReq.filter) : {};
        let limit;

        if (!(userReq && userReq.limit)) {
            limit =
                typeof this.config.defaultResultSize === "string" ?
                parseInt(this.config.defaultResultSize) :
                this.config.defaultResultSize;
        } else {
            limit = userReq.limit;
        }

        const page = userReq.page || 1;
        const skip = limit * (page - 1);
        let result = {};

        vendorCollection.countDocuments(filter, function(err, count) {
            if (err) {
                callback({
                        status: 500,
                        err: "INTERNAL_SERVER_ERROR",
                        errmsg: "error while fetching vendor list"
                    },
                    null
                );
            }
            result.count = count;
            result.perPageRecords = limit;
            result.page = page;

            if (result.count > 0) {
                vendorCollection
                    .find(filter)
                    .sort({ name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(function(err, vendors) {
                        result.documents = vendors;
                        if (err) {
                            callback({
                                    status: 500,
                                    err: "INTERNAL_SERVER_ERROR",
                                    errmsg: "error while fetching user list"
                                },
                                null
                            );
                        }
                        callback(null, result);
                    });
            } else {
                callback({
                        status: 404,
                        err: "NOT FOUND",
                        errmsg: " no vendor found"
                    },
                    null
                );
            }
        });
    }

    /*
     * API to get a particular vendor by vendorId through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Find the vendor by vendorId.
     * 2. Return result on success & error on failure
     */
    getVendorById(req, res) {
        let apiParams = {
            vendorId: "api.vendor.id",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!req.params.id) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        let result = {};
        vendorCollection.findOne({
                vendorId: req.params.id
            },
            function(err, result2) {
                result.vendor = result2;
                if (err) {
                    apiParams.err = err;
                    resUtil.ERROR(res, apiParams, result);
                    return;
                }
                if (!result2) {
                    resUtil.NOTFOUND(res, apiParams, result);
                    return;
                }
                resUtil.OK(res, apiParams, result);
            }
        );
    }

    /*
     * API to get XML mapping for a particular xmlMapId
     * If  xmlMapId is not Present then Default xmlMapId should be 1
     */
    getXMLMappingById(req, res) {
        let reqData = req.query;

        const apiParams = {
            id: "api.vendor-xml-map.get",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!reqData.id) {
            reqData.id = 1
        }
        reqData.id = parseInt(reqData.id);
        xmlMapCollection.findOne({
                xmlMapId: reqData.id
            },
            function(err, result) {
                if (err) {
                    resUtil.ERROR(res, apiParams, {});
                } else {
                    resUtil.OK(res, apiParams, result);
                }
            }
        )
    }

    /*
     * API to update XML mapping for a particular xmlMapId
     * xmlMapId is mandatory to update XML Mapping
     */
    updateXMLMapping(req, res) {
        let reqData = req.body.request;

        const apiParams = {
            id: "api.vendor-xml-map.update",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        reqData.xmlMapId = parseInt(reqData.xmlMapId);

        async.waterfall([
                function(callback) {
                    validator.validate(reqData, "updateXmlMapping", callback)
                },
                function(value, callback) {

                    dbutil.updateInDB(
                        xmlMapCollection, { xmlMapId: reqData.xmlMapId },
                        reqData,
                        callback
                    )
                }
            ],
            function(err, result) {
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
        )
    }

    /*
     * API to update a particular vendor by vendorId through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request.
     * 2. Find the vendor by vendorId, update & return result
     */
    updateVendor(req, res) {
        let reqData = req.body.request;
        const apiParams = {
            vendorId: "api.vendor.update",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        if (!(
                req.body &&
                req.body.request &&
                typeof req.body.request == "object" &&
                (!reqData.xmlMapping ||
                    (reqData.xmlMapping && typeof reqData.xmlMapping === "object"))
            )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        async.waterfall(
            [
                function(callback) {
                    validator.validate(reqData, "updateVendor", callback);
                },
                function(response1, callback) {
                    dbutil.updateInDB(
                        vendorCollection, {
                            vendorId: reqData.vendorId
                        },
                        reqData,
                        callback
                    );
                }
            ],
            function(err, resultData) {
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

    /*
     * API to delete a particular vendor by vendorId through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Find the vendor by vendorId.
     * 2. Delete the vendor & return the result
     */
    deleteVendor(req, res) {
        const that = this;
        let reqData = req.body.request;
        const apiParams = {
            vendorId: "api.vendor.delete",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        async.waterfall([
            function(callback) {
                that.sampleInvoiceExists(reqData, callback);
            },
            function(value1, callback) {
                vendorCollection.findOne({
                        vendorId: reqData.vendorId
                    },
                    function(err, result) {
                        if (err) {
                            callback({
                                status: 500,
                                err: "ERROR",
                                errmsg: "Internal server Error"
                            }, null)
                        } else if (result !== null) {
                            callback(null, result)
                        } else {
                            callback({
                                status: 404,
                                err: "BAD_REQUEST",
                                errmsg: "Error while deleting Sample invoice, No sample invoice found for this vendorId"
                            }, null)
                        }
                    }
                )
            },

            function(result, callback) {
                if (result.sampleInvoices) {
                    let vendorSampleInvoice = result.sampleInvoices;
                    let sampleInvoiceName = vendorSampleInvoice.substring(vendorSampleInvoice.lastIndexOf('/') + 1);
                    if (storageType === "localblob") {
                        let paths = JSON.parse(config.localSubFoldersAllowed);
                        let localSampleInvoiceFilePath = config.localBlobStorage + paths.sampleinvoices + sampleInvoiceName;
                        if (fs.existsSync(localSampleInvoiceFilePath)) {
                            try {
                                fs.unlinkSync(localSampleInvoiceFilePath);
                                callback(null, {
                                    status: 200,
                                    msg: "sample invoice Successfully deleted from folder location",
                                })
                            } catch (err) {
                                const errorMessage = {
                                    status: 500,
                                    err: "ERROR",
                                    errmsg: "Error while deleting Sample Invoice file"
                                }
                                callback(errorMessage, null);
                            }
                        } else {
                            callback(null, result)
                        }

                    } else {
                        let containerName = vendorSampleInvoice.split("/")[0];
                        let blobName = sampleInvoiceName;
                        var startDate = new Date();
                        var expiryDate = new Date(startDate);
                        expiryDate.setMinutes(startDate.getMinutes() + 5);
                        startDate.setMinutes(startDate.getMinutes() - 1);

                        var sharedAccessPolicy = {
                            AccessPolicy: {
                                Permissions: azure.BlobUtilities.SharedAccessPermissions.READ +
                                    azure.BlobUtilities.SharedAccessPermissions.WRITE,
                                Start: startDate,
                                Expiry: expiryDate
                            }
                        };
                        const blobService = azure.createBlobService(account, accountKey);
                        var token = blobService.generateSharedAccessSignature(
                            containerName,
                            blobName,
                            sharedAccessPolicy
                        );
                        blobService.doesBlobExist(containerName, blobName, function(error, blobResult) {
                            if (blobResult.exists == true) {
                                blobService.deleteBlob(containerName, blobName, function(error, result, response) {
                                    if (!error) {
                                        callback(null, result)
                                    } else {
                                        const errorMessage = {
                                            status: 500,
                                            err: "ERROR",
                                            errmsg: "Error while deleting Sample Invoice file from Azure"
                                        }
                                        callback(errorMessage, null);
                                    }
                                })
                            } else {
                                callback(null, result)
                            }
                        })
                    }
                } else {
                    callback(null, result)
                }
            },
            function(value2, callback) {
                vendorCollection.findOneAndDelete({
                        vendorId: reqData.vendorId
                    },
                    function(err, result) {
                        if (err) {
                            callback({
                                status: 500,
                                err: "ERROR",
                                errmsg: "Error while deleting Vendor from DB"
                            }, null)
                        } else {
                            callback(null, result)
                        }
                    }
                );
            }
        ], function(err, resultData) {
            if (err) {
                resUtil.handleError(req, res, err);
            } else if (resultData) {
                resUtil.OK(res, apiParams, resultData);
            } else {
                resUtil.BADREQUEST(res, apiParams, {});
            }
        })
    }

    sampleInvoiceExists(req, callback) {
        const preprocessorAPIToDeleteSampleInvoice = config.preProcessorAPIHost + constants.deleteVendorSampleInvoice;

        request({
                headers: {
                    "content-type": "application/json"
                },
                method: "POST",
                url: preprocessorAPIToDeleteSampleInvoice,
                body: JSON.stringify(req.body)
            },
            (error, response, body) => {
                if (error) {
                    const errorMessage = {
                        status: 500,
                        err: "ERROR",
                        errmsg: "Internal Server Error"
                    }
                    callback(errorMessage, null);
                } else {
                    callback(null, body);
                }
            }
        );
    }

    /*
     * Method to check if a vendor is already there maching filters by vendorId or name.
     * Being used while adding a new vendor.
     */
    vendorDuplicate(request, callback) {
        vendorCollection.findOne({
                $or: [{
                        vendorId: request.vendorId
                    },
                    {
                        name: request.name
                    }
                ]
            },
            function(err, doc) {
                if (err) callback(err, null);
                else if (doc) {
                    callback({
                            status: 409,
                            err: "CONFLICT",
                            errmsg: "Duplicate Vendor Entry"
                        },
                        null
                    );
                } else {
                    callback(null, {});
                }
            }
        );
    }

    /*
     * API to get vendor logo through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Receives the logo name saved in DB.
     * 2. If storage type is localblob append the absolute paths in config for vendor assets & return the full path
     * 3. Else return the url as it is.
     */
    getVendorLogo(req, res) {
        const apiParams = {
            vendorId: "api.vendor.logo.get",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        let result = {};

        const reqURL = req.query.url;
        if (!(req.query && req.query.url)) {
            resUtil.BADREQUEST(res, apiParams, {});
        } else {
            if (
                storageType === "localblob" &&
                reqURL.indexOf("http") === -1
            ) {
                let localFolders = JSON.parse(config.localSubFoldersAllowed);
                let assetFolder = localFolders.assets;

                result = {
                    blobURL: config.tappUIAPIHost + config.localStaticPath + "/assets/" + reqURL
                };
            } else {
                result = { blobURL: reqURL };
            }
            resUtil.OK(res, apiParams, result);
        }
    }

    validateVendorId(req, res) {
        const apiParams = {
            vendorId: "api.vendor.validate",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        let result = {};

        if (!(req.body && req.body.request && typeof req.body.request == "object")) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            const reqBody = req.body.request;
            this.vendorDuplicate(reqBody, (err, res1) => {
                if (res1) {
                    resUtil.OK(res, apiParams, {});
                } else if (err) {
                    resUtil.handleError(req, res, err)
                } else {
                    resUtil.ERROR(res, apiParams, {});
                }
            })
        }
    }
}

module.exports = new VendorService(config);
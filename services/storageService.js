const _ = require("lodash");
const config = require("../config");
const multer = require("multer");
const resUtil = require("../util/resUtil");
const util = require("../util/util");
const request = require("request");
const logger = require("../logger/logger");
const azure = require("azure-storage");
const azureStorageProvider = require("../storage/azureStorageService");
const awsStorageProvider = require("../storage/awsStorageService");
const fs = require("fs");
const async = require("async");
const axios = require('axios');

const storageType = config.storageProvider;

const account = config.storageAccessKey;
const accountKey = config.storageAccessSecret;
const container = config.storageContainer;
const assetsContainer = config.storageContainerAssets;
const sampleInvoicesContainer = config.storageSampleInvoicesContainer;
var localBlobStorage = config.localBlobStorage;

class StorageService {
    constructor(config) {
        this.config = config;
    }

    /*
     * API to fetch storage container configurations for upload of resources from front-end in case of cloud (azure & aws s3) through the TAPP service.
     *
     *  Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Check the storage type & fetch the specific configuration for the storage type from config
     */

    generateSAS(req, res) {
        if (!(
            req.query &&
            req.query.blobName &&
            req.query.blobName.trim() &&
            req.query.blobName.trim().length
        )) {
            res.status(400).send({
                status: "error",
                msg: "blobName is either missing or not correct"
            });
        } else {
            if (storageType === "azure") {
                var startDate = new Date();
                var expiryDate = new Date(startDate);
                // Create a SAS token that expires in an 5 min
                // Set start time to 1 minutes ago to avoid clock skew.
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
                let storageContainer;
                if (req.query.type === "invoice" || req.query.type === "import") {
                    storageContainer = container;
                } else if (req.query.type === "sampleinvoices") {
                    storageContainer = sampleInvoicesContainer;
                } else {
                    storageContainer = assetsContainer;
                }
                const blobService = azure.createBlobService(
                    account,
                    accountKey,
                    storageContainer
                );
                var token = blobService.generateSharedAccessSignature(
                    storageContainer,
                    req.query.blobName,
                    sharedAccessPolicy
                );
                res.status(200).send({
                    token: token,
                    config: {
                        account: account,
                        container: storageContainer
                    },
                    storageType: storageType
                });
            } else if (storageType === "aws") {
                const awsConfig = {
                    bucketName: config.cloudStorageAccount,
                    accessKeyId: config.cloudStorageAccessKeyId,
                    secretAccessKey: config.cloudStorageSecretAccessKey,
                    folderName: config.cloudStorageFolder,
                    region: config.cloudStorageRegion
                };
                res.status(200).send({
                    token: "need to send token",
                    config: awsConfig,
                    storageType: storageType
                });
            } else {
                res.status(200).send({
                    token: "1",
                    storageType: storageType
                });
            }
        }
    }

    /*
     * API to get absolute file paths for preprocesses images through the TAPP service.
     *
     * Resource types allowed  -> path can be set in .env , default path can be found in config
     *
     * 1. assets -> vendor logo
     * 2. import -> vendor invoices
     * 3. sampleinvoices -> sample invoice for the preprocessor/knowninvoice to find a format for preprocess/submit
     *
     * Resource used -> preprocessor
     *
     *  Following are the step performed in the API sequentially.
     * 1. Check the storage type & append the relative references in the url as needed to generate the absolute path
     */

    getBlobURL(req, res) {
        let apiParams = {
            id: "api.blobURL.get",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        let requestBody = req.body.request;
        let result = {};
        if (!(requestBody && typeof requestBody === "object")) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        if (
            storageType === "azure" &&
            requestBody.container &&
            requestBody.blobName
        ) {
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
                requestBody.container,
                requestBody.blobName,
                sharedAccessPolicy
            );
            // var sasUrl = blobService.getUrl(
            //   requestBody.container,
            //   requestBody.blobName,
            //   token
            // );

            var sasUrl =
                "https://" +
                account +
                ".blob.core.windows.net/" +
                requestBody.container +
                requestBody.blobName;

            if (sasUrl && sasUrl.length) {
                result.blobURL = sasUrl;
                return resUtil.OK(res, apiParams, result);
            } else {
                const errorResponse = {
                    status: 500,
                    err: "INTERNAL SERVER ERROR",
                    errmsg: "Could not generate URL"
                };
                return resUtil.handleError(req, res, errorResponse);
            }
        } else if (
            storageType === "aws" &&
            requestBody.container &&
            requestBody.blobName
        ) {
            // Do something - TODO
            result.blobURL = requestBody.blobName;
            return resUtil.OK(res, apiParams, result);
        } else if (storageType === "localblob" && requestBody.container) {
            const requestedContainer = requestBody.container ?
                requestBody.container :
                "preprocessor";
            // let relativePath = config.localPreprocessorBlobUrl;
            // let relativePath = JSON.parse(config.localSubFoldersAllowed).preprocessor;
            let relativePath = JSON.parse(config.localSubFoldersAllowed)[
                requestedContainer
            ];

            //if preprocessor starts with a '/', then start config for preproc with a '/'

            if (requestBody.fullPath && requestBody.fullPath[0] !== "/") {
                requestBody.fullPath = "/" + requestBody.fullPath;
            }

            let url = requestBody.fullPath.substring(
                relativePath ?
                    requestBody.fullPath.indexOf(relativePath) + relativePath.length :
                    0,
                requestBody.fullPath.length
            );

            // if (url[0] === "/") {
            //   url = url.substring(1, url.length);
            // }

            //container name
            result.blobURL =
                config.tappUIAPIHost +
                config.localStaticPath +
                "/" +
                requestedContainer +
                "/" +
                url;

            return resUtil.OK(res, apiParams, result);
        } else {
            return resUtil.BADREQUEST(res, apiParams, result);
        }
    }

    /*
     * API to upload files  when the storageType is "localblob" through the TAPP service.
     * Resource types allowed  -> path can be set in .env , default path can be found in config
     *
     * 1. assets -> vendor logo
     * 2. import -> vendor invoices
     * 3. sampleinvoices -> sample invoice for the preprocessor/knowninvoice to find a format for preprocess/submit
     *
     *  Following are the step performed in the API sequentially.
     * 1. Check if the resource type sent in request is allowed for storage. (allowed types are -> import, assets, sampleinvoices)
     * 2. Check if the path where the resource is asked to store exists, if not create it & store in the respective path.
     */

    uploadFile(req, res) {
        let folderType = req.url.split("/");
        folderType = folderType[folderType.length - 1];

        let paths = JSON.parse(config.localSubFoldersAllowed);
        let fileBlobLocation = config.localBlobStorage + paths[folderType];

        const apiParams = {
            id: "api.invoice.upload",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        let errorObject;

        async.waterfall([
            function (callback) {
                //VALIDATE FOLDER TYPE (imports/assets/sampleinvoices/preprocessor/downloads)
                let allowedFolderTypes = Object.keys(paths);
                if (!allowedFolderTypes.includes(folderType)) {
                    errorObject = {
                        status: 500,
                        err: "INTERNAL_SERVER_ERROR",
                        errmsg: "Error while uploading, storage destination not allowed"
                    };
                    callback(errorObject, null);
                }
                callback(null, true);
            },
            function (isValidFolderType, callback) {
                // VAIDATE FILEBLOBLOCATION && LOCALBLOBSTORAGE check exists or not
                if (!fs.existsSync(fileBlobLocation)) {
                    if (!fs.existsSync(localBlobStorage)) {
                        try {
                            fs.mkdirSync(localBlobStorage, { recursive: true });
                        } catch (err) {
                            errorObject = {
                                status: 500,
                                err: "INTERNAL_SERVER_ERROR",
                                errmsg: "Error while uploading, storage destination not available"
                            };
                            callback(errorObject, null)
                        }
                    }
                    if (!fs.existsSync(fileBlobLocation)) {
                        if (!fs.existsSync(fileBlobLocation)) {
                            try {
                                fs.mkdirSync(fileBlobLocation, { recursive: true });
                            } catch (err) {
                                errorObject = {
                                    status: 500,
                                    err: "INTERNAL_SERVER_ERROR",
                                    errmsg: "Error while uploading"
                                };
                                callback(errorObject, null)
                            }
                        }
                    }
                }
                callback(null, true)
            },
            function (isStorageAllowed, callback) {
                //VALIDATE file extension and file content-type is from allowedFileExtenstions && allowedContentTypes.

                let localStorage = multer.diskStorage({
                    destination: function (req, file, cb) {
                        cb(null, fileBlobLocation);
                    },
                    filename: function (req, file, cb) {
                        cb(null, file.originalname);
                    }
                });

                let upload = multer({
                    storage: localStorage,
                    fileFilter: (req, file, cb) => {
                        let allowedFileExtenstions = Object.keys(JSON.parse(config.localFileTypesAllowed));
                        let allowedContentTypes = Object.values(JSON.parse(config.localFileTypesAllowed));
                        let currentFileExt = file.originalname.substring(file.originalname.lastIndexOf('.') + 1, file.originalname.length)
                        let currentContentType = file.mimetype;

                        if (allowedFileExtenstions.includes(currentFileExt.toLowerCase()) && allowedContentTypes.includes(currentContentType)) {
                            cb(null, true);
                        }
                        else {
                            errorObject = {
                                status: 500,
                                err: "INTERNAL_SERVER_ERROR",
                                errmsg: "Error while uploading, Invalid File Extension or ContentType."
                            };
                            return cb(errorObject, false);
                        }
                    }
                }).single("file");

                upload(req, res, function (err) {
                    if (err instanceof multer.MulterError || err) {
                        callback(err, null);
                    }
                    else {
                        let fileObj = req.file;
                        callback(null, fileObj);
                    }
                })
            },
            function (isValidExtAndContentType, callback) {
                let result = isValidExtAndContentType;
                let url;
                if (folderType !== "assets") {
                    url = paths[folderType] + result.originalname;
                }
                else {
                    url = result.originalname;
                }
                result = { path: url };
                callback(null, result);
            },

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

    /*
     * API to download file from the url for pAIges application will be the server API
     * and the documentId needs to be passed as a post method from the UI - here we just need to get the server API port
     * and construct the full path for the download URL
     */
    downloadFileResult(req, res) {
        let apiParams = {
            id: "api.download.fileResult",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        let requestBody = req.body.request;

        if (!(requestBody && typeof requestBody === "object")) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        console.log(`Entered in downloadFileResult method at ${new Date().toUTCString()} with below requestBody`);
        console.log(requestBody);

        async.waterfall(
            [
                function (callback) {
                    const headers = {
                        'Authorization': config.authorizationKey
                    }
                    axios.post(config.downloadResultsAPI, { request: requestBody }, { headers })
                        .then(function (response) {
                            if (response && response.status == 200 && response.statusText == 'OK') {
                                callback(null, response.data)
                            } else {
                                console.log(`Got downloadFileResult API response at ${new Date().toUTCString()} when status is not 200`);
                                console.log(response);
                                callback(null, { status: 201, errmsg: 'Unable to download Result', err: response })
                            }
                        })
                        .catch(function (error) {
                            console.log(`Got below exception in downloadFileResult method at ${new Date().toUTCString()}`);
                            console.log(error);
                            callback({ status: 500, errmsg: 'Python_Server_Error', err: error }, null)
                        });
                }
            ],
            function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                } else if (!result) {
                    resUtil.BADREQUEST(res, apiParams, {});
                } else {
                    resUtil.OK(res, apiParams, result);
                }
            }
        );
    }

    /*
     * API to download original file uploaded in pAIges application for the extraction.
     * and the documentId is the required input   
     */
    downloadOriginalFile(req, res) {
        let apiParams = {
            id: "api.download.originalFile",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        let requestBody = req.body.request;

        if (!(requestBody && typeof requestBody === "object")) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        console.log(`Entered in downloadOriginalFile method at ${new Date().toUTCString()} with below requestBody`);
        console.log(requestBody);

        async.waterfall(
            [
                async function (callback) {
                    try {
                        const headers = {
                            'Authorization': config.authorizationKey
                        }
                        let response = await axios.post(config.downloadOriginalFileAPI, { request: requestBody }, { headers })

                        if (response && response.status == 200 && response.statusText == 'OK') {
                            return (null, response.data)
                        } else {
                            console.log(`Got downloadOriginalFile API response at ${new Date().toUTCString()} when status is not 200`);
                            console.log(response);
                            return (null, { status: 201, errmsg: 'Unable to download original File', err: response })
                        }
                    } catch (error) {
                        console.log(`Got below exception in downloadOriginalFile method at ${new Date().toUTCString()}`);
                        console.log(error);
                        return ({ status: 500, errmsg: 'Python_Server_Error', err: error }, null)
                    }
                }
            ],
            function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                } else if (!result) {
                    resUtil.BADREQUEST(res, apiParams, {});
                } else {
                    resUtil.OK(res, apiParams, result);
                }
            }
        );
    }

    /*
     * API to download all list view file results
     */
    downloadListViewFilesData(req, res) {
        let apiParams = {
            id: "api.download.ListViewFilesData",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        let requestBody = req.body.request;

        if (!(requestBody && typeof requestBody === "object")) {
            apiParams.err = "Invalid Request";
            return resUtil.BADREQUEST(res, apiParams, {});
        }

        console.log(`Entered in downloadListViewFilesData method at ${new Date().toUTCString()} with below requestBody`);
        console.log(req.body);

        async.waterfall(
            [
                async function (callback) {
                    try {
                        let response = await axios.post(config.downloadListViewFilesAPI, {
                            request: requestBody,
                            time_zone: req.body.time_zone
                        })

                        if (response && response.status == 200 && response.statusText == 'OK') {
                            return (null, response.data)
                        } else {
                            console.log(`Got downloadListViewFilesData API response at ${new Date().toUTCString()} when status is not 200`);
                            console.log(response);
                            return (null, { status: 201, errmsg: 'Unable to download ListView Files', err: response })
                        }
                    } catch (error) {
                        console.log(`Got below exception in downloadListViewFilesData method at ${new Date().toUTCString()}`);
                        console.log(error);
                        return ({ status: 500, errmsg: 'Python_Server_Error', err: error }, null)
                    }
                }
            ],
            function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                } else if (!result) {
                    resUtil.BADREQUEST(res, apiParams, {});
                } else {
                    resUtil.OK(res, apiParams, result);
                }
            }
        );
    }
}

module.exports = new StorageService(config);
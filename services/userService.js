const _ = require("lodash");
const async = require("async");
const config = require("../config");
const dbutil = require("../util/db");
const util = require("../util/util");
const resUtil = require("../util/resUtil");
const validator = require("../util/validatorUtil");
const crypto = require("crypto-js");
const uuid = require("uuid");
const moment = require("moment");
const replaceall = require("replaceall");
const ObjectId = require('mongodb').ObjectId;

const db = dbutil.getDatabase(config.mongoDBName);
const userCollection = db.collection("users");
const roleCollection = db.collection("roles");
const userVendorMapCollection = db.collection("UserVendorMap");

// const tokenCollection = db.collection("tokens");
const logger = require("../logger/logger");
const tokenService = require("./tokenService");
const emailService = require("./emailService");
const sharedService = require("./sharedService");

class UserService {
    constructor(config) {
        this.config = config;
    }

    /*
     * API to add a new role to the db. Following are the step performed in the API sequentially.
     * 1. Validate the request.
     * 2. Validate token sent in request if role is only admin
     * 3. check for duplicate roles
     * 4. add role if not exists in db
     */
    addRole(req, res) {
        let reqData = req.body.request;
        let token = req.body.request.token;

        const that = this;
        const apiParams = {
            id: "api.role.add",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            req.body &&
            req.body.request &&
            req.body.request.token &&
            req.body.request &&
            typeof req.body.request == "object"
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "addRole", callback);
                },
                function (validateResponse, callback) {
                    tokenService.validateToken(token, function (err, doc) {
                        if (doc && doc.role == "admin") {
                            callback(null, true);
                        } else {
                            callback({
                                status: 403,
                                err: "UNAUTHORIZED",
                                errmsg: "Unauthorized, you need to be an admin for this action"
                            },
                                null
                            );
                        }
                    });
                },
                function (isAdminRes, callback) {
                    that.checkRoleDuplicacy(reqData.role, callback);
                },
                function (userDuplicateRes, callback) {
                    delete reqData.token;
                    reqData.createdOn = util.generateTimestamp();

                    roleCollection.insertOne(reqData, function (err1, doc1) {
                        if (doc1 && doc1.ops && doc1.ops.length)
                            util.handleServerError(err1, doc1.ops[0], callback);
                        else util.handleServerError(err1, null, callback);
                    });
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
                result.Message = "Role Added successfully";
                resUtil.OK(res, apiParams, result);
                return;
            }
        );
    }
    /*
     * API to get all the roles. Following are the step performed in the API sequentially.
     * 1. Validate the request.
     * 2. Validate token sent in request if role is admin/clientadmin
     * 3. return allowed roles to the admin/clientadmin
     */
    getRoles(req, res) {
        let reqData = req.body.request;
        let token = req.body.request.token;

        const that = this;
        const apiParams = {
            id: "api.role.getAll",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            req.body &&
            req.body.request &&
            req.body.request.token &&
            req.body.request &&
            typeof req.body.request == "object"
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        async.waterfall(
            [
                function (callback) {
                    validator.validate(reqData, "getRole", callback);
                },
                function (validateResponse, callback) {
                    tokenService.validateToken(token, function (err, data) {
                        if (data) {
                            callback(null, data);
                        } else {
                            callback({
                                status: 403,
                                err: "UNAUTHORIZED",
                                errmsg: "Unauthorized, You are not authorized."
                            },
                                null
                            );
                        }
                    });
                },
                function (isAdminRes, callback) {

                    roleCollection.find({}).toArray(function (err1, docs) {
                        if (docs) {
                            if (docs && docs.length) {
                                if (isAdminRes.role === 'admin' && config.ALL_ROLES_VISIBILITY_FOR_ADMIN == 0) {
                                    if (config.VIEWER_ROLE_VISIBILITY == 0) {
                                        docs = docs.filter((currentDoc) => {
                                            return currentDoc.role !== 'clientadmin' && currentDoc.role !== 'viewer'
                                        })
                                    }
                                    else {
                                        docs = docs.filter((currentDoc) => {
                                            return currentDoc.role !== 'admin'
                                        })
                                    }
                                }
                                else if (isAdminRes.role === 'clientadmin') {
                                    if (config.VIEWER_ROLE_VISIBILITY == 0) {
                                        docs = docs.filter((currentDoc) => {
                                            return currentDoc.role !== 'admin' && currentDoc.role !== 'viewer'
                                        })
                                    }
                                    else {
                                        docs = docs.filter((currentDoc) => {
                                            return currentDoc.role !== 'admin'
                                        })
                                    }
                                }
                                else if (isAdminRes.role !== 'clientadmin' && isAdminRes.role !== 'admin') {
                                    docs = docs.filter((currentDoc) => {
                                        return currentDoc.role == isAdminRes.role
                                    })
                                }
                                callback(null, docs);
                            } else {
                                resUtil.NOTFOUND(res, apiParams, { status: 201, msg: 'No Roles defined' });
                            }
                        } else {
                            callback({
                                status: 500,
                                err: "INTERNAL_SERVER_ERROR",
                                errmsg: "Error while finding user"
                            },
                                null
                            );
                        }
                    });
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
     * API to add a new user through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request.
     * 2. Validate token sent in request if role is admin/clientadmin
     * 3. Check if user already exists before adding it, duplicate entry
     * 4. Insert the new user data & return the result
     */
    addUser(req, res) {
        let encryptedDetails = req.body.request.userDetails;

        const reqBody = sharedService.decryptPayload(encryptedDetails);
        let userRole = reqBody.userRole;
        let token = reqBody.token;

        const that = this;
        const apiParams = {
            id: "api.user.add",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            req.body &&
            req.body.request &&
            req.body.request.userDetails
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        async.waterfall(
            [
                function (callback) {
                    tokenService.validateToken(token, function (err, data) {
                        let validRoles = [];
                        if (data && data.role == "admin") {
                            validRoles = ["admin", "clientadmin", "viewer", "reviewer", "bot", "approver"];
                            callback(null, validRoles);
                        }
                        else if (data && data.role == "clientadmin") {
                            validRoles = ["clientadmin", "viewer", "reviewer", "bot", "approver"];
                            callback(null, validRoles);
                        }
                        else {
                            callback({
                                status: 403,
                                err: "UNAUTHORIZED",
                                errmsg: "Unauthorized, You are not allowed to create user."
                            },
                                null
                            );
                        }
                    });
                },
                function (isTokenRes, callback) {
                    roleCollection.findOne({ _id: ObjectId(userRole) }, function (err, roleObj) {
                        if (roleObj) {
                            if (isTokenRes.includes(roleObj.role)) {
                                callback(null, true)
                            }
                            else {
                                callback(err, false)
                            }
                        } else {
                            callback(err, null)
                        }
                    });
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

                //encryptResponse
                result = { "CanProceed": true }
                result = sharedService.encryptPayload(result);

                resUtil.OK(res, apiParams, result);
                return;
            }
        );
    }
    /*
     * API to add a new user through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request.
     * 2. Validate token sent in request if role is admin
     * 3. Allow further only if role is admin
     * 4. Delete the document metadata & document result for the documentId
     */
    deleteUser(req, res) {
        let newUserData = req.body.request.user;
        let token = req.body.request.token;
        newUserData.emailId = sharedService.encrypt(newUserData.emailId);

        const that = this;
        const apiParams = {
            id: "api.user.delete",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            req.body &&
            req.body.request &&
            req.body.request.token &&
            req.body.request.user &&
            typeof req.body.request.user == "object"
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        async.waterfall(
            [
                function (callback) {
                    validator.validate(newUserData, "deleteUser", callback);
                },
                // function(validationResponse, callback) {
                //     tokenService.validateToken(token, function(err, doc) {
                //         if (doc && doc.role == "admin") {
                //             callback(null, true);
                //         } else {
                //             callback({
                //                     status: 403,
                //                     err: "UNAUTHORIZED",
                //                     errmsg: "Unauthorized, you need to be an admin for this action"
                //                 },
                //                 null
                //             );
                //         }
                //     });
                // },
                function (isAdminRes, callback) {
                    // delete user
                    //userCollection.findOneAndDelete(newUserData, function(err, result) {
                    userCollection.updateOne({ userId: newUserData.userId }, { $set: { isActive: false } }, function (err, result) {
                        //let response;
                        // if (result["lastErrorObject"]["n"]) {
                        //     response = newUserData;
                        //     that.deleteVendorMapping(newUserData.userId);
                        // } else {
                        //     response = {};
                        // }
                        // let errObject;
                        // if (err) {
                        //     errObject = {
                        //         status: 500,
                        //         err: "INTERNAL_SERVER_ERROR",
                        //         errmsg: "Error while deleting user"
                        //     };
                        // }

                        // util.handleServerError(
                        //     errObject,
                        //     result["lastErrorObject"]["n"],
                        //     callback
                        // );

                        callback(err, result);
                    });
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
     * API to add a new user through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request.
     * 2. Validate token sent in request if role is admin
     * 3. Allow further only if role is admin
     */
    manageUser(req, res) {
        let newUserData = req.body.request.user;
        const apiParams = {
            id: "api.user.manageUser",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            req.body &&
            req.body.request &&
            req.body.request.reqFor &&
            req.body.request.user &&
            typeof req.body.request.user == "object"
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        newUserData.emailId = sharedService.encrypt(newUserData.emailId)
        let data;
        switch (req.body.request.reqFor) {
            case 'delete':
                data = { isActive: false }
                break;
            case 'activate':
                data = { isActive: true }
                break;
            case 'deactivate':
                data = { isActive: false }
                break;
            default:
                break;
        }
        async.waterfall(
            [
                function (callback) {
                    validator.validate(newUserData, "deleteUser", callback);
                },

                function (isAdminRes, callback) {
                    // delete,activate,decativate user
                    userCollection.updateOne({ userId: newUserData.userId }, { $set: data }, function (err, result) {
                        callback(err, result);
                    });
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
     * API to add a new user through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate token sent in request if role is admin
     * 2. Allow further only if role is admin
     * 3. Update the document after filtering by given filter parameter
     */
    updateUserDetails(req, res) {
        const apiParams = {
            id: "api.user.update",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        req.body.request = sharedService.decryptPayload(req.body.request);

        if (!(
            req.body &&
            req.body.request &&
            req.body.request.token &&
            req.body.request.user &&
            typeof req.body.request.user == "object"
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            let newUserData = req.body.request.user;
            // delete newUserData.password;
            const token = req.body.request.token;
            const that = this;

            async.waterfall(
                [
                    function (callback) {
                        tokenService.validateToken(token, function (err, doc) {
                            callback(null, true);
                        });
                    },
                    function (isTokenRes, callback) {
                        if (that.checkForTagsValidation(newUserData)) {
                            callback({
                                status: 403,
                                err: "INTERNAL_SERVER_ERROR",
                                errmsg: "Invalid data in ceratin fields"
                            },
                                null
                            );
                        } else {
                            // callback(null, true) commented by gaurav
                            if (isTokenRes.role !== 'admin') {
                                if (that.checkEmailIdDomain(newUserData.emailId)) {
                                    callback({
                                        status: 403,
                                        err: "UNAUTHORIZED",
                                        errmsg: "Unauthorized, Please provide your corporate EmailId."
                                    },
                                        null
                                    );
                                } else {
                                    callback(null, true)
                                }
                            } else {
                                callback(null, true)
                            }
                        }
                    },
                    function (isValidData, callback) {
                        if (newUserData.userName && newUserData.emailId) {
                            let userdomain = (newUserData.emailId.split('@')[1]);
                            userdomain = sharedService.encrypt(userdomain);
                            newUserData.userdomain = userdomain;

                            newUserData.userName = sharedService.encrypt(newUserData.userName);
                            newUserData.emailId = sharedService.encrypt(newUserData.emailId);
                        }
                        roleCollection.findOne({ _id: ObjectId(newUserData.role) }, function (err, userRoleObj) {
                            if (userRoleObj) {
                                //newUserData.role = userRoleObj._id;
                                callback(null, {})
                            } else {
                                callback(err, null)
                            }
                        });
                    },
                    function (isValidRole, callback) {
                        //TODO for KGS to remove the documentType if role is being changed from reviewer to anything else
                        if ((Number(config.DOCTYPES_VISIBILITY) == 1) &&
                            newUserData.deleteDocumentType &&
                            newUserData.deleteDocumentType == "Yes") {
                            userCollection.findOneAndUpdate(
                                { userId: newUserData.userId },
                                {
                                    $unset: { documentType: 1 },
                                    $set: { documentTypeRemovedAt: util.generateTimestamp() }
                                },
                                function (err, updatedResult) {
                                    callback(err, updatedResult)
                                }
                            );
                        }
                        else {
                            callback(null, isValidRole);
                        }
                    },
                    function (docTypeCheckRes, callback) {
                        const filter = {
                            userId: newUserData.userId
                        };
                        if (newUserData.deleteDocumentType) {
                            delete newUserData.deleteDocumentType;
                        }
                        dbutil.updateInDB(userCollection, filter, newUserData, callback);
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
    }

    /* updated by Kanak
     * API for user login through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Check the user credentials combination
     * 3. Update the user last login after credentials match found
     * 4. Create a fresh token for the user logged in & return the response
     */
    userLogin(req, res) {
        const apiParams = {
            userId: "api.user.login",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        const reqBody = sharedService.decryptPayload(req.body.request);
        console.log(`Entered in userLogin Service with below credentials at:-  ${new Date()}`);
        console.log(reqBody);

        if (!(
            req.body &&
            req.body.request &&
            typeof reqBody == "object" &&
            reqBody.emailId &&
            reqBody.password
        )) {
            apiParams.err = "Invalid Request";
            console.log(`Returned from userLogin Service becoz of Invalid Request at:-  ${new Date()}`);
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        reqBody.emailId = sharedService.encrypt(reqBody.emailId);

        const that = this;

        async.waterfall(
            [
                function (callback) {
                    that.checkUserCredentials(reqBody, callback);
                },
                function (user, callback) {
                    const filter = {
                        emailId: reqBody.emailId
                    };
                    const data = {
                        lastLogin: util.generateTimestamp()
                    };

                    // that.updateUser(filter, data, callback);
                    dbutil.updateInDB(userCollection, filter, data, callback, "LogIn");
                },
                function (doc, callback) {
                    roleCollection.findOne({ _id: ObjectId(doc.role) }, function (err, result) {
                        if (err) {
                            console.log(`Got error in userLogin service when finding data for ${doc.emailId} from roles collection at ${new Date()}`)
                            console.log(err);
                            resUtil.handleError(req, res, err);
                            return;
                        } else if (!result) {
                            console.log(`Got no result in userLogin service when finding data for ${doc.emailId} from roles collection at ${new Date()}`)
                            resUtil.BADREQUEST(res, apiParams, {});
                            return;
                        } else {
                            doc.role = result.role
                            doc["RoutesAccess"] = result.RoutesAccess
                            tokenService.createToken(doc, callback);
                        }
                    });
                },
            ],
            function (err, result) {
                if (err && err.status == 401 && err.err == 'UNAUTHORIZED') {
                    resUtil.UNAUTHORIZED(res, apiParams, err);
                    return;
                } else if (err && err.status == 404) {
                    resUtil.NOTFOUND(res, apiParams, { status: 404, err: 'NOTFOUND', errmsg: 'Invalid Email or Password' });
                    return;
                } else if (err && err.status == 500) {
                    resUtil.handleError(req, res, err);
                    return;
                } else if (!result) {
                    resUtil.NOTFOUND(res, apiParams, {});
                    return;
                } else {
                    // delete result.password;

                    result.emailId = sharedService.decrypt(result.emailId);
                    result.userName = sharedService.decrypt(result.userName);
                    result.userdomain = sharedService.decrypt(result.userdomain);
                    result.UserSettings = sharedService.encryptPayload(that.getCommonUserSettings().PROPERTIES);

                    console.log(`Exited from userLogin Service as User logged in successfully with emailId ${result.emailId} at ${new Date()} `)
                    resUtil.OK(res, apiParams, result);
                    return;
                }
            }
        );
    }

    /* written by Kanak
     * API for user signup through the pAiges UI. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Check the email already exists or not
     * 3. If not then save user record
     * 4. Then send the email for verification
     */
    userSignup(req, res) {
        const apiParams = { userId: "api.user.signup" };
        let encryptedDetails = req.body.userDetails;
        const reqBody = sharedService.decryptPayload(encryptedDetails);

        req.body.userDetails = reqBody;

        console.log(reqBody);

        if (!(
            req.body &&
            req.body.userDetails &&
            typeof reqBody == "object" &&
            reqBody.userName &&
            reqBody.emailId &&
            reqBody.password &&
            reqBody.role
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }
        let newUserData = reqBody;
        const thisRef = this;
        let message;
        let encryptedEmailId = sharedService.encrypt(newUserData.emailId);
        newUserData.userName = sharedService.encrypt(newUserData.userName)
        newUserData.emailId = newUserData.emailId;

        async.waterfall(
            [
                function (callback) {
                    validator.validate(newUserData, "addUser", callback);
                },
                function (isAdminRes, callback) {
                    // thisRef.userDuplicate(encryptedEmailId, callback); // commented by Gaurav
                    if (isAdminRes.role !== 'admin') {
                        if (thisRef.checkEmailIdDomain(newUserData.emailId)) {
                            callback({
                                status: 403,
                                err: "UNAUTHORIZED",
                                errmsg: "Unauthorized, Please provide your corporate EmailId."
                            },
                                null
                            );
                        } else {
                            thisRef.userDuplicate(encryptedEmailId, callback);
                        }
                    } else {
                        thisRef.userDuplicate(encryptedEmailId, callback);
                    }
                },
                function (isDuplicate, callback) {
                    if (newUserData.userCreatedBy !== 'self' && reqBody.token) { // expect this should be true from user-settings
                        tokenService.validateToken(reqBody.token, function (err, data) {
                            let validRoles = [];
                            if (data && data.role == "admin") {
                                validRoles = ["admin", "clientadmin", "viewer", "reviewer", "bot", "approver"];
                                callback(null, validRoles);
                            }
                            else if (data && data.role == "clientadmin") {
                                validRoles = ["clientadmin", "viewer", "reviewer", "bot", "approver"];
                                callback(null, validRoles);

                                // TODO validate domain as well for client admin
                            }
                            else {
                                callback({
                                    status: 403,
                                    err: "UNAUTHORIZED",
                                    errmsg: "Unauthorized, You are not allowed to create user."
                                },
                                    null
                                );
                            }
                        });
                    }
                    else { // when called from outside registration-page/third party
                        callback(null, null)
                    }
                },
                function (isTokenRes, callback) {
                    if (isTokenRes) { // expect this should be true from user-settings
                        roleCollection.findOne({ _id: ObjectId(reqBody.role) }, function (err, roleObj) {
                            if (roleObj) {
                                if (isTokenRes.includes(roleObj.role)) {
                                    callback(null, true)
                                }
                                else {
                                    callback(err, false)
                                }
                            } else {
                                callback(err, null)
                            }
                        });
                    }
                    else {// when called from outside registration-page/third party
                        callback(null, null)
                    }
                },
                function (isAuthenticated, callback) {
                    if (newUserData.userCreatedBy === 'self' && newUserData.role === 'viewer') {
                        roleCollection.findOne({ role: newUserData.role }, function (err, userRoleObj) {
                            if (userRoleObj) {
                                newUserData.role = userRoleObj._id;
                                callback(null, {})
                            } else {
                                callback(err, null)
                            }
                        });
                    }
                    else if (isAuthenticated) {// called from user-settings
                        let id = ObjectId(newUserData.role);
                        roleCollection.findOne({ _id: id }, function (err, userRoleObj) {
                            if (userRoleObj) {
                                //newUserData.role = userRoleObj._id;
                                callback(null, {})
                            } else {
                                callback(err, null)
                            }
                        });
                    }
                    else {
                        callback({
                            status: 403,
                            err: "UNAUTHORIZED",
                            errmsg: "Unauthorized, You are not allowed to create user."
                        },
                            null
                        );
                    }
                },
                function (findRoleId, callback) {
                    //TODO generate verificationToken and add remove from the frontend
                    //! must do
                    let verificationToken = uuid.v4();
                    newUserData["verificationToken"] = verificationToken;
                    req.body.userDetails.message = thisRef.signUpTemplate(verificationToken, sharedService.decrypt(newUserData.userName));
                    emailService.sendEmail(req, res, callback, apiParams, {}, 'Signup | Verification')
                },
                function (isMailSent, callback) {
                    newUserData.userId = replaceall("-", "", uuid.v4());
                    newUserData.emailVerified = false;
                    newUserData.createdOn = util.generateTimestamp();
                    newUserData.lastLogin = util.generateTimestamp();
                    newUserData["isActive"] = true;

                    if (isMailSent.Details == 'Success') {
                        if (newUserData.message && newUserData.emailId) {
                            let userdomain = (newUserData.emailId.split('@')[1]);
                            userdomain = sharedService.encrypt(userdomain);
                            newUserData.userdomain = userdomain;
                            message = newUserData.message;
                            delete newUserData.message;
                            newUserData.emailId = encryptedEmailId;
                        }
                        userCollection.insertOne(newUserData, function (err1, doc1) {
                            if (doc1 && doc1.ops && doc1.ops.length) {
                                doc1.ops[0].Message = isMailSent.Message;
                                doc1.ops[0].Details = isMailSent.Details;
                                util.handleServerError(err1, doc1.ops[0], callback);
                            } else util.handleServerError(err1, null, callback);
                        });
                    } else if (isMailSent.status == 201) {
                        resUtil.ERROR(res, apiParams, { status: 201, msg: 'Email could not be sent.' })
                        return;
                    }
                }
            ],
            function (err, result) {
                if (err) {
                    resUtil.NOTALLOWED(res, apiParams, err);
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

    /* by kanak
     * API to check given data exists or not in the Users table. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Find the user by userId & return the response
     */
    isDataExists(req, res) {
        let reqQuery = req.query;

        if (!(reqQuery && typeof reqQuery)) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            userCollection.findOne(reqQuery, function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                } else if (!result) {
                    resUtil.BADREQUEST(res, reqQuery, {});
                    return;
                } else {
                    let resultModified = JSON.parse(JSON.stringify(result));
                    if (result.company && result.designation && result.phone) {
                        resUtil.OK(res, reqQuery, "YES");
                        return;
                    } else {
                        resUtil.OK(res, reqQuery, "NO");
                        return;
                    }
                }
            });
        }
    }

    /* by kanak
     * API to verify User on basis of the link provided during signup. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Validate the request verification token matches with saved token & return the response
     * 3. If matched, then set emailVerified to true.
     */
    validateVerificationToken(req, res) {
        let reqQuery = req.query;

        if (!(reqQuery && typeof reqQuery)) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            userCollection.findOne(reqQuery, function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                } else if (!result) {
                    resUtil.NOTFOUND(res, reqQuery, { status: 400, msg: "Invalid Token" });
                    return;
                } else {
                    //let resultModified = JSON.parse(JSON.stringify(result));
                    if (reqQuery.verificationToken === result.verificationToken && !result.emailVerified) {
                        userCollection.updateOne({ verificationToken: result.verificationToken }, { $set: { emailVerified: true } })
                        resUtil.OK(res, reqQuery, { status: 200, msg: 'Token Verified successfully' });
                        return;
                    } else if (reqQuery.verificationToken === result.verificationToken && result.emailVerified) {
                        resUtil.OK(res, reqQuery, { status: 202, msg: 'Token Already Verified' });
                        return;
                    } else {
                        resUtil.OK(res, reqQuery, { status: 201, msg: 'Token Mismatch' });
                        return;
                    }
                }
            });
        }
    }

    /* by gaurav
     * API to reset the password on basis of the link provided during reset password. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Validate the request verification token matches with saved token & return the response
     * 3. If matched, then update users password.
     */
    resetPassword(req, res) {
        const apiParams = {
            userId: "api.user.password.reset",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        const reqBody = req.body.request;

        if (!(
            req.body &&
            req.body.request &&
            typeof reqBody == "object" &&
            reqBody.token &&
            reqBody.password
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            userCollection.findOne({
                verificationToken: reqBody.token
            }, function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                } else if (!result) {
                    resUtil.NOTFOUND(res, apiParams, { status: 400, msg: "Invalid Token" });
                    return;
                } else {
                    let resultModified = JSON.parse(JSON.stringify(result));
                    if (result.password == reqBody.password) {
                        resUtil.OK(res, apiParams, { status: 400, msg: 'New password cannot equal to old password' });
                        return;
                    }
                    else if (result.emailId) {
                        userCollection.updateOne({ verificationToken: reqBody.token }, { $set: { password: reqBody.password } })
                        resUtil.OK(res, apiParams, { status: 200, msg: 'Password updated successfully' });
                        return;
                    } else {
                        resUtil.OK(res, apiParams, { status: 201, msg: 'No User Found' });
                        return;
                    }
                }
            });
        }
    }

    /* by gaurav
     * API for forgot password to send the password reset instructions on the email id. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Validate the given emailId exists in the mongodb users collection or not
     * 3. If exists, then send password reset instructions.
     */
    forgotPassword(req, res) {
        const apiParams = {
            userId: "api.user.password.forgot",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        const reqBody = req.body.userDetails;
        const that = this;

        if (!(
            req.body &&
            req.body.userDetails &&
            typeof reqBody == "object" &&
            reqBody.emailId
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            // userCollection.find({ emailId: reqBody.emailId }).sort({ emailId: -1 }).limit(1)
            //     .toArray(function(err, docs) {
            //         if (docs) {
            //             if (docs && docs.length && docs[0].emailId) {

            //                 let htmlContent = that.createForgotPasswordTemplate(docs[0], req);
            //                 req.body.userDetails.message = htmlContent;
            //                 emailService.sendEmail(req, res, apiParams, docs[0], 'Forgot Password');

            //             } else {
            //                 resUtil.NOTFOUND(res, apiParams, { status: 201, msg: 'No User Found' });
            //             }
            //         } else {
            //             callback({
            //                     status: 500,
            //                     err: "INTERNAL_SERVER_ERROR",
            //                     errmsg: "Error while finding user"
            //                 },
            //                 null
            //             );
            //         }
            //     });

            reqBody.emailId = sharedService.encrypt(reqBody.emailId);

            async.waterfall(
                [
                    function (callback) {
                        userCollection.find({ emailId: reqBody.emailId }).sort({ emailId: -1 }).limit(1)
                            .toArray(function (err, docs) {
                                if (docs) {
                                    if (docs && docs.length && docs[0].emailId) {
                                        callback(null, docs);
                                    } else {
                                        resUtil.NOTFOUND(res, apiParams, { status: 201, msg: 'No User Found' });
                                    }
                                } else {
                                    callback({
                                        status: 500,
                                        err: "INTERNAL_SERVER_ERROR",
                                        errmsg: "Error while finding user"
                                    },
                                        null
                                    );
                                }
                            });
                    },
                    function (docs, callback) {
                        let htmlContent = that.createForgotPasswordTemplate(docs[0], req);
                        req.body.userDetails.message = htmlContent;
                        req.body.userDetails.emailId = sharedService.decrypt(req.body.userDetails.emailId);
                        //req.body.userDetails.emailId = req.body.userDetails.emailId;
                        emailService.sendEmail(req, res, callback, apiParams, docs[0], 'Forgot Password');
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
                                errmsg: "Error while finding user"
                            })
                            return;
                        }
                    }
                ]

            );
        }
    }

    /* Written by Gaurav
        API to get delete Reason Options
    */
    getReasonOptions(req, res) {
        let apiParams = {
            id: "api.user.ReasonOptions",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        let result = {};
        result.reasonOptions = JSON.parse(config.deleteReasonOptions);
        return resUtil.OK(res, apiParams, result);
    }
    
    /*
    API to get assign Reason Options
    */
   getReassignReasons(req, res) {
        let apiParams = {
            id: "api.user.ReassignReasonOptions",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        let result = {};
        result.reasonOptions = JSON.parse(config.reassignReasonOptions);
        return resUtil.OK(res, apiParams, result);
    }

    /* Written by Kanak
        API to get the common user settings
    */
    getUserSettings(req, res) {
        let apiParams = {
            id: "api.user.getUserSettings",
            msgid: req.body.params ? req.body.params.msgid : ""
        };
        let result = { UserSettings: {} };
        result.UserSettings = sharedService.encryptPayload(this.getCommonUserSettings().PROPERTIES);
        return resUtil.OK(res, apiParams, result);
    }

    /*
     * API for user login through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Delete the access token passed in the request & return the response
     */
    userLogout(req, res) {
        const apiParams = {
            userId: "api.user.logout",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        const reqBody = req.body.request;

        console.log(`Entered in userLogout service with below credentials at ${new Date()}`);
        console.log(reqBody);

        if (!(
            req.body &&
            req.body.request &&
            typeof reqBody == "object" &&
            reqBody.emailId &&
            reqBody.token
        )) {
            apiParams.err = "Invalid Request";
            console.log(`Exited from userLogout service becoz of Invalid Request at ${new Date()}`);
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        const that = this;

        tokenService
            .deleteToken(reqBody.token)
            .then(response => {
                console.log(`User ${reqBody.emailId} logged out successfully at:- ${new Date()}`);
                resUtil.OK(res, apiParams, {
                    message: "Logged out successfully"
                });
            })
            .catch(err => {
                console.log(`User ${reqBody.emailId} tried to logged out at:- ${new Date()} but fails because :- `);
                console.log(err);
                resUtil.handleError(req, res, {
                    status: 500,
                    err: "SERVER_ERROR",
                    errmsg: "error while logging you out"
                });
            });
    }

    /*
     * API for user login through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Validate the token & check if role is defined
     * 3. Update the password in DB
     */
    changePassword(req, res) {
        const apiParams = {
            userId: "api.user.password.change",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        const reqBody = sharedService.decryptPayload(req.body.request);
        const that = this;

        if (!(
            req.body &&
            req.body.request &&
            typeof reqBody == "object" &&
            reqBody.token &&
            reqBody.user &&
            typeof reqBody.user === "object" &&
            reqBody.user.emailId &&
            reqBody.user.password &&
            reqBody.user.oldPassword
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            async.waterfall(
                [
                    function (callback) {
                        tokenService.validateToken(reqBody.token, function (err, doc) {
                            if (doc && doc.role) {
                                callback(null, true);
                            } else {
                                callback(null, {
                                    status: 403,
                                    err: "UNAUTHORIZED",
                                    errmsg: "Unauthorized, Something went wrong."
                                });
                            }
                        });
                    },
                    function (resTokenResponse, callback) {
                        reqBody.user.emailId = sharedService.encrypt(reqBody.user.emailId);
                        if (reqBody.user.oldPassword == reqBody.user.password) {
                            callback(null, {
                                status: 400,
                                err: "Bad Request",
                                errmsg: "New password cannot equal to old password"
                            });
                        } else {
                            const filter = {
                                emailId: reqBody.user.emailId,
                                password: reqBody.user.oldPassword
                            };
                            dbutil.updateInDB(userCollection, filter, reqBody.user, callback);
                        }
                    }
                ],
                function (err, result) {
                    if (err) {
                        resUtil.handleError(req, res, err);
                        return;
                    } else if (!result) {
                        resUtil.NOTFOUND(res, apiParams, {});
                        return;
                    } else {
                        let response;
                        if (result.role) {
                            response = { msg: "Password changed successfully" }
                        }
                        else {
                            response = result;
                        }
                        resUtil.OK(res, apiParams, response);
                        return;
                    }
                }
            );
        }
    }

    /*
     * API to get user details by userId through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Find the user by userId & return the response
     */
    getUserDetails(req, res) {
        // const reqParams = req.params;
        let reqQuery = req.query;
        const apiParams = {
            userId: "api.user.get",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(req.body && reqQuery && typeof reqQuery)) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            if (reqQuery.userId) reqQuery.userId = parseInt(reqQuery.userId);
            userCollection.findOne({ userId: req.headers.userid }, function (err, result) {
                if (err) {
                    resUtil.handleError(req, res, err);
                    return;
                } else if (!result) {
                    resUtil.BADREQUEST(res, reqQuery, {});
                    return;
                } else {
                    let resultModified = JSON.parse(JSON.stringify(result));
                    delete resultModified._id;
                    delete resultModified.password;

                    resultModified.emailId = sharedService.decrypt(resultModified.emailId);
                    resultModified.userName = sharedService.decrypt(resultModified.userName);

                    resUtil.OK(res, reqQuery, resultModified);
                    return;
                }
            });
        }
    }

    /*
     * API to get user details by userId through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Validate the token sent in the request
     * 3. If token role is admin, only then send the user list ,else unauthorized to get the list
     */
    getUserList(req, res) {
        const reqBody = req.body;
        const apiParams = {
            userId: "api.user.list",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            req.body &&
            reqBody &&
            reqBody.request &&
            typeof reqBody.request === "object" &&
            reqBody.request.token
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            const that = this;
            async.waterfall(
                [
                    function (callback) {
                        tokenService.validateToken(reqBody.request.token, function (
                            err,
                            doc
                        ) {
                            if (doc && (doc.role == "admin" || doc.role == "clientadmin")) {
                                callback(null, doc);
                            } else {
                                callback({
                                    status: 403,
                                    err: "UNAUTHORIZED",
                                    errmsg: "Unauthorized, you need to be an admin for this action"
                                },
                                    null
                                );
                            }
                        });
                    },
                    function (tokenValidatorResponse, callback) {
                        roleCollection.findOne({ role: 'admin' }, function (err, roleObj) {
                            if (roleObj) {
                                callback(null, tokenValidatorResponse, roleObj)
                            } else {
                                callback(err, null)
                            }
                        });
                    },
                    function (tokenValidatorResponse, rolesResponse, callback) {
                        if (tokenValidatorResponse.role == 'clientadmin') {
                            let useremail = reqBody.request.emailId;
                            let userdomain = (useremail.split('@')[1]);
                            userdomain = sharedService.encrypt(userdomain);
                            reqBody.request.filter = { role: { $ne: (rolesResponse._id).toString() }, userdomain: userdomain }
                        }
                        that.findUsers(reqBody.request, callback);
                    }
                ],
                function (err, result) {
                    if (err) {
                        resUtil.handleError(req, res, err);
                    } else if (!result) {
                        resUtil.BADREQUEST(res, apiParams, {});
                    } else {
                        result.documents.forEach(element => {
                            element.userName = sharedService.decrypt(element.userName);
                            element.emailId = sharedService.decrypt(element.emailId);
                        });
                        resUtil.OK(res, apiParams, result);
                    }
                }
            );
        }
    }

    /*
     * API to regenerate token if expires for a user through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Find the user by email & password
     *
     * Is being used while user login
     * 1. getUserList for admin
     * 2. user resubmit for relogin for user
     */
    userResubmit(req, res) {
        const reqBody = req.body;
        const apiParams = {
            userId: "api.user.resubmit",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        const that = this;

        if (!(
            req.body &&
            reqBody &&
            reqBody.request &&
            typeof reqBody.request &&
            typeof reqBody.request == "object" &&
            reqBody.request.token
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            async.waterfall(
                [
                    function (callback) {
                        tokenService.validateToken(reqBody.request.token, callback);
                    },
                    function (validateTokenRes, callback) {
                        const userReq = {
                            filter: {
                                userId: validateTokenRes.userId
                            }
                        };
                        that.findUsers(userReq, callback);
                    },
                    function (tokenRes, callback) {
                        roleCollection.findOne({ _id: ObjectId(tokenRes.documents[0].role) }, function (err, result) {
                            if (err) {
                                resUtil.handleError(req, res, err);
                                return;
                            } else if (!result) {
                                resUtil.BADREQUEST(res, apiParams, {});
                                return;
                            } else {
                                tokenRes.documents[0].role = result.role;
                                tokenRes.documents[0]["RoutesAccess"] = result.RoutesAccess;
                                callback(null, tokenRes);
                            }
                        });
                    }
                ],
                function (err, result) {
                    if (err) {
                        resUtil.handleError(req, res, err);
                    } else if (result && result.documents && result.documents.length) {
                        let response = result.documents[0];
                        // delete response.password;
                        response.token = reqBody.request.token;
                        response.emailId = sharedService.decrypt(response.emailId);
                        response.userName = sharedService.decrypt(response.userName);
                        response.userdomain = sharedService.decrypt(response.userdomain);
                        response.UserSettings = sharedService.encryptPayload(that.getCommonUserSettings().PROPERTIES);
                        resUtil.OK(res, apiParams, result.documents[0]);
                    } else {
                        resUtil.BADREQUEST(res, apiParams, {});
                    }
                }
            );
        }
    }

    /*
     * API to get all the vendors allowed for the user through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Find the user vendor map list for the particular userId
     */
    getUserVendorMapping(req, res) {
        let userReq = req.query;
        const apiParams = {
            id: "api.user-vendor-map.get",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(userReq && (userReq.vendorId || userReq.userId))) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            // const filter = userReq.filter ? util.getSearchQuery(userReq.filter) : {};
            let result = {};

            if (userReq.userId) userReq.userId = parseInt(userReq.userId);

            userVendorMapCollection.find(userReq).toArray(function (err, docs) {
                result = docs;

                if (err) {
                    resUtil.ERROR(res, apiParams, {});
                } else if (docs) {
                    if (docs && docs.length) {
                        result.forEach(each => {
                            delete each._id;
                        });
                    }

                    resUtil.OK(res, apiParams, result);
                } else {
                    resUtil.NOTFOUND(res, apiParams, {});
                }
            });
        }
    }

    /*
     * API to add a new user vendor map by admin i.e. add a new allowed for the user through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Validate the token
     * 3. Call add user vendor map method
     */
    addUserVendorMapping(req, res) {
        let userReq = req.body.request;
        const apiParams = {
            id: "api.user-vendor-map.add",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            userReq &&
            userReq.map &&
            typeof userReq.map === "object" &&
            userReq.token
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            const that = this;

            async.waterfall(
                [
                    function (callback) {
                        tokenService.validateToken(userReq.token, callback);
                    },
                    function (tokenRes, callback) {
                        if (tokenRes && tokenRes.role === "admin") {
                            that.addUserVendorMapMethod(userReq, tokenRes, callback);
                        } else {
                            callback({
                                status: 403,
                                err: "AUTHENTICATION ERROR",
                                errmsg: "Not allowed to add vendor"
                            },
                                null
                            );
                        }
                    }
                ],
                function (err, result) {
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
     * Method to delete a user vendor map by admin through the TAPP service. Following are the step performed in the API sequentially.
     * 1. Validate the request
     * 2. Validate the token & allow further only if role is 'admin'
     * 3. Delete the mapping & return the response
     */
    deleteUserVendorMapping(req, res) {
        const reqBody = req.body;
        const apiParams = {
            userId: "api.user.map",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        if (!(
            reqBody &&
            reqBody.request &&
            reqBody.request.token &&
            reqBody.request.filter &&
            ((reqBody.request.filter.vendorId && reqBody.request.filter.userId) ||
                reqBody.request.filter.mapId)
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        } else {
            const that = this;
            async.waterfall(
                [
                    function (callback) {
                        tokenService.validateToken(reqBody.request.token, callback);
                    },
                    function (tokenRes, callback) {
                        if (tokenRes && tokenRes.role === "admin") {
                            let filter = reqBody.request.filter;

                            userVendorMapCollection.findOneAndDelete(filter, function (
                                err,
                                result
                            ) {
                                let errObject;
                                if (err) {
                                    errObject = {
                                        status: 500,
                                        err: "INTERNAL_SERVER_ERROR",
                                        errmsg: "Error while adding user"
                                    };
                                }

                                util.handleServerError(
                                    errObject,
                                    result["lastErrorObject"]["n"],
                                    callback
                                );
                            });
                        } else {
                            callback({
                                status: 403,
                                err: "AUTHENTICATION ERROR",
                                errmsg: "Not allowed for this action"
                            },
                                null
                            );
                        }
                    }
                ],
                function (err, result) {
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
    * Method to get the users metadata to generate the CSV. Following are the step performed in the API sequentially.
    * 1. Validate the request
    * 2. Validate the token & allow further only if role is 'admin/clientadmin'
    * 3. return the response
    */
    getAllUsersMetaData(req, res) {
        const apiParams = {
            userId: "api.users.metadata",
            msgid: req.body.params ? req.body.params.msgid : ""
        };

        const reqBody = sharedService.decryptPayload(req.body.userDetails);

        if (!(
            req.body &&
            req.body.userDetails &&
            typeof reqBody == "object" &&
            reqBody.emailId
        )) {
            apiParams.err = "Invalid Request";
            resUtil.BADREQUEST(res, apiParams, {});
            return;
        }

        let that = this;

        async.waterfall([
            function (callback) {
                tokenService.validateToken(reqBody.token, function (err, tokenRes) {
                    if (tokenRes && tokenRes.role == "admin" || tokenRes && tokenRes.role == "clientadmin") {
                        callback(null, true);
                    } else {
                        callback({
                            status: 403,
                            err: "INTERNAL_SERVER_ERROR",
                            errmsg: "Something went wrong. Please try again."
                        },
                            null
                        );
                    }
                });
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
            function (isTokenRes, rolesRes, callback) {
                let filter = {};
                if (reqBody.role == 'clientadmin') {
                    let useremail = reqBody.emailId;
                    let userdomain = (useremail.split('@')[1]);
                    userdomain = sharedService.encrypt(userdomain);
                    let validRoles = ['admin'];
                    let mappedRoleIds = that.getMappedRoleIds(rolesRes, validRoles);
                    filter = { role: { $nin: mappedRoleIds }, userdomain: userdomain }
                }

                userCollection
                    .aggregate([{
                        $lookup: {
                            from: "document_metadata",
                            localField: "userId",
                            foreignField: "userId",
                            as: "users_metadata"
                        }
                    },
                    {
                        $match: filter
                    },
                    ])
                    .toArray(function (err, result) {
                        if (err) {
                            callback(err, null);
                        } else if (result) {
                            if (result.length > 0) {
                                result.forEach(element => {
                                    element.emailId = sharedService.decrypt(element.emailId);
                                    element.userName = sharedService.decrypt(element.userName);
                                });
                            }
                            result = sharedService.encryptPayload(result);
                            callback(null, result);
                        } else {
                            callback({}, null);
                        }
                    });
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

    //<=========================================INTERNAL UTILITY METHODS STARTS==========================================>

    //Method to delete all user-vendor mapping for an userId.Delete multiple documents for the userId passed
    async deleteVendorMapping(userId) {
        userVendorMapCollection.deleteMany({ userId });
    }

    // Method to create static html template for password reset instructions 
    createForgotPasswordTemplate(docs, req) {

        let clientUrl = config.clientAddress; //req.headers.referer; //this.config.clientAddress;
        let recovery_token = docs.verificationToken;
        let userName = sharedService.decrypt(docs.userName);
        let htmlContent = ` 
        <html>
        <body>
        <h4>Hello ${userName.toString().toUpperCase()}, <br></h4>
        <p>We had received a request to reset the password associated with this email address. If you made this request, please follow the instructions below:<br> </p>
        <p>If you did not request to have your password reset, you can safely Ignore this email. We assure you that your account is safe with us.<br><br> </p>  
        <p><h3> Click the link below to reset your password:</h3></p>
        <p><a href="${clientUrl}/reset-password?verificationToken=${recovery_token}">${clientUrl}/reset-password?verificationToken=${recovery_token}</a></p>
        <p>Thanks,<br>${JSON.parse(config.projectConfigurations).projectName}<sup>TM</sup> Team</p>
        </body>
        </html>
        `
        return htmlContent;
    }

    // Method to create static html template for send welcome template 
    signUpTemplate(token, userName) {

        let clientUrl = this.config.clientAddress;
        let recovery_token = token;

        let htmlContent = ` 
        <html>
        <body>
        <h4>Hello ${userName}, <br></h4>
        <p>Thanks for registering for the Free trial of TAO ${JSON.parse(config.projectConfigurations).projectName}<sup class="sup ft-12">TM</sup>.<br> </p>
        <p>You need to activate your account - please follow this activation link to proceed:<br><br> </p>  
        <p><a href="${clientUrl}/authentication/verifyEmail?verificationToken=${recovery_token}">${clientUrl}/authentication/verifyEmail?verificationToken=${recovery_token}</a></p>
        <p>Thanks,<br>Team TAO</p>
        </body>
        </html>
        `
        return htmlContent;
    }

    // Method to check wether new role is already exists or not 
    checkRoleDuplicacy(role, callback) {
        roleCollection.findOne({
            $or: [{
                role: role
            }]
        },
            function (err, doc) {
                if (err) callback(err, null);
                else if (doc) {
                    callback({
                        status: 409,
                        err: "CONFLICT",
                        errmsg: "Duplicate Role Entry"
                    },
                        null
                    );
                } else {
                    callback(null, {});
                }
            }
        );
    }

    // Method to check new user already exists or not
    userDuplicate(email, callback) {
        userCollection.findOne({
            // $or: [{
            //         userName: user.userName
            //     },
            //     {
            //         userId: user.userId
            //     },
            //     {
            //         emailId: user.emailId
            //     }
            // ]
            $or: [{
                emailId: email
            }]
        },
            function (err, doc) {
                if (err) callback(err, null);
                else if (doc) {
                    callback({
                        status: 409,
                        err: "CONFLICT",
                        errmsg: "Duplicate User Entry"
                    },
                        null
                    );
                } else {
                    callback(null, {});
                }
            }
        );
    }

    //Method to check the user credentials
    checkUserCredentials(user, callback) {
        userCollection.findOne({
            emailId: user.emailId,
            password: user.password,
            isActive: true
        },
            function (err, result) {
                if (err) {
                    console.log(`Got error while finding user with ${user.emailId} at ${new Date()} `)
                    console.log(err);
                    callback({
                        status: 500,
                        err: "INTERNAL_SERVER_ERROR",
                        errmsg: "error while finding the user"
                    },
                        null
                    );
                } else if (!result) {
                    console.log(`User not found with ${user.emailId} at ${new Date()} `)
                    callback({
                        status: 404,
                        err: "NOTFOUND",
                        errmsg: "User Not Found"
                    },
                        null
                    );
                } else if (result.emailVerified === false) {
                    console.log(`User found, but Unverified EmailId for ${user.emailId} at ${new Date()} `)
                    callback({
                        status: 401,
                        err: "UNAUTHORIZED",
                        errmsg: "Email Not Verified"
                    },
                        null
                    );
                } else {
                    callback(null, result);
                }
            }
        );
    }

    //Method to Checks if the mapping already exists
    addUserVendorMapMethod(userReq, tokenRes, callback) {
        let addMapping = {
            userId: userReq.map.userId,
            vendorId: userReq.map.vendorId,
            createdOn: util.generateTimestamp(),
            createdBy: tokenRes.userId
        };

        const filter = {
            userId: userReq.map.userId,
            vendorId: userReq.map.vendorId
        };
        userVendorMapCollection.countDocuments(filter, function (err, count) {
            if (err) {
                callback({
                    status: 500,
                    err: "INTERNAL SERVER ERROR",
                    errmsg: "ERROR WHILE ADDING MAPPING"
                },
                    null
                );
            } else if (count) {
                callback({
                    status: 400,
                    err: "DUPLICATE ITEM",
                    errmsg: "THE PROPOSED MAPPING ALREADY EXISTS"
                },
                    null
                );
            } else {
                userVendorMapCollection
                    .find({})
                    .sort({
                        mapId: -1
                    })
                    .limit(1)
                    .toArray(function (err, docs) {
                        if (docs) {
                            if (docs && docs.length && docs[0].mapId) {
                                let lastId = docs[0].mapId;
                                addMapping.mapId = parseInt(lastId) + 1;
                            } else {
                                addMapping.mapId = 1;
                            }

                            userVendorMapCollection.insertOne(addMapping, function (
                                err1,
                                doc1
                            ) {
                                if (doc1 && doc1.ops && doc1.ops.length)
                                    util.handleServerError(err1, doc1.ops[0], callback);
                                else util.handleServerError(err1, null, callback);
                            });
                        } else {
                            callback({
                                status: 500,
                                err: "INTERNAL_SERVER_ERROR",
                                errmsg: "Error while adding user vendor mapping"
                            },
                                null
                            );
                        }
                    });
            }
        });
    }

    //Method to find users by a filter criteria
    findUsers(userReq, callback) {

        const filter = userReq.filter ? util.getSearchQuery(userReq.filter) : {};
        let limit;
        //this.config.defaultResultSize
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

        //.sort().skip().limit()
        userCollection.countDocuments(userReq.filter, function (err, result) {
            if (err) {
                callback({
                    status: 500,
                    err: "INTERNAL_SERVER_ERROR",
                    errmsg: "error while fetching user list"
                },
                    null
                );
            } else {
                userCollection
                    .find(userReq.filter)
                    .sort({
                        createdOn: -1
                    })
                    .skip(skip)
                    .limit(limit)
                    .toArray(function (err, docs) {
                        if (err) {
                            callback({
                                status: 500,
                                err: "INTERNAL_SERVER_ERROR",
                                errmsg: "error while fetching user list"
                            },
                                null
                            );
                        } else {
                            if (docs) {

                                docs.forEach(each => {
                                    delete each._id;
                                    delete each.password;
                                });
                            } else {
                                docs = [];
                            }

                            const responseObject = {
                                count: result,
                                documents: docs,
                                page: page,
                                perPageRecord: limit
                            };
                            callback(null, responseObject);
                        }
                    });
            }
        });
    }

    //Method to get roleIds on the basis of role name
    getMappedRoleIds(rolesArray, validRoles) {
        let mappedRoleIds = [];

        rolesArray.filter((roleObj) => {
            if (validRoles.includes(roleObj.role)) {
                mappedRoleIds.push((roleObj._id).toString());
            }
        })
        return mappedRoleIds;
    }

    //Method to check for tag inclusion or not
    checkForTagsValidation(formValue) {
        let status = false;
        let checkedTags = JSON.parse(config.INVALID_FORM_TAGS);
        let formValueArray = [];
        for (var i in formValue) {
            formValueArray.push(formValue[i]);
        }
        if (formValueArray && formValueArray.length > 0) {
            for (var i in checkedTags) {
                formValueArray.forEach(element => {
                    if (element && element.toString().includes(checkedTags[i])) {
                        status = true
                    }
                });
            }
        } else {
            status = false
        }
        return status
    }

    //Method to check for the domain-name of the emailId
    checkEmailIdDomain(EmailId) {
        if (EmailId) {
            let domain = (EmailId.split("@")[1]).split(".")[0]
            return config.BLACKLISTED_DOMAINS.indexOf(domain) > -1 ? true : false
        }
        else {
            return false;
        }
    }

    //Method to get all the required configurations from the client 
    getCommonUserSettings() {
        let settings = { PROPERTIES: {} };
        settings.PROPERTIES.BUZ_RULE_API_VISIBILITY = config.BUZ_RULE_API_VISIBILITY;
        settings.PROPERTIES.EXTRACTION_ASSIST_VISIBILITY = config.EXTRACTION_ASSIST_VISIBILITY;
        settings.PROPERTIES.SIGNUP_PAGE_VISIBILITY = config.SIGNUP_PAGE_VISIBILITY;
        settings.PROPERTIES.DASHBOARD_VISIBILITY = config.DASHBOARD_VISIBILITY;
        settings.PROPERTIES.PROCESSING_VISIBILITY = config.PROCESSING_VISIBILITY;
        settings.PROPERTIES.SETTINGS_VISIBILITY = config.SETTINGS_VISIBILITY;
        settings.PROPERTIES.ACTIVITY_TIME_REVIEWER = config.ACTIVITY_TIME_REVIEWER;
        settings.PROPERTIES.ALERT_DISSMISS_REVIEWER = config.ALERT_DISSMISS_REVIEWER;
        settings.PROPERTIES.RAISE_TICKET_EMAIL = config.RAISE_TICKET_EMAIL;
        settings.PROPERTIES.ALERT_TIMEOUT = config.ALERT_TIMEOUT;
        settings.PROPERTIES.AUTO_REFRESH_IN = config.AUTO_REFRESH_IN;
        settings.PROPERTIES.HOW_IT_WORKS_URL = config.HOW_IT_WORKS_URL;
        settings.PROPERTIES.NO_OF_ALLOWED_PAGES = config.MaximumAllowedPages;
        settings.PROPERTIES.MAX_FILE_SIZE_ALLOWED = config.MaximumFileSizeLimit;
        settings.PROPERTIES.ADMIN_EMAIL_ID = config.AdminEmailId;
        settings.PROPERTIES.ORGTYPE_OPTIONS = config.orgTypeOptions;
        settings.PROPERTIES.DOCTYPE_OPTIONS = config.docTypeOptions;
        settings.PROPERTIES.CONFIDENCE_THRESHOLD = config.confidenceThreshold;
        settings.PROPERTIES.DEFAULT_EA_TIMEGAP = config.DEFAULT_EA_TIMEGAP;
        settings.PROPERTIES.DOWNLOAD_PATH = config.downloadResultPath;
        settings.PROPERTIES.ACTIONS_VISIBILITY = config.ACTIONS_VISIBILITY;
        settings.PROPERTIES.POINT_AND_SHOOT_VISIBILITY = config.POINT_AND_SHOOT_VISIBILITY;
        settings.PROPERTIES.REASSIGN_BUTTON_VISIBILITY = config.REASSIGN_BUTTON_VISIBILITY;
        settings.PROPERTIES.DROPDOWN_VISIBILITY = config.DROPDOWN_VISIBILITY;
        settings.PROPERTIES.DAILY_CONSUMPTION_LIMIT_VISIBILITY = config.DAILY_CONSUMPTION_LIMIT_VISIBILITY;
        settings.PROPERTIES.FAQ_PAGE_VISIBILITY = config.FAQ_PAGE_VISIBILITY;
        settings.PROPERTIES.CARDVIEW_VISIBILITY = config.CARDVIEW_VISIBILITY;
        settings.PROPERTIES.TIPS_VISIBILITY = config.TIPS_VISIBILITY;
        settings.PROPERTIES.LINE_ITEMS_VISIBILITY = config.LINE_ITEMS_VISIBILITY;
        settings.PROPERTIES.ADMIN_UPLOAD_VISIBILITY = config.ADMIN_UPLOAD_VISIBILITY;
        settings.PROPERTIES.DEFAULT_FUNCTIONALITY = config.DEFAULT_FUNCTIONALITY;
        settings.PROPERTIES.TAPP_CHANGES_VISIBILITY = config.TAPP_CHANGES_VISIBILITY;
        settings.PROPERTIES.LOGO_VISIBILITY = config.LOGO_VISIBILITY;
        settings.PROPERTIES.UPLOAD_BUTTON_VISIBILITY = config.UPLOAD_BUTTON_VISIBILITY;
        settings.PROPERTIES.STP_AND_ACE_VISIBILITY = config.STP_AND_ACE_VISIBILITY;
        settings.PROPERTIES.PRIORITY_RANK_FILTER_VISIBILITY = config.PRIORITY_RANK_FILTER_VISIBILITY;
        settings.PROPERTIES.REASSIGN_REASON_FILTER = config.REASSIGN_REASON_FILTER;
        settings.PROPERTIES.UI_VIEW = config.UI_VIEW;
        settings.PROPERTIES.AUTO_REASSIGN_DOCUMENT = config.AUTO_REASSIGN_DOCUMENT;
        settings.PROPERTIES.INITIAL_DOCS_EXTRACTED = Number(config.initialDocsExtracted);
        settings.PROPERTIES.POSTINGTABINDASHBOARD = Number(config.postingTabInDashboard);
        settings.PROPERTIES.DASHBOARD_CAL_PREV_MONTH_VALUE = Number(config.dashboardCalenderPrevMonthValue);

        settings.PROPERTIES.DASHBOARD_OPTIONS = JSON.parse(config.dashboardOptions);
        settings.PROPERTIES.REASSIGN_REASON_OPTIONS = JSON.parse(config.reassignReasonOptions);
        settings.PROPERTIES.SEARCH_AND_SELECT = config.searchAndSelect;
        settings.PROPERTIES.PROJECT_CONFIGURATIONS = JSON.parse(config.projectConfigurations);
        settings.PROPERTIES.DSAHBOARD_FILTERS = JSON.parse(config.dashboardFilters);
        settings.PROPERTIES.CONSUMPTION_LIMIT = Number(config.CONSUMPTION_LIMIT);
        settings.PROPERTIES.DOWNLOAD_ALL_THRESHOLD = Number(config.downloadAllThreshold);
        settings.PROPERTIES.DOCTYPES_VISIBILITY = Number(config.DOCTYPES_VISIBILITY);
        settings.PROPERTIES.DOCUMENT_TYPES_LIST = JSON.parse(config.DOCUMENT_TYPES_LIST);
        settings.PROPERTIES.PRIORITY_RANKING_LIST = JSON.parse(config.PRIORITY_RANKING_LIST);
        settings.PROPERTIES.UNEXTRACTED_FIELDS_LIST = JSON.parse(config.unExtractedfields);
        settings.PROPERTIES.DOCTYPE_CHECK_FOR_ROLES = JSON.parse(config.DOCTYPE_CHECK_FOR_ROLES);
        settings.PROPERTIES.BLACKLISTED_DOMAINS = JSON.parse(config.BLACKLISTED_DOMAINS);

        return settings;
    }

    //<=========================================INTERNAL UTILITY METHODS ENDS==========================================>
}

module.exports = new UserService(config);
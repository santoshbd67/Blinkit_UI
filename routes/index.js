const express = require("express"),
    path = require("path"),

    telemetryService = require("../services/telemetryService"),
    vendorService = require("../services/vendorService"),
    documentService = require("../services/documentService"),
    externalService = require("../services/externalService"),
    dashboardService = require("../services/dashboardService"),
    templateService = require("../services/templateService"),
    masterService = require("../services/masterService"),
    storageService = require("../services/storageService"),
    rpaService = require("../services/rpaService"),
    userService = require("../services/userService"),
    emailService = require("../services/emailService"),
    reportService = require("../services/reportService"),
    chartService = require("../services/ChartsService"),
    extractionService = require("../services/extractionAssistService");

const loggerMiddleware = require("../util/loggerMiddleware");
const sessionValidator = require("../util/sessionValidatorMiddleware");
const config = require("../config");

documentEventHandler = require("../dbListeners/documentEventHandler"),
    cors = require("cors"),
    logger = require("../logger/logger");

module.exports = app => {
    app.options("*", cors());
    app.set("view engine", "ejs");
    app.use(express.static(path.join(__dirname, "../client/dist/"), { extensions: ["ejs"] }));

    if (config.EXTERNAL_LOGS_VISIBILITY == 1) {
        app.use(loggerMiddleware); // write logs 
    }
    app.use(sessionValidator); // validate session

    /*============================================================================================================
                                                 DOCUMENT METADATA
     Document Service Routes
    //============================================================================================================*/

    app.post("/document/add", (req, res) => documentService.addDocument(req, res));
    app.post("/document/update/:id", (req, res) => documentService.updateDocument(req, res)); //--------------python
    app.post("/document/find", (req, res) => documentService.findDocuments(req, res));
    app.post("/document/updateMany", (req, res) => documentService.updateManyDocuments(req, res));
    app.post("/document/search", (req, res) => documentService.searchDocuments(req, res));
    app.get("/document/get/:id", (req, res) => documentService.getDocument(req, res)); //--------------python + UI
    app.get("/document/totalCount", (req, res) => { documentService.getTotalDocs(req, res) });
    app.get("/document/generate/documentId", (req, res) => documentService.getDocumentId(req, res));
    app.post("/document/delete", (req, res) => documentService.deleteDocument(req, res));
    app.post("/document/purge", (req, res) => documentService.purgeDocument(req, res));
    app.get("/document/stats/read", (req, res) => documentService.getDocumentStats(req, res));
    app.get("/document/checkStatus", (req, res) => documentService.checkDocStatus(req, res));
    app.post("/document/getInfo", (req, res) => documentService.getDocumentInfo(req, res));
    app.post("/document/remove/:id", (req, res) => documentService.removeDocument(req, res));
    app.post("/document/getRawPredictionExistance", (req, res) => documentService.getRawPredictionExistance(req, res));

    app.get("/document/getActualConsumptionData", (req, res) => documentService.getActualConsumptionData(req, res));
    /*============================================================================================================
                                                 DOCUMENT RESULT
    //============================================================================================================*/

    app.post("/document/result/add", (req, res) => documentService.addResult(req, res)); //--------------python
    app.post("/document/result/update/:id", (req, res) => documentService.updateResult(req, res)); //--------------python + UI
    app.post("/document/result/query/add", (req, res) => documentService.addQueryForResult(req, res));
    app.put("/document/result/query/update/:documentId/:queryId", (req, res) => documentService.updateQueryForResult(req, res));
    app.delete("/document/result/query/delete/:documentId/:queryId", (req, res) => documentService.deleteQueryForResult(req, res));
    app.post("/document/result/find", (req, res) => documentService.findResults(req, res));
    app.post("/document/result/validate", (req, res) => documentService.validateResult(req, res));
    app.get("/document/result/get/:id", (req, res) => documentService.getResult(req, res));
    app.post("/document/result/setExtAssistFlag", (req, res) => documentService.setExtAssistFlag(req, res));

    /*============================================================================================================
                                                    EXTERNAL SERVICES
    External Services To Handle Preprocessing & Extraction
    //============================================================================================================*/

    app.post("/preprocess/submit", (req, res) => externalService.preProcess(req, res));
    app.post("/preprocess/knowninvoice", (req, res) => externalService.getTiffInvoiceURL(req, res));
    app.post("/extraction/submit", (req, res) => externalService.extraction(req, res));

    /*============================================================================================================
                                            DASHBOARD
    //============================================================================================================*/

    app.post("/dashboard/stats/read", (req, res) => dashboardService.getStats(req, res));
    app.post("/charts/getChartConfigs", (req, res) => chartService.getChartConfigs(req, res));
    app.post("/charts/getChartsData", (req, res) => chartService.getChartsData(req, res));
    app.post("/charts/updateChartsData", (req, res) => chartService.updateChartsData(req, res));
    app.post("/charts/bulkUpdateCharts", (req, res) => chartService.bulkUpdateCharts(req, res));
    app.post("/charts/getVendorsList", (req, res) => chartService.getVendorsList(req, res));
    app.post("/charts/getBillingStatesList", (req, res) => chartService.getBillingStatesList(req, res));

    /*============================================================================================================
                                                        VENDOR
    //============================================================================================================*/

    app.post("/vendor/add", (req, res) => vendorService.addVendor(req, res));
    app.post("/vendor/update/:id", (req, res) => vendorService.updateVendor(req, res));
    app.get("/vendor/get/:id", (req, res) => vendorService.getVendorById(req, res));
    app.post("/vendor/list", (req, res) => vendorService.vendorList(req, res));
    app.post("/vendor/delete", (req, res) => vendorService.deleteVendor(req, res));
    app.get("/vendor/logo/get", (req, res) => vendorService.getVendorLogo(req, res));
    app.post("/vendor/validate/vendorId", (req, res) => vendorService.validateVendorId(req, res));

    /*============================================================================================================
                                          EMAIL ROUTES
   //============================================================================================================*/
    app.post("/user/sendEmail", (req, res) => emailService.sendEmail(req, res)); //new

    /*============================================================================================================
                                               XML MAPPING
     //============================================================================================================*/
    app.get("/vendor/xml/map/get", (req, res) => vendorService.getXMLMappingById(req, res));
    app.post("/vendor/xml/map/update", (req, res) => vendorService.updateXMLMapping(req, res));

    // app.get('/vendor/template/get/:id', (req, res) => vendorService.getTemplate(req, res));
    /* Should vendor apis be nested within vendor, or should they exist outside as above*/

    /*============================================================================================================
                                               MASTER DATA
     //============================================================================================================*/

    app.get("/master/get", (req, res) => masterService.getMasterData(req, res));
    app.get("/master/get/organizationConfiguration", (req, res) => { masterService.getOrganizationConfiguration(req, res) });
    app.get("/storage/generateSASToken", (req, res) => storageService.generateSAS(req, res));
    app.post("/storage/getBlobURL", (req, res) => storageService.getBlobURL(req, res));
    app.post("/storage/downloadOriginalFile", (req, res) => storageService.downloadOriginalFile(req, res));
    app.post("/storage/downloadFileResult", (req, res) => storageService.downloadFileResult(req, res));
    app.post("/storage/downloadListViewFilesData", (req, res) => storageService.downloadListViewFilesData(req, res));

    /*============================================================================================================
                                              RPA
    //============================================================================================================*/
    app.post("/document/rpa/list", (req, res) => rpaService.getRPADocumentList(req, res));
    app.post("/document/rpa/status/update", (req, res) => rpaService.updateRPADocumentStatus(req, res));
    app.post("/rpa/webhook/response", (req, res) => rpaService.webhookResponse(req, res));

    /*============================================================================================================
                                              TEMPLATE ROUTES
    //============================================================================================================*/

    app.get("/template/get/:id", (req, res) => templateService.getTemplate(req, res));

    /*============================================================================================================
                                             USER ROUTES PAIGES V1+V2
    //============================================================================================================*/
    app.post("/user/add", (req, res) => userService.addUser(req, res));
    app.post("/user/login", (req, res) => userService.userLogin(req, res));
    app.post("/user/signup", (req, res) => userService.userSignup(req, res)); //new
    app.post("/user/verifyToken", (req, res) => userService.userResubmit(req, res));
    app.post("/user/logout", (req, res) => userService.userLogout(req, res));
    app.get("/user/dataExists", (req, res) => userService.isDataExists(req, res)); //new
    app.get("/user/validateUser", (req, res) => userService.validateVerificationToken(req, res)); //new
    app.get("/user/getDetails", (req, res) => userService.getUserDetails(req, res));
    app.get("/user/reasonOptions", (req, res) => userService.getReasonOptions(req, res));
    app.get("/user/assignReasonOptions", (req, res) => userService.getReassignReasons(req, res));
    app.get("/user/getUserSettings", (req, res) => userService.getUserSettings(req, res))
    app.post("/user/listAll", (req, res) => userService.getUserList(req, res));
    app.post("/user/update", (req, res) => userService.updateUserDetails(req, res));
    app.post("/user/delete", (req, res) => userService.deleteUser(req, res));
    app.post("/user/manageUser", (req, res) => userService.manageUser(req, res)); //new
    app.post("/user/getAllMetadata", (req, res) => userService.getAllUsersMetaData(req, res));
    app.post("/user/changePassword", (req, res) => userService.changePassword(req, res));
    app.post("/user/resetPassword", (req, res) => userService.resetPassword(req, res)); //new
    app.post("/user/forgotPassword", (req, res) => userService.forgotPassword(req, res)); //new

    app.get("/user/vendor/map/get", (req, res) => userService.getUserVendorMapping(req, res));
    app.post("/user/vendor/map/add", (req, res) => userService.addUserVendorMapping(req, res));
    app.post("/user/vendor/map/delete", (req, res) => userService.deleteUserVendorMapping(req, res));

    /*============================================================================================================
                                           UPLOAD-FILE
    //============================================================================================================*/

    app.post("/upload/*", (req, res) => storageService.uploadFile(req, res));

    /*============================================================================================================
                                           TELEMENTRY
    //============================================================================================================*/
    app.post("/telemetry", (req, res) => telemetryService.syncTelemetry(req, res));

    /*============================================================================================================
                                           DOCUMENT-RAW_PREDICTION
   //============================================================================================================*/

    app.post("/rawPrediction/add", (req, res) => { documentService.addRawPrediction(req, res) });
    app.post("/rawPrediction/update", (req, res) => documentService.updateRawPrediction(req, res));
    app.get("/rawPrediction/get/:id", (req, res) => documentService.getRawPrediction(req, res));
    app.delete("/rawPrediction/delete/:id", (req, res) => documentService.deleteRawPrediction(req, res));

    /*============================================================================================================
                                              REPORTS
    //============================================================================================================*/

    app.get("/report/getAll", (req, res) => { reportService.getRecords(req, res) })
    app.post("/report/insert", (req, res) => { reportService.insertRecords(req, res) })
    app.put("/report/update", (req, res) => { reportService.updateRecords(req, res) })
    app.delete("/report/delete", (req, res) => { reportService.deleteRecords(req, res) })

    app.post("/report/bulkInsert", (req, res) => { reportService.bulkInsert(req, res) })

    /*============================================================================================================
                                             ROLE MANAGEMENT
     //============================================================================================================*/
    app.post("/role/add", (req, res) => { userService.addRole(req, res) });
    app.post("/role/getAll", (req, res) => { userService.getRoles(req, res) });

    /*============================================================================================================
                                             REVIEWER ROUTES
     //============================================================================================================*/
    app.post("/document/reviewer/find", (req, res) => { documentService.getDocumentsForReviewer(req, res) });
    app.get("/document/reviewer/get/:id", (req, res) => documentService.getDocumentReviewStatus(req, res));
    app.post("/document/reviewer/getOne", (req, res) => documentService.getSingleDocumentForReviewer(req, res));
    app.get("/document/reviewer/getReviewedDocs/:id", (req, res) => documentService.getTotalDocumentsReviewed(req, res));

    /*============================================================================================================
                                             APPROVER ROUTES
    //============================================================================================================*/
    app.post("/document/approver/find", (req, res) => { documentService.getDocumentsForApprover(req, res) });

    /*============================================================================================================
                                            EXTRACTION ASSIST ROUTES
    //============================================================================================================*/

    app.post("/extraction/getSuggestions", (req, res) => { extractionService.getSuggestions(req, res) });
    app.post("/extraction/createMasterData", (req, res) => { extractionService.createMasterData(req, res) })
    app.post("/extraction/validateMasterData", (req, res) => { extractionService.validateMasterData(req, res) })
    app.post("/extraction/getUpdatedFormats", (req, res) => { extractionService.getUpdatedVendorNameForUnknownFormats(req, res) })

    app.post("/extraction/pathFinder/getTemplates", (req, res) => { extractionService.getTemplates(req, res) })
    app.post("/extraction/pathFinder/validateTemplate", (req, res) => { extractionService.validateTemplate(req, res) })
    app.post("/extraction/pathFinder/raiseTicketSendEmail", (req, res) => { extractionService.raiseTicket(req, res) })
    app.post("/extraction/pathFinder/createTemplate", (req, res) => { extractionService.createTemplate(req, res) })
    app.post("/extraction/pathFinder/testTemplates", (req, res) => { extractionService.testTemplates(req, res) })
    app.post("/extraction/pathFinder/getTestingDocuments", (req, res) => { extractionService.getTestingDocuments(req, res) })
    app.post("/extraction/pathFinder/getOCRLines", (req, res) => { extractionService.getOCRLines(req, res) })
    app.post("/extraction/getAllFormatsAndCorrections", (req, res) => extractionService.getAllFormatsAndCorrections(req, res));
    app.post("/extraction/pathFinder/getRulesData", (req, res) => { extractionService.getRulesData(req, res) })
    app.post("/extraction/pathFinder/getMLIdentifiers", (req, res) => { extractionService.getMLIdentifiers(req, res) })
    app.post("/extraction/pathFinder/deleteTemplate", (req, res) => { extractionService.deleteTemplate(req, res) })
    app.post("/extraction/pathFinder/deleteVendorMasterdata", (req, res) => { extractionService.deleteVendorMasterdata(req, res) })
    app.post("/extraction/pathFinder/updateVendorIds", (req, res) => { extractionService.updateDeletedVendors(req, res) })

    /*============================================================================================================
                                           IF NO ROUTES MATCHED
    Finally check wildcard if no routes are found
    Notes for developers: Don't move this anywhere else, always keep this at bottom & define other routes above this
   //============================================================================================================*/

    app.get("*", function (req, res, next) {
        logger.error("path not found", req.method);
        res.sendFile(path.resolve("./client/dist/index.html"));
    });
};
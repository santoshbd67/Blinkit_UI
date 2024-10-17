export const APIConfig = {
  API: {
    // DOC METADATA ROUTES
    findDocument: 'document/find',
    searchDocument: 'document/search',
    getDocumentResult: 'document/result/get/',
    generateDocumentId: 'document/generate/documentId',
    addDocument: 'document/add',
    updateDocument: 'document/update/',
    getDocument: 'document/get/',
    checkStatus: 'document/checkStatus?documentId=',
    updateDocumentResult: 'document/result/update/',
    validateDocumentResult: 'document/result/validate',
    deleteDocument: 'document/delete',
    getDocumentStats: 'document/stats/read',
    validateNoOfDocsUploaded: 'document/totalCount',
    updateManyDocument: 'document/updateMany',
    getDocumentInfo: 'document/getInfo',
    getRawPredictionExistance: 'document/getRawPredictionExistance',
    actualConsumptionData: 'document/getActualConsumptionData',

    // DOC RESULT ROUTES
    setExtAssistFlag: 'document/result/setExtAssistFlag',
    addQueryForResult: 'document/result/query/add',
    updateQueryForResult: 'document/result/query/update',
    deleteQueryForResult: 'document/result/query/delete/',

    // REVIEWER ROUTES
    findDocsForReveiwer: 'document/reviewer/find',
    getDocumentReviewStatus: 'document/reviewer/get/',
    getSingleDocumentForReviewer: 'document/reviewer/getOne',
    getTotalDocsReviewedByReviewer: 'document/reviewer/getReviewedDocs/',

    // REVIEWER ROUTES
    findDocsForApprover: 'document/approver/find',

    // USER ROUTES
    userLogin: 'user/login',
    userSignUp: 'user/signup',
    checkData: 'user/dataExists',
    sendEmail: 'user/sendEmail',
    resetPassword: 'user/resetPassword',
    forgotPassword: 'user/forgotPassword',
    verifyUser: 'user/validateUser',
    changePassword: 'user/changePassword',
    verifyToken: 'user/verifyToken',
    userLogout: 'user/logout',
    getUserList: 'user/listAll',
    deleteUser: 'user/delete',
    getUserDetails: 'user/getDetails/',
    updateUser: 'user/update',
    manageUser: 'user/manageUser',
    fetchAllUsers: 'user/getAllMetadata',
    getReasonOptions: 'user/reasonOptions',
    getAssignResons: 'user/assignReasonOptions',
    getUserSettings: 'user/getUserSettings',
    addUser: 'user/add',
    getUserVendorMap: 'user/vendor/map/get',
    addUserVendorMap: 'user/vendor/map/add',
    deleteUserVendorMap: 'user/vendor/map/delete',

    // UPLOAD FILE ROUTES
    storeUploadFiles: 'upload/',

    // ROLE ROUTES
    getRoles: 'role/getAll',

    // EXTRACTION ASSIST ROUTES
    getSuggestions: 'extraction/getSuggestions',
    createMasterData: 'extraction/createMasterData',
    validateMasterData: 'extraction/validateMasterData',
    getUpdatedFormats: 'extraction/getUpdatedFormats',
    getTemplates: 'extraction/pathFinder/getTemplates',
    validateTemplate: 'extraction/pathFinder/validateTemplate',
    createTemplate: 'extraction/pathFinder/createTemplate',
    getTestingDocs: 'extraction/pathFinder/getTestingDocuments',
    raiseTicketSendEmail: 'extraction/pathFinder/raiseTicketSendEmail',
    testTemplates: 'extraction/pathFinder/testTemplates',
    getOCRLines: 'extraction/pathFinder/getOCRLines',
    getRulesData: 'extraction/pathFinder/getRulesData',
    deleteTemplate: 'extraction/pathFinder/deleteTemplate',
    deleteVendorMasterdata: 'extraction/pathFinder/deleteVendorMasterdata',
    getAllFormatsAndCorrections: 'extraction/getAllFormatsAndCorrections',
    getMLIdentifiers: 'extraction/pathFinder/getMLIdentifiers',
    updateVendorIds: 'extraction/pathFinder/updateVendorIds',

    // VENDOR ROUTES
    getVendorList: 'vendor/list',
    editVendor: 'vendor/update/',
    addVendor: 'vendor/add',
    deleteVendor: 'vendor/delete',
    getVendorLogo: 'vendor/logo/get',
    validateVendorId: 'vendor/validate/vendorId',
    getXMLMapping: 'vendor/xml/map/get?id=',
    updateXMLMapping: 'vendor/xml/map/update',

    // STORAGE ROUTES
    generateSASToken: 'storage/generateSASToken',
    getBlobURL: 'storage/getBlobURL',
    downloadOriginalFile: 'storage/downloadOriginalFile',
    downloadMultipleFilesResult: 'storage/downloadListViewFilesData',
    downloadSingleFileResult: 'storage/downloadFileResult',

    // TEMPLATE ROUTES
    getTemplate: 'template/get/',

    // PREPROCESS OR EXTRACTION ROUTES
    startPreprocessing: 'preprocess/submit',
    convertToTiff: 'preprocess/knowninvoice',
    startExtraction: 'extraction/submit',

    // DASHBOARD ROUTES
    getDashboardStats: 'dashboard/stats/read',
    getChartConfigs: 'charts/getChartConfigs',
    getChartsData: 'charts/getChartsData',
    updateChartsData: 'charts/updateChartsData',
    bulkUpdateCharts: 'charts/bulkUpdateCharts',
    getVendorsList: 'charts/getVendorsList',
    getBillingStatesList: 'charts/getBillingStatesList',

    // MASTERDATA ROUTES
    getMaster: 'master/get',
    getOrganizationConfiguration: 'master/get/organizationConfiguration',
  }
};

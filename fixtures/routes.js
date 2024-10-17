const path = require('path'),
    mockService = require('./mockService'),
    cors = require('cors');

module.exports = (app) => {
    
    app.options('*', cors());

    //===============================
    // PreProcessor & Extraction engine Mock Routes
    //===============================

    app.post('/preprocess/submit', (req, res) => mockService.submitForPreprocess(req, res));
    app.post('/extraction/submit', (req, res) => mockService.submitForExtraction(req, res));
    
    app.get('/tao/tenantlogic1/odata/RobotLogs', (req, res) => mockService.cloudGetLogs(req, res));
    app.get('/odata/RobotLogs', (req, res) => mockService.onPremiseGetLogs(req, res));
    app.post('/oauth/token', (req, res) => mockService.cloudAuthToken(req, res));
    app.post('/api/account/authenticate', (req, res) => mockService.onPremiseAuthToken(req, res));
}
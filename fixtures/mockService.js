const request = require('request');
const async = require('async');
const Joi = require('joi');
const faker = require('faker');
const resUtil = require('../util/resUtil');
const docUpdateAPI = "/document/update/";
const resultUpdateAPI = "/document/result/create";

class MockService {

    submitForPreprocess(req, res) {
        const reqBody = req.body;
        console.log('MockService.submitForPreprocess()::ReqBody - ', reqBody);
        let instance = this;
        async.waterfall([
            function (callback) {
                instance.validatePreProcessorRequest(reqBody, callback);
            },
            function (validationResult, callback) {
                instance.sendSyncPreProcessorResponse(reqBody, res, callback);
            },
            function (arg1, callback) {
                instance.sendAsyncPreProcessorResponse(reqBody, callback);
            }
        ], function (err) {
            if (err) {
                resUtil.handleError(req, res, err);
            }
        })

        Math.floor(Math.random() * 10)
    }

    validatePreProcessorRequest(reqBody, callback) {

        Joi.validate(reqBody.request, Joi.object().keys({
            documentId: Joi.string().required(),
            location: Joi.string().required(),
            mimeType: Joi.string().required(),
            callbackUrl: Joi.string().required()
        }), (err, value) => {
            if (err) {
                callback({
                    status: 400,
                    err: "INVALID_REQUEST",
                    errmsg: JSON.stringify(err.details)
                })
            } else {
                callback(null, value);
            }
        });
    }

    sendSyncPreProcessorResponse(reqBody, res, callback) {
        let apiParams = {
            id: reqBody.id,
            msgid: reqBody.params ? reqBody.params.msgid : ""
        }
        const randomNum = Math.floor(Math.random() * 10);
        if (randomNum == 7) {
            apiParams.err = "PREPROC_DOC_NOT_ACCEPTED";
            apiParams.errmsg = "Not a valid invoice";
            resUtil.ERROR(res, apiParams);
        } else {
            let vendorId = Math.floor(Math.random() * 5);
            if (vendorId == 0) vendorId = 5;
            resUtil.OK(res, apiParams, {
                documentId: reqBody.documentId,
                status: "PRE_PROCESSING",
                statusMsg: "Accepted for pre-processing",
                documentType: "Invoice",
                name: faker.system.fileName(),
                templateId: vendorId,
                vendorId: vendorId,
                pageCount: Math.floor(Math.random() * 20)
            })
        }
        callback(null, {});
    }

    sendAsyncPreProcessorResponse(reqBody, callback) {
        let apiParams = {
            id: reqBody.id,
            msgid: reqBody.params ? reqBody.params.msgid : ""
        }
        let response = {
            id: "api.document.update",
            ver: "1.0",
            ts: (new Date()).getTime(),
            params: {
                msgid: faker.random.alphaNumeric(10)
            }
        }
        const randomNum = Math.floor(Math.random() * 10);
        if (randomNum == 7) {
            response.params.status = "Failed";
            response.params.err = "PREPROC_KNOWN_INVOICE_NOT_FOUND";
            response.params.errmsg = "No valid template found";
            response.responseCode = "ERROR";
            response.request = {
                documentId: reqBody.request.documentId,
                status: "FAILED",
                statusMsg: "No valid template found for extraction"
            }
        } else {
            response.params.status = "Success";
            response.responseCode = "OK";
            response.request = {
                documentId: reqBody.request.documentId,
                status: "READY_FOR_EXTRACTION",
                statusMsg: "Invoice ready for extraction",
                lastProcessedOn: (new Date()).getTime(),
                pages: [{
                        "index": "0",
                        "url": "/preprocessor/2323asdsad-0.TIF"
                    },
                    {
                        "index": "1",
                        "url": "/preprocessor/2323asdsad-1.TIF"
                    }
                ],
                invoiceNumber: faker.random.alphaNumeric(10).toUpperCase(),
                invoiceDate: faker.date.between('2019-10-01', '2019-11-31'),
                currency: faker.finance.currencyCode(),
                totalAmount: faker.finance.amount()
            }
        }
        console.log("Wait for 5 mins before sending the response")
        setTimeout(function() {
            request({
                headers: {
                    "content-type": "application/json"
                },
                method: "POST",
                url: reqBody.request.callbackUrl + docUpdateAPI + reqBody.request.documentId,
                body: JSON.stringify(response)
            }, (error, res, body) => {
                console.log(error, body);
            });
            callback(null, {});
        }, 5000);
    }

    submitForExtraction(req, res) {

    }

    cloudGetLogs(req, res) {
        console.log("cloudGetLogs()", req.params, req.headers);
        res.send({
            "@odata.context": "https://platform.uipath.com/TaoAuiiaewqd/TaoAutomatimage50917/odata/$metadata#RobotLogs",
            "@odata.count": 6,
            "value": [
              {
                "Level": "Trace",
                "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                "ProcessName": "TAPPTesting_Demo Environment",
                "TimeStamp": "2020-01-17T07:12:25.471538Z",
                "Message": "Flowchart Executing",
                "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                "RawMessage": "{\r\n  \"message\": \"Flowchart Executing\",\r\n  \"level\": \"Verbose\",\r\n  \"logType\": \"Default\",\r\n  \"timeStamp\": \"2020-01-17T07:12:25.471538+00:00\",\r\n  \"fingerprint\": \"799ddbbc-0a48-4db2-b909-2a51a8d1ae5e\",\r\n  \"windowsIdentity\": \"DESKTOP-R7HECN0\\\\Ganesh\",\r\n  \"machineName\": \"DESKTOP-R7HECN0\",\r\n  \"processName\": \"TAPPTesting_Demo Environment\",\r\n  \"processVersion\": \"1.0.7317.26479\",\r\n  \"jobId\": \"24ee22c2-8434-4977-b4b8-86281fdb1d37\",\r\n  \"robotName\": \"Ganesh Laptop\",\r\n  \"machineId\": 156845,\r\n  \"fileName\": \"Main\",\r\n  \"activityInfo\": {\r\n    \"Activity\": \"System.Activities.Statements.Flowchart\",\r\n    \"DisplayName\": \"Flowchart\",\r\n    \"State\": \"Executing\",\r\n    \"Variables\": null,\r\n    \"Arguments\": null\r\n  }\r\n}",
                "RobotName": "Ganesh Laptop",
                "MachineId": 156845,
                "Id": 0
              },
              {
                "Level": "Trace",
                "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                "ProcessName": "TAPPTesting_Demo Environment",
                "TimeStamp": "2020-01-17T07:12:25.5005824Z",
                "Message": "LogInOrchestrator Executing",
                "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                "RawMessage": "{\r\n  \"message\": \"LogInOrchestrator Executing\",\r\n  \"level\": \"Verbose\",\r\n  \"logType\": \"Default\",\r\n  \"timeStamp\": \"2020-01-17T07:12:25.5005824+00:00\",\r\n  \"fingerprint\": \"a9b7a8b8-d106-48cc-8d5a-4682fb64d21b\",\r\n  \"windowsIdentity\": \"DESKTOP-R7HECN0\\\\Ganesh\",\r\n  \"machineName\": \"DESKTOP-R7HECN0\",\r\n  \"processName\": \"TAPPTesting_Demo Environment\",\r\n  \"processVersion\": \"1.0.7317.26479\",\r\n  \"jobId\": \"24ee22c2-8434-4977-b4b8-86281fdb1d37\",\r\n  \"robotName\": \"Ganesh Laptop\",\r\n  \"machineId\": 156845,\r\n  \"fileName\": \"Main\",\r\n  \"activityInfo\": {\r\n    \"Activity\": \"TAPP_UiPath_Library.LogInOrchestrator\",\r\n    \"DisplayName\": \"LogInOrchestrator\",\r\n    \"State\": \"Executing\",\r\n    \"Variables\": null,\r\n    \"Arguments\": {\r\n      \"statusMessage\": \"Abbyy Extraction completed\",\r\n      \"rpaStage\": \"Extraction\",\r\n      \"status\": \"TAPP Status\"\r\n    }\r\n  }\r\n}",
                "RobotName": "Ganesh Laptop",
                "MachineId": 156845,
                "Id": 0
              },
              {
                "Level": "Trace",
                "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                "ProcessName": "TAPPTesting_Demo Environment",
                "TimeStamp": "2020-01-17T07:12:26.1590628Z",
                "Message": "LogInOrchestrator Executing",
                "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                "RawMessage": "{\r\n  \"message\": \"LogInOrchestrator Executing\",\r\n  \"level\": \"Verbose\",\r\n  \"logType\": \"Default\",\r\n  \"timeStamp\": \"2020-01-17T07:12:26.1590628+00:00\",\r\n  \"fingerprint\": \"ef85ff32-f8aa-4479-a48c-ef1720969381\",\r\n  \"windowsIdentity\": \"DESKTOP-R7HECN0\\\\Ganesh\",\r\n  \"machineName\": \"DESKTOP-R7HECN0\",\r\n  \"processName\": \"TAPPTesting_Demo Environment\",\r\n  \"processVersion\": \"1.0.7317.26479\",\r\n  \"jobId\": \"24ee22c2-8434-4977-b4b8-86281fdb1d37\",\r\n  \"robotName\": \"Ganesh Laptop\",\r\n  \"machineId\": 156845,\r\n  \"fileName\": \"Main\",\r\n  \"activityInfo\": {\r\n    \"Activity\": \"TAPP_UiPath_Library.LogInOrchestrator\",\r\n    \"DisplayName\": \"LogInOrchestrator\",\r\n    \"State\": \"Executing\",\r\n    \"Variables\": null,\r\n    \"Arguments\": {\r\n      \"statusMessage\": \"Invoice is getting processed\",\r\n      \"rpaStage\": \"Processing\",\r\n      \"status\": \"TAPP Status\"\r\n    }\r\n  }\r\n}",
                "RobotName": "Ganesh Laptop",
                "MachineId": 156845,
                "Id": 0
              },
              {
                "Level": "Info",
                "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                "ProcessName": "TAPPTesting_Demo Environment",
                "TimeStamp": "2020-01-17T07:12:26.1710315Z",
                "Message": "{\"status\": \"TAPP Status\",\"rpaStatus\": \"Posting\",\"status message\": \"Invoice is getting posted\",\"ts\": \"01/17/2020 12:42:26\"}",
                "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                "RawMessage": "{\"status\": \"TAPP Status\",\"documentID\": \"doc_1575392290534_898aa9bb898\",\"rpaStatus\": \"Verification\",\"statusMessage\": \"Verification Started\",\"ts\":1580390392}",
                "RobotName": "Ganesh Laptop",
                "MachineId": 156845,
                "Id": 0
              },
              {
                "Level": "Trace",
                "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                "ProcessName": "TAPPTesting_Demo Environment",
                "TimeStamp": "2020-01-17T07:12:26.1733674Z",
                "Message": "Flowchart Closed",
                "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                "RawMessage": "{\r\n  \"message\": \"Flowchart Closed\",\r\n  \"level\": \"Verbose\",\r\n  \"logType\": \"Default\",\r\n  \"timeStamp\": \"2020-01-17T07:12:26.1733674+00:00\",\r\n  \"fingerprint\": \"ca06d4a9-3699-40a0-88a0-c89cace0c0a5\",\r\n  \"windowsIdentity\": \"DESKTOP-R7HECN0\\\\Ganesh\",\r\n  \"machineName\": \"DESKTOP-R7HECN0\",\r\n  \"processName\": \"TAPPTesting_Demo Environment\",\r\n  \"processVersion\": \"1.0.7317.26479\",\r\n  \"jobId\": \"24ee22c2-8434-4977-b4b8-86281fdb1d37\",\r\n  \"robotName\": \"Ganesh Laptop\",\r\n  \"machineId\": 156845,\r\n  \"fileName\": \"Main\",\r\n  \"activityInfo\": {\r\n    \"Activity\": \"System.Activities.Statements.Flowchart\",\r\n    \"DisplayName\": \"Flowchart\",\r\n    \"State\": \"Closed\",\r\n    \"Variables\": null,\r\n    \"Arguments\": null\r\n  }\r\n}",
                "RobotName": "Ganesh Laptop",
                "MachineId": 156845,
                "Id": 0
              },
              {
                "Level": "Info",
                "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                "ProcessName": "TAPPTesting_Demo Environment",
                "TimeStamp": "2020-01-17T07:12:25.9076654Z",
                "Message": "{\"status\": \"TAPP Status\",\"rpaStatus\": \"Extraction\",\"status message\": \"Abbyy Extraction completed\",\"ts\": \"01/17/2020 12:42:25\"}",
                "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                "RawMessage": "{\"status\": \"TAPP Status\",\"documentID\": \"doc_1575388755967_a9b8b8bba88\",\"rpaStatus\": \"Verification\",\"statusMessage\": \"Verification Started\",\"ts\":1580390392}",
                "RobotName": "Ganesh Laptop",
                "MachineId": 156845,
                "Id": 0
              }
            ]
        })
    }

    cloudAuthToken(req, res) {
        console.log("cloudAuthToken()", req.body, req.headers);
        res.send({
            "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlJUTkVOMEl5T1RWQk1UZEVRVEEzUlRZNE16UkJPVU00UVRRM016TXlSalUzUmpnMk4wSTBPQSJ9.eyJodHRwczovL3VpcGF0aC9lbWFpbCI6ImdhbmVzaC5tYWxseWFAdGFvYXV0b21hdGlvbi5jb20iLCJodHRwczovL3VpcGF0aC9lbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50LnVpcGF0aC5jb20vIiwic3ViIjoiYXV0aDB8NWNmYTI5ZWM1ZjA4ODQwZDFlYmU5ZWYyIiwiYXVkIjpbImh0dHBzOi8vb3JjaGVzdHJhdG9yLmNsb3VkLnVpcGF0aC5jb20iLCJodHRwczovL3VpcGF0aC5ldS5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNTc5MjQ1MDU1LCJleHAiOjE1NzkzMzE0NTUsImF6cCI6IjhERXYxQU1OWGN6VzN5NFUxNUxMM2pZZjYyaks5M241Iiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBvZmZsaW5lX2FjY2VzcyJ9.m9nm-7dY_qhAJq0CM8VaTqJB4ZKjO4QV6toUPViRusuIKpzV2X4QTdZM4ZNaIm-2kxd3HcVBbqEgeFf3geO1vMWGiyF5lC3xt0ALQ-havGbZdpQjt4tUxluK2vT6Okb8Mj7WPNnOOtjRpN08BsCm7KpYO4ar-JcJjkk5BuS8dWQjiXBHkS4pTBej2mfYSKVWOVqABaN13OxWEB_PD1JB-I4z2r1oNkdLvEt-uICtzsGtYXLqlqlUNRpy53PEoZ97MaYTWsjKitA1LiqOHpZn224aivtk0w8TVNDFLTUIjGTuqPcUKpwN6Q06qgBeUEUbUvMdfMTLgDSpmNUFQDd1yw",
            "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlJUTkVOMEl5T1RWQk1UZEVRVEEzUlRZNE16UkJPVU00UVRRM016TXlSalUzUmpnMk4wSTBPQSJ9.eyJodHRwczovL2Nsb3VkcnBhL3VzZXJpbmZvIjp7IndlbGNvbWVFbWFpbFN0YXR1cyI6IkRPTkUiLCJmaXJzdE5hbWUiOiJHYW5lc2giLCJsYXN0TmFtZSI6Ik1hbGx5YSIsImNvdW50cnkiOiJJbmRpYSIsImNvbXBhbnlOYW1lIjoiVGFvIEF1dG9tYXRpb24iLCJ0ZXJtc0FuZENvbmRpdGlvbnNBY2NlcHRlZCI6InRydWUiLCJhcHBsaWNhdGlvbnMiOlsiSjFUUWM3RXF3ZW83RDFST1QzUktrMW5ZUGlKZ2dsWjgiXX0sIm5pY2tuYW1lIjoiZ2FuZXNoLm1hbGx5YSIsIm5hbWUiOiJnYW5lc2gubWFsbHlhQHRhb2F1dG9tYXRpb24uY29tIiwicGljdHVyZSI6Imh0dHBzOi8vcy5ncmF2YXRhci5jb20vYXZhdGFyLzVkZTdlZmQ1ZDFkNzZiZjQyYTgxY2MzOWI4MmE0MzRhP3M9NDgwJnI9cGcmZD1odHRwcyUzQSUyRiUyRmNkbi5hdXRoMC5jb20lMkZhdmF0YXJzJTJGZ2EucG5nIiwidXBkYXRlZF9hdCI6IjIwMjAtMDEtMTdUMDY6NDI6MTMuNTg0WiIsImVtYWlsIjoiZ2FuZXNoLm1hbGx5YUB0YW9hdXRvbWF0aW9uLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczovL2FjY291bnQudWlwYXRoLmNvbS8iLCJzdWIiOiJhdXRoMHw1Y2ZhMjllYzVmMDg4NDBkMWViZTllZjIiLCJhdWQiOiI4REV2MUFNTlhjelczeTRVMTVMTDNqWWY2MmpLOTNuNSIsImlhdCI6MTU3OTI0NTA1NSwiZXhwIjoxNTc5MjgxMDU1fQ.jiyHQmkGFWEmJ0JvuaL4N57nb4Oe5mxFV0C01FqPkXD14Iv1aOIbXuFu7eLT2fhFveCje7LTIaSH3DqGJw9LzGlttdF8KH9nvQ7wEVjv89HnOuaaAd3wRTfa0a401QtfB4BVyzK9gTR5N8wRha87GrMfbvHYZGOoduUgLR26mISz-q8QUA0xgmoDwuiP8gZhfTN1QdE43UvtyJ2vlq22Dr2XtpJmlme1wgOsmgqCia9_GsIi2b2cx0WHz1siSjogUWUuCBm0lFfzP4bk6m8A-ODuMp_upwoaCLMyfhYikVu1g1ho6AfwWB3h9XipY5jbeZWPIgXiLnIA_RkqWGLZNQ",
            "scope": "openid profile email offline_access",
            "expires_in": 86400,
            "token_type": "Bearer"
        });
    }

    onPremiseGetLogs(req, res) {
        console.log("onPremiseGetLogs()", req.params, req.headers);
        if(req.headers['authorization'].indexOf('Rr24VaC0D6MkzFShb0gKqaw3vYUJSMmo4jJWk5crDYtSbZkxPFuOC9ApMEnug2q8WxEGPkVwmNoaSXzxOBwia1Ecrldg5BUXXErU_VNOo_yt7X_GDF8sMTyErSqO9Gfe7RSinIueQU6Q_axlY4jDnCP5r2LHrAJVdyM8Tg9x3WHnR8MOgeOl290uTsSOM1ezGG-OmFarRqFUPiN2-iE_mo1KNW-9AmT87-p1-ZYTusLaGyTS9jKVGtRhMjjB0l9VyOFvINhjptq8zotCo5cOOVWJeuvh-307ZdcUWHxkFTwoGDS_DpC4D7JrKfp4oWeSkA0SSy95RfzT8KRTmsJGQV0k8VD6HE3aa_7c-FGrCDjRVtDSkTgpQcQFrIXD8kT4P52a_18doKaSB-asQ8scYe_o73fCL4VtqLDb2ZWlAwEChVmorcFjbXnejxuAubjoKaoJH10gzc5_IiCPI8pM-Zm09Z5D1ljsNjWJ_LrmOR3dijuuKUGvCDtyCCCU_JrPRxmdYSXZmHHx_3joAux0-A') != -1) {
            console.log("### inside error ###");
            res.status(401)
            res.send({
                "message": "You are not authenticated!",
                "errorCode": 0,
                "result": null,
                "targetUrl": null,
                "success": false,
                "error": {
                    "code": 0,
                    "message": "You are not authenticated!",
                    "details": "You should be authenticated (sign in) in order to perform this operation.",
                    "validationErrors": null
                },
                "unAuthorizedRequest": false,
                "__abp": true
            })
        } else {
            console.log("### inside success ###");
            res.send({
                "@odata.context": "https://platform.uipath.com/TaoAuiiaewqd/TaoAutomatimage50917/odata/$metadata#RobotLogs",
                "@odata.count": 6,
                "value": [{
                    "Level": "Trace",
                    "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                    "ProcessName": "TAPPTesting_Demo Environment",
                    "TimeStamp": "2020-01-17T07:12:25.471538Z",
                    "Message": "Flowchart Executing",
                    "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                    "RawMessage": "{\r\n  \"message\": \"Flowchart Executing\",\r\n  \"level\": \"Verbose\",\r\n  \"logType\": \"Default\",\r\n  \"timeStamp\": \"2020-01-17T07:12:25.471538+00:00\",\r\n  \"fingerprint\": \"799ddbbc-0a48-4db2-b909-2a51a8d1ae5e\",\r\n  \"windowsIdentity\": \"DESKTOP-R7HECN0\\\\Ganesh\",\r\n  \"machineName\": \"DESKTOP-R7HECN0\",\r\n  \"processName\": \"TAPPTesting_Demo Environment\",\r\n  \"processVersion\": \"1.0.7317.26479\",\r\n  \"jobId\": \"24ee22c2-8434-4977-b4b8-86281fdb1d37\",\r\n  \"robotName\": \"Ganesh Laptop\",\r\n  \"machineId\": 156845,\r\n  \"fileName\": \"Main\",\r\n  \"activityInfo\": {\r\n    \"Activity\": \"System.Activities.Statements.Flowchart\",\r\n    \"DisplayName\": \"Flowchart\",\r\n    \"State\": \"Executing\",\r\n    \"Variables\": null,\r\n    \"Arguments\": null\r\n  }\r\n}",
                    "RobotName": "Ganesh Laptop",
                    "MachineId": 156845,
                    "Id": 0
                }, {
                    "Level": "Trace",
                    "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                    "ProcessName": "TAPPTesting_Demo Environment",
                    "TimeStamp": "2020-01-17T07:12:25.5005824Z",
                    "Message": "LogInOrchestrator Executing",
                    "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                    "RawMessage": "{\r\n  \"message\": \"LogInOrchestrator Executing\",\r\n  \"level\": \"Verbose\",\r\n  \"logType\": \"Default\",\r\n  \"timeStamp\": \"2020-01-17T07:12:25.5005824+00:00\",\r\n  \"fingerprint\": \"a9b7a8b8-d106-48cc-8d5a-4682fb64d21b\",\r\n  \"windowsIdentity\": \"DESKTOP-R7HECN0\\\\Ganesh\",\r\n  \"machineName\": \"DESKTOP-R7HECN0\",\r\n  \"processName\": \"TAPPTesting_Demo Environment\",\r\n  \"processVersion\": \"1.0.7317.26479\",\r\n  \"jobId\": \"24ee22c2-8434-4977-b4b8-86281fdb1d37\",\r\n  \"robotName\": \"Ganesh Laptop\",\r\n  \"machineId\": 156845,\r\n  \"fileName\": \"Main\",\r\n  \"activityInfo\": {\r\n    \"Activity\": \"TAPP_UiPath_Library.LogInOrchestrator\",\r\n    \"DisplayName\": \"LogInOrchestrator\",\r\n    \"State\": \"Executing\",\r\n    \"Variables\": null,\r\n    \"Arguments\": {\r\n      \"statusMessage\": \"Abbyy Extraction completed\",\r\n      \"rpaStage\": \"Extraction\",\r\n      \"status\": \"TAPP Status\"\r\n    }\r\n  }\r\n}",
                    "RobotName": "Ganesh Laptop",
                    "MachineId": 156845,
                    "Id": 0
                },{
                    "Level": "Trace",
                    "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                    "ProcessName": "TAPPTesting_Demo Environment",
                    "TimeStamp": "2020-01-17T07:12:26.1590628Z",
                    "Message": "LogInOrchestrator Executing",
                    "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                    "RawMessage": "{\r\n  \"message\": \"LogInOrchestrator Executing\",\r\n  \"level\": \"Verbose\",\r\n  \"logType\": \"Default\",\r\n  \"timeStamp\": \"2020-01-17T07:12:26.1590628+00:00\",\r\n  \"fingerprint\": \"ef85ff32-f8aa-4479-a48c-ef1720969381\",\r\n  \"windowsIdentity\": \"DESKTOP-R7HECN0\\\\Ganesh\",\r\n  \"machineName\": \"DESKTOP-R7HECN0\",\r\n  \"processName\": \"TAPPTesting_Demo Environment\",\r\n  \"processVersion\": \"1.0.7317.26479\",\r\n  \"jobId\": \"24ee22c2-8434-4977-b4b8-86281fdb1d37\",\r\n  \"robotName\": \"Ganesh Laptop\",\r\n  \"machineId\": 156845,\r\n  \"fileName\": \"Main\",\r\n  \"activityInfo\": {\r\n    \"Activity\": \"TAPP_UiPath_Library.LogInOrchestrator\",\r\n    \"DisplayName\": \"LogInOrchestrator\",\r\n    \"State\": \"Executing\",\r\n    \"Variables\": null,\r\n    \"Arguments\": {\r\n      \"statusMessage\": \"Invoice is getting processed\",\r\n      \"rpaStage\": \"Processing\",\r\n      \"status\": \"TAPP Status\"\r\n    }\r\n  }\r\n}",
                    "RobotName": "Ganesh Laptop",
                    "MachineId": 156845,
                    "Id": 0
                  },
                  {
                    "Level": "Info",
                    "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                    "ProcessName": "TAPPTesting_Demo Environment",
                    "TimeStamp": "2020-01-17T07:12:26.1710315Z",
                    "Message": "{\"status\": \"TAPP Status\",\"rpaStatus\": \"Posting\",\"status message\": \"Invoice is getting posted\",\"ts\": \"01/17/2020 12:42:26\"}",
                    "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                    "RawMessage": "{\"status\": \"TAPP Status\",\"documentID\": \"doc_1575391900948_9a98bbb9b8b\",\"rpaStatus\": \"Verification\",\"statusMessage\": \"Verification Started\",\"ts\":1580390392}",
                    "RobotName": "Ganesh Laptop",
                    "MachineId": 156845,
                    "Id": 0
                  },
                  {
                    "Level": "Trace",
                    "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                    "ProcessName": "TAPPTesting_Demo Environment",
                    "TimeStamp": "2020-01-17T07:12:26.1733674Z",
                    "Message": "Flowchart Closed",
                    "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                    "RawMessage": "{\r\n  \"message\": \"Flowchart Closed\",\r\n  \"level\": \"Verbose\",\r\n  \"logType\": \"Default\",\r\n  \"timeStamp\": \"2020-01-17T07:12:26.1733674+00:00\",\r\n  \"fingerprint\": \"ca06d4a9-3699-40a0-88a0-c89cace0c0a5\",\r\n  \"windowsIdentity\": \"DESKTOP-R7HECN0\\\\Ganesh\",\r\n  \"machineName\": \"DESKTOP-R7HECN0\",\r\n  \"processName\": \"TAPPTesting_Demo Environment\",\r\n  \"processVersion\": \"1.0.7317.26479\",\r\n  \"jobId\": \"24ee22c2-8434-4977-b4b8-86281fdb1d37\",\r\n  \"robotName\": \"Ganesh Laptop\",\r\n  \"machineId\": 156845,\r\n  \"fileName\": \"Main\",\r\n  \"activityInfo\": {\r\n    \"Activity\": \"System.Activities.Statements.Flowchart\",\r\n    \"DisplayName\": \"Flowchart\",\r\n    \"State\": \"Closed\",\r\n    \"Variables\": null,\r\n    \"Arguments\": null\r\n  }\r\n}",
                    "RobotName": "Ganesh Laptop",
                    "MachineId": 156845,
                    "Id": 0
                  },
                  {
                    "Level": "Info",
                    "WindowsIdentity": "DESKTOP-R7HECN0\\Ganesh",
                    "ProcessName": "TAPPTesting_Demo Environment",
                    "TimeStamp": "2020-01-17T07:12:25.9076654Z",
                    "Message": "{\"status\": \"TAPP Status\",\"rpaStatus\": \"Extraction\",\"status message\": \"Abbyy Extraction completed\",\"ts\": \"01/17/2020 12:42:25\"}",
                    "JobKey": "24ee22c2-8434-4977-b4b8-86281fdb1d37",
                    "RawMessage": "{\"status\": \"TAPP Status\",\"documentID\": \"doc_1575388635733_aab99bab989\",\"rpaStatus\": \"Verification\",\"statusMessage\": \"Verification Started\",\"ts\":1580390392}",
                    "RobotName": "Ganesh Laptop",
                    "MachineId": 156845,
                    "Id": 0
                  }
                ]
            })
        }
    }

    onPremiseAuthToken(req, res) {
        console.log("onPremiseAuthToken()", req.body, req.headers);
        res.send({
            "result": "Rr25VaC0D6MkzFShb0gKqaw3vYUJSMmo4jJWk5crDYtSbZkxPFuOC9ApMEnug2q8WxEGPkVwmNoaSXzxOBwia1Ecrldg5BUXXErU_VNOo_yt7X_GDF8sMTyErSqO9Gfe7RSinIueQU6Q_axlY4jDnCP5r2LHrAJVdyM8Tg9x3WHnR8MOgeOl290uTsSOM1ezGG-OmFarRqFUPiN2-iE_mo1KNW-9AmT87-p1-ZYTusLaGyTS9jKVGtRhMjjB0l9VyOFvINhjptq8zotCo5cOOVWJeuvh-307ZdcUWHxkFTwoGDS_DpC4D7JrKfp4oWeSkA0SSy95RfzT8KRTmsJGQV0k8VD6HE3aa_7c-FGrCDjRVtDSkTgpQcQFrIXD8kT4P52a_18doKaSB-asQ8scYe_o73fCL4VtqLDb2ZWlAwEChVmorcFjbXnejxuAubjoKaoJH10gzc5_IiCPI8pM-Zm09Z5D1ljsNjWJ_LrmOR3dijuuKUGvCDtyCCCU_JrPRxmdYSXZmHHx_3joAux0-A",
            "targetUrl": null,
            "success": true,
            "error": null,
            "unAuthorizedRequest": false,
            "__abp": true
        });
    }
}

module.exports = new MockService();
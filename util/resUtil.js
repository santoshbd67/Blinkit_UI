const fs = require("fs");
//=======================================
// Utility to Handle Response of Requests
//=======================================
class ResUtil {

    OK(res, apiParams, data) {
        // logger.info('success in util:', data);
        this.sendResponse(res, apiParams, data, 200);
    }

    ERROR(res, apiParams, data) {
        // logger.error('success in util:', data);
        this.sendResponse(res, apiParams, data, 500);
    }

    NOTALLOWED(res, apiParams, data) {
        this.sendResponse(res, apiParams, data, 409);
    }

    NOTFOUND(res, apiParams, data) {
        // logger.warn('not found:', data);
        this.sendResponse(res, apiParams, data, 404);
    }

    UNAUTHORIZED(res, apiParams, data) {
        // logger.warn('unauthorized', data);
        this.sendResponse(res, apiParams, data, 401);
    }

    BADREQUEST(res, apiParams, data) {
        // logger.warn('bad request', data);

        this.sendResponse(res, apiParams, data, 400);
    }

    sendResponse(res, apiParams, data, status) {
        res.status(status);
        res.send({
            id: apiParams && apiParams.id ? apiParams.id : '',
            ver: apiParams && apiParams.version ? apiParams.version : "1.0",
            ts: (new Date()).getTime(),
            params: {
                resmsgid: apiParams && apiParams.resmsgid ? apiParams.resmsgid : "",
                msgid: apiParams && apiParams.msgid ? apiParams.msgid : "",
                status: status == 200 ? "Success" : "Failed",
                err: apiParams && apiParams.err ? apiParams.err : "",
                errmsg: apiParams && apiParams.errmsg ? apiParams.errmsg : "",
                reason: apiParams && apiParams.reason ? apiParams.reason : ""
            },
            responseCode: status == 200 ? "OK" : "ERROR",
            result: data || {}
        });
    }

    handleError(req, res, data) {
        let apiParams = {
            id: req && req.body && req.body.id ? req.body.id : '',
            msgid: req && req.body && req.body.params ? req.body.params.msgid : "",
            err: data.err,
            errmsg: data.errmsg
        }
        if (data && data.reason == 'session expired') {
            apiParams['reason'] = data.reason;
            this.sendResponse(res, apiParams, undefined, data.status);
        }
        else {
            this.sendResponse(res, apiParams, undefined, data.status);
        }
    }
}

module.exports = new ResUtil();
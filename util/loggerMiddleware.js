const fs = require("fs");
const config = require("../config");
const dbutil = require("../util/db");
const db = dbutil.getDatabase(config.mongoDBName);
const userCollection = db.collection("users");
const sharedService = require("../services/sharedService");

const writeInFile = (data) => {
    if (data) {
        fs.appendFile("logger/userLogs.log", data + "\n" + "<-----------------END------------------>" + "\n\n", err => {
            if (err) {
                console.log(err);
            }
        });
    }
}

const getResponse = (body) => {
    let response;
    if (config.DETAILED_LOGS == 1) {
        response = body;
    }
    else {
        response = body.slice(0, config.LOGS_LENGTH) + '...';
    }
    return response;
}

const getRequestBody = (body) => {
    let requestBody;
    if (config.DETAILED_LOGS == 1) {
        requestBody = body;
    }
    else {
        requestBody = body.slice(0, config.LOGS_LENGTH) + '...';
    }
    return requestBody;
}

module.exports = (req, res, next) => {
    // Implement the middleware function based on the options object
    const oldWrite = res.write;
    const oldEnd = res.end;
    const chunks = [];

    res.write = (chunk, ...args) => {
        chunks.push(chunk);
        return oldWrite.apply(res, [chunk, ...args]);
    };

    res.end = (chunk, ...args) => {
        try {
            if (chunk) {
                chunks.push(chunk);
            }
            
            const body = Buffer.concat(chunks).toString('utf8');
            const { rawHeaders, httpVersion, method, socket, url } = req;
            const { remoteAddress, remoteFamily } = socket;

            let current_datetime = new Date();
            let formatted_date = current_datetime.getFullYear() + "-" + (current_datetime.getMonth() + 1) + "-" + current_datetime.getDate() + " " + current_datetime.getHours() + ":" + current_datetime.getMinutes() + ":" + current_datetime.getSeconds();
            let status = res.statusCode;
            let statusMessage = res.statusMessage;
            let requestBody = (method == 'POST') ? getRequestBody(JSON.stringify(req.body)) : JSON.stringify(req.body);
            let userToken = req.headers.userid;
            let emailId;
            if (userToken) {
                userCollection.findOne({ userId: userToken }, function (err, result) {
                    if (err) {
                        emailId = undefined;
                    } else if (!result) {
                        emailId = undefined;
                    } else {
                        let resultModified = JSON.parse(JSON.stringify(result));
                        emailId = sharedService.decrypt(resultModified.emailId);

                        let responseBody = getResponse(body);
                        let log = `[${formatted_date}] ${method}:${url} ${status} CalledBy:${emailId} RemoteAddress: ${remoteAddress} RequestBody: ${requestBody} ResponseSent:${responseBody}`;
                        writeInFile(log);
                        return oldEnd.apply(res, [chunk, ...args]);
                    }
                });
            }
            else {
                let responseBody = getResponse(body);
                let log = `[${formatted_date}] ${method}:${url} ${status} CalledBy:${emailId} RemoteAddress: ${remoteAddress} RequestBody: ${requestBody} ResponseSent:${responseBody}`;
                writeInFile(log);
                return oldEnd.apply(res, [chunk, ...args]);
            }
        } catch (error) {
            console.log("Error while writing logs:- ");
            console.log(error);
        }
    };
    next();
}
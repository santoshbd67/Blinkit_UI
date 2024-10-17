//var nodemailer = require('nodemailer');
const config = require("../config");
const resUtil = require("../util/resUtil");
const axios = require('axios');
const sharedService = require("./sharedService");

// var transporter = nodemailer.createTransport({
//     service: config.emailServiceProvider,
//     auth: {
//         user: config.senderEmailId,
//         pass: config.senderPassword
//     }
// });

/* written by Kanak
 * API for sending Email to the given EmailId. Following are the step performed in the API sequentially.
 * 1. Validate the request
 * 2. prepare mail Options
 * 3. Send email to the users given emailId and then return response
 */
module.exports.sendEmail = (req, res, callback, apiParams = {}, result = {}, subject = `Important from ${JSON.parse(config.projectConfigurations).projectName} admin`) => {

    const reqBody = req.body.userDetails;

    if (!(
        req.body &&
        typeof reqBody == "object" &&
        reqBody.emailId &&
        reqBody.message
    )) {
        apiParams.err = "Invalid Request";
        resUtil.BADREQUEST(res, apiParams, {});
        return;
    }

    // var mailOptions = {
    //     from: config.senderEmailId,
    //     to: reqBody.emailId,
    //     subject: subject,
    //     html: reqBody.message
    // };

    // transporter.sendMail(mailOptions, function(error, info) {
    //     if (error) {
    //         result.Message = error;
    //         resUtil.ERROR(res, apiParams, result);
    //     } else {
    //         result.Message = "Email sent successfully.";
    //         result.Details = info.response;
    //         resUtil.OK(res, apiParams, result);
    //     }
    // });

    let obj = [{
        "id": "3d34cc1f-baa0-4d2e-80b3-95a1834afe2f",
        "eventTime": "2021-12-21T23:59:14.7997564Z",
        "eventType": "Created",
        "dataVersion": "1.0",
        "metadataVersion": "1",
        "topic": "/subscriptions/3d34cc1f-baa0-4d2e-80b3-95a1834afe2f/resourceGroups/TAPP/providers/Microsoft.EventGrid/topics/paigesSendEmail",
        "subject": "Testing mail",
        "data": {
            "to": `${reqBody.emailId}`,
            "sub": subject,
            "body": `${reqBody.message}`
        }
    }]

    const headers = {
        'Content-Type': 'application/json',
        'aeg-sas-key': config.aegsaskey
    }

    axios.post(config.emailEndPoint, obj, { headers: headers })
        .then(function (response) {
            console.log(response);
            if (response && response.status == 200 && response.statusText == 'OK') {
                result.Message = "Email sent successfully.";
                result.Details = "Success";
                callback(null, result)
            } else {
                callback(null, { status: 201, msg: 'Email could not be sent.' })
            }
        })
        .catch(function (error) {
            console.log("Error in sendEmail method:- ");
            console.log(error);
            callback(null, { status: 500, reasron: error, msg: 'Email could not be sent.' })
        });
}
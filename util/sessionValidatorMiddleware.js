const tokenService = require("../services/tokenService");
const resUtil = require("../util/resUtil");

module.exports = (req, res, next) => {
    try {
        if (req.headers.token) {
            const token = req.headers.token;
            tokenService.validateToken(token, function (err, tokenRes) {
                if (err) { // Session expired
                    console.log("INSIDE SESSION VALIDATOR MIDDLEWARE IF BLOCK");
                    console.log("CURRENT REQUEST URL :- " + req.url);
                    console.log("REASON :- ");
                    console.log(err);
                    resUtil.handleError(req, res, err);
                }
                else {
                    next();
                }
            });
        }
        else {
            next();
        }
    } catch (error) {
        console.log(error);
        let err = {
            status: 500,
            err: "INTERNAL_SERVER_ERROR",
            errmsg: "error while validating session"
        }
        resUtil.handleError(req, res, err);
    }
}
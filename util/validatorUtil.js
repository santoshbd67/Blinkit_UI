const Joi = require('joi');
const _ = require('lodash')
const config = require('../config')
const validatorConfig = require('../validatorConfig/validatorConfig');
const logger = require('../logger/logger');

class ValidatorClass {
    constructor(config) {
        this.config = config;
    }
    validate(data, method, callback) {
        const schema = validatorConfig[method];
        Joi.validate(data, schema, (err, value) => {
            if (err) {
                callback({
                    status: 400,
                    err: "BAD_REQUEST",
                    errmsg: JSON.stringify(err.details)
                }, null);

            } else {
                callback(null, value);
            }
        });
    }

}
module.exports = new ValidatorClass(config);
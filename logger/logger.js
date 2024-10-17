const winston = require('winston');

const logger = winston;
console.log("Logger configured");
logger.configure({
    transports: [
        new winston.transports.File({
            filename: './logger/info.log',
            name: 'info-file',
            level: 'info'
        }),
        new winston.transports.File({
            filename: './logger/warn.log',
            name: 'warn-file',
            level: 'warn'
        }),
        new winston.transports.File({
            filename: './logger/error.log',
            name: 'error-file',
            level: 'error'
        })
    ]
});

//new winston.transports.Console(),  - for console

module.exports = logger;
const cron = require('node-cron');
const job = require('./scripts/updateDataToSql');

cron.schedule('0 */45 * * * *', function() {
    console.log(`running updateDataToSql task in every 45 minutes, now extecuting at ${new Date().toUTCString()}`);
    job(function(err, result) {
        console.log(`When updateDatatoSQL Cron job run completed at ${new Date().toUTCString()}, then Response was:- ", "err:", ${err}, "result:", ${result}`);
    })
});
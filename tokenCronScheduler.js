const cron = require('node-cron');
const job = require('./scripts/updateTokenData');

cron.schedule('*/1 * * * *', function () {
    console.log('running a task every 1 minutes', new Date());
    job(function (err, result) {
        console.log("token update job run completed", "err:", err, "result:", result);
    })
});
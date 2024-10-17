const cron = require('node-cron');
const job = require('./scripts/generateAnalyticsData');

cron.schedule('*/1 * * * *', function() {
    console.log('running a task every 1 minutes', new Date());
    job(function(err, result) {
        console.log("Analytics job run completed", "err:", err, "result:", result);
    })
});
const cron = require('node-cron');
const job = require('./scripts/reviewerDocStatusUpdate');

cron.schedule('0 */30 * * * *', function() {
    console.log('running a task every 30 minutes', new Date());
    job(function(err, result) {
        console.log("Reviewer Document Status Update Cron job run completed", "err:", err, "result:", result);
    })
});
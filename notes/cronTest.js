const CronJob = require('cron').CronJob;
const job = new CronJob('0 52 12 * * *', function() {
  console.log('Job1');
}, null, true, 'America/Los_Angeles');

const job2 = new CronJob('0 53 12 * * *', function() {
    console.log('Job2');
}, null, true, 'America/Los_Angeles');

job.start();
job2.start()
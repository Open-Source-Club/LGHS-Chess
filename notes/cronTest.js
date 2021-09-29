const express = require('express');
const cron = require('node-cron');

const app = express();

app.listen(2400, () => {console.log("Server started at port 2400")});

cron.schedule('0 7 10 * * *', () => {console.log("Task is running every minute " + new Date())});
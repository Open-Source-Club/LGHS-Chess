const express = require('express');
const cron = require('node-cron');

const app = express();

app.listen(2400, () => {console.log("Server started at port 2400")});

let production = true
const timeZone = new Date(new Date().toLocaleString('en-US', {timeZone : 'America/New_York'}))

const a = () =>{
    cron.schedule('0 48 9 * * *', () => {console.log(new Date(timeZone.getMinutes('en-US', {timeZone : 'America/Los_Angeles'})))}); //Tally and execute white move at 11:30
    cron.schedule('0 30 11 * * *', () => {console.log(`This ran at ${new Date()}`)}); //Tally and execute white move at 11:30
    cron.schedule('0 35 14 * * *', () => {console.log(`This ran at ${new Date()}`)});
    cron.schedule('0 35 8 * * *', () => {console.log(`This ran at ${new Date()}`)});
}

if (production === true){
    a()
}

console.log(timeZone.getHours())
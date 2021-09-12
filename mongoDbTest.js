const { MongoClient } = require('mongodb');
// or as an es module:
// import { MongoClient } from 'mongodb'

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
client.connect();
console.log('Connected successfully to server');

const db = client.db('lghsChess');
const collection = db.collection('users');

async function find() {
    const findResult = await collection.find({ dateTime: 10 }).toArray();
    for (const row of findResult) {
        console.log(row)
    }

    return 'done.';
}

async function find() {
    const findResult = await collection.find({ moves }).toArray();
    for (const row of findResult) {
        console.log(row)
    }

    return 'done.';
}

async function insert() {
    date = new Date()
    const insertResult = await collection.insertOne({
        email: 'stie4966@lgsstudent.org',
        moves: [{
            dateTime: {
                date: `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`,
                time: date.getHours()
            },
            move: {
                source: 'dick',
                target: 'balls'
            }
        }]
    });
    console.log('Inserted documents =>', insertResult);
}

async function findElem() {
    const findResult = await collection.find({
        moves: {
            $elemMatch: {
                'dateTime.date': "8-11-2021"
            }
        }
    }).toArray()

    for (const row of findResult) {
        //console.log(row)
        console.log(row.moves[0].dateTime.date)
    }

    return 'done.';
}
/*
find()
    .then(console.log)
    .catch(console.error)
*/

/*
insert()
    .then(console.log)
    .catch(console.error)
    .finally(() => client.close());
*/


findElem()
    .then(console.log)
    .catch(console.error)
    .finally(() => client.close()); 
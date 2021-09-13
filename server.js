const express = require('express');
const port = 4200;


const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
client.connect();
const db = client.db('lghsChess');

const app = express();
app.use(express.json())

app.use(express.static('boardScripts'));
app.use(express.static('boardDependencies/js'));
app.use(express.static('boardDependencies/css'));
app.use(express.static('boardDependencies/img/chesspieces/wikipedia'));

app.get('/', (req, res) => {
    res.sendFile( __dirname + '/board.html');
});

app.post('/', (req, res) => {
    console.log(req.body)
    console.log(req.body.email)
    checkAndInsert(req.body.email)
    res.send({response: "accepted"});
})

async function checkAndInsert(email){
    const collection = db.collection('users');
    
    let findResult = await collection.find({email: 'stie4966@lgsstudent.org'}).toArray();
    findResult = findResult[0]
    console.log(findResult)
    if (findResult != null){
        console.log('Email Exists');
    }
    else {
        console.log('Email Does Not Exist');
    }
}

app.listen(port, () => console.log(`This app is listening on port ${port}`));
const express = require('express');
const { MongoClient } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');

const port = 4200;
const url = 'mongodb://localhost:27017';
const mongoClient = new MongoClient(url);
const app = express();
mongoClient.connect();

const db = mongoClient.db('lghsChess');
app.use(express.json())

const oAuthClient = new OAuth2Client("827009005158-s5ut8d54ieh17torhvh4emdgtdgv0ptj.apps.googleusercontent.com");

app.use(express.static('boardScripts'));
app.use(express.static('boardDependencies/js'));
app.use(express.static('boardDependencies/css'));
app.use(express.static('boardDependencies/img/chesspieces/wikipedia'));

async function checkAndInsert(email) {
    const collection = db.collection('users');

    let findResult = await collection.find({ email: 'stie4966@lgsstudent.org' }).toArray();
    findResult = findResult[0]
    console.log(findResult)
    if (findResult != null) {
        console.log('Email Exists');
    }
    else {
        console.log('Email Does Not Exist');
    }
}

async function verify(idToken) {
    const ticket = await oAuthClient.verifyIdToken({
        idToken: idToken,
        audience: "827009005158-s5ut8d54ieh17torhvh4emdgtdgv0ptj.apps.googleusercontent.com",
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
    // If request specified a G Suite domain:
    const domain = payload['hd'];
    console.log(payload)
    console.log(userid)
    console.log(domain)
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/board.html');
});

app.post('/', (req, res) => {
    console.log(req.body)
    verify(req.body.idToken).catch(console.error)
    //console.log(req.body.email)
    //checkAndInsert(req.body.email)
    res.send({ response: "accepted" });
})



app.listen(port, () => console.log(`This app is listening on port ${port}`));
const express = require('express');
const { MongoClient } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');
const { Chess } = require('chess.js')

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

let chess = null
//{fen: "rnbqkbnr/pp1ppppp/8/2p5/2P5/3P4/PP2PPPP/RNBQKBNR b KQkq - 0 2", date: "9-21-2021"}
async function loadBoard(){
    const collection = db.collection('moves');
    const movesResult = await collection.find().toArray();

    chess = new Chess(movesResult.at(-1).fen);
    console.log('Board position: ' + chess.fen())
    
}
loadBoard()
async function checkAndInsert(verifiedUser, move){
    if (verifiedUser.domain != 'lgsstudent.org'){return 'Not school email';}

    const collection = db.collection('users');

    const date = new Date()
    const dateStr = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`

    const user = await collection.findOne({email: verifiedUser.email});

    if (user === null){
        await collection.insertOne({
            email: verifiedUser.email,
            name: verifiedUser.name,
            userId: verifiedUser.userId,
            moves: [{
                dateTime: {
                    date: dateStr,
                    time: date.getHours()
                },
                move: {
                    from: move.from,
                    to: move.to
                } 
            }]
        })

        return 'Inserted New User'
    }

    if (user.moves.at(-1).dateTime.date === dateStr){return 'Already Moved Today';}

    await collection.updateOne(
        {name: verifiedUser.name},
        {$addToSet: {
            moves:{
                dateTime: {
                    date: dateStr,
                    time: date.getHours()
                },
                move: {
                    from: move.from,
                    to: move.to
                } 
            }
        } 
    })

    return 'Inserted Move'
}

async function verify(idToken) {
    const ticket = await oAuthClient.verifyIdToken({
        idToken: idToken,
        audience: "827009005158-s5ut8d54ieh17torhvh4emdgtdgv0ptj.apps.googleusercontent.com",
    });
    const payload = ticket.getPayload();

    return {email: payload['email'], domain: payload['hd'], name: payload['name'], userId: payload['sub']}
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/board.html');
});

app.get('/boardPosition', (req, res) => {
    res.send({ fen: chess.fen() })
});

app.post('/', async (req, res) => {
    const verifiedUser = await verify(req.body.idToken).catch(console.error)
    console.log(verifiedUser)
    const queryResult = await checkAndInsert(verifiedUser, req.body.move)
    console.log(queryResult)

    res.send({ response: "accepted" });
})



app.listen(port, () => console.log(`This app is listening on port ${port}`));
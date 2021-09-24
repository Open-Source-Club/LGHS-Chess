const express = require('express');
const mongo = require('mongodb').MongoClient;
const { OAuth2Client } = require('google-auth-library');
const { Chess } = require('chess.js')

const port = 4200;
const url = 'mongodb://localhost:27017';
let mongoClient = null;
const app = express();

let db = null;
app.use(express.json())

const oAuthClient = new OAuth2Client("827009005158-s5ut8d54ieh17torhvh4emdgtdgv0ptj.apps.googleusercontent.com");

app.use(express.static('boardScripts'));
app.use(express.static('boardDependencies/js'));
app.use(express.static('boardDependencies/css'));
app.use(express.static('boardDependencies/img/chesspieces/wikipedia'));

let chess = null
//{fen: "r1bqkbnr/pp1ppppp/2n5/2p5/2P5/2NP4/PP2PPPP/R1BQKBNR b KQkq - 2 3", date: "9-21-2021"}
async function loadBoard(){
    
    mongoClient = await mongo.connect(url,
                                      {useUnifiedTopology: true,
                                       useNewUrlParser: true
                                    });
    db = mongoClient.db('lghsChess');
    
    const collection = db.collection('moves');
    const movesResult = await collection.find().toArray();

    chess = new Chess(movesResult.at(-1).fen);
    console.log('Board position: ' + chess.fen())
}

function verifyMove(validMoves, to){
    for (let i = 0; i < validMoves.length; i++) {
        if (validMoves[i].replace( /[A-Z]/, '') === to){return 'Valid'}
    }
    
    return 'Invaid'
}

async function checkAndInsert(verifiedUser, move){
    if (verifiedUser === undefined){return 'Invalid OAuth Sign In'}
    else if (verifiedUser.domain != 'lgsstudent.org'){return 'Not School Email';}
    else if (verifyMove(chess.moves({ square: move.from}), move.to) != 'Valid'){return 'Invalid move'}

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

    else if (user.moves.at(-1).dateTime.date === dateStr){return 'Already Moved Today';}

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
    res.send(chess.fen())
});

app.post('/', async (req, res) => {
    const verifiedUser = await verify(req.body.idToken).catch(console.error)
    console.log(verifiedUser)
    const queryResult = await checkAndInsert(verifiedUser, req.body.move)
    console.log(queryResult)

    res.send({ response: "accepted" });
})

loadBoard()
app.listen(port, () => console.log(`This app is listening on port ${port}`));

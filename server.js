const express = require('express');
const { MongoClient } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');
const { Chess } = require('chess.js')
const favicon = require('serve-favicon');

const port = 4200;
const url = 'mongodb://localhost:27017';
const mongoClient = new MongoClient(url);
const app = express();
mongoClient.connect();

const db = mongoClient.db('lghsChess');
app.use(express.json())
app.use(favicon(__dirname + '/favicon.ico'));

const oAuthClient = new OAuth2Client("827009005158-s5ut8d54ieh17torhvh4emdgtdgv0ptj.apps.googleusercontent.com");

app.use(express.static('boardScripts'));
app.use(express.static('boardDependencies/js'));
app.use(express.static('boardDependencies/css'));
app.use(express.static('boardDependencies/img/chesspieces/wikipedia'));

let chess = null
//{fen: "r1bqkbnr/pp1ppppp/2n5/2p5/2P5/2NP4/PP2PPPP/R1BQKBNR b KQkq - 2 3", date: "9-21-2021"}
async function loadBoard(){
    const collection = db.collection('moves');
    const movesResult = await collection.find().toArray();

    if (movesResult.length === 0){chess = new Chess(); console.log('Loaded New Board'); return}

    chess = new Chess(movesResult.at(-1).fen);
    console.log('Loaded Board: ' + chess.fen())
}

function verifyMove(move){
    const validMoves = chess.moves({square: move.from, verbose: true})
    for (v in validMoves){
        if (validMoves[v].to === move.to){return 'Valid'}
    }
    
    return 'Invaid'
}

async function checkAndInsert(verifiedUser, move){
    if (verifiedUser === undefined){return 'Invalid OAuth Sign In'}
    else if (!(verifiedUser.domain === 'lgsstudent.org' || verifiedUser.domain === undefined)){return 'Not School Email';}

    let collection = null
    if (chess.turn() === 'w'){
        if (verifiedUser.domain === 'lgsstudent.org'){collection = db.collection('lghsUsers');}
        else {return `Not ${verifiedUser.domain}'s Turn`}
    }
    else{
        if (verifiedUser.domain === undefined){collection = db.collection('shsUsers');}
        else {return `Not ${verifiedUser.domain}'s Turn`}
    }
 
    if (verifyMove(move) != 'Valid'){return 'Invalid move'}

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

async function verifyOAuth(idToken) {
    const ticket = await oAuthClient.verifyIdToken({
        idToken: idToken,
        audience: "827009005158-s5ut8d54ieh17torhvh4emdgtdgv0ptj.apps.googleusercontent.com",
    });
    const payload = ticket.getPayload();

    return {email: payload['email'], domain: payload['hd'], name: payload['name'], userId: payload['sub']}
}

function verifyRequest(form){
    try {
        if (typeof form.idToken === 'string' && typeof form.move.from === 'string' && typeof form.move.to === 'string'){return 'Valid Request'}
        else {return "Invalid Request"}
    }
    
    catch (error) {return "Invalid Request"}
}

async function tallyMoves(){ //tally and execute
    const date = new Date()
    const dateStr = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`

    let collection = null;
    if (chess.turn() === 'w'){collection = db.collection('lghsUsers');}
    else {collection = db.collection('shsUsers');}
    const votedUsers = await collection.find({
        moves: {
            $elemMatch: {
                'dateTime.date': dateStr
            }
        }
    }).toArray()
    
    let moveVotes = {}
    for (user in votedUsers){
        let moveStr = `${votedUsers[user].moves.at(-1).move.from},${votedUsers[user].moves.at(-1).move.to}`
    
        if (moveVotes.hasOwnProperty(moveStr)){moveVotes[moveStr] ++}
        else {moveVotes[moveStr] = 1;}
    }

    let finalMove = `${votedUsers[0].moves.at(-1).move.from},${votedUsers[0].moves.at(-1).move.to}` //find move with highest votes
    for (move in moveVotes){
        if (moveVotes[move] > moveVotes[finalMove]){finalMove = move}
    }

    let equallyVoted = [] //check if any moves got the same ammount of votes
    for (move in moveVotes){
        if (moveVotes[move] === moveVotes[finalMove]){equallyVoted.push(move);}
    }

    if (equallyVoted.length > 1){finalMove = equallyVoted[Math.floor(Math.random() * equallyVoted.length)]}

    return finalMove
}

async function executeMove(move){
    move = move.split(',')
    const moveResult = chess.move({from: move[0], to: move[1], promotion: 'q'})
    await db.collection('moves').insertOne({fen: chess.fen(), move: moveResult, date: dateStr})

    return `Executed Move: ${finalMove}`
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/board.html');
});

app.get('/boardPosition', (req, res) => {
    res.send(chess.fen())
});

app.post('/', async (req, res) => {
    if (verifyRequest(req.body) != 'Valid Request'){
        console.log('Invalid Request')
        res.send({ response: "Invalid Request" })
        return 'Invalid Request'
    }

    const verifiedUser = await verifyOAuth(req.body.idToken).catch(console.error)
    console.log(verifiedUser)

    const result = await checkAndInsert(verifiedUser, req.body.move)
    console.log(result)

    if (!(result === 'Inserted New User' || result === 'Inserted Move')){res.status(405);}
    res.send({response: result});
})

app.post('/testPost', async (req, res) => {
    const finalMove = await tallyAndExecute()

    console.log(finalMove)

    res.send({ response: "test" });
})

loadBoard()
app.listen(port, () => console.log(`This app is listening on port ${port}`));

//scheduling for even days
//cron.schedule('0 30 11 * * *', () => {tallyAndExecute(); console.log("Executed Move At " + new Date())});  //voting from 8:30 - 11-30
//cron.schedule('0 35 14 * * *', () => {tallyAndExecute(); console.log("Executed Move At " + new Date())});  //voting from 11:30 - 2:45
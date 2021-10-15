const express = require('express');
const mongo = require('mongodb').MongoClient;
const { OAuth2Client } = require('google-auth-library');
const { Chess } = require('chess.js')
const favicon = require('serve-favicon');
const axios = require('axios')

const OAuthId = "801666125404-bdn8r27m3d7ngriifuodeq7ajnc17kjl.apps.googleusercontent.com"
const userWebhookUrl = 'https://discord.com/api/webhooks/898002048660963349/UFLsplp92OjrGnyYB6XykDkG3AeO3wP9qreJFR4CXwpVBCZAqfUVoNuehbVrD2zhDIPo'
const moveWebhookUrl = 'https://discord.com/api/webhooks/898002513394040832/n8jthPgUiZiW6ou9mDUoOIC-pikV-H55A5aTSuU93kvV210jj0ZbfoR7T2w6e7_HlyKz'

const port = 4200;
var mongoClient = null;
const app = express();

// If we are running in a Docker container, adjust the hostname
const dbHost = process.env.DATABASE_HOST || 'localhost';
var url = 'mongodb://' + dbHost + ':27017';

var db = null;
app.use(express.json())
app.use(favicon(__dirname + '/favicon.ico'));

const oAuthClient = new OAuth2Client(OAuthId);

app.use(express.static('boardScripts'));
app.use(express.static('boardDependencies/js'));
app.use(express.static('boardDependencies/css'));
app.use(express.static('boardDependencies/img/chesspieces/wikipedia'));

let chess = null
let pendingMove = []
//{fen: "r1bqkbnr/pp1ppppp/2n5/2p5/2P5/2NP4/PP2PPPP/R1BQKBNR b KQkq - 2 3", date: "9-21-2021"}
async function loadBoard(){
    mongoClient = await mongo.connect(url, {useUnifiedTopology: true, useNewUrlParser: true})
    db = mongoClient.db('lghsChess')

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
    
    return 'Invalid'
}

async function checkAndInsert(verifiedUser, move){
    if (verifiedUser === undefined){return 'Invalid OAuth Sign In'}
    else if (!(verifiedUser.domain === 'lgsstudent.org' || verifiedUser.domain === undefined)){return 'Not School Email';}

    let collection = null
    if (chess.turn() === 'w'){
        if (verifiedUser.domain === 'lgsstudent.org'){collection = db.collection('lghsUsers');}
        else {return `Not ${verifiedUser.domain} Account`}
    }
    else{
        if (verifiedUser.domain === undefined){collection = db.collection('shsUsers');}
        else {return `Not ${verifiedUser.domain} Account`}
    }

    if (verifyMove(move) != 'Valid'){return 'Invalid move'}
    
    const date = new Date()
    const dateStr = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`
    const hours = date.getHours()

    const user = await collection.findOne({email: verifiedUser.email});

    if (user === null){
        await collection.insertOne({
            email: verifiedUser.email,
            name: verifiedUser.name,
            userId: verifiedUser.userId,
            moves: [{
                dateTime: {
                    date: dateStr,
                    time: hours
                },
                move: {
                    from: move.from,
                    to: move.to
                } 
            }]
        })
        userWebhook(verifiedUser.name, move)
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

    userWebhook(verifiedUser.name, move)
    return 'Inserted Move'
}

async function verifyOAuth(idToken) {
    const ticket = await oAuthClient.verifyIdToken({
        idToken: idToken,
        audience: OAuthId,
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

    pendingMove = [finalMove, dateStr]
}

async function executeMove(){
    move = pendingMove[0].split(',')
    await userWebhook(null, move)
    const moveResult = chess.move({from: move[0], to: move[1], promotion: 'q'})
    await db.collection('moves').insertOne({fen: chess.fen(), move: moveResult, date: pendingMove[1]})

    pendingMove = []
    return `Executed Move: ${move}`
}

async function userWebhook(name, move){
    const date = new Date()
    const dateStr = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`
    const turn = chess.turn()

    color1 = turn === 'w' ? 0xfe5002 : 0xc72027
    color2 = null
    if (name === null){
        from = move[0]
        to = move[1]
        if (turn === 'w'){
            name = 'Los Gatos'
            color1 = 0xfe5002
            color2 = 0xffffff
        }
        else {
            name = 'Saratoga'
            color1 = 0xc72027
            color2 = 0x000000
        }
    }
    else {from = move.from; to = move.to}

    data = {
        username: name,
        embeds: [{
            title: `Click To See ${name}'s Move`,
            url: `http://localhost:4200/boardView?name=${name}&date=${dateStr}&from=${from}&to=${to}&fen=${chess.fen()}`.split(" ").join("$"),
            color: color2 === null ? color1 : color2,
            fields: [
                {
                    name: "From:",
                    value: from,
                    inline: true
                },
                {
                    name: "To:",
                    value: to,
                    inline: true
                }
            ],
            "timestamp": date
        }]
    }

    axios
        .post(userWebhookUrl, data)
        .then(res => {
        console.log(`statusCode: ${res.status}`)
        })
        .catch(error => {
        console.error(error)
        })

    if (color2 === null){return 'Sent User Webhook'}
    data.embeds[0].color = color1
    axios
        .post(moveWebhookUrl, data)
        .then(res => {
        console.log(`statusCode: ${res.status}`)
        })
        .catch(error => {
        console.error(error)
        })

}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/board.html');
});

app.get('/boardPosition', (req, res) => {
    res.send(chess.fen())
});

app.get('/boardView', (req, res) => {
    res.sendFile(__dirname + '/boardView.html');
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
    res.send(result);
})

app.post('/testPost', async (req, res) => {
    await tallyMoves()
    const response = await executeMove()

    console.log(response)
    res.send(response);
})

loadBoard()
app.listen(port, () => console.log(`This app is listening on port ${port}`));

//scheduling for even days
//cron.schedule('0 30 11 * * *', () => {await tallyMoves(); await executeMove(); console.log("Executed Move At " + new Date())}); //Tally and execute white move at 11:30
//cron.schedule('0 35 14 * * *', () => {await tallyMoves(); console.log("Executed Move At " + new Date())}); //voting from 11:30 - 2:45 //Tally black move at 2:45
//cron.schedule('0 35 8 * * *', () => {await executeMove(); console.log("Executed Move At " + new Date())}); //voting from 11:30 - 2:45 //Execute black move at 8:30 the next day

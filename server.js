const express = require('express')
const axios = require('axios')
const cron = require('node-cron')
const favicon = require('serve-favicon')
const { Chess } = require('chess.js')
const { MongoClient } = require('mongodb')
const { OAuth2Client } = require('google-auth-library')

try{var config = require('./myConfig.json')}
catch(error){var config = require('./config.json')}

const app = express()
const port = 8080

app.use(express.json())
app.use(favicon(__dirname + '/favicon.ico'))

const oAuthClient = new OAuth2Client(config.OAuthId)

app.use(express.static('boardScripts'))
app.use(express.static('boardDependencies/js'))
app.use(express.static('boardDependencies/css'))
app.use(express.static('boardDependencies/img/chesspieces/wikipedia'))

let chess = null
let pendingMove = []

const schoolWColors = [Number(config.schoolW.color1), Number(config.schoolW.color2)]
const schoolBColors = [Number(config.schoolB.color1), Number(config.schoolB.color2)]

let movesDB
let whiteUsersDB
let blackUsersDB
async function mongoConnect(){
    const client = await MongoClient.connect(config.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })

    const db = client.db('lghsChess')
    movesDB = db.collection('moves')
    whiteUsersDB = db.collection(`${config.schoolW.nameAbrv.toLowerCase()}Users`)
    blackUsersDB = db.collection(`${config.schoolB.nameAbrv.toLowerCase()}Users`)
}

async function loadBoard(){
    const movesResult = await movesDB.find().toArray()
    if (movesResult.length === 0){chess = new Chess(); console.log('Loaded New Board'); return}

    chess = new Chess(movesResult.at(-1).fen)
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
    else if (!(verifiedUser.domain === config.schoolW.domain || verifiedUser.domain === config.schoolB.domain)){return 'Not School Email'}

    let collection
    if (chess.turn() === 'w'){
        if (verifiedUser.domain === config.schoolW.domain){collection = whiteUsersDB}
        else {return `Not ${config.schoolB.nameAbrv}'s Turn, Reload `}
    }
    else{
        if (verifiedUser.domain === config.schoolB.domain){collection = blackUsersDB}
        else {return `Not ${config.schoolW.nameAbrv}'s Turn, Reload`}
    }

    if (verifyMove(move) != 'Valid'){return 'Invalid move'}

    const date = new Date(new Date().toLocaleString('en-US', {timeZone : 'America/Los_Angeles'}))
    const dateStr = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`
    const hours = date.getHours()

    const user = await collection.findOne({email: verifiedUser.email})

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

    else if (user.moves.at(-1).dateTime.date === dateStr){return 'Already Moved Today'}

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
        audience: config.OAuthId,
    });
    const payload = ticket.getPayload();

    return {email: payload['email'], domain: payload['email'].split('@')[1], name: payload['name'], userId: payload['sub']}
}

function verifyRequest(form){
    try {
        if (typeof form.idToken === 'string' && typeof form.move.from === 'string' && typeof form.move.to === 'string'){return 'Valid Request'}
        else {return 'Invalid Request'}
    }

    catch (error) {return "Invalid Request"}
}

async function tallyMoves(){ //tally and execute
    const date = new Date(new Date().toLocaleString('en-US', {timeZone : 'America/Los_Angeles'}))
    const dateStr = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`

    let collection
    if (chess.turn() === 'w'){collection = whiteUsersDB}
    else {collection = blackUsersDB}
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
        else {moveVotes[moveStr] = 1}
    }

    let finalMove = `${votedUsers[0].moves.at(-1).move.from},${votedUsers[0].moves.at(-1).move.to}` //find move with highest votes
    for (move in moveVotes){
        if (moveVotes[move] > moveVotes[finalMove]){finalMove = move}
    }

    let equallyVoted = [] //check if any moves got the same ammount of votes
    for (move in moveVotes){
        if (moveVotes[move] === moveVotes[finalMove]){equallyVoted.push(move)}
    }

    if (equallyVoted.length > 1){finalMove = equallyVoted[Math.floor(Math.random() * equallyVoted.length)]}

    pendingMove = [finalMove, dateStr]
    console.log(`Tally Result: ${finalMove}`)
}

async function executeMove(){
    move = pendingMove[0].split(',')
    await userWebhook(null, move)

    const moveResult = chess.move({from: move[0], to: move[1], promotion: 'q'})
    await movesDB.insertOne({fen: chess.fen(), move: moveResult, date: pendingMove[1]})

    pendingMove = []
    console.log(`Executed Move: ${move}`)
}

async function userWebhook(name, move){
    const date = new Date(new Date().toLocaleString('en-US', {timeZone : 'America/Los_Angeles'}))
    const dateStr = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`
    const turn = chess.turn()

    color1 = turn === 'w' ? schoolWColors[0] : schoolBColors[0]
    color2 = null
    if (name === null){
        from = move[0]
        to = move[1]
        if (turn === 'w'){
            name = config.schoolW.name
            color2 = schoolWColors[1]
        }
        else {
            name = config.schoolB.name
            color2 = schoolBColors[1]
        }
    }
    else {from = move.from; to = move.to}

    data = {
        username: name,
        embeds: [{
            title: `Click To See ${name}'s Move`,
            url: `${config.domain}/boardView?name=${name}&date=${dateStr}&from=${from}&to=${to}&fen=${chess.fen()}`.split(' ').join('$'),
            color: color2 === null ? color1 : color2,
            fields: [
                {
                    name: 'From:',
                    value: from,
                    inline: true
                },
                {
                    name: 'To:',
                    value: to,
                    inline: true
                }
            ],
            'timestamp': date
        }]
    }

    axios
        .post(config.userWebhookUrl, data)
        .then(res => {
        console.log(`statusCode: ${res.status}`)
        })
        .catch(error => {
        console.error(error)
        })

    if (color2 === null){return 'Sent User Webhook'}
    data.embeds[0].color = color1
    axios
        .post(config.moveWebhookUrl, data)
        .then(res => {
        console.log(`statusCode: ${res.status}`)
        })
        .catch(error => {
        console.error(error)
        })

}

async function scheculeCron(){
    if (config.production != true){console.log('Not Production'); return}

    cron.schedule('0 30 11 * * *', async () => {await tallyMoves(); await executeMove(); await countdown("end");}) //11:30
    cron.schedule('0 35 14 * * *', async () => {await tallyMoves()}) // 2:35
    cron.schedule('0 30 8 * * *', async () => {await executeMove()}) //8:30
    console.log('Scheduled Cron')
}

app.get('/', (req, res) => {res.sendFile(__dirname + '/board.html')})
app.get('/fetchData', (req, res) => {res.json({fen: chess.fen(), OAuthId: config.OAuthId, schoolW: config.schoolW, schoolB: config.schoolB})})
app.get('/boardView', (req, res) => {res.sendFile(__dirname + '/boardView.html')})

app.post('/', async (req, res) => {
    if (verifyRequest(req.body) != 'Valid Request'){
        console.log('Invalid Request')
        res.send('Invalid Request')
        return 'Invalid Request'
    }

    const verifiedUser = await verifyOAuth(req.body.idToken).catch(console.error)
    console.log(verifiedUser)

    const result = await checkAndInsert(verifiedUser, req.body.move)
    console.log(result)

    if (!(result === 'Inserted New User' || result === 'Inserted Move')){res.status(405)}
    res.send(result)
})

app.post('/testPost', async (req, res) => {
    await tallyMoves()
    await executeMove()
    res.send('Tallied and Executed')
})

;(async () => {
   await mongoConnect()
   await loadBoard()

   app.listen(port, () => console.log(`This app is listening on port ${port}`))
   scheculeCron()
})()

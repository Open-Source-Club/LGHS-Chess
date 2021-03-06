const express = require('express')
const request = require('request');
const CronJob = require('cron').CronJob
const { Chess } = require('chess.js')
const { MongoClient } = require('mongodb')
const { OAuth2Client } = require('google-auth-library')
const puppeteer = require('puppeteer');
const fs = require('fs')

try{var config = require('./myConfig.json')}
catch(error){var config = require('./config.json')}

const app = express()
app.use(express.json())

const oAuthClient = new OAuth2Client(config.OAuthId)
let gameStarted = false
let gameOver;

app.use(express.static('scripts'))
app.use(express.static('node_modules/chess.js'))
app.use(express.static('node_modules/@chrisoakman/chessboardjs/dist'))
app.use(express.static('images'))

let chess = null
let pendingMove = []
const pieceMap = {
    k: 'King',
    q: 'Queen',
    r: 'Rook',
    b: 'Bishop',
    n: 'Knight',
    p: 'Pawn'
}

const schoolWColors = [Number(config.schoolW.color1), Number(config.schoolW.color2)]
const schoolBColors = [Number(config.schoolB.color1), Number(config.schoolB.color2)]

let movesDB
let whiteUsersDB
let blackUsersDB
async function mongoConnect(){
    console.log('Connecting To MongoDB...')
    const client = await MongoClient.connect(config.mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    
    const db = client.db('lghsChess')
    movesDB = db.collection('moves')
    whiteUsersDB = db.collection(`${config.schoolW.nameAbrv.toLowerCase()}Users`)
    blackUsersDB = db.collection(`${config.schoolB.nameAbrv.toLowerCase()}Users`)
}

let browser;
async function startBrowser(){
    console.log('Launching Browser...')
    browser = await puppeteer.launch({ 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage'
        ]
    });
    browser = await browser.newPage();
    browser.setViewport({ width: 500, height: 500 })
}

async function loadBoard(){
    const movesResult = await movesDB.find().toArray()
    if (movesResult.length === 0){chess = new Chess(); console.log('Loaded New Board'); return}

    chess = new Chess(movesResult.at(-1).fen)
    gameOver = chess.game_over()
    console.log('Loaded Board: ' + chess.fen())
}

function verifyMove(move){
    const validMoves = chess.moves({square: move.from, verbose: true})
    for (v in validMoves){
        if (validMoves[v].to === move.to){return 'Valid'}
    }
    
    return 'Invalid'
}

async function moveWebhook(name, move){
    const date = new Date()

    const turn = chess.turn()
    const color1 = turn === 'w' ? schoolWColors[0] : schoolBColors[0]
    let color2 = null
    
    let from;
    let to;
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

    const fileName = `${name}_${Date.now()}.png`.split(' ').join('')
    if(config.production){
        await browser.goto(`https://${config.domain + config.reverseProxyEndpoint}/boardView?fen=${chess.fen()}&from=${from}&to=${to}`.split(' ').join('$'))
    }
    else{
        await browser.goto(`http://localhost/boardView?fen=${chess.fen()}&from=${from}&to=${to}`.split(' ').join('$'))
    }
    await browser.screenshot({path: `boardCaptures/${fileName}`});

    const requestData = {
        method: 'POST',
        url: config.userWebhookUrl,
        headers: {'Content-Type': 'multipart/form-data'},
        formData : {
            file1 : fs.createReadStream(`boardCaptures/${fileName}`),
            payload_json: JSON.stringify({
                embeds: [{
                    title: `${name}: ${pieceMap[chess.get(from).type]} ??? ${to.toUpperCase()}`,
                    color: color2 === null ? color1 : color2,
                    image: {
                        url: `attachment://${fileName}`
                    },
                    timestamp: date
                }]
            })
        }
    }

    request(requestData, function (err, res) {
        if (err) console.log("User Move Webhook Error")
        else console.log(`Sent User Move Webhook: ${res.statusCode}`)
    })

    if (color2 === null) return
    requestData.url = config.schoolWebhookUrl
    requestData.formData.payload_json = JSON.stringify({
        embeds: [{
            title: `${name}: ${pieceMap[chess.get(from).type]} ??? ${to.toUpperCase()}`,
            color: color1,
            image: {
                url: `attachment://${fileName}`
            },
            timestamp: date
        }]
    })

    request(requestData, function (err, res) {
        if (err) console.log("School Move Webhook Error")
        else console.log(`Sent School Move Webhook: ${res.statusCode}`)
    })
}

async function turnWebhook(){
    const roldID = chess.turn() === 'w' ? config.schoolB.roleID : config.schoolW.roleID
    const requestData = {
        method: 'POST',
        url: config.turnWebhookUrl,
        headers: {'Content-Type': 'application/json'},
        formData : {
            content: `<@&${roldID}> Your Move`
        }
    }

    request(requestData, function (err, res) {
        if (err) console.log("Turn Notification Webhook Error")
        else console.log(`Sent Turn Notification Webhook: ${res.statusCode}`)
    })
}

async function checkAndInsert(verifiedUser, move){
    if (pendingMove.length != 0){return 'Already Pending Move'}
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
    const user = await collection.findOne({email: verifiedUser.email})

    if (user === null){
        await collection.insertOne({
            email: verifiedUser.email,
            name: verifiedUser.name,
            userId: verifiedUser.userId,
            moves: [{
                date: dateStr,
                move: {
                    from: move.from,
                    to: move.to
                } 
            }]
        })
        moveWebhook(verifiedUser.name, move)
        return 'Inserted New User'
    }

    else if (user.moves.at(-1).date === dateStr && config.production == true){return 'Already Moved Today'}

    await collection.updateOne(
        {name: verifiedUser.name},
        {$addToSet: {
            moves:{
                date: dateStr,
                move: {
                    from: move.from,
                    to: move.to
                } 
            }
        } 
    })

    moveWebhook(verifiedUser.name, move)
    return 'Inserted Move'
}

async function verifyOAuth(idToken) {
    const ticket = await oAuthClient.verifyIdToken({
        idToken: idToken,
        audience: config.OAuthId,
    })
    const payload = ticket.getPayload()
    
    return {email: payload['email'], domain: payload['email'].split('@')[1], name: payload['name'], userId: payload['sub']}
}

function verifyRequest(form){
    try {
        if (typeof form.idToken === 'string' && typeof form.move.from === 'string' && typeof form.move.to === 'string'){return 'Valid Request'}
        else {return 'Invalid Request'}
    }
    
    catch (error) {return 'Invalid Request'}
}

async function tallyMoves(){
    const date = new Date(new Date().toLocaleString('en-US', {timeZone : 'America/Los_Angeles'}))
    const dateStr = `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`

    let collection
    if (chess.turn() === 'w'){collection = whiteUsersDB}
    else {collection = blackUsersDB}
    const votedUsers = await collection.find({
        moves: {
            $elemMatch: {
                date: dateStr
            }
        }
    }).toArray()
    if (votedUsers.length === 0){console.log('No Moves To Tally'); return}

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

async function startCron(){
    if (gameOver) return
    whiteMoveCron = new CronJob(`0 ${config.schoolW.moveTime[1]} ${config.schoolW.moveTime[0]} * * *`, async function() {
        await tallyMoves(); await executeMove()}, 
        null, true, 'America/Los_Angeles')

    blackTallyCron = new CronJob(`0 ${config.schoolB.tallyTime[1]} ${config.schoolB.tallyTime[0]} * * *`, async function() {
        await tallyMoves()},
        null, true, 'America/Los_Angeles')

    blackExecuteCron = new CronJob(`0 ${config.schoolB.executeTime[1]} ${config.schoolB.executeTime[0]} * * *`, async function() {
        await executeMove()},
        null, true, 'America/Los_Angeles')

    whiteMoveCron.start()
    blackTallyCron.start()
    blackExecuteCron.start()
    console.log('Scheduled Cron Jobs')
}

async function stopCron(){
    if (config.production === false) return
    whiteMoveCron.stop()
    blackTallyCron.stop()
    blackExecuteCron.stop()
    console.log('Stopped Cron Jobs')
}

async function executeMove(){
    if (pendingMove.length != 0){
        move = pendingMove[0].split(',')
    }
    else {
        possibleMoves = chess.moves({verbose: true})
        randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
        move = [randomMove.from, randomMove.to]
        console.log('No Pending Move, Executing Random Move')
    }

    await moveWebhook(null, move)
    turnWebhook()
    clearBoardCaptures()

    const moveResult = chess.move({from: move[0], to: move[1], promotion: 'q'})
    await movesDB.insertOne({fen: chess.fen(), move: moveResult, date: pendingMove[1]})

    pendingMove = []
    console.log(`Executed Move: ${move}`)

    gameOver = chess.game_over()
    if (gameOver){
        console.log('Game Over')
        stopCron()
    }
}

async function clearBoardCaptures(){
    fs.readdir('boardCaptures', (err, files) => {
        for (const file of files) {
            if (file.split('.')[1] != 'png') continue
            fs.unlink(`boardCaptures/${file}`, err => {if (err) throw err})
        }
    })
}

function gameStartCheck(){
    if (gameOver) {console.log('Game Over'); return}
    const dateNow = new Date(new Date().toLocaleString('en-US', {timeZone : 'America/Los_Angeles'}))
    const startDateMs = new Date(
        new Date(
            dateNow.getFullYear(), config.gameStartDate[0], config.gameStartDate[1], config.gameStartDate[2], config.gameStartDate[3], 0, 0
        ).toLocaleString('en-US', {timeZone : 'America/Los_Angeles'})
    )

    if (startDateMs - dateNow.getTime() > 0){
        console.log('Waiting For Game To Start')
        
        const cronStr = `0 ${config.gameStartDate[3].toString()} ${config.gameStartDate[2].toString()} ${config.gameStartDate[1].toString()} ${config.gameStartDate[0].toString()} *`
        const startGame = new CronJob(cronStr, function() {
            gameStarted = true
            startCron()
            console.log('Game Started')
            
            startGame.stop()
        }, null, true, 'America/Los_Angeles')

        startGame.start()
        return
    }

    gameStarted = true
    startCron()
    console.log('Game Started')
}

function enableTestMove(){
    app.post('/testMove', async (req, res) => {
        if (gameOver){
            res.send('Game Is Over')
            return
        }
        await tallyMoves()
        await executeMove()
        res.send('Tallied and Executed')
    })  
}

app.get('/', (req, res) => {
    if (gameStarted === true){res.sendFile(__dirname + '/html/board.html')}
    else {res.sendFile(__dirname + '/html/waitPage.html')}
})

app.post('/', async (req, res) => {
    if (gameOver){
        res.send('Game Is Over')
        return
    }
    else if (verifyRequest(req.body) != 'Valid Request'){
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

app.get('/fetchData', (req, res) => {res.json({fen: chess.fen(), OAuthId: config.OAuthId, schoolW: config.schoolW, schoolB: config.schoolB, gameStartDate: config.gameStartDate})})
app.get('/boardView', (req, res) => {res.sendFile(__dirname + '/html/boardView.html')})

;(async () => {
    await mongoConnect()
    await loadBoard()
    await startBrowser()
    if (!fs.existsSync('boardCaptures')) {
        fs.mkdirSync('boardCaptures')
    }

    console.log('Starting HTTP Server...')
    app.listen(8080)
    
    if (config.production === true){console.log('Production: True'); gameStartCheck()}
    else{
        console.log('Production: False')
        enableTestMove()
        gameStarted = true
        gameOver ? console.log('Game Over') : console.log('Game Started')
    }
})()
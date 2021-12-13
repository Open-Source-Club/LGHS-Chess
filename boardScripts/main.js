let board
let idToken
let domain
let chess
let schoolW
let schoolB
let move = null
let moveConfirmed = false
let votingClosed = false

function onDragStart(source, piece, position, orientation) {
    document.body.style.overflow = 'hidden';

    if (chess.game_over()) return false

    if ((chess.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (chess.turn() === 'b' && piece.search(/^w/) !== -1) ||
        (moveConfirmed === true || move != null)) {
        return false
    }
}

function onDrop(source, target) {
    document.body.style.overflow = 'visible';

    move = chess.move({
        from: source,
        to: target,
        promotion: 'q'
    })
}

function onSnapEnd() {
    board.position(chess.fen())
}

function updateStatus() {
    if (votingClosed === true){$('#status').html('Voting Closed'); return}
    school = chess.turn() === 'w' ? schoolW.nameAbrv: schoolB.nameAbrv

    if (chess.in_checkmate()) {status = `Game Over, ${school} Is In Checkmate.`}
    else if (chess.in_draw()) {status = 'Game Over, Draw'}
    else {
        status = school + "'s Move"
        if (chess.in_check()) {status += ', ' + school + ' Is In Check'}
    }

    $('#status').html(status)
}

const loadData = () => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/fetchData', true);
    xhr.send();
    
    xhr.onload = () => {
        response = JSON.parse(xhr.response)
        schoolW = response.schoolW
        schoolB = response.schoolB

        editPage(schoolW, schoolB);

        $('meta[name="google-signin-client_id"]').attr('content', response.OAuthId);
        const newScript = document.createElement("script");
        newScript.src = "https://apis.google.com/js/platform.js"
        const currentDiv = document.getElementById("OAuthButton");
        document.body.insertBefore(newScript, currentDiv);
       
        chess = new Chess(response.fen)
        turn = chess.turn() === 'w' ? 'white' : 'black'
        board = Chessboard('board', {
            draggable: true,
            position: chess.fen(),
            orientation: turn,
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd
        })

        startCountDown()
        updateStatus()
    };
}

const startCountDown = () => {
    let dateNow = new Date();
    const timesMs = [
        new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate(), schoolB.executeTime[0], schoolB.executeTime[1], 0, 0).getTime(),
        new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate(), schoolW.moveTime[0], schoolW.moveTime[1], 0, 0).getTime(),
        new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate(), schoolB.tallyTime[0], schoolB.tallyTime[1], 0, 0).getTime()
    ]

    let countDownTime;
    for(let t = 0; t < timesMs.length; t++){
        if (timesMs[t] - dateNow.getTime() > 0){
            countDownTime = timesMs[t]
            break
        }
    }
    if (countDownTime === undefined){
        countDownTime = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + 1, schoolB.executeTime[0], schoolB.executeTime[1], 0, 0).getTime()
        votingClosed = true
    }

    timer = document.getElementById("countdown")
    const countDown = () => {
        dateNow = new Date().getTime();
        let remTime = countDownTime - dateNow;

        let hours = Math.floor((remTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((remTime % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((remTime % (1000 * 60)) / 1000);
        
        minutes = minutes < 10 ? '0'+minutes : minutes;
        seconds = seconds < 10 ? '0'+seconds : seconds;

        timer.innerHTML = `${hours}:${minutes}:${seconds}`;

        if (remTime < 0) {
            clearInterval(countDown);
            timer.innerHTML = '0:0:0'
            location.reload();
        }
    }

    setInterval(countDown, 1000);
    countDown()
}

const checkMobil = () => {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
        $('#board').css({"width": screen.width - 14})
    }
}

const editPage = (school1, school2) => {
    let timeStr1 = timeToStr(school2.executeTime) + " - " + timeToStr(school1.moveTime)
    let timeStr2 = timeToStr(school1.moveTime) + " - " + timeToStr(school2.tallyTime)

    document.getElementById("votingPeriod1").innerHTML = school1.nameAbrv + document.getElementById("votingPeriod1").innerHTML + timeStr1;
    document.getElementById("votingPeriod2").innerHTML = school2.nameAbrv + document.getElementById("votingPeriod2").innerHTML + timeStr2;
    
	let p2str = document.getElementById("p2").innerHTML
	while (p2str.indexOf("[school1]") != -1) {
		p2str = p2str.substring(0, p2str.indexOf("[school1]")) + school1.nameAbrv + p2str.substring(p2str.indexOf("[school1]") + 9)
	}
	while (p2str.indexOf("[school2]") != -1) {
		p2str = p2str.substring(0, p2str.indexOf("[school2]")) + school2.nameAbrv + p2str.substring(p2str.indexOf("[school2]") + 9)
	}
	document.getElementById("p2").innerHTML = p2str
}

//gets a time [hours, min] and converts to 12 hour time str
const timeToStr = (time) => {
    return time[0] > 12 ? (time[0]-12) + ":" + time[1] + " pm" : time[0] + ":" + time[1] + " am"
}

const undoMove = () => {
    if (moveConfirmed === true){return 'Already Moved'}
    chess.undo()
    move = null
    board.position(chess.fen())
}

const postData = () => {
    if (votingClosed === true){return 'Voting Closed'}
    if (moveConfirmed === true){return 'Already Moved Today'}
    if (move === null){return 'No Move'}
    if (domain === undefined){return "Not Signed In"}
    else if (!(domain === schoolW.domain || domain === schoolB.domain)){return 'Not Student Email'}

    // swapped w and b because this could only run after the user has moved thus changing the move to the opposite color
    if (chess.turn() === 'b' && domain != schoolW.domain){return `Not ${schoolW.nameAbrv} Account`}
    else if (chess.turn() === 'w' && domain != schoolB.domain){return `Not ${schoolB.nameAbrv} Account`}

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.send(JSON.stringify({
        idToken: idToken,
        move: {
            from: move.from,
            to: move.to
        }
    }));

    xhr.onload = () => {
        console.log(xhr.status)
        console.log(xhr.response)
        if (xhr.status === 200){
            $('#response').html('Move Submitted').css({"color": "green"})
            moveConfirmed = true;
            console.log(move)
        }
        else{
            $('#response').html(xhr.response).css({"color": "red"})
            moveConfirmed = true;
            console.log(move)
        }
    };

    return 'Sent Form Data'
}

function onSignIn(googleUser) {
    idToken = googleUser.getAuthResponse().id_token;
    profile = googleUser.getBasicProfile();
    domain = profile.getEmail().split('@')[1]

    console.log(domain)
}

checkMobil()
loadData()
$('#undo').on('click', undoMove)
document.getElementById("sendData").onclick = function (){
    result = postData()
    if (result != 'Sent Form Data'){
        $('#response').html(result).css({"color": "red"})
    }
}
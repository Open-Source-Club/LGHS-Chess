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

        $('meta[name="google-signin-client_id"]').attr('content', response.OAuthId);
        const newScript = document.createElement("script");
        newScript.src = "https://apis.google.com/js/platform.js"
        const currentDiv = document.getElementById("OAuthButton");
        document.body.insertBefore(newScript, currentDiv);
       

        console.log(response.moves);

        // for(i = 0; i<50 ;i++) {
        //     response.moves.push("e4");
        //     response.moves.push("e5");
        // }
        
        if (response.moves != undefined) {
            let divC, divN, div1, div2;
            $.each(response.moves, function(i, move){
                if (i % 2 == 0) {//it is odd
                    divC = document.createElement("div");
                    divC.classList.add("move");
                    divN = document.createElement("div");
                    divN.classList.add("moveNumber");
                    div1 = document.createElement("div");
                    div1.classList.add("move1");
                    div2 = document.createElement("div");
                    div2.classList.add("move2");
                    $(divC).append(divN);
                    $(divC).append(div1);
                    $(divC).append(div2);
                    divN.innerText = Math.floor(i/2) + 1 + ".";
                    div1.innerText = move;
                } else {
                    div2.innerText = move;
                    $("#moveList").append(divC);
                }
            });
            
            if(response.moves.length % 2 == 1) {
                $("#moveList").append(divC);
            }
    
            if($("#moveListContainer")[0].scrollHeight > $("#moveListContainer")[0].clientHeight) {
                $("#moveListContainer").css("width","140px");
            }
        }

        chess = new Chess(response.fen)
        turn = chess.turn() === 'w' ? 'white' : 'black'
        board = Chessboard('board', {
            draggable: true,
            position: chess.fen(),
            orientation: turn,
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            pieceTheme: '{piece}.png'
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
    for(var t = 0; t < timesMs.length; t++){
        if (timesMs[t] - dateNow.getTime() > 0){
            countDownTime = timesMs[t]
            break
        }
    }
    if (countDownTime === undefined){
        countDownTime = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + 1, schoolB.executeTime[0], schoolB.executeTime[1], 0, 0).getTime()
        votingClosed = true
    }
    else if (t === 0){
        votingClosed = true
    }

    timer = document.getElementById("countdown")
    const countDown = () => {
        dateNow = new Date().getTime();
        let remTime = countDownTime - dateNow;

        let hours = Math.floor((remTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((remTime % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((remTime % (1000 * 60)) / 1000);

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

    if (chess.turn() === 'b' && domain != schoolW.domain){return `Not ${schoolW.nameAbrv} Account`} // swapped w and b because this could only run after the user has moved thus changing the move to the opposite color
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
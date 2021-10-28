let board
let idToken
let domain
let chess
let schoolW
let schoolB
let move = null
let moveConfirmed = false

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
    let status = ''
    school = chess.turn() === 'w' ? schoolW.nameAbrv: schoolB.nameAbrv

    if (chess.in_checkmate()) {status = `Game Over, ${school} Is In Checkmate.`}
    else if (chess.in_draw()) {status = 'Game Over, Draw'}
    else {
        status = school + " 's Move"
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

        let myPromise = new Promise(function(myResolve, myReject) {
        // "Producing Code" (May take some time)

          myResolve(); // when successful
          myReject();  // when error
        });

        // "Consuming Code" (Must wait for a fulfilled Promise)
        myPromise.then(
          function(value) { /* code if successful */ },
          function(error) { /* code if some error */ }
        );

        updateStatus()
    };
}


//scheduling for even days
//cron.schedule('0 30 11 * * *', () => {await tallyMoves(); await executeMove(); console.log("Executed Move At " + new Date())}); //Tally and execute white move at 11:30
//cron.schedule('0 35 14 * * *', () => {await tallyMoves(); console.log("Executed Move At " + new Date())}); //voting from 11:30 - 2:45 //Tally black move at 2:45
//cron.schedule('0 35 8 * * *', () => {await executeMove(); console.log("Executed Move At " + new Date())}); //voting from 11:30 - 2:45 //Execute black move at 8:30 the next day
function countdown() {

  let now = new Date();

  if (chess.turn() === 'w')
  {
    //the countdown date for white moves is just todays date but at 11:30
    let countDownDate = new Date(now.getFullYear(), now.getMonth(), date.getDate(), 11, 30, 0)
    var distance = countDownDate - now;
  }
  else {
    //couldn't find a better way to do this, but it first sets the day to tomorrow and then sets the time.
    let countDownDate = new Date((new Date()).valueOf() + 86400000);
    countDownDate.setHours(8);
    countDownDate.setMinutes(8);
    countDownDate.setSeconds(8);

    var distance = countDownDate - now;
  }

  var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString();
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString();
  var seconds = Math.floor((distance % (1000 * 60)) / 1000).toString();

  //add a leading zero
  //lazy
  hours = hours.length < 2 ?  '0'+hours : hours;
  minutes = minutes.length < 2 ?  '0'+minutes : minutes;
  seconds = seconds.length < 2 ?  '0'+seconds : seconds;

  $('#countdown').text(hours + ":" + minutes + ":" + seconds);
  let t = setTimeout(function(){ countdown() }, 1000);
}

countdown();

const undoMove = () => {
    if (moveConfirmed === false)
        chess.undo()
        move = null
    board.position(chess.fen())
}
const postData = () => {
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
            $('#response').html(xhr.response).css({"color": "green", "font-size": "125%"})
            moveConfirmed = true;
            console.log(move)
        }
        else{
            $('#response').html(xhr.response).css({"color": "red", "font-size": "125%"})
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

loadData()
$('#undo').on('click', undoMove)
document.getElementById("sendData").onclick = function (){
    result = postData()
    if (result != 'Sent Form Data'){
        $('#response').html(result).css({"color": "red", "font-size": "125%"})
    }
}

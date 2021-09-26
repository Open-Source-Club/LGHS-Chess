let board = null
let move = null
let idToken = null;
let domain = null;
let chess = null;
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
    school = chess.turn() === 'w'? 'LGHS': 'SHS'

    if (chess.in_checkmate()) {status = `Game Over, ${school} Is In Checkmate.`}
    else if (chess.in_draw()) {status = 'Game Over, Draw'}
    else {
        status = school + " 's Move"
        if (chess.in_check()) {status += ', ' + school + ' Is In Check'}
    }

    $('#status').html(status)
}

const loadBoard = () => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/boardPosition", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();

    xhr.onload = () => {
        chess = new Chess(xhr.response)
        turn = chess.turn() === 'w' ? 'white' : 'black'

        board = Chessboard('board', {
            draggable: true,
            position: chess.fen(),
            orientation: turn,
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd
        })

        updateStatus()
    };
}

const confirmMove = () => {
    console.log(move)
    moveConfirmed = true;
}

const undoMove = () => {
    if (moveConfirmed === false)
        chess.undo()
        move = null
    board.position(chess.fen())
}

const postData = () => {
    if (move === null){return 'No Move'}
    else if (!(domain === 'lgsstudent.org' || domain === 'gmail.com')){return 'Not Student Email'}

    if (chess.turn() === 'b' && domain != 'lgsstudent.org'){return "Not SHS's Turn"} // swapped w and b because this could only run after the user has moved thus changing the move to the opposite color
    else if (chess.turn() === 'w' && domain != 'gmail.com'){return "Not LGHS's Turn"}

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

    return 'Sent Form Data'
}

function onSignIn(googleUser) {
    idToken = googleUser.getAuthResponse().id_token;
    profile = googleUser.getBasicProfile();
    domain = profile.getEmail().split('@')[1]

    console.log(domain)
}

loadBoard()
$('#confirmMove').on('click', confirmMove)
$('#undo').on('click', undoMove)
$('#sendData').on('click', postData)
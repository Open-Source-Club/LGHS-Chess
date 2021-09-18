var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
let move = null
let moveConfirmed = false
let idToken = null;
let domain = null;

function onDragStart(source, piece, position, orientation) {
    document.body.style.overflow = 'hidden';
    // do not pick up pieces if the game is over
    if (game.game_over()) return false

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
        (moveConfirmed === true || move != null)) {
        return false
    }
}

function onDrop(source, target) {
    // see if the move is legal
    document.body.style.overflow = 'visible';

    move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })

    if(move === null) return
    console.log(move.from)
    console.log(move.to)
    updateStatus()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    board.position(game.fen())
}

function updateStatus() {
    var status = ''

    var moveColor = 'White'
    if (game.turn() === 'b') {
        moveColor = 'Black'
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
    }

    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position'
    }

    // game still on
    else {
        status = moveColor + ' to move'

        // check?
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check'
        }
    }

    $status.html(status)
    $fen.html(game.fen())
    $pgn.html(game.pgn())
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)

const confirmMove = () => {
    console.log(move)
    moveConfirmed = true;
}

const undoMove = () => {
    if (moveConfirmed === false)
        game.undo()
        move = null
        console.log(move);
    board.position(game.fen())
    updateStatus()
}

const loadBoard = fen => {
    game.load(fen)
    if (game.turn() === 'b') board.flip();
    board.position(game.fen())
}

const postData = () => {
    if (move === null && domain != 'lgsstudent.org'){console.log('No move and not signed into school google account'); return;}
    else if(move === null){console.log('No move'); return;}
    else if(domain != 'lgsstudent.org'){console.log('Not student email'); return;}

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.send(JSON.stringify({
        idToken: idToken,
        move: {
            from: move.from,
            to: move.to
        }
    }));
    console.log('Sent Form Data')
}

function onSignIn(googleUser) {
    idToken = googleUser.getAuthResponse().id_token;
    profile = googleUser.getBasicProfile();
    domain = profile.getEmail().split('@')[1]

    console.log(domain)
    console.log(idToken)
}

updateStatus()
loadBoard("rnbqkbnr/pp1ppppp/8/2p5/2P5/8/PP1PPPPP/RNBQKBNR w KQkq c6 0 2")

$('#confirmMove').on('click', confirmMove)
$('#undo').on('click', undoMove)
$('#sendData').on('click', postData)
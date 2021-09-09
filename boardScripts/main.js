// NOTE: this example uses the chess.js library:
// https://github.com/jhlywa/chess.js
var board = null
var game = new Chess()
var $status = $('#status')
var $fen = $('#fen')
var $pgn = $('#pgn')
let move = null
let moveConfirmed = false

function onDragStart (source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
      (moveConfirmed === true || move != null)) {
    return false
  }
}
//.moves([ options ]) shows a list of all possible moves
function onDrop (source, target) {
  // see if the move is legal
  move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  })

  console.log(move)
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd () {
  board.position(game.fen())
}

function updateStatus () {
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
    updateStatus()
}

const undoMove = () => {
    if (moveConfirmed === false)
        console.log(game.undo())
        board.position(game.fen())
        move = null
}

const loadBoard = fen => {
    game.load(fen)
    if (game.turn() === 'b') board.flip();
    board.position(game.fen())
}

const flipBoard = () => {
    //pass
}

const logFen = () => console.log(game.fen())



updateStatus()
loadBoard("rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1")
flipBoard()

$('#confirmMove').on('click', confirmMove)
//$('#flip').on('click', board.flip)
$('#undo').on('click', undoMove)
$('#logFen').on('click', logFen)
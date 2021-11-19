let fen
let from
let to

const url = window.location.search.substring(1).split('$').join(' ');
const fields = url.split('&');
for (let i = 0; i < fields.length; i++) {
    let pair = fields[i].split('=')
    switch (pair[0]){
        case 'fen':
            fen = pair[1]
            break;
        case 'from':
            from = pair[1]
            break;
        case 'to':
            to = pair[1]
    }
}

const chess = new Chess(fen)
const turn = chess.turn() === 'w' ? 'white' : 'black'

chess.move({from: from, to: to})
Chessboard('board', {
    draggable: false,
    position: chess.fen(),
    orientation: turn,
})
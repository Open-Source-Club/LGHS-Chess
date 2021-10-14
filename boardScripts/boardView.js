let from
let to
let userName

const url = window.location.search.substring(1);
const fields = url.split('&');
for (let i = 0; i < fields.length; i++) {
    let pair = fields[i].split('=');
    if (pair[0] === 'name'){userName = pair[1].split(/(?=[A-Z])/)}
    else if (pair[0] === 'from'){from = pair[1]}
    else if (pair[0] === 'to'){to = pair[1]}
}

document.getElementById("userBoardName").innerHTML = `${userName[0]} ${userName[1]}'s' Move`;

console.log(userName)
console.log(from)
console.log(to)


let xhr = new XMLHttpRequest();
xhr.open("GET", "/boardPosition", true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send();

xhr.onload = () => {
    chess = new Chess(xhr.response)
    turn = chess.turn() === 'w' ? 'white' : 'black'

    currentBoard = Chessboard('currentBoard', {
        draggable: false,
        position: chess.fen(),
        orientation: turn,
    })

    chess.move({ from: from, to: to })
    userBoard = Chessboard('userBoard', {
        draggable: false,
        position: chess.fen(),
        orientation: turn,
    })
};
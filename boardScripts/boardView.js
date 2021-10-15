let from
let to
let userName
let fen
let date

const url = window.location.search.substring(1).split('$').join(' ');
const fields = url.split('&');
for (let i = 0; i < fields.length; i++) {
    let pair = fields[i].split('=');
    switch (pair[0]){
        case 'name':
            userName = pair[1]
            break;
        case 'date':
            date = pair[1]
            break;
        case 'from':
            from = pair[1]
            break;
        case 'to':
            to = pair[1]
            break;
        case 'fen':
            fen = pair[1]

    }
}

console.log(userName)
console.log(from)
console.log(to)
console.log(fen)

let xhr = new XMLHttpRequest();
xhr.open("GET", "/boardPosition", true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send();


chess = new Chess(fen)
turn = chess.turn() === 'w' ? 'white' : 'black'

currentBoard = Chessboard('currentBoard', {
    draggable: false,
    position: chess.fen(),
    orientation: turn,
})

document.getElementById("currentBoardDate").innerHTML = `Board for ${date}`;
if (userName != null){
    const newDiv = document.createElement("div");
    newDiv.id = "userBoard";
    newDiv.className= "small-board";
    
    const currentDiv = document.getElementById("currentBoard");
    currentDiv.parentNode.insertBefore(newDiv, currentDiv.nextSibling);

    chess.move({ from: from, to: to })
    userBoard = Chessboard('userBoard', {
        draggable: false,
        position: chess.fen(),
        orientation: turn,
    })

    const newH1 = document.createElement("h1");
    newH1.innerHTML = `${userName}'s' Move`
    newH1.id = "userBoardName";
    newH1.className= "boardText";

    const currentH1 = document.getElementById("currentBoardDate");
    currentH1.parentNode.insertBefore(newH1, currentH1.nextSibling);
    
    textWidth = document.getElementById("currentBoardDate").offsetWidth
    console.log(textWidth)

    const styles = `
        .boardText{
            margin-right: ${400 - textWidth + 5}px;
        }
    `

    let styleSheet = document.createElement("style")
    styleSheet.type = "text/css"
    styleSheet.innerText = styles
    document.head.appendChild(styleSheet)
}
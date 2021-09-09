const express = require('express');
const port = 4200

const app = express();
app.use(express.static('boardScripts'));
app.use(express.static('boardDependencies/js'));
app.use(express.static('boardDependencies/css'));
app.use(express.static('boardDependencies/img/chesspieces/wikipedia'));
//app.use(express.static(__dirname + '/boardScripts'));
//app.use(express.static('imaboges'));
//app.use( express.static( __dirname + '/LGHS-Chess' ));

app.get('/', (req, res) => {
    res.sendFile( __dirname + '/board.html');
});

app.post('/', (req, res) => {
    //pass
})

app.listen(port, () => console.log(`This app is listening on port ${port}`));
const express = require('express');
const port = 4200

const app = express();
//app.use(express.urlencoded({extended : false}));
app.use(express.json())

app.use(express.static('boardScripts'));
app.use(express.static('boardDependencies/js'));
app.use(express.static('boardDependencies/css'));
app.use(express.static('boardDependencies/img/chesspieces/wikipedia'));

app.get('/', (req, res) => {
    res.sendFile( __dirname + '/board.html');
});

app.post('/', (req, res) => {
    console.log(req.body)
    res.send({response: "accepted"});
})

app.listen(port, () => console.log(`This app is listening on port ${port}`));
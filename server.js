const express = require('express');
const port = 3000

const app = express();
app.use( express.static( __dirname + '/LGHS-Chess' ));

app.get('/', (req, res) => {
    res.sendFile(path.join( __dirname, 'LGHS-Chess', 'board.html'));
});

app.post('/', (req, res) => {
    //pass
})

app.listen(port, () => console.log(`This app is listening on port ${port}`));
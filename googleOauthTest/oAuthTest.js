const express = require('express');
const port = 4200

const app = express();
//app.use(express.urlencoded({extended : false}));
app.use(express.json())

app.get('/', (req, res) => {
    res.sendFile('/Users/eric/Documents/GitHub/LGHS-Chess/googleOauthTest/oAuthTest.html');
});

app.listen(port, () => console.log(`This app is listening on port ${port}`));
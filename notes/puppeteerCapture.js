const puppeteer = require('puppeteer');

let browser;
(async()=> {
    browser = await puppeteer.launch();
    browser = await browser.newPage();
    browser.setViewport({ width: 500, height: 500 })
    await browser.goto('http://localhost/boardView?fen=rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR$w$KQkq$-$0$1&from=b1&to=c3');

    await browser.screenshot({path: `boardCaptures/board.png`});
    
})();
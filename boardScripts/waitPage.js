const main = () => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/fetchData', true);
    xhr.send();
    
    xhr.onload = () => {
        startDate = JSON.parse(xhr.response).gameStartDate
        countDown(startDate)
       
    };
}

const countDown = (startDate) => {
    let dateNow = new Date();
    const startDateMs = new Date(dateNow.getFullYear(), startDate[0], startDate[1], startDate[2], startDate[3], 0, 0);

    const timer = document.getElementById("countdown")
    const countDown = () => {
        dateNow = new Date().getTime();
        let remTime = startDateMs - dateNow;

        let days = Math.floor(remTime / (1000 * 60 * 60 * 24));
        let hours = Math.floor((remTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((remTime % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((remTime % (1000 * 60)) / 1000);

        timer.innerHTML = `Game Starts In: ${days}d ${hours}h ${minutes}m ${seconds}s`;

        if (remTime < 0) {
            clearInterval(countDown);
            timer.innerHTML = 'Game Starts In: 0d 0h 0m 0s'
            location.reload();
        }
    }

    setInterval(countDown, 1000);
    countDown()
}

main()
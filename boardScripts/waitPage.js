const main = () => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/fetchData', true);
    xhr.send();
    
    xhr.onload = () => {
        response = JSON.parse(xhr.response)
        startDate = response.gameStartDate

        editPage(response.schoolW, response.schoolB);
		checkMobil()
        countDown(startDate)
    };
}

const editPage = (school1, school2) => {
    let timeStr1 = timeToStr(school2.executeTime) + " - " + timeToStr(school1.moveTime)
    let timeStr2 = timeToStr(school1.moveTime) + " - " + timeToStr(school2.tallyTime)
    document.getElementById("votingPeriod1").innerHTML = school1.nameAbrv + document.getElementById("votingPeriod1").innerHTML + timeStr1;
    document.getElementById("votingPeriod2").innerHTML = school2.nameAbrv + document.getElementById("votingPeriod2").innerHTML + timeStr2;
	let p2str = document.getElementById("p2").innerHTML
	while (p2str.indexOf("[school1]") != -1)
	{
		p2str = p2str.substring(0, p2str.indexOf("[school1]")) + school1.nameAbrv + p2str.substring(p2str.indexOf("[school1]") + 9)
	}
	while (p2str.indexOf("[school2]") != -1)
	{
		p2str = p2str.substring(0, p2str.indexOf("[school2]")) + school2.nameAbrv + p2str.substring(p2str.indexOf("[school2]") + 9)
	}
	document.getElementById("p2").innerHTML = p2str
}

//gets a time [hours, min] and converts to non-military time str
const timeToStr = (time) => {
    return time[0] > 12 ? (time[0]-12) + ":" + time[1] + " pm" : time[0] + ":" + time[1] + " am"
}


const checkMobil = () => {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
        
        let r = document.querySelector(':root');
        let rs = getComputedStyle(r);
        
        document.getElementById("image").style = "width:" + (screen.width - 100) + "px;height:" + (screen.width - 100) + "px;"
        
        let pSize = (parseInt(rs.getPropertyValue('--font-size-p').split('vw')[0]) + 2) + 'vw';
        let hSize = (parseInt(rs.getPropertyValue('--font-size-h').charAt('vw')[0]) + 2) + 'vw';
    
        r.style.setProperty('--font-size-p', pSize);
        r.style.setProperty('--font-size-h', hSize);

        r.style.setProperty('--txt-width', '100%');
        r.style.setProperty('--img-side', 'left');
	}
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
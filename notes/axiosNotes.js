const axios = require('axios')
//title: '**Email**: stie4966@lgsstudent.org\n**From**: a6'

//var random = colors[Math.floor(Math.random() * 22)];

const data = {
    username: "Eric Still",
    embeds: [{
        color: Number(`0x${Math.floor(Math.random()*16777215).toString(16)}`),
        description: '**Email:** stie4966@lgsstudent.org\n**From:** a2\n**To:** b4'
    }]
}
axios
  .post('https://discord.com/api/webhooks/898002048660963349/UFLsplp92OjrGnyYB6XykDkG3AeO3wP9qreJFR4CXwpVBCZAqfUVoNuehbVrD2zhDIPo', data)
  .then(res => {
    console.log(`statusCode: ${res.status}`)
  })
  .catch(error => {
    console.error(error)
  })

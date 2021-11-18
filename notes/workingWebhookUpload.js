const fs = require('fs')
var request = require('request');

const options = {
    method: "POST",
    url: "https://discord.com/api/webhooks/898002048660963349/UFLsplp92OjrGnyYB6XykDkG3AeO3wP9qreJFR4CXwpVBCZAqfUVoNuehbVrD2zhDIPo",
    headers: {
        "Content-Type": "multipart/form-data"
    },
    formData : {
        "file1" : fs.createReadStream("test.png"),
        payload_json: JSON.stringify({
            "embeds": [{
              "image": {
                "url": "attachment://test.png"
              }
            }]
          })
    }
}
console.log(options.formData)
request(options, function (err, res, body) {
    if(err) console.log(err);
    console.log(body);
});
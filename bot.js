var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var AWS = require('aws-sdk');
var fs = require('fs');
var botID = "0b09c5795270482bb28ecfb5ef";
var returnState = '';
var returnCount = 0;

function respond() {
    var request = JSON.parse(this.req.chunks[0]);

    if (request.text == "/clarkstart") {
        initiateFile();
        this.res.writeHead(200);
        this.res.end();
    }
    else if (request.text == "/pushdata") {
        pushData();
        this.res.writeHead(200);
        this.res.end();
    }
    else if (request.text == "/getgroups") {
        getGroups();
        this.res.writeHead(200);
        this.res.end();
    }
    else if (Array.isArray(request.attachments) && request.attachments) {
        console.log('we good');
        newPhoto();
        this.res.writeHead(200);
        this.res.end();
    } else {
        console.log("don't care");
        this.res.writeHead(200);
        this.res.end();
    }
}
function getGroups() {
    var data = '';
    //get all the messages
    HTTPS.get('https://api.groupme.com/v3/groups?token=c2b94360da7f013732bc364efad1a7ec', function (res) {
        if (res.statusCode == 200) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
        //add the chunks to our var data
        res.on('data', function (chunk) {
            data += chunk;
        });

        // on end iterate through file
        res.on('end', function () {
            var mess = JSON.parse(data);
            console.log(mess);
        });

    });
}
function initiateFile() {
    // creating empty data file
    var data = '';
    //get all the messages
    HTTPS.get('https://api.groupme.com/v3/groups/31647877/messages?limit=100&token=c2b94360da7f013732bc364efad1a7ec', function (res) {
        if (res.statusCode == 200) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
        //add the chunks to our var data
        res.on('data', function (chunk) {
            data += chunk;
        });

        // on end iterate through file
        res.on('end', function () {
            returnState = '';
            var mess = JSON.parse(data).response.messages;
            for (i = 0; i < mess.length; i++) {
                if (mess[i].attachments.length && mess[i].attachments[0].type == "image") {
                    // need to check if this you can get this and before
                    var test = findAllMessages(mess[i].id);
                    break;
                }
            }
        });

    });
}
function pushData() {
    // configure aws and start process
    AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var s3 = new AWS.S3();
    //download our main file
    var request = HTTPS.get("https://groupmeclark3000.s3.us-east-2.amazonaws.com/newfile.txt", function (err) {
        //if (err) throw err;
    });
    //write to our main filel
    fs.appendFile('newfile.txt', returnState, function (err) {
        if (err) throw err;
        console.log('file is edited.');
    });
    // read out main file, convert it into bas64Data and then upload as text file
    fs.readFile('newfile.txt', function (err, data) {
        if (err) throw err;
        var base64data = new Buffer(data, 'binary');
        s3.putObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: 'newfile.txt',
            Body: base64data,
            ACL: 'public-read'
        }, function (resp) {
            console.log(arguments);
            console.log('Successfully uploaded package.');
        });
    });

}
function newPhoto() {
    var data = '';
    HTTPS.get('https://api.groupme.com/v3/groups/31647877/messages?limit=1&token=c2b94360da7f013732bc364efad1a7ec', function (res) {
        if (res.statusCode == 200) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
        //add the chunks to our var data
        res.on('data', function (chunk) {
            data += chunk;
        });

        // on end iterate through file
        res.on('end', function () {
            returnState = '';
            var mess = JSON.parse(data).response.messages;
            for (j = 0; j < mess[0].attachments[j].length; j++) {
                if (mess[0].attachments[j].type == "image") {
                    returnState += mess[0].attachments[j].url;
                    returnState += ",";
                    returnState += mess[0].created_at;
                    returnState += ",";
                    returnState += mess[0].name;
                    returnState += "\n";
                }
            }


        });
        pushData();
    });
}
function findAllMessages(messageID) {
    HTTPS.get('https://api.groupme.com/v3/groups/31647877/messages?before_id=' + messageID + '&limit=100&token=c2b94360da7f013732bc364efad1a7ec', function (res) {
        if (res.statusCode == 200) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
            return;
        }
        data = '';
        //add the chunks to our var data
        res.on('data', function (chunk) {
            data += chunk;
        });
        // on end iterate through file
        res.on('end', function () {
            var mess = JSON.parse(data).response.messages;
            if (mess.size == 1) {
                return;
            }

            for (i = 0; i < mess.length; i++) {
                console.log(mess[i].created_at);
                console.log(mess[i].id);
                if (mess[i].attachments.length) {
                    for (j = 0; j < mess[i].attachments.length; j++) {
                        if (mess[i].attachments[j].type == "image") {
                            returnState += mess[i].attachments[j].url;
                            returnState += ",";
                            returnState += mess[i].created_at;
                            returnState += ",";
                            returnState += mess[i].name;
                            returnState += "\n";
                            //console.log(mess[i].attachments[j].url);
                            //console.log(mess[i].created_at);
                            returnCount += 1;
                            console.log(returnCount);
                            //console.log(mess[i].id);
                        }
                    }
                }
            }
            console.log(mess[mess.length - 1].id);
            console.log(messageID);
            findAllMessages(mess[mess.length - 1].id);
        });

    });
}
function postMessage() {
    var botResponse, options, body, botReq;

    botResponse = cool();

    options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };

    body = {
        "bot_id": botID,
        "text": botResponse
    };

    console.log('sending ' + botResponse + ' to ' + botID);

    botReq = HTTPS.request(options, function (res) {
        if (res.statusCode == 202) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
    });

    botReq.on('error', function (err) {
        console.log('error posting message ' + JSON.stringify(err));
    });
    botReq.on('timeout', function (err) {
        console.log('timeout posting message ' + JSON.stringify(err));
    });
    botReq.end(JSON.stringify(body));
}


exports.respond = respond;
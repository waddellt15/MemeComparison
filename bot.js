var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var AWS = require('aws-sdk');
var fs = require('fs');
var botID = "0b09c5795270482bb28ecfb5ef";

function respond() {
    // configure aws and start process
    AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var s3 = new AWS.S3();
    //download our main file
    var request = HTTPS.get("https://groupmeclark3000.s3.us-east-2.amazonaws.com/newfile.txt", function (err) {
        if (err) throw err;
    });
    //write to our main filel
    fs.appendFile('newfile.txt', 'more to the file', function (err) {
        if (err) throw err;
        console.log('File is saved');
    });
    // read out main file, convert it into bas64Data and then upload as text file
    fs.readFile('newfile.txt', function (err, data) {
        if (err) { throw err; }
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
    //get the request data, convert it into json
    var request = JSON.parse(this.req.chunks[0]);
    //check if it has an attachment
    if (Array.isArray(request.attachments) && request.attachments.length) {
        var att = request.attachments[0].url;
        console.log(att);
        //group me api settings
        options = {
            hostname: 'api.groupme.com',
            path: '/v3/groups',
            method: 'GET'
        };
        // creating empty data file
        var data = '';
        //get all the messages
        HTTPS.get('https://api.groupme.com/v3/groups/55230894/messages?limit=100&token=c2b94360da7f013732bc364efad1a7ec', function (res) {
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
                var mess = JSON.parse(data).response.messages;
                for (i = 0; i < mess.length; i++) {
                    if (mess[i].attachments.length) {
                        for (j = 0; j < mess[i].attachments.length; j++) {
                            if (mess[i].attachments[j].type == "image") {
                                console.log(mess[i].attachments[j].url);
                                console.log(mess[i].created_at);
                            }
                        }
                    }
                    if (i == mess.length - 1) {
                        console.log(mess[i].id);
                    }
                }
            });

        });

    }
    if (request.text) {
        this.res.writeHead(200);
        this.res.end();
    } else {
        console.log("don't care");
        this.res.writeHead(200);
        this.res.end();
    }
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
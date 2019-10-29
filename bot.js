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
        returnState += 'tests ';
        for (j = 0; j < request.attachments.length; j++) {
            if (request.attachments[j].type == "image") {
                console.log('we good');
            }
        }
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
    AWS.config.update({ region: 'us-east-2', accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var dynamo = new AWS.DynamoDB();
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
            returnState = '';
            var mess = JSON.parse(data).response.messages;
            for (i = 0; i < mess.length; i++) {
                if (mess[i].attachments.length && mess[i].attachments[0].type == "image") {
                    // need to check if this you can get this and before
                    var params = {
                        TableName: 'clarkteems3000',
                        Item: {
                            'Image': { S: mess[i].attachments[0].url },
                            'poster': { S: mess[i].name },
                            'date': { N: mess[i].created_at },
                            'hash': { N: 0 },
                            'favorites': { N: mess[i].favorited_by.length }
                        }
                    }
                    var test = findAllMessages(mess[i].id);
                    break;
                }
            }
            dynamo.putItem(params, function (err, data) {
                if (err) {
                    console.log("Error", err);
                } else {
                    console.log("Success", data);
                }
            });
        });

    });
}
function newPhoto() {
    var data = '';
    HTTPS.get('https://api.groupme.com/v3/groups/55230894/messages?limit=1&token=c2b94360da7f013732bc364efad1a7ec', function (res) {
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
                    //update database
                }
            }


        });
    });
}
function findAllMessages(messageID) {
    AWS.config.update({ region: 'us-east-2', accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var dynamo = new AWS.DynamoDB();
    HTTPS.get('https://api.groupme.com/v3/groups/55230894/messages?before_id=' + messageID + '&limit=100&token=c2b94360da7f013732bc364efad1a7ec', function (res) {
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
                            var params = {
                                TableName: 'clarkteems3000',
                                Item: {
                                    'Image': { S: mess[i].attachments[0].url },
                                    'poster': { S: mess[i].name },
                                    'date': { N: mess[i].created_at },
                                    'hash': { N: 0 },
                                    'favorites': { N: mess[i].favorited_by.length }
                                }
                            }
                            dynamo.putItem(params, function (err, data) {
                                if (err) {
                                    console.log("Error", err);
                                } else {
                                    console.log("Success", data);
                                }
                            });
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
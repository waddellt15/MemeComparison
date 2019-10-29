var HTTPS = require('https');
var AWS = require('aws-sdk');
var fs = require('fs');
var botID = "0b09c5795270482bb28ecfb5ef";
var returnCount = 0;
var gm = require('gm').subClass({ imageMagick: true });
var request = require('request');
var dhash = require('dhash');

async function respond() {
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
    else if (request.text == "/convert") {
        hashing();
        this.res.writeHead(200);
        this.res.end();
    }
    else if (Array.isArray(request.attachments) && request.attachments) {
        for (j = 0; j < request.attachments.length; j++) {
            if (request.attachments[j].type == "image") {
                var hashT = '';
                hashT = await hashing(request.attachments[0].url);
                console.log(hashT);
                //await checkMeme(request, hashT);
            }
        }

        this.res.writeHead(200);
        this.res.end();
    } else {
        this.res.writeHead(200);
        this.res.end();
    }
}
function checkMeme(request, hashT) {
    AWS.config.update({ region: 'us-east-2', accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var dynamo = new AWS.DynamoDB();
    var params = {
        TableName: 'clarkteems3000',
        //ProjectionExpression: "poster, date",
        FilterExpression: "#hash = :hash",
        ExpressionAttributeNames: {
            "#hash": "hash"
        },
        ExpressionAttributeValues: {
            ':hash': { N: hashT.toString() } 
        }
    }
    dynamo.scan(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            if (data.count == 0) {
                addMeme(request, hashT);
            }
            else {
                reposter(request, data);
            }
        }
    });

}
function reposter(request, original) {
    console.log("REPOST");
    console.log(original.Items[0].poster);
}
function addMeme(request, hashT) {
    AWS.config.update({ region: 'us-east-2', accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var dynamo = new AWS.DynamoDB();
    var fav = '';
    if (request.favorited_by) {
        fav = request.favorited_by.length.toString()
    } else {
        fav = '0'
    }
    var params = {
        TableName: 'clarkteems3000',
        Item: {
            'Image': { S: request.attachments[0].url },
            'poster': { S: request.name },
            'date': { N: request.created_at.toString() },
            'hash': { N: hashT.toString() },
            'favorites': { N: fav }
        }
    }
    dynamo.putItem(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data);
        }
    });
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
            var mess = JSON.parse(data).response.messages;
            for (i = 0; i < mess.length; i++) {
                if (mess[i].attachments.length && mess[i].attachments[0].type == "image") {
                    // need to check if this you can get this and before
                    var fav = '';
                    if (mess[i].favorited_by) {
                        fav = mess[i].favorited_by.length.toString()
                    } else {
                        fav = '0'
                    }
                    var params = {
                        TableName: 'clarkteems3000',
                        Item: {
                            'Image': { S: mess[i].attachments[0].url },
                            'poster': { S: mess[i].name },
                            'date': { N: mess[i].created_at.toString() },
                            'hash': { N: '0' },
                            'favorites': { N: mess[i].favorited_by.length.toString() }
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

function findAllMessages(messageID) {
    AWS.config.update({ region: 'us-east-2', accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var dynamo = new AWS.DynamoDB();
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
        res.on('end', async function () {
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
                            var fav = '';
                            if (mess[i].favorited_by) {
                                fav = mess[i].favorited_by.length.toString()
                            } else {
                                fav = '0'
                            }
                            var params = {
                                TableName: 'clarkteems3000',
                                Item: {
                                    'Image': { S: mess[i].attachments[0].url },
                                    'poster': { S: mess[i].name },
                                    'date': { N: mess[i].created_at.toString() },
                                    'hash': { N: '0' },
                                    'favorites': { N: fav }

                                }
                            }
                            dynamo.putItem(params, function (err, data) {
                                if (err) {
                                    console.log("Err/or", err);
                                } else {
                                    console.log("Success", data);
                                }
                            });
                            await sleep(200);
                            returnCount++;
                            console.log(returnCount);
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
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(ms);
        }, ms);
    });
}
function hashing(url) {
    gm(request(url))
        .resize(16, 16)
        .noProfile()
        .colorspace('GRAY')
        .write('reformat.png', function (err) {
            if (!err) console.log("we did it");
            dhash('reformat.png', function (err, hash) {
                if (err) console.log(err);
                fs.unlink('reformat.png', function (err, data) {
                    if (err) {
                        console.log("Error", err);
                    } else {
                        console.log("Deleted", data);
                    }
                });
                return hash;
            });
        });
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(20);
        }, 20);
    });
}

function postMessage() {
    var botResponse, options, body, botReq;


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
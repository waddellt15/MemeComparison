var HTTPS = require('https');
var AWS = require('aws-sdk');
var fs = require('fs');
var returnCount = 0;
var gm = require('gm').subClass({ imageMagick: true });
var request = require('request');
var PNG = require('png-js')

async function respond() {
    var request = JSON.parse(this.req.chunks[0]);

    if (request.text == "/rehashall" && request.user_id == '41493727') {
        initiateFile();
		//postMessage("The present has been nicely put under the tree. It reads “To: You fucks, open on Christmas”.  Sounds like you better not fucking touch it");
        this.res.writeHead(200);
        this.res.end();
    }
    else if (request.text == "/unwrap" && request.user_id == '41493727') {        
        presentTime();
		this.res.writeHead(200);
        this.res.end();
    }
    else if (request.text == "/getgroups" && request.user_id == '41493727') {
        getGroups();
        this.res.writeHead(200);
        this.res.end();
    }
    else if (Array.isArray(request.attachments) && request.attachments) {
        for (j = 0; j < request.attachments.length; j++) {
            if (request.attachments[j].type == "image" && !request.attachments[j].url.includes(".gif")) {
                var hashT = '';
				var hashTCrop = '';
                hashT = await hashing(request.attachments[j].url);
				hashTCrop = await hashingCrop(request.attachments[j].url);
                await checkMeme(request, hashT, hashTCrop);
            }
        }

        this.res.writeHead(200);
        this.res.end();
    } else {
        this.res.writeHead(200);
        this.res.end();
    }
}
function checkMeme(request, hashT, hashTCrop) {
    console.log(hashT);
    AWS.config.update({ region: 'us-east-2', accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var dynamo = new AWS.DynamoDB();
    var params = {
        TableName: 'clarkteems3001',
        KeyConditionExpression: "#hash = :hash",
        ExpressionAttributeNames: {
            "#hash": "hash"
        },
        ExpressionAttributeValues: {
            ':hash': { S: hashT.toString() } 
        }
    }
	var paramsCrop = {
        TableName: 'clarkteems3001',
        KeyConditionExpression: "#hash = :hash",
        ExpressionAttributeNames: {
            "#hash": "hash"
        },
        ExpressionAttributeValues: {
            ':hash': { S: hashTCrop.toString() } 
        }
    }
    console.log(request);
    dynamo.query(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log(data.Count);
            if (data.Count == 0) {
			    dynamo.query(paramsCrop, function (err, data) {
					if (err) {
						console.log("Error", err);
					} else {
						console.log(data.Count);
						if (data.Count == 0) {				
							addMeme(request, hashT);
						}
						else {
							//reposter(request, data);
						}
					}
				});
			}
            else  {
                //reposter(request, data);
            }
        }
    });

}
function reposter(request, original) {
    var botResponse, options, body, botReq;
    options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };
	console.log(original.Items[0].date.S);
	console.log(original.Items[0].date.N);	
	var time = original.Items[0].date.N;
	console.log(time);
	var timeStamp = new Date(0);
	timeStamp.setUTCSeconds(time);
	console.log(timeStamp);
    botResponse = "REPOST @" + request.name + " , Original post by:" + original.Items[0].poster.S + ", At time: " + timeStamp + " Original Image: " + original.Items[0].Image.S;

    body = {
        "bot_id": process.env.botID,
        "text": botResponse
    };

    console.log('sending ' + botResponse + ' to ' + process.env.botID);

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
    console.log("REPOST");
    console.log(original.Items[0].poster.S);
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
        TableName: 'clarkteems3001',
        Item: {
            'Image': { S: request.attachments[0].url },
            'poster': { S: request.name },
            'date': { N: request.created_at.toString() },
            'hash': { S: hashT.toString() },
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
    HTTPS.get('https://api.groupme.com/v3/groups?token=' + process.env.GM_KEY, function (res) {
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
async function presentTime() {
	postMessage("Twas the night before Christmas, and all through the Chat, memes of shitty quality were being shared and laughed at");
	await sleep(1000);
	postMessage("When suddenly to everyone's shock, the very normal Christmas present was more than just a simple bot");
	await sleep(1000);
    postMessage("It exclaimed: I'm not sure which of you has been naught or nice, all I know is reposters better fucking think twice");
	await sleep(1000);
	postMessage("The time has meme stealing has departed, as the repost detector Clark3000 is started");
}
function initiateFile() {
    AWS.config.update({ region: 'us-east-2', accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var dynamo = new AWS.DynamoDB();
    // creating empty data file
    var data = '';
    //get all the messages
    HTTPS.get('https://api.groupme.com/v3/groups/31647877/messages?limit=100&token=' + process.env.GM_KEY, function (res) {
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
        res.on('end', async function () {
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
					var hashT = '';
                    hashT = await hashing(mess[i].attachments[0].url);
                    var params = {
                        TableName: 'clarkteems3001',
                        Item: {
                            'Image': { S: mess[i].attachments[0].url },
                            'poster': { S: mess[i].name },
                            'date': { N: mess[i].created_at.toString() },
                            'hash': { S: hashT.toString() },
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
    HTTPS.get('https://api.groupme.com/v3/groups/31647877/messages?before_id=' + messageID + '&limit=100&token=' + process.env.GM_KEY, function (res) {
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
							var hashT = '';
                            if (mess[i].favorited_by) {
                                fav = mess[i].favorited_by.length.toString()
                            } else {
                                fav = '0'
                            }
							if (mess[i].attachments[0].url){
								hashT = await hashing(mess[i].attachments[0].url);
							}
                            var params = {
                                TableName: 'clarkteems3001',
                                Item: {
                                    'Image': { S: mess[i].attachments[0].url },
                                    'poster': { S: mess[i].name },
                                    'date': { N: mess[i].created_at.toString() },
                                    'hash': { S: hashT.toString() },
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
                            await sleep(120);
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
function hashingCrop(url) {
    var hashT = '';
    var size = 7;
    return new Promise(resolve => {
        setTimeout(() => {
            gm(request(url))
                .resize(size+1, size, '!')
                //.crop(size+1,size,0,0)
				.colorspace('GRAY')
                .noProfile()
                .write('reformat.png', function (err) {
                    if (!err) console.log("hashed");
                    PNG.decode('reformat.png', function (pixels) {
                        var ui32 = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.byteLength / Uint32Array.BYTES_PER_ELEMENT);
                        var Hashn = '';
						//Hashing of first half
                        for (var i = 0; i < ui32.length; i++) {
                            if (i%8 != 0) {
								if(ui32[i] < ui32[i+1]){
									Hashn += '1';
								}
								else{
									Hashn += '0';
								}
							}
                        }
						console.log("Cropped:")
					    console.log(Hashn)
                        Hashn = parseInt(Hashn, 2)					                        
					    console.log(Hashn)
                        hashT = Hashn.toString(16)
						console.log(hashT)
                        resolve(hashT);
                    });
                });
        }, 200);
    });
}
function hashing(url) {
    var hashT = '';
    var size = 7;
    return new Promise(resolve => {
        setTimeout(() => {
            gm(request(url))
				.autoOrient()
				.blur(7,3)
			    .noProfile()
				.colorspace('Rec709Luma')
				.filter('Gaussian')
				.unsharp(0, 5,2)
                .resize(size+1, size, '!')
                //.crop(size,size,0,0)
                .write('reformat.png', function (err) {
                    if (!err) console.log("hashed");
                    PNG.decode('reformat.png', function (pixels) {
                        var ui32 = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.byteLength / Uint32Array.BYTES_PER_ELEMENT);
                        var Hashn = '';
						//Hashing of first half
                        for (var i = 0; i < ui32.length; i++) {
                            if (i%8 != 0) {
								if(ui32[i] < ui32[i+1]){
									Hashn += '1';
								}
								else{
									Hashn += '0';
								}
							}
                        }
					    console.log("Normal:")
                        console.log(Hashn)
                        Hashn = parseInt(Hashn, 2)
                        console.log(Hashn)
                        hashT = Hashn.toString(16)
						console.log(hashT)
                        resolve(hashT);
                    });
                });
        }, 200);
    });
}
function uploadfile() {
    AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });
    var s3 = new AWS.S3();
    fs.readFile('reformat.png', function (err, data) {
        if (err) { throw err; }

        var base64data = new Buffer(data, 'binary');
        s3.putObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: 'reformat.png',
            Body: base64data,
            ACL: 'public-read'
        }, function (resp) {
                console.log(arguments);
                fs.unlink('reformat.png', function (err, data) {
                    if (err) {
                        console.log("Error", err);
                    } else {
                        console.log("Deleted");
                    }
                });
            console.log('Successfully uploaded package.');
        });
    });
}
function postMessage(botResponse) {
    var botResponse, options, body, botReq;


    options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };

    body = {
        "bot_id": process.env.botID,
        "text": botResponse
    };

    console.log('sending ' + botResponse + ' to ' + process.env.botID);

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

/**
*Old hashing methods used a custom type of aHash
function hashingCrop(url) {
    var hashT = '';
    var size = 8;
    return new Promise(resolve => {
        setTimeout(() => {
            gm(request(url))
                .resize(size, size + 3, '!')
                .crop(size,size,0,0)
				.colorspace('GRAY')
                .noProfile()
                .write('reformat.png', function (err) {
                    if (!err) console.log("hashed");
                    PNG.decode('reformat.png', function (pixels) {
                        var ui32 = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.byteLength / Uint32Array.BYTES_PER_ELEMENT);
                        var Hashn = '';
                        var total1 = 0;
						var total2 = 0;
						//Hashing of first half
                        for (var i = 0; i < ui32.length/2; i++) {
                            total1 += ui32[i]
                        }
                        total1 = total1 / (size * size/2)
                        for (var i = (ui32.length/2); i < ui32.length; i++) {
                            total2 += ui32[i]
                        }
                        total2 = total2 / (size * size/2)	

						//Hashing of second half
                        for (var i = 0; i < ui32.length/2; i++) {
                            if (ui32[i] > total1) {
                                Hashn += '1';
                            }
                            else {
                                Hashn += '0';
                            }
                        }
					    for (var i = (ui32.length/2); i < ui32.length; i++) {
                            if (ui32[i] > total2) {
                                Hashn += '1';
                            }
                            else {
                                Hashn += '0';
                            }
                        }
						console.log("Cropped:")
					    console.log(Hashn)
                        Hashn = parseInt(Hashn, 2)					                        
					    console.log(Hashn)
                        hashT = Hashn.toString(16)
						console.log(hashT)
                        resolve(hashT);
                    });
                });
        }, 200);
    });
}
function hashing(url) {
    var hashT = '';
    var size = 8;
    return new Promise(resolve => {
        setTimeout(() => {
            gm(request(url))
                .resize(size, size+2, '!')
                .crop(size,size,0,0)
				.colorspace('GRAY')
                .noProfile()
                .write('reformat.png', function (err) {
                    if (!err) console.log("hashed");
                    PNG.decode('reformat.png', function (pixels) {
                        var ui32 = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.byteLength / Uint32Array.BYTES_PER_ELEMENT);
                        var Hashn = '';
                        var total1 = 0;
						var total2 = 0;
						//Hashing of first half
                        for (var i = 0; i < ui32.length/2; i++) {
                            total1 += ui32[i]
                        }
                        total1 = total1 / (size * size/2)
                        for (var i = (ui32.length/2); i < ui32.length; i++) {
                            total2 += ui32[i]
                        }
                        total2 = total2 / (size * size/2)	

						//Hashing of second half
                        for (var i = 0; i < ui32.length/2; i++) {
                            if (ui32[i] > total1) {
                                Hashn += '1';
                            }
                            else {
                                Hashn += '0';
                            }
                        }
					    for (var i = (ui32.length/2); i < ui32.length; i++) {
                            //console.log(ui32[i]);
							if (ui32[i] > total2) {
                                Hashn += '1';
                            }
                            else {
                                Hashn += '0';
                            }
                        }
					    console.log("Normal:")
                        console.log(Hashn)
                        Hashn = parseInt(Hashn, 2)
                        console.log(Hashn)
                        hashT = Hashn.toString(16)
						console.log(hashT)
                        resolve(hashT);
                    });
                });
        }, 200);
    });
}
**/
"use strict";
var utils = require('@ponury/utils');
var c = 0;
var collection = [];
var readline = require('readline');
var requests = [];

function cb(response) {
	console.log("Got response :)");
	console.log(response);
}

class Functions {
	constructor(id) {
		this.start = utils.microtime();
		this.id = id;
		this.result = null;
	}

	time() {
		this.result = utils.microtime();
	}

	ping() {
		this.result = "pong";
	}

	get(key) {
		if (utils.getType(key) !== "Integer") {
			throw new Error("Key has to be integer");
		}
		if (collection[key] === undefined) {
			throw new Error("Key don't exists");
		}

		this.result = collection[key];
	}

	set(key, value) {
		if (utils.getType(key) !== "Integer") {
			throw new Error("Key has to be integer");
		}
		if (collection[key] === undefined) {
			throw new Error("Key don't exists");
		}
		collection[key] = value;
		this.result = true;
	}

	add(value) {
		collection.push(value);
		let keys = Array.from(collection.keys());
		console.log("keys", keys);
		this.result = keys.splice(-1, 1);
	}

	delete(key) {
		if (utils.getType(key) !== "Integer") {
			throw new Error("Key has to be integer");
		}
		if (collection[key] === undefined) {
			throw new Error("Key don't exists");
		}

		this.result = !!collection[key].splice(key, 1);
	}

	getList() {
		this.result = collection;
	}

	_response() {
		return {
			"id" : this.id, "type" : "response", "response" : {
				"status" : "ok", "time" : utils.microtime() - this.start, "data" : this.result
			}
		};
	}
}

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port : 8080});
wss.on('connection', function (ws) {

	function _request(id, method, args, cb) {
		let request = {
			"id" : id, "type" : "request", "request" : {
				"method" : method, "args" : args
			}
		};
		requests[id] = {"request" : request, "cb" : cb};
		return request;
	}

	function _response(id, method, args) {
		let f = new Functions(id);
		if (typeof f[method] == "function") {
			try {
				f[method](args);
				ws.send(JSON.stringify(f._response()));
			} catch (e) {
				ws.send(JSON.stringify({
					"id" : id, "type" : "response", "response" : {
						"time" : utils.microtime() - f.start, "status" : "error", "error" : e.message
					}
				}));
			}
		} else {
			ws.send(JSON.stringify({
				"id" : id, "type" : "response", "response" : {
					"time" : utils.microtime() - f.start, "status" : "error", "error" : "Call to undefined method!"
				}
			}));
		}
	}



	ws.on('message', function (message, flag) {
		try {
			message = JSON.parse(message);
		} catch (e) {

		}
		let response = {
			"id" : message.id, "type" : "response", "response" : {
				"status" : "error", "message" : "Something goes realy bad :("
			}
		};

		if (message.type == "request") {
			console.log("Request");
			console.log(message);
			_response(message.id, message.request.method, message.request.args);
			return;
		} else if (message.type == "response") {
			console.log("Response");
			if (requests[message.id] === undefined) {
				console.log("Response id undefined");
			} else if (message.response.status == "ok") {
				requests[message.id].cb(message);
			} else {
				console.log("Request #" + message.id + " failed with message '" + message.error + "'");
				console.log(message);
			}
			return;
		} else {
			console.log(message, message.type);
			console.log("Unknown message type");
		}
		ws.send(JSON.stringify(response));
		//process.stdout.write('.');
		//process.exit();
	});
	console.log("count: " + wss.clients.length);
	console.log(wss.clients);
	let pinger = setInterval(function () {
		c++;
		try {
			ws.send(JSON.stringify(_request(c, "ping", null, cb)));
		} catch (e) {
			console.log(e.message);
		}
	}, 5000);

	ws.on("close", function (code, message) {
		clearInterval(pinger);
		rl.close();
		console.log(code, message);
	});

	var rl = readline.createInterface({
		input : process.stdin, output : process.stdout
	});
	rl.on("line", function (line) {
		if (line == "request") {
			rl.question('Method: ', function (method) {
				console.log('Method is ' + method);
				rl.question('Value: ', function (value) {
					console.log('Value is ' + value);
					c++;
					ws.send(JSON.stringify(_request(c, method, value, cb)));
				});
			});
		} else {
			console.log(line);
		}
	});
	rl.prompt();

});
console.log("Server started");
console.log(wss);

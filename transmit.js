// node.js application that simulates multiple touches to tuio tracker
// built based on TUIO specification: http://www.tuio.org/?specification
// davidptracy for LAB at Rockwellgroup

var osc = require('node-osc');

var debugTag = 0;

var touches = new Array();

var touchIndexCounter = 0;

var receivePort 	= process.argv[2];
var sendPort = process.argv[3];
var lifeSpan = process.argv[4];
var interval = process.argv[5]; //sm

var float_Eplison = 1.175494351e-38;

if(receivePort == "-h"){
	console.log("transmit.js requires (3) arguments to run. Please re-run as follows:");
	console.log("------------------------------------------------------------------------");
	console.log("node transmit.js [receivedPort] [sendPort] [lifeSpan] [interval]");
	console.log("default [receivedPort=4444] [sendPort=3333] [lifeSpan=10] [interval=100]");
	console.log("So if not get new point the point lifetime = lifeSpan*interval sm");
	console.log("------------------------------------------------------------------------");
	process.exit();
}

// if we are missing arguments from the command line ...

if(lifeSpan == null) {
	lifeSpan = '10'; //1s
}
if(interval == null) {
	interval = '100'; //1s
}

if(sendPort == null) {
	console.log("Osc send Port: 3333");
	sendPort = 3333;
}

if(receivePort == null) {
	console.log("Osc receive Port: 4444");
	receivePort = 4444;
}

var client = new osc.Client('127.0.0.1', sendPort); //localhost and standard TUIO ports
if(client != null){
	console.log("Tuio send Port:"+sendPort+" ........Ready!");
}


var oscServer = new osc.Server(receivePort, '0.0.0.0');
if(oscServer != null){
	console.log("Osc received Port:"+receivePort+" ........Ready!");
}

var points_arr = new Array();
oscServer.on('message', function (msg) {
		if(debugTag){
			console.log('Message:');
	    console.log(msg[0]);
			console.log(msg[1]);		}

		if(msg[0] == "/tuiomw/v1")
		{
			points_arr = msg[1].split(',');
			touches = [];
		}
		for(i = 0;i<points_arr.length;i++)
		{
			if(i%3 == 0){
				var p = new _point();
				p._sId = parseInt(points_arr[i]);
			}
			else if(i%3 == 1){
				p._x = parseFloat(points_arr[i]);
			}
			else{
				p._y = parseFloat(points_arr[i]);
				var touch = new Touch(p._sId, lifeSpan, p._x, p._y);

				touches.push(touch);
				if(debugTag){
					console.log("====touches updated ====");
					console.log(touches);
				}

			}
		}

});

function _point()
{
	this._sId = 0;
	this._x = 0;
	this._y = 0;
}


// start with an initial amount of touches
// for (var i = 0; i < touchCount; i++) {
// 	// iterator serves as sessionId for each touch
// 	var random = getRandomRange(intervalMin, intervalMax);
// 	console.log("Creating Touch with lifespan of " + random);
//
// 	var touch = new Touch(i, random );
// 	touches.push(touch);
// 	touchIndexCounter ++; // keep track of our lifespan
// };

var fSeq = 0; //used to set a unique frame id to conclude each message chunk

// if the app is terminated, this function will reset the frame id and touch ids
var reset = function(){

	console.log("Resetting all touches ...");

	var aliveMsg =  new osc.Message('/tuio/2Dcur')
	aliveMsg.append("alive");
	client.send(aliveMsg, function(err){
		if (err) console.log(err);
	});

	var fseqMsg =  new osc.Message('/tuio/2Dcur')
	fseqMsg.append("fseq");
	fseqMsg.append(-1); //sessionId
	client.send(fseqMsg, function(err){
		if (err) console.log(err);
	});
}

var addTouch = function(){
	var touch = new Touch(touchIndexCounter);
	touches.push(touch);
}

// build the message bundle and send it
var sendMessage = function(){
	aliveMessage();
	setMessage();
	frameSequenceMessage();
	cleanupTouches();
}

// 1 -----> send the alive message first
var aliveMessage = function() {

	aliveTouches = new Array();

	var aliveMsg = new osc.Message('/tuio/2Dcur');
	aliveMsg.append("alive");
	//add all active touches

	for (touch of touches){
		if ( touch.isAlive() ){
			aliveMsg.append( touch.getSessionId() );
			aliveTouches.push( touch.getSessionId() );
		}
	}

	client.send(aliveMsg, function(err){
		if (err) console.log(err);
		if(debugTag){
			console.log(aliveTouches);
		}

	});

}

// 2 -----> send the updated set message for each touch (position, etc)
var setMessage = function() {
	for (var i = 0; i < touches.length; i++) {
		touches[i].update();
		touches[i].sendMessage();
	};

}

// 3 -----> finally send the frame sequence message with unique ID to conclude the tuio chunk
var frameSequenceMessage = function() {
	var fseqMsg =  new osc.Message('/tuio/2Dcur')
	fseqMsg.append("fseq");
	fseqMsg.append(fSeq); //sessionId
	client.send(fseqMsg, function(err){
		if (err) console.log(err);
	});
	fSeq ++; // frame sequence must be incremented each call so its unique
}

var cleanupTouches = function(){

	var deadTouches = new Array();

	//loop through all touches, get index of dead touches
	for (var i=0; i<touches.length; i++){
		if ( !touches[i].isAlive() ){
			deadTouches.push(i);
		}
	}

	//now loop through deadTouches, removing items from touches array
	for (var i =0; i<deadTouches.length; i++){
		touches.splice(deadTouches[i], 1);

		if(debugTag){
			console.log("Adding New Touch with ID: " + touchIndexCounter);
		}

		// var touch = new Touch(touchIndexCounter, getRandomRange(intervalMin, intervalMax) );
		// touches.push(touch);
		touchIndexCounter ++;
	}
}

function getRandomRange(_min, _max){
	return Math.random()*(_max - _min)+ _min;
}

reset();
setInterval(sendMessage, interval);




// =====================================================
// ================== Touch Class ======================
// =====================================================

function Touch(_sessionId, _lifespan, _x, _y){

	this.location		= {"x": _x, "y": _y };
	this.velocity		= {"x": float_Eplison, "y": float_Eplison};
	this.acceleration	= float_Eplison;
	this.sessionId		= _sessionId;
	this.fSeq 			= _sessionId;
	this.lifeSpan		= _lifespan;
	this.lifeCounter 	= 0;
	this.alive 			= true;
};

Touch.prototype.update = function(){

	if(this.lifeCounter < this.lifeSpan) this.lifeCounter ++;
	else this.alive = false;

};

Touch.prototype.sendMessage = function(){

	if (this.alive){

		var setMsg =  new osc.Message('/tuio/2Dcur')
		setMsg.append("set");
		setMsg.append(this.sessionId); //sessionId
		setMsg.append( this.location.x ); //x_pos
		setMsg.append( this.location.y ); //y_pos
		setMsg.append( this.velocity.x ); //x_vel
		setMsg.append( this.velocity.y ); //y_vel
		setMsg.append( this.acceleration ); //acceleration
		client.send(setMsg, function(err){
			if (err) console.log(err);
			// console.log(setMsg);
		});

	}
};

Touch.prototype.getSessionId = function(){
	return this.sessionId;
}

Touch.prototype.isAlive = function(){
	if (this.alive) return true;
	else return false;
}

// method to cleanup touches on program exit
process.on('SIGINT', function() {
  console.log('TEST');
  reset();
  process.exit();
});

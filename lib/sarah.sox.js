var spawn = require('child_process').spawn;
var fs    = require('fs');

// ------------------------------------------
//  SOX WRAPPER
//  https://github.com/jacksonh/sox/blob/master/scripts/voice-cleanup.sh
// ------------------------------------------

var iSRecording = false;
var records = []; 
var recordVoice = exports.recordVoice = function(ee){
  var rec = spawn(__dirname + Config.sox.path, Config.sox.args,  { stdio: 'pipe' });
  
  rec.stdout.on('readable', function() { ee.emit('speechReady'); });
  rec.stdout.setEncoding('binary');
  rec.stdout.on('data', function(data) {
    if(!iSRecording) {
      ee.emit('speechStart');
      iSRecording = true;
    }
    records.push(data);
  });
  
  rec.stderr.setEncoding('utf8');
  // rec.stderr.on('data', function(data) { warn(data) });
  
  rec.on('close', function(code) {
    iSRecording = false;
    if(code) { ee.emit('error', 'sox exited with code ' + code); }
    
    ee.emit('speechStop');
    if (records){ 
      fs.writeFile('output.wav', toBuffer(records));
      ee.emit('speechBuffer', toBuffer(records)); 
    }
    records = [];
  });
}

// ------------------------------------------
//  STREAM BUFFER
// ------------------------------------------

var streamBuffers = require('stream-buffers');
var toBuffer = function(records){
  var osb = new streamBuffers.WritableStreamBuffer({
    initialSize: (100 * 1024),   // start at 100 kilobytes.
    incrementAmount: (10 * 1024) // grow by 10 kilobytes each time buffer overflows.
  });
  for(var i = 0 ; i < records.length ; i++) {
    osb.write(new Buffer(records[i], 'binary'));
  }
  osb.end();
  return osb.getContents();
}

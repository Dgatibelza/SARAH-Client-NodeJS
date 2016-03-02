var fs = require('fs');
var request = require('request');

// ==========================================
//  LOG MANAGER
// ==========================================

var winston = require('winston');
// winston.add(winston.transports.File, { filename: __dirname+'/data/server.log' });
winston.addColors({ info : 'blue', warn : 'orange', error : 'orange' });

// Add global function for logging
global.debug = winston.debug;
global.log   = winston.log;
global.info  = winston.info;
global.warn  = winston.warn;
global.error = winston.error;

// Catch all
process.on('uncaughtException', function (err) {
  error('Caught exception: '+err.stack);
});

// Starting CLIENT
info("==========================================");
info(" STARTING SARAH Client ");
info(" Path: ", __dirname);
debug(" Modules: ", process.env.NODE_PATH);
info("==========================================");

// ==========================================
//  CONFIG MANAGER
// ==========================================

var CONFIG = 'config.prop';

global.Config = {}
var init = function(){
  if (!fs.existsSync(CONFIG)) { return; }
  info('Loading properties...', CONFIG);
  var json = fs.readFileSync(CONFIG, 'utf8');
  global.Config = JSON.parse(json);
}
init();

// ==========================================
//  PLUGIN CODE
// ==========================================

var EventEmitter = require('events').EventEmitter;
var sox     = require('./lib/sarah.sox.js');
var oxford  = require('./lib/sarah.oxford.js');
var engine  = require('./lib/sarah.engine.js');

engine.init();

var ee = new EventEmitter();
ee.on('error',    (err) => { warn(err); });
ee.on('speechReady', () => { info('speechReady'); });
ee.on('speechStart', () => { info('speechStart'); });
ee.on('speechStop',  () => { info('speechStop'); sox.recordVoice(ee); });

ee.on('speechBuffer', (buffer) => {
  oxford.speech2Text(buffer, function(err, confidence, lexical){
    if (err) return warn(err);
    ee.emit('speech2Text', confidence, lexical)
  });
});

ee.on('speech2Text', (confidence, lexical) => {
  engine.findGrammar(confidence, lexical, function(err, score, match){
    if (err) return warn(err);
    info('confidence:', confidence, 'score:', score, 'lexical:', lexical, ' => ', match);
    request({ 'uri' : match.data.url }, function (err, res, body){ 
      if (err) warn(err.message);
      if (res && res.statusCode) warn(res.statusCode);
      info(body); 
    });
  });
});

sox.recordVoice(ee);

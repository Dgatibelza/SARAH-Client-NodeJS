var fs        = require('fs');
var extend    = require('extend');
var clj_fuzzy = require('clj-fuzzy');
var soundex   = require('./sarah.soundex.js').soundex;

// ------------------------------------------
//  SPEECH ENGINE
// ------------------------------------------

var GRAMMAR = {}

var CACHE = [];  
var loadGrammar = function(){
  
  var folder = __dirname + '/../grammar';
  if (!fs.existsSync(folder)) { return; }  
  fs.readdirSync(folder).forEach(function(file){
    var path = folder+'/'+file; 
    
    // Directory
    if (fs.statSync(path).isDirectory()){
      return loadGrammar(path, json);
    }
    
    // Ends with .json
    if (file.endsWith('.json')){
      info('Loading grammar... %s', path);
      try {
        var load =  fs.readFileSync(path,'utf8');
        var json = JSON.parse(load);
        extend(true, GRAMMAR, json);
      } catch(ex){ error('Error in %s: %s', file, ex.message); }
    }
  });
}

var expandCache = function(){
  
  // Expands OR
  for (var idx=0 ; idx < CACHE.length ; idx++){
    var cache = CACHE[idx];
    cache.lexical.replace(/\[[^\]]+\]/, function(oneof){
      CACHE.splice(idx, 1);  idx--;
      oneof.substring(1,oneof.length-1)
           .split('|').forEach(function(item){
             var clone = extend(true, {}, cache);
             clone.lexical = clone.lexical.replace(oneof, item);
             clone.soundex = soundex(clone.lexical);
             CACHE.push(clone);
           });
    })
  }
  
  // Expands AND
  for (var idx=0 ; idx < CACHE.length ; idx++){
    var cache = CACHE[idx];
    cache.lexical.replace(/\$\w+/, function(grammar){
      CACHE.splice(idx, 1);  idx--;
      var g = GRAMMAR[grammar.substring(1,grammar.length)];
      Object.keys(g).forEach(function(key, value){
        var clone = extend(true, {}, cache);
        clone.lexical = clone.lexical.replace(grammar, key);
        clone.soundex = soundex(clone.lexical);
        if (clone.data.url && g[key].url) clone.data.url += g[key].url + '&';  
        CACHE.push(clone)
      });
    })
  };
}

var init = exports.init = function(){
  loadGrammar(); 
  for (var grammar in GRAMMAR){ 
    for (var lexical in GRAMMAR[grammar]){ 
      CACHE.push({
        "grammar" : grammar,
        "lexical" : lexical,
        "data"    : GRAMMAR[grammar][lexical],   
        "soundex" : soundex(lexical)
      });
    }
  }
  expandCache();
}


var findGrammar = exports.findGrammar = function(confidence, lexical, callback){
  var sdx   = soundex(lexical);
  var match = undefined;
  var score = 0;
  for (var i in CACHE){
    var levens  = clj_fuzzy.metrics.levenshtein(sdx, CACHE[i].soundex);
        levens  = 1 - (levens / CACHE[i].soundex.length); 
        
    if (levens > score && levens > Config.engine.confidence){
      score = levens;
      match = CACHE[i];
    }
  }
  callback(undefined, score, match);
}

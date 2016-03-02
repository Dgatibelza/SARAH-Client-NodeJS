// ------------------------------------------
//  OXFORD WRAPPER
//  https://gist.github.com/lukehoban/0ee5c1bef438dc5bd7cb
// ------------------------------------------

var fs = require('fs');
var util = require('util');
var request = require('request');

var speech2Text = exports.speech2Text = function(wavBuffer, callback){
  getAccessToken(Config.oxford.clientId, Config.oxford.primaryKey, function(err, accessToken) {
    if(err) return warn(err);
    debug('Got access token: ' + accessToken)
    
    speechToText(wavBuffer, accessToken, function(err, res) {
      if(err) return callback(err);
      if (!res.results) return callback('No results');
      callback(undefined, res.results[0].confidence, res.results[0].lexical, res.results);
    });
  });
}

var accessToken;
var timeout = 0
var getAccessToken = function(clientId, clientSecret, callback) {
  if (accessToken && timeout > (new Date()).getTime()){
    return callback(undefined, accessToken);
  }
  
  request.post({
    url: 'https://oxford-speech.cloudapp.net/token/issueToken',
    form: {
      'grant_type': 'client_credentials',
      'client_id': encodeURIComponent(clientId),
      'client_secret': encodeURIComponent(clientSecret),
      'scope': 'https://speech.platform.bing.com'
    }
  }, function(err, resp, body) {
    if(err) return callback(err);
    try {
      var json = JSON.parse(body);
      accessToken = json.access_token;
      if(accessToken) {
        callback(null, accessToken);
        timeout = (new Date()).getTime() + parseInt(json.expires_in) * 1000;
      } else   { callback(body); }
    } catch(e) { callback(e);    }
  });
}

var speechToText = function(wavBuffer, accessToken, callback) {
  request.post({
    url: 'https://speech.platform.bing.com/recognize/query',
    qs: {
      'scenarios': 'ulm',
      'appid': 'D4D52672-91D7-4C74-8AD8-42B1D98141A5', // This magic value is required
      'locale': Config.oxford.locale,
      'device.os': 'wp7',
      'version': '3.0',
      'format': 'json',
      'requestid': '1d4b6030-9099-11e0-91e4-0800200c9a66', // can be anything
      'instanceid': '1d4b6030-9099-11e0-91e4-0800200c9a66' // can be anything
    },
    body: wavBuffer,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'audio/wav; samplerate=16000',
      'Content-Length' : wavBuffer.length
    }
  }, function(err, resp, body) {
    if(err) return callback(err);
    try {
      callback(null, JSON.parse(body));
    } catch(e) {
      callback(e);
    }
  });
}
/*
 * Primary file for the API
 *
 */

// Dependencies
// http server that allows you to listen on ports and respond with data
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');

// Instantiating the HTTP server
var httpServer = http.createServer(function(req,res){
  unifiedServer(req,res);
});

// Start the server
httpServer.listen(config.httpPort,function(){
  console.log('The server is listening on port '+config.httpPort);
});

// Instantiating the HTTPS server
var httpsServerOptions = {
  'key' : fs.readFileSync('./https/key.pem'),
  'cert' : fs.readFileSync('./https/cert.pem')
};
var httpsServer = https.createServer(httpsServerOptions,function(req,res){
  unifiedServer(req,res);
});
// Start the HTTPS server
httpsServer.listen(config.httpsPort,function(){
  console.log('The server is listening on port '+config.httpsPort);
});

// All the server logic for both http and https server
var unifiedServer = function(req,res) {
  // Get URL and parse it
  var parsedUrl = url.parse(req.url,true)
  // Get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g,'');
  // Get the query string as an object
  var queryStringObject = parsedUrl.query;
  // Get the HTTP method
  var method = req.method.toLowerCase();
  // Get the headers as an object
  var headers = req.headers;
  // Get the payload, if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  // As data is streaming in, the event triggers the callback to append the result to buffer
  req.on('data',function(data) {
    buffer += decoder.write(data);
  });
  req.on('end',function() {
    buffer += decoder.end();
    // Choose the handler this request should go to, if none match, use NotFound handler
    var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;
    // Construct the data objcet to send to the handler
    var data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method' : method,
      'headers' : headers,
      'payload' : buffer
    };
    // Route the request to handler specified in the router
    chosenHandler(data,function(statusCode,payload) {
      // Use the status code calledback by the handler, or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200
      // Use the payload calledback by the handler or default to empty object
      payload = typeof(payload) == 'object' ? payload : {};
      // Convert payload to a string
      var payloadString = JSON.stringify(payload);
      // Return the response
      // Now that the request is done, we should send the response
      res.setHeader('Content-Type','application/json')
      res.writeHead(statusCode);
      res.end(payloadString);
      // Log the request path
      console.log('Returning this response',statusCode,payloadString);
    });
  });

};

// Define handlers
var handlers = {};
// ping handler
handlers.ping = function(data,callback) {
  callback(200);
}
// hello handler
handlers.hello = function(data,callback) {
  callback(201,{'message':'Hi welcome to the API test. Hello to you too!'});
};
// Not found handler
handlers.notFound = function(data,callback) {
  callback(404);
};

// Define a request router
var router = {
  'ping' : handlers.ping,
  'hello' : handlers.hello
}

/*
 * Copyright 2015 Intel Corporation. All rights reserved.
 */
/*global require: false, module: true */
(function () {
    "use strict";
    
    /*
     * This proxy creates a tunnel connection for browser-to-browser communication.
     */
    var http = require("http"),
        WebSocketServer = require("ws").Server,
        protocol = require("./protocol");

    var _wss,
        _server;
    
    function start(callback) {
        _server = http.createServer();
        _server.listen(0, function () {
            _wss = new WebSocketServer({server: _server});
            _wss.on('connection', protocol.handleConnection);
            callback();
        });
        return;
    }
    
    function getPort() {
        if (_server) {
            return _server.address().port;
        }
        return -1;
    }
    
    module.exports = {
        start: start,
        getPort: getPort
    };
}());


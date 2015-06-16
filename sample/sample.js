/*global require: false, console: false */
(function () {
    "use strict";
    var wsRPCServer = require("../server/server"),
        server = require("./server/server"),
        cprocess = require('child_process'),
        open = require("open");

    var port = -1;

    console.log("Staring proxy.");
    wsRPCServer.start(function () {
        server.start().then(function () {
            port = wsRPCServer.getPort();
            console.log("Started server on " + port);
            if (port > 0) {
                open("http://localhost:8080/client/index.html?" + port);
            } else {
                console.log("Proxy does not return port: " + port);
            }
        });
    });

}());

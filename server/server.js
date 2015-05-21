/*global require: false, module: false, console: false */
(function () {
    "use strict";
    var http = require("http"),
        url = require("url"),
        fs = require("fs"),
        Deferred = require("../util/deferred");
    
    var data = fs.readFileSync("client/index.html"),
        script = fs.readFileSync("client/main.js");
    
    var _server = http.createServer();

    function start() {
        var deferred = new Deferred();
        _server.listen(8080, function () {
            _server.on('request', function (req, res) {
                var u = url.parse(req.url);
                console.log("Request: " + u.pathname);
                if (u.query) {
                    console.log("Query: " + u.query);
                }
                switch (u.pathname) {
                case "/client/index.html":
                    res.end(data);
                    return;
                case "/client/main.js":
                    res.end(script);
                    return;
                default:
                    res.statusCode = 404;
                    res.end();
                    return;
                }
            });
            deferred.done();
        });
        return deferred;
    }
    
    module.exports = {
        start: start
    };
    
}());
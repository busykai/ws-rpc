/*global window: false, console:false, WebSocket: false, document: false, navigator: false, peer: true */
(function () {
    "use strict";

    window.peer = {};
    
    var _LETTERS_AND_NUMBERS = "abcdefghijklmnopqrstuvwxyz0123456789";

    function _getRandomID() {
        var result = "",
            i;
        for (i = 0; i < 10; i++) {
            result += _LETTERS_AND_NUMBERS[Math.floor(Math.random() * _LETTERS_AND_NUMBERS.length)];
        }
        return result;
    }
    
    function userAgent() {
        return navigator.userAgent;
    }
    
    var _calls = {};

    window.addEventListener("load", function () {
        console.log("connecting...");
        var port,
            ws,
            connection = {
                id: "channel1"
            },
            api = [
                {
                    function: "userAgent",
                    arguments: [],
                    handler: userAgent
                }
            ],
            handlers = {
                userAgent: userAgent
            };
        port = window.location.search.substring(1);
        try {
            port = parseInt(port, 10);
        } catch (e) {
            console.error("Cannot parse port: " + port);
        }
        ws = new WebSocket("ws://localhost:" + port + "/hey");
        console.log("connected!");
        
        function publishAPI() {
            var payload = {
                type: "publish",
                id: connection.id,
                us: connection.us,
                them: connection.them,
                api: api
            };
                
            ws.send(JSON.stringify(payload));
        }
        
        function handlePublish(payload) {
            var i;
            
            function makeFunction(api) {
                return function () {
                    var call;
                    if (arguments.length !== api.arguments.length + 1) {
                        console.error("Wrong number of arguments!");
                        return;
                    }
                    call = {
                        type: "call",
                        id: connection.id,
                        us: connection.us,
                        them: connection.them,
                        fn: api.function,
                        arguments: Array.prototype.slice.call(arguments),
                        trace: _getRandomID()
                    };
                    _calls[call.trace] = arguments[arguments.length - 1];
                    ws.send(JSON.stringify(call));
                };
            }
            
            for (i = 0; i < payload.api.length; i++) {
                console.log("Creating function: " + api[i].function);
                window.peer[api[i].function] = makeFunction(api[i]);
            }
            
            window.peer.ready = true;
        }
        
        function handleCall(payload) {
            var result = handlers[payload.fn].apply(null, payload.arguments),
                rpayload = {
                    type: "return",
                    id: connection.id,
                    us: connection.us,
                    them: connection.them,
                    trace: payload.trace,
                    result: result
                };
            ws.send(JSON.stringify(rpayload));
        }
        
        function handleReturn(payload) {
            var callback = _calls[payload.trace];
            callback(payload.result);
        }
        
        ws.onopen = function () {
            var payload = {
                type: "handshake",
                id: connection.id
            };
            ws.send(JSON.stringify(payload));
        };
        
        ws.onmessage = function (e) {
            var payload;
            
            try {
                payload = JSON.parse(e.data);
            } catch (err) {
                console.error("Cannot parse payload " + e.data);
                return;
            }
            
            if (!payload.type) {
                console.error("Payload has not type " + e.data);
            }
            
            switch (payload.type) {
            case "handshake":
                connection.us = payload.us;
                connection.them = payload.them;
                publishAPI();
                break;
            case "publish":
                handlePublish(payload);
                console.log(payload);
                break;
            case "call":
                handleCall(payload);
                break;
            case "return":
                handleReturn(payload);
                break;
            default:
                console.error("Payload type is not understood: " + payload.type);
                return;
            }
        };
        var button = document.getElementById("call");
        button.onclick = function () {
            if (peer.ready) {
                peer.userAgent(function (result) {
                    var pre = document.getElementById("result");
                    pre.innerHTML = result;
                });
            }
        };
    });
}());
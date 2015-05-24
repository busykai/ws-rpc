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
    
    var _wsrpc = {},
        _calls = {};

    _wsrpc.init = function (def) {
        var port,
            ws,
            _if, /* own representation of the interface */
            i;
        /* reshape api to avoid sending functions. */
        _if = def;
        _if.handlers = {};
        for (i = 0; i < def.api.length; i++) {
            if (!def.api[i].handler) {
                throw new Error("No handler specified: " + JSON.stringify(def.api[i]));
            }
            _if.handlers[def.api[i].function] = def.api[i].handler;
            delete _if.api[i].handler;
        }
        /* FIXME: ask the server for the connection information */
        port = window.location.search.substring(1);
        try {
            port = parseInt(port, 10);
        } catch (e) {
            console.error("Cannot parse port: " + port);
        }
        ws = new WebSocket("ws://localhost:" + port + "/wsrpc");
        
        function publishAPI() {
            var payload = {
                type: "publish",
                id: _if.connection.id,
                us: _if.connection.us,
                them: _if.connection.them,
                api: _if.api
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
                        id: _if.connection.id,
                        us: _if.connection.us,
                        them: _if.connection.them,
                        fn: api.function,
                        arguments: Array.prototype.slice.call(arguments),
                        trace: _getRandomID()
                    };
                    _calls[call.trace] = arguments[arguments.length - 1];
                    ws.send(JSON.stringify(call));
                };
            }
            
            for (i = 0; i < payload.api.length; i++) {
                console.log("Creating function: " + _if.api[i].function);
                window.peer[_if.api[i].function] = makeFunction(_if.api[i]);
            }
            
            window.peer.ready = true;
        }
        
        function handleCall(payload) {
            var result = _if.handlers[payload.fn].apply(null, payload.arguments),
                rpayload = {
                    type: "return",
                    id: _if.connection.id,
                    us: _if.connection.us,
                    them: _if.connection.them,
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
                id: _if.connection.id
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
                return;
            }
            
            switch (payload.type) {
            case "handshake":
                _if.connection.us = payload.us;
                _if.connection.them = payload.them;
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
    };

    window.wsrpc = _wsrpc;

}());

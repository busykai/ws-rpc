/*global window: false, console:false, WebSocket: false, document: false, navigator: false, peer: true */
(function () {
    "use strict";

    window.peer = {};
    var _wsrpc = {};
        
    var _LETTERS_AND_NUMBERS = "abcdefghijklmnopqrstuvwxyz0123456789";

    function _getRandomID() {
        var result = "",
            i;
        for (i = 0; i < 10; i++) {
            result += _LETTERS_AND_NUMBERS[Math.floor(Math.random() * _LETTERS_AND_NUMBERS.length)];
        }
        return result;
    }
    
    /** EVENTS **/
    
    var _E_OPEN     = "open",
        _E_CLOSE    = "close",
        _E_ERROR    = "error",
        _E_PEER     = "peer";
    
    var _events = {
    };
    
    function checkValidEvent(event) {
        switch (event) {
        case _E_CLOSE:
        case _E_ERROR:
        case _E_OPEN:
        case _E_PEER:
            return true;
        default:
            return false;
        }
    }
    
    _wsrpc.on = function (event, callback) {
        if (!checkValidEvent(event)) {
            return;
        }
        if (!_events[event]) {
            _events[event] = [callback];
        } else {
            _events[event].push(callback);
        }
    };
    
    function _dispatch(event, data) {
        if (!checkValidEvent(event)) {
            return;
        }
        var handlers = _events[event],
            i;
        
        if (!handlers) {
            return;
        }
        
        for (i = 0; i < handlers.length; i++) {
            handlers[i].apply(_wsrpc, data);
        }
    }

    /* AUX FUNCTIONS */
    function _emptyHanlder() {
        return;
    }
    
    var _calls = {};

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
                _dispatch(_E_ERROR, ["No handler specified: " + JSON.stringify(def.api[i])]);
                return;
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
                    var call,
                        handleReturn = false,
                        transmitArguments = Array.prototype.slice.call(arguments);
                    if (arguments.length > 0 && typeof arguments[arguments.length - 1] === "function") {
                        handleReturn = true;
                        transmitArguments.pop();
                    }
                    if ((handleReturn && arguments.length !== api.arguments.length + 1) ||
                            (!handleReturn && arguments.length !== api.arguments.length)) {
                        return;
                    }
                    call = {
                        type: "call",
                        id: _if.connection.id,
                        us: _if.connection.us,
                        them: _if.connection.them,
                        fn: api.function,
                        arguments: transmitArguments,
                        trace: _getRandomID()
                    };
                    _calls[call.trace] = handleReturn ? arguments[arguments.length - 1] : _emptyHanlder;
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
            _dispatch(_E_OPEN, []);
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
                _dispatch(_E_PEER, [_if.connection.them]);
                publishAPI();
                break;
            case "publish":
                handlePublish(payload);
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
        
        ws.onerror = function (e) {
            _dispatch(_E_ERROR, ["WS error " + e]);
        };
        
        ws.onclose = function (e) {
            _dispatch(_E_CLOSE, []);
        };
    };
    
    window.wsrpc = _wsrpc;

}());

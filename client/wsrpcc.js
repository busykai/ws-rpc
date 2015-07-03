/*global window: false, console:false, WebSocket: false, document: false, navigator: false, peer: true */
(function () {
    "use strict";

    window.peer = {};
    var _wsrpc = {};
    var ws;
    var _conn = {};
    var _LETTERS_AND_NUMBERS = "abcdefghijklmnopqrstuvwxyz0123456789";

    function _getRandomID() {
        var result = "",
            i;
        for (i = 0; i < 10; i++) {
            result += _LETTERS_AND_NUMBERS[Math.floor(Math.random() * _LETTERS_AND_NUMBERS.length)];
        }
        return result;
    }
    
    /** PEER EVENTS (from and to the remote peer) **/
    
    var _peerEventHandlers = {
    };
    
    window.peer.on = function (event, callback) {
        if (!_peerEventHandlers[event]) {
            _peerEventHandlers[event] = [callback];
        } else {
            _peerEventHandlers[event].push(callback);
        }
    };
    
    
    // this impl will be replaced on init
    window.peer.dispatch = function (event, args) {
        return;
    };
    
    /** LIFECYCLE EVENTS (observe how this module does) **/
    
    var _E_OPEN     = "open",
        _E_CLOSE    = "close",
        _E_ERROR    = "error",
        _E_PEER     = "peer",
        _E_PUBLISH  = "publish";
    
    var _eventHandlers = {
    };
    
    function checkValidEvent(event) {
        switch (event) {
        case _E_CLOSE:
        case _E_ERROR:
        case _E_OPEN:
        case _E_PEER:
        case _E_PUBLISH:
            return true;
        default:
            return false;
        }
    }
    
    _wsrpc.on = function (event, callback) {
        if (!checkValidEvent(event)) {
            return;
        }
        if (!_eventHandlers[event]) {
            _eventHandlers[event] = [callback];
        } else {
            _eventHandlers[event].push(callback);
        }
    };
    
    function _dispatch(event, data) {
        if (!checkValidEvent(event)) {
            return;
        }
        var handlers = _eventHandlers[event],
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
    
    _wsrpc.publishAPI = function (def) {
        var _if, /* own representation of the interface */
            i;
        /* reshape api to avoid sending functions. */
        _if = def;
        if (!_conn.handlers) {
            _conn.handlers = {};
        }
        for (i = 0; i < def.api.length; i++) {
            if (!def.api[i].handler) {
                _dispatch(_E_ERROR, ["No handler specified: " + JSON.stringify(def.api[i])]);
                return;
            }
            _conn.handlers[def.api[i].function] = def.api[i].handler;
            delete _if.api[i].handler;
        }

        function pushAPI() {
            var payload = {
                type: "publish",
                id: _conn.connection.id,
                us: _conn.connection.us,
                them: _conn.connection.them,
                api: _if.api
            };
                
            ws.send(JSON.stringify(payload));
        }
        
        pushAPI();

    };

    _wsrpc.init = function (port, id) {
        
        if (id) {
            _conn.connection = {};
            _conn.connection.id = id;
        }
        
        ws = new WebSocket("ws://localhost:" + port + "/wsrpc");
        
        function emitEvent(event, args) {
            var payload = {
                type: "event",
                id: _conn.connection.id,
                us: _conn.connection.us,
                them: _conn.connection.them,
                name: event,
                arguments: args
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
                        id: _conn.connection.id,
                        us: _conn.connection.us,
                        them: _conn.connection.them,
                        fn: api.function,
                        arguments: transmitArguments,
                        trace: _getRandomID()
                    };
                    _calls[call.trace] = handleReturn ? arguments[arguments.length - 1] : _emptyHanlder;
                    ws.send(JSON.stringify(call));
                };
            }
            
            for (i = 0; i < payload.api.length; i++) {
                console.log("Creating function: " + payload.api[i].function);
                window.peer[payload.api[i].function] = makeFunction(payload.api[i]);
            }

            _dispatch(_E_PUBLISH, []);
            
            window.peer.ready = true;
        }
        
        function handleCall(payload) {
            var result = _conn.handlers[payload.fn].apply(null, payload.arguments),
                rpayload = {
                    type: "return",
                    id: _conn.connection.id,
                    us: _conn.connection.us,
                    them: _conn.connection.them,
                    trace: payload.trace,
                    result: result
                };
            ws.send(JSON.stringify(rpayload));
        }
        
        function handleReturn(payload) {
            var callback = _calls[payload.trace];
            callback(payload.result);
        }
        
        function handleEvent(payload) {
            var handlers = _peerEventHandlers[payload.name],
                i;
            
            if (!handlers) {
                return;
            }
            
            for (i = 0; i < handlers.length; i++) {
                handlers[i].apply(window.peer, payload.arguments);
            }
        }
        
        ws.onopen = function () {
            _dispatch(_E_OPEN, []);
            var payload = {
                type: "handshake",
                id: _conn.connection.id
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
                _conn.connection.us = payload.us;
                _conn.connection.them = payload.them;
                _dispatch(_E_PEER, [_conn.connection.them]);
                window.peer.dispatch = emitEvent;
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
            case "event":
                handleEvent(payload);
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

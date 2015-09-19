/*
 * Copyright (c) 2015 Intel Corporation. All rights reserved.
 *
 * See LICENSE for full license text.
 */
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

    /* LIFECYCLE EVENTS (observe how this module does) */

    var _E_OPEN             = "open",
        _E_CLOSE            = "close",
        _E_ERROR            = "error",
    /* The events below are peer events (emitted and consumed on Peer instance) */
        _E_CONNECT          = "connect",
        _E_PUBLISH          = "publish",
        _E_DISCONNECT       = "disconnect";

    var _eventHandlers = {
    };

    function checkValidEvent(event) {
        switch (event) {
        case _E_CLOSE:
        case _E_ERROR:
        case _E_OPEN:
            return true;
        default:
            return false;
        }
    }

    _wsrpc.on = function (e, callback) {
        if (!checkValidEvent(e)) {
            return;
        }
        if (!_eventHandlers[e]) {
            _eventHandlers[e] = [callback];
        } else {
            _eventHandlers[e].push(callback);
        }
    };

    function _dispatch(e, data) {
        if (!checkValidEvent(e)) {
            return;
        }
        var handlers = _eventHandlers[e],
            i;

        if (!handlers) {
            return;
        }

        for (i = 0; i < handlers.length; i++) {
            handlers[i].apply(_wsrpc, data);
        }
    }

    /* AUX FUNCTIONS */
    function _emptyHandler() {
        return;
    }


    function Peer(channel, ws) {
        this.ws = ws;
        this.channel = channel;
        this._eventHandlers = {};
        this._apiHandlers = {};
        this.us = undefined;
        this.them = undefined;
        this.peer = {};
    }

    Peer.prototype.on = function (e, callback) {
        if (!this._eventHandlers[event]) {
            this._eventHandlers[event] = [callback];
        } else {
            this._eventHandlers[event].push(callback);
        }
    };

    Peer.prototype._dispatch = function (e, args) {
        var payload = {
            type: "event",
            id: this.channel,
            us: this.us,
            them: this.them,
            name: e,
            arguments: args
        };

        this.ws.send(JSON.stringify(payload));
    };

    Peer.prototype.publish = function (def) {
        var _if, /* own representation of the interface */
            i,
            payload;
        /* reshape api to avoid sending functions. */
        _if = def;
        for (i = 0; i < def.api.length; i++) {
            if (!def.api[i].handler) {
                _dispatch(_E_ERROR, ["No handler specified: " + JSON.stringify(def.api[i])]);
                return;
            }
            this._apiHandlers[def.api[i].function] = def.api[i].handler;
            delete _if.api[i].handler;
        }

        payload = {
            type: "publish",
            id: this.channel,
            us: this.us,
            them: this.them,
            api: _if.api
        };

        ws.send(JSON.stringify(payload));
    };

    Peer.prototype._handlePublish = function (payload) {
        var self,
            i;

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
                    id: self.channel,
                    us: self.us,
                    them: self.them,
                    fn: api.function,
                    arguments: transmitArguments,
                    trace: _getRandomID()
                };
                _calls[call.trace] = handleReturn ? arguments[arguments.length - 1] : _emptyHandler;
                self.ws.send(JSON.stringify(call));
            };
        }

        for (i = 0; i < payload.api.length; i++) {
            console.log("Creating function: " + payload.api[i].function);
            this[payload.api[i].function] = makeFunction(payload.api[i]);
        }

        this._dispatch(_E_PUBLISH, []);

        // FIXME: should not have "ready"...
        this.peer.ready = true;
    };

    // FIXME: does not handle async handlers
    Peer.prototype._handleCall = function (payload) {
        var result = _conn.handlers[payload.fn].apply(null, payload.arguments),
            rpayload = {
                type: "return",
                id: this.channel,
                us: this.us,
                them: this.them,
                trace: payload.trace,
                result: result
            };
        this.ws.send(JSON.stringify(rpayload));
    };

    Peer.prototype._handleReturn = function (payload) {
        var callback = _calls[payload.trace];
        callback(payload.result);
    };

    Peer.prototype._handleEvent = function (payload) {
    };


    var _calls = {};

    _wsrpc.init = function (port, id) {
        var peer;

        ws = new WebSocket("ws://localhost:" + port + "/wsrpc");

        peer = new Peer(id, ws);

        ws.onopen = function () {
            _dispatch(_E_OPEN, []);
            var payload = {
                type: "handshake",
                id: id
            };
            ws.send(JSON.stringify(payload));
        };

        /* This function generates a closure for this specific peer. */
        function generateOnMessageHandler (p) {
            return function (e) {
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
                    p.us = payload.us;
                    p.them = payload.them;
                    p._dispatch(_E_CONNECT, [p.them]);
                    break;
                case "publish":
                    p._handlePublish(payload);
                    break;
                case "call":
                    p._handleCall(payload);
                    break;
                case "return":
                    p._handleReturn(payload);
                    break;
                case "event":
                    p._handleEvent(payload);
                    break;
                default:
                    console.error("Payload type is not understood: " + payload.type);
                    return;
                }
            };
        }

        ws.onmessage = generateOnMessageHandler(peer);

        // FIXME: onerror and onclose should be handler inside peer and emit events on the global
        ws.onerror = function (e) {
            _dispatch(_E_ERROR, ["WS error " + e]);
        };

        ws.onclose = function (e) {
            _dispatch(_E_CLOSE, []);
        };

        return peer;
    };

    window.wsrpc = _wsrpc;

}());

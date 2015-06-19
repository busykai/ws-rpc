/*global module: false, console: false */
(function () {
    "use strict";

    var _LETTERS_AND_NUMBERS = "abcdefghijklmnopqrstuvwxyz0123456789";

    var _tunnels = {};
    
    var _sockets = {};

    var _s2t = {};
    
    function _serialize(payload) {
        return JSON.stringify(payload);
    }
    
    function _getRandomID() {
        var result = "",
            i;
        for (i = 0; i < 10; i++) {
            result += _LETTERS_AND_NUMBERS[Math.floor(Math.random() * _LETTERS_AND_NUMBERS.length)];
        }
        return result;
    }
    
    function ProtocolError(msg) {
        if (msg) {
            this.message = msg;
        }
    }
    
    ProtocolError.prototype = Object.create(Error.prototype);
    ProtocolError.prototype.constructor = ProtocolError;
    
    function Tunnel(tunnelID) {
        this.tunnelID = tunnelID;
    }
    
    Tunnel.prototype = Object.create({
        status: "not connected",
        peers: {}
    });
    Tunnel.prototype.constructor = Tunnel;
    
    Tunnel.prototype.setPeer = function setPeer(us) {
        var ids = Object.keys(this.peers),
            them,
            response;
        
        if (ids.length > 1) {
            throw new ProtocolError("More than 2 clients connecting to the same channel");
        }

        if (ids.length === 1) {
            them = ids[0];
            this.peers[them].peer = us;
        }
        
        this.peers[us] = {
            status: "connected"
        };
        
        if (them) {
            this.peers[us].peer = them;
            // notify them we have connected
            response = {
                type: "handshake",
                id: this.tunnelID,
                us: them,
                them: us
            };
            _sockets[them].send(_serialize(response));
            // notify us they are connected
            response = {
                type: "handshake",
                id: this.tunnelID,
                us: us,
                them: them
            };
            _sockets[us].send(_serialize(response));
            this.status = "connected";
            console.log("Tunnel connected: " + us + " <-> " + them);
        }
    };

    Tunnel.prototype.removePeer = function removePeer(wsID) {
        delete this.peers[wsID];
    }
    
    Tunnel.prototype.handle = function (payload) {
        var caller = payload.us,
            callee = payload.them;
        
        if (!this.peers[caller] || !this.peers[callee]) {
            throw new ProtocolError("No caller or callee: " + JSON.stringify(payload));
        }
        _sockets[payload.them].send(_serialize(payload));
        
    };
            
    function handleHandshake(wsID, payload) {
        var tunnelID = payload.id,
            tunnel = _tunnels[tunnelID],
            peers,
            them,
            response;
        
        if (!tunnelID) {
            throw new ProtocolError("No tunnelID specified");
        }
        
        if (!tunnel) {
            tunnel = new Tunnel(tunnelID);
            _tunnels[tunnelID] = tunnel;
        }
        
        tunnel.setPeer(wsID);
        _s2t[wsID] = tunnelID;
    }

    function handleConnection(ws) {
        var wsID = _getRandomID();
        _sockets[wsID] = ws;
        ws.on("close", function _processClose() {
            var tunnelID = _s2t[wsID];
            if (tunnelID) {
                _tunnels[tunnelID].removePeer(wsID);
            }
            delete _sockets[wsID];
            delete _s2t[wsID];
        });
        ws.on("message", function _processMessage(msg) {
            var payload,
                tunnelID,
                tunnel;

            try {
                payload = JSON.parse(msg);
            } catch (e) {
                throw new ProtocolError("Payload is not a valid JSON: " + e);
            }
            
            tunnelID = payload.id;
            
            // we only handle the handshake, the rest is handled by Tunnel
            if (payload.type === "handshake") {
                handleHandshake(wsID, payload);
            } else {
                tunnel = _tunnels[tunnelID];
                if (!tunnel) {
                    throw new ProtocolError("Tunnel " + tunnelID + " is not found");
                }
                switch (payload.type) {
                case "publish":
                case "call":
                case "return":
                case "event":
                    tunnel.handle(payload);
                    break;
                default:
                    throw new ProtocolError("Message type " + payload.type + " is not understood");
                }
            }
        });
    }

    module.exports = {
        handleConnection: handleConnection
    };
    
}());

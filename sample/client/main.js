/*global window: false, console:false, WebSocket: false, document: false, navigator: false, peer: false, wsrpc: false */
(function () {
    "use strict";

    function userAgent() {
        return navigator.userAgent;
    }
    
    function setContent(val) {
        document.getElementById("input").value = val;
    }
    
    function getPeerInterface() {
        return {
            connection: {
                id: "channel1"
            },
            api: [
                {
                    function: "userAgent",
                    arguments: [],
                    handler: userAgent
                },
                {
                    function: "setContent",
                    arguments: [{ description: "input text value" }],
                    handler: setContent
                }
            ]
        };
    }
    
    var eventCount = 0;

    window.addEventListener("load", function () {

        var uaButton = document.getElementById("call"),
            input = document.getElementById("input"),
            getContentButton = document.getElementById("getcontent"),
            status = document.getElementById("status"),
            generateEvent = document.getElementById("haha");
        
        uaButton.addEventListener("click", function () {
            if (peer.ready) {
                peer.userAgent(function (result) {
                    var pre = document.getElementById("result");
                    pre.innerHTML = result;
                });
            }
        });
        
        getContentButton.addEventListener("click", function () {
            if (peer.ready) {
                peer.setContent(input.value);
            }
        });
        
        generateEvent.addEventListener("click", function () {
            if (peer.ready) {
                peer.dispatch("haha");
            }
        });
        
        peer.on("haha", function () {
            var pre = document.getElementById("event");
            pre.innerHTML += "Event " + (eventCount++) + ": 'haha'\n";
        });
        
        wsrpc.on("open", function () {
            status.innerHTML += "Connected to the proxy!\n";
        });
        wsrpc.on("peer", function (id) {
            status.innerHTML += "Peer connected (id " + id + ").\n";
        });
        wsrpc.on("close", function (id) {
            status.style.backgroundColor = "#c95656";
            status.innerHTML += "Connection to the proxy was closed.";
        });
        wsrpc.on("error", function (id) {
            status.innerHTML += "Error occured.\n";
            status.style.backgroundColor = "#c95656";
        });
        
        // initialize WS-RPC with the published interface
        wsrpc.init(getPeerInterface());

    });
}());

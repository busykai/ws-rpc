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

    window.addEventListener("load", function () {
        // initialize WS-RPC with the published interface
        wsrpc.init(getPeerInterface());

        var uaButton = document.getElementById("call"),
            input = document.getElementById("input"),
            getContentButton = document.getElementById("getcontent");
        
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
        
    });
}());

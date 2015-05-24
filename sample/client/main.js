/*global window: false, console:false, WebSocket: false, document: false, navigator: false, peer: false, wsrpc: false */
(function () {
    "use strict";

    function userAgent() {
        return navigator.userAgent;
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
                }
            ]
        };
    }

    window.addEventListener("load", function () {
        var button = document.getElementById("call");
        wsrpc.init(getPeerInterface());
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

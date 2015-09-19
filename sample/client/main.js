/*
 * Copyright (c) 2015 Intel Corporation. All rights reserved.
 *
 * See LICENSE for full license text.
 */
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

        var peer;

        var uaButton = document.getElementById("call"),
            input = document.getElementById("input"),
            getContentButton = document.getElementById("getcontent"),
            status = document.getElementById("status"),
            generateEvent = document.getElementById("haha");

        var port = window.location.search.substring(1);
        try {
            port = parseInt(port, 10);
        } catch (e) {
            console.error("Cannot parse port: " + port);
        }

        // initialize WS-RPC with the published interface
        peer = wsrpc.init(port, "channel1");

        peer.on("haha", function () {
            var pre = document.getElementById("event");
            pre.innerHTML += "Event " + (eventCount++) + ": 'haha'\n";
        });

        peer.on("connect", function (id) {
            status.innerHTML += "Peer connected (id " + id + ").\n";
            peer.publish(getPeerInterface());
        });

        peer.on("publish", function () {
            uaButton.addEventListener("click", function () {
                peer.userAgent(function (result) {
                    var pre = document.getElementById("result");
                    pre.innerHTML = result;
                });
            });

            getContentButton.addEventListener("click", function () {
                peer.setContent(input.value);
            });

            generateEvent.addEventListener("click", function () {
                peer.dispatch("haha");
            });
        });

        wsrpc.on("open", function () {
            status.innerHTML += "Connected to the proxy!\n";
        });

        wsrpc.on("close", function (id) {
            status.style.backgroundColor = "#c95656";
            status.innerHTML += "Connection to the proxy was closed.";
        });

        wsrpc.on("error", function (id) {
            status.innerHTML += "Error occured.\n";
            status.style.backgroundColor = "#c95656";
        });

    });
}());

# ws-rpc
WebSocket-based browser-to-browser RPC (with help of node.js)

## Purpose
This prototype provides a mechanism for two browser instances to publish and
call each other APIs and emit events to and recieve events from the other
browser (eventing is not yet implemented, but it is straight forward).

The motivation of this prototype is to demonstrate an approach to separating
Ripple emulator into two processes: one serving as a Cordova application
container and the other one containing the emulator "controls".

## State of the project

So far about 6 hours has been invested into this and the code lacks modularity,
error handling, tests and many other things, but it serves its purpose.

## Implementation details

The prototype consists of three components:

1. The Proxy (`proxy/proxy.js`): it starts the WebSocket server and passes the
   messages from one client to another. It is responsible establishing and
   maintaining the "tunnel" between the two clients. Each tunnel is identified
   by its ID.  Currently the tunnel ID is hard-coded in `client/main.js`, but
   instead it should be injected by the Server.

2. The Client (`client/index.html`): the client establishes connection to the
   Proxy and publishes its API. It then is capable of responding to calls to
   the API coming from the other client. It is also capable of calling the API
   of its peer via `peer` global object. The API is exposed as functions, the
   result of the call is returned via callback which should be supplied as the
   last argument.

1. The Server (`server/server.js`): currently it simply serves the client
   pages, but ideally it should also be used to instrument the pages with the
   information which is needed to establish the WS connections (i.e. port
   number) and other info, such as channel id. In this prototype the WS server
   port is passed query sting to the page (see `main.js` in the root).


Below diagram illustrates the relationship between the components:

```
  +-------------------+                           +-------------------+                                                                                                                                                                           
  |                   |    Virtual call-level     |                   |                                                                                                                                                       
  |      Browser      |       P2P connection      |      Browser      |                                                                                                                                                       
  |                   | ~~  ~~  ~~  ~~  ~~  ~~  ~~|                   |                                                                                                                                                       
  | client/index.html |                           | client/index.html |                                                                                                                                                       
  |                   |                           |                   |                                                                                                                                                       
  |                   |                           |                   |                                                                                                                                                       
  +-------------------+                           +-------------------+                                                                                                                                                                           
        |        \                                     /      |                                                                                                                                         
        |         \                                   /       |                                                                                                                                         
        |         WS conn                        WS conn      |                                                                                                                          
        |           \                               /         |                                                                                                                                         
   +----------------------------------------------------------------+
   |    |             \   +-------------------+   /           |     |                                                                                                                                                         
   |    |              \  |                   |  /            |     |                                                                                                                                                         
   |    |               \ |      Proxy        | /             |     |                                                                                                                                                         
   |  HTTP               \|                   |/             HTTP   |                                                                                                                                                         
   |    |                 |   proxy/proxy.js  |               |     |                                                                                                                                                         
   |    |                 |                   |               |     |                                                                                                                                                         
   |    |                 +-------------------+               |     |                                                                                                                                                         
   |    |                                                     |     |                                                                                                                                   
   |    |  +-------------------+                              |     |                                                                                                                                                         
   |    |  |                   |                              |     |                                                                                                                                                         
   |    ---|      Server       |-------------------------------     |                                                                                                                                                                                        
   |       |                   |                                    |                                                                                                                                                         
   |       |  server/server.js |                                    |                                                                                                                                                         
   |       |                   |         Node.js instance           | 
   |       +-------------------+                                    | 
   +----------------------------------------------------------------+

```

## Try it out!

__NOTE__: you will most likely need to rebuild `ws`. just run `npm install`in
the project root, it's the only dependency.

This prototype also provides an example. Run `node main.js` in the root of the
project to start it. It will start proxy, server and open one browser. After
your default browser has opened, copy the URL, open another browser
(preferrably a different one) and paste the URL. After you hit Go or Enter,
your browsers are connected.

Now you can press "Peer User Agent" button and the User-Agent string of the
other browser will appear.

In this examples both browsers are running the same page and publish the same
API, but it could well be different. Each browser will have a `window.peer`
object which will contain the published API.

API is published in declarative form. For example, browser 1 publishes
`userAgent` function like this:

```
api = [
    {
        function: "userAgent",
        arguments: []
    }
]
```
which means the function name is `userAgent` and it takes no arguments.

After the `userAgent` function is published in browser 2, it can be called as
```
window.peer.userAgent(function (userAgent) {
    // process userAgent string.
}
```

Obviously, the prototype lacks many features, error handling, some stuff is
hard-coded, but it's called a prototype for a reason.

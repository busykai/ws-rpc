# ws-rpc
WebSocket-based browser-to-browser RPC (with help of a node.js process)

## Purpose
This prototype provides a mechanism for two browser instances to publish and
call each other APIs and emit events to and recieve events from the other
browser (eventing is not yet implemented, but it is straight forward).

The motivation of this prototype is to demonstrate an approach to separating
Ripple emulator into two processes: one serving as a Cordova application
container and the other one containing the emulator "controls".

## State of the project

This is work in progres. Please use [issue tracker](https://github.com/busykai/ws-rpc/issues)
to report any problems.

## Implementation details

The prototype consists of three components:

1. The Proxy (`proxy/proxy.js`): it starts the WebSocket server and passes the
   messages from one client to another. It is responsible establishing and
   maintaining the "tunnel" between the two clients. Each tunnel is identified
   by its ID.  Currently the tunnel ID is hard-coded in `client/main.js`, but
   instead it should be injected by the Server.

2. The Client (`sample/client/index.html`): the client establishes connection to the
   Proxy and publishes its API. It then is capable of responding to calls to
   the API coming from the other client. It is also capable of calling the API
   of its peer via `peer` global object. The API is exposed as functions, the
   result of the call is returned via callback which should be supplied as the
   last argument.

3. The Server: conceptually, it is the entity responsible for letting the
   clients know how to connect to the proxy.

   In this repository (`sample/server/server.js`), the server is not used as
   broker. Instead, it simply serves the client pages. The WS server port is
   passed query sting to the page (see `sample/sample.js`).


Below diagram illustrates the relationship between the components:

```
  +-------------------+                           +-------------------+
  |                   |    Virtual call-level     |                   |
  |      Browser      |       P2P connection      |      Browser      |
  |                   |                           |                   |
  |    sample/        | ~~  ~~  ~~  ~~  ~~  ~~  ~~|    sample/        |
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
   |       |      sample/      |                                    |
   |       |  server/server.js |                                    |
   |       |                   |         Node.js instance           |
   |       +-------------------+                                    |
   +----------------------------------------------------------------+

```

## Try it out!

__NOTE__: run `npm install` in the project root to install the dependencies.

This prototype also provides an example. Run `node sample.js` in the `sample`
directory of the project to start it. It will start the WS proxy, the HTTP
server and open first client (your default browser). After the browser has
opened, copy the URL, open another browser (preferrably a different one) and
paste the URL. Once the second browser loads the page, your client are
connected.

Follow the on-screen instructions to try out different scenarios.

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


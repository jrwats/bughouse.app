# Bughouse

## Architecture

### Chess Server Backend
We'll rely on a largely-websocket-based backend written in Rust atop the [Actix Web framework](https://actix.rs/docs/websockets/) framework.

*Connecting to FICS was a fun old-school-cool idea, but it introduces uncessary latency (2 hops every move - 200ms on a GOOD day - between US / Canada servers compared to ~40ms running our own server).  As much love as I have for FICS and it's 90's-era telnet protocol, it's still losing mindshare by the day, so this "network effect" benefit was minimal.*

### Websocket
`web/socket/rust`

This is the main connection between the client and our server.  We'll host a ~~[socket.io](https://socket.io/)~~ [Actix Web framework](https://actix.rs/docs/websockets/)-based WebSocket AppEngine instance  (`wss://ws.bughouse.app/ws`), which, communicates chess moves, private/public messages, etc from the backend to the client and back.

The WebSocket should enable fairly low-latency communication to the client.  I envision a really simple JSON message protocol to get us going. You can consider this one of the "controller" layers in the MVC model.  When all features we really care to copmlete are done, we can consider micro-optimizing with messages in a binary protocol for really common things (game moves?), but I doubt this will make a blip early on until there are MANY concurrent games/users.

### Audio Streaming (Extra credit)
WebRTC Peer-2-Peer audio streams 🤯.  This will be our icing on the cake. Clicking other buttons or typing messages to your bughouse partner is annoying in fast paced games.  Let's just get some realtime audio happening via WebRTC.  These WebRTC streams still need handshaking with the server to connect the 2-4 peers.  It'll be a huge win to chat real-time to your partner, and possibly trash talk the other opponents.

### WebApp layer
On the WebApp, we'll listen to messages received from the **WebSocket** layer.  There will be a view largely built in React to display pieces, messages, etc.
We'll use [chessground](https://github.com/ornicar/chessground), and [react-chessground](https://github.com/ruilisi/react-chessground) for the board UI

### Authentication backend
`web/socket/firebase-go-srv`
For now... Google's Firebase.
We'll want to authenticate users and maintain some kind of identity to help organize games and ~~deduce whether, when playing, someone has bughouse.app functionality or just basic FICS functionalit~~. 

 We'll keep track of user's ratings for "rated" games with a Glicko ranking.

**Identity**
^ Firebase
We should hook into Facebook & Google login/auth APIs for easy auth/identity.
~~Similarly, these accounts we have should be able to store Chess Server backend (FICS) login credentials if the want them.~~

### Presence "service"
After authenticating, we should open the **WebSocket** described above.  This single open websocket should keep track of anyone online.

~~FICS will also have its own notion of logged in users, that you can query by issuing telnet comands (AKA polling).~~

## Additional Notes



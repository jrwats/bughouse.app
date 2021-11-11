# Bughouse

All frontend/backend code for [bughouse.app](https://bughouse.app)

## Running and testing
See [RUNNING.md](RUNNING.md)

## Architecture

### Chess Server Backend
We'll rely on a largely-websocket-based backend written in Rust atop the [Actix Web framework](https://actix.rs/docs/websockets/) framework.

*Connecting to FICS was a fun old-school-cool idea, but it introduces uncessary latency (2 hops every move - 200ms on a GOOD day - between US / Canada servers compared to ~40ms running our own server).  As much love as I have for FICS and it's 90's-era telnet protocol, it's still losing mindshare by the day, so this "network effect" benefit was minimal.*

### Frontend WebApp layer
[frontend/react-app](frontend/react-app)

On the WebApp, we'll largely listen to messages received from a **WebSocket** connection to the backend webserver. 
Built in React to display pieces, messages, etc.
We're using [chessground](https://github.com/ornicar/chessground), and [react-chessground](https://github.com/ruilisi/react-chessground) for the board UI

### Websocket
[backend/web](backend/web)

This is the main connection between the client and our server.  We'll host a ~~[socket.io](https://socket.io/)~~ [Actix Web framework](https://actix.rs/docs/websockets/)-based WebSocket AppEngine instance  (`wss://ws.bughouse.app/ws`), which, communicates chess moves, private/public messages, etc from the backend to the client and back.

The WebSocket should enable fairly low-latency communication to the client.  Some simple JSON messages to get us going.  Down the road we can look at more efficient (binary) and stricter serialization of messages between server/client.

### Authentication backend
[backend/firebase](backend/firebase)
For now... Google's Firebase.
We'll want to authenticate users and maintain some kind of identity to help organize games and ~~deduce whether, when playing, someone has bughouse.app functionality or just basic FICS functionalit~~. 
We'll keep track of user's ratings for "rated" games with a Glicko ranking.
 
### DB
[backend/db](backend/db)

Using [Scylla DB](https://www.scylladb.com/) (Cassandra implementation in C++) via the [rust driver](https://github.com/scylladb/scylla-rust-driver/).  Users, ratings, games, etc all stored here.

# Moonshot Ideas
## Audio Streaming (Extra credit)
WebRTC Peer-2-Peer audio streams 🤯.  This will be our icing on the cake. Clicking other buttons or typing messages to your bughouse partner is annoying in fast paced games.  Let's just get some realtime audio happening via WebRTC.  These WebRTC streams still need handshaking with the server to connect the 2-4 peers.  It'll be a huge win to chat real-time to your partner, and possibly trash talk the other opponents.


# Bughouse

## Architecture

### Chess Server Backend
There'll be 3 layers to this thing, initially.  Since I'd like to both be able to rely on an exsiting service, and play people that aren't necessarily "us", we'll build on top of freechess.org (FICS) to start.  We'll open a telnet connection on the backend to start with.  If you want to use an "MVC" model here.  Conceptually, the FICS telnet server is the model.

We'll have to do some significant telnet parsing to deduce board game state, but that's the nature of the legacy Internet Chess Server beast.  It shouldn't be too difficult though.

After this is all hooked up, we can start thinking about building our own backend, maintaining our own history etc etc.

### Websocket
This is the connection between the client and socket.bughouse.app which, in turn, communicates moves and messages to the backend.

We'll write a websocket layer (based on [socket.io](https://socket.io/)) to talk to the chess server backend and deliver low-latency messages to/from the client.  I envision a really simply JSON message protocol to get us going. You can consider this one of the "controller" layers

### Audio Streaming (Extra credit)
WebRTC P2P audio streams.  Clicking other buttons or typing messages to your bughouse partner is annoying.  Let's just get some realtime audio happening with WebRTC.  These WebRTC streams still need handshaking with the server to connect the 2-4 peers, but it'd be real nice icing on the cake to be able to chat real-time to your partner, and possibly trash talk the other opponents.

### WebApp layer
On the WebApp, we'll listen to messages received from the **WebSocket**.  There will be a view largely built in React to display pieces, messages, etc.

### Authentication backend
We'll want to authenticate users and keep track of "rated" games for ELO rankins.  We should hook into Facebook & Google APIs for authentication ideally.  Similarly, these accounts should be able to store Chess Server backend (FICS) login credentials if applicable.  We *should* be able to allow

### Presence service
After authenticating, we should open a websocket.  This one, open websocket should keep track of anyone online.  We can use socket.io namespaces to keep connection count low and simple


## Additional Notes

### Identity + Glicko rating
There's 2 different forms of identity on these backends.
1. FICS login
2. bughouse.app user login

We should enable bughouse.app user's to login to FICS as guests and still have "rated" games via bughouse.app identities.  That means keeping track of whether a FICS guest user is currently registered with an online bughouse.app user. If so, we can deduce our own Glicko updates after the game is finished.

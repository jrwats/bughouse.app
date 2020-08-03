# Bughouse

## Architecture

### Chess Server Backend
Since I'd like to both be able to rely on an existing service, and play people that aren't necessarily "us" with some mild network effect, we'll build on top of freechess.org (FICS) to start.  We'll open a telnet connection on the backend.  If you want to use an "MVC" model to think about this, conceptually, the FICS telnet server is our "model".

We'll have to do some significant telnet parsing to parse & deduce board game state, but that's the nature of the legacy Internet Chess Server beast.  It shouldn't be too difficult though.  There's a number of GUI apps built on-top of it, doing the same thing, so no big deal.

After this is all hooked up, we can start thinking about building our own backend, maintaining our own game history etc etc.  But let's piggyback on this to start with.

### Websocket
This is the main connection between the client and our server.  We'll host a [socket.io](https://socket.io/)-based WebSocket AppEngine instance in some subdomain (`socket.bughouse.app` seems fitting), which, communicates chess moves, private/public messages, etc from the backend to the client and back.

The WebSocket should enable fairly low-latency communication to the client.  I envision a really simply JSON message protocol to get us going. You can consider this one of the "controller" layers in the MVC model

### Audio Streaming (Extra credit)
WebRTC Peer-2-Peer audio streams 🤯.  This will be our icing on the cake. Clicking other buttons or typing messages to your bughouse partner is annoying in fast paced games.  Let's just get some realtime audio happening via WebRTC.  These WebRTC streams still need handshaking with the server to connect the 2-4 peers.  It'll be a huge win to chat real-time to your partner, and possibly trash talk the other opponents.

### WebApp layer
On the WebApp, we'll listen to messages received from the **WebSocket** layer.  There will be a view largely built in React to display pieces, messages, etc.
UPDATE: we'll use [chessground](https://github.com/ornicar/chessground), and [react-chessground](https://github.com/ruilisi/react-chessground) for the board UI

### Authentication backend
We'll want to authenticate users and maintain some kind of identity to help organize games and deduce whether, when playing, someone has bughouse.app functionality or just basic FICS functionality.  We'll also want to  keep track of "rated" games for Glicko rankings.

**Identity**
We should hook into Facebook & Google login/auth APIs for easy auth/identity.  Similarly, these accounts we have should be able to store Chess Server backend (FICS) login credentials if the want them.  The means some simple RDBS backend.  (Also See "Additional Notes" below)

### Presence "service"
After authenticating, we should open the **WebSocket** described above.  This single open websocket should keep track of anyone online.  We can use socket.io namespaces to keep connection count low and simple, and piggyback on this to deduce presence.

FICS will also have its own notion of logged in users, that you can query by issuing telnet comands (AKA polling).

## Additional Notes

### Identity + Glicko rating
There's 2 different forms of identity on these backends.
1. FICS login
2. bughouse.app user login

We should enable bughouse.app user's to login to FICS as guests (unrated) and still have "rated" games when playing games where all seats are populated with either (A) rated identiies on FICS (they're logged in) *or* (B) `bughouse.app`-backed FICS players for whom we have our own rating.  That means keeping track of our currently logged in users' guest handles if they're using one. If so, we can deduce our own Glicko updates after the game is finished.

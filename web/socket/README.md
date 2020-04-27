# Node.js websocket

This socket looks for an ID token sent via GET query param.
After token ID verification, it both
  1. Emits an event signalin success
  2. Creates a Telnet connection with the FICS server at freechess.org (on port 5000)

`git clone https://github.com/jrwats/node-telnet-client` to run locally

It then waits for login credentials from the client

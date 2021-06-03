# Node.js websocket

This socket looks for an ID token sent via GET param.
After serverside token ID verification (Google firebase), it both
  1. Emits an event signal for success
  2. Creates a Telnet connection with the FICS server at freechess.org (on port 5000)
  3. It then waits for login credentials from the client (either guest or FICS login + password)

NOTE: `git clone https://github.com/jrwats/node-telnet-client` to run locally
You can rely on the `yarn preinstall` script to do this for you.

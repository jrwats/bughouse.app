#!/bin/bash
{ PORT=7777 NODE_ENV=production DEBUG=1 node src/app.js | logger -t bughouse; } & disown


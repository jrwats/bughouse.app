#!/bin/bash
set -euo pipefail

if [[ ! -d node-telnet-client ]]; then
  git clone https://github.com/jrwats/node-telnet-client
fi
cd node-telnet-client
git pull

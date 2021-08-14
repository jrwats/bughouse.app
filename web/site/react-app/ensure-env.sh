#!/bin/bash
if [[ ! -d .bughouse-secrets ]]; then
  git clone --depth 1 https://github.com/jrwats/bughouse-secrets.git --branch master .bughouse-secrets
fi

if [[ ! -f src/auth/FirebaseConfig.js ]]; then
  cp .bughouse-secrets/FirebaseConfig.js src/auth/
fi

if [[ ! -d .react-chessground ]]; then
  git clone --depth 1 https://github.com/jrwats/react-chessground.git --branch master .react-chessground
fi

if [[ ! -f .react-chessground/index.js ]]; then
  pushd .react-chessground > /dev/null
  trap 'popd > /dev/null' EXIT
  npm install
  npm run build
fi

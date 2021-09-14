#!/bin/bash
if [[ ! -d .bughouse-secrets ]]; then
  git clone --depth 1 https://github.com/jrwats/bughouse-secrets.git --branch master .bughouse-secrets
fi
cp .bughouse-secrets/FirebaseConfig.js src/auth/

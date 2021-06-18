#!/bin/bash
set -euo pipefail

cd src

for repo in 'node-telnet-client' 'bughouse-secrets'; do
  if [[ ! -d "$repo" ]]; then
    git clone "https://github.com/jrwats/$repo"
  fi
  pushd "$repo" > /dev/null
  git pull
  popd > /dev/null
done

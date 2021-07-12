#!/bin/bash
set -euo pipefail

if [[ ! -d 'bughouse-secrets' ]]; then
  gh repo clone jrwats/bughouse-secrets
fi

### Usage
# Testing:
# ```
# DEV=1 SHOW_LOGS=1 ./run.sh
# ```
# Prod:
# ```
# ./run.sh & disown
# ```

firebase="${DEV:+bughouse-secrets/.dev-firebase-adminsdk.json}"
firebase="${firebase:-bughouse-secrets/.firebase-adminsdk.json}"
export GOOGLE_APPLICATION_CREDENTIALS="$(realpath "$firebase")"
go run server.go 2> >( [[ -n "${SHOW_LOGS:+x}" ]] && cat - || logger -t 'gofirebase' )

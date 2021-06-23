#!/bin/bash
set -euo pipefail

if [[ ! -d 'bughouse-secrets' ]]; then
  gh repo clone jrwats/bughouse-secrets
fi


firebase="${DEV:+bughouse-secrets/.dev-firebase-adminsdk.json}"
firebase="${firebase:-bughouse-secrets/.firebase-adminsdk.json}"

export GOOGLE_APPLICATION_CREDENTIALS="$(realpath "$firebase")"
cmd="${DEV:+cat}"
go run src/server.go 2> >( [[ -n "${DEV:+x}" ]] && cat - || logger -t 'gofirebase' )

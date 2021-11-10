#!/bin/bash

set -euo pipefail

# Assumes docker BuildKit
pushd "$(dirname "${BASH_SOURCE[0]}")"
trap popd EXIT
export GOOGLE_APPLICATION_CREDENTIALS="/run/secrets/firebase"
go run server.go 2> /tmp/firebase.log &

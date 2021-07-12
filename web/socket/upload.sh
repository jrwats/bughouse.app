#!/bin/bash

set -euo pipefail

# Deploy the rust binary to VM
pushd rust > /dev/null
trap 'popd > /dev/null' EXIT

cargo build --release
gcloud compute scp target/release/bug-wss 'vm-20-4:~/release/' --zone 'us-central1-a' --project 'bughouse-274816'


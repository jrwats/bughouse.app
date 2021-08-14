#!/bin/bash

set -euo pipefail

# Deploy the rust binary to VM
pushd rust > /dev/null
trap 'popd > /dev/null' EXIT

cargo build --release 2> /dev/null
gcloud compute scp target/release/bug-wss 'vm-20-4:~/release/bug-wss-new' --zone 'us-central1-a' --project 'bughouse-274816'

# gcloud compute ssh 'vm-20-4' --zone 'us-central1-a' --command="ps -e | grep bug-wss"
# kill_server="kill \"\$(ps -e | grep bug-wss | awk '{print \$1}')\" && mv ~/release/bug-wss-new ~/release/bug-wss && PORT=8080 './release/bug-wss' |& logger -t 'bughouse' & && disown -a"
# gcloud compute ssh 'vm-20-4' --zone 'us-central1-a' --command="$kill_server"
# gcloud compute ssh 'vm-20-4' --zone 'us-central1-a' --command="ps -e | grep bug-wss"

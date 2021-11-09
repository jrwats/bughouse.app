#!/bin/bash

if [[ ! -f .vm1_external_ip ]]; then
  gcloud compute instances list --filter="name=( 'vm-20-4' )" --format json | 
    jq -r '.[0].networkInterfaces[0].accessConfigs[0].natIP' > .vm1_external_ip
fi

path='localhost'
if [[ "$1" == "--prod" ]]; then
  path="$(cat .vm1_external_ip)"
fi
jq -S --arg path "$path" \
  '. + {homepage: "http://\($path)/ws_test"}' \
  package_template.json > package.json


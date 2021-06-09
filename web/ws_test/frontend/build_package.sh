#!/bin/bash

if [[ ! -f .vm1_external_ip ]]; then
  gcloud compute instances list --filter="name=( 'vm1' )" --format json | 
    jq -r '.[0].networkInterfaces[0].accessConfigs[0].natIP' > .vm1_external_ip
fi

origin='localhost'
if [[ "$1" == "--prod" ]]; then
  origin="$(cat .vm1_external_ip)"
fi
jq -S --arg origin "$origin" \
  '. + {homepage: "http://\($origin)/ws_test"}' \
  package_template.json > package.json


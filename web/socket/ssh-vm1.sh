#!/bin/bash
# usage ssh-vm1 --command='tail /var/logl/bughouse.log'
gcloud beta compute ssh --zone 'us-east1-c' 'vm1' --project 'bughouse-274816' "$@"

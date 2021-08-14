#!/bin/bash
# usage ssh-vm1 --command='tail /var/log/bughouse.log'
gcloud beta compute ssh --zone 'us-central1-a' 'vm-20-4' --project 'bughouse-274816' "$@"

#!/bin/bash

set -euo pipefail

export PORT=9042
echo "Waiting for cqlsh..."

log() {
  echo "$@" >&2
}
wait_and_run() {
  until nodetool status > /dev/null; do
    log "Unavailable: sleeping"
    sleep 5
  done
  log -e "\n!!!nodetool succeeded!!!!!\n"

  log -e "\n\n!!!Running bughouse.cql\n\n"
  until cqlsh -f './bughouse.cql'; do
    log -e "Unavailable: sleeping\n"
    sleep 2
  done

  if cqlsh -f './dev_seed.cql'; then
    log -e "\n\n!!! Ran dev_seed.cql\n\n"
  else
    log -e "\n\n!!! dev_seed.cql FAILED\n\n"
  fi
}

wait_and_run &
exec /docker-entrypoint.py "$@"

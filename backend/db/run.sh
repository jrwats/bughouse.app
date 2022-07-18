#!/bin/bash
set -euo pipefail

docker run -it -d -p 9042:9042 --name bughouse_dev_db dev_scylla --smp 2 --memory 1G 2> /dev/null ||
  docker start bughouse_dev_db 
echo 'To See logs run `docker logs -f bughouse_dev_db`'

until docker exec -t bughouse_dev_db cqlsh -e 'SELECT COUNT(*) FROM bughouse.games' > /dev/null; do
  sleep 4
  echo "[$(date +%k:%M:%S)] Waiting for DB to initialize..."
done

echo 'DB initialized'

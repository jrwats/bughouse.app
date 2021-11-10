#!/bin/bash
docker run -it -d -p 9042:9042 --name bughouse_dev_db dev_scylla --smp 8
echo 'To See logs run `docker logs -f bughouse_dev_db`'


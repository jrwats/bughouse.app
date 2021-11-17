#!/bin/bash

if docker ps -a -f name=bughouse_redis | grep -q bughouse_redis; then
  docker start bughouse_redis 
else
  docker run --name bughouse_redis -p 6379:6379 -d redis redis-server --save 60 1 --loglevel warning
fi


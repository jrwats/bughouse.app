#!/bin/bash

docker run --name bughouse_redis -p 6379:6379 -d redis redis-server --save 60 1 --loglevel warning

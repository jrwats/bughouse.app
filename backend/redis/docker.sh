#!/bin/bash

docker run --name bughouse_redis -d redis redis-server --save 60 1 --loglevel warning

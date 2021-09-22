## Scylla DB

Risks/drawbacks with going NoSQL vs RDBMS (ala MySQL):
* consistency... we'll see how that plays out
* space: there's invevitably duplicate data as we have to model things after queries

key= time (nanos since start) + player (2 bits: board & color): int
value=bits (from LSB to MSB) piece,drop,to,from :u32

Running scylla with docker

# Install on Windows (docker) / WSL
```
docker pull scylladb/scylla
# forward localhost port to running docker container
docker run --name some-scylla -d -p 9042:9042 scylladb/scylla --smp 8
```

## nodetool
Check this to ensure it's up and running:
```
docker exec -it some-scylla nodetool status
```

## upload bughouse.cql
`cp` to docker instance and then import
```
docker cp bughouse.cql some-scylla:/tmp/
```

## SOURCE
```
$ docker exec -it some-scylla cqlsh
Connected to  at 172.17.0.3:9042.
[cqlsh 5.0.1 | Cassandra 3.0.8 | CQL spec 3.3.1 | Native protocol v4]
Use HELP for help.
cqlsh> SOURCE '/tmp/bughouse.cql'
```

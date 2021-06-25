## Scylla DB

risk: consistency... we'll see how that plays out

key= time (nanos since start) + player (2 bits: board & color): int
value=bits (from LSB to MSB) piece,drop,to,from :u32


Running scylla with docker

## nodetool
```
docker exec -it some-scylla nodetool status
```

## daemon
```
 docker run --name some-scylla -d -p 9042:9042 scylladb/scylla --smp 8
```

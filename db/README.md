## Scylla DB

risk: consistency... we'll see how that plays out

key= time (nanos since start) + player (2 bits: board & color): int
value=bits (from LSB to MSB) piece,drop,to,from :u32

```
CREATE TYPE time_control (
    base int,
    increment int,
);

CREATE TABLE games (
    id timeuuid PRIMARY KEY,
    start_time timestamp,
    result int,
    time_ctrl time_control, 
    players frozen<list<uuid>>, // w_1,b_1,w_2,b_2
    moves map<int, int>, // time,player => bitmap encoding
);

CREATE TABLE user_games (
    userid uuid,
    gameid uuid,
    PRIMARY KEY (userid, gameid)
) WITH compression = {'sstable_compression': 'LZ4Compressor'};


CREATE TABLE users(
    id uuid PRIMARY KEY,
    firebase_id text,
    name text,
    handle text,
    picture blob,
    PRIMARY KEY (id)
);
CREATE INDEX ON users (firebase_id);

```

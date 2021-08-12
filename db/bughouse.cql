CREATE KEYSPACE IF NOT EXISTS bughouse
  WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE bughouse;

CREATE TYPE time_control (
  base int,
  inc int,
);

CREATE TYPE rating_snapshot (
  id uuid,
  rating smallint,
  deviation smallint,
);

// CREATE TYPE IF NOT EXISTS board tuple<rating_snapshot, rating_snapshot>;

CREATE TABLE IF NOT EXISTS games (
  id timeuuid PRIMARY KEY,
  start_time timestamp,
  result smallint,
  time_ctrl time_control,
  rated boolean,
  players tuple<
    tuple<rating_snapshot, rating_snapshot>, 
    tuple<rating_snapshot, rating_snapshot>
  >,
  moves map<int, smallint>,
);
CREATE INDEX ON games(result);

CREATE TABLE IF NOT EXISTS user_games (
  userid timeuuid,
  gameid timeuuid,
  PRIMARY KEY (userid, gameid)
);

CREATE TABLE IF NOT EXISTS rating_history (
  user_id timeuuid,
  time timestamp,
  rating smallint,
  deviation smallint,
  PRIMARY KEY ((user_id), time)
);

// Local secondary index optimized for
// SELECT rating FROM rating_history WHERE uuid = '...' AND timestamp ...;
// CREATE INDEX ON rating_history((id), time);

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY,
  photo blob,
);

CREATE TABLE IF NOT EXISTS users (
  id timeuuid,
  firebase_id text,
  handle text,
  deviation smallint,
  email text,
  guest boolean,
  name text,
  photo blob,
  photo_url text,
  rating smallint,
  PRIMARY KEY (id)
);

CREATE INDEX ON users(firebase_id);
CREATE INDEX ON users(handle);

CREATE TABLE IF NOT EXISTS handles(
  id timeuuid,
  handle text PRIMARY KEY,
);
CREATE INDEX ON handles(id);

CREATE TABLE IF NOT EXISTS firebase_users(
  firebase_id text PRIMARY KEY,
  uid timeuuid,
  );
//   display_name text,
//   email text,
//   photo_url text,
//   provider_id text,
// );

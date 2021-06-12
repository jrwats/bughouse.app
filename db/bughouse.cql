CREATE KEYSPACE IF NOT EXISTS bughouse 
  WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 2};

USE bughouse;

CREATE TYPE time_control (
  base int,
  increment int,
);

CREATE TYPE user_snapshot (
  id uuid,
  pregame_rating int,
);

CREATE TYPE board (
  white frozen<user_snapshot>,
  black frozen<user_snapshot>,
);

CREATE TABLE games (
  id timeuuid PRIMARY KEY,
  start_time timestamp,
  result int,
  time_ctrl time_control, 
  board_a board,
  board_b board,
  moves map<int, int>, // time,player => bitmap encoding
);
CREATE INDEX ON games(result);

CREATE TABLE user_games (
  userid uuid,
  gameid uuid,
  PRIMARY KEY (userid, gameid)
);

CREATE TABLE current_rating(
  id uuid PRIMARY KEY,
  rating int,
);

CREATE TABLE rating_history(
  id uuid PRIMARY KEY,
  rating int,
  time timestamp,
);

// Local secondary index optimized for
// SELECT rating FROM user_ratings WHERE uuid = '...' AND timestamp ...;
CREATE INDEX ON rating_history((id), time);

CREATE TABLE users(
  id uuid,
  firebase_id text,
  name text,
  handle text,
  picture blob,
  PRIMARY KEY (id, firebase_id)
);

CREATE INDEX ON users(firebase_id);
CREATE INDEX ON users(handle);


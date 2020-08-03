CREATE TABLE oauth_users (
  column_name TYPE column_constraint,
  table_constraint table_constraint
);

-- CREATE TABLE bug_users (
--   id int,
--   handle text,
--   email text,
--   pass_hash bytea,
--   salt bytea,
-- );


-- CREATE TABLE oauth_users (
--   id int,
--   service_id text,
--   email text,
--   pass_hash bytea,
--   salt bytea,
-- );

CREATE TABLE users (
  uid text PRIMARY KEY,
  display_name text NOT NULL UNIQUE,
)

CREATE TABLE fics_creds (
  uid text PRIMARY KEY REFERENCES users(uid),
  fics_handle text NOT NULL UNIQUE,
  cipher bytea,
  nonce bytea,
  digest bytea,
)

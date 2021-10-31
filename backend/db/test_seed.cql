
BEGIN BATCH
INSERT INTO bughouse.handles (handle, uid) VALUES ('user_a', 8ac88980-d963-11eb-bb7e-000000000001) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('user_b', 8ac88980-d963-11eb-bb7e-000000000002) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('user_c', 8ac88980-d963-11eb-bb7e-000000000003) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('user_d', 8ac88980-d963-11eb-bb7e-000000000004) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('user_e', 8ac88980-d963-11eb-bb7e-000000000005) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('user_f', 8ac88980-d963-11eb-bb7e-000000000006) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('user_g', 8ac88980-d963-11eb-bb7e-000000000007) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('user_h', 8ac88980-d963-11eb-bb7e-000000000008) IF NOT EXISTS;
APPLY BATCH

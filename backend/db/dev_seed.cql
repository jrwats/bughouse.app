// Fake Firebase IDs
INSERT INTO bughouse.firebase_users (firebase_id, uid) VALUES ('.fake_a', 8ac88980-d963-11eb-bb7e-000000000001) IF NOT EXISTS;
INSERT INTO bughouse.firebase_users (firebase_id, uid) VALUES ('.fake_b', 8ac88980-d963-11eb-bb7e-000000000002) IF NOT EXISTS;
INSERT INTO bughouse.firebase_users (firebase_id, uid) VALUES ('.fake_c', 8ac88980-d963-11eb-bb7e-000000000003) IF NOT EXISTS;
INSERT INTO bughouse.firebase_users (firebase_id, uid) VALUES ('.fake_d', 8ac88980-d963-11eb-bb7e-000000000004) IF NOT EXISTS;
INSERT INTO bughouse.firebase_users (firebase_id, uid) VALUES ('.fake_e', 8ac88980-d963-11eb-bb7e-000000000005) IF NOT EXISTS;
INSERT INTO bughouse.firebase_users (firebase_id, uid) VALUES ('.fake_f', 8ac88980-d963-11eb-bb7e-000000000006) IF NOT EXISTS;
INSERT INTO bughouse.firebase_users (firebase_id, uid) VALUES ('.fake_g', 8ac88980-d963-11eb-bb7e-000000000007) IF NOT EXISTS;
INSERT INTO bughouse.firebase_users (firebase_id, uid) VALUES ('.fake_h', 8ac88980-d963-11eb-bb7e-000000000008) IF NOT EXISTS;

// Handles
INSERT INTO bughouse.handles (handle, uid) VALUES ('A1ekhine', 8ac88980-d963-11eb-bb7e-000000000001) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('B0risSpassky', 8ac88980-d963-11eb-bb7e-000000000002) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('Capab1anca', 8ac88980-d963-11eb-bb7e-000000000003) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('Dv0retsky', 8ac88980-d963-11eb-bb7e-000000000004) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('E.Lask3r', 8ac88980-d963-11eb-bb7e-000000000005) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('F1scher', 8ac88980-d963-11eb-bb7e-000000000006) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('GarryKaspar0v', 8ac88980-d963-11eb-bb7e-000000000007) IF NOT EXISTS;
INSERT INTO bughouse.handles (handle, uid) VALUES ('H1karu', 8ac88980-d963-11eb-bb7e-000000000008) IF NOT EXISTS;

// Users
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000001, '.fake_a', 'A1ekhine', 350, 'fake_a@bughouse.app', false, 'Fake A', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000002, '.fake_b', 'B0risSpassky', 350, 'fake_b@bughouse.app', false, 'Fake B', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000003, '.fake_c', 'Capab1anca', 350, 'fake_c@bughouse.app', false, 'Fake C', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000004, '.fake_d', 'Dv0retsky', 350, 'fake_d@bughouse.app', false, 'Fake D', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000005, '.fake_e', 'E.Lask3r', 350, 'fake_e@bughouse.app', false, 'Fake E', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000006, '.fake_f', 'F1scher', 350, 'fake_f@bughouse.app', false, 'Fake F', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000007, '.fake_g', 'GarryKaspar0v', 350, 'fake_g@bughouse.app', false, 'Fake G', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000008, '.fake_h', 'H1karu', 350, 'fake_h@bughouse.app', false, 'Fake H', 1500, 0) IF NOT EXISTS;

// Games

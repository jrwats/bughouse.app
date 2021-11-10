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
  (8ac88980-d963-11eb-bb7e-000000000001, '.fake_a', 'A1ekhine', 329, 'fake_a@bughouse.app', false, 'Fake A', 1612, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000002, '.fake_b', 'B0risSpassky', 329, 'fake_b@bughouse.app', false, 'Fake B', 1388, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000003, '.fake_c', 'Capab1anca', 329, 'fake_c@bughouse.app', false, 'Fake C', 1388, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000004, '.fake_d', 'Dv0retsky', 329, 'fake_d@bughouse.app', false, 'Fake D', 1612, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000005, '.fake_e', 'E.Lask3r', 350, 'fake_e@bughouse.app', false, 'Fake E', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000006, '.fake_f', 'F1scher', 350, 'fake_f@bughouse.app', false, 'Fake F', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000007, '.fake_g', 'GarryKaspar0v', 350, 'fake_g@bughouse.app', false, 'Fake G', 1500, 0) IF NOT EXISTS;
INSERT INTO bughouse.users (id, firebase_id, handle, deviation, email, guest, name, rating, role) VALUES
  (8ac88980-d963-11eb-bb7e-000000000008, '.fake_h', 'H1karu', 350, 'fake_h@bughouse.app', false, 'Fake H', 1500, 0) IF NOT EXISTS;

// Rating history
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000001, '2021-11-10 17:06:19', 350, 1500);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000002, '2021-11-10 17:06:19', 350, 1500);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000003, '2021-11-10 17:06:19', 350, 1500);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000004, '2021-11-10 17:06:19', 350, 1500);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000005, '2021-11-10 17:06:19', 350, 1500);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000006, '2021-11-10 17:06:19', 350, 1500);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000007, '2021-11-10 17:06:19', 350, 1500);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000008, '2021-11-10 17:06:19', 350, 1500);

INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000001, '2021-11-10 17:35:07', 329, 1612);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000002, '2021-11-10 17:35:07', 329, 1388);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000003, '2021-11-10 17:35:07', 329, 1388);
INSERT INTO bughouse.rating_history (uid, time, deviation, rating) VALUES
  (8ac88980-d963-11eb-bb7e-000000000004, '2021-11-10 17:35:07', 329, 1612);

// user games
INSERT INTO bughouse.user_games (uid, start_time, game_id, players, rated, result) VALUES
  (8ac88980-d963-11eb-bb7e-000000000002, '2021-11-10 17:35:07', 9c3d1886-4248-11ec-8001-010303070402, (({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000001}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000002}), ({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000003}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000004})), True, 3);
INSERT INTO bughouse.user_games (uid, start_time, game_id, players, rated, result) VALUES
  (8ac88980-d963-11eb-bb7e-000000000001, '2021-11-10 17:35:07', 9c3d1886-4248-11ec-8001-010303070402, (({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000001}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000002}), ({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000003}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000004})), True, 3);
INSERT INTO bughouse.user_games (uid, start_time, game_id, players, rated, result) VALUES
  (8ac88980-d963-11eb-bb7e-000000000003, '2021-11-10 17:35:07', 9c3d1886-4248-11ec-8001-010303070402, (({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000001}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000002}), ({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000003}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000004})) ,  True, 3);
INSERT INTO bughouse.user_games (uid, start_time, game_id, players, rated, result) VALUES
  (8ac88980-d963-11eb-bb7e-000000000004, '2021-11-10 17:35:07', 9c3d1886-4248-11ec-8001-010303070402, (({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000001}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000002}), ({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000003}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000004})), True, 3);

// Games
INSERT INTO bughouse.games (id, players, public, rated, result, start_time, time_ctrl, moves) VALUES
(
  9c3d1886-4248-11ec-8001-010303070402, 
  (({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000001}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000002}), ({rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000003}, {rating: 1500, uid: 8ac88980-d963-11eb-bb7e-000000000004})),
  True,
  True,
  3,
  '2021-11-10 17:35:07',
  {base: 3, inc: 0}, 
  {570: 6556, 5792: 26531, 9238: 14755, 11784: 30627, 14486: 914, 18585: 6556, 26505: 27044, 30531: 2970, 39521: 32173, 43383: 3477, 53097: 26539, 75663: 11172, 75687: 30131, 85983: 13749, 92773: 31156, 133740: 32173, 137446: 9635, 144494: 27052, 147884: 18349, 155326: 28077, 189707: -46, 212077: 26554, 239887: -99, 249807: 23459, 256915: 14755, 285961: 26026, 285977: 6043, 300617: 30131, 300693: 18346, 307155: 29610, 317121: 1446, 330279: -45, 351568: 6043, 448103: 19885, 455141: 28077, 465693: 18858, 469953: 25514, 487490: 22948}
) IF NOT EXISTS;

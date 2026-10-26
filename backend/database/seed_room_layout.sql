-- ---------------------------------------------------------------------------
-- Display metadata for the Room Monitoring floor plan.
-- upper_order / lower_order say which band of the plan a room sits in and its
-- position inside that band (0 = not used in that band). A room may appear in
-- both bands (e.g. Building B's Faculty Room). is_featured drives the
-- highlighted tiles. Idempotent: safe to re-run.
-- ---------------------------------------------------------------------------

-- Building A, 1st floor
UPDATE rooms SET upper_order = 1, is_featured = 1 WHERE building = 'A' AND floor = 1 AND room_name = 'Lab 1';
UPDATE rooms SET upper_order = 2 WHERE building = 'A' AND floor = 1 AND room_name = 'Cashier';
UPDATE rooms SET upper_order = 3 WHERE building = 'A' AND floor = 1 AND room_name = 'MIS';
UPDATE rooms SET upper_order = 4 WHERE building = 'A' AND floor = 1 AND room_name = 'Men''s Restroom';
UPDATE rooms SET lower_order = 1 WHERE building = 'A' AND floor = 1 AND room_name = 'Lab 2';
UPDATE rooms SET lower_order = 2 WHERE building = 'A' AND floor = 1 AND room_name = 'Admin';

-- Building A, 2nd floor (every tile was featured)
UPDATE rooms SET upper_order = 1, is_featured = 1 WHERE building = 'A' AND floor = 2 AND room_name = 'Library';
UPDATE rooms SET upper_order = 2, is_featured = 1 WHERE building = 'A' AND floor = 2 AND room_name = 'Room 101';
UPDATE rooms SET upper_order = 3, is_featured = 1 WHERE building = 'A' AND floor = 2 AND room_name = 'Women CR';
UPDATE rooms SET lower_order = 1, is_featured = 1 WHERE building = 'A' AND floor = 2 AND room_name = 'Lab 3';
UPDATE rooms SET lower_order = 2, is_featured = 1 WHERE building = 'A' AND floor = 2 AND room_name = 'Room 102';
UPDATE rooms SET lower_order = 3, is_featured = 1 WHERE building = 'A' AND floor = 2 AND room_name = 'Room 103';

-- Building B, 1st floor (Faculty Room sits in both bands)
UPDATE rooms SET upper_order = 1 WHERE building = 'B' AND floor = 1 AND room_name = 'Men CR';
UPDATE rooms SET upper_order = 2 WHERE building = 'B' AND floor = 1 AND room_name = 'Women CR';
UPDATE rooms SET upper_order = 3, lower_order = 1 WHERE building = 'B' AND floor = 1 AND room_name = 'Faculty Room';
UPDATE rooms SET upper_order = 4 WHERE building = 'B' AND floor = 1 AND room_name = 'Room 103';
UPDATE rooms SET upper_order = 5 WHERE building = 'B' AND floor = 1 AND room_name = 'Room 105';
UPDATE rooms SET upper_order = 6 WHERE building = 'B' AND floor = 1 AND room_name = 'Room 107';
UPDATE rooms SET lower_order = 2 WHERE building = 'B' AND floor = 1 AND room_name = 'Clinic';
UPDATE rooms SET lower_order = 3 WHERE building = 'B' AND floor = 1 AND room_name = 'Room 102';
UPDATE rooms SET lower_order = 4 WHERE building = 'B' AND floor = 1 AND room_name = 'Room 104';
UPDATE rooms SET lower_order = 5 WHERE building = 'B' AND floor = 1 AND room_name = 'Room 106';


-- Building C: 3 rooms + 1 CR up top, the rest below
UPDATE rooms SET upper_order = 1 WHERE building = 'C' AND floor = 1 AND room_name = 'Room A';
UPDATE rooms SET upper_order = 2 WHERE building = 'C' AND floor = 1 AND room_name = 'Room B';
UPDATE rooms SET upper_order = 3 WHERE building = 'C' AND floor = 1 AND room_name = 'Room C';
UPDATE rooms SET upper_order = 4 WHERE building = 'C' AND floor = 1 AND room_name = 'Men CR';
UPDATE rooms SET lower_order = 1 WHERE building = 'C' AND floor = 1 AND room_name = 'Room D';
UPDATE rooms SET lower_order = 2 WHERE building = 'C' AND floor = 1 AND room_name = 'Room E';
UPDATE rooms SET lower_order = 3 WHERE building = 'C' AND floor = 1 AND room_name = 'Room F';
UPDATE rooms SET lower_order = 4 WHERE building = 'C' AND floor = 1 AND room_name = 'Women CR';

-- Room G on this floor lives inside the hallway band (rendered by the
-- frontend), not in the upper/lower bands.
UPDATE rooms SET upper_order = 0, lower_order = 0 WHERE building = 'C' AND floor = 2 AND room_name = 'Room G';
UPDATE rooms SET upper_order = 1 WHERE building = 'C' AND floor = 2 AND room_name = 'Room H';
UPDATE rooms SET upper_order = 2 WHERE building = 'C' AND floor = 2 AND room_name = 'Room I';
UPDATE rooms SET upper_order = 3 WHERE building = 'C' AND floor = 2 AND room_name = 'Room J';
UPDATE rooms SET upper_order = 4 WHERE building = 'C' AND floor = 2 AND room_name = 'Men CR';
UPDATE rooms SET lower_order = 1 WHERE building = 'C' AND floor = 2 AND room_name = 'Room K';
UPDATE rooms SET lower_order = 2 WHERE building = 'C' AND floor = 2 AND room_name = 'Room L';
UPDATE rooms SET lower_order = 3 WHERE building = 'C' AND floor = 2 AND room_name = 'Room M';
UPDATE rooms SET lower_order = 4 WHERE building = 'C' AND floor = 2 AND room_name = 'Women CR';

UPDATE rooms SET upper_order = 1 WHERE building = 'C' AND floor = 3 AND room_name = 'Room O';
UPDATE rooms SET upper_order = 2 WHERE building = 'C' AND floor = 3 AND room_name = 'Room P';
UPDATE rooms SET upper_order = 3 WHERE building = 'C' AND floor = 3 AND room_name = 'Room Q';
UPDATE rooms SET lower_order = 1 WHERE building = 'C' AND floor = 3 AND room_name = 'Room R';
UPDATE rooms SET lower_order = 2 WHERE building = 'C' AND floor = 3 AND room_name = 'Room S';
UPDATE rooms SET lower_order = 3 WHERE building = 'C' AND floor = 3 AND room_name = 'Room T';
-- Room N on this floor lives inside the hallway band (rendered by the
-- frontend), like Room G one floor below.
UPDATE rooms SET building = 'C', floor = 3, upper_order = 0, lower_order = 0 WHERE room_name = 'Room N' AND building = 'C' AND floor = 2;

-- Building D: numbered rooms run sequentially from *01 on every floor.
UPDATE rooms SET upper_order = 1 WHERE building = 'D' AND floor = 1 AND room_name = 'Faculty Room';
UPDATE rooms SET upper_order = 2 WHERE building = 'D' AND floor = 1 AND room_name = 'Room 101';
UPDATE rooms SET upper_order = 3 WHERE building = 'D' AND floor = 1 AND room_name = 'Room 102';
UPDATE rooms SET upper_order = 4 WHERE building = 'D' AND floor = 1 AND room_name = 'Room 103';
UPDATE rooms SET upper_order = 5 WHERE building = 'D' AND floor = 1 AND room_name = 'Men CR';
UPDATE rooms SET lower_order = 1 WHERE building = 'D' AND floor = 1 AND room_name = 'Room 104';
UPDATE rooms SET lower_order = 2 WHERE building = 'D' AND floor = 1 AND room_name = 'Room 105';
UPDATE rooms SET lower_order = 3 WHERE building = 'D' AND floor = 1 AND room_name = 'Room 106';

UPDATE rooms SET upper_order = 1 WHERE building = 'D' AND floor = 2 AND room_name = 'Faculty Room';
UPDATE rooms SET upper_order = 2 WHERE building = 'D' AND floor = 2 AND room_name = 'Room 201';
UPDATE rooms SET upper_order = 3 WHERE building = 'D' AND floor = 2 AND room_name = 'Room 202';
UPDATE rooms SET upper_order = 4 WHERE building = 'D' AND floor = 2 AND room_name = 'Room 203';
UPDATE rooms SET upper_order = 5 WHERE building = 'D' AND floor = 2 AND room_name = 'Women CR';
UPDATE rooms SET lower_order = 1 WHERE building = 'D' AND floor = 2 AND room_name = 'Room 204';
UPDATE rooms SET lower_order = 2 WHERE building = 'D' AND floor = 2 AND room_name = 'Room 205';
UPDATE rooms SET lower_order = 3 WHERE building = 'D' AND floor = 2 AND room_name = 'Room 206';

UPDATE rooms SET upper_order = 1 WHERE building = 'D' AND floor = 3 AND room_name = 'Faculty Room';
UPDATE rooms SET upper_order = 2 WHERE building = 'D' AND floor = 3 AND room_name = 'Room 301';
UPDATE rooms SET upper_order = 3 WHERE building = 'D' AND floor = 3 AND room_name = 'Room 302';
UPDATE rooms SET upper_order = 4 WHERE building = 'D' AND floor = 3 AND room_name = 'Room 303';
UPDATE rooms SET upper_order = 5 WHERE building = 'D' AND floor = 3 AND room_name = 'Men CR';
UPDATE rooms SET lower_order = 1 WHERE building = 'D' AND floor = 3 AND room_name = 'Room 304';
UPDATE rooms SET lower_order = 2 WHERE building = 'D' AND floor = 3 AND room_name = 'Room 305';
UPDATE rooms SET lower_order = 3 WHERE building = 'D' AND floor = 3 AND room_name = 'Room 306';

-- Room 105 (Building B, 1st floor) did not exist in the original dump, so
-- create it at the end of the upper band when seeding.
INSERT INTO rooms (room_name, building, floor, room_type, upper_order, lower_order, is_featured)
SELECT 'Room 105', 'B', 1, 'Room', 5, 0, 0 FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM rooms
  WHERE building = 'B' AND floor = 1 AND room_name = 'Room 105'
);

-- Room 107 completes the Building B numbering. It sits after Room 105 in the
-- upper band, with the other odd-numbered rooms.
UPDATE rooms SET upper_order = 6 WHERE building = 'B' AND floor = 1 AND room_name = 'Room 107';
INSERT INTO rooms (room_name, building, floor, room_type, upper_order, lower_order, is_featured)
SELECT 'Room 107', 'B', 1, 'Room', 6, 0, 0 FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM rooms
  WHERE building = 'B' AND floor = 1 AND room_name = 'Room 107'
);

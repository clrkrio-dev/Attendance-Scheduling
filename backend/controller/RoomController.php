<?php

// ---------------------------------------------------------------------------
// Room data access layer (matches the `rooms` table).
// ---------------------------------------------------------------------------

// Finds one room by primary key.
function findRoom(PDO $pdo, $id)
{
    $stmt = $pdo->prepare(
        "SELECT
            r.room_id,
            r.room_name,
            r.building,
            r.floor,
            r.room_type,
            r.description,
            r.upper_order,
            r.lower_order,
            r.is_featured
         FROM rooms r
         WHERE r.room_id = ?"
    );
    $stmt->execute([$id]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Lists all rooms, optionally narrowed by building and/or floor.
function findAllRooms(PDO $pdo, $building = null, $floor = null)
{
    $sql = "SELECT
            r.room_id,
            r.room_name,
            r.building,
            r.floor,
            r.room_type,
            r.description,
            r.upper_order,
            r.lower_order,
            r.is_featured
         FROM rooms r";
    $where = [];
    $params = [];

    if ($building !== null && $building !== "") {
        $where[]   = "r.building = ?";
        $params[]  = $building;
    }

    if ($floor !== null && $floor !== "") {
        $where[]   = "r.floor = ?";
        $params[]  = (int) $floor;
    }

    if (count($where) > 0) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }

    $sql .= " ORDER BY r.building, r.floor, r.room_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Creates a room and returns the created row.
function createRoom(PDO $pdo, array $data)
{
    $stmt = $pdo->prepare(
        "INSERT INTO rooms
            (room_name, building, floor, room_type, description,
             upper_order, lower_order, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $data["room_name"],
        strtoupper($data["building"]),
        (int) $data["floor"],
        array_key_exists("room_type", $data) && $data["room_type"] !== ""
            ? $data["room_type"]
            : "Room",
        array_key_exists("description", $data) ? $data["description"] : null,
        (int) (array_key_exists("upper_order", $data) ? $data["upper_order"] : 0),
        (int) (array_key_exists("lower_order", $data) ? $data["lower_order"] : 0),
        !empty($data["is_featured"]) ? 1 : 0
    ]);

    return findRoom($pdo, $pdo->lastInsertId());
}

// Updates a room with whatever fields were supplied and returns the row.
function updateRoom(PDO $pdo, $id, array $data)
{
    $fields = [
        "room_name",
        "building",
        "floor",
        "room_type",
        "description",
        "upper_order",
        "lower_order",
        "is_featured"
    ];

    $sets   = [];
    $params = [];

    foreach ($fields as $field) {
        if (!array_key_exists($field, $data)) {
            continue;
        }

        $sets[] = $field . " = ?";

        if ($field === "building") {
            $params[] = strtoupper($data[$field]);
        } elseif ($field === "floor" || $field === "upper_order" || $field === "lower_order") {
            $params[] = (int) $data[$field];
        } elseif ($field === "is_featured") {
            $params[] = !empty($data[$field]) ? 1 : 0;
        } else {
            $params[] = $data[$field];
        }
    }

    if (count($sets) > 0) {
        $params[] = $id;

        $stmt = $pdo->prepare(
            "UPDATE rooms SET " . implode(", ", $sets) . " WHERE room_id = ?"
        );
        $stmt->execute($params);
    }

    return findRoom($pdo, $id);
}

// Deletes a room; returns the number of affected rows.
function deleteRoom(PDO $pdo, $id)
{
    $stmt = $pdo->prepare("DELETE FROM rooms WHERE room_id = ?");
    $stmt->execute([$id]);

    return $stmt->rowCount();
}
<?php

require_once __DIR__ . "/../middleware/cors.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../controller/RoomController.php";

enableCors();
handlePreflight();
allowMethods(["GET", "POST", "PUT", "DELETE"]);

$method = $_SERVER["REQUEST_METHOD"];
$id     = array_key_exists("id", $_GET) ? (int) $_GET["id"] : 0;

try {
    if ($method === "GET") {
        if ($id > 0) {
            $room = findRoom($pdo, $id);

            if (!$room) {
                jsonError("Room not found.", 404);
            }

            jsonSuccess($room);
        } else {
            $building = array_key_exists("building", $_GET) ? $_GET["building"] : null;
            $floor    = array_key_exists("floor", $_GET) ? $_GET["floor"] : null;

            jsonSuccess(findAllRooms($pdo, $building, $floor));
        }
    } elseif ($method === "POST") {
        $data = readJsonBody();
        requireFields($data, ["room_name", "building", "floor"]);

        jsonSuccess(createRoom($pdo, $data), 201);
    } elseif ($method === "PUT") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to update a room.", 422);
        }

        if (!findRoom($pdo, $id)) {
            jsonError("Room not found.", 404);
        }

        jsonSuccess(updateRoom($pdo, $id, readJsonBody()));
    } elseif ($method === "DELETE") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to delete a room.", 422);
        }

        if (deleteRoom($pdo, $id) === 0) {
            jsonError("Room not found.", 404);
        }

        jsonSuccess(["deleted" => $id]);
    }
} catch (PDOException $e) {
    jsonDbError($e);
} catch (Throwable $e) {
    jsonError("Unexpected server error.", 500);
}
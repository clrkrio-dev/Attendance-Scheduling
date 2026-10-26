<?php

require_once __DIR__ . "/../middleware/cors.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../controller/ManualConflictController.php";

enableCors();
handlePreflight();
allowMethods(["GET", "POST", "PUT", "DELETE"]);

$method = $_SERVER["REQUEST_METHOD"];
$id     = array_key_exists("id", $_GET) ? (int) $_GET["id"] : 0;
$action = array_key_exists("action", $_GET) ? (string) $_GET["action"] : "";

$types     = ["Teacher", "Room", "Section", "Other"];
$severities = ["error", "warn"];
$statuses  = ["Open", "Resolved"];
$weekdays  = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday"
];

// The key that identifies an automatic clash. It is built from the clash
// type and the schedule ids involved, so it stays the same across scans.
function sanitiseConflictKey($key)
{
    $key = trim((string) $key);
    $key = preg_replace("/[^A-Za-z0-9:|_-]/", "", $key);

    return substr((string) $key, 0, 191);
}

try {
    // ---- acknowledgements of automatic clashes ----
    if ($action === "acknowledge") {
        if ($method === "GET") {
            jsonSuccess(listAcknowledgements($pdo));
        } elseif ($method === "POST") {
            $data = readJsonBody();
            requireFields($data, ["conflict_key"]);

            $key = sanitiseConflictKey($data["conflict_key"]);

            if ($key === "") {
                jsonError("A valid conflict_key is required.", 422);
            }

            $note = array_key_exists("note", $data) ? $data["note"] : null;

            jsonSuccess(addAcknowledgement($pdo, $key, $note), 201);
        } elseif ($method === "DELETE") {
            $key = sanitiseConflictKey(
                array_key_exists("conflict_key", $_GET) ? $_GET["conflict_key"] : ""
            );

            if ($key === "") {
                jsonError("A valid conflict_key is required.", 422);
            }

            jsonSuccess(["removed" => removeAcknowledgement($pdo, $key)]);
        }
    }

    // ---- manually reported conflicts ----
    if ($method === "GET") {
        $status = array_key_exists("status", $_GET) ? (string) $_GET["status"] : "";

        if ($status !== "" && !in_array($status, $statuses, true)) {
            jsonError("Invalid status. Use Open or Resolved.", 422);
        }

        jsonSuccess(findAllManualConflicts($pdo, $status === "" ? null : $status));
    } elseif ($method === "POST") {
        $data = readJsonBody();
        requireFields($data, ["conflict_type", "title"]);

        if (!in_array($data["conflict_type"], $types, true)) {
            jsonError("Invalid conflict type. Use Teacher, Room, Section or Other.", 422);
        }

        if (array_key_exists("severity", $data) && $data["severity"] !== ""
            && !in_array($data["severity"], $severities, true)) {
            jsonError("Invalid severity. Use error or warn.", 422);
        }

        if (array_key_exists("day", $data) && $data["day"] !== ""
            && !in_array($data["day"], $weekdays, true)) {
            jsonError("Invalid day. Use a full weekday name (e.g. Monday).", 422);
        }

        jsonSuccess(createManualConflict($pdo, $data), 201);
    } elseif ($method === "PUT") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to update a conflict.", 422);
        }

        if (!findManualConflict($pdo, $id)) {
            jsonError("Conflict not found.", 404);
        }

        $data = readJsonBody();

        if (array_key_exists("conflict_type", $data)
            && !in_array($data["conflict_type"], $types, true)) {
            jsonError("Invalid conflict type. Use Teacher, Room, Section or Other.", 422);
        }

        if (array_key_exists("severity", $data) && $data["severity"] !== ""
            && !in_array($data["severity"], $severities, true)) {
            jsonError("Invalid severity. Use error or warn.", 422);
        }

        if (array_key_exists("status", $data) && $data["status"] !== ""
            && !in_array($data["status"], $statuses, true)) {
            jsonError("Invalid status. Use Open or Resolved.", 422);
        }

        if (array_key_exists("day", $data) && $data["day"] !== ""
            && !in_array($data["day"], $weekdays, true)) {
            jsonError("Invalid day. Use a full weekday name (e.g. Monday).", 422);
        }

        jsonSuccess(updateManualConflict($pdo, $id, $data));
    } elseif ($method === "DELETE") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to delete a conflict.", 422);
        }

        if (deleteManualConflict($pdo, $id) === 0) {
            jsonError("Conflict not found.", 404);
        }

        jsonSuccess(["deleted" => $id]);
    }
} catch (PDOException $e) {
    jsonDbError($e);
} catch (Throwable $e) {
    jsonError("Unexpected server error.", 500);
}

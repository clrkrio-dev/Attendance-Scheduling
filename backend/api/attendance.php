<?php

require_once __DIR__ . "/../middleware/cors.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../controller/AttendanceController.php";

enableCors();
handlePreflight();
allowMethods(["GET", "POST", "PUT", "DELETE"]);

$method = $_SERVER["REQUEST_METHOD"];
$id     = array_key_exists("id", $_GET) ? (int) $_GET["id"] : 0;

try {
    if ($method === "GET") {
        if ($id > 0) {
            $record = findAttendance($pdo, $id);

            if (!$record) {
                jsonError("Attendance record not found.", 404);
            }

            jsonSuccess($record);
        } else {
            jsonSuccess(findAllAttendance($pdo));
        }
    } elseif ($method === "POST") {
        $data = readJsonBody();
        requireFields($data, ["student_id", "schedule_id", "attendance_date"]);

        jsonSuccess(createAttendance($pdo, $data), 201);
    } elseif ($method === "PUT") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to update an attendance record.", 422);
        }

        if (!findAttendance($pdo, $id)) {
            jsonError("Attendance record not found.", 404);
        }

        jsonSuccess(updateAttendance($pdo, $id, readJsonBody()));
    } elseif ($method === "DELETE") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to delete an attendance record.", 422);
        }

        if (deleteAttendance($pdo, $id) === 0) {
            jsonError("Attendance record not found.", 404);
        }

        jsonSuccess(["deleted" => $id]);
    }
} catch (PDOException $e) {
    jsonDbError($e);
} catch (Throwable $e) {
    jsonError("Unexpected server error.", 500);
}
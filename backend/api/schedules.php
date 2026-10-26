<?php

require_once __DIR__ . "/../middleware/cors.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../controller/ScheduleController.php";

enableCors();
handlePreflight();
allowMethods(["GET", "POST", "PUT", "DELETE"]);

$method = $_SERVER["REQUEST_METHOD"];
$id     = array_key_exists("id", $_GET) ? (int) $_GET["id"] : 0;

$weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// How a class is running: it is scheduled, its teacher is absent, the
// teacher is unavailable for it, or the class is cancelled.
$classStatuses = ["scheduled", "absent", "unavailable", "cancelled"];

// Accepts HH:MM or HH:MM:SS in 24-hour format.
function validTime($value)
{
    return is_string($value)
        && preg_match("/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/", $value);
}

// Normalizes HH:MM to HH:MM:SS so string comparison is chronological.
function normTime($value)
{
    return strlen($value) === 5 ? $value . ":00" : $value;
}

function ensureReferenceExists(PDO $pdo, $table, $column, $value, $label)
{
    $stmt = $pdo->prepare("SELECT 1 FROM {$table} WHERE {$column} = ? LIMIT 1");
    $stmt->execute([$value]);

    if (!$stmt->fetchColumn()) {
        jsonError("Unknown {$label}.", 422);
    }
}

try {
    if ($method === "GET") {
        if ($id > 0) {
            $schedule = findSchedule($pdo, $id);

            if (!$schedule) {
                jsonError("Schedule not found.", 404);
            }

            jsonSuccess($schedule);
        } else {
            jsonSuccess(findAllSchedules($pdo));
        }
    } elseif ($method === "POST") {
        $data = readJsonBody();
        requireFields($data, ["subject_id", "teacher_id", "day", "start_time", "end_time"]);

        if (!in_array($data["day"], $weekdays, true)) {
            jsonError("Invalid day. Use a full weekday name (e.g. Monday).", 422);
        }

        if (!validTime($data["start_time"]) || !validTime($data["end_time"])) {
            jsonError("Invalid time. Use 24-hour HH:MM format.", 422);
        }

        if (normTime($data["end_time"]) <= normTime($data["start_time"])) {
            jsonError("End time must be after start time.", 422);
        }

        ensureReferenceExists($pdo, "subjects", "subject_id", $data["subject_id"], "subject");
        ensureReferenceExists($pdo, "teachers", "teacher_id", $data["teacher_id"], "teacher");

        if (array_key_exists("class_status", $data) && $data["class_status"] !== ""
            && !in_array($data["class_status"], $classStatuses, true)) {
            jsonError("Invalid class status. Use scheduled, absent, unavailable or cancelled.", 422);
        }

        $violations = evaluateScheduleRules($pdo, $data);

        if (count($violations) > 0) {
            jsonError(implode(" ", $violations), 422);
        }

        jsonSuccess(createSchedule($pdo, $data), 201);
    } elseif ($method === "PUT") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to update a schedule.", 422);
        }

        $existing = findSchedule($pdo, $id);

        if (!$existing) {
            jsonError("Schedule not found.", 404);
        }

        $data = readJsonBody();

        if (array_key_exists("day", $data) && !in_array($data["day"], $weekdays, true)) {
            jsonError("Invalid day. Use a full weekday name (e.g. Monday).", 422);
        }

        foreach (["start_time", "end_time"] as $field) {
            if (array_key_exists($field, $data) && !validTime($data[$field])) {
                jsonError("Invalid time. Use 24-hour HH:MM format.", 422);
            }
        }

        $start = array_key_exists("start_time", $data) ? $data["start_time"] : $existing["start_time"];
        $end   = array_key_exists("end_time", $data) ? $data["end_time"] : $existing["end_time"];

        if (normTime($end) <= normTime($start)) {
            jsonError("End time must be after start time.", 422);
        }

        if (array_key_exists("subject_id", $data)) {
            ensureReferenceExists($pdo, "subjects", "subject_id", $data["subject_id"], "subject");
        }

        if (array_key_exists("teacher_id", $data)) {
            ensureReferenceExists($pdo, "teachers", "teacher_id", $data["teacher_id"], "teacher");
        }

        if (array_key_exists("class_status", $data) && $data["class_status"] !== ""
            && !in_array($data["class_status"], $classStatuses, true)) {
            jsonError("Invalid class status. Use scheduled, absent, unavailable or cancelled.", 422);
        }

        // A status-only update never moves the class, so the scheduling rules
        // do not have to be checked again.
        $timingFields = [
            "subject_id", "teacher_id", "day",
            "start_time", "end_time", "room", "section"
        ];
        $movesClass = false;

        foreach ($timingFields as $field) {
            if (array_key_exists($field, $data)) {
                $movesClass = true;
                break;
            }
        }

        if ($movesClass) {
            $violations = evaluateScheduleRules($pdo, array_merge($existing, $data), $id);

            if (count($violations) > 0) {
                jsonError(implode(" ", $violations), 422);
            }
        }

        jsonSuccess(updateSchedule($pdo, $id, $data));
    } elseif ($method === "DELETE") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to delete a schedule.", 422);
        }

        if (deleteSchedule($pdo, $id) === 0) {
            jsonError("Schedule not found.", 404);
        }

        jsonSuccess(["deleted" => $id]);
    }
} catch (PDOException $e) {
    jsonDbError($e);
} catch (Throwable $e) {
    jsonError("Unexpected server error.", 500);
}
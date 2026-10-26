<?php

require_once __DIR__ . "/../middleware/cors.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../controller/SubjectController.php";

enableCors();
handlePreflight();
allowMethods(["GET", "POST", "PUT", "DELETE"]);

$method = $_SERVER["REQUEST_METHOD"];
$id     = array_key_exists("id", $_GET) ? (int) $_GET["id"] : 0;

try {
    if ($method === "GET") {
        if ($id > 0) {
            $subject = findSubject($pdo, $id);

            if (!$subject) {
                jsonError("Subject not found.", 404);
            }

            jsonSuccess($subject);
        } else {
            $yearLevel = array_key_exists("year_level", $_GET)
                ? $_GET["year_level"]
                : null;

            jsonSuccess(findAllSubjects($pdo, $yearLevel));
        }
    } elseif ($method === "POST") {
        $data = readJsonBody();
        requireFields($data, ["subject_code", "subject_name"]);

        jsonSuccess(createSubject($pdo, $data), 201);
    } elseif ($method === "PUT") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to update a subject.", 422);
        }

        if (!findSubject($pdo, $id)) {
            jsonError("Subject not found.", 404);
        }

        jsonSuccess(updateSubject($pdo, $id, readJsonBody()));
    } elseif ($method === "DELETE") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to delete a subject.", 422);
        }

        if (deleteSubject($pdo, $id) === 0) {
            jsonError("Subject not found.", 404);
        }

        jsonSuccess(["deleted" => $id]);
    }
} catch (PDOException $e) {
    jsonDbError($e);
} catch (Throwable $e) {
    jsonError("Unexpected server error.", 500);
}
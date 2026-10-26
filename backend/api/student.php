<?php

require_once __DIR__ . "/../middleware/cors.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../controller/StudentController.php";

enableCors();
handlePreflight();
allowMethods(["GET", "POST", "PUT", "DELETE"]);

$method = $_SERVER["REQUEST_METHOD"];
$id     = array_key_exists("id", $_GET) ? (int) $_GET["id"] : 0;

try {
    if ($method === "GET") {
        if ($id > 0) {
            $student = findStudent($pdo, $id);

            if (!$student) {
                jsonError("Student not found.", 404);
            }

            jsonSuccess($student);
        } else {
            jsonSuccess(findAllStudents($pdo));
        }
    } elseif ($method === "POST") {
        $data = readJsonBody();
        requireFields($data, ["user_id", "student_number", "course", "year_level"]);

        jsonSuccess(createStudent($pdo, $data), 201);
    } elseif ($method === "PUT") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to update a student.", 422);
        }

        if (!findStudent($pdo, $id)) {
            jsonError("Student not found.", 404);
        }

        jsonSuccess(updateStudent($pdo, $id, readJsonBody()));
    } elseif ($method === "DELETE") {
        if ($id <= 0) {
            jsonError("A valid ?id= is required to delete a student.", 422);
        }

        if (deleteStudent($pdo, $id) === 0) {
            jsonError("Student not found.", 404);
        }

        jsonSuccess(["deleted" => $id]);
    }
} catch (PDOException $e) {
    jsonDbError($e);
} catch (Throwable $e) {
    jsonError("Unexpected server error.", 500);
}
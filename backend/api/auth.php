<?php

require_once __DIR__ . "/../middleware/cors.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../middleware/auth.php";
require_once __DIR__ . "/../controller/AuthController.php";

enableCors();
handlePreflight();
allowMethods(["GET", "POST"]);

$method = $_SERVER["REQUEST_METHOD"];
$action = isset($_GET["action"]) ? $_GET["action"] : "";

try {
    if ($method === "GET") {
        $user = currentUser($pdo);

        if (is_null($user)) {
            jsonError("Not logged in.", 401);
        }

        jsonSuccess($user);
    } elseif ($method === "POST" && $action === "logout") {
        logoutUser();
        jsonSuccess(null);
    } elseif ($method === "POST") {
        $body = readJsonBody();
        requireFields($body, ["username", "password"]);

        $user = findUserByCredentials($pdo, $body["username"], $body["password"]);

        if (!$user) {
            jsonError("Invalid username or password.", 401);
        }

        loginUser($user);
        jsonSuccess($user);
    }
} catch (PDOException $e) {
    jsonDbError($e);
} catch (Throwable $e) {
    jsonError("Unexpected server error.", 500);
}
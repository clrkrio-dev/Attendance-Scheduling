<?php

// ---------------------------------------------------------------------------
// Shared JSON helpers for the Attendance & Scheduling API.
// Every endpoint that requires this file responds in JSON.
// ---------------------------------------------------------------------------

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

// Reply with a successful JSON payload and optional HTTP status code.
function jsonSuccess($data = null, $httpCode = 200)
{
    if ($httpCode !== 200) {
        http_response_code($httpCode);
    }

    echo json_encode(
        ["success" => true, "data" => $data],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit(0);
}

// Reply with an error JSON payload and an HTTP status code.
function jsonError($message, $httpCode = 400)
{
    http_response_code($httpCode);
    echo json_encode(
        ["success" => false, "message" => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit(0);
}

// Read and decode the raw JSON request body into an assoc array.
function readJsonBody()
{
    $raw = file_get_contents("php://input");

    if ($raw === "" || $raw === null) {
        return [];
    }

    $data = json_decode($raw, true);

    if (!is_array($data)) {
        jsonError("Invalid JSON request body.", 400);
    }

    return $data;
}

// Ensure that all listed fields are present and non-empty.
function requireFields($data, $fields)
{
    $missing = [];

    foreach ($fields as $field) {
        $value = array_key_exists($field, $data) ? $data[$field] : null;

        if ($value === null || (is_string($value) && trim($value) === "")) {
            $missing[] = $field;
        }
    }

    if (count($missing) > 0) {
        jsonError("Missing required field(s): " . implode(", ", $missing), 422);
    }
}

// Guard: make sure the request uses one of the allowed HTTP methods.
function allowMethods($methods)
{
    $method = $_SERVER["REQUEST_METHOD"];

    if (!in_array($method, $methods)) {
        jsonError("Method not allowed. Allowed: " . implode(", ", $methods), 405);
    }
}

// Map a PDO exception to a friendly JSON error response.
// SQLSTATE class "23" means an integrity-constraint violation (duplicate key,
// invalid foreign key, etc.) -> HTTP 409 Conflict.
function jsonDbError(PDOException $e)
{
    if (str_starts_with((string) $e->getCode(), "23")) {
        jsonError("The record conflicts with existing data (duplicate value or invalid reference).", 409);
    }

    jsonError("Database error: " . $e->getMessage(), 500);
}
<?php
// Database connection for the Attendance & Scheduling API.
// Credentials come from the environment with local XAMPP defaults.

$host     = getenv("DB_HOST") ?: "localhost";
$db_name  = getenv("DB_NAME") ?: "attendance&schedulingdb";
$username = getenv("DB_USER") ?: "root";
$password = getenv("DB_PASS") !== false ? getenv("DB_PASS") : "";

try {
    // Create the connection string (DSN) and instantiate PDO
    $dsn = "mysql:host=$host;dbname=$db_name;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    // The API always answers in JSON, so never leak a plain-text / HTML error.
    if (function_exists("jsonError")) {
        jsonError("Database connection failed.", 500);
    }

    header("Content-Type: application/json; charset=utf-8");
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed."]);
    exit;
}
?>

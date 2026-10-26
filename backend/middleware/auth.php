<?php

// ---------------------------------------------------------------------------
// Minimal session-based authentication used by backend/api/auth.php.
// Requires AuthController.php to be loaded (for findUserById).
// ---------------------------------------------------------------------------

// Makes sure a PHP session is running.
function startSession()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        "lifetime" => 0,
        "path"     => "/",
        "httponly" => true,
        "samesite" => "Lax",
    ]);
    session_start();
}

// Stores the logged-in user in the session.
function loginUser(array $user)
{
    startSession();
    session_regenerate_id(true);

    $_SESSION["user_id"]  = $user["user_id"];
    $_SESSION["username"] = $user["username"];
    $_SESSION["role"]     = $user["role"];
}

// Clears the session.
function logoutUser()
{
    startSession();

    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            "",
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();
}

// Returns the currently logged-in user row, or null when not authenticated.
function currentUser(PDO $pdo)
{
    startSession();

    $userId = array_key_exists("user_id", $_SESSION) ? $_SESSION["user_id"] : null;

    if (is_null($userId)) {
        return null;
    }

    $user = findUserById($pdo, (int) $userId);

    return $user ? $user : null;
}
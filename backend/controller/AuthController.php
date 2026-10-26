<?php

// ---------------------------------------------------------------------------
// User / authentication data access layer (matches the current `users` table).
// Passwords are stored as bcrypt hashes, so login uses password_verify().
// ---------------------------------------------------------------------------

// Finds a user by primary key. The password hash is never returned.
function findUserById(PDO $pdo, $id)
{
    $stmt = $pdo->prepare(
        "SELECT
            u.user_id,
            u.username,
            u.full_name,
            u.email,
            u.role,
            u.status
         FROM users u
         WHERE u.user_id = ?"
    );
    $stmt->execute([$id]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Validates credentials against the users table.
// Returns the user row (without the password) or null when they do not match.
function findUserByCredentials(PDO $pdo, $username, $password)
{
    $stmt = $pdo->prepare(
        "SELECT
            u.user_id,
            u.username,
            u.password,
            u.full_name,
            u.email,
            u.role,
            u.status
         FROM users u
         WHERE u.username = ? AND u.status = 'Active'
         LIMIT 1"
    );
    $stmt->execute([$username]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        return null;
    }

    if (!password_verify($password, $row["password"])) {
        return null;
    }

    // Strip the hash before returning the user.
    unset($row["password"]);

    return $row;
}
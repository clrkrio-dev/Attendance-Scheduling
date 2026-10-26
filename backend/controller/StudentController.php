<?php

// ---------------------------------------------------------------------------
// Student data access layer (matches the current `students` table).
// ---------------------------------------------------------------------------

// Finds one student (joined with its user account) by primary key.
function findStudent(PDO $pdo, $id)
{
    $stmt = $pdo->prepare(
        "SELECT
            s.student_id,
            s.user_id,
            s.student_number,
            s.course,
            s.year_level,
            s.section,
            u.username,
            u.full_name,
            u.email
         FROM students s
         LEFT JOIN users u
            ON u.user_id = s.user_id
         WHERE s.student_id = ?"
    );
    $stmt->execute([$id]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Lists all students, ordered by student number.
function findAllStudents(PDO $pdo)
{
    $stmt = $pdo->query(
        "SELECT
            s.student_id,
            s.user_id,
            s.student_number,
            s.course,
            s.year_level,
            s.section,
            u.username,
            u.full_name,
            u.email
         FROM students s
         LEFT JOIN users u
            ON u.user_id = s.user_id
         ORDER BY s.student_number"
    );

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Creates a student and returns the created row.
function createStudent(PDO $pdo, array $data)
{
    $stmt = $pdo->prepare(
        "INSERT INTO students
            (user_id, student_number, course, year_level, section)
         VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $data["user_id"],
        $data["student_number"],
        $data["course"],
        $data["year_level"],
        array_key_exists("section", $data) ? $data["section"] : null
    ]);

    return findStudent($pdo, $pdo->lastInsertId());
}

// Updates a student with whatever fields were supplied and returns the row.
function updateStudent(PDO $pdo, $id, array $data)
{
    $fields = [
        "user_id",
        "student_number",
        "course",
        "year_level",
        "section"
    ];

    $sets   = [];
    $params = [];

    foreach ($fields as $field) {
        if (array_key_exists($field, $data)) {
            $sets[]   = $field . " = ?";
            $params[] = $data[$field];
        }
    }

    if (count($sets) > 0) {
        $params[] = $id;

        $stmt = $pdo->prepare(
            "UPDATE students SET " . implode(", ", $sets) . " WHERE student_id = ?"
        );
        $stmt->execute($params);
    }

    return findStudent($pdo, $id);
}

// Deletes a student; returns the number of affected rows.
function deleteStudent(PDO $pdo, $id)
{
    $stmt = $pdo->prepare("DELETE FROM students WHERE student_id = ?");
    $stmt->execute([$id]);

    return $stmt->rowCount();
}
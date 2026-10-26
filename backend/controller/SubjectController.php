<?php

// ---------------------------------------------------------------------------
// Subject data access layer (matches the current `subjects` table).
// ---------------------------------------------------------------------------

// Finds one subject by primary key.
function findSubject(PDO $pdo, $id)
{
    $stmt = $pdo->prepare(
        "SELECT
            s.subject_id,
            s.subject_code,
            s.subject_name,
            s.description,
            s.units,
            s.year_level
         FROM subjects s
         WHERE s.subject_id = ?"
    );
    $stmt->execute([$id]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Lists all subjects, optionally narrowed to one year level.
// Subjects without a year level belong to every year.
function findAllSubjects(PDO $pdo, $yearLevel = null)
{
    $sql = "SELECT
                s.subject_id,
                s.subject_code,
                s.subject_name,
                s.description,
                s.units,
                s.year_level
             FROM subjects s";
    $params = [];

    if ($yearLevel !== null && $yearLevel !== "") {
        $sql .= " WHERE s.year_level = ?";
        $params[] = (int) $yearLevel;
    }

    $sql .= " ORDER BY s.year_level, s.subject_code";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Creates a subject and returns the created row.
function createSubject(PDO $pdo, array $data)
{
    $stmt = $pdo->prepare(
        "INSERT INTO subjects
            (subject_code, subject_name, description, units)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([
        $data["subject_code"],
        $data["subject_name"],
        array_key_exists("description", $data) ? $data["description"] : null,
        array_key_exists("units", $data) ? $data["units"] : null
    ]);

    return findSubject($pdo, $pdo->lastInsertId());
}

// Updates a subject with whatever fields were supplied and returns the row.
function updateSubject(PDO $pdo, $id, array $data)
{
    $fields = [
        "subject_code",
        "subject_name",
        "description",
        "units"
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
            "UPDATE subjects SET " . implode(", ", $sets) . " WHERE subject_id = ?"
        );
        $stmt->execute($params);
    }

    return findSubject($pdo, $id);
}

// Deletes a subject; returns the number of affected rows.
function deleteSubject(PDO $pdo, $id)
{
    $stmt = $pdo->prepare("DELETE FROM subjects WHERE subject_id = ?");
    $stmt->execute([$id]);

    return $stmt->rowCount();
}
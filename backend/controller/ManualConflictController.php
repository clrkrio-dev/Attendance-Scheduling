<?php

// ---------------------------------------------------------------------------
// Manual conflict data access layer (the `manual_conflicts` table).
//
// These are the conflicts a member of staff reports by hand: equipment
// problems, room change requests, exam clashes and the like. The automatic
// clashes the schedule detects are not stored - they are recomputed on every
// scan - so this table holds only the reported ones.
// ---------------------------------------------------------------------------

// Finds one reported conflict by primary key.
function findManualConflict(PDO $pdo, $id)
{
    $stmt = $pdo->prepare(
        "SELECT
            conflict_id,
            conflict_type,
            day,
            reference,
            title,
            description,
            severity,
            status,
            resolution_note,
            reported_by,
            created_at,
            updated_at
         FROM manual_conflicts
         WHERE conflict_id = ?"
    );
    $stmt->execute([$id]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Lists the reported conflicts, newest first.
// $status narrows the list to "Open" or "Resolved" when given.
function findAllManualConflicts(PDO $pdo, $status = null)
{
    $sql = "SELECT
                conflict_id,
                conflict_type,
                day,
                reference,
                title,
                description,
                severity,
                status,
                resolution_note,
                reported_by,
                created_at,
                updated_at
             FROM manual_conflicts";
    $params = [];

    if ($status !== null && $status !== "") {
        $sql .= " WHERE status = ?";
        $params[] = $status;
    }

    $sql .= " ORDER BY FIELD(status, 'Open', 'Resolved'), created_at DESC, conflict_id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Creates a reported conflict and returns the created row.
function createManualConflict(PDO $pdo, array $data)
{
    $stmt = $pdo->prepare(
        "INSERT INTO manual_conflicts
            (conflict_type, day, reference, title, description, severity,
             status, resolution_note, reported_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $data["conflict_type"],
        array_key_exists("day", $data) && $data["day"] !== "" ? $data["day"] : null,
        array_key_exists("reference", $data) ? $data["reference"] : null,
        $data["title"],
        array_key_exists("description", $data) ? $data["description"] : null,
        array_key_exists("severity", $data) && $data["severity"] !== ""
            ? $data["severity"]
            : "warn",
        array_key_exists("status", $data) && $data["status"] !== ""
            ? $data["status"]
            : "Open",
        array_key_exists("resolution_note", $data) ? $data["resolution_note"] : null,
        array_key_exists("reported_by", $data) ? $data["reported_by"] : null
    ]);

    return findManualConflict($pdo, $pdo->lastInsertId());
}

// Updates a reported conflict with whatever fields were supplied.
function updateManualConflict(PDO $pdo, $id, array $data)
{
    $fields = [
        "conflict_type",
        "day",
        "reference",
        "title",
        "description",
        "severity",
        "status",
        "resolution_note",
        "reported_by"
    ];

    $sets   = [];
    $params = [];

    foreach ($fields as $field) {
        if (!array_key_exists($field, $data)) {
            continue;
        }

        $sets[]   = $field . " = ?";
        $params[] = $data[$field] === "" ? null : $data[$field];
    }

    if (count($sets) > 0) {
        $params[] = $id;

        $stmt = $pdo->prepare(
            "UPDATE manual_conflicts SET " . implode(", ", $sets) . " WHERE conflict_id = ?"
        );
        $stmt->execute($params);
    }

    return findManualConflict($pdo, $id);
}

// Deletes a reported conflict; returns the number of affected rows.
function deleteManualConflict(PDO $pdo, $id)
{
    $stmt = $pdo->prepare("DELETE FROM manual_conflicts WHERE conflict_id = ?");
    $stmt->execute([$id]);

    return $stmt->rowCount();
}

// ---------------------------------------------------------------------------
// Acknowledged automatic conflicts
//
// An automatic clash that has been reviewed and accepted. Acknowledging one
// keeps the record but takes it out of the list, so known clashes stop
// burying the ones that still need attention.
// ---------------------------------------------------------------------------

// Lists every acknowledged clash.
function listAcknowledgements(PDO $pdo)
{
    $stmt = $pdo->query(
        "SELECT conflict_key, note, created_at
           FROM conflict_acknowledgements
          ORDER BY created_at DESC"
    );

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Acknowledges a clash. Acknowledging the same clash twice is a no-op.
function addAcknowledgement(PDO $pdo, $key, $note = null)
{
    $stmt = $pdo->prepare(
        "INSERT INTO conflict_acknowledgements (conflict_key, note)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE note = VALUES(note)"
    );
    $stmt->execute([$key, $note]);

    $stmt = $pdo->prepare(
        "SELECT conflict_key, note, created_at
           FROM conflict_acknowledgements
          WHERE conflict_key = ?"
    );
    $stmt->execute([$key]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Removes an acknowledgement; returns the number of affected rows.
function removeAcknowledgement(PDO $pdo, $key)
{
    $stmt = $pdo->prepare(
        "DELETE FROM conflict_acknowledgements WHERE conflict_key = ?"
    );
    $stmt->execute([$key]);

    return $stmt->rowCount();
}

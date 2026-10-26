<?php

// ---------------------------------------------------------------------------
// Attendance data access layer (matches the current `attendance` table).
// ---------------------------------------------------------------------------

// Finds one attendance record (joined with the student) by primary key.
function findAttendance(PDO $pdo, $id)
{
    $stmt = $pdo->prepare(
        "SELECT
            a.attendance_id,
            a.student_id,
            a.schedule_id,
            a.attendance_date,
            a.time_in,
            a.time_out,
            a.status,
            a.remarks,
            u.full_name       AS student_name,
            s.student_number
         FROM attendance a
         LEFT JOIN students s
            ON s.student_id = a.student_id
         LEFT JOIN users u
            ON u.user_id = s.user_id
         WHERE a.attendance_id = ?"
    );
    $stmt->execute([$id]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Lists all attendance records.
function findAllAttendance(PDO $pdo)
{
    $stmt = $pdo->query(
        "SELECT
            a.attendance_id,
            a.student_id,
            a.schedule_id,
            a.attendance_date,
            a.time_in,
            a.time_out,
            a.status,
            a.remarks,
            u.full_name       AS student_name,
            s.student_number
         FROM attendance a
         LEFT JOIN students s
            ON s.student_id = a.student_id
         LEFT JOIN users u
            ON u.user_id = s.user_id
         ORDER BY a.attendance_date, a.time_in"
    );

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Creates an attendance record and returns the created row.
// status defaults to 'Absent' when not supplied.
function createAttendance(PDO $pdo, array $data)
{
    $stmt = $pdo->prepare(
        "INSERT INTO attendance
            (student_id, schedule_id, attendance_date, time_in, time_out, status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $data["student_id"],
        $data["schedule_id"],
        $data["attendance_date"],
        array_key_exists("time_in", $data)  ? $data["time_in"]  : null,
        array_key_exists("time_out", $data) ? $data["time_out"] : null,
        array_key_exists("status", $data)   ? $data["status"]   : "Absent",
        array_key_exists("remarks", $data)  ? $data["remarks"]  : null
    ]);

    return findAttendance($pdo, $pdo->lastInsertId());
}

// Updates an attendance record with whatever fields were supplied.
function updateAttendance(PDO $pdo, $id, array $data)
{
    $fields = [
        "student_id",
        "schedule_id",
        "attendance_date",
        "time_in",
        "time_out",
        "status",
        "remarks"
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
            "UPDATE attendance SET " . implode(", ", $sets) . " WHERE attendance_id = ?"
        );
        $stmt->execute($params);
    }

    return findAttendance($pdo, $id);
}

// Deletes an attendance record; returns the number of affected rows.
function deleteAttendance(PDO $pdo, $id)
{
    $stmt = $pdo->prepare("DELETE FROM attendance WHERE attendance_id = ?");
    $stmt->execute([$id]);

    return $stmt->rowCount();
}
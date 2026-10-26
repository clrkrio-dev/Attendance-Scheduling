<?php

// ---------------------------------------------------------------------------
// Adds 8 more teachers (EMP-003 ... EMP-010) and deals each of them 2 of the
// seeded schedules, so every teacher appears in the Teacher Schedule tab.
//
// The original schedules (ids 1-5) and the intentional conflict example are
// never touched. Moving a class to a teacher with no other classes cannot
// create a teacher overlap, and room/section overlaps are unchanged, so the
// conflict list is unaffected. Safe to re-run (exits when done).
//
// Usage:  php backend/database/seed_teachers.php
// ---------------------------------------------------------------------------

require_once __DIR__ . "/../config/database.php";

define("SEED_TEACHER_PASSWORD", getenv("SEED_TEACHER_PASSWORD") ?: "teacher1234"); // demo-only; override via env
define("SEED_TEACHER_EMAIL_DOMAIN", "attend.edu");

$newTeachers = [
    ["Jose Ramos", "Information Technology"],
    ["Ana Aquino", "Computer Science"],
    ["Pedro Mendoza", "Information Technology"],
    ["Angela Torres", "Computer Science"],
    ["Mark Flores", "Information Technology"],
    ["Kristine Gonzalez", "Computer Science"],
    ["Miguel Rivera", "Information Technology"],
    ["Gabriela Castillo", "Computer Science"],
];

$have = (int) $pdo->query("SELECT COUNT(*) FROM teachers")->fetchColumn();

if ($have >= 10) {
    echo "Already have {$have} teachers. Nothing to do.\n";
    exit(0);
}

$seqStmt = $pdo->query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(username, 'teacher', -1) AS UNSIGNED)), 0)
       FROM users WHERE username LIKE 'teacher%'"
);
$seq = (int) $seqStmt->fetchColumn();

$empStmt = $pdo->query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(employee_number, '-', -1) AS UNSIGNED)), 0)
       FROM teachers WHERE employee_number LIKE 'EMP-%'"
);
$emp = (int) $empStmt->fetchColumn();

$hash = password_hash(SEED_TEACHER_PASSWORD, PASSWORD_BCRYPT);

$userStmt = $pdo->prepare(
    "INSERT INTO users (username, password, full_name, email, role, status)
     VALUES (?, ?, ?, ?, 'Teacher', 'Active')"
);
$teacherStmt = $pdo->prepare(
    "INSERT INTO teachers (user_id, employee_number, department)
     VALUES (?, ?, ?)"
);

$teacherIds = [];
$pdo->beginTransaction();

try {
    foreach ($newTeachers as $t) {
        list($fullName, $department) = $t;
        $seq++;
        $emp++;

        $username = "teacher" . str_pad((string) $seq, 2, "0", STR_PAD_LEFT);
        $number = "EMP-" . str_pad((string) $emp, 3, "0", STR_PAD_LEFT);

        $userStmt->execute([
            $username,
            $hash,
            $fullName,
            $username . "@" . SEED_TEACHER_EMAIL_DOMAIN,
        ]);
        $teacherStmt->execute([(int) $pdo->lastInsertId(), $number, $department]);
        $teacherIds[] = (int) $pdo->lastInsertId();
    }

    // Deal 2 movable schedules to each new teacher. Originals (1-5) and the
    // conflict example stay with their teachers.
    $movable = $pdo->query(
        "SELECT schedule_id FROM schedules
          WHERE schedule_id NOT IN (1, 2, 3, 4, 5, 7)
          ORDER BY schedule_id
          LIMIT " . (count($teacherIds) * 2)
    )->fetchAll(PDO::FETCH_COLUMN);

    $move = $pdo->prepare(
        "UPDATE schedules SET teacher_id = ? WHERE schedule_id = ?"
    );

    $i = 0;

    foreach ($teacherIds as $teacherId) {
        for ($k = 0; $k < 2 && $i < count($movable); $k++, $i++) {
            $move->execute([$teacherId, $movable[$i]]);
        }
    }

    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    throw $e;
}

printf("Created %d teacher(s), reassigned %d schedule(s).\n", count($teacherIds), $i);

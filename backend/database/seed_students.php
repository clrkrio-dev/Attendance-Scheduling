<?php

// ---------------------------------------------------------------------------
// Seeds every year level (1st-4th) with 10 class sections of 50+ students.
//
//   BSIT-1A ... BSIT-1E, BSCS-1A ... BSCS-1E   (1st year)
//   BSIT-2A ... BSIT-2E, BSCS-2A ... BSCS-2E   (2nd year)
//   ... and so on through 4th year.
//
// The script is idempotent: every section is topped up to TARGET_STUDENTS and
// nothing is touched once a section is already full, so it is safe to re-run.
//
// Usage:  php backend/database/seed_students.php
// ---------------------------------------------------------------------------

require_once __DIR__ . "/../config/database.php";

define("TARGET_STUDENTS", 51); // 50+ students per section
define("SEED_PASSWORD", getenv("SEED_PASSWORD") ?: "student1234"); // demo-only; override via env
define("SEED_EMAIL_DOMAIN", "attend.edu");
define("SEED_NUMBER_PREFIX", "2026-");

$programs = [
    ["BSIT", "Bachelor of Science in Information Technology"],
    ["BSCS", "Bachelor of Science in Computer Science"],
];
$years   = [1, 2, 3, 4];
$letters = ["A", "B", "C", "D", "E"];

$sections = [];

foreach ($years as $year) {
    foreach ($programs as $program) {
        list($code, $course) = $program;

        foreach ($letters as $letter) {
            $sections[] = [$code . "-" . $year . $letter, $course, $year];
        }
    }
}

// Name pools are combined positionally, which yields a unique pairing for every
// index as long as the index stays below (count($first) * count($last)).
$firstNames = [
    "Juan", "Maria", "Jose", "Ana", "Pedro", "Angela", "Mark", "Jirah",
    "Angelo", "Kristine", "Miguel", "Gabriela", "Rafael", "Isabel", "Paolo",
    "Samantha", "Daniel", "Patricia", "Joshua", "Camille", "Adrian", "Nicole",
    "Emmanuel", "Roseann", "Victor", "Lauren", "Christian", "Hannah",
    "Oliver", "Mikaella", "Gabriel", "Stephanie", "Carlo", "Princess",
    "Ronald", "Jeniffer", "Michael", "Mary", "Joseph", "Christine",
];

$lastNames = [
    "Dela Cruz", "Santos", "Reyes", "Cruz", "Garcia", "Bautista", "Mendoza",
    "Torres", "Flores", "Gonzalez", "Rivera", "Aquino", "Ramos", "Castillo",
    "Villanueva", "Fernandez", "Lopez", "Perez", "Mercado", "Salazar",
    "Panganiban", "Tolentino", "Dimaculangan", "Manalo", "Evangelista",
    "Navarro", "Paguio", "Balagtas", "Martinez", "Hernandez", "Ortega",
    "Lim", "Chua", "Tan", "Ong", "Sy", "Go", "Rosales", "Sarmiento",
    "Aguilar",
];

// Continue the existing numbering instead of colliding with it.
$stmt = $pdo->query(
    "SELECT COALESCE(
        MAX(CAST(SUBSTRING_INDEX(student_number, '-', -1) AS UNSIGNED)), 0
     ) FROM students WHERE student_number LIKE '" . SEED_NUMBER_PREFIX . "%'"
);
$seq = (int) $stmt->fetchColumn();

// Every new account shares the same seeded password, so hash it once: hashing
// 500+ times would take half a minute for no extra safety on demo accounts.
$hash = password_hash(SEED_PASSWORD, PASSWORD_BCRYPT);

$userStmt = $pdo->prepare(
    "INSERT INTO users (username, password, full_name, email, role, status)
     VALUES (?, ?, ?, ?, 'Student', 'Active')"
);
$studentStmt = $pdo->prepare(
    "INSERT INTO students (user_id, student_number, course, year_level, section)
     VALUES (?, ?, ?, ?, ?)"
);
$countStmt = $pdo->prepare(
    "SELECT COUNT(*) FROM students WHERE section = ?"
);

$created = 0;
$pdo->beginTransaction();

try {
    foreach ($sections as $section) {
        list($sectionName, $course, $yearLevel) = $section;

        $countStmt->execute([$sectionName]);
        $have = (int) $countStmt->fetchColumn();
        $need = TARGET_STUDENTS - $have;

        for ($i = 0; $i < $need; $i++) {
            $seq++;

            $first = $firstNames[$seq % count($firstNames)];
            $last  = $lastNames[intdiv($seq, count($firstNames)) % count($lastNames)];
            $fullName = $first . " " . $last;
            $username = "student" . str_pad((string) $seq, 4, "0", STR_PAD_LEFT);
            $number   = SEED_NUMBER_PREFIX . str_pad((string) $seq, 4, "0", STR_PAD_LEFT);

            $userStmt->execute([
                $username,
                $hash,
                $fullName,
                $username . "@" . SEED_EMAIL_DOMAIN,
            ]);

            $studentStmt->execute([
                (int) $pdo->lastInsertId(),
                $number,
                $course,
                $yearLevel,
                $sectionName,
            ]);

            $created++;
        }
    }

    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    throw $e;
}

// Report the final per-section counts so the result is easy to verify.
echo "Created {$created} student(s).\n\n";

foreach ($sections as $section) {
    $countStmt->execute([$section[0]]);
    printf("  %-9s %3d students\n", $section[0], (int) $countStmt->fetchColumn());
}

$stmt = $pdo->query("SELECT COUNT(*) FROM students");
printf("\nTotal students: %d\n", (int) $stmt->fetchColumn());
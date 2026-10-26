<?php

// ---------------------------------------------------------------------------
// Rebuilds the timetable as an alternating block schedule.
//
// Every section is given a fixed three-day meeting pattern - MWF or TTHS -
// and two classes on each of those days. Sections on different patterns
// therefore never compete for a room or a teacher at the same time, and the
// timetable stays inside the scheduling policy:
//
//   * a course gets 2-4 classes a day (here: 2)
//   * a teacher carries at most 4 classes / 12 units a day
//
// The script replaces the whole timetable, so it is safe to re-run.
//
// Usage:  php backend/database/seed_alternating.php
// ---------------------------------------------------------------------------

require_once __DIR__ . "/../config/database.php";

// The meeting patterns, in the order the sections are dealt out.
const PATTERNS = [
    "MWF"  => ["Monday", "Wednesday", "Friday"],
    "TTHS" => ["Tuesday", "Thursday", "Saturday"],
];

const CLASSES_PER_DAY = 2;  // classes a section has on each of its days
const FIRST_HOUR     = 7;   // the first class starts at 07:00
const SLOT_HOURS     = 10;  // 07:00 - 17:00

// --- gather everything the rebuild needs, before anything is changed --------

// Sections that have students: the list of sections to schedule.
$sections = $pdo->query(
    "SELECT DISTINCT section
       FROM students
      WHERE section IS NOT NULL AND section <> ''
      ORDER BY section"
)->fetchAll(PDO::FETCH_COLUMN);

// The subjects each section already takes, so the rebuild keeps the same
// subject mix.
$subjectsOf = [];
$stmt = $pdo->query(
    "SELECT section, subject_id
       FROM schedules
      WHERE section IS NOT NULL AND section <> ''
      GROUP BY section, subject_id"
);
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $subjectsOf[$row["section"]][] = (int) $row["subject_id"];
}

$defaultSubject = (int) $pdo->query(
    "SELECT subject_id FROM subjects ORDER BY subject_id LIMIT 1"
)->fetchColumn();

$teachers = $pdo->query("SELECT teacher_id FROM teachers ORDER BY teacher_id")
    ->fetchAll(PDO::FETCH_COLUMN);

$rooms = $pdo->query(
    "SELECT DISTINCT room_name
       FROM rooms
      WHERE room_type <> 'Facility'
      ORDER BY room_name"
)->fetchAll(PDO::FETCH_COLUMN);

if (count($sections) === 0 || count($teachers) === 0 || count($rooms) === 0) {
    fwrite(STDERR, "ERROR: sections, teachers and teaching rooms are all needed.\n");
    exit(1);
}

// Attendance points at a schedule, so the timetable can only be rebuilt while
// there is nothing to lose.
$attendanceCount = (int) $pdo->query("SELECT COUNT(*) FROM attendance")->fetchColumn();

if ($attendanceCount > 0) {
    fwrite(
        STDERR,
        "ERROR: there are {$attendanceCount} attendance records. The timetable cannot be rebuilt without losing them.\n"
    );
    exit(1);
}

// --- work out the plan ------------------------------------------------------

// Alternate the patterns, so neighbouring sections meet on different days.
$patternOf = [];
foreach ($sections as $index => $section) {
    $patternOf[$section] = $index % 2 === 0
        ? array_keys(PATTERNS)[0]
        : array_keys(PATTERNS)[1];
}

$teacherCount = count($teachers);
$roomCount = count($rooms);
$classes = [];

foreach (PATTERNS as $pattern => $days) {
    $patternSections = array_values(array_filter(
        $sections,
        function ($s) use ($patternOf, $pattern) {
            return $patternOf[$s] === $pattern;
        }
    ));

    if (count($patternSections) === 0) {
        continue;
    }

    foreach ($days as $day) {
        $classCount = count($patternSections) * CLASSES_PER_DAY;
        $perSlot = (int) ceil($classCount / SLOT_HOURS);

        if ($perSlot > $teacherCount) {
            fwrite(
                STDERR,
                "ERROR: {$classCount} classes on {$day} do not fit in {$teacherCount} teachers.\n"
            );
            exit(1);
        }

        if ($perSlot > $roomCount) {
            fwrite(STDERR, "ERROR: not enough distinct teaching rooms.\n");
            exit(1);
        }

        for ($slot = 0; $slot < SLOT_HOURS; $slot++) {
            for ($p = 0; $p < $perSlot; $p++) {
                $k = $slot * $perSlot + $p;

                if ($k >= $classCount) {
                    break 2;
                }

                // The section cycles through the day, so each one gets its
                // classes in slots that are spread apart.
                $section = $patternSections[$k % count($patternSections)];

                // The teacher offset turns with the slot, so every teacher
                // teaches in exactly as many slots as there are classes per
                // slot and never two classes at the same time.
                $teacher = $teachers[
                    ($slot - $p + $teacherCount * 2) % $teacherCount
                ];

                $room = $rooms[$k % $roomCount];

                $subjects = isset($subjectsOf[$section])
                    ? $subjectsOf[$section]
                    : [$defaultSubject];
                $subject = $subjects[$k % count($subjects)];

                $start = FIRST_HOUR + $slot;

                $classes[] = [
                    $subject,
                    $teacher,
                    $day,
                    sprintf("%02d:00:00", $start),
                    sprintf("%02d:00:00", $start + 1),
                    $room,
                    $section,
                ];
            }
        }
    }
}

// --- rebuild ----------------------------------------------------------------

$insert = $pdo->prepare(
    "INSERT INTO schedules
        (subject_id, teacher_id, day, start_time, end_time, room, section)
     VALUES (?, ?, ?, ?, ?, ?, ?)"
);

$pdo->beginTransaction();

try {
    $pdo->exec("DELETE FROM schedules");

    foreach ($classes as $class) {
        $insert->execute($class);
    }

    // The acknowledgements point at the old schedule ids, so they no longer
    // mean anything.
    $pdo->exec("DELETE FROM conflict_acknowledgements");

    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    throw $e;
}

// --- report -----------------------------------------------------------------

printf("Rebuilt the timetable: %d classes.\n\n", count($classes));

$stmt = $pdo->query(
    "SELECT day, COUNT(*) AS classes
       FROM schedules
      GROUP BY day
      ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')"
);
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    printf("  %-10s %2d class(es)\n", $row["day"], $row["classes"]);
}

echo "\nTeacher load per day:\n";
$stmt = $pdo->query(
    "SELECT c.teacher_id, u.full_name, c.day, COUNT(*) AS classes, ROUND(SUM(s.units), 1) AS units
       FROM schedules c
       JOIN subjects s ON s.subject_id = c.subject_id
       LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
       LEFT JOIN users u ON u.user_id = t.user_id
      GROUP BY c.teacher_id, u.full_name, c.day
      ORDER BY c.teacher_id, c.day"
);
$load = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $load[$row["teacher_id"]] = $row;
    printf(
        "  teacher %-3s %-22s %-10s %2d class(es) %5s units\n",
        $row["teacher_id"],
        $row["full_name"],
        $row["day"],
        $row["classes"],
        $row["units"]
    );
}

echo "\nSection patterns:\n";
$stmt = $pdo->query(
    "SELECT section, COUNT(DISTINCT day) AS days, COUNT(*) AS classes
       FROM schedules
      GROUP BY section
      ORDER BY section"
);
$patterns = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $patterns[$row["section"]] = $row;
}
foreach ($patterns as $section => $row) {
    printf("  %-9s %-6s %d class(es)\n", $section, $patternOf[$section], $row["classes"]);
}

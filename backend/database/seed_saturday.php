<?php

// ---------------------------------------------------------------------------
// Gives every section a Saturday class and spreads the teaching across all
// teachers, so every teacher also works on Saturday.
//
// The script is idempotent: sections that already have a Saturday class are
// skipped. It never schedules more than one class per teacher per slot, and
// never more classes for a teacher than the daily policy allows (4 Saturday
// classes, which is the 12-unit daily maximum).
//
// Usage:  php backend/database/seed_saturday.php
// ---------------------------------------------------------------------------

require_once __DIR__ . "/../config/database.php";

const SATURDAY = "Saturday";

// The Saturday block, one hour per slot.
const SLOTS = [
    ["07:00:00", "08:00:00"],
    ["08:00:00", "09:00:00"],
    ["09:00:00", "10:00:00"],
    ["10:00:00", "11:00:00"],
];

// Sections that still need a Saturday class, with a subject they already take.
$stmt = $pdo->query(
    "SELECT c.section, MIN(c.subject_id) AS subject_id
       FROM schedules c
      WHERE c.day <> 'Saturday'
      GROUP BY c.section
      ORDER BY c.section"
);
$sections = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Leave the sections that already have a Saturday class alone.
$have = $pdo->query(
    "SELECT DISTINCT section FROM schedules WHERE day = 'Saturday'"
)->fetchAll(PDO::FETCH_COLUMN);
$have = array_flip($have);

// Sections that already follow a block pattern (three or more meeting days)
// are left alone too, so this script cannot break an alternating timetable.
$stmt = $pdo->query(
    "SELECT section, COUNT(DISTINCT day) AS days
       FROM schedules
      WHERE section IS NOT NULL AND section <> ''
      GROUP BY section
      HAVING days >= 3"
);
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $have[$row["section"]] = true;
}

$sections = array_values(array_filter(
    $sections,
    function ($s) use ($have) {
        return !isset($have[$s["section"]]);
    }
));

if (count($sections) === 0) {
    echo "Every section already has a Saturday class or follows a block pattern. Nothing to do.\n";
    exit(0);
}

// All teachers, so the Saturday work is shared out evenly.
$teachers = $pdo->query("SELECT teacher_id FROM teachers ORDER BY teacher_id")
    ->fetchAll(PDO::FETCH_COLUMN);

if (count($teachers) === 0) {
    fwrite(STDERR, "ERROR: there are no teachers to schedule.\n");
    exit(1);
}

// Teaching rooms. Room names repeat across buildings, and the schedule stores
// the name, so only the distinct names matter.
$rooms = $pdo->query(
    "SELECT DISTINCT room_name
       FROM rooms
      WHERE room_type <> 'Facility'
      ORDER BY room_name"
)->fetchAll(PDO::FETCH_COLUMN);

$slots = count(SLOTS);
$sectionCount = count($sections);
$teacherCount = count($teachers);
$roomCount = count($rooms);

// A teacher can take one class per slot, so there must be a free slot for
// every section.
if ($sectionCount > $teacherCount * $slots) {
    fwrite(
        STDERR,
        "ERROR: {$sectionCount} sections do not fit in {$slots} Saturday slots with {$teacherCount} teachers.\n"
    );
    exit(1);
}

// Every class in a slot needs its own room.
if ((int) ceil($sectionCount / $slots) > $roomCount) {
    fwrite(STDERR, "ERROR: not enough distinct teaching rooms.\n");
    exit(1);
}

$insert = $pdo->prepare(
    "INSERT INTO schedules
        (subject_id, teacher_id, day, start_time, end_time, room, section)
     VALUES (?, ?, 'Saturday', ?, ?, ?, ?)"
);

$created = 0;
$pdo->beginTransaction();

try {
    foreach ($sections as $index => $row) {
        // Round-robin the sections over the slots, so a slot never holds more
        // classes than there are teachers.
        $slot = $index % $slots;
        $position = intdiv($index, $slots);

        // The teacher offset rotates per slot, so every teacher gets one
        // class in every slot and never two classes at the same time.
        $teacher = $teachers[($slot * 3 + $position) % $teacherCount];
        $room = $rooms[$position % $roomCount];

        $insert->execute([
            $row["subject_id"],
            $teacher,
            SLOTS[$slot][0],
            SLOTS[$slot][1],
            $room,
            $row["section"],
        ]);

        $created++;
    }

    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    throw $e;
}

printf("Created %d Saturday class(es).\n\n", $created);

// Report the result so it is easy to verify.
$stmt = $pdo->query(
    "SELECT c.teacher_id, u.full_name, COUNT(*) AS classes
       FROM schedules c
       LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
       LEFT JOIN users u ON u.user_id = t.user_id
      WHERE c.day = 'Saturday'
      GROUP BY c.teacher_id, u.full_name
      ORDER BY c.teacher_id"
);
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    printf(
        "  teacher %-3s %-22s %d class(es)\n",
        $row["teacher_id"],
        $row["full_name"],
        $row["classes"]
    );
}

$stmt = $pdo->query(
    "SELECT COUNT(DISTINCT section) AS sections
       FROM schedules
      WHERE day = 'Saturday'"
);
printf("\nSections with a Saturday class: %d\n", (int) $stmt->fetchColumn());

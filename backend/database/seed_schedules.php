<?php

// ---------------------------------------------------------------------------
// Seeds one class schedule per section that does not have any yet, so every
// section (BSIT/BSCS 1st-4th year, A-E) appears in the schedule tabs.
//
// The script is idempotent: sections already present in `schedules` are
// skipped, and every new class is placed in the first (day, time, teacher,
// room) slot that does not overlap an existing class for the same teacher,
// room, or section. Safe to re-run.
//
// Usage:  php backend/database/seed_schedules.php
// ---------------------------------------------------------------------------

require_once __DIR__ . "/../config/database.php";

$days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
$slots = [
    ["08:00:00", "09:30:00"],
    ["09:30:00", "11:00:00"],
    ["11:00:00", "12:30:00"],
    ["13:00:00", "14:30:00"],
    ["15:00:00", "16:30:00"],
];
$teachers = [1, 2];
$rooms = [
    "Lab 1", "Lab 2", "Library", "Lab 3", "Admin",
    "Room 101", "Room 102", "Room 103", "Room A", "Room B",
    "Room C", "Room D",
];
$bsitSubjects = [1, 2, 3]; // IT101, IT102, IT103
$bscsSubjects = [4, 5];     // CS101, CS102

$overlaps = function ($a, $b) {
    return $a["day"] === $b["day"]
        && $a["start_time"] < $b["end_time"]
        && $b["start_time"] < $a["end_time"];
};

// Sections (with program) that still need a schedule.
$stmt = $pdo->query(
    "SELECT DISTINCT s.section
      FROM students s
      LEFT JOIN schedules c ON c.section = s.section
     WHERE c.schedule_id IS NULL AND s.section IS NOT NULL AND s.section <> ''
     ORDER BY s.section"
);
$missing = $stmt->fetchAll(PDO::FETCH_COLUMN);

if (count($missing) === 0) {
    echo "Every section already has a schedule. Nothing to do.\n";
    exit(0);
}

// Current bookings (existing + newly added) for overlap checks.
$booked = $pdo->query(
    "SELECT teacher_id, day, start_time, end_time, room, section FROM schedules"
)->fetchAll(PDO::FETCH_ASSOC);

$insert = $pdo->prepare(
    "INSERT INTO schedules
        (subject_id, teacher_id, day, start_time, end_time, room, section)
     VALUES (?, ?, ?, ?, ?, ?, ?)"
);

$created = 0;
$programCount = ["BSIT" => 0, "BSCS" => 0];

foreach ($missing as $section) {
    $isBsit = str_starts_with($section, "BSIT");
    $program = $isBsit ? "BSIT" : "BSCS";
    $pool = $isBsit ? $bsitSubjects : $bscsSubjects;
    $subjectId = $pool[$programCount[$program] % count($pool)];
    $programCount[$program]++;

    $placed = false;

    foreach ($days as $day) {
        if ($placed) {
            break;
        }

        foreach ($slots as $slot) {
            if ($placed) {
                break;
            }

            list($start, $end) = $slot;

            foreach ($teachers as $teacherId) {
                $candidate = [
                    "teacher_id" => $teacherId,
                    "day"        => $day,
                    "start_time" => $start,
                    "end_time"   => $end,
                    "room"       => null,
                    "section"    => $section,
                ];

                // Teacher and section must both be free.
                $busy = false;

                foreach ($booked as $b) {
                    if (!$overlaps($candidate, $b)) {
                        continue;
                    }

                    if ((int) $b["teacher_id"] === $teacherId || $b["section"] === $section) {
                        $busy = true;
                        break;
                    }
                }

                if ($busy) {
                    continue;
                }

                // First room that is free at this day/time.
                foreach ($rooms as $room) {
                    $candidate["room"] = $room;
                    $clash = false;

                    foreach ($booked as $b) {
                        if ($overlaps($candidate, $b) && $b["room"] === $room) {
                            $clash = true;
                            break;
                        }
                    }

                    if (!$clash) {
                        $insert->execute([
                            $subjectId, $teacherId, $day, $start, $end,
                            $room, $section,
                        ]);
                        $booked[] = $candidate;
                        $created++;
                        $placed = true;
                        break;
                    }
                }

                if ($placed) {
                    break;
                }
            }
        }
    }

    if (!$placed) {
        fwrite(STDERR, "WARNING: no free slot found for section {$section}\n");
    }
}

printf("Created %d schedule(s).\n", $created);

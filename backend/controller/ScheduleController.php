<?php

// ---------------------------------------------------------------------------
// Schedule data access layer (matches the current `schedules` table).
// ---------------------------------------------------------------------------

// Finds one schedule (joined with subject + teacher) by primary key.
function findSchedule(PDO $pdo, $id)
{
    $stmt = $pdo->prepare(
        "SELECT
            c.schedule_id,
            c.subject_id,
            c.teacher_id,
            c.day,
            c.start_time,
            c.end_time,
            c.room,
            c.section,
            c.class_status,
            b.subject_code,
            b.subject_name,
            u.full_name      AS teacher_name,
            t.employee_number,
            t.department
         FROM schedules c
         LEFT JOIN subjects b
            ON b.subject_id = c.subject_id
         LEFT JOIN teachers t
            ON t.teacher_id = c.teacher_id
         LEFT JOIN users u
            ON u.user_id = t.user_id
         WHERE c.schedule_id = ?"
    );
    $stmt->execute([$id]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// Lists all schedules, ordered by weekday and start time.
function findAllSchedules(PDO $pdo)
{
    $stmt = $pdo->query(
        "SELECT
            c.schedule_id,
            c.subject_id,
            c.teacher_id,
            c.day,
            c.start_time,
            c.end_time,
            c.room,
            c.section,
            c.class_status,
            b.subject_code,
            b.subject_name,
            u.full_name      AS teacher_name,
            t.employee_number,
            t.department
         FROM schedules c
         LEFT JOIN subjects b
            ON b.subject_id = c.subject_id
         LEFT JOIN teachers t
            ON t.teacher_id = c.teacher_id
         LEFT JOIN users u
            ON u.user_id = t.user_id
         ORDER BY
            FIELD(c.day,
               'Monday', 'Tuesday', 'Wednesday', 'Thursday',
               'Friday', 'Saturday', 'Sunday'),
            c.day, c.start_time"
    );

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Creates a schedule and returns the created row.
function createSchedule(PDO $pdo, array $data)
{
    $stmt = $pdo->prepare(
        "INSERT INTO schedules
            (subject_id, teacher_id, day, start_time, end_time, room, section, class_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $data["subject_id"],
        $data["teacher_id"],
        $data["day"],
        $data["start_time"],
        $data["end_time"],
        array_key_exists("room", $data)   ? $data["room"]   : null,
        array_key_exists("section", $data) ? $data["section"] : null,
        array_key_exists("class_status", $data) && $data["class_status"] !== ""
            ? $data["class_status"]
            : "scheduled"
    ]);

    return findSchedule($pdo, $pdo->lastInsertId());
}

// Updates a schedule with whatever fields were supplied and returns the row.
function updateSchedule(PDO $pdo, $id, array $data)
{
    $fields = [
        "subject_id",
        "teacher_id",
        "day",
        "start_time",
        "end_time",
        "room",
        "section",
        "class_status"
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
            "UPDATE schedules SET " . implode(", ", $sets) . " WHERE schedule_id = ?"
        );
        $stmt->execute($params);
    }

    return findSchedule($pdo, $id);
}

// Deletes a schedule; returns the number of affected rows.
function deleteSchedule(PDO $pdo, $id)
{
    $stmt = $pdo->prepare("DELETE FROM schedules WHERE schedule_id = ?");
    $stmt->execute([$id]);

    return $stmt->rowCount();
}

// ---------------------------------------------------------------------------
// Scheduling policy
//
// These limits keep a teacher's week sane and make sure a section never has
// to attend two classes on the same day.
// ---------------------------------------------------------------------------

// A teacher may teach at most this many distinct subjects on one day.
const MAX_SUBJECTS_PER_TEACHER_DAY = 6;

// A teacher's daily load (the sum of the units of the subjects they teach that
// day) must stay within these bounds. Going over the maximum overloads the
// teacher; staying under the minimum under-uses them.
const MAX_UNITS_PER_TEACHER_DAY = 12;
const MIN_UNITS_PER_TEACHER_DAY = 3;

// A section (the course its students are enrolled in) is given a set number
// of classes on a day: 2 or 3 is the usual allocation, 4 is the maximum. Fewer
// than 2 leaves the day too light, and more than 4 overloads the students.
const MIN_CLASSES_PER_SECTION_DAY = 2;
const MAX_CLASSES_PER_SECTION_DAY = 4;

// Formats a unit count without trailing zeroes: 21.0 -> "21", 3.5 -> "3.5".
function formatUnits($units)
{
    $formatted = number_format((float) $units, 1, ".", "");

    return rtrim(rtrim($formatted, "0"), ".");
}

// Returns the units of a subject, or 0 when the subject is unknown.
function subjectUnits(PDO $pdo, $subjectId)
{
    $stmt = $pdo->prepare("SELECT units FROM subjects WHERE subject_id = ?");
    $stmt->execute([$subjectId]);
    $units = $stmt->fetchColumn();

    return $units === false ? 0.0 : (float) $units;
}

// Checks a candidate schedule against the scheduling policy.
// $excludeScheduleId lets an update ignore the row that is being changed.
// Returns a list of human-readable violations; an empty list means the
// schedule may be saved.
function evaluateScheduleRules(PDO $pdo, array $candidate, $excludeScheduleId = 0)
{
    $violations = [];

    $day       = $candidate["day"];
    $teacherId = (int) $candidate["teacher_id"];
    $subjectId = (int) $candidate["subject_id"];
    $section   = array_key_exists("section", $candidate)
        ? trim((string) $candidate["section"])
        : "";

    // --- teacher: distinct subjects and total units for that day ---
    $stmt = $pdo->prepare(
        "SELECT c.subject_id, s.units
           FROM schedules c
           LEFT JOIN subjects s
             ON s.subject_id = c.subject_id
          WHERE c.teacher_id = ?
            AND c.day = ?
            AND c.schedule_id <> ?"
    );
    $stmt->execute([$teacherId, $day, (int) $excludeScheduleId]);

    $subjects = [];
    $units    = 0.0;

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $subjects[(int) $row["subject_id"]] = true;
        $units += (float) $row["units"];
    }

    $subjects[$subjectId] = true;
    $units += subjectUnits($pdo, $subjectId);

    if (count($subjects) > MAX_SUBJECTS_PER_TEACHER_DAY) {
        $violations[] = "The teacher would handle " . count($subjects)
            . " subjects on " . $day . " (limit: "
            . MAX_SUBJECTS_PER_TEACHER_DAY . ").";
    }

    if ($units > MAX_UNITS_PER_TEACHER_DAY) {
        $violations[] = "The teacher's " . $day . " load would reach "
            . formatUnits($units) . " units (maximum: "
            . MAX_UNITS_PER_TEACHER_DAY . ").";
    }

    // --- section: how many classes the course gets that day ---
    if ($section !== "") {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*)
               FROM schedules
              WHERE section = ?
                AND day = ?
                AND schedule_id <> ?"
        );
        $stmt->execute([$section, $day, (int) $excludeScheduleId]);

        $existing = (int) $stmt->fetchColumn();

        if ($existing + 1 > MAX_CLASSES_PER_SECTION_DAY) {
            $violations[] = "Section " . $section . " would have "
                . ($existing + 1) . " classes on " . $day
                . " (maximum: " . MAX_CLASSES_PER_SECTION_DAY . ").";
        }
    }

    return $violations;
}
<?php

require_once __DIR__ . "/../middleware/cors.php";
require_once __DIR__ . "/../helpers/response.php";
require_once __DIR__ . "/../controller/ScheduleController.php";

enableCors();
handlePreflight();
allowMethods(["GET"]);

try {
    // The scheduling policy lives in the controller so the API that enforces
    // it and the dashboard that reports it never drift apart.
    jsonSuccess([
        "max_subjects_per_teacher_day" => MAX_SUBJECTS_PER_TEACHER_DAY,
        "max_units_per_teacher_day"    => MAX_UNITS_PER_TEACHER_DAY,
        "min_units_per_teacher_day"    => MIN_UNITS_PER_TEACHER_DAY,
        "min_classes_per_section_day"  => MIN_CLASSES_PER_SECTION_DAY,
        "max_classes_per_section_day"  => MAX_CLASSES_PER_SECTION_DAY,
    ]);
} catch (Throwable $e) {
    jsonError("Unexpected server error.", 500);
}

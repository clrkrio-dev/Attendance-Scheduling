# Attendance & Scheduling System

A small school management dashboard for taking attendance, reviewing teacher and
student schedules, monitoring room availability, and detecting booking conflicts.

- **Frontend** — `frontend/` (single-page dashboard: `Index.php`, `css/style.css`, `js/script.js`)
- **Backend** — `backend/` (plain PHP JSON API, no framework)

## Requirements

- PHP 8.2+ with the `pdo_mysql` extension
- MariaDB / MySQL 10.4+
- Any web server (Apache, or PHP's built-in server)

## Setup

1. **Create the database** by importing the dump:

   ```bash
   mysql -u root -p < backend/database/attendance_schedulingdb.sql
   ```

   The dump creates the `attendance&schedulingdb` database, the schema, demo
   accounts, and a few starter records.

2. **(Optional) Seed demo data.** Run these once, in order, from the project
   root:

   ```bash
   php backend/database/seed_students.php    # 50+ students in every section
   php backend/database/seed_teachers.php    # extra teachers + schedule assignments
   php backend/database/seed_schedules.php   # one class per section, conflict-free
   php backend/database/seed_saturday.php    # a Saturday class for every section and teacher
   php backend/database/seed_alternating.php # the alternating block timetable (run last)
   ```

   Each script is idempotent, so re-running is safe. `seed_alternating.php`
   runs last because it rebuilds the whole timetable: it deals the sections
   an **alternating block pattern** — `MWF` (Mon, Wed, Fri) and `TTHS` (Tue,
   Thu, Sat) — and gives each section two classes on each of its meeting days.
   Sections on different patterns therefore never compete for a room or a
   teacher at the same time, and the timetable fits the scheduling policy
   exactly. Layout metadata for the room floor plan is applied with:

   ```bash
   mysql -u root -p "attendance&schedulingdb" < backend/database/seed_room_layout.sql
   ```

3. **Configure the database connection.** Defaults target a local XAMPP install
   (`localhost` / `root` / no password / `attendance&schedulingdb`). Override with
   environment variables when needed:

   | Variable  | Default                     |
   | --------- | --------------------------- |
   | `DB_HOST` | `localhost`                 |
   | `DB_NAME` | `attendance&schedulingdb`   |
   | `DB_USER` | `root`                      |
   | `DB_PASS` | *(empty)*                   |

4. **Serve the app** and open the dashboard:

   ```
   http://localhost/Attendance&Scheduling/frontend/Index.php
   ```

   The frontend resolves the API relative to its own URL, so it works under
   Apache, XAMPP, or `php -S`.

## Demo accounts

| Role    | Username    | Password      |
| ------- | ----------- | ------------- |
| Admin   | `admin`     | `admin1234`   |
| Teacher | `teacher01` | `teacher1234` |
| Student | `student01` | `student1234` |

Additional accounts created by `seed_students.php` follow `student0004`,
`student0005`, … and share the `student1234` password.

> Change these passwords before deploying. The dashboard shows the signed-in
> user in the top-right badge; when nobody is signed in it falls back to the
> default "Demo Admin" label.

## Conflicts

Conflicts come from two places, and the Conflict Review tab switches between
them:

| Source      | Where it lives                        | How it is handled |
| ----------- | ------------------------------------- | ----------------- |
| `automatic` | Recomputed from `schedules` on a scan | Acknowledge to hide it, keeping the record |
| `manual`    | The `manual_conflicts` table          | Resolve or delete when it is sorted out |

`conflicts.php` is the API for the manual reports (`GET`, `POST`, `PUT`,
`DELETE`). `conflicts.php?action=acknowledge` stores the automatic clashes
that have been reviewed, keyed by a stable signature (`type|schedule-ids`), so
an acknowledgement survives a re-scan.

## Subjects and year levels

Every subject belongs to a specific year level, stored in `subjects.year_level`
(`NULL` means the subject is not tied to a year and is offered in all of them).
The seed data follows the usual code convention — `ENG101` is a first-year
subject, `ENG102` a second-year one — and the column was backfilled from it:

```sql
UPDATE subjects
   SET year_level = CAST(SUBSTRING(subject_code, -3) AS UNSIGNED) % 100
 WHERE year_level IS NULL AND subject_code REGEXP '[0-9]{3}$';
```

The Attendance tab uses this to offer only the subjects of the selected year,
and picking a subject moves the year filter with it. `subject.php?year_level=2`
returns that year's subjects on its own.

## Scheduling policy

The API enforces these limits on every schedule that is created or updated, and
the dashboard reports the same rules:

| Rule                                    | Limit |
| --------------------------------------- | ----- |
| Subjects a teacher may teach per day    | 6     |
| Units a teacher may carry per day       | 12    |
| Units a teacher must carry per day      | 3     |
| Classes a course (section) gets per day | 2–4   |

A course is normally given 2 or 3 classes on a day and never more than 4. The
4-class maximum is **rejected on save**; a day with fewer than 2 classes is
only flagged, since the first class of a day can never satisfy a minimum on
its own.

Breaking a rule is rejected with HTTP `422` and a message naming the rule. The
limits live in `backend/controller/ScheduleController.php` and are published by
`backend/api/policy.php`, so the dashboard and the server always agree — change
the constants there and both sides follow.

> The alternating timetable produced by `seed_alternating.php` fits these
> rules exactly: every course has 2 classes on each of its 3 meeting days and
> every teacher carries 4 classes (12 units) a day. The earlier seeds do not —
> they hand every teacher 6–7 classes a day, so the dashboard reports those
> teachers as overloaded until the block timetable is built.

## API

All endpoints live under `backend/api/` and respond with
`{ "success": true, "data": ... }` or `{ "success": false, "message": ... }`.

| Endpoint            | Methods            | Notes                                        |
| ------------------- | ------------------ | -------------------------------------------- |
| `subject.php`       | GET, POST, PUT, DEL| Subject catalog; `?year_level=` narrows it |
| `student.php`       | GET, POST, PUT, DEL| Student records                              |
| `schedules.php`     | GET, POST, PUT, DEL| Class schedules (validates time + refs)      |
| `rooms.php`         | GET, POST, PUT, DEL| Rooms; `?building=&floor=` filters           |
| `attendance.php`    | GET, POST, PUT, DEL| Attendance records                           |
| `conflicts.php`     | GET, POST, PUT, DEL| Manually reported conflicts                  |
| `policy.php`        | GET                | The scheduling limits currently in force     |
| `auth.php`          | GET, POST          | `GET` = current user, `POST` = login, `POST ?action=logout` = logout |

CORS is enabled for cross-origin development; same-origin requests are unaffected.

`schedules.php` carries a `class_status` field per class: `scheduled` (the
default), `absent`, `unavailable` or `cancelled`. It is set with a `PUT` that
only sends that field, which skips the scheduling rules because it never moves
the class. The same field drives the teacher view and the student view, so the
two always agree about whether a class is running.

## Dashboard tabs

1. **Attendance Overview** — pick a subject/section, mark students, then **Save
   Attendance** or **Export CSV**.
2. **Teacher Schedule** — the whole day for one teacher, hour by hour. Pick a
   teacher and a day (the filter only offers the days that teacher actually
   works) and the timeline shows every hour of it: the classes they teach in
   place, and the free hours marked **Available**. Each class carries a
   control that records how the class is running: **Teaching**, **Unavailable**
   (the teacher cannot take it), **Absent** (the teacher did not show up) or
   **Cancelled** (the class does not run). A **Daily load** table underneath
   lists classes, subjects, units, free slots, any rule that is broken that day
   and how many classes were marked absent, unavailable or cancelled.
3. **Student Schedule** — weekly class grid per section. Each block states the
   time the class runs and the room it is in, and a class that is not running
   normally says so: **Teacher absent**, **Teacher unavailable** or **Class
   cancelled**. Sections follow an alternating block pattern, shown in the
   dropdown (`BSIT-1A (MWF)`) and in the panel heading. A **Weekly allocation**
   table lists, for every day of the week, the number of classes, the time
   allocated and the rooms allocated, and flags any day that falls outside the
   2–4 classes a course should get.
4. **Room Monitoring** — interactive floor plan; tiles update live as classes
   start and end. Click a tile for the day's room schedule.
5. **Conflict Review** — two sources of conflicts, switched with the
   **Automatic / Manual** control:
   - **Automatic** — clashes the system finds in the schedule (teacher, room
     and section overlaps). They are recomputed on every **Re-scan** and can be
     **acknowledged** once reviewed, which hides them without losing the
     record.
   - **Manual** — issues reported by staff that the schedule cannot detect
     (equipment faults, room requests, exam clashes). Use **Report Conflict**
     to add one; reported conflicts stay in the list until they are
     **resolved** or deleted.

   A summary card above the list reports the school-wide policy state
   (overloaded teachers, too many subjects a day, courses outside the daily
   class range).

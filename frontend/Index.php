<!doctype html>

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" type="text/css" href="css/style.css?v=20261020g" />
    <meta
      name="description"
      content="Take attendance, review teacher and student schedules, monitor rooms, and resolve booking conflicts."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.1/css/all.css"
    />
    <title>Attendance & Scheduling Dashboard</title>
  </head>
  <body>
    <div class="corner">
      <svg
        viewBox="0 0 520 300"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M -40 0
             C 70 85, 180 120, 330 155
             C 410 174, 475 190, 540 195
             L 540 330
             L -40 330 Z"
          fill="#0a2c56"
        />
        <path
          d="M -40 18
             C 75 105, 185 135, 330 169
             C 415 189, 480 202, 540 205"
          fill="none"
          stroke="#075eb4"
          stroke-width="34"
        />
        <path
          d="M -40 6
             C 75 92, 185 122, 330 157
             C 415 177, 480 190, 540 193"
          fill="none"
          stroke="#ffffff"
          stroke-width="10"
        />
        <path
          d="M -40 -2
             C 75 84, 185 114, 330 149
             C 415 169, 480 182, 540 185"
          fill="none"
          stroke="#c8102e"
          stroke-width="6"
        />
      </svg>
    </div>

    <div class="watermark">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="100"
          cy="100"
          r="96"
          fill="none"
          stroke="#0a2c56"
          stroke-width="3"
        />
        <circle
          cx="100"
          cy="100"
          r="82"
          fill="none"
          stroke="#0a2c56"
          stroke-width="1.5"
        />
        <g fill="#0a2c56">
          <path
            d="M100 34 L112 66 L148 66 L119 86 L130 120 L100 100 L70 120 L81 86 L52 66 L88 66 Z"
          />
        </g>
        <text
          x="100"
          y="150"
          text-anchor="middle"
          font-family="Segoe UI, Arial, sans-serif"
          font-size="15"
          font-weight="800"
          fill="#0a2c56"
          letter-spacing="2"
        >
          FULLBRIGHT
        </text>
        <text
          x="100"
          y="167"
          text-anchor="middle"
          font-family="Segoe UI, Arial, sans-serif"
          font-size="11"
          font-weight="600"
          fill="#0a2c56"
          letter-spacing="4"
        >
          EST. 1999
        </text>
      </svg>
    </div>

    <header class="top">
      <div class="stripes">
        <svg
          viewBox="0 0 520 160"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <!-- Blue outer stripe -->
          <path
            d="M 500,-35 C 470,20 435,65 385,100 C 340,132 295,151 230,170"
            fill="none"
            stroke="#075eb4"
            stroke-width="30"
            stroke-linecap="round"
          />

          <!-- White stripe -->
          <path
            d="M 520,-28
               C 490,25 455,70 405,105
               C 355,139 305,157 245,175"
            fill="none"
            stroke="#ffffff"
            stroke-width="11"
            stroke-linecap="round"
          />

          <path
            d="M 530,-18
               C 500,35 465,80 415,115
               C 365,148 315,165 260,180"
            fill="none"
            stroke="#c8102e"
            stroke-width="9"
            stroke-linecap="round"
          />
          <!-- Red stripe -->

          <!-- Dark blue outer edge -->
          <path
            d="M 510,-42
               C 480,10 445,55 395,90
               C 350,123 300,143 225,165"
            fill="none"
            stroke="#0a2c56"
            stroke-width="8"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <div class="brand">
        <div class="crest">
          <img src="assets/ECT logo.png" alt="ECT logo" />
        </div>
        <div class="brand-text">
          <h1>School Management System</h1>
          <p>Attendance & Scheduling Dashboard</p>
        </div>
      </div>
      <div class="top-right">
        <div class="user">
          <div class="avatar">AD</div>
          Demo Admin
        </div>
      </div>
    </header>

    <nav class="tabs" id="tabs" role="tablist" aria-label="Dashboard sections">
      <button
        id="tab-attendance"
        class="active"
        role="tab"
        aria-selected="true"
        aria-controls="panel-attendance"
        data-tab="attendance"
      >
        <i class="fa-solid fa-user-clock" aria-hidden="true"></i>
        Attendance Overview
      </button>
      <button
        id="tab-teacher"
        role="tab"
        aria-selected="false"
        aria-controls="panel-teacher"
        data-tab="teacher"
      >
        <i class="fa-solid fa-chalkboard-user" aria-hidden="true"></i>
        Teacher Schedule
      </button>
      <button
        id="tab-student"
        role="tab"
        aria-selected="false"
        aria-controls="panel-student"
        data-tab="student"
      >
        <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
        Student Schedule
      </button>
      <button
        id="tab-rooms"
        role="tab"
        aria-selected="false"
        aria-controls="panel-rooms"
        data-tab="rooms"
      >
        <i class="fa-solid fa-list-check" aria-hidden="true"></i>
        Room Monitoring
      </button>
      <button
        id="tab-conflicts"
        role="tab"
        aria-selected="false"
        aria-controls="panel-conflicts"
        data-tab="conflicts"
      >
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        Conflict Review
      </button>
    </nav>

    <noscript>
      <p style="max-width: 1180px; margin: 16px auto; padding: 0 28px">
        This dashboard needs JavaScript to load attendance and schedule data.
      </p>
    </noscript>

    <main>
      <section
        class="tab-panel active"
        id="panel-attendance"
        role="tabpanel"
        aria-labelledby="tab-attendance"
      >
        <div class="card">
          <div class="card-pad">
            <div class="panel-head">
              <div>
                <h2>Take Attendance</h2>
                <p id="roomValue">-</p>
              </div>
            </div>

            <div class="toolbar">
              <label class="sr-only" for="attendanceSubject">Subject</label>
              <select id="attendanceSubject" aria-label="Subject">
                <option value="">Select Subject</option>
              </select>
              <label class="sr-only" for="attendanceSection">Section</label>
              <select id="attendanceSection" aria-label="Filter by section"></select>
              <label class="sr-only" for="attendanceYear">Year level</label>
              <select id="attendanceYear" aria-label="Filter by year level"></select>
              <label class="sr-only" for="attendanceDate">Date</label>
              <input type="date" id="attendanceDate" aria-label="Attendance date" disabled title="Attendance is always taken for today" />
              <div class="toolbar-actions">
                <button class="btn btn-outline" id="exportAttendance" type="button">Export CSV</button>
                <button class="btn btn-primary" id="saveAttendance" type="button">Save Attendance</button>
              </div>
            </div>

            <div class="summary-row" aria-live="polite">
              <div class="summary-card present">
                <div class="num" id="presentValue">-</div>
                <div class="lbl">Present</div>
              </div>
              <div class="summary-card absent">
                <div class="num" id="absentValue">-</div>
                <div class="lbl">Absent</div>
              </div>
              <div class="summary-card late">
                <div class="num" id="lateValue">-</div>
                <div class="lbl">Late</div>
              </div>
              <div class="summary-card">
                <div class="num" id="totalStudentValue">-</div>
                <div class="lbl">Total Student</div>
              </div>
            </div>

            <div class="table-wrap">
              <table>
                <caption class="sr-only">
                  Students in the selected section with their attendance status
                </caption>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student Number</th>
                    <th>Status</th>
                    <th style="text-align: right">Mark</th>
                  </tr>
                </thead>
                <tbody id="attendance-rows"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section
        class="tab-panel"
        id="panel-teacher"
        role="tabpanel"
        aria-labelledby="tab-teacher"
      >
        <div class="card">
          <div class="card-pad">
            <div class="panel-head">
              <div>
                <h2>Teacher Schedule</h2>
                <p>The whole day, hour by hour</p>
                <p id="teacherValue">-</p>
              </div>
            </div>
            <div class="toolbar">
              <label class="sr-only" for="teacherDept">Department</label>
              <select id="teacherDept" aria-label="Filter by department">
                <option value="">All departments</option>
              </select>
              <label class="sr-only" for="teacherSelect">Teacher</label>
              <select id="teacherSelect" aria-label="Teacher">
                <option value="">Select teacher</option>
              </select>
              <label class="sr-only" for="teacherDay">Day</label>
              <select id="teacherDay" aria-label="Filter by day">
                <option value="">All days</option>
              </select>
            </div>
            <div class="teacher-legend">
              <span><i class="legend-dot available"></i>Available</span>
              <span><i class="legend-dot booked"></i>Busy</span>
              <span class="teacher-legend-note"
                >The whole day is shown; free hours are marked Available.</span
              >
            </div>
            <div class="teacher-day" id="teacher-day"></div>
            <div class="teacher-load">
              <div class="panel-head">
                <div>
                  <h3>Daily load</h3>
                  <p id="teacherLoadValue">Select a teacher to see their daily load.</p>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <caption class="sr-only">
                    Daily teaching load for the selected teacher
                  </caption>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Classes</th>
                      <th>Subjects</th>
                      <th>Units</th>
                      <th>Free slots</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody id="teacher-load-rows"></tbody>
                </table>
              </div>
              <p class="teacher-load-note" id="teacher-load-note"></p>
            </div>
          </div>
        </div>

        <div class="modal-backdrop" id="schedModal" hidden>
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="schedModalTitle">
            <h3 id="schedModalTitle">Add Schedule</h3>
            <p class="modal-sub">Assign a class to a teacher. Overlaps are flagged before saving.</p>
            <form id="schedForm">
              <div class="form-grid">
                <div class="form-field">
                  <label for="schedSubject">Subject</label>
                  <select id="schedSubject" required></select>
                </div>
                <div class="form-field">
                  <label for="schedTeacher">Teacher</label>
                  <select id="schedTeacher" required></select>
                </div>
                <div class="form-field">
                  <label for="schedDay">Day</label>
                  <select id="schedDay" required></select>
                </div>
                <div class="form-field">
                  <label for="schedSection">Section</label>
                  <input type="text" id="schedSection" list="schedSectionList" placeholder="e.g. BSIT-2A" />
                  <datalist id="schedSectionList"></datalist>
                </div>
                <div class="form-field">
                  <label for="schedStart">Start time</label>
                  <input type="time" id="schedStart" required />
                </div>
                <div class="form-field">
                  <label for="schedEnd">End time</label>
                  <input type="time" id="schedEnd" required />
                </div>
                <div class="form-field form-field-wide">
                  <label for="schedRoom">Room</label>
                  <input type="text" id="schedRoom" list="schedRoomList" placeholder="e.g. Lab 1" />
                  <datalist id="schedRoomList"></datalist>
                </div>
              </div>
              <p class="form-warning" id="schedWarning" hidden></p>
              <div class="modal-actions">
                <button type="button" class="btn btn-outline" id="schedCancel">Cancel</button>
                <button type="submit" class="btn btn-primary" id="schedSave">Save Schedule</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section
        class="tab-panel"
        id="panel-student"
        role="tabpanel"
        aria-labelledby="tab-student"
      >
        <div class="card">
          <div class="card-pad">
            <div class="panel-head">
              <div>
                <h2>Student Schedule</h2>
                <p>Class schedule by section</p>
                <p id="sectionValue">-</p>
              </div>
            </div>
            <div class="toolbar">
              <label class="sr-only" for="studentCourse">Department</label>
              <select id="studentCourse" aria-label="Filter by department">
                <option value="">All departments</option>
              </select>
              <label class="sr-only" for="studentYear">Year level</label>
              <select id="studentYear" aria-label="Filter by year level">
                <option value="">All years</option>
              </select>
              <label class="sr-only" for="sectionSelect">Section</label>
              <select id="sectionSelect" aria-label="Section">
                <option value="">Select section</option>
              </select>
              <label class="sr-only" for="sectionDay">Day</label>
              <select id="sectionDay" aria-label="Filter by day">
                <option value="">All days</option>
              </select>
            </div>
            <div class="sched-wrap">
              <div class="sched-grid" id="student-grid"></div>
            </div>
            <div class="student-alloc">
              <div class="panel-head">
                <div>
                  <h3>Weekly allocation</h3>
                  <p id="sectionAllocValue">
                    Select a section to see how its week is allocated.
                  </p>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <caption class="sr-only">
                    Day, class count, time and room allocated for the selected
                    section
                  </caption>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Classes</th>
                      <th>Time allocated</th>
                      <th>Rooms allocated</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody id="student-alloc-rows"></tbody>
                </table>
              </div>
              <p class="alloc-note" id="student-alloc-note"></p>
            </div>
          </div>
        </div>
      </section>

      <section
        class="tab-panel"
        id="panel-rooms"
        role="tabpanel"
        aria-labelledby="tab-rooms"
      >
        <div class="card">
          <div class="card-pad">
            <div class="panel-head">
              <div>
                <h2>Room Monitoring</h2>
                <p>Select a building and floor to monitor room availability</p>
              </div>
            </div>
            <div class="room-building-picker" role="group" aria-label="Choose a building">
              <span class="room-building-label">BUILDING</span>
              <div class="room-building-options" id="room-building-options"></div>
              <div class="spacer" aria-hidden="true"></div>
              <div class="room-floor-tabs room-floor-tabs-inline" role="tablist" aria-label="Building floors" id="room-floor-tabs"></div>
            </div>
            <div class="room-search-row">
              <label class="sr-only" for="roomSearch">Search rooms</label>
              <input type="text" id="roomSearch" placeholder="Search rooms…" autocomplete="off" />
            </div>
            <div class="room-map-status" id="room-map-status" aria-live="polite"></div>
            <div class="room-map-frame">
              <div class="room-floor-map" id="room-grid" role="tabpanel" aria-labelledby="room-floor-tab-1" aria-live="polite"></div>
            </div>
            <div class="room-map-legend" aria-label="Room status legend">
              <span><i class="legend-dot available"></i>Available</span>
              <span><i class="legend-dot occupied"></i>Occupied</span>
              <span><i class="legend-dot facility"></i>Facility</span>
              <span class="room-map-updated" id="room-map-updated"></span>
            </div>
          </div>
        </div>
      </section>

      <section
        class="tab-panel"
        id="panel-conflicts"
        role="tabpanel"
        aria-labelledby="tab-conflicts"
      >
        <div class="card">
          <div class="card-pad">
            <div class="panel-head">
              <div>
                <h2>Conflict Detection</h2>
                <p>Detect Conflict in teacher, rooms, and sections</p>
              </div>
            </div>
            <div class="toolbar">
              <div
                class="segmented"
                id="conflict-source"
                role="tablist"
                aria-label="Conflict source"
              >
                <button
                  class="seg active"
                  type="button"
                  role="tab"
                  aria-selected="true"
                  data-source="auto"
                >
                  Automatic
                </button>
                <button
                  class="seg"
                  type="button"
                  role="tab"
                  aria-selected="false"
                  data-source="manual"
                >
                  Manual
                </button>
              </div>
              <label class="sr-only" for="conflictFilter">Conflict type</label>
              <select id="conflictFilter" aria-label="Filter by conflict type">
                <option value="">All types</option>
              </select>
              <div class="spacer"></div>
              <button
                class="btn btn-outline"
                id="toggleAcknowledged"
                type="button"
                hidden
              >
                Show acknowledged
              </button>
              <button class="btn btn-outline" id="rescanConflicts" type="button">Re-scan Schedule</button>
              <button class="btn btn-primary" id="reportConflict" type="button">
                <i class="fa-solid fa-flag" aria-hidden="true"></i>
                Report Conflict
              </button>
            </div>
            <p class="conflict-source-hint" id="conflict-source-hint"></p>
            <div class="policy-summary" id="policy-summary" aria-live="polite"></div>
            <div class="conflict-list" id="conflict-list" aria-live="polite"></div>
          </div>
        </div>
      </section>
    </main>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>

    <div class="modal-backdrop" id="roomDialog" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="roomDialogTitle">
        <h3 id="roomDialogTitle">Room</h3>
        <p class="modal-sub" id="roomDialogSub"></p>
        <div class="room-day-list" id="roomDialogBody"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" id="roomDialogClose">Close</button>
        </div>
      </div>
    </div>

    <div class="modal-backdrop" id="conflictModal" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="conflictModalTitle">
        <h3 id="conflictModalTitle">Report a conflict</h3>
        <p class="modal-sub">
          Record an issue the schedule cannot detect on its own, such as an
          equipment fault, a room request or an exam clash.
        </p>
        <form id="conflictForm">
          <div class="form-grid">
            <div class="form-field">
              <label for="manualType">Type</label>
              <select id="manualType" required>
                <option value="Teacher">Teacher</option>
                <option value="Room">Room</option>
                <option value="Section">Section</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-field">
              <label for="manualDay">Day</label>
              <select id="manualDay">
                <option value="">Any day</option>
              </select>
            </div>
            <div class="form-field">
              <label for="manualSeverity">Severity</label>
              <select id="manualSeverity">
                <option value="warn">Warning</option>
                <option value="error">Critical</option>
              </select>
            </div>
            <div class="form-field">
              <label for="manualReporter">Reported by</label>
              <input type="text" id="manualReporter" placeholder="Your name" />
            </div>
            <div class="form-field form-field-wide">
              <label for="manualRef">Room / section / teacher</label>
              <input
                type="text"
                id="manualRef"
                list="manualRefList"
                placeholder="e.g. Lab 1 or BSIT-2A"
              />
              <datalist id="manualRefList"></datalist>
            </div>
            <div class="form-field form-field-wide">
              <label for="manualTitle">Title</label>
              <input
                type="text"
                id="manualTitle"
                required
                placeholder="Short summary of the problem"
              />
            </div>
            <div class="form-field form-field-wide">
              <label for="manualDesc">Description</label>
              <input
                type="text"
                id="manualDesc"
                placeholder="What has to be sorted out?"
              />
            </div>
          </div>
          <p class="form-warning" id="conflictFormWarning" hidden></p>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="conflictCancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="conflictSave">Report Conflict</button>
          </div>
        </form>
      </div>
    </div>

    <script src="js/script.js?v=20261020h"></script>
  </body>
</html>

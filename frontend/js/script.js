(() => {
  "use strict";

  const API = (() => {
    const src = document.currentScript && document.currentScript.src;
    if (src) {
      const m = src.match(/^https?:\/\/[^/]+(\/.*?)\/js\/script\.js/);
      if (m) {
        const parts = m[1].replace(/\/+$/, "").split("/");
        parts.pop();
        if (parts.length > 0) return parts.join("/") + "/backend/api";
      }
    }
    const base = window.location.pathname.replace(/\/+$/, "");
    const idx = base.toLowerCase().lastIndexOf("/frontend");
    if (idx !== -1) return base.slice(0, idx) + "/backend/api";
    return base.replace(/\/[^/]*$/, "") + "/backend/api";
  })();

  const $id = (id) => document.getElementById(id);

  let toastTimer = 0;
  const toast = (message, isError = false) => {
    const el = $id("toast");
    if (!el) {
      alert(message);
      return;
    }
    el.textContent = message;
    el.classList.toggle("error", !!isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  };

  const normalizeSelectValue = (value) =>
    value == null || value === "-" ? "" : String(value);

  const getSavedSelectValue = (id) => {
    try {
      const value = localStorage.getItem("select:" + id);
      return value == null ? "" : value;
    } catch (err) {
      return "";
    }
  };

  const saveSelectValue = (id, value) => {
    try {
      localStorage.setItem("select:" + id, normalizeSelectValue(value));
    } catch (err) {
      /* ignore private-mode or storage errors */
    }
  };

  const restoreSelectValue = (element) => {
    if (!element || !element.id) return;
    const saved = getSavedSelectValue(element.id);
    if (!saved) {
      element.selectedIndex = 0;
      return;
    }
    const option = Array.from(element.options).find((o) => o.value === saved);
    if (option) {
      element.value = saved;
    } else {
      element.selectedIndex = 0;
    }
  };

  const escapeHtml = (v) =>
    String(v == null ? "" : v).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const fmtTime = (t) => {
    if (!t) return "--:--";
    const m = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return escapeHtml(t);
    let h = Number(m[1]);
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + m[2] + " " + suffix;
  };

  const initialsOf = (name) => {
    if (!name) return "?";
    const words = String(name)
      .split(/[\s,]+/)
      .filter(Boolean);
    return (
      words
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("") || "?"
    );
  };

  const weekdayOf = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-US", { weekday: "long" });
  };

  const todayStr = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  };

  const setDateInputToToday = () => {
    const dateInput = $id("attendanceDate");
    if (!dateInput) return;
    const currentDate = todayStr();
    if (!dateInput.value || dateInput.value !== currentDate) {
      dateInput.value = currentDate;
    }
  };

  const STATUS_LABEL = {
    present: "Present",
    late: "Late",
    absent: "Absent",
    excused: "Excused",
  };
  const STATUS_CHIP = {
    present: "present",
    late: "late",
    absent: "absent",
    excused: "excused",
  };

  const STATUS_KEY = { present: "p", late: "l", absent: "a", excused: "e" };
  const STATUS_SHORT = { p: "present", l: "late", a: "absent", e: "excused" };

  // How a class is running. The teacher view and the student view read the
  // same state, so the two always agree.
  const CLASS_STATUSES = ["scheduled", "absent", "unavailable", "cancelled"];
  const CLASS_STATUS_LABEL = {
    scheduled: "Teaching",
    absent: "Absent",
    unavailable: "Unavailable",
    cancelled: "Cancelled",
  };
  // What a student is told about a class that is not running normally.
  const CLASS_STATUS_NOTE = {
    absent: "Teacher absent",
    unavailable: "Teacher unavailable",
    cancelled: "Class cancelled",
  };
  const classStatusOf = (s) => {
    const value = s && s.class_status ? s.class_status : "scheduled";
    return CLASS_STATUSES.indexOf(value) !== -1 ? value : "scheduled";
  };

  const DAY_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // One letter per day, so a set of meeting days can be shown as a short
  // pattern label: Mon, Wed, Fri -> "MWF", Tue, Thu, Sat -> "TTHS".
  const DAY_LETTER = {
    Monday: "M",
    Tuesday: "T",
    Wednesday: "W",
    Thursday: "TH",
    Friday: "F",
    Saturday: "S",
    Sunday: "S",
  };

  // Scheduling policy. The limits live in the API
  // (backend/controller/ScheduleController.php) and are loaded at start-up so
  // the dashboard and the server can never disagree; these are the fallbacks.
  let MAX_SUBJECTS_PER_DAY = 6;
  let MAX_UNITS_PER_DAY = 12;
  let MIN_UNITS_PER_DAY = 3;
  let MIN_CLASSES_PER_SECTION_DAY = 2;
  let MAX_CLASSES_PER_SECTION_DAY = 4;

  const statusKeyOf = (label) => {
    const k = String(label == null ? "" : label)
      .trim()
      .toLowerCase();
    if (STATUS_LABEL[k]) return k;
    if (STATUS_SHORT[k]) return STATUS_SHORT[k];
    return null;
  };

  // End of an hourly slot as "HH:MM:SS" so times compare as plain strings.
  const slotEnd = (slot) => {
    const parts = String(slot).split(":");
    const total = Number(parts[0]) * 60 + Number(parts[1]) + 60;
    const h = String(Math.floor(total / 60)).padStart(2, "0");
    const m = String(total % 60).padStart(2, "0");
    return h + ":" + m + ":00";
  };

  // True when a schedule overlaps the given hourly slot.
  const overlapsSlot = (slot, s) => {
    const from = slot + ":00";
    const to = slotEnd(slot);
    return String(s.start_time) < to && from < String(s.end_time);
  };

  // The hours of a day that the teacher timeline shows: the whole school
  // day, widened when a class falls outside it.
  const teacherDaySlots = (items) => {
    let start = 7;
    let end = 17;

    items.forEach((s) => {
      const from = Number(String(s.start_time).slice(0, 2));
      const to = Number(String(s.end_time).slice(0, 2));
      if (from < start) start = from;
      if (to > end) end = to;
    });

    const slots = [];
    for (let h = start; h < end; h++) {
      slots.push(String(h).padStart(2, "0") + ":00");
    }
    return slots;
  };

  // The days a teacher works, in week order.
  const teacherDays = (teacherId) => {
    const id = Number(teacherId);
    if (!id) return [];
    const days = new Set(
      schedules.filter((s) => Number(s.teacher_id) === id).map((s) => s.day),
    );
    return DAY_ORDER.filter((d) => days.has(d));
  };

  // Units of a subject, used for the daily teaching load.
  const unitsOfSubject = (subjectId) => {
    const sub = subjects.find((x) => String(x.subject_id) === String(subjectId));
    if (!sub || sub.units === null || sub.units === undefined) return 0;
    return Number(sub.units) || 0;
  };

  // Formats a unit count without trailing zeroes: 21 -> "21", 3.5 -> "3.5".
  const unitsLabel = (units) => {
    const n = Number(units) || 0;
    return String(Math.round(n * 10) / 10);
  };

  // The days a section meets, in week order.
  const meetingDaysOf = (section) => {
    if (!section) return [];
    const days = new Set(
      schedules.filter((s) => s.section === section).map((s) => s.day),
    );
    return DAY_ORDER.filter((d) => days.has(d));
  };

  // The short pattern label of a section, e.g. "MWF" or "TTHS".
  const patternLabelOf = (section) =>
    meetingDaysOf(section)
      .map((d) => DAY_LETTER[d] || "")
      .join("");

  // The days a section meets, written out, e.g. "Mon, Wed, Fri".
  const meetingDaysLabelOf = (section) =>
    meetingDaysOf(section)
      .map((d) => d.slice(0, 3))
      .join(", ");

  // Length of a class in minutes, from its start and end time.
  const minutesBetween = (start, end) => {
    const toMinutes = (t) => {
      const m = String(t).match(/^(\d{1,2}):(\d{2})/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
    };
    return Math.max(0, toMinutes(end) - toMinutes(start));
  };

  /* --------------------------- API calls ---------------------------------- */
  async function getJSON(endpoint) {
    const res = await fetch(API + "/" + endpoint, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      /* fall through */
    }
    if (!res.ok || !payload || payload.success !== true) {
      throw new Error(
        (payload && payload.message) ||
          "Request failed (HTTP " + res.status + ")",
      );
    }
    return payload.data;
  }

  async function sendJSON(endpoint, method, body) {
    const res = await fetch(API + "/" + endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      /* fall through */
    }
    if (!res.ok || !payload || payload.success !== true) {
      throw new Error(
        (payload && payload.message) ||
          "Request failed (HTTP " + res.status + ")",
      );
    }
    return payload.data;
  }

  /* --------------------------- global state ------------------------------- */
  let subjects = [];
  let students = [];
  let schedules = [];
  let attendance = [];
  let currentRoster = [];
  let attendanceChanges = new Map();
  let conflictsCache = [];
  // Manually reported conflicts and the automatic clashes staff have reviewed
  // and accepted.
  let manualConflicts = [];
  let acknowledgements = new Set();
  let conflictSource = "auto";
  let showAcknowledged = false;

  /* ------------------------- derived collections -------------------------- */
  const uniqueTeachers = () => {
    const map = new Map();
    schedules.forEach((s) => {
      if (s.teacher_id == null) return;
      if (!map.has(s.teacher_id)) {
        map.set(s.teacher_id, {
          teacher_id: s.teacher_id,
          teacher_name: s.teacher_name || "Teacher " + s.teacher_id,
          employee_number: s.employee_number || "",
          department: s.department || "",
        });
      }
    });
    return Array.from(map.values());
  };

  // Every section with enrolled students (same list as the attendance tab),
  // not just sections that already have schedules.
  const uniqueSections = () =>
    Array.from(
      new Set(students.map((st) => st.section).filter(Boolean)),
    ).sort();

  const uniqueDays = () =>
    DAY_ORDER.filter((d) => schedules.some((s) => s.day === d));

  /* -------------------- generic weekly schedule grid ---------------------- */
  const hourSlots = (list) => {
    const set = Array.from(
      new Set(
        list
          .map((s) => {
            const m = String(s.start_time).match(/^(\d{1,2}):(\d{2})/);
            return m ? m[1] + ":" + m[2] : null;
          })
          .filter(Boolean),
      ),
    ).sort();
    return set.length ? set : ["08:00"];
  };

  const blockHtml = (s, idx, isConflict, showTime) => {
    // The student grid states the time each class runs; the teacher grid
    // keeps the section on the line instead.
    const meta = [];
    if (showTime) {
      meta.push(fmtTime(s.start_time) + " – " + fmtTime(s.end_time));
    }
    meta.push(s.room || "TBA");
    if (s.section && !showTime) meta.push(s.section);

    // A class that is not running normally says so, so a student sees the
    // same thing the teacher sees.
    const status = classStatusOf(s);
    const note = CLASS_STATUS_NOTE[status];
    const badge = note
      ? '<span class="chip class-status ' +
        status +
        '"><span class="chip-dot"></span>' +
        note +
        "</span>"
      : "";

    return (
      '<div class="block b' +
      (idx % 4 || 4) +
      (isConflict ? " conflict" : "") +
      (status !== "scheduled" ? " is-" + status : "") +
      '">' +
      '<span class="t">' +
      escapeHtml(s.subject_name || "Subject") +
      "</span>" +
      '<span class="s">' +
      escapeHtml(meta.join(" · ")) +
      "</span>" +
      badge +
      "</div>"
    );
  };

  function renderWeekGrid(container, list, forcedDays = null, options = {}) {
    const showTime = !!options.showTime;
    const days =
      forcedDays ||
      (list.length
        ? DAY_ORDER.filter((d) => list.some((s) => s.day === d))
        : DAY_ORDER.slice(0, 5));
    const slots = hourSlots(list);

    container.style.gridTemplateColumns =
      "78px repeat(" + days.length + ", 1fr)";

    let html = '<div class="cell head"></div>';
    days.forEach((d) => {
      html += '<div class="cell head">' + d + "</div>";
    });

    slots.forEach((slot) => {
      html += '<div class="cell time">' + fmtTime(slot + ":00") + "</div>";
      days.forEach((day) => {
        const items = list.filter(
          (s) => s.day === day && String(s.start_time).indexOf(slot) === 0,
        );
        if (!items.length) {
          html +=
            '<div class="cell" style="display:flex;align-items:center;justify-content:center;color:#7b8ea8;font-size:12px;font-style:italic;letter-spacing:0.02em;">No schedule</div>';
          return;
        }
        html +=
          '<div class="cell">' +
          items
            .map((s, i) => blockHtml(s, i + 1, items.length > 1, showTime))
            .join("") +
          "</div>";
      });
    });

    container.innerHTML = html;
  }

  const fillDayFilter = (sel) => {
    if (!sel) return;
    sel.innerHTML = '<option value="">All days</option>';
    uniqueDays().forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      sel.appendChild(o);
    });
    restoreSelectValue(sel);
  };

  /* --------------------------- attendance tab ----------------------------- */
  // IDs from the API may arrive as numbers or strings depending on the PDO
  // fetch mode, while select values are always strings, so compare loosely.
  const schedulesForSubject = (subjectId, weekday) =>
    schedules.filter(
      (s) =>
        Number(s.subject_id) === Number(subjectId) &&
        (!weekday || s.day === weekday),
    );

  const attendanceRecordFor = (studentId, scheduleIds, dateStr) => {
    if (!scheduleIds.length || !dateStr) return null;
    const wantedStudent = String(studentId);
    const wantedSchedules = new Set(scheduleIds.map(String));
    let found = null;
    attendance.forEach((a) => {
      if (
        String(a.student_id) === wantedStudent &&
        a.attendance_date === dateStr &&
        wantedSchedules.has(String(a.schedule_id))
      ) {
        found = a;
      }
    });
    return found;
  };

  const scheduleForStudent = (subjectId, day, student) => {
    let list = schedules.filter(
      (s) => Number(s.subject_id) === Number(subjectId) && s.day === day,
    );
    if (!list.length) return null;
    if (student && student.section) {
      const bySection = list.filter((s) => s.section === student.section);
      if (bySection.length) return bySection[0];
    }
    return list[0];
  };

  // Year level of the first student found in a section (sections here
  // belong to exactly one year level).
  const sectionYearOf = (sec) => {
    const st = students.find((x) => x.section === sec);
    return st ? String(st.year_level) : "";
  };

  // Course (department) of the first student found in a section, plus a
  // short label derived from the section code (e.g. "BSIT-1A" -> "BSIT").
  const sectionCourseOf = (sec) => {
    const st = students.find((x) => x.section === sec);
    return st && st.course ? String(st.course) : "";
  };
  const courseLabelOf = (course) => {
    const st = students.find(
      (x) => String(x.course) === String(course) && x.section,
    );
    const pre = st ? String(st.section).split("-")[0] : "";
    return pre || String(course);
  };

  function renderAttendanceTab() {
    attendanceChanges.clear();
    updateSaveButton();

    const subjectSel = $id("attendanceSubject");
    const dateInput = $id("attendanceDate");
    const roomValue = $id("roomValue");
    const saveBtn = $id("saveAttendance");
    const subjectSelected = Number(subjectSel.value) > 0;

    if (saveBtn) {
      saveBtn.disabled = !subjectSelected;
      saveBtn.title = subjectSelected
        ? "Save attendance"
        : "Select a subject first";
    }

    // Decide the picked subject from state (the option list is rebuilt
    // below): the live value wins, then the saved value. Stale ids from
    // deleted subjects are dropped.
    const previousSubject = subjectSel.value;
    const savedSubject = getSavedSelectValue("attendanceSubject");
    const subjectIdExists = (id) =>
      Number(id) > 0 &&
      subjects.some((s) => String(s.subject_id) === String(id));
    const wantSubjectId = subjectIdExists(previousSubject)
      ? String(previousSubject)
      : subjectIdExists(savedSubject)
        ? String(savedSubject)
        : "";

    const allSections = Array.from(
      new Set(students.map((st) => st.section).filter(Boolean)),
    ).sort();
    const allYears = Array.from(
      new Set(
        students
          .map((st) => st.year_level)
          .filter((y) => y !== null && y !== undefined && y !== ""),
      ),
    )
      .map(String)
      .sort();

    // Subjects are year-locked through their scheduled sections, so the
    // list only shows the picked year's subjects. Unscheduled subjects
    // stay visible everywhere so they can never be stranded.
    const preSubjectSections = wantSubjectId
      ? schedulesForSubject(Number(wantSubjectId))
          .map((s) => s.section)
          .filter(Boolean)
      : [];
    const preDefaultSection =
      allSections.indexOf(preSubjectSections[0]) !== -1
        ? preSubjectSections[0]
        : allSections[0] || "";
    const savedYearEarly = getSavedSelectValue("attendanceYear");
    const wantYear =
      allYears.indexOf(savedYearEarly) !== -1
        ? savedYearEarly
        : sectionYearOf(preDefaultSection) || allYears[0] || "";

    const subjectScopeMap = new Map();
    schedules.forEach((s) => {
      if (!s.section) return;
      const scope = sectionCourseOf(s.section) + "|" + sectionYearOf(s.section);
      if (scope === "|") return;
      const k = String(s.subject_id);
      if (!subjectScopeMap.has(k)) subjectScopeMap.set(k, new Set());
      subjectScopeMap.get(k).add(scope);
    });
    // A subject that names a year level belongs to that year only. A subject
    // that is not scheduled anywhere stays visible so it can never be
    // stranded.
    const subjectVisibleInScope = (sub) => {
      const subjectYear =
        sub.year_level === null || sub.year_level === undefined
          ? ""
          : String(sub.year_level);

      if (subjectYear && wantYear && subjectYear !== String(wantYear)) {
        return false;
      }

      if (!wantYear) return true;
      const scopes = subjectScopeMap.get(String(sub.subject_id));
      if (!scopes) return true;
      for (const scope of scopes) {
        const sep = scope.indexOf("|");
        const y = scope.slice(sep + 1);
        if (y === wantYear) {
          return true;
        }
      }
      return false;
    };

    subjectSel.innerHTML = '<option value="">Select Subject</option>';
    subjects.forEach((sub) => {
      if (!subjectVisibleInScope(sub)) return;
      const o = document.createElement("option");
      o.value = String(sub.subject_id);
      o.textContent =
        sub.subject_code +
        " - " +
        sub.subject_name +
        (sub.year_level ? " (Year " + sub.year_level + ")" : "");
      subjectSel.appendChild(o);
    });
    subjectSel.value =
      wantSubjectId &&
      Array.from(subjectSel.options).some((o) => o.value === wantSubjectId)
        ? wantSubjectId
        : "";
    // Persist resets (e.g. subject filtered out by a year change) so the
    // next restore stays consistent with what is on screen.
    saveSelectValue("attendanceSubject", subjectSel.value);

    if (!dateInput.value) setDateInputToToday();

    const subjectId = Number(subjectSel.value);
    const day = weekdayOf(dateInput.value);
    const daySchedules = subjectId ? schedulesForSubject(subjectId, day) : [];

    // Saving is impossible when the subject has no class on the picked date,
    // so disable Save up front instead of failing at click time.
    if (saveBtn && subjectSelected && !daySchedules.length) {
      saveBtn.disabled = true;
      saveBtn.title = "No class scheduled for " + (day || "this date");
    }

    // The section/year dropdowns always refresh, even with no subject
    // picked. The roster below still clears out until one is chosen.
    // The roster always targets one specific section and year. It defaults
    // to the section taking this subject (and that section's year); the
    // dropdowns change it from there.
    const subjectSections = subjectId
      ? schedulesForSubject(subjectId)
          .map((s) => s.section)
          .filter(Boolean)
      : [];

    const sectionSel = $id("attendanceSection");
    const yearSel = $id("attendanceYear");

    // allSections, allYears and wantYear were computed above (the subject
    // list already follows them); only build the dropdowns.
    yearSel.innerHTML = "";
    allYears.forEach((y) => {
      const o = document.createElement("option");
      o.value = y;
      o.textContent = "Year " + y;
      yearSel.appendChild(o);
    });
    yearSel.value = wantYear;

    let yearSections = allSections.filter(
      (sec) => sectionYearOf(sec) === wantYear,
    );
    if (!yearSections.length) yearSections = allSections;
    sectionSel.innerHTML = "";
    yearSections.forEach((sec) => {
      const o = document.createElement("option");
      o.value = sec;
      o.textContent = sec;
      sectionSel.appendChild(o);
    });
    const savedSection = getSavedSelectValue("attendanceSection");
    let pickedSection = null;
    try {
      pickedSection = localStorage.getItem("select:attendanceSection");
    } catch (err) {
      pickedSection = savedSection;
    }
    let wantSection = yearSections[0] || "";
    if (pickedSection === null) {
      if (yearSections.indexOf(subjectSections[0]) !== -1) {
        wantSection = subjectSections[0];
      }
    } else if (yearSections.indexOf(pickedSection) !== -1) {
      wantSection = pickedSection;
    }
    sectionSel.value = wantSection;

    if (!subjects.length) {
      roomValue.textContent = "No subjects loaded.";
      const tbody = $id("attendance-rows");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:#5d7395;">No subjects are available yet.</td></tr>';
      }
      currentRoster = [];
      updateSummary();
      return;
    }

    if (!subjectId) {
      roomValue.textContent = "Select a subject to begin.";
      const tbody = $id("attendance-rows");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:#5d7395;">Select a subject first to mark attendance.</td></tr>';
      }
      currentRoster = [];
      updateSummary();
      return;
    }

    if (!daySchedules.length) {
      roomValue.textContent =
        "No class scheduled for " + (day || "this date") + ".";
    } else {
      const s0 = daySchedules[0];
      const bits = [
        "Room: " + (s0.room || "TBA"),
        s0.section ? "Section: " + s0.section : null,
        s0.day +
          " " +
          fmtTime(s0.start_time) +
          " - " +
          fmtTime(s0.end_time) +
          " · " +
          (s0.teacher_name || ""),
      ];
      roomValue.textContent = bits.filter(Boolean).join("   ·   ");
    }

    const scheduleIds = schedulesForSubject(subjectId, day).map(
      (s) => s.schedule_id,
    );

    const selSection = sectionSel.value;
    const selYear = yearSel.value;
    const scopedStudents = students.filter(
      (st) =>
        (!selSection || st.section === selSection) &&
        (!selYear || String(st.year_level) === selYear),
    );

    currentRoster = scopedStudents.map((st) => {
      const rec = attendanceRecordFor(
        st.student_id,
        scheduleIds,
        dateInput.value,
      );
      return {
        student_id: st.student_id,
        full_name: st.full_name || st.username || "Student " + st.student_id,
        student_number: st.student_number || "",
        course: st.course,
        section: st.section,
        year_level: st.year_level,
        statusKey: rec ? statusKeyOf(rec.status) : null,
        attendance_id: rec ? rec.attendance_id : null,
      };
    });

    const tbody = $id("attendance-rows");
    if (!currentRoster.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:#5d7395;">No students were found in the records.</td></tr>';
      updateSummary();
      return;
    }

    const makeBtn = (key) => {
      const short = STATUS_KEY[key];
      return (
        '<button class="status-btn ' +
        short +
        '" data-key="' +
        key +
        '" title="' +
        STATUS_LABEL[key] +
        '">' +
        short.toUpperCase() +
        "</button>"
      );
    };

    tbody.innerHTML = currentRoster
      .map((r) => {
        let chip;
        if (r.statusKey) {
          chip =
            '<span class="chip ' +
            STATUS_CHIP[r.statusKey] +
            '"><span class="chip-dot"></span>' +
            STATUS_LABEL[r.statusKey] +
            "</span>";
        } else {
          chip =
            '<span class="chip" style="background:#eef1f6;color:#8a97ad;"><span class="chip-dot"></span>Unmarked</span>';
        }
        const buttons =
          makeBtn("present") +
          makeBtn("late") +
          makeBtn("absent") +
          makeBtn("excused");

        return (
          '<tr data-student-id="' +
          r.student_id +
          '">' +
          '<td><div class="student"><div class="av">' +
          initialsOf(r.full_name) +
          "</div>" +
          '<div><div class="name">' +
          escapeHtml(r.full_name) +
          "</div>" +
          '<div class="id">' +
          escapeHtml(r.course || "") +
          (r.section ? " · " + escapeHtml(r.section) : "") +
          (r.year_level !== null &&
          r.year_level !== undefined &&
          r.year_level !== ""
            ? " · Year " + escapeHtml(r.year_level)
            : "") +
          "</div></div></div></td>" +
          '<td class="id">' +
          escapeHtml(r.student_number) +
          "</td>" +
          "<td>" +
          chip +
          "</td>" +
          '<td><div class="status-select" style="justify-content:flex-end;">' +
          buttons +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");

    Array.from(tbody.querySelectorAll("tr")).forEach((tr) => {
      const r = currentRoster.find(
        (x) => String(x.student_id) === tr.dataset.studentId,
      );
      if (r && r.statusKey && STATUS_KEY[r.statusKey]) {
        const active = tr.querySelector(
          "button.status-btn." + STATUS_KEY[r.statusKey],
        );
        if (active) active.classList.add("on");
      }
    });

    updateSummary();
  }

  function updateSummary() {
    const counts = { present: 0, late: 0, absent: 0, excused: 0 };
    currentRoster.forEach((r) => {
      if (r.statusKey) counts[r.statusKey]++;
    });
    $id("presentValue").textContent = counts.present;
    $id("absentValue").textContent = counts.absent;
    $id("lateValue").textContent = counts.late;
    $id("totalStudentValue").textContent = currentRoster.length;
  }

  function onAttendanceRowClick(e) {
    const btn = e.target.closest(".status-btn");
    if (!btn) return;
    if (!Number($id("attendanceSubject").value)) {
      toast("Select a subject first.", true);
      return;
    }

    const tr = btn.closest("tr");
    const studentId = tr.dataset.studentId;
    const key = btn.dataset.key;

    tr.querySelectorAll(".status-btn").forEach((b) =>
      b.classList.toggle("on", b === btn),
    );

    const row = currentRoster.find(
      (r) => String(r.student_id) === String(studentId),
    );
    if (!row) return;
    row.statusKey = key;
    attendanceChanges.set(String(row.student_id), key);

    const chip = tr.querySelector(".chip");
    // Drop the "Unmarked" inline colors so the status class paints the chip.
    chip.removeAttribute("style");
    chip.className = "chip " + STATUS_CHIP[key];
    chip.innerHTML = '<span class="chip-dot"></span>' + STATUS_LABEL[key];

    updateSummary();
    updateSaveButton();
  }

  async function saveAttendance() {
    const subjectId = Number($id("attendanceSubject").value);
    const date = $id("attendanceDate").value;
    const saveBtn = $id("saveAttendance");
    if (!subjectId) {
      toast("Select a subject first.", true);
      return;
    }
    if (!date) {
      toast("Choose a date first.", true);
      return;
    }

    const day = weekdayOf(date);
    if (!day) {
      toast("Choose a valid date first.", true);
      return;
    }
    if (!schedulesForSubject(subjectId, day).length) {
      toast(
        "No class scheduled for " + day + " - pick a date with a class.",
        true,
      );
      return;
    }

    const jobs = [];
    let changed = 0;

    currentRoster.forEach((r) => {
      const key = attendanceChanges.has(String(r.student_id))
        ? attendanceChanges.get(String(r.student_id))
        : r.statusKey;
      if (!key) return;

      const sched = scheduleForStudent(subjectId, day, r);
      if (!sched) return;

      const label = STATUS_LABEL[key];
      if (r.attendance_id) {
        jobs.push(
          sendJSON("attendance.php?id=" + r.attendance_id, "PUT", {
            status: label,
          }),
        );
      } else {
        jobs.push(
          sendJSON("attendance.php", "POST", {
            student_id: r.student_id,
            schedule_id: sched.schedule_id,
            attendance_date: date,
            status: label,
          }),
        );
      }
      changed++;
    });

    if (!jobs.length) {
      toast("Nothing to save - mark at least one student first.", true);
      return;
    }

    const originalLabel = saveBtn ? saveBtn.textContent : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
    }
    try {
      await Promise.all(jobs);
      attendanceChanges.clear();
      await loadData();
      renderAttendanceTab();
      toast(
        "Saved attendance for " + changed + " student(s). (Date: " + date + ")",
      );
    } catch (err) {
      toast("Save failed: " + err.message, true);
    } finally {
      if (saveBtn) {
        saveBtn.textContent = originalLabel;
        renderAttendanceTabSaveState();
      }
    }
  }

  function renderAttendanceTabSaveState() {
    const saveBtn = $id("saveAttendance");
    if (!saveBtn) return;
    const subjectId = Number($id("attendanceSubject").value);
    const day = weekdayOf($id("attendanceDate").value);
    const canSave =
      subjectId > 0 && schedulesForSubject(subjectId, day).length > 0;
    saveBtn.disabled = !canSave;
    saveBtn.title = !canSave
      ? !subjectId
        ? "Select a subject first"
        : "No class scheduled for " + (day || "this date")
      : "Save attendance";
  }

  // Reflect pending, unsaved marks on the Save button.
  function updateSaveButton() {
    const saveBtn = $id("saveAttendance");
    if (!saveBtn) return;
    const pending = attendanceChanges.size;
    saveBtn.textContent = pending
      ? "Save Attendance (" + pending + ")"
      : "Save Attendance";
  }

  function exportAttendanceCsv() {
    if (!currentRoster.length) {
      toast("Nothing to export - the roster is empty.", true);
      return;
    }
    const subjectSel = $id("attendanceSubject");
    const subjectText =
      subjectSel.options[subjectSel.selectedIndex].textContent || "Subject";
    const date = $id("attendanceDate").value || todayStr();
    const rows = [["Subject", "Date", "Student", "Student Number", "Status"]];
    currentRoster.forEach((r) => {
      rows.push([
        subjectText,
        date,
        r.full_name,
        r.student_number,
        r.statusKey ? STATUS_LABEL[r.statusKey] : "Unmarked",
      ]);
    });
    const csv = rows
      .map((cols) =>
        cols.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","),
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance-" + date + "-" + Date.now().toString(36) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Exported " + currentRoster.length + " row(s) to CSV.");
  }

  /* --------------------------- teacher tab -------------------------------- */
  // One class of the day, shown as it sits on the teacher's timeline, with the
  // control that records whether the teacher is there for it.
  const teacherDayClassHtml = (s, idx, isConflict) => {
    const meta = [
      fmtTime(s.start_time) + " – " + fmtTime(s.end_time),
      s.room || "TBA",
    ];
    if (s.section) meta.push(s.section);

    const status = classStatusOf(s);
    const option = (value) =>
      '<option value="' +
      value +
      '"' +
      (status === value ? " selected" : "") +
      ">" +
      CLASS_STATUS_LABEL[value] +
      "</option>";

    return (
      '<div class="block b' +
      (idx % 4 || 4) +
      (isConflict ? " conflict" : "") +
      (status !== "scheduled" ? " is-" + status : "") +
      '">' +
      '<span class="t">' +
      escapeHtml(s.subject_name || "Subject") +
      "</span>" +
      '<span class="s">' +
      escapeHtml(meta.join(" · ")) +
      "</span>" +
      '<select class="teacher-status" data-schedule="' +
      s.schedule_id +
      '" aria-label="Status of this class">' +
      option("scheduled") +
      option("absent") +
      option("unavailable") +
      option("cancelled") +
      "</select>" +
      "</div>"
    );
  };

  // Records how a class is running: whether the teacher is there for it,
  // whether it is unavailable, or whether it is cancelled.
  async function setClassStatus(scheduleId, status, control) {
    if (!scheduleId) return;
    control.disabled = true;

    try {
      await sendJSON("schedules.php?id=" + scheduleId, "PUT", {
        class_status: status,
      });

      const item = schedules.find(
        (x) => Number(x.schedule_id) === Number(scheduleId),
      );
      if (item) item.class_status = status;

      renderTeacherTab();

      toast(
        status === "scheduled"
          ? "Class set back to scheduled."
          : "Class marked as " +
            CLASS_STATUS_LABEL[status].toLowerCase() +
            ".",
      );
    } catch (err) {
      toast("Could not update the class: " + err.message, true);
      control.disabled = false;
    }
  }

  // The whole day for the selected teacher: every hour of it, with the
  // classes they teach in place and the free slots marked as available.
  function renderTeacherDay(items, day) {
    const box = $id("teacher-day");
    if (!box) return;

    if (!day) {
      box.innerHTML =
        '<div class="room-map-empty">Select a teacher to see their day.</div>';
      return;
    }

    const slots = teacherDaySlots(items);

    box.innerHTML = slots
      .map((slot) => {
        const starts = items.filter(
          (s) => String(s.start_time).indexOf(slot) === 0,
        );
        const busy = items.some((s) => overlapsSlot(slot, s));

        let body;
        if (starts.length) {
          body =
            '<div class="teacher-day-body">' +
            starts
              .map((s, i) => teacherDayClassHtml(s, i + 1, starts.length > 1))
              .join("") +
            "</div>";
        } else if (busy) {
          body =
            '<div class="teacher-day-body is-free">' +
            '<span class="slot-tag busy">Busy</span></div>';
        } else {
          body =
            '<div class="teacher-day-body is-free">' +
            '<span class="slot-tag free">Available</span></div>';
        }

        return (
          '<div class="teacher-day-row">' +
          '<div class="teacher-day-time">' +
          fmtTime(slot + ":00") +
          "</div>" +
          body +
          "</div>"
        );
      })
      .join("");
  }

  function renderTeacherTab() {
    const teacherId = Number($id("teacherSelect").value);
    const day = $id("teacherDay").value;
    const list = schedules.filter(
      (s) => Number(s.teacher_id) === teacherId && (!day || s.day === day),
    );
    const teacher = uniqueTeachers().find(
      (t) => Number(t.teacher_id) === teacherId,
    );

    const units = list.reduce(
      (sum, s) => sum + unitsOfSubject(s.subject_id),
      0,
    );

    $id("teacherValue").textContent = teacher
      ? teacher.teacher_name +
        (teacher.employee_number ? " (" + teacher.employee_number + ")" : "") +
        (teacher.department ? " · " + teacher.department : "") +
        (day
          ? " · " +
            day +
            " · " +
            list.length +
            " class(es), " +
            unitsLabel(units) +
            " units"
          : " · No day selected")
      : "Select a teacher.";

    renderTeacherDay(list, day);
    renderTeacherLoad();
  }

  // The day filter only offers the days the selected teacher actually works.
  function fillTeacherDayFilter() {
    const sel = $id("teacherDay");
    if (!sel) return;

    const days = teacherDays(Number($id("teacherSelect").value));

    sel.innerHTML = "";
    if (!days.length) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "No teaching days";
      sel.appendChild(o);
      return;
    }

    days.forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      sel.appendChild(o);
    });

    const saved = getSavedSelectValue("teacherDay");
    sel.value = days.indexOf(saved) !== -1 ? saved : days[0];
    saveSelectValue("teacherDay", sel.value);
  }

  // Daily teaching load for the selected teacher: how many classes and
  // subjects they teach, the units those add up to, how many slots are still
  // free, and every scheduling rule that is broken that day.
  function renderTeacherLoad() {
    const tbody = $id("teacher-load-rows");
    if (!tbody) return;

    const value = $id("teacherLoadValue");
    const note = $id("teacher-load-note");
    const teacherId = Number($id("teacherSelect").value);

    if (!teacherId) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-cell">Select a teacher to see their daily load.</td></tr>';
      if (value) {
        value.textContent = "Select a teacher to see their daily load.";
      }
      if (note) note.textContent = "";
      return;
    }

    const teacher = uniqueTeachers().find(
      (t) => Number(t.teacher_id) === teacherId,
    );
    const mine = schedules.filter(
      (s) => Number(s.teacher_id) === teacherId,
    );

    const rows = [];
    const clashes = [];

    DAY_ORDER.forEach((day) => {
      const items = mine.filter((s) => s.day === day);
      const subjectCount = new Set(
        items.map((s) => String(s.subject_id)),
      ).size;
      const units = items.reduce(
        (sum, s) => sum + unitsOfSubject(s.subject_id),
        0,
      );
      const daySlots = teacherDaySlots(items);
      const free = daySlots.filter(
        (slot) => !items.some((s) => overlapsSlot(slot, s)),
      ).length;

      // Sections the teacher is asked to teach more than once that day.
      const perSection = new Map();
      items.forEach((s) => {
        if (!s.section) return;
        perSection.set(s.section, (perSection.get(s.section) || 0) + 1);
      });
      const doubleBooked = Array.from(perSection.entries())
        .filter(([, count]) => count > MAX_CLASSES_PER_SECTION_DAY)
        .map(([section]) => section);

      const flags = [];
      if (units > MAX_UNITS_PER_DAY) {
        flags.push('<span class="load-flag over">Overloaded</span>');
      } else if (items.length && units < MIN_UNITS_PER_DAY) {
        flags.push('<span class="load-flag under">Underloaded</span>');
      }
      if (subjectCount > MAX_SUBJECTS_PER_DAY) {
        flags.push(
          '<span class="load-flag over">Max ' +
            MAX_SUBJECTS_PER_DAY +
            " subjects</span>",
        );
      }
      if (doubleBooked.length) {
        flags.push(
          '<span class="load-flag warn" title="' +
            escapeHtml(doubleBooked.join(", ")) +
            '">Too many classes</span>',
        );
        clashes.push(
          day +
            ": " +
            doubleBooked.join(", ") +
            " has more than " +
            MAX_CLASSES_PER_SECTION_DAY +
            " classes.",
        );
      }

      const absent = items.filter(
        (s) => classStatusOf(s) === "absent",
      ).length;
      const unavailable = items.filter(
        (s) => classStatusOf(s) === "unavailable",
      ).length;
      const cancelled = items.filter(
        (s) => classStatusOf(s) === "cancelled",
      ).length;
      if (absent) {
        flags.push(
          '<span class="load-flag over">' + absent + " absent</span>",
        );
      }
      if (unavailable) {
        flags.push(
          '<span class="load-flag warn">' +
            unavailable +
            " unavailable</span>",
        );
      }
      if (cancelled) {
        flags.push(
          '<span class="load-flag under">' + cancelled + " cancelled</span>",
        );
      }
      if (!flags.length) {
        flags.push('<span class="load-flag ok">OK</span>');
      }

      rows.push(
        "<tr>" +
          "<td>" +
          day +
          "</td>" +
          "<td>" +
          items.length +
          "</td>" +
          "<td>" +
          subjectCount +
          "</td>" +
          '<td class="load-units">' +
          unitsLabel(units) +
          "</td>" +
          '<td class="load-free">' +
          free +
          " / " +
          daySlots.length +
          "</td>" +
          '<td class="load-status"><div class="load-flags">' +
          flags.join("") +
          "</div></td>" +
          "</tr>",
      );
    });

    tbody.innerHTML = rows.join("");

    const teachingDays = DAY_ORDER.filter((d) =>
      mine.some((s) => s.day === d),
    ).length;

    if (value) {
      value.textContent =
        (teacher ? teacher.teacher_name : "Teacher " + teacherId) +
        " - " +
        teachingDays +
        " teaching day(s) and " +
        mine.length +
        " class(es) a week.";
    }
    if (note) {
      note.textContent = clashes.length
        ? "More than " +
          MAX_CLASSES_PER_SECTION_DAY +
          " classes per day - " +
          clashes.join("  ")
        : "Every section this teacher handles stays within the daily class limit.";
    }
  }

  function populateTeacherControls() {
    const deptSel = $id("teacherDept");
    const sel = $id("teacherSelect");
    const teachers = uniqueTeachers();

    // Department drives the teacher list: only that department's faculty show.
    const allDepts = Array.from(
      new Set(teachers.map((t) => t.department).filter(Boolean)),
    ).sort();
    const savedDept = getSavedSelectValue("teacherDept");
    deptSel.innerHTML = '<option value="">All departments</option>';
    allDepts.forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      deptSel.appendChild(o);
    });
    deptSel.value = allDepts.indexOf(savedDept) !== -1 ? savedDept : "";
    const wantDept = deptSel.value;

    const inDept = teachers.filter(
      (t) => !wantDept || t.department === wantDept,
    );
    sel.innerHTML = "";
    if (!inDept.length) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = teachers.length
        ? "No teachers in this department"
        : "No teachers found";
      sel.appendChild(o);
      renderTeacherDay([], "");
      restoreSelectValue(sel);
      return;
    }
    inDept.forEach((t) => {
      const o = document.createElement("option");
      o.value = String(t.teacher_id);
      o.textContent =
        t.teacher_name +
        (t.employee_number ? " (" + t.employee_number + ")" : "");
      sel.appendChild(o);
    });
    restoreSelectValue(sel);
    fillTeacherDayFilter();
    renderTeacherTab();
  }

  /* ------------------------ add-schedule modal ---------------------------- */
  const SCHED_SAVE_LABEL = "Save Schedule";

  function scheduleFormValues() {
    return {
      subject_id: Number($id("schedSubject").value),
      teacher_id: Number($id("schedTeacher").value),
      day: $id("schedDay").value,
      section: $id("schedSection").value.trim(),
      start_time: $id("schedStart").value,
      end_time: $id("schedEnd").value,
      room: $id("schedRoom").value.trim(),
    };
  }

  function resetScheduleConfirm() {
    const form = $id("schedForm");
    if (form) delete form.dataset.confirmed;
    const save = $id("schedSave");
    if (save) save.textContent = SCHED_SAVE_LABEL;
    const warn = $id("schedWarning");
    if (warn) {
      warn.hidden = true;
      warn.textContent = "";
    }
  }

  function populateScheduleModal() {
    const subSel = $id("schedSubject");
    subSel.innerHTML = "";
    subjects.forEach((sub) => {
      const o = document.createElement("option");
      o.value = String(sub.subject_id);
      o.textContent = sub.subject_code + " - " + sub.subject_name;
      subSel.appendChild(o);
    });

    const teacherSel = $id("schedTeacher");
    teacherSel.innerHTML = "";
    uniqueTeachers().forEach((t) => {
      const o = document.createElement("option");
      o.value = String(t.teacher_id);
      o.textContent =
        t.teacher_name +
        (t.employee_number ? " (" + t.employee_number + ")" : "");
      teacherSel.appendChild(o);
    });
    const currentTeacher = $id("teacherSelect").value;
    if (currentTeacher) teacherSel.value = currentTeacher;

    const daySel = $id("schedDay");
    daySel.innerHTML = "";
    DAY_ORDER.forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      daySel.appendChild(o);
    });

    $id("schedRoomList").innerHTML = Array.from(
      new Set(
        rooms.map((r) => r.room_name).concat(schedules.map((s) => s.room)),
      ),
    )
      .filter(Boolean)
      .sort()
      .map((name) => '<option value="' + escapeHtml(name) + '">')
      .join("");

    $id("schedSectionList").innerHTML = uniqueSections()
      .map((sec) => '<option value="' + escapeHtml(sec) + '">')
      .join("");

    resetScheduleConfirm();
  }

  function openScheduleModal() {
    if (!subjects.length) {
      toast("No subjects available - cannot add a schedule.", true);
      return;
    }
    if (!uniqueTeachers().length) {
      toast("No teachers available - cannot add a schedule.", true);
      return;
    }
    populateScheduleModal();
    $id("schedModal").hidden = false;
    $id("schedSubject").focus();
  }

  function closeScheduleModal() {
    $id("schedModal").hidden = true;
    resetScheduleConfirm();
  }

  // Human-readable notes for overlaps the candidate would create.
  function scheduleOverlapNotes(v) {
    const notes = [];
    const candidate = {
      day: v.day,
      start_time: v.start_time,
      end_time: v.end_time,
    };
    const teacherName =
      (uniqueTeachers().find((t) => t.teacher_id === v.teacher_id) || {})
        .teacher_name || "This teacher";

    if (
      schedules.some(
        (s) => s.teacher_id === v.teacher_id && overlaps(candidate, s),
      )
    ) {
      notes.push(teacherName + " already teaches at that time.");
    }
    if (
      v.room &&
      schedules.some((s) => s.room === v.room && overlaps(candidate, s))
    ) {
      notes.push(v.room + " is already booked at that time.");
    }
    if (v.section) {
      const sectionDayItems = schedules.filter(
        (s) => s.section === v.section && s.day === v.day,
      );

      if (sectionDayItems.length + 1 > MAX_CLASSES_PER_SECTION_DAY) {
        notes.push(
          "Section " +
            v.section +
            " would have " +
            (sectionDayItems.length + 1) +
            " classes on " +
            v.day +
            " (maximum: " +
            MAX_CLASSES_PER_SECTION_DAY +
            ").",
        );
      }
    }

    // Daily policy: how many subjects and units the teacher would carry.
    const dayItems = schedules.filter(
      (s) => Number(s.teacher_id) === Number(v.teacher_id) && s.day === v.day,
    );
    const subjectCount = new Set(
      dayItems.map((s) => String(s.subject_id)),
    );
    subjectCount.add(String(v.subject_id));

    if (subjectCount.size > MAX_SUBJECTS_PER_DAY) {
      notes.push(
        teacherName +
          " would teach " +
          subjectCount.size +
          " subjects on " +
          v.day +
          " (limit: " +
          MAX_SUBJECTS_PER_DAY +
          ").",
      );
    }

    const units =
      dayItems.reduce((sum, s) => sum + unitsOfSubject(s.subject_id), 0) +
      unitsOfSubject(v.subject_id);

    if (units > MAX_UNITS_PER_DAY) {
      notes.push(
        teacherName +
          "'s " +
          v.day +
          " load would reach " +
          unitsLabel(units) +
          " units (maximum: " +
          MAX_UNITS_PER_DAY +
          ").",
      );
    }

    return notes;
  }

  async function submitScheduleForm(e) {
    e.preventDefault();
    const v = scheduleFormValues();
    const warn = $id("schedWarning");
    const save = $id("schedSave");
    const form = $id("schedForm");

    if (!v.subject_id || !v.teacher_id || !v.day) {
      toast("Subject, teacher, and day are required.", true);
      return;
    }
    if (!v.start_time || !v.end_time) {
      toast("Start and end time are required.", true);
      return;
    }
    if (v.end_time <= v.start_time) {
      toast("End time must be after start time.", true);
      return;
    }

    const notes = scheduleOverlapNotes(v);
    if (notes.length && !form.dataset.confirmed) {
      warn.textContent = "Possible conflict: " + notes.join(" ");
      warn.hidden = false;
      form.dataset.confirmed = "1";
      save.textContent = "Save Anyway";
      return;
    }

    save.disabled = true;
    save.textContent = "Saving…";
    try {
      const created = await sendJSON("schedules.php", "POST", {
        subject_id: v.subject_id,
        teacher_id: v.teacher_id,
        day: v.day,
        start_time: v.start_time,
        end_time: v.end_time,
        room: v.room || null,
        section: v.section || null,
      });
      await loadData();
      saveSelectValue("teacherSelect", String(created.teacher_id));
      populateTeacherControls();
      populateSectionControls();
      renderRoomsTab();
      conflictsCache = computeConflicts();
      populateConflictFilter();
      renderConflictsTab();
      if (attendanceChanges.size === 0) renderAttendanceTab();
      closeScheduleModal();
      toast(
        "Schedule added (" +
          created.day +
          " " +
          fmtTime(created.start_time) +
          " - " +
          fmtTime(created.end_time) +
          ").",
      );
    } catch (err) {
      toast("Could not save schedule: " + err.message, true);
    } finally {
      save.disabled = false;
      save.textContent = form.dataset.confirmed
        ? "Save Anyway"
        : SCHED_SAVE_LABEL;
    }
  }

  /* --------------------------- student tab -------------------------------- */
  function renderStudentTab() {
    const section = $id("sectionSelect").value;
    const day = $id("sectionDay").value;
    const list = schedules.filter(
      (s) => s.section === section && (!day || s.day === day),
    );
    const pattern = patternLabelOf(section);
    const days = meetingDaysLabelOf(section);
    $id("sectionValue").textContent = section
      ? "Section " +
        section +
        (pattern ? " — meets " + days + " (" + pattern + ")" : "") +
        (day ? " · " + day : " · All days")
      : "Select a section.";
    renderWeekGrid($id("student-grid"), list, day ? [day] : null, {
      showTime: true,
    });
    renderSectionAllocation();
  }

  // How the selected section's week is allocated: how many classes it has on
  // each day, the time they take up and the rooms they are in. Days outside
  // the 2-4 classes a day the policy asks for are flagged.
  function renderSectionAllocation() {
    const tbody = $id("student-alloc-rows");
    if (!tbody) return;

    const value = $id("sectionAllocValue");
    const note = $id("student-alloc-note");
    const section = $id("sectionSelect").value;

    if (!section) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-cell">Select a section to see how its week is allocated.</td></tr>';
      if (value) {
        value.textContent =
          "Select a section to see how its week is allocated.";
      }
      if (note) note.textContent = "";
      return;
    }

    const mine = schedules.filter((s) => s.section === section);
    const rows = [];
    const light = [];
    const heavy = [];
    let totalClasses = 0;
    let totalMinutes = 0;

    DAY_ORDER.forEach((d) => {
      const items = mine
        .filter((s) => s.day === d)
        .sort((a, b) =>
          String(a.start_time).localeCompare(String(b.start_time)),
        );
      totalClasses += items.length;

      const times = items.map((s) => {
        totalMinutes += minutesBetween(s.start_time, s.end_time);
        return fmtTime(s.start_time) + " – " + fmtTime(s.end_time);
      });

      const dayRooms = [];
      items.forEach((s) => {
        const room = s.room || "TBA";
        if (dayRooms.indexOf(room) === -1) dayRooms.push(room);
      });

      const count = items.length;
      const flags = [];
      if (!count) {
        flags.push('<span class="load-flag under">No class</span>');
      } else if (count < MIN_CLASSES_PER_SECTION_DAY) {
        flags.push('<span class="load-flag under">Under minimum</span>');
        light.push(d + " (" + count + ")");
      } else if (count > MAX_CLASSES_PER_SECTION_DAY) {
        flags.push('<span class="load-flag over">Over maximum</span>');
        heavy.push(d + " (" + count + ")");
      } else if (count === MAX_CLASSES_PER_SECTION_DAY) {
        flags.push('<span class="load-flag ok">At maximum</span>');
      } else {
        flags.push('<span class="load-flag ok">OK</span>');
      }

      // The same class states the teacher view shows.
      const absent = items.filter(
        (s) => classStatusOf(s) === "absent",
      ).length;
      const unavailable = items.filter(
        (s) => classStatusOf(s) === "unavailable",
      ).length;
      const cancelled = items.filter(
        (s) => classStatusOf(s) === "cancelled",
      ).length;
      if (absent) {
        flags.push('<span class="load-flag over">' + absent + " absent</span>");
      }
      if (unavailable) {
        flags.push(
          '<span class="load-flag warn">' +
            unavailable +
            " unavailable</span>",
        );
      }
      if (cancelled) {
        flags.push(
          '<span class="load-flag under">' + cancelled + " cancelled</span>",
        );
      }

      rows.push(
        "<tr>" +
          "<td>" +
          d +
          "</td>" +
          "<td>" +
          count +
          "</td>" +
          '<td class="alloc-time">' +
          (times.length ? escapeHtml(times.join(", ")) : "—") +
          "</td>" +
          '<td class="alloc-rooms">' +
          (dayRooms.length ? escapeHtml(dayRooms.join(", ")) : "—") +
          "</td>" +
          '<td class="load-status"><div class="load-flags">' +
          flags.join("") +
          "</div></td>" +
          "</tr>",
      );
    });

    tbody.innerHTML = rows.join("");

    const classDays = DAY_ORDER.filter((d) =>
      mine.some((s) => s.day === d),
    ).length;
    const hours = Math.round((totalMinutes / 60) * 10) / 10;

    if (value) {
      const pattern = patternLabelOf(section);
      value.textContent =
        "Section " +
        section +
        (pattern ? " (" + pattern + ")" : "") +
        " - " +
        totalClasses +
        " class(es) over " +
        classDays +
        " day(s), " +
        hours +
        " hours allocated.";
    }
    if (note) {
      const parts = [];
      if (light.length) {
        parts.push(
          "Below the " +
            MIN_CLASSES_PER_SECTION_DAY +
            "-class minimum on " +
            light.join(", ") +
            ".",
        );
      }
      if (heavy.length) {
        parts.push(
          "Over the " +
            MAX_CLASSES_PER_SECTION_DAY +
            "-class maximum on " +
            heavy.join(", ") +
            ".",
        );
      }
      note.textContent = parts.length
        ? parts.join(" ")
        : "Every class day falls between " +
          MIN_CLASSES_PER_SECTION_DAY +
          " and " +
          MAX_CLASSES_PER_SECTION_DAY +
          " classes.";
    }
  }

  function populateSectionControls() {
    const courseSel = $id("studentCourse");
    const yearSel = $id("studentYear");
    const sel = $id("sectionSelect");
    const sections = uniqueSections();

    // Department + year drive the section list (same pattern as attendance tab).
    const allCourses = Array.from(
      new Set(students.map((st) => st.course).filter(Boolean)),
    )
      .map(String)
      .sort();
    courseSel.innerHTML = '<option value="">All departments</option>';
    allCourses.forEach((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = courseLabelOf(c);
      courseSel.appendChild(o);
    });
    const savedCourse = getSavedSelectValue("studentCourse");
    courseSel.value = allCourses.indexOf(savedCourse) !== -1 ? savedCourse : "";
    const wantCourse = courseSel.value;

    const allYears = Array.from(
      new Set(
        students
          .map((st) => st.year_level)
          .filter((y) => y !== null && y !== undefined && y !== ""),
      ),
    )
      .map(String)
      .sort();
    yearSel.innerHTML = '<option value="">All years</option>';
    allYears.forEach((y) => {
      const o = document.createElement("option");
      o.value = y;
      o.textContent = "Year " + y;
      yearSel.appendChild(o);
    });
    const savedYear = getSavedSelectValue("studentYear");
    yearSel.value = allYears.indexOf(savedYear) !== -1 ? savedYear : "";
    const wantYear = yearSel.value;

    const inScope = sections.filter(
      (sec) =>
        (!wantCourse || sectionCourseOf(sec) === wantCourse) &&
        (!wantYear || sectionYearOf(sec) === wantYear),
    );

    sel.innerHTML = "";
    if (!inScope.length) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = sections.length
        ? "No sections match"
        : "No sections found";
      sel.appendChild(o);
      renderWeekGrid($id("student-grid"), []);
      restoreSelectValue(sel);
      return;
    }
    inScope.forEach((sec) => {
      const o = document.createElement("option");
      o.value = sec;
      const pattern = patternLabelOf(sec);
      o.textContent = pattern ? sec + " (" + pattern + ")" : sec;
      sel.appendChild(o);
    });
    restoreSelectValue(sel);
    fillDayFilter($id("sectionDay"));
    renderStudentTab();
  }

  /* --------------------------- rooms tab ---------------------------------- */
  let rooms = [];
  let roomBuilding = "";
  let roomFloor = 0;
  let roomQuery = "";

  const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const nowTimeStr = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  };

  // Today's per-room class sessions, snapshotted at render time so every
  // tile and the counter agree. Times are zero-padded "HH:MM:SS" strings,
  // so plain string comparison orders them chronologically.
  const todaysRoomSessions = () => {
    const today = weekdayOf(todayStr());
    const now = nowTimeStr();
    const byRoom = new Map();
    schedules.forEach((s) => {
      if (s.day !== today || !s.room) return;
      // A cancelled class does not run, so the room is free.
      if (classStatusOf(s) === "cancelled") return;
      if (!byRoom.has(s.room)) byRoom.set(s.room, []);
      byRoom.get(s.room).push([String(s.start_time), String(s.end_time)]);
    });
    return { now, byRoom };
  };

  // A room reads occupied only while a class is actually in session: from
  // its start time up to (not including) its end time. Before the first
  // class and after the last one the room flips back to available.
  const roomOccupiedNow = (sessions, roomName) =>
    (sessions.byRoom.get(roomName) || []).some(
      ([start, end]) => start <= sessions.now && sessions.now < end,
    );

  // Section shown for a room: its sole section, except labs which name one
  // only while a class is actually in session there.
  const roomDisplaySection = (roomName, nowStr) => {
    const set = new Set();
    let isLab = false;
    rooms.forEach((r) => {
      if (r.room_name === roomName) {
        if (r.room_type === "Lab") isLab = true;
      }
    });
    schedules.forEach((s) => {
      if (s.room === roomName && s.section) set.add(s.section);
    });
    if (set.size !== 1) return "";
    if (!isLab) return Array.from(set)[0];
    const today = weekdayOf(todayStr());
    const cur = schedules.find(
      (s) =>
        s.room === roomName &&
        s.day === today &&
        String(s.start_time) <= nowStr &&
        nowStr < String(s.end_time) &&
        s.section,
    );
    return cur ? cur.section : "";
  };

  // Rooms with their own extra-wide tile (Library, Lab 2, Lab 3).
  const isGrandRoom = (r) =>
    r.room_name === "Library" ||
    r.room_name === "Lab 2" ||
    r.room_name === "Lab 3";

  const tileHtml = (r, sessions, section) => {
    const isFacility = r.room_type === "Facility";
    const occupied = !isFacility && roomOccupiedNow(sessions, r.room_name);
    // The Library gets its own extra-wide tile.
    const isGrand = isGrandRoom(r);
    const cls =
      "map-room-tile" +
      (occupied ? " is-occupied" : "") +
      (isFacility ? " is-facility" : "") +
      (Number(r.is_featured) ? " is-featured" : "") +
      (isGrand ? " is-grand" : "");
    const state = isFacility ? "Facility" : occupied ? "Occupied" : "Available";
    // Facility tiles already badge their type in the state line, so the
    // detail line shows just the floor to avoid repeating "Facility".
    const detailBits = [];
    if (!isFacility && r.room_type) detailBits.push(r.room_type);
    detailBits.push(ordinal(Number(r.floor)) + " floor");
    if (section) detailBits.push(section);
    const tileLabel =
      escapeHtml(r.room_name) + ", " + state + ". View today's schedule.";
    return (
      '<div class="' +
      cls +
      '" tabindex="0" role="button" title="Room schedule" aria-label="' +
      tileLabel +
      '">' +
      '<div class="map-room-tile-heading"><strong>' +
      escapeHtml(r.room_name) +
      '</strong><span class="room-state">● ' +
      state +
      "</span></div>" +
      '<div class="map-room-detail">' +
      detailBits.map(escapeHtml).join(" · ") +
      "</div>" +
      "</div>"
    );
  };

  function renderRoomsTab() {
    const buildings = Array.from(
      new Set(rooms.map((r) => r.building).filter(Boolean)),
    ).sort();
    if (!roomBuilding || buildings.indexOf(roomBuilding) === -1) {
      const saved = getSavedSelectValue("roomBuilding");
      roomBuilding =
        buildings.indexOf(saved) !== -1 ? saved : buildings[0] || "";
    }

    const floors = Array.from(
      new Set(
        rooms
          .filter((r) => r.building === roomBuilding)
          .map((r) => Number(r.floor)),
      ),
    ).sort((a, b) => a - b);
    if (!roomFloor || floors.indexOf(roomFloor) === -1) {
      const savedFloor = Number(getSavedSelectValue("roomFloor"));
      roomFloor =
        floors.indexOf(savedFloor) !== -1 ? savedFloor : floors[0] || 0;
    }

    const buildingBox = $id("room-building-options");
    buildingBox.innerHTML = buildings
      .map(
        (b) =>
          '<button class="room-building-tab' +
          (b === roomBuilding ? " active" : "") +
          '" data-building="' +
          escapeHtml(b) +
          '">' +
          escapeHtml(b) +
          "</button>",
      )
      .join("");

    const floorBox = $id("room-floor-tabs");
    floorBox.innerHTML = floors
      .map(
        (f) =>
          '<button class="room-floor-tab' +
          (f === roomFloor ? " active" : "") +
          '" data-floor="' +
          f +
          '">' +
          ordinal(f) +
          "</button>",
      )
      .join("");

    const query = roomQuery.toLowerCase();
    const list = rooms.filter(
      (r) =>
        r.building === roomBuilding &&
        Number(r.floor) === roomFloor &&
        (!query || String(r.room_name).toLowerCase().indexOf(query) !== -1),
    );

    const sessions = todaysRoomSessions();
    // Section shown per tile (labs only while a class is in session).
    const roomSectionOf = (roomName) =>
      roomDisplaySection(roomName, sessions.now);
    const occupied = list.filter(
      (r) =>
        r.room_type !== "Facility" && roomOccupiedNow(sessions, r.room_name),
    ).length;
    $id("room-map-status").textContent = list.length
      ? "Building " +
        roomBuilding +
        " · " +
        ordinal(roomFloor) +
        " floor — " +
        occupied +
        " occupied · " +
        (list.length - occupied) +
        " available"
      : "No rooms match the current filter.";

    const grid = $id("room-grid");
    if (!list.length) {
      grid.innerHTML =
        '<div class="room-map-empty">No rooms found. Adjust the building, floor, or search.</div>';
    } else {
      const byOrder = (key) => (a, b) => Number(a[key]) - Number(b[key]);
      // Certain floors embed one room inside the hallway band (left side)
      // instead of the upper/lower bands.
      const HALLWAY_ROOMS = { "C|2": "Room G", "C|3": "Room N" };
      const hallwayRoomName = HALLWAY_ROOMS[roomBuilding + "|" + roomFloor];
      const hallwayRoom =
        hallwayRoomName != null
          ? list.find((r) => r.room_name === hallwayRoomName) || null
          : null;
      const planList = hallwayRoom
        ? list.filter((r) => r !== hallwayRoom)
        : list;
      const upper = planList
        .filter((r) => Number(r.upper_order) > 0)
        .sort(byOrder("upper_order"));
      const lower = planList
        .filter((r) => Number(r.lower_order) > 0)
        .sort(byOrder("lower_order"));
      const rest = planList.filter(
        (r) => !(Number(r.upper_order) > 0) && !(Number(r.lower_order) > 0),
      );
      // The lower band is one flat grid so every room tile gets an identical
      // cell: room tiles share equal 1fr tracks while hallway/stairs strips
      // get fixed 54px tracks. The hallway is omitted on Building A 2nd
      // floor; stairs are omitted in Building B.
      const noHallway =
        (roomBuilding === "A" && Number(roomFloor) === 2) ||
        roomBuilding === "C" ||
        roomBuilding === "D";
      const lowerCls =
        "floorplan-lower" +
        (roomBuilding === "B" ? " no-stairs" : "") +
        (noHallway ? " no-hallway" : "") +
        (roomBuilding === "D" ? " bld-d" : "");
      // Building B 1st floor keeps two rooms left so Room 102 sits
      // right of the hallway; other floors split evenly.
      const half =
        roomBuilding === "B" && Number(roomFloor) === 1
          ? 2
          : Math.ceil(lower.length / 2);
      const lowerTracks = [];
      const lowerCells = [];
      // Grand rooms hold a fixed 350px track, matching Lab 1; others share.
      const lowerTrackFor = (r) => (isGrandRoom(r) ? "350px" : "minmax(0,1fr)");
      // Hallway width per floor: extra-wide on A 1st floor, wide on
      // B 1st floor, standard elsewhere.
      let hallwayTrack = "54px";
      if (Number(roomFloor) === 1) {
        if (roomBuilding === "A") hallwayTrack = "200px";
        else if (roomBuilding === "B") hallwayTrack = "160px";
      }
      lower.slice(0, half).forEach((r) => {
        lowerTracks.push(lowerTrackFor(r));
        lowerCells.push(tileHtml(r, sessions, roomSectionOf(r.room_name)));
      });
      if (!noHallway) {
        lowerTracks.push(hallwayTrack);
        lowerCells.push(
          '<div class="floorplan-hallway-v" aria-hidden="true"><span>Hallway</span></div>',
        );
      }
      lower.slice(half).forEach((r) => {
        lowerTracks.push(lowerTrackFor(r));
        lowerCells.push(tileHtml(r, sessions, roomSectionOf(r.room_name)));
      });
      // Building C places a stairs strip between its first two lower rooms
      // (e.g. Room E | stairs | Room F).
      if (roomBuilding === "C" && lowerCells.length > 1) {
        lowerTracks.splice(1, 0, "120px");
        lowerCells.splice(
          1,
          0,
          '<div class="floorplan-stairs" aria-hidden="true"><i class="fa-solid fa-stairs"></i><span>Stairs</span></div>',
        );
      }
      // Building D flanks its lower rooms with wide stairs on both sides.
      if (roomBuilding === "D" && lowerCells.length > 0) {
        const sideStairs =
          '<div class="floorplan-stairs" aria-hidden="true"><i class="fa-solid fa-stairs"></i><span>Stairs</span></div>';
        lowerCells.unshift(sideStairs);
        lowerCells.push(sideStairs);
        lowerTracks.unshift("110px");
        lowerTracks.push("110px");
      }
      // Stairs appear in Building A only.
      if (roomBuilding === "A") {
        // Extra-wide stairs strip anywhere in Building A.
        lowerTracks.push(roomBuilding === "A" ? "110px" : "54px");
        lowerCells.push(
          '<div class="floorplan-stairs" aria-hidden="true"><i class="fa-solid fa-stairs"></i><span>Stairs</span></div>',
        );
      }
      // Featured rooms span double width anywhere in Building A.
      const wideFeatured = roomBuilding === "A";
      // Building C 3rd floor uses four wide upper columns.
      const cols4 = roomBuilding === "C" && Number(roomFloor) === 3;
      const hallwayHtml = hallwayRoom
        ? '<div class="floorplan-hallway has-room">' +
          tileHtml(
            hallwayRoom,
            sessions,
            roomSectionOf(hallwayRoom.room_name),
          ) +
          '<span class="floorplan-hallway-label">HALLWAY</span></div>'
        : '<div class="floorplan-hallway">HALLWAY</div>';
      grid.innerHTML =
        '<div class="floorplan">' +
        '<div class="floorplan-upper' +
        (wideFeatured ? " wide-featured" : "") +
        (cols4 ? " cols-4" : "") +
        '">' +
        upper
          .map((r) => tileHtml(r, sessions, roomSectionOf(r.room_name)))
          .join("") +
        "</div>" +
        hallwayHtml +
        '<div class="' +
        lowerCls +
        '" style="grid-template-columns: ' +
        lowerTracks.join(" ") +
        '">' +
        lowerCells.join("") +
        "</div>" +
        "</div>" +
        (rest.length
          ? '<div class="floorplan-overflow"><div class="floorplan-overflow-label">UNPLACED</div>' +
            rest
              .map((r) => tileHtml(r, sessions, roomSectionOf(r.room_name)))
              .join("") +
            "</div>"
          : "");
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const datePart = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const hours24 = now.getHours();
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    $id("room-map-updated").textContent =
      "Updated " +
      datePart +
      ", " +
      hours12 +
      ":" +
      pad(now.getMinutes()) +
      " " +
      suffix;
  }

  /* ------------------------- room detail dialog --------------------------- */
  function openRoomDialog(roomName) {
    const room =
      rooms.find(
        (r) =>
          r.room_name === roomName &&
          r.building === roomBuilding &&
          Number(r.floor) === roomFloor,
      ) || rooms.find((r) => r.room_name === roomName);
    if (!room) return;

    $id("roomDialogTitle").textContent = room.room_name;
    const today = weekdayOf(todayStr());
    const sessions = todaysRoomSessions();
    const dialogSection = roomDisplaySection(roomName, sessions.now);
    $id("roomDialogSub").textContent =
      "Building " +
      room.building +
      " · " +
      ordinal(Number(room.floor)) +
      " floor" +
      (room.room_type ? " · " + room.room_type : "") +
      (dialogSection ? " · Section " + dialogSection : "");

    const todays = schedules
      .filter((s) => s.room === roomName && s.day === today)
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

    const body = $id("roomDialogBody");
    const facilityBlurb =
      room.room_type === "Facility" && room.description
        ? '<p class="modal-sub">' + escapeHtml(room.description) + "</p>"
        : "";
    if (!todays.length) {
      body.innerHTML =
        facilityBlurb +
        (room.room_type === "Facility"
          ? ""
          : '<p class="room-day-empty">No classes scheduled here today (' +
            escapeHtml(today) +
            ").</p>");
    } else {
      body.innerHTML = todays
        .map((s) => {
          const start = String(s.start_time);
          const end = String(s.end_time);
          const isNow = start <= sessions.now && sessions.now < end;
          const isDone = sessions.now >= end;
          const badge = isNow
            ? '<span class="chip present"><span class="chip-dot"></span>Now</span>'
            : isDone
              ? '<span class="chip excused"><span class="chip-dot"></span>Done</span>'
              : '<span class="tag">Upcoming</span>';
          const meta = [
            s.section ? "Section " + s.section : null,
            s.teacher_name || null,
          ]
            .filter(Boolean)
            .map(escapeHtml)
            .join(" · ");
          return (
            '<div class="room-day-row' +
            (isNow ? " is-now" : "") +
            '">' +
            '<span class="room-day-time">' +
            fmtTime(start) +
            " - " +
            fmtTime(end) +
            "</span>" +
            '<div class="room-day-main"><strong>' +
            escapeHtml(
              (s.subject_code ? s.subject_code + " - " : "") +
                (s.subject_name || "Class"),
            ) +
            "</strong>" +
            (meta ? "<span>" + meta + "</span>" : "") +
            "</div>" +
            badge +
            "</div>"
          );
        })
        .join("");
    }

    $id("roomDialog").hidden = false;
    $id("roomDialogClose").focus();
  }

  function closeRoomDialog() {
    $id("roomDialog").hidden = true;
  }

  /* --------------------------- conflicts tab ------------------------------ */
  const overlaps = (a, b) =>
    a.day === b.day && a.start_time < b.end_time && b.start_time < a.end_time;

  function computeConflicts() {
    const pairs = [];
    const groups = [
      {
        name: "Teacher",
        key: (s) => s.teacher_id,
        label: (s) => s.teacher_name || "Teacher " + s.teacher_id,
      },
      { name: "Room", key: (s) => s.room, label: (s) => s.room },
      { name: "Section", key: (s) => s.section, label: (s) => s.section },
    ];

    groups.forEach((g) => {
      const byKey = new Map();
      schedules.forEach((s) => {
        const k = g.key(s);
        if (k == null || k === "" || k === 0) return;
        if (!byKey.has(k)) byKey.set(k, []);
        byKey.get(k).push(s);
      });

      byKey.forEach((items) => {
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            if (!overlaps(items[i], items[j])) continue;
            const a = items[i],
              b = items[j];
            pairs.push({
              type: g.name,
              sev: g.name === "Room" ? "warn" : "error",
              title: g.name + " overlap: " + g.label(a),
              desc:
                g.label(a) +
                " has overlapping classes on " +
                a.day +
                " " +
                fmtTime(a.start_time) +
                " - " +
                fmtTime(a.end_time) +
                " and " +
                fmtTime(b.start_time) +
                " - " +
                fmtTime(b.end_time) +
                ".",
              tags: [a.day, a.subject_code, b.subject_code].filter(Boolean),
              classes: [a, b],
            });
          }
        }
      });
    });

    return pairs;
  }

  const conflictClassHtml = (s) => {
    const bits = [
      s.day + " " + fmtTime(s.start_time) + " - " + fmtTime(s.end_time),
      s.teacher_name ? "Teacher: " + s.teacher_name : null,
      s.room ? "Room: " + s.room : null,
      s.section ? "Section: " + s.section : null,
    ].filter(Boolean);
    return (
      '<div class="conflict-class"><strong>' +
      escapeHtml(
        (s.subject_code ? s.subject_code + " - " : "") +
          (s.subject_name || "Class"),
      ) +
      "</strong>" +
      '<div class="tags">' +
      bits
        .map((t) => '<span class="tag">' + escapeHtml(t) + "</span>")
        .join("") +
      "</div></div>"
    );
  };

  function populateConflictFilter() {
    const sel = $id("conflictFilter");
    sel.innerHTML = '<option value="">All types</option>';
    ["Teacher", "Room", "Section", "Other"].forEach((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      sel.appendChild(o);
    });
    restoreSelectValue(sel);
  }

  // A stable signature for an automatic clash, so an acknowledgement keeps
  // working after the schedule is re-scanned.
  const conflictKey = (c) => {
    const ids = (c.classes || [])
      .map((s) => Number(s.schedule_id))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    return c.type + "|" + ids.join("-");
  };

  function renderConflictsTab() {
    renderPolicySummary();

    const filter = $id("conflictFilter").value;
    const manual = conflictSource === "manual";

    const hint = $id("conflict-source-hint");
    if (hint) {
      hint.textContent = manual
        ? "Manual conflicts are reported by staff and stay in the list until they are resolved."
        : "Automatic conflicts are found by re-scanning the schedule. Acknowledge the ones that have been reviewed and accepted.";
    }

    const ackedToggle = $id("toggleAcknowledged");
    if (ackedToggle) ackedToggle.hidden = manual;

    const rescan = $id("rescanConflicts");
    if (rescan) rescan.hidden = manual;

    $id("conflict-list").innerHTML = manual
      ? manualConflictListHtml(filter)
      : automaticConflictListHtml(filter);
  }

  // Automatic clashes: found by the system and recomputed on every scan.
  function automaticConflictListHtml(filter) {
    const list = filter
      ? conflictsCache.filter((c) => c.type === filter)
      : conflictsCache;
    const acked = list.filter((c) => acknowledgements.has(conflictKey(c)));
    const visible = showAcknowledged
      ? list
      : list.filter((c) => !acknowledgements.has(conflictKey(c)));

    const toggle = $id("toggleAcknowledged");
    if (toggle) {
      toggle.textContent = showAcknowledged
        ? "Hide acknowledged (" + acked.length + ")"
        : "Show acknowledged (" + acked.length + ")";
    }

    if (!visible.length) {
      return list.length
        ? '<div class="conflict-item"><div class="ic">✓</div><div>' +
          "<h4>Nothing left to review</h4>" +
          "<p>All " +
          list.length +
          " clash(es) of this type are acknowledged.</p></div></div>"
        : '<div class="conflict-item"><div class="ic">✓</div><div>' +
          "<h4>No conflicts detected</h4>" +
          "<p>All schedules are clear of teacher, room, and section overlaps.</p></div></div>";
    }

    return visible
      .map((c) => {
        const key = conflictKey(c);
        const isAck = acknowledgements.has(key);
        return (
          '<div class="conflict-item has-detail' +
          (c.sev === "warn" ? " warn" : "") +
          (isAck ? " is-acknowledged" : "") +
          '" data-key="' +
          escapeHtml(key) +
          '" tabindex="0" role="button" aria-expanded="false" title="Show overlapping classes">' +
          '<div class="ic">' +
          (c.sev === "warn" ? "!" : "✕") +
          "</div>" +
          "<div><h4>" +
          escapeHtml(c.title) +
          "</h4>" +
          "<p>" +
          escapeHtml(c.desc) +
          "</p>" +
          '<div class="tags">' +
          c.tags
            .map((t) => '<span class="tag">' + escapeHtml(t) + "</span>")
            .join("") +
          (isAck ? '<span class="tag tag-ack">Acknowledged</span>' : "") +
          "</div>" +
          '<div class="conflict-detail" hidden>' +
          (c.classes || []).map(conflictClassHtml).join("") +
          "</div>" +
          '<div class="conflict-actions">' +
          '<button class="btn btn-mini" type="button" data-action="acknowledge" data-key="' +
          escapeHtml(key) +
          '">' +
          (isAck ? "Undo acknowledge" : "Acknowledge") +
          "</button></div></div>" +
          "</div>"
        );
      })
      .join("");
  }

  // Manual conflicts: reported by staff and stored in the database.
  function manualConflictListHtml(filter) {
    const list = filter
      ? manualConflicts.filter((c) => c.conflict_type === filter)
      : manualConflicts;

    if (!list.length) {
      return (
        '<div class="conflict-item"><div class="ic">✓</div><div>' +
        "<h4>No reported conflicts</h4>" +
        "<p>Nothing has been reported by hand yet. Use Report Conflict to record an issue the schedule cannot detect.</p></div></div>"
      );
    }

    return list
      .map((c) => {
        const resolved = c.status === "Resolved";
        return (
          '<div class="conflict-item manual' +
          (c.severity === "warn" ? " warn" : "") +
          (resolved ? " is-resolved" : "") +
          '">' +
          '<div class="ic">' +
          (c.severity === "warn" ? "!" : "✕") +
          "</div>" +
          "<div>" +
          '<div class="conflict-head"><h4>' +
          escapeHtml(c.title) +
          '</h4><span class="chip ' +
          (resolved ? "excused" : "absent") +
          '"><span class="chip-dot"></span>' +
          (resolved ? "Resolved" : "Open") +
          "</span></div>" +
          (c.description ? "<p>" + escapeHtml(c.description) + "</p>" : "") +
          '<div class="tags">' +
          '<span class="tag">' +
          escapeHtml(c.conflict_type) +
          "</span>" +
          (c.day ? '<span class="tag">' + escapeHtml(c.day) + "</span>" : "") +
          (c.reference
            ? '<span class="tag">' + escapeHtml(c.reference) + "</span>"
            : "") +
          (c.reported_by
            ? '<span class="tag">by ' + escapeHtml(c.reported_by) + "</span>"
            : "") +
          (resolved && c.resolution_note
            ? '<span class="tag">resolved: ' +
              escapeHtml(c.resolution_note) +
              "</span>"
            : "") +
          "</div>" +
          '<div class="conflict-actions">' +
          '<button class="btn btn-mini" type="button" data-action="resolve" data-id="' +
          c.conflict_id +
          '" data-state="' +
          (resolved ? "resolved" : "open") +
          '">' +
          (resolved ? "Reopen" : "Resolve") +
          "</button>" +
          '<button class="btn btn-mini btn-danger" type="button" data-action="delete" data-id="' +
          c.conflict_id +
          '">Delete</button>' +
          "</div></div>" +
          "</div>"
        );
      })
      .join("");
  }

  function toggleConflictItem(item) {
    const detail = item.querySelector(".conflict-detail");
    if (!detail) return;
    const open = detail.hidden;
    detail.hidden = !open;
    item.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* ---------------- manual conflicts: actions + report form ---------------- */
  async function loadManualConflicts() {
    try {
      manualConflicts = await getJSON("conflicts.php");
    } catch (err) {
      toast("Could not load the reported conflicts: " + err.message, true);
    }
  }

  // Acknowledging an automatic clash keeps the record but hides it, so known
  // clashes stop burying the ones that still need attention.
  async function toggleAcknowledgement(key, btn) {
    if (!key) return;
    const acked = acknowledgements.has(key);
    btn.disabled = true;
    try {
      if (acked) {
        await sendJSON(
          "conflicts.php?action=acknowledge&conflict_key=" +
            encodeURIComponent(key),
          "DELETE",
          {},
        );
        acknowledgements.delete(key);
        toast("Acknowledgement removed - the clash is back in the list.");
      } else {
        await sendJSON("conflicts.php?action=acknowledge", "POST", {
          conflict_key: key,
        });
        acknowledgements.add(key);
        toast("Conflict acknowledged - it is hidden from the list.");
      }
      renderConflictsTab();
    } catch (err) {
      toast("Could not update the acknowledgement: " + err.message, true);
      btn.disabled = false;
    }
  }

  async function setManualConflictStatus(id, status) {
    try {
      await sendJSON("conflicts.php?id=" + id, "PUT", { status: status });
      await loadManualConflicts();
      renderConflictsTab();
      toast(
        status === "Resolved" ? "Conflict resolved." : "Conflict reopened.",
      );
    } catch (err) {
      toast("Could not update the conflict: " + err.message, true);
    }
  }

  async function deleteManualConflict(id) {
    try {
      await sendJSON("conflicts.php?id=" + id, "DELETE", {});
      await loadManualConflicts();
      renderConflictsTab();
      toast("Conflict deleted.");
    } catch (err) {
      toast("Could not delete the conflict: " + err.message, true);
    }
  }

  // Switches the conflict tab between the automatic and the manual list.
  function setConflictSource(source) {
    conflictSource = source;
    Array.from($id("conflict-source").children).forEach((b) => {
      const on = b.dataset.source === source;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function openConflictModal() {
    const daySel = $id("manualDay");
    daySel.innerHTML = '<option value="">Any day</option>';
    DAY_ORDER.forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      daySel.appendChild(o);
    });

    $id("manualRefList").innerHTML = Array.from(
      new Set(
        rooms
          .map((r) => r.room_name)
          .concat(schedules.map((s) => s.room))
          .concat(schedules.map((s) => s.section)),
      ),
    )
      .filter(Boolean)
      .sort()
      .map((name) => '<option value="' + escapeHtml(name) + '">')
      .join("");

    const warn = $id("conflictFormWarning");
    if (warn) {
      warn.hidden = true;
      warn.textContent = "";
    }

    $id("conflictModal").hidden = false;
    $id("manualTitle").focus();
  }

  function closeConflictModal() {
    $id("conflictModal").hidden = true;
  }

  async function submitConflictForm(e) {
    e.preventDefault();

    const title = $id("manualTitle").value.trim();
    if (!title) {
      toast("Give the conflict a short title.", true);
      return;
    }

    const save = $id("conflictSave");
    save.disabled = true;
    save.textContent = "Saving…";

    try {
      await sendJSON("conflicts.php", "POST", {
        conflict_type: $id("manualType").value,
        day: $id("manualDay").value || null,
        reference: $id("manualRef").value.trim() || null,
        title: title,
        description: $id("manualDesc").value.trim() || null,
        severity: $id("manualSeverity").value,
        reported_by: $id("manualReporter").value.trim() || null,
      });

      await loadManualConflicts();
      closeConflictModal();
      setConflictSource("manual");
      renderConflictsTab();
      toast("Conflict reported.");
    } catch (err) {
      toast("Could not report the conflict: " + err.message, true);
    } finally {
      save.disabled = false;
      save.textContent = "Report Conflict";
    }
  }

  // School-wide view of the scheduling policy: which teachers carry too much
  // on a given day, and which courses are booked more than once a day.
  function policySummary() {
    const overloaded = [];
    const tooMany = [];

    uniqueTeachers().forEach((t) => {
      const heavyDays = [];
      const subjectDays = [];

      DAY_ORDER.forEach((day) => {
        const items = schedules.filter(
          (s) =>
            Number(s.teacher_id) === Number(t.teacher_id) && s.day === day,
        );
        if (!items.length) return;

        const units = items.reduce(
          (sum, s) => sum + unitsOfSubject(s.subject_id),
          0,
        );
        const subjectCount = new Set(
          items.map((s) => String(s.subject_id)),
        ).size;

        if (units > MAX_UNITS_PER_DAY) {
          heavyDays.push(day + " (" + unitsLabel(units) + "u)");
        }
        if (subjectCount > MAX_SUBJECTS_PER_DAY) {
          subjectDays.push(day + " (" + subjectCount + ")");
        }
      });

      if (heavyDays.length) {
        overloaded.push({ name: t.teacher_name, days: heavyDays });
      }
      if (subjectDays.length) {
        tooMany.push({ name: t.teacher_name, days: subjectDays });
      }
    });

    // Courses (sections) outside the daily class range.
    const perDay = new Map();
    schedules.forEach((s) => {
      if (!s.section) return;
      const key = s.section + "|" + s.day;
      if (!perDay.has(key)) perDay.set(key, []);
      perDay.get(key).push(s);
    });

    const overDaily = [];
    const underDaily = new Map();
    perDay.forEach((items) => {
      const section = items[0].section;
      const day = items[0].day;

      if (items.length > MAX_CLASSES_PER_SECTION_DAY) {
        overDaily.push({ section: section, day: day, count: items.length });
      } else if (items.length < MIN_CLASSES_PER_SECTION_DAY) {
        if (!underDaily.has(section)) underDaily.set(section, []);
        underDaily.get(section).push(day + " (" + items.length + ")");
      }
    });

    return {
      overloaded: overloaded,
      tooMany: tooMany,
      overDaily: overDaily,
      underDaily: Array.from(underDaily.entries()).map(([section, days]) => ({
        section: section,
        days: days,
      })),
    };
  }

  // One compact card summarising the policy state, so the clash list below it
  // stays focused on genuine double bookings.
  function renderPolicySummary() {
    const box = $id("policy-summary");
    if (!box) return;

    const p = policySummary();
    const issues =
      p.overloaded.length +
      p.tooMany.length +
      p.overDaily.length +
      p.underDaily.length;

    if (!issues) {
      box.innerHTML =
        '<div class="policy-card ok"><div class="policy-head">' +
        '<span class="policy-title">Scheduling policy</span>' +
        '<span class="policy-count">All rules met</span></div>' +
        '<ul class="policy-list"><li>Every teacher stays within ' +
        MAX_UNITS_PER_DAY +
        " units and " +
        MAX_SUBJECTS_PER_DAY +
        " subjects a day, and every course runs " +
        MIN_CLASSES_PER_SECTION_DAY +
        " to " +
        MAX_CLASSES_PER_SECTION_DAY +
        " classes a day.</li></ul></div>";
      return;
    }

    const line = (label, entries, render) =>
      entries.length
        ? "<li><strong>" +
          label +
          "</strong> (" +
          entries.length +
          ") - " +
          entries.map(render).map(escapeHtml).join(", ") +
          "</li>"
        : "";

    box.innerHTML =
      '<div class="policy-card"><div class="policy-head">' +
      '<span class="policy-title">Scheduling policy</span>' +
      '<span class="policy-count">' +
      issues +
      " issue(s)</span></div>" +
      '<ul class="policy-list policy-scroll">' +
      line(
        "Overloaded teachers",
        p.overloaded,
        (e) => e.name + ": " + e.days.join(", "),
      ) +
      line(
        "Too many subjects a day",
        p.tooMany,
        (e) => e.name + ": " + e.days.join(", "),
      ) +
      line(
        "Courses over the daily maximum",
        p.overDaily,
        (e) => e.section + " (" + e.day + ", " + e.count + " classes)",
      ) +
      line(
        "Courses below the daily minimum",
        p.underDaily,
        (e) => e.section + ": " + e.days.join(", "),
      ) +
      "</ul></div>";
  }

  /* --------------------------- header user badge -------------------------- */
  async function updateUserBadge() {
    try {
      const user = await getJSON("auth.php");
      const userEl = document.querySelector(".top-right .user");
      if (!user || !userEl) return;
      const avatar = userEl.querySelector(".avatar");
      if (avatar)
        avatar.textContent = initialsOf(user.full_name || user.username);
      const nodes = userEl.childNodes;
      const last = nodes[nodes.length - 1];
      if (last && last.nodeType === 3) {
        last.textContent = " " + (user.full_name || user.username);
      }
    } catch (e) {
      /* not logged in - keep the default label */
    }
  }

  /* --------------------------- load + init -------------------------------- */
  // Pulls the scheduling limits from the API so both sides use one source.
  function applyPolicy(data) {
    if (!data) return;
    const num = (value, fallback) => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    MAX_SUBJECTS_PER_DAY = num(
      data.max_subjects_per_teacher_day,
      MAX_SUBJECTS_PER_DAY,
    );
    MAX_UNITS_PER_DAY = num(data.max_units_per_teacher_day, MAX_UNITS_PER_DAY);
    MIN_UNITS_PER_DAY = num(data.min_units_per_teacher_day, MIN_UNITS_PER_DAY);
    MAX_CLASSES_PER_SECTION_DAY = num(
      data.max_classes_per_section_day,
      MAX_CLASSES_PER_SECTION_DAY,
    );
    MIN_CLASSES_PER_SECTION_DAY = num(
      data.min_classes_per_section_day,
      MIN_CLASSES_PER_SECTION_DAY,
    );
  }

  async function loadData() {
    const [s, stu, sc, at, rm, pol, mc, ack] = await Promise.all([
      getJSON("subject.php"),
      getJSON("student.php"),
      getJSON("schedules.php"),
      getJSON("attendance.php"),
      getJSON("rooms.php"),
      getJSON("policy.php").catch(() => null),
      getJSON("conflicts.php").catch(() => []),
      getJSON("conflicts.php?action=acknowledge").catch(() => []),
    ]);
    subjects = s;
    students = stu;
    schedules = sc;
    attendance = at;
    rooms = rm;
    manualConflicts = mc || [];
    acknowledgements = new Set((ack || []).map((a) => a.conflict_key));
    applyPolicy(pol);
  }

  async function init() {
    try {
      await loadData();
      renderAttendanceTab();
      populateTeacherControls();
      populateSectionControls();
      renderRoomsTab();
      conflictsCache = computeConflicts();
      populateConflictFilter();
      renderConflictsTab();
      updateUserBadge();
    } catch (err) {
      console.error(err);
      const msg = escapeHtml(err.message);
      const tbody = $id("attendance-rows");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:#c8102e;">Failed to load data: ' +
          msg +
          "</td></tr>";
      }
      $id("room-grid").innerHTML =
        '<p style="color:#c8102e;">Failed to load data: ' + msg + "</p>";
      $id("conflict-list").innerHTML =
        '<div class="conflict-item"><div class="ic">✕</div><div><h4>Failed to load data</h4><p>' +
        msg +
        "</p></div></div>";
    }
  }

  /* --------------------------- tab switching ------------------------------ */
  const tabs = document.querySelectorAll("#tabs button");

  function openTab(tabName, focusTab = false) {
    tabs.forEach((btn) => {
      const selected = btn.dataset.tab === tabName;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
      btn.tabIndex = selected ? 0 : -1;
    });
    document
      .querySelectorAll(".tab-panel")
      .forEach((panel) => panel.classList.remove("active"));

    const selectedButton = document.querySelector(
      '#tabs button[data-tab="' + tabName + '"]',
    );
    const selectedPanel = document.getElementById("panel-" + tabName);

    if (selectedButton) selectedButton.classList.add("active");
    if (selectedPanel) selectedPanel.classList.add("active");
    try {
      localStorage.setItem("activeTab", tabName);
    } catch (err) {
      /* ignore private-mode or storage errors */
    }
    if (focusTab && selectedButton) selectedButton.focus();
  }

  Array.from(tabs).forEach((btn) => {
    btn.addEventListener("click", () => openTab(btn.dataset.tab));
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const list = Array.from(tabs);
      const i = list.indexOf(btn);
      const next =
        list[
          (i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length
        ];
      openTab(next.dataset.tab, true);
    });
  });

  /* --------------------------- event wiring ------------------------------- */
  $id("attendanceSubject").addEventListener("change", () => {
    const subjectId = $id("attendanceSubject").value;
    saveSelectValue("attendanceSubject", subjectId);

    // A subject belongs to a specific year, so picking one takes the year
    // filter with it. The section is then re-derived from the sections that
    // take that subject.
    const subject = subjects.find(
      (s) => String(s.subject_id) === String(subjectId),
    );
    const subjectYear =
      subject && subject.year_level ? String(subject.year_level) : "";

    try {
      localStorage.removeItem("select:attendanceSection");
      if (subjectYear) {
        saveSelectValue("attendanceYear", subjectYear);
      } else {
        localStorage.removeItem("select:attendanceYear");
      }
    } catch (err) {
      /* ignore private-mode or storage errors */
    }
    renderAttendanceTab();
  });
  $id("attendanceSection").addEventListener("change", () => {
    const val = $id("attendanceSection").value;
    saveSelectValue("attendanceSection", val);
    // A section belongs to one year level, so follow it.
    const y = sectionYearOf(val);
    if (y) saveSelectValue("attendanceYear", y);
    renderAttendanceTab();
  });
  // The first section of a year.
  const firstSectionInScope = (year) =>
    Array.from(
      new Set(
        students
          .filter(
            (st) =>
              (!year || String(st.year_level) === year) && st.section,
          )
          .map((st) => st.section),
      ),
    ).sort()[0];
  $id("attendanceYear").addEventListener("change", () => {
    const val = $id("attendanceYear").value;
    saveSelectValue("attendanceYear", val);
    // Keep a section from another year from emptying the roster: move to
    // that year's first section.
    const sec = $id("attendanceSection").value;
    if (sec && sectionYearOf(sec) !== val) {
      saveSelectValue(
        "attendanceSection",
        firstSectionInScope(val) || "",
      );
    }
    renderAttendanceTab();
  });
  $id("attendanceDate").addEventListener("change", renderAttendanceTab);
  $id("attendance-rows").addEventListener("click", onAttendanceRowClick);
  $id("saveAttendance").addEventListener("click", saveAttendance);
  $id("exportAttendance").addEventListener("click", exportAttendanceCsv);

  $id("teacherDept").addEventListener("change", () => {
    saveSelectValue("teacherDept", $id("teacherDept").value);
    populateTeacherControls();
  });
  $id("teacherSelect").addEventListener("change", () => {
    saveSelectValue("teacherSelect", $id("teacherSelect").value);
    // A new teacher may not work the day that was picked.
    fillTeacherDayFilter();
    renderTeacherTab();
  });
  $id("teacherDay").addEventListener("change", () => {
    saveSelectValue("teacherDay", $id("teacherDay").value);
    renderTeacherTab();
  });
  $id("teacher-day").addEventListener("change", (e) => {
    const control = e.target.closest(".teacher-status");
    if (!control) return;
    setClassStatus(Number(control.dataset.schedule), control.value, control);
  });
  $id("schedCancel").addEventListener("click", closeScheduleModal);
  $id("schedModal").addEventListener("click", (e) => {
    if (e.target === $id("schedModal")) closeScheduleModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$id("schedModal").hidden) closeScheduleModal();
    if (e.key === "Escape" && !$id("roomDialog").hidden) closeRoomDialog();
    if (e.key === "Escape" && !$id("conflictModal").hidden) closeConflictModal();
  });
  $id("schedForm").addEventListener("input", () => {
    // Values changed: drop the earlier conflict confirmation so the next
    // submit re-checks overlaps.
    const form = $id("schedForm");
    if (form.dataset.confirmed) resetScheduleConfirm();
  });
  $id("schedForm").addEventListener("submit", submitScheduleForm);
  $id("studentCourse").addEventListener("change", () => {
    saveSelectValue("studentCourse", $id("studentCourse").value);
    populateSectionControls();
  });
  $id("studentYear").addEventListener("change", () => {
    saveSelectValue("studentYear", $id("studentYear").value);
    populateSectionControls();
  });
  $id("sectionSelect").addEventListener("change", () => {
    const sec = $id("sectionSelect").value;
    saveSelectValue("sectionSelect", sec);
    // A section belongs to one department and year, so follow it there.
    saveSelectValue("studentCourse", sectionCourseOf(sec));
    saveSelectValue("studentYear", sectionYearOf(sec));
    populateSectionControls();
  });
  $id("sectionDay").addEventListener("change", () => {
    saveSelectValue("sectionDay", $id("sectionDay").value);
    renderStudentTab();
  });

  $id("room-building-options").addEventListener("click", (e) => {
    const btn = e.target.closest(".room-building-tab");
    if (!btn) return;
    roomBuilding = btn.dataset.building;
    roomFloor = 0;
    saveSelectValue("roomBuilding", roomBuilding);
    renderRoomsTab();
  });
  $id("room-floor-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".room-floor-tab");
    if (!btn) return;
    roomFloor = Number(btn.dataset.floor);
    saveSelectValue("roomFloor", btn.dataset.floor);
    renderRoomsTab();
  });
  $id("roomSearch").addEventListener("input", () => {
    roomQuery = $id("roomSearch").value.trim();
    renderRoomsTab();
  });

  const openTileDialog = (tile) => {
    if (!tile) return;
    const name = tile.querySelector("strong");
    if (name) openRoomDialog(name.textContent);
  };
  $id("room-grid").addEventListener("click", (e) => {
    const tile = e.target.closest(".map-room-tile");
    if (tile) openTileDialog(tile);
  });
  $id("room-grid").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const tile = e.target.closest(".map-room-tile");
    if (!tile) return;
    e.preventDefault();
    openTileDialog(tile);
  });
  $id("roomDialogClose").addEventListener("click", closeRoomDialog);
  $id("roomDialog").addEventListener("click", (e) => {
    if (e.target === $id("roomDialog")) closeRoomDialog();
  });
  $id("conflictFilter").addEventListener("change", () => {
    saveSelectValue("conflictFilter", $id("conflictFilter").value);
    renderConflictsTab();
  });
  $id("conflict-list").addEventListener("click", (e) => {
    // The action buttons live inside the clickable clash card, so they are
    // handled first and stop the card from expanding at the same time.
    const action = e.target.closest("[data-action]");
    if (action) {
      e.stopPropagation();
      const kind = action.dataset.action;

      if (kind === "acknowledge") {
        toggleAcknowledgement(action.dataset.key, action);
        return;
      }

      if (kind === "resolve") {
        const next =
          action.dataset.state === "resolved" ? "Open" : "Resolved";
        setManualConflictStatus(Number(action.dataset.id), next);
        return;
      }

      if (kind === "delete") {
        // A second click confirms, so nothing is removed by accident.
        if (action.dataset.confirm === "1") {
          deleteManualConflict(Number(action.dataset.id));
          return;
        }
        action.dataset.confirm = "1";
        action.textContent = "Confirm delete";
        setTimeout(() => {
          action.dataset.confirm = "0";
          action.textContent = "Delete";
        }, 3000);
        return;
      }
    }

    const item = e.target.closest(".conflict-item.has-detail");
    if (item) toggleConflictItem(item);
  });
  $id("conflict-list").addEventListener("keydown", (e) => {
    if (e.target.closest("[data-action]")) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    const item = e.target.closest(".conflict-item.has-detail");
    if (!item) return;
    e.preventDefault();
    toggleConflictItem(item);
  });
  $id("conflict-source").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg");
    if (!btn) return;
    setConflictSource(btn.dataset.source);
    renderConflictsTab();
  });
  $id("toggleAcknowledged").addEventListener("click", () => {
    showAcknowledged = !showAcknowledged;
    renderConflictsTab();
  });
  $id("reportConflict").addEventListener("click", openConflictModal);
  $id("conflictCancel").addEventListener("click", closeConflictModal);
  $id("conflictForm").addEventListener("submit", submitConflictForm);
  $id("conflictModal").addEventListener("click", (e) => {
    if (e.target === $id("conflictModal")) closeConflictModal();
  });
  $id("rescanConflicts").addEventListener("click", async () => {
    // A re-scan must look at fresh server data, not the snapshot loaded
    // when the page opened. Otherwise newly added schedules never show up.
    const btn = $id("rescanConflicts");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Scanning…";
    try {
      await loadData();
      conflictsCache = computeConflicts();
      populateConflictFilter();
      renderConflictsTab();
      toast(
        conflictsCache.length
          ? "Re-scan complete: " + conflictsCache.length + " conflict(s) found."
          : "Re-scan complete: no conflicts found.",
      );
    } catch (err) {
      toast("Re-scan failed: " + err.message, true);
    } finally {
      btn.textContent = originalLabel;
      btn.disabled = false;
    }
  });

  /* --------------------------- boot + restore tab ------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    let savedTab = null;
    try {
      savedTab = localStorage.getItem("activeTab");
    } catch (err) {
      savedTab = null;
    }
    if (
      savedTab &&
      document.querySelector('#tabs button[data-tab="' + savedTab + '"]')
    ) {
      openTab(savedTab);
    } else if (tabs.length) {
      openTab(tabs[0].dataset.tab);
    }
    setDateInputToToday();
    init();
    // Keep room occupancy live: re-render the map once a minute while the
    // Room Monitoring tab is open, so tiles flip as classes start and end.
    setInterval(() => {
      const panel = $id("panel-rooms");
      if (panel && panel.classList.contains("active")) renderRoomsTab();
    }, 60000);
  });
})();

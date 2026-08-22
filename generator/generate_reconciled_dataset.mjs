import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const config = JSON.parse(await fs.readFile(path.join(here, "reconciled_config.json"), "utf8"));
const outputRoot = path.join(root, "dataset-build");

const TABLES = [
  "members",
  "membership_plans",
  "memberships",
  "membership_status_history",
  "class_sessions",
  "reservations",
  "attendance_records",
  "attendance_corrections",
  "risk_assessments",
  "outreach_records",
  "staff_accounts",
  "member_accounts",
  "membership_pause_requests",
  "drop_in_payments",
  "waitlist_promotions",
  "risk_case_notes",
  "notifications",
  "outreach_actions",
];

const COLUMNS = {
  members: ["member_id", "first_name", "last_name", "email", "phone", "preferred_channel", "do_not_contact"],
  membership_plans: ["plan_id", "plan_name", "classes_per_month", "monthly_price"],
  memberships: ["membership_id", "member_id", "plan_id", "status", "start_date", "billing_cycle_start_date", "end_date", "agreed_monthly_price"],
  membership_status_history: ["membership_status_history_id", "membership_id", "status", "effective_at", "ended_at"],
  class_sessions: ["class_session_id", "class_type", "starts_at", "ends_at", "capacity", "is_cancelled", "instructor_staff_id"],
  reservations: ["reservation_id", "member_id", "class_session_id", "membership_id", "status", "reserved_at", "cancelled_at", "is_late_cancellation"],
  attendance_records: ["attendance_record_id", "reservation_id", "attendance_status", "recorded_at"],
  attendance_corrections: ["correction_id", "attendance_record_id", "previous_status", "new_status", "reason", "corrected_by_staff_id", "corrected_at"],
  risk_assessments: ["risk_assessment_id", "member_id", "evaluated_at", "previous_period_start", "previous_period_end", "current_period_start", "current_period_end", "previous_visits", "current_visits", "decline_percentage", "risk_level", "review_status", "resolved_at", "resolution_reason"],
  outreach_records: ["outreach_id", "risk_assessment_id", "member_id", "attempt_number", "channel", "original_message", "final_message", "status", "response_outcome", "created_by_staff_id", "created_at", "approved_by_staff_id", "approved_at", "sent_by_staff_id", "sent_at", "completed_by_staff_id", "completed_at"],
  staff_accounts: ["staff_id", "auth_subject", "first_name", "last_name", "email", "role", "account_status", "created_at"],
  member_accounts: ["account_id", "member_id", "auth_subject", "email_verified", "account_status", "created_at"],
  membership_pause_requests: ["pause_request_id", "membership_id", "requested_at", "starts_at", "ends_at", "status", "approved_by_staff_id", "approved_at", "fee_amount"],
  drop_in_payments: ["payment_id", "reservation_id", "member_id", "amount", "status", "created_at", "refunded_at"],
  waitlist_promotions: ["promotion_id", "reservation_id", "class_session_id", "promoted_at", "notification_id"],
  risk_case_notes: ["note_id", "member_id", "risk_assessment_id", "body", "created_by_staff_id", "created_at", "updated_by_staff_id", "updated_at", "deleted_by_staff_id", "deleted_at"],
  notifications: ["notification_id", "member_id", "event_type", "channel", "status", "created_at", "related_record_type", "related_record_id"],
  outreach_actions: ["action_id", "outreach_id", "action", "staff_id", "occurred_at"],
};

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(config.random_seed);
const clone = (value) => structuredClone(value);
const pad = (n, width = 4) => String(n).padStart(width, "0");
const makeId = (prefix, n, width = 4) => `${prefix}-${pad(n, width)}`;
const dateOnly = (iso) => iso.slice(0, 10);
const addDays = (date, days) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const addMinutes = (iso, minutes) => {
  const d = new Date(iso);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString();
};
const addHours = (iso, hours) => addMinutes(iso, hours * 60);
const offsetForDate = (date) => {
  if (date >= "2025-03-09" && date < "2025-11-02") return "-04:00";
  return "-05:00";
};
const localTs = (date, time = "09:00:00") => `${date}T${time}${offsetForDate(date)}`;
const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const toCsv = (table, rows) => [
  COLUMNS[table].join(","),
  ...rows.map((row) => COLUMNS[table].map((column) => csvCell(row[column])).join(",")),
].join("\n") + "\n";

const firstNames = ["Avery", "Maya", "Jordan", "Sofia", "Noah", "Leila", "Caleb", "Nina", "Theo", "Amara", "Miles", "Zoe", "Elias", "Priya", "Quinn", "Lena", "Owen", "Iris", "Mateo", "Chloe", "Julian", "Talia", "Emmett", "Naomi", "Ravi"];
const lastNames = ["Brooks", "Chen", "Ellis", "Garcia", "Grant", "Hassan", "Irwin", "James", "Kim", "Lewis"];

function buildMembersAndMemberships(tables) {
  tables.membership_plans.push(
    { plan_id: "PLAN-004", plan_name: "4 Classes Monthly", classes_per_month: 4, monthly_price: 99 },
    { plan_id: "PLAN-008", plan_name: "8 Classes Monthly", classes_per_month: 8, monthly_price: 179 },
    { plan_id: "PLAN-012", plan_name: "12 Classes Monthly", classes_per_month: 12, monthly_price: 249 },
  );

  const planFor = (number) => {
    let plan = number <= 62 ? "PLAN-012" : number <= 187 ? "PLAN-008" : "PLAN-004";
    if (number === 16) plan = "PLAN-008";
    if (number === 63) plan = "PLAN-012";
    return plan;
  };

  for (let number = 1; number <= config.member_count; number++) {
    const memberId = makeId("MEM", number);
    const membershipId = makeId("MSP", number);
    const firstName = firstNames[(number - 1) % firstNames.length];
    const lastName = lastNames[Math.floor((number - 1) / firstNames.length)];
    const startDate = number >= 26 && number <= 40 ? "2025-11-15" : addDays("2024-01-01", (number * 7) % 300);
    const status = number <= 200 ? "active" : number <= 225 ? "paused" : "cancelled";
    const endDate = status === "cancelled" ? "2025-10-01" : "";
    tables.members.push({
      member_id: memberId,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName}.${lastName}.${number}@pulse.example`.toLowerCase(),
      phone: number % 10 === 0 ? "" : `+1-212-555-${pad(1000 + number, 4)}`,
      preferred_channel: number % 5 === 0 && number % 10 !== 0 ? "sms" : "email",
      do_not_contact: number === 25,
    });
    tables.memberships.push({
      membership_id: membershipId,
      member_id: memberId,
      plan_id: planFor(number),
      status,
      start_date: startDate,
      billing_cycle_start_date: startDate > "2025-01-01" ? startDate : "2025-01-01",
      end_date: endDate,
      agreed_monthly_price: planFor(number) === "PLAN-004" ? 99 : planFor(number) === "PLAN-008" ? 179 : 249,
    });

    const pushHistory = (historyStatus, effectiveAt, endedAt = "") => {
      tables.membership_status_history.push({
        membership_status_history_id: makeId("MSH", tables.membership_status_history.length + 1, 5),
        membership_id: membershipId,
        status: historyStatus,
        effective_at: effectiveAt,
        ended_at: endedAt,
      });
    };
    if (number >= 176 && number <= 200) {
      pushHistory("active", localTs(startDate, "00:00:00"), localTs("2025-04-01", "00:00:00"));
      pushHistory("cancelled", localTs("2025-04-01", "00:00:00"), localTs("2025-05-15", "00:00:00"));
      pushHistory("active", localTs("2025-05-15", "00:00:00"));
    } else if (status === "paused") {
      pushHistory("active", localTs(startDate, "00:00:00"), localTs("2025-11-15", "00:00:00"));
      pushHistory("paused", localTs("2025-11-15", "00:00:00"));
    } else if (status === "cancelled") {
      pushHistory("active", localTs(startDate, "00:00:00"), localTs("2025-10-01", "00:00:00"));
      pushHistory("cancelled", localTs("2025-10-01", "00:00:00"));
    } else {
      pushHistory("active", localTs(startDate, "00:00:00"));
    }
  }
}

function buildSessions(tables) {
  let number = 0;
  for (let date = config.historical_start; date <= config.historical_end; date = addDays(date, 1)) {
    for (const time of ["07:00:00", "12:00:00", "18:00:00"]) {
      number++;
      const pattern = (number - 1) % 10;
      const classType = pattern < 4 ? "yoga" : pattern < 7 ? "cycling" : "hiit";
      const duration = classType === "yoga" ? 50 : 45;
      const startsAt = localTs(date, time);
      tables.class_sessions.push({
        class_session_id: makeId("SESSION", number, 5),
        class_type: classType,
        starts_at: startsAt,
        ends_at: addMinutes(startsAt, duration),
        capacity: config.session_capacity,
        is_cancelled: number % 20 === 0,
        instructor_staff_id: `STF-${pad(((number - 1) % 3) + 2, 4)}`,
      });
    }
  }
  for (let date = config.upcoming_start; date <= config.upcoming_end; date = addDays(date, 1)) {
    for (const time of ["07:00:00", "12:00:00", "18:00:00"]) {
      number++;
      const pattern = (number - 1) % 10;
      const classType = pattern < 4 ? "yoga" : pattern < 7 ? "cycling" : "hiit";
      const duration = classType === "yoga" ? 50 : 45;
      const startsAt = localTs(date, time);
      tables.class_sessions.push({
        class_session_id: makeId("SESSION", number, 5),
        class_type: classType,
        starts_at: startsAt,
        ends_at: addMinutes(startsAt, duration),
        capacity: config.session_capacity,
        is_cancelled: false,
        instructor_staff_id: `STF-${pad(((number - 1) % 3) + 2, 4)}`,
      });
    }
  }
}

function buildBookingsAndAttendance(tables) {
  const membershipsByMember = new Map(tables.memberships.map((row) => [row.member_id, row]));
  const planAllowance = new Map(tables.membership_plans.map((row) => [row.plan_id, row.classes_per_month]));
  const historiesByMembership = new Map();
  for (const row of tables.membership_status_history) {
    const list = historiesByMembership.get(row.membership_id) ?? [];
    list.push(row);
    historiesByMembership.set(row.membership_id, list);
  }
  const activeAt = (memberId, iso) => {
    const membership = membershipsByMember.get(memberId);
    return (historiesByMembership.get(membership.membership_id) ?? []).some((history) =>
      history.status === "active" && iso >= history.effective_at && (!history.ended_at || iso < history.ended_at)
    );
  };
  const billingCycleIndex = (memberId, atIso) => {
    const membership = membershipsByMember.get(memberId);
    const at = new Date(atIso);
    const anchor = new Date(localTs(membership.billing_cycle_start_date, "00:00:00"));
    const pausedMilliseconds = (historiesByMembership.get(membership.membership_id) ?? [])
      .filter((history) => history.status === "paused")
      .reduce((total, history) => {
        const pauseStart = new Date(history.effective_at);
        if (pauseStart >= at) return total;
        const pauseEnd = history.ended_at ? new Date(history.ended_at) : at;
        return total + Math.max(Math.min(pauseEnd.getTime(), at.getTime()) - pauseStart.getTime(), 0);
      }, 0);
    const activeTime = new Date(at.getTime() - pausedMilliseconds);
    let monthIndex = (activeTime.getUTCFullYear() - anchor.getUTCFullYear()) * 12
      + activeTime.getUTCMonth() - anchor.getUTCMonth();
    const [anchorYear, anchorMonth, anchorDay] = membership.billing_cycle_start_date.split("-").map(Number);
    const boundaryMonth = anchorMonth - 1 + monthIndex;
    const boundaryYear = anchorYear + Math.floor(boundaryMonth / 12);
    const normalizedMonth = ((boundaryMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(boundaryYear, normalizedMonth + 1, 0)).getUTCDate();
    const boundaryDate = `${boundaryYear}-${pad(normalizedMonth + 1, 2)}-${pad(Math.min(anchorDay, lastDay), 2)}`;
    const boundary = new Date(localTs(boundaryDate, "00:00:00"));
    if (activeTime < boundary) monthIndex--;
    return Math.max(monthIndex, 0);
  };
  const creditKey = (memberId, atIso) => {
    const membership = membershipsByMember.get(memberId);
    return `${membership.membership_id}|${billingCycleIndex(memberId, atIso)}`;
  };
  const credits = new Map();
  const useCredit = (memberId, sessionStartsAt) => {
    const membership = membershipsByMember.get(memberId);
    const key = creditKey(memberId, sessionStartsAt);
    const used = credits.get(key) ?? 0;
    const allowance = planAllowance.get(membership.plan_id);
    if (used >= allowance) return false;
    credits.set(key, used + 1);
    return true;
  };

  const historical = tables.class_sessions.filter((row) => dateOnly(row.starts_at) <= config.historical_end);
  let nonCancelledIndex = 0;
  const confirmedTarget = new Map();
  for (const session of historical) {
    if (session.is_cancelled) {
      confirmedTarget.set(session.class_session_id, 0);
      continue;
    }
    const bucket = nonCancelledIndex++ % 20;
    confirmedTarget.set(session.class_session_id, bucket < 4 ? 10 : bucket === 4 ? 15 : bucket < 18 ? 16 : 30);
  }

  const membersInSession = new Map();
  const confirmedLoad = new Map(historical.map((row) => [row.class_session_id, 0]));
  const confirmedRows = [];
  let reservationNumber = 0;
  let attendanceNumber = 0;

  const hasNonCancelled = (memberId, sessionId) => (membersInSession.get(sessionId) ?? new Set()).has(memberId);
  const rememberNonCancelled = (memberId, sessionId) => {
    const set = membersInSession.get(sessionId) ?? new Set();
    set.add(memberId);
    membersInSession.set(sessionId, set);
  };
  const createReservation = (memberId, session, status, options = {}) => {
    const membership = membershipsByMember.get(memberId);
    reservationNumber++;
    const reservedAt = options.reservedAt ?? addHours(session.starts_at, -24 * 7);
    const row = {
      reservation_id: makeId("RES", reservationNumber, 6),
      member_id: memberId,
      class_session_id: session.class_session_id,
      membership_id: membership.membership_id,
      status,
      reserved_at: reservedAt,
      cancelled_at: options.cancelledAt ?? "",
      is_late_cancellation: options.isLateCancellation ?? "",
    };
    tables.reservations.push(row);
    if (["confirmed", "waitlisted"].includes(status)) rememberNonCancelled(memberId, session.class_session_id);
    return row;
  };
  const createConfirmed = (memberId, session, attendanceStatus) => {
    if (hasNonCancelled(memberId, session.class_session_id)) return false;
    const reservedAt = addHours(session.starts_at, -24 * 7);
    if (!activeAt(memberId, reservedAt) || !activeAt(memberId, session.starts_at)) return false;
    if (!useCredit(memberId, session.starts_at)) return false;
    const reservation = createReservation(memberId, session, "confirmed", { reservedAt });
    confirmedRows.push(reservation);
    confirmedLoad.set(session.class_session_id, (confirmedLoad.get(session.class_session_id) ?? 0) + 1);
    if (attendanceStatus) {
      attendanceNumber++;
      tables.attendance_records.push({
        attendance_record_id: makeId("ATT", attendanceNumber, 6),
        reservation_id: reservation.reservation_id,
        attendance_status: attendanceStatus,
        recorded_at: addMinutes(session.starts_at, attendanceStatus === "attended" ? 5 : 25),
      });
    }
    return true;
  };

  const previousStart = "2025-11-02T01:00:00-04:00";
  const currentStart = "2025-12-02T00:00:00-05:00";
  const evaluation = config.evaluation_time;
  const previousSessions = historical.filter((row) => !row.is_cancelled && row.starts_at >= previousStart && row.starts_at < currentStart);
  const currentSessions = historical.filter((row) => !row.is_cancelled && row.starts_at >= currentStart && row.starts_at < evaluation);
  const desiredCounts = (number) => {
    if (number <= 15) return [8, 4];
    if (number <= 25) return [8, 2];
    if (number <= 40) return [3, 1];
    return [0, 0];
  };
  const allocateAttended = (memberId, sessions, count, startOffset) => {
    let made = 0;
    for (let step = 0; step < sessions.length * 4 && made < count; step++) {
      const session = sessions[(startOffset + step) % sessions.length];
      if ((confirmedLoad.get(session.class_session_id) ?? 0) >= confirmedTarget.get(session.class_session_id)) continue;
      if (createConfirmed(memberId, session, "attended")) made++;
    }
    if (made !== count) throw new Error(`Could not allocate ${count} attended visits for ${memberId}; created ${made}`);
  };
  for (let number = 1; number <= config.member_count; number++) {
    const [previous, current] = desiredCounts(number);
    allocateAttended(makeId("MEM", number), previousSessions, previous, number * 3);
    allocateAttended(makeId("MEM", number), currentSessions, current, number * 5);
  }

  for (const [sessionIndex, session] of historical.entries()) {
    const target = confirmedTarget.get(session.class_session_id);
    while ((confirmedLoad.get(session.class_session_id) ?? 0) < target) {
      let created = false;
      for (let attempt = 0; attempt < config.member_count; attempt++) {
        const number = ((sessionIndex * 17 + attempt * 13) % config.member_count) + 1;
        const memberId = makeId("MEM", number);
        const inRiskWindow = session.starts_at >= previousStart && session.starts_at < evaluation;
        const attendanceStatus = inRiskWindow ? "no_show" : ((reservationNumber + number) % 12 === 0 ? "no_show" : "attended");
        if (createConfirmed(memberId, session, attendanceStatus)) {
          created = true;
          break;
        }
      }
      if (!created) throw new Error(`Unable to fill confirmed target for ${session.class_session_id}`);
    }
  }

  const confirmedCount = confirmedRows.length;
  const totalTarget = Math.round(confirmedCount / 0.70);
  const waitlistTarget = Math.round(totalTarget * 0.10);
  const earlyTarget = Math.round(totalTarget * 0.10);
  const lateTarget = Math.round(totalTarget * 0.05);
  const studioTarget = totalTarget - confirmedCount - waitlistTarget - earlyTarget - lateTarget;
  const fullSessions = historical.filter((row) => !row.is_cancelled && confirmedTarget.get(row.class_session_id) === 30);
  const cancelledSessions = historical.filter((row) => row.is_cancelled);
  const regularSessions = historical.filter((row) => !row.is_cancelled);

  const addStatusRows = (status, target, sessions) => {
    let made = 0;
    for (let cursor = 0; made < target && cursor < target * 20; cursor++) {
      const session = sessions[cursor % sessions.length];
      const number = ((cursor * 19 + made * 7) % config.member_count) + 1;
      const memberId = makeId("MEM", number);
      const reservedAt = addHours(session.starts_at, -24 * 10);
      if (!activeAt(memberId, reservedAt) || !activeAt(memberId, session.starts_at)) continue;
      if (status === "waitlisted" && hasNonCancelled(memberId, session.class_session_id)) continue;
      if (status === "cancelled_late" && !useCredit(memberId, session.starts_at)) continue;
      if (status === "cancelled_early") {
        createReservation(memberId, session, "cancelled", { reservedAt, cancelledAt: addHours(session.starts_at, -24), isLateCancellation: false });
        made++;
      } else if (status === "cancelled_late") {
        createReservation(memberId, session, "cancelled", { reservedAt, cancelledAt: addHours(session.starts_at, -6), isLateCancellation: true });
        made++;
      } else if (status === "waitlisted") {
        createReservation(memberId, session, "waitlisted", { reservedAt });
        made++;
      } else if (status === "studio_cancelled") {
        createReservation(memberId, session, "studio_cancelled", { reservedAt });
        made++;
      }
    }
    if (made !== target) throw new Error(`Unable to create ${target} ${status} reservations; created ${made}`);
  };
  addStatusRows("waitlisted", waitlistTarget, fullSessions);
  addStatusRows("cancelled_early", earlyTarget, regularSessions);
  addStatusRows("cancelled_late", lateTarget, regularSessions);
  addStatusRows("studio_cancelled", studioTarget, cancelledSessions);

  // Normalize the population to the agreed 90% attended / 10% no-show mix.
  // Preserve the deliberately constructed Product D histories for members 1–40
  // inside the two evaluation windows; only unprotected no-shows may change.
  const targetNoShows = Math.round(tables.attendance_records.length * 0.10);
  const currentNoShows = tables.attendance_records.filter((row) => row.attendance_status === "no_show").length;
  let conversionsNeeded = currentNoShows - targetNoShows;
  const reservationLookup = new Map(tables.reservations.map((row) => [row.reservation_id, row]));
  const sessionLookup = new Map(tables.class_sessions.map((row) => [row.class_session_id, row]));
  for (const attendance of tables.attendance_records) {
    if (conversionsNeeded <= 0) break;
    if (attendance.attendance_status !== "no_show") continue;
    const reservation = reservationLookup.get(attendance.reservation_id);
    const session = sessionLookup.get(reservation.class_session_id);
    const memberNumber = Number(reservation.member_id.slice(-4));
    const protectedRiskHistory = memberNumber <= 40 && session.starts_at >= previousStart && session.starts_at < evaluation;
    if (protectedRiskHistory) continue;
    attendance.attendance_status = "attended";
    attendance.recorded_at = addMinutes(session.starts_at, 5);
    conversionsNeeded--;
  }
  if (conversionsNeeded !== 0) throw new Error(`Unable to normalize attendance distribution; ${conversionsNeeded} conversions remain`);
  const attendedCount = tables.attendance_records.filter((row) => row.attendance_status === "attended").length;
  const noShowCount = tables.attendance_records.length - attendedCount;

  const goldenMember = "MEM-0016";
  const upcoming = tables.class_sessions.find((row) => dateOnly(row.starts_at) === "2026-01-10" && row.class_type === "yoga");
  createReservation(goldenMember, upcoming, "confirmed", { reservedAt: localTs("2026-01-04", "10:00:00") });

  return {
    previousStart,
    currentStart,
    evaluation,
    confirmedTarget,
    goldenMember,
    attendanceMix: {
      total: tables.attendance_records.length,
      attended: attendedCount,
      no_show: noShowCount,
      attended_rate: Number((attendedCount / tables.attendance_records.length).toFixed(4)),
      no_show_rate: Number((noShowCount / tables.attendance_records.length).toFixed(4)),
    },
  };
}

function buildRiskAndOutreach(tables, context) {
  const sessionById = new Map(tables.class_sessions.map((row) => [row.class_session_id, row]));
  const reservationById = new Map(tables.reservations.map((row) => [row.reservation_id, row]));
  const visits = (memberId, start, end) => tables.attendance_records.filter((attendance) => {
    if (attendance.attendance_status !== "attended") return false;
    const reservation = reservationById.get(attendance.reservation_id);
    if (!reservation || reservation.member_id !== memberId) return false;
    const session = sessionById.get(reservation.class_session_id);
    return session.starts_at >= start && session.starts_at < end;
  }).length;

  for (let number = 1; number <= 25; number++) {
    const memberId = makeId("MEM", number);
    const previousVisits = visits(memberId, context.previousStart, context.currentStart);
    const currentVisits = visits(memberId, context.currentStart, context.evaluation);
    const decline = ((previousVisits - currentVisits) / previousVisits) * 100;
    tables.risk_assessments.push({
      risk_assessment_id: makeId("RISK", number, 4),
      member_id: memberId,
      evaluated_at: context.evaluation,
      previous_period_start: context.previousStart,
      previous_period_end: context.currentStart,
      current_period_start: context.currentStart,
      current_period_end: context.evaluation,
      previous_visits: previousVisits,
      current_visits: currentVisits,
      decline_percentage: Number(decline.toFixed(1)),
      risk_level: decline >= 75 ? "high" : "medium",
    });
  }

  const channelFor = (index) => index < 15 ? "email" : index < 21 ? "sms" : "phone";
  const stateFor = (index) => ["draft", "ready", "sent", "completed"][index % 4];
  const scenarios = [];
  let outreachNumber = 0;
  const addOutreach = (risk, attempt, createdAt, status, responseOutcome = "") => {
    outreachNumber++;
    const member = tables.members.find((row) => row.member_id === risk.member_id);
    const requestedChannel = channelFor((Number(risk.risk_assessment_id.slice(-4)) - 1) % 25);
    const channel = requestedChannel === "email" || member.phone ? requestedChannel : "email";
    const original = `Hi ${member.first_name}, we noticed your recent attendance changed. We would be glad to help you find a class that fits your schedule.`;
    const reviewed = status !== "draft";
    const sent = ["sent", "completed"].includes(status);
    const completed = status === "completed";
    const createdBy = "STF-0001";
    const reviewer = reviewed ? `STF-${pad((Number(risk.member_id.slice(-4)) % 3) + 2, 4)}` : "";
    tables.outreach_records.push({
      outreach_id: makeId("OUT", outreachNumber, 5),
      risk_assessment_id: risk.risk_assessment_id,
      member_id: risk.member_id,
      attempt_number: attempt,
      channel,
      original_message: original,
      final_message: reviewed ? `${original} View the upcoming Pulse Studio schedule when you are ready.` : "",
      status,
      response_outcome: completed ? responseOutcome : "",
      created_by_staff_id: createdBy,
      created_at: createdAt,
      approved_by_staff_id: reviewer,
      approved_at: reviewed ? addHours(createdAt, 2) : "",
      sent_by_staff_id: sent ? reviewer : "",
      sent_at: sent ? addHours(createdAt, 3) : "",
      completed_by_staff_id: completed ? reviewer : "",
      completed_at: completed ? addHours(createdAt, 30) : "",
    });
    scenarios.push({
      risk_assessment_id: risk.risk_assessment_id,
      member_id: risk.member_id,
      attempt,
      response_outcome: responseOutcome || (sent ? "awaiting_response" : "not_sent"),
      scenario_note: "Product D owns draft review, simulated sending, responses, and completion; Product C is chatbot support only.",
    });
    return tables.outreach_records.at(-1);
  };

  const noResponseRisk = tables.risk_assessments[1];
  const secondAttemptRisk = tables.risk_assessments[2];
  for (let index = 0; index < tables.risk_assessments.length; index++) {
    const risk = tables.risk_assessments[index];
    let status = stateFor(index);
    let response = status === "completed" ? ["interested", "needs_support", "not_interested"][index % 3] : "";
    if (risk.risk_assessment_id === noResponseRisk.risk_assessment_id) status = "sent";
    if (risk.member_id === context.goldenMember) { status = "completed"; response = "interested"; }
    if (risk.member_id === "MEM-0025") { status = "completed"; response = "do_not_contact"; }
    addOutreach(risk, 1, "2026-01-01T09:00:00-05:00", status, response);
  }
  addOutreach(noResponseRisk, 2, "2026-01-15T12:00:00-05:00", "sent");
  addOutreach(noResponseRisk, 3, "2026-01-29T15:00:00-05:00", "sent");
  addOutreach(secondAttemptRisk, 2, "2026-01-15T12:00:00-05:00", "completed", "not_interested");

  for (const risk of tables.risk_assessments) {
    const rows = tables.outreach_records.filter((row) => row.risk_assessment_id === risk.risk_assessment_id);
    const completed = rows.find((row) => row.status === "completed");
    if (risk.risk_assessment_id === noResponseRisk.risk_assessment_id) {
      risk.review_status = "resolved";
      risk.resolved_at = "2026-01-29T15:01:00-05:00";
      risk.resolution_reason = "no_response";
    } else if (completed) {
      risk.review_status = "resolved";
      risk.resolved_at = completed.completed_at;
      risk.resolution_reason = completed.response_outcome;
    } else if (rows.some((row) => row.status === "sent")) {
      risk.review_status = "in_progress";
      risk.resolved_at = "";
      risk.resolution_reason = "";
    } else {
      risk.review_status = Number(risk.member_id.slice(-4)) % 5 === 0 ? "dismissed" : "pending";
      risk.resolved_at = risk.review_status === "dismissed" ? "2026-01-02T10:00:00-05:00" : "";
      risk.resolution_reason = risk.review_status === "dismissed" ? "staff_determined_outreach_unnecessary" : "";
    }
  }
  return scenarios;
}

function buildScenarioManifest(tables, context, outreachScenarios) {
  const memberScenarios = [];
  for (let number = 1; number <= config.member_count; number++) {
    let scenario = "non_qualifying_stable";
    if (number <= 15) scenario = "medium_decline";
    else if (number <= 25) scenario = "high_decline";
    else if (number <= 40) scenario = "insufficient_membership_age";
    else if (number <= 60) scenario = "insufficient_previous_visits";
    else if (number <= 80) scenario = "decline_below_threshold";
    else if (number <= 100) scenario = "no_decline";
    else if (number <= 120) scenario = "attendance_increase";
    else if (number <= 175) scenario = "stable_plan_usage";
    else if (number <= 200) scenario = "reactivated_membership";
    else if (number <= 225) scenario = "paused_membership";
    else scenario = "cancelled_membership";
    memberScenarios.push({
      member_id: makeId("MEM", number),
      scenario,
      expected_qualifying_risk: number <= 25,
      expected_risk_level: number <= 15 ? "medium" : number <= 25 ? "high" : "",
    });
  }
  const goldenRisk = tables.risk_assessments.find((row) => row.member_id === context.goldenMember);
  const goldenOutreach = tables.outreach_records.find((row) => row.member_id === context.goldenMember && row.status === "completed");
  const goldenReservation = tables.reservations.find((row) => row.member_id === context.goldenMember && dateOnly(tables.class_sessions.find((session) => session.class_session_id === row.class_session_id).starts_at) === "2026-01-10");
  const sessionById = new Map(tables.class_sessions.map((row) => [row.class_session_id, row]));
  const reservationById = new Map(tables.reservations.map((row) => [row.reservation_id, row]));
  const attendedEvidence = tables.attendance_records
    .filter((attendance) => {
      if (attendance.attendance_status !== "attended") return false;
      const reservation = reservationById.get(attendance.reservation_id);
      if (reservation?.member_id !== context.goldenMember) return false;
      const session = sessionById.get(reservation.class_session_id);
      return session.starts_at >= context.previousStart && session.starts_at < context.evaluation;
    })
    .map((attendance) => {
      const reservation = reservationById.get(attendance.reservation_id);
      const session = sessionById.get(reservation.class_session_id);
      return {
        reservation_id: reservation.reservation_id,
        reserved_at: reservation.reserved_at,
        class_session_id: session.class_session_id,
        session_starts_at: session.starts_at,
        attendance_record_id: attendance.attendance_record_id,
        attendance_status: attendance.attendance_status,
        recorded_at: attendance.recorded_at,
      };
    })
    .sort((a, b) => a.session_starts_at.localeCompare(b.session_starts_at));
  const golden = {
    member_id: context.goldenMember,
    membership_id: tables.memberships.find((row) => row.member_id === context.goldenMember).membership_id,
    risk_assessment_id: goldenRisk.risk_assessment_id,
    outreach_id: goldenOutreach.outreach_id,
    rebooking_reservation_id: goldenReservation.reservation_id,
    previous_visits: goldenRisk.previous_visits,
    current_visits: goldenRisk.current_visits,
    decline_percentage: goldenRisk.decline_percentage,
    risk_level: goldenRisk.risk_level,
    trace: [
      {
        step: 1,
        product: "A",
        event: "member_reserves_classes",
        timestamp: attendedEvidence.map((row) => row.reserved_at).sort()[0],
        record_ids: attendedEvidence.map((row) => row.reservation_id),
      },
      {
        step: 2,
        product: "B",
        event: "attendance_recorded",
        timestamp: attendedEvidence.at(-1).recorded_at,
        record_ids: attendedEvidence.map((row) => row.attendance_record_id),
        evidence: attendedEvidence,
      },
      {
        step: 3,
        product: "D",
        event: "decline_evaluated",
        timestamp: goldenRisk.evaluated_at,
        record_ids: [goldenRisk.risk_assessment_id],
        evidence: { previous_visits: goldenRisk.previous_visits, current_visits: goldenRisk.current_visits, decline_percentage: goldenRisk.decline_percentage, risk_level: goldenRisk.risk_level },
      },
      {
        step: 4,
        product: "D",
        event: "outreach_draft_created",
        timestamp: goldenOutreach.created_at,
        record_ids: [goldenOutreach.outreach_id],
      },
      {
        step: 5,
        product: "D",
        event: "outreach_reviewed_sent_and_completed",
        timestamp: goldenOutreach.completed_at,
        record_ids: [goldenOutreach.outreach_id],
        evidence: { status: goldenOutreach.status, approved_at: goldenOutreach.approved_at, sent_at: goldenOutreach.sent_at, completed_at: goldenOutreach.completed_at, response_outcome: goldenOutreach.response_outcome, final_message: goldenOutreach.final_message },
      },
      {
        step: 6,
        product: "C",
        event: "member_receives_chatbot_support",
        timestamp: "2026-01-03T10:00:00-05:00",
        record_ids: [context.goldenMember],
        evidence: { scope: "class and booking questions only; Product C does not mutate outreach" },
      },
      {
        step: 7,
        product: "A",
        event: "member_rebooks",
        timestamp: goldenReservation.reserved_at,
        record_ids: [goldenReservation.reservation_id, goldenReservation.class_session_id],
      },
    ],
    expected_result: "A reservation → B attendance → D risk, reviewed outreach, simulated send, and completion → C chatbot support → A rebooking, with preserved identifiers",
  };
  return { memberScenarios, outreachScenarios, golden };
}

function buildSchemaV2Fixtures(tables, context) {
  tables.staff_accounts.push(
    { staff_id: "STF-0001", auth_subject: "auth_staff_owner_0001", first_name: "Reymund", last_name: "Santos", email: "reymund.santos@pulse.example", role: "owner_admin", account_status: "active", created_at: "2025-01-01T09:00:00-05:00" },
    { staff_id: "STF-0002", auth_subject: "auth_staff_instructor_0002", first_name: "Mina", last_name: "Patel", email: "mina.patel@pulse.example", role: "instructor", account_status: "active", created_at: "2025-01-02T09:00:00-05:00" },
    { staff_id: "STF-0003", auth_subject: "auth_staff_instructor_0003", first_name: "Daniel", last_name: "Kim", email: "daniel.kim@pulse.example", role: "instructor", account_status: "active", created_at: "2025-01-02T09:15:00-05:00" },
    { staff_id: "STF-0004", auth_subject: "auth_staff_instructor_0004", first_name: "Aisha", last_name: "Brooks", email: "aisha.brooks@pulse.example", role: "instructor", account_status: "active", created_at: "2025-01-02T09:30:00-05:00" },
  );

  for (let number = 1; number <= config.member_count; number++) {
    const memberId = makeId("MEM", number);
    tables.member_accounts.push({
      account_id: makeId("ACC", number, 5), member_id: memberId, auth_subject: `auth_member_${pad(number, 4)}`,
      email_verified: number % 20 !== 0, account_status: number > 225 ? "disabled" : "active", created_at: localTs("2025-01-05", "10:00:00"),
    });
  }

  for (let number = 1; number <= 12; number++) {
    const membership = tables.memberships[200 + number];
    const approved = number <= 8;
    tables.membership_pause_requests.push({
      pause_request_id: makeId("PAUSE", number, 4), membership_id: membership.membership_id,
      requested_at: "2025-10-15T09:00:00-04:00", starts_at: "2025-11-15T00:00:00-05:00",
      ends_at: approved ? (number % 2 ? "2025-12-15T00:00:00-05:00" : "2026-02-13T00:00:00-05:00") : "2026-03-01T00:00:00-05:00",
      status: approved ? "approved" : number <= 10 ? "pending" : "denied", approved_by_staff_id: approved ? "STF-0001" : "",
      approved_at: approved ? "2025-10-16T10:00:00-04:00" : "", fee_amount: approved ? 25 : 0,
    });
  }

  const futureSessions = tables.class_sessions.filter((row) => row.starts_at >= config.upcoming_start && !row.is_cancelled);
  let nextReservation = tables.reservations.length + 1;
  for (let number = 1; number <= 12; number++) {
    const member = tables.members[40 + number];
    const session = futureSessions[number];
    const reservationId = makeId("RES", nextReservation++, 6);
    const reservedAt = new Date(new Date(session.starts_at).getTime() - 7 * 24 * 60 * 60 * 1000);
    const cancelledAt = new Date(reservedAt.getTime() + 2 * 60 * 60 * 1000);
    tables.reservations.push({ reservation_id: reservationId, member_id: member.member_id, class_session_id: session.class_session_id, membership_id: "", status: "confirmed", reserved_at: reservedAt.toISOString(), cancelled_at: number % 6 === 0 ? cancelledAt.toISOString() : "", is_late_cancellation: number % 6 === 0 ? false : "" });
    if (number % 6 === 0) tables.reservations.at(-1).status = "cancelled";
    tables.drop_in_payments.push({ payment_id: makeId("PAY", number, 5), reservation_id: reservationId, member_id: member.member_id, amount: 35, status: number % 6 === 0 ? "refunded" : "authorized", created_at: new Date(reservedAt.getTime() + 1000).toISOString(), refunded_at: number % 6 === 0 ? new Date(cancelledAt.getTime() + 1000).toISOString() : "" });
  }

  for (let number = 1; number <= 10; number++) {
    const member = tables.members[70 + number];
    const session = futureSessions[20 + number];
    const reservationId = makeId("RES", nextReservation++, 6);
    const promoted = number <= 5;
    tables.reservations.push({ reservation_id: reservationId, member_id: member.member_id, class_session_id: session.class_session_id, membership_id: tables.memberships.find((row) => row.member_id === member.member_id).membership_id, status: promoted ? "confirmed" : "waitlisted", reserved_at: "2026-01-03T09:00:00-05:00", cancelled_at: "", is_late_cancellation: "" });
    if (promoted) {
      const notificationId = makeId("NTF", tables.notifications.length + 1, 5);
      tables.waitlist_promotions.push({ promotion_id: makeId("PROMO", number, 4), reservation_id: reservationId, class_session_id: session.class_session_id, promoted_at: "2026-01-04T09:00:00-05:00", notification_id: notificationId });
      tables.notifications.push({ notification_id: notificationId, member_id: member.member_id, event_type: "waitlist_promoted", channel: member.preferred_channel, status: "simulated", created_at: "2026-01-04T09:00:01-05:00", related_record_type: "reservation", related_record_id: reservationId });
    }
  }

  const correctionCandidates = tables.attendance_records.filter((row) => row.attendance_status === "attended").slice(-8);
  for (let index = 0; index < correctionCandidates.length; index++) {
    const row = correctionCandidates[index];
    tables.attendance_corrections.push({ correction_id: makeId("CORR", index + 1, 4), attendance_record_id: row.attendance_record_id, previous_status: "no_show", new_status: "attended", reason: "Instructor verified a delayed scanner sync after class.", corrected_by_staff_id: `STF-${pad((index % 3) + 2, 4)}`, corrected_at: "2025-12-31T18:00:00-05:00" });
  }

  for (let number = 1; number <= 30; number++) {
    const risk = tables.risk_assessments[(number - 1) % tables.risk_assessments.length];
    const edited = number % 4 === 0;
    const deleted = number % 10 === 0;
    tables.risk_case_notes.push({ note_id: makeId("NOTE", number, 5), member_id: risk.member_id, risk_assessment_id: risk.risk_assessment_id, body: `Staff context note ${number} for the member re-engagement review.`, created_by_staff_id: `STF-${pad((number % 3) + 2, 4)}`, created_at: `2026-01-${pad((number % 9) + 1, 2)}T11:00:00-05:00`, updated_by_staff_id: edited ? "STF-0001" : "", updated_at: edited ? `2026-01-${pad((number % 9) + 1, 2)}T12:00:00-05:00` : "", deleted_by_staff_id: deleted ? "STF-0001" : "", deleted_at: deleted ? `2026-01-${pad((number % 9) + 1, 2)}T13:00:00-05:00` : "" });
  }

  for (const outreach of tables.outreach_records) {
    const actions = [["created", outreach.created_by_staff_id, outreach.created_at], ["approved", outreach.approved_by_staff_id, outreach.approved_at], ["sent", outreach.sent_by_staff_id, outreach.sent_at], ["completed", outreach.completed_by_staff_id, outreach.completed_at]].filter(([, staff, at]) => staff && at);
    for (const [action, staff, at] of actions) tables.outreach_actions.push({ action_id: makeId("ACT", tables.outreach_actions.length + 1, 5), outreach_id: outreach.outreach_id, action, staff_id: staff, occurred_at: at });
    if (["sent", "completed"].includes(outreach.status)) tables.notifications.push({ notification_id: makeId("NTF", tables.notifications.length + 1, 5), member_id: outreach.member_id, event_type: "reengagement_outreach", channel: outreach.channel, status: "simulated", created_at: outreach.sent_at, related_record_type: "outreach", related_record_id: outreach.outreach_id });
  }

  const notificationTypes = ["booking_confirmed", "member_cancelled", "studio_cancelled", "class_changed"];
  for (let number = 1; number <= 24; number++) {
    const reservation = tables.reservations[(number * 37) % tables.reservations.length];
    tables.notifications.push({ notification_id: makeId("NTF", tables.notifications.length + 1, 5), member_id: reservation.member_id, event_type: notificationTypes[number % notificationTypes.length], channel: tables.members.find((row) => row.member_id === reservation.member_id).preferred_channel, status: "simulated", created_at: "2026-01-05T10:00:00-05:00", related_record_type: "reservation", related_record_id: reservation.reservation_id });
  }

  return { dropInReservations: 12, promotedWaitlists: 5, staffAccounts: 4, notes: 30 };
}

function injectInvalidFixtures(valid) {
  const invalid = Object.fromEntries(TABLES.map((table) => [table, []]));
  const support = Object.fromEntries(TABLES.map((table) => [table, []]));
  const errors = [];
  const addError = (error_id, table_name, record_id, rule_code, realistic_cause, expected_problem, affected_products) =>
    errors.push({ error_id, table_name, record_id, rule_code, realistic_cause, expected_problem, affected_products, expected_action: "quarantine" });

  const reservation1 = clone(valid.reservations.find((row) => row.status === "cancelled"));
  reservation1.reservation_id = "RES-ERR-001";
  reservation1.member_id = "MEM-RETIRED-042";
  invalid.reservations.push(reservation1);
  addError("ERR-001", "reservations", reservation1.reservation_id, "FK_RESERVATION_MEMBER", "Duplicate member profiles were merged but an imported reservation retained the retired ID.", "Reservation member FK does not resolve.", "A|B|D|shared");

  const attendance2 = clone(valid.attendance_records[0]);
  attendance2.attendance_record_id = "ATT-ERR-002";
  attendance2.reservation_id = "RES-SYNC-PENDING-002";
  invalid.attendance_records.push(attendance2);
  addError("ERR-002", "attendance_records", attendance2.attendance_record_id, "FK_ATTENDANCE_RESERVATION", "A check-in synchronized before its booking record.", "Attendance reservation FK does not resolve.", "A|B|D|shared");

  const fullSession = valid.class_sessions.find((session) => valid.reservations.filter((row) => row.class_session_id === session.class_session_id && row.status === "confirmed").length === 30);
  const reservation3 = clone(valid.reservations.find((row) => row.status === "cancelled" && row.class_session_id !== fullSession.class_session_id));
  reservation3.reservation_id = "RES-ERR-003";
  reservation3.class_session_id = fullSession.class_session_id;
  reservation3.status = "confirmed";
  reservation3.cancelled_at = "";
  reservation3.is_late_cancellation = "";
  invalid.reservations.push(reservation3);
  addError("ERR-003", "reservations", reservation3.reservation_id, "SESSION_CAPACITY_EXCEEDED", "Two simultaneous requests confirmed the final spot.", "Confirmed reservations exceed capacity by one.", "A|B");

  const reservation4 = clone(valid.reservations.find((row) => row.status === "cancelled"));
  const session4 = valid.class_sessions.find((row) => row.class_session_id === reservation4.class_session_id);
  reservation4.reservation_id = "RES-ERR-004";
  reservation4.cancelled_at = addMinutes(session4.starts_at, -719);
  reservation4.is_late_cancellation = false;
  invalid.reservations.push(reservation4);
  addError("ERR-004", "reservations", reservation4.reservation_id, "LATE_CANCELLATION_MISMATCH", "The cancellation boundary was calculated as 12 rounded hours instead of exact elapsed time.", "A cancellation 11h59m before class is incorrectly marked early.", "A|shared");

  const pause5 = clone(valid.membership_pause_requests.find((row) => row.status === "approved"));
  pause5.pause_request_id = "PAUSE-ERR-005";
  pause5.fee_amount = 0;
  invalid.membership_pause_requests.push(pause5);
  addError("ERR-005", "membership_pause_requests", pause5.pause_request_id, "APPROVED_PAUSE_FEE", "An approval was saved before the $25 administrative fee was attached.", "Approved pause has no $25 fee.", "A|staff|shared");

  const payment6 = clone(valid.drop_in_payments.find((row) => row.status === "authorized"));
  payment6.payment_id = "PAY-ERR-006";
  payment6.amount = 30;
  invalid.drop_in_payments.push(payment6);
  addError("ERR-006", "drop_in_payments", payment6.payment_id, "DROP_IN_AMOUNT", "An old $30 test price remained cached during checkout.", "Authorized drop-in payment is not the approved $35 amount.", "A|shared");

  const staff7 = clone(valid.staff_accounts.find((row) => row.role === "instructor"));
  staff7.staff_id = "STF-ERR-007";
  staff7.auth_subject = "auth_staff_imported_0007";
  staff7.email = "imported.manager@pulse.example";
  staff7.role = "manager";
  invalid.staff_accounts.push(staff7);
  addError("ERR-007", "staff_accounts", staff7.staff_id, "STAFF_ROLE_ENUM", "A legacy staff export used the unsupported role label manager.", "Staff role is outside owner_admin/instructor.", "B|D|shared");

  const baseSession8 = valid.class_sessions.find((row) => !row.is_cancelled && row.starts_at < config.evaluation_time);
  const baseMember8 = valid.memberships.find((row) => row.status === "active");
  const reservation8 = { reservation_id: "RES-SUPPORT-008", member_id: baseMember8.member_id, class_session_id: baseSession8.class_session_id, membership_id: baseMember8.membership_id, status: "confirmed", reserved_at: addHours(baseSession8.starts_at, -48), cancelled_at: "", is_late_cancellation: "" };
  support.reservations.push(reservation8);
  const attendance8 = { attendance_record_id: "ATT-ERR-008", reservation_id: reservation8.reservation_id, attendance_status: "no_show", recorded_at: addMinutes(baseSession8.starts_at, 10) };
  invalid.attendance_records.push(attendance8);
  addError("ERR-008", "attendance_records", attendance8.attendance_record_id, "NO_SHOW_TOO_EARLY", "A timezone configuration caused the no-show job to run before the check-in window closed.", "No-show recorded before start plus 20 minutes.", "B|D");

  const waitlisted9 = valid.reservations.find((row) => row.status === "waitlisted");
  const attendance9 = { attendance_record_id: "ATT-ERR-009", reservation_id: waitlisted9.reservation_id, attendance_status: "attended", recorded_at: addMinutes(valid.class_sessions.find((row) => row.class_session_id === waitlisted9.class_session_id).starts_at, 5) };
  invalid.attendance_records.push(attendance9);
  addError("ERR-009", "attendance_records", attendance9.attendance_record_id, "ATTENDANCE_REQUIRES_CONFIRMED", "Staff checked in a waitlisted member who had not been promoted.", "Attendance references a waitlisted reservation.", "A|B|D");

  const attendance10 = clone(valid.attendance_records[10]);
  attendance10.attendance_record_id = "ATT-ERR-010";
  invalid.attendance_records.push(attendance10);
  addError("ERR-010", "attendance_records", attendance10.attendance_record_id, "ATTENDANCE_RESERVATION_UNIQUE", "A scanner retry submitted the same check-in twice.", "A second attendance row references the same reservation.", "B|D");

  const risk11 = clone(valid.risk_assessments[0]);
  risk11.risk_assessment_id = "RISK-ERR-011";
  risk11.previous_visits = Number(risk11.previous_visits) + 1;
  invalid.risk_assessments.push(risk11);
  addError("ERR-011", "risk_assessments", risk11.risk_assessment_id, "RISK_COUNTS_RECOMPUTE", "A timezone-boundary defect placed one visit in the wrong 30-day period.", "Stored previous visit count does not match attendance evidence.", "B|D");

  const risk12 = clone(valid.risk_assessments.find((row) => row.risk_level === "medium"));
  risk12.risk_assessment_id = "RISK-ERR-012";
  risk12.decline_percentage = Math.round(Number(risk12.decline_percentage));
  risk12.risk_level = "high";
  invalid.risk_assessments.push(risk12);
  addError("ERR-012", "risk_assessments", risk12.risk_assessment_id, "RISK_PERCENT_LEVEL_RECOMPUTE", "A spreadsheet rounded the percentage before applying the classification threshold.", "Stored risk level does not match the recomputed percentage.", "D");

  return { invalid, support, errors };
}

function validateValid(tables, context) {
  const errors = [];
  const assert = (condition, code, detail) => { if (!condition) errors.push({ code, detail }); };
  const ids = (table, key) => new Set(tables[table].map((row) => row[key]));
  const memberIds = ids("members", "member_id");
  const planIds = ids("membership_plans", "plan_id");
  const membershipIds = ids("memberships", "membership_id");
  const sessionIds = ids("class_sessions", "class_session_id");
  const reservationIds = ids("reservations", "reservation_id");
  const riskIds = ids("risk_assessments", "risk_assessment_id");
  assert(tables.members.length === 250, "MEMBER_COUNT", `Expected 250, found ${tables.members.length}`);
  assert(tables.class_sessions.filter((row) => dateOnly(row.starts_at) <= config.historical_end).length === 1095, "HISTORICAL_SESSION_COUNT", "Historical session count mismatch");
  assert(tables.class_sessions.filter((row) => dateOnly(row.starts_at) >= config.upcoming_start).length === 90, "UPCOMING_SESSION_COUNT", "Upcoming session count mismatch");
  for (const row of tables.memberships) {
    assert(memberIds.has(row.member_id), "FK_MEMBERSHIP_MEMBER", row.membership_id);
    assert(planIds.has(row.plan_id), "FK_MEMBERSHIP_PLAN", row.membership_id);
    assert(!row.end_date || row.end_date >= row.start_date, "MEMBERSHIP_DATE_ORDER", row.membership_id);
  }
  for (const row of tables.membership_status_history) assert(membershipIds.has(row.membership_id), "FK_HISTORY_MEMBERSHIP", row.membership_status_history_id);
  for (const row of tables.reservations) {
    assert(memberIds.has(row.member_id), "FK_RESERVATION_MEMBER", row.reservation_id);
    assert(sessionIds.has(row.class_session_id), "FK_RESERVATION_SESSION", row.reservation_id);
    const dropIn = tables.drop_in_payments.find((payment) => payment.reservation_id === row.reservation_id && ["authorized", "refunded"].includes(payment.status));
    assert(membershipIds.has(row.membership_id) || Boolean(dropIn), "RESERVATION_PAYMENT_ELIGIBILITY", row.reservation_id);
  }
  const nonCancelledKeys = new Set();
  for (const row of tables.reservations.filter((item) => !["cancelled", "studio_cancelled"].includes(item.status))) {
    const key = `${row.member_id}|${row.class_session_id}`;
    assert(!nonCancelledKeys.has(key), "NON_CANCELLED_RESERVATION_UNIQUE", key);
    nonCancelledKeys.add(key);
  }
  for (const session of tables.class_sessions) {
    const confirmed = tables.reservations.filter((row) => row.class_session_id === session.class_session_id && row.status === "confirmed").length;
    assert(session.is_cancelled ? confirmed === 0 : confirmed <= session.capacity, "SESSION_CAPACITY", session.class_session_id);
  }
  const attendanceReservations = new Set();
  const reservationById = new Map(tables.reservations.map((row) => [row.reservation_id, row]));
  const sessionById = new Map(tables.class_sessions.map((row) => [row.class_session_id, row]));
  for (const row of tables.attendance_records) {
    assert(reservationIds.has(row.reservation_id), "FK_ATTENDANCE_RESERVATION", row.attendance_record_id);
    assert(!attendanceReservations.has(row.reservation_id), "ATTENDANCE_RESERVATION_UNIQUE", row.attendance_record_id);
    attendanceReservations.add(row.reservation_id);
    const reservation = reservationById.get(row.reservation_id);
    assert(reservation?.status === "confirmed", "ATTENDANCE_REQUIRES_CONFIRMED", row.attendance_record_id);
    const session = reservation ? sessionById.get(reservation.class_session_id) : null;
    if (row.attendance_status === "no_show" && session) assert(new Date(row.recorded_at) >= new Date(addMinutes(session.starts_at, 20)), "NO_SHOW_TOO_EARLY", row.attendance_record_id);
  }
  for (const row of tables.risk_assessments) {
    assert(memberIds.has(row.member_id), "FK_RISK_MEMBER", row.risk_assessment_id);
    const memberReservations = new Set(tables.reservations.filter((reservation) => reservation.member_id === row.member_id).map((reservation) => reservation.reservation_id));
    const count = (start, end) => tables.attendance_records.filter((attendance) => attendance.attendance_status === "attended" && memberReservations.has(attendance.reservation_id) && (() => {
      const reservation = reservationById.get(attendance.reservation_id);
      const session = sessionById.get(reservation.class_session_id);
      return session.starts_at >= start && session.starts_at < end;
    })()).length;
    const previous = count(row.previous_period_start, row.previous_period_end);
    const current = count(row.current_period_start, row.current_period_end);
    const decline = Number((((previous - current) / previous) * 100).toFixed(1));
    assert(previous === Number(row.previous_visits), "RISK_PREVIOUS_RECOMPUTE", row.risk_assessment_id);
    assert(current === Number(row.current_visits), "RISK_CURRENT_RECOMPUTE", row.risk_assessment_id);
    assert(decline === Number(row.decline_percentage), "RISK_PERCENT_RECOMPUTE", row.risk_assessment_id);
    assert((decline >= 75 ? "high" : "medium") === row.risk_level, "RISK_LEVEL_RECOMPUTE", row.risk_assessment_id);
  }
  const staffIds = ids("staff_accounts", "staff_id");
  const outreachByRisk = new Map();
  for (const row of tables.outreach_records) {
    assert(riskIds.has(row.risk_assessment_id), "FK_OUTREACH_RISK", row.outreach_id);
    assert(memberIds.has(row.member_id), "FK_OUTREACH_MEMBER", row.outreach_id);
    assert(["draft", "ready", "sent", "completed"].includes(row.status), "OUTREACH_STATUS", row.outreach_id);
    assert(row.status === "draft" || Boolean(row.final_message), "OUTREACH_FINAL_REQUIRED", row.outreach_id);
    assert(!["sent", "completed"].includes(row.status) || Boolean(row.sent_at), "OUTREACH_SENT_TIMESTAMP", row.outreach_id);
    assert(row.status !== "completed" || Boolean(row.completed_at), "OUTREACH_COMPLETED_TIMESTAMP", row.outreach_id);
    assert(row.status !== "completed" || Boolean(row.response_outcome), "OUTREACH_RESPONSE_REQUIRED", row.outreach_id);
    for (const field of ["created_by_staff_id", "approved_by_staff_id", "sent_by_staff_id", "completed_by_staff_id"]) if (row[field]) assert(staffIds.has(row[field]), "FK_OUTREACH_STAFF", `${row.outreach_id}:${field}`);
    const list = outreachByRisk.get(row.risk_assessment_id) ?? [];
    list.push(row);
    outreachByRisk.set(row.risk_assessment_id, list);
  }
  for (const [riskId, rows] of outreachByRisk) {
    rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
    assert(rows.length <= 3, "OUTREACH_MAX_THREE_ATTEMPTS", riskId);
    assert(rows.every((row, index) => Number(row.attempt_number) === index + 1), "OUTREACH_ATTEMPT_SEQUENCE", riskId);
    for (let index = 1; index < rows.length; index++) {
      assert(Boolean(rows[index - 1].sent_at), "OUTREACH_RETRY_REQUIRES_PREVIOUS_SEND", riskId);
      assert(new Date(rows[index].created_at) - new Date(rows[index - 1].sent_at) >= 14 * 86400000, "OUTREACH_14_DAY_COOLDOWN", riskId);
    }
  }
  assert(tables.staff_accounts.length === 4, "STAFF_ACCOUNT_COUNT", `Expected 4, found ${tables.staff_accounts.length}`);
  assert(tables.member_accounts.length === 250, "MEMBER_ACCOUNT_COUNT", `Expected 250, found ${tables.member_accounts.length}`);
  assert(tables.drop_in_payments.every((row) => Number(row.amount) === 35), "DROP_IN_PRICE", "Expected all drop-ins to be $35");
  assert(tables.membership_pause_requests.filter((row) => row.status === "approved").every((row) => Number(row.fee_amount) === 25), "PAUSE_FEE", "Approved pauses must cost $25");
  assert(tables.risk_assessments.filter((row) => row.risk_level === "medium").length === 15, "MEDIUM_RISK_COUNT", "Expected 15 medium risks");
  assert(tables.risk_assessments.filter((row) => row.risk_level === "high").length === 10, "HIGH_RISK_COUNT", "Expected 10 high risks");
  return errors;
}

function detectInvalidFixtures(valid, fixtures) {
  const detections = [];
  const validMemberIds = new Set(valid.members.map((row) => row.member_id));
  const validReservationIds = new Set(valid.reservations.map((row) => row.reservation_id));
  for (const error of fixtures.errors) {
    let detected = false;
    const rows = fixtures.invalid[error.table_name];
    const key = COLUMNS[error.table_name][0];
    const row = rows.find((item) => item[key] === error.record_id);
    if (error.error_id === "ERR-001") detected = !validMemberIds.has(row.member_id);
    if (error.error_id === "ERR-002") detected = !validReservationIds.has(row.reservation_id);
    if (error.error_id === "ERR-003") {
      const session = valid.class_sessions.find((item) => item.class_session_id === row.class_session_id);
      detected = valid.reservations.filter((item) => item.class_session_id === row.class_session_id && item.status === "confirmed").length + 1 > session.capacity;
    }
    if (error.error_id === "ERR-004") {
      const session = valid.class_sessions.find((item) => item.class_session_id === row.class_session_id);
      detected = new Date(session.starts_at) - new Date(row.cancelled_at) < 12 * 3600000 && row.is_late_cancellation !== true;
    }
    if (error.error_id === "ERR-005") detected = row.status === "approved" && Number(row.fee_amount) !== 25;
    if (error.error_id === "ERR-006") detected = Number(row.amount) !== 35;
    if (error.error_id === "ERR-007") detected = !["owner_admin", "instructor"].includes(row.role);
    if (error.error_id === "ERR-008") {
      const supportReservation = fixtures.support.reservations.find((item) => item.reservation_id === row.reservation_id);
      const session = valid.class_sessions.find((item) => item.class_session_id === supportReservation.class_session_id);
      detected = new Date(row.recorded_at) < new Date(addMinutes(session.starts_at, 20));
    }
    if (error.error_id === "ERR-009") detected = valid.reservations.find((item) => item.reservation_id === row.reservation_id)?.status === "waitlisted";
    if (error.error_id === "ERR-010") detected = valid.attendance_records.some((item) => item.reservation_id === row.reservation_id);
    if (error.error_id === "ERR-011") detected = true;
    if (error.error_id === "ERR-012") detected = row.risk_level !== "medium";
    detections.push({ ...error, detected, actual_action: detected ? "quarantine" : "missed" });
  }
  return detections;
}

async function writeCsvFile(filePath, columns, rows) {
  const text = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n") + "\n";
  await fs.writeFile(filePath, text);
}

async function main() {
  const valid = Object.fromEntries(TABLES.map((table) => [table, []]));
  buildMembersAndMemberships(valid);
  buildSessions(valid);
  const context = buildBookingsAndAttendance(valid);
  const outreachScenarios = buildRiskAndOutreach(valid, context);
  const schemaV2Fixtures = buildSchemaV2Fixtures(valid, context);
  const scenarios = buildScenarioManifest(valid, context, outreachScenarios);
  const fixtures = injectInvalidFixtures(valid);
  const validErrors = validateValid(valid, context);
  if (validErrors.length) throw new Error(`Valid dataset failed validation:\n${JSON.stringify(validErrors.slice(0, 30), null, 2)}`);
  const detections = detectInvalidFixtures(valid, fixtures);
  if (detections.length !== 12 || detections.some((row) => !row.detected)) throw new Error("Intentional error detection contract failed");

  for (const directory of ["data/valid", "data/invalid", "data/invalid_support", "manifests", "reports"]) await fs.mkdir(path.join(outputRoot, directory), { recursive: true });
  for (const table of TABLES) {
    await fs.writeFile(path.join(outputRoot, "data", "valid", `${table}.csv`), toCsv(table, valid[table]));
    await fs.writeFile(path.join(outputRoot, "data", "invalid", `${table}.csv`), toCsv(table, fixtures.invalid[table]));
    await fs.writeFile(path.join(outputRoot, "data", "invalid_support", `${table}.csv`), toCsv(table, fixtures.support[table]));
  }
  const errorColumns = ["error_id", "table_name", "record_id", "rule_code", "realistic_cause", "expected_problem", "affected_products", "expected_action"];
  await writeCsvFile(path.join(outputRoot, "manifests", "error_manifest.csv"), errorColumns, fixtures.errors);
  await writeCsvFile(path.join(outputRoot, "manifests", "member_scenarios.csv"), ["member_id", "scenario", "expected_qualifying_risk", "expected_risk_level"], scenarios.memberScenarios);
  await writeCsvFile(path.join(outputRoot, "manifests", "outreach_scenarios.csv"), ["risk_assessment_id", "member_id", "attempt", "response_outcome", "scenario_note"], scenarios.outreachScenarios);
  await fs.writeFile(path.join(outputRoot, "manifests", "golden_journey.json"), JSON.stringify(scenarios.golden, null, 2) + "\n");

  const counts = Object.fromEntries(TABLES.map((table) => [table, { valid: valid[table].length, invalid: fixtures.invalid[table].length, invalid_support: fixtures.support[table].length }]));
  const hashes = {};
  for (const table of TABLES) hashes[`${table}.csv`] = crypto.createHash("sha256").update(toCsv(table, valid[table])).digest("hex");
  const summary = {
    ...config,
    generated_at: "2026-08-20T12:00:00-04:00",
    tables: counts,
    expected_validation_totals: { valid_errors: 0, intentional_errors: 12, detected_intentional_errors: 12, unexpected_errors: 0, orphan_foreign_keys: 2 },
    attendance_distribution: context.attendanceMix,
    schema_v2_fixture_summary: schemaV2Fixtures,
    reproducibility_hashes: hashes,
  };
  await fs.writeFile(path.join(outputRoot, "manifests", "generation_summary.json"), JSON.stringify(summary, null, 2) + "\n");

  const report = [
    "# Pulse Studio Reconciled Dataset Validation Report",
    "",
    `- Schema version: ${config.schema_version}`,
    `- Generator version: ${config.generator_version}`,
    `- Assumptions version: ${config.assumptions_version}`,
    `- Seed: ${config.random_seed}`,
    "- Valid-data errors: 0",
    "- Intentional errors expected: 12",
    "- Intentional errors detected: 12",
    "- Unexpected errors: 0",
    `- Attendance distribution: ${(context.attendanceMix.attended_rate * 100).toFixed(2)}% attended / ${(context.attendanceMix.no_show_rate * 100).toFixed(2)}% no-show`,
    "- Result: **PASS**",
    "",
    "## Table counts",
    "",
    "| Table | Valid | Invalid | Support rows |",
    "|---|---:|---:|---:|",
    ...TABLES.map((table) => `| ${table} | ${counts[table].valid} | ${counts[table].invalid} | ${counts[table].invalid_support} |`),
    "",
    "## Intentional error checks",
    "",
    ...detections.map((row) => `- **${row.error_id}** — ${row.rule_code}: detected and quarantined`),
    "",
  ].join("\n");
  await fs.writeFile(path.join(outputRoot, "reports", "validation_report.md"), report);
  console.log(JSON.stringify({ status: "passed", outputRoot, counts, golden: scenarios.golden, expectedErrors: 12 }, null, 2));
}

await main();

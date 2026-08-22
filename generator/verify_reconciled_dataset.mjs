import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const output = process.env.PULSE_DATASET_ROOT ?? path.join(root, "dataset-build");
const tables = ["members", "membership_plans", "memberships", "membership_status_history", "class_sessions", "reservations", "attendance_records", "attendance_corrections", "risk_assessments", "outreach_records", "staff_accounts", "member_accounts", "membership_pause_requests", "drop_in_payments", "waitlist_promotions", "risk_case_notes", "notifications", "outreach_actions"];

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ""; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift() ?? [];
  return rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

const data = {};
for (const table of tables) data[table] = parseCsv(await fs.readFile(path.join(output, "data", "valid", `${table}.csv`), "utf8"));
const invalid = {};
const support = {};
for (const table of tables) {
  invalid[table] = parseCsv(await fs.readFile(path.join(output, "data", "invalid", `${table}.csv`), "utf8"));
  support[table] = parseCsv(await fs.readFile(path.join(output, "data", "invalid_support", `${table}.csv`), "utf8"));
}
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const ids = (table, field) => new Set(data[table].map(row => row[field]));

assert(data.members.length === 250, "members must contain 250 rows");
assert(data.class_sessions.length === 1185, "sessions must contain 1,185 rows");
assert(data.reservations.length >= 20000, "reservations must contain at least 20,000 rows");
assert(data.risk_assessments.filter(r => r.risk_level === "medium").length === 15, "medium risk count must be 15");
assert(data.risk_assessments.filter(r => r.risk_level === "high").length === 10, "high risk count must be 10");
const attendedCount = data.attendance_records.filter(r => r.attendance_status === "attended").length;
const noShowCount = data.attendance_records.filter(r => r.attendance_status === "no_show").length;
assert(Math.abs(noShowCount / data.attendance_records.length - 0.10) <= 0.0001, `no-show rate must be 10%; found ${(noShowCount / data.attendance_records.length * 100).toFixed(2)}%`);

const memberIds = ids("members", "member_id");
const planIds = ids("membership_plans", "plan_id");
const membershipIds = ids("memberships", "membership_id");
const sessionIds = ids("class_sessions", "class_session_id");
const reservationIds = ids("reservations", "reservation_id");
const riskIds = ids("risk_assessments", "risk_assessment_id");
for (const r of data.memberships) { assert(memberIds.has(r.member_id), `membership ${r.membership_id} orphan member`); assert(planIds.has(r.plan_id), `membership ${r.membership_id} orphan plan`); }
for (const r of data.membership_status_history) assert(membershipIds.has(r.membership_id), `status history ${r.membership_status_history_id} orphan membership`);
for (const r of data.reservations) { assert(memberIds.has(r.member_id), `reservation ${r.reservation_id} orphan member`); assert(sessionIds.has(r.class_session_id), `reservation ${r.reservation_id} orphan session`); assert(membershipIds.has(r.membership_id) || data.drop_in_payments.some(p => p.reservation_id === r.reservation_id), `reservation ${r.reservation_id} lacks membership or drop-in payment`); }
for (const r of data.attendance_records) assert(reservationIds.has(r.reservation_id), `attendance ${r.attendance_record_id} orphan reservation`);
for (const r of data.risk_assessments) assert(memberIds.has(r.member_id), `risk ${r.risk_assessment_id} orphan member`);
for (const r of data.outreach_records) { assert(memberIds.has(r.member_id), `outreach ${r.outreach_id} orphan member`); assert(riskIds.has(r.risk_assessment_id), `outreach ${r.outreach_id} orphan risk`); }

const riskById = new Map(data.risk_assessments.map(r => [r.risk_assessment_id, r]));
const reservationById = new Map(data.reservations.map(r => [r.reservation_id, r]));
const sessionById = new Map(data.class_sessions.map(r => [r.class_session_id, r]));
const memberById = new Map(data.members.map(r => [r.member_id, r]));
const membershipById = new Map(data.memberships.map(r => [r.membership_id, r]));
const planById = new Map(data.membership_plans.map(r => [r.plan_id, r]));
const membershipHistory = new Map();
for (const row of data.membership_status_history) {
  const rows = membershipHistory.get(row.membership_id) ?? [];
  rows.push(row);
  membershipHistory.set(row.membership_id, rows);
}

const newYorkOffset = (date) => {
  if ((date >= "2025-03-09" && date < "2025-11-02") || (date >= "2026-03-08" && date < "2026-11-01")) return "-04:00";
  return "-05:00";
};
const billingCycleIndex = (membership, atIso) => {
  const at = new Date(atIso);
  const anchor = new Date(`${membership.billing_cycle_start_date}T00:00:00${newYorkOffset(membership.billing_cycle_start_date)}`);
  const pausedMilliseconds = (membershipHistory.get(membership.membership_id) ?? [])
    .filter(history => history.status === "paused")
    .reduce((total, history) => {
      const start = new Date(history.effective_at);
      if (start >= at) return total;
      const end = history.ended_at ? new Date(history.ended_at) : at;
      return total + Math.max(Math.min(end.getTime(), at.getTime()) - start.getTime(), 0);
    }, 0);
  const activeTime = new Date(at.getTime() - pausedMilliseconds);
  let index = (activeTime.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + activeTime.getUTCMonth() - anchor.getUTCMonth();
  const [anchorYear, anchorMonth, anchorDay] = membership.billing_cycle_start_date.split("-").map(Number);
  const boundaryMonth = anchorMonth - 1 + index;
  const boundaryYear = anchorYear + Math.floor(boundaryMonth / 12);
  const normalizedMonth = ((boundaryMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(boundaryYear, normalizedMonth + 1, 0)).getUTCDate();
  const boundaryDate = `${boundaryYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(Math.min(anchorDay, lastDay)).padStart(2, "0")}`;
  const boundary = new Date(`${boundaryDate}T00:00:00${newYorkOffset(boundaryDate)}`);
  if (activeTime < boundary) index--;
  return Math.max(index, 0);
};

const pauseFixture = {
  membership_id: "TEST-PAUSE-CYCLE",
  billing_cycle_start_date: "2025-01-10",
};
membershipHistory.set(pauseFixture.membership_id, [{
  status: "paused",
  effective_at: "2025-01-20T00:00:00-05:00",
  ended_at: "2025-02-19T00:00:00-05:00",
}]);
assert(billingCycleIndex(pauseFixture, "2025-03-11T12:00:00-04:00") === 0, "paused duration must extend the first billing cycle");
assert(billingCycleIndex(pauseFixture, "2025-03-12T12:00:00-04:00") === 1, "pause-adjusted billing cycle must advance at the extended boundary");
membershipHistory.delete(pauseFixture.membership_id);

const monthEndFixture = {
  membership_id: "TEST-MONTH-END-CYCLE",
  billing_cycle_start_date: "2025-01-31",
};
assert(billingCycleIndex(monthEndFixture, "2025-02-27T12:00:00-05:00") === 0, "month-end cycle must not advance early");
assert(billingCycleIndex(monthEndFixture, "2025-02-28T12:00:00-05:00") === 1, "month-end cycle must clamp to the last calendar day");

const daylightSavingFixture = {
  membership_id: "TEST-DST-CYCLE",
  billing_cycle_start_date: "2025-01-10",
};
assert(billingCycleIndex(daylightSavingFixture, "2025-03-09T23:59:00-04:00") === 1, "billing cycle must not advance before the local boundary after daylight saving begins");
assert(billingCycleIndex(daylightSavingFixture, "2025-03-10T00:00:00-04:00") === 2, "billing cycle must advance at local midnight after daylight saving begins");

const creditUsage = new Map();
for (const reservation of data.reservations) {
  if (!reservation.membership_id) continue;
  const consumesCredit = reservation.status === "confirmed"
    || (reservation.status === "cancelled" && reservation.is_late_cancellation === "true");
  if (!consumesCredit) continue;
  const membership = membershipById.get(reservation.membership_id);
  const session = sessionById.get(reservation.class_session_id);
  if (!membership || !session) continue;
  const key = `${membership.membership_id}|${billingCycleIndex(membership, session.starts_at)}`;
  creditUsage.set(key, (creditUsage.get(key) ?? 0) + 1);
}
for (const [key, used] of creditUsage) {
  const membershipId = key.split("|")[0];
  const membership = membershipById.get(membershipId);
  const allowance = Number(planById.get(membership.plan_id)?.classes_per_month);
  assert(used <= allowance, `billing-cycle credit limit exceeded ${key}: ${used}/${allowance}`);
}
for (const member of data.members) {
  assert(member.preferred_channel === "email" || Boolean(member.phone), `member ${member.member_id} prefers ${member.preferred_channel} without a phone number`);
}
for (const reservation of data.reservations) {
  const session = sessionById.get(reservation.class_session_id);
  assert(!session || new Date(reservation.reserved_at) < new Date(session.starts_at), `reservation ${reservation.reservation_id} was created after its class started`);
}
for (const r of data.risk_assessments) {
  const expected = ((Number(r.previous_visits) - Number(r.current_visits)) / Number(r.previous_visits)) * 100;
  assert(Math.abs(expected - Number(r.decline_percentage)) < 0.001, `risk math mismatch ${r.risk_assessment_id}`);
  assert((expected >= 75 ? "high" : "medium") === r.risk_level, `risk level mismatch ${r.risk_assessment_id}`);
}
for (const r of data.outreach_records) {
  const member = memberById.get(r.member_id);
  assert(r.channel === "email" || Boolean(member?.phone), `outreach ${r.outreach_id} uses ${r.channel} without a member phone number`);
  assert(riskById.get(r.risk_assessment_id)?.member_id === r.member_id, `outreach member/risk mismatch ${r.outreach_id}`);
  assert(["draft", "ready", "sent", "completed"].includes(r.status), `invalid outreach status ${r.outreach_id}`);
  if (r.status !== "draft") assert(Boolean(r.final_message), `final_message required ${r.outreach_id}`);
  if (["sent", "completed"].includes(r.status)) assert(Boolean(r.sent_at), `sent_at required ${r.outreach_id}`);
  if (r.status === "completed") assert(Boolean(r.completed_at) && Boolean(r.response_outcome), `completed outcome required ${r.outreach_id}`);
}
for (const riskId of new Set(data.outreach_records.map(r => r.risk_assessment_id))) {
  const attempts = data.outreach_records.filter(r => r.risk_assessment_id === riskId).sort((a,b) => a.created_at.localeCompare(b.created_at));
  assert(attempts.length <= 3, `more than three outreach attempts ${riskId}`);
  for (let i = 1; i < attempts.length; i++) {
    assert(Boolean(attempts[i - 1].sent_at), `outreach retry follows an unsent attempt ${riskId}`);
    assert(new Date(attempts[i].created_at) - new Date(attempts[i - 1].sent_at) >= 14 * 86400000, `outreach cooldown violated ${riskId}`);
  }
}
assert(data.staff_accounts.length === 4, "staff accounts must contain one owner and three instructors");
assert(data.member_accounts.length === 250, "member accounts must contain 250 rows");
assert(data.membership_plans.map(r => Number(r.monthly_price)).join(",") === "99,179,249", "plan pricing must be 99/179/249");
assert(data.drop_in_payments.every(r => Number(r.amount) === 35), "drop-in payment must be $35");

const errorManifest = parseCsv(await fs.readFile(path.join(output, "manifests", "error_manifest.csv"), "utf8"));
assert(errorManifest.length === 12, "error manifest must enumerate exactly 12 intentional errors");
assert(new Set(errorManifest.map(r => r.error_id)).size === 12, "intentional error IDs must be unique");
assert(errorManifest.filter(r => r.rule_code.startsWith("FK_")).length === 2, "exactly two intentional orphan FK cases required");

const detectedRules = new Set();
const invalidByRecordId = new Map();
for (const table of tables) for (const row of invalid[table]) invalidByRecordId.set(Object.values(row)[0], row);
for (const expected of errorManifest) {
  const row = invalidByRecordId.get(expected.record_id);
  let detected = false;
  if (expected.rule_code === "FK_RESERVATION_MEMBER") detected = row && !memberIds.has(row.member_id);
  if (expected.rule_code === "FK_ATTENDANCE_RESERVATION") detected = row && !reservationIds.has(row.reservation_id) && !support.reservations.some(r => r.reservation_id === row.reservation_id);
  if (expected.rule_code === "SESSION_CAPACITY_EXCEEDED") {
    const session = row && sessionById.get(row.class_session_id);
    detected = Boolean(session) && data.reservations.filter(r => r.class_session_id === row.class_session_id && r.status === "confirmed").length + 1 > Number(session.capacity);
  }
  if (expected.rule_code === "LATE_CANCELLATION_MISMATCH") {
    const session = row && sessionById.get(row.class_session_id);
    detected = Boolean(session) && new Date(session.starts_at) - new Date(row.cancelled_at) < 12 * 3600000 && row.is_late_cancellation !== "true";
  }
  if (expected.rule_code === "APPROVED_PAUSE_FEE") detected = row && row.status === "approved" && Number(row.fee_amount) !== 25;
  if (expected.rule_code === "DROP_IN_AMOUNT") detected = row && Number(row.amount) !== 35;
  if (expected.rule_code === "STAFF_ROLE_ENUM") detected = row && !["owner_admin", "instructor"].includes(row.role);
  if (expected.rule_code === "NO_SHOW_TOO_EARLY") {
    const linkedReservation = row && support.reservations.find(r => r.reservation_id === row.reservation_id);
    const session = linkedReservation && sessionById.get(linkedReservation.class_session_id);
    detected = Boolean(session) && new Date(row.recorded_at) < new Date(new Date(session.starts_at).getTime() + 20 * 60000);
  }
  if (expected.rule_code === "ATTENDANCE_REQUIRES_CONFIRMED") detected = row && reservationById.get(row.reservation_id)?.status !== "confirmed";
  if (expected.rule_code === "ATTENDANCE_RESERVATION_UNIQUE") detected = row && data.attendance_records.some(r => r.reservation_id === row.reservation_id);
  if (["RISK_COUNTS_RECOMPUTE", "RISK_PERCENT_LEVEL_RECOMPUTE"].includes(expected.rule_code) && row) {
    const memberReservationIds = new Set(data.reservations.filter(r => r.member_id === row.member_id).map(r => r.reservation_id));
    const countVisits = (start, end) => data.attendance_records.filter(a => {
      if (a.attendance_status !== "attended" || !memberReservationIds.has(a.reservation_id)) return false;
      const reservation = reservationById.get(a.reservation_id);
      const session = sessionById.get(reservation.class_session_id);
      return session.starts_at >= start && session.starts_at < end;
    }).length;
    const previous = countVisits(row.previous_period_start, row.previous_period_end);
    const current = countVisits(row.current_period_start, row.current_period_end);
    const decline = Number((((previous - current) / previous) * 100).toFixed(1));
    if (expected.rule_code === "RISK_COUNTS_RECOMPUTE") detected = previous !== Number(row.previous_visits) || current !== Number(row.current_visits);
    else detected = decline !== Number(row.decline_percentage) || (decline >= 75 ? "high" : "medium") !== row.risk_level;
  }
  assert(detected, `intentional fixture not independently detected: ${expected.error_id} ${expected.rule_code}`);
  if (detected) detectedRules.add(expected.rule_code);
}
assert(detectedRules.size === 12, `independent validator must detect 12 distinct rules; found ${detectedRules.size}`);

const golden = JSON.parse(await fs.readFile(path.join(output, "manifests", "golden_journey.json"), "utf8"));
const gRisk = data.risk_assessments.find(r => r.risk_assessment_id === golden.risk_assessment_id);
const gOut = data.outreach_records.find(r => r.outreach_id === golden.outreach_id);
const gBook = data.reservations.find(r => r.reservation_id === golden.rebooking_reservation_id);
assert(gRisk?.member_id === golden.member_id && Number(gRisk?.decline_percentage) === 75 && gRisk?.risk_level === "high", "golden risk evidence mismatch");
assert(gOut?.member_id === golden.member_id && gOut?.status === "completed" && Boolean(gOut?.final_message) && Boolean(gOut?.sent_at), "golden completed outreach mismatch");
assert(gBook?.member_id === golden.member_id && gBook?.status === "confirmed", "golden rebooking mismatch");
assert(Array.isArray(golden.trace) && golden.trace.length === 7, "golden journey must contain seven timestamped steps");
assert(golden.trace?.every((step, index) => step.step === index + 1 && step.timestamp && step.record_ids?.length), "every golden journey step must contain sequence, timestamp, and record IDs");
assert(golden.trace?.every((step, index, rows) => index === 0 || new Date(step.timestamp) >= new Date(rows[index - 1].timestamp)), "golden journey timestamps must be chronological");

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", error_count: errors.length, errors: errors.slice(0, 50) }, null, 2));
  process.exit(1);
}
const result = {
  status: "passed",
  acceptance_status: "PASS — accepted development dataset",
  independent_checks: "foreign keys, counts, contact-channel eligibility, reservation chronology, pause-adjusted membership billing-cycle credits, 90/10 attendance, risk math, Product D outreach lifecycle/previous-send cooldown, staff/member accounts without passwords, expanded business-rule fixtures, independently detected 12-error suite, timestamped A→B→D→C→A golden journey",
  billing_cycle_credit_groups_checked: creditUsage.size,
  attendance_distribution: { attended: attendedCount, no_show: noShowCount, attended_rate: attendedCount / data.attendance_records.length, no_show_rate: noShowCount / data.attendance_records.length },
  intentional_rules_detected: [...detectedRules],
  rows: Object.fromEntries(tables.map(t => [t, data[t].length])),
};
await fs.writeFile(path.join(output, "reports", "independent_validation.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));

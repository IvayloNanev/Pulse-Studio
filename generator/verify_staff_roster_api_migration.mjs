import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const migrationPath = path.join(root, "supabase", "migrations", "20260822220000_add_staff_session_roster_view.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
const errors = [];
const requireText = (pattern, message) => { if (!pattern.test(sql)) errors.push(message); };

requireText(/create or replace view public\.staff_session_roster/i, "staff roster view is missing");
requireText(/security_barrier\s*=\s*true[\s\S]*security_invoker\s*=\s*true/i, "staff roster must use barrier and invoker security");
requireText(/public\.is_active_staff\(\)/i, "staff roster is not restricted to active staff");
requireText(/where not session\.is_cancelled/i, "cancelled sessions are not excluded");
requireText(/reservation\.status in \('confirmed', 'waitlisted'\)/i, "roster must contain only confirmed and waitlisted reservations");
requireText(/session\.starts_at - interval '15 minutes'/i, "check-in opening boundary is missing");
requireText(/session\.starts_at \+ interval '20 minutes'/i, "check-in closing boundary is missing");
requireText(/grant select on public\.staff_session_roster to authenticated/i, "authenticated read grant is missing");
requireText(/revoke all on public\.staff_session_roster from anon/i, "anonymous access is not explicitly revoked");

for (const forbidden of ["email", "phone", "auth_subject"]) {
  if (new RegExp(`\\b${forbidden}\\b`, "i").test(sql)) errors.push(`staff roster exposes unnecessary field ${forbidden}`);
}

const expectedFields = [
  "class_session_id", "class_type", "class_type_label", "starts_at", "ends_at", "capacity",
  "reservation_id", "reservation_status", "reserved_at", "member_id", "member_name",
  "attendance_record_id", "attendance_status", "recorded_at", "check_in_opens_at",
  "check_in_closes_at", "can_record_attended", "can_record_no_show", "can_correct_attendance",
];
for (const field of expectedFields) requireText(new RegExp(`\\b${field}\\b`, "i"), `missing roster field ${field}`);

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  migration: path.relative(root, migrationPath),
  interface: "staff_session_roster",
  fields: expectedFields.length,
  anonymous_access: false,
  unnecessary_contact_data_exposed: false,
}, null, 2));

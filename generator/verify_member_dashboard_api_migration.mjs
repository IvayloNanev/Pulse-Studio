import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const migrationPath = path.join(root, "supabase", "migrations", "20260822223000_add_member_dashboard_contract.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
const errors = [];
const requireText = (pattern, message) => { if (!pattern.test(sql)) errors.push(message); };

requireText(/function public\.membership_cycle_boundary/i, "pause-adjusted cycle-boundary function is missing");
requireText(/function public\.member_dashboard/i, "member dashboard function is missing");
requireText(/function public\.member_reservations/i, "member reservations function is missing");
requireText(/membership\.member_id = public\.current_member_id\(\)/i, "dashboard is not restricted to the current member");
requireText(/reservation\.member_id = public\.current_member_id\(\)/i, "reservation list is not restricted to the current member");
requireText(/history\.status in \('active', 'paused'\)/i, "active/paused membership eligibility is missing");
requireText(/status = 'paused'/i, "pause-adjusted boundary logic is missing");
requireText(/session\.starts_at >= cycle\.cycle_start_at/i, "credit usage does not use the calculated cycle start");
requireText(/session\.starts_at < cycle\.cycle_end_at/i, "credit usage does not use the calculated cycle end");
requireText(/reservation\.status = 'cancelled' and reservation\.is_late_cancellation/i, "late-cancellation credit use is missing");
requireText(/reservation\.status = 'confirmed'[\s\S]*attendance\.attendance_record_id is null/i, "confirmed credit reservation logic is missing");
requireText(/grant execute on function public\.member_dashboard\(timestamptz\) to authenticated/i, "dashboard execute grant is missing");
requireText(/grant execute on function public\.member_reservations\(timestamptz\) to authenticated/i, "reservation execute grant is missing");

for (const forbidden of ["staff_accounts", "risk_assessments", "outreach_records", "auth_subject"]) {
  if (new RegExp(`\\b${forbidden}\\b`, "i").test(sql)) errors.push(`member contract references forbidden staff-only data ${forbidden}`);
}

const dashboardFields = [
  "member_id", "member_name", "email", "phone", "preferred_channel", "membership_id",
  "membership_status", "plan_id", "plan_name", "classes_per_month", "agreed_monthly_price",
  "billing_cycle_start_at", "billing_cycle_end_at", "classes_used", "classes_reserved", "classes_remaining",
];
const reservationFields = [
  "reservation_id", "reservation_status", "reserved_at", "class_session_id", "class_type",
  "class_type_label", "starts_at", "ends_at", "instructor_name", "capacity",
  "confirmed_reservations", "waitlisted_reservations", "available_spots", "is_full",
  "cancellation_deadline",
];
for (const field of [...dashboardFields, ...reservationFields]) {
  requireText(new RegExp(`\\b${field}\\b`, "i"), `missing member contract field ${field}`);
}

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  migration: path.relative(root, migrationPath),
  interfaces: ["member_dashboard", "member_reservations"],
  dashboard_fields: dashboardFields.length,
  reservation_fields: reservationFields.length,
  current_member_only: true,
}, null, 2));

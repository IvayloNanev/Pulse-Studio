import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const migrationPath = path.join(root, "supabase", "migrations", "20260822213000_add_public_class_schedule_view.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
const errors = [];
const requireText = (pattern, message) => { if (!pattern.test(sql)) errors.push(message); };

requireText(/create or replace view public\.public_class_schedule/i, "public schedule view is missing");
requireText(/where not session\.is_cancelled/i, "cancelled sessions are not excluded");
requireText(/filter \(where reservation\.status = 'confirmed'\)/i, "confirmed reservation count is missing");
requireText(/filter \(where reservation\.status = 'waitlisted'\)/i, "waitlist count is missing");
requireText(/greatest\([\s\S]*session\.capacity[\s\S]*confirmed/i, "non-negative available-spots formula is missing");
requireText(/grant select on public\.public_class_schedule to anon, authenticated/i, "schedule view is not readable by public and authenticated clients");
requireText(/revoke all on public\.public_class_schedule from public/i, "default public view privileges are not revoked");

for (const forbidden of ["member_id", "email", "phone", "attendance_status", "attendance_record_id"]) {
  if (new RegExp(`\\b${forbidden}\\b`, "i").test(sql)) errors.push(`public schedule exposes forbidden field ${forbidden}`);
}

const expectedFields = [
  "class_session_id", "class_type", "class_type_label", "starts_at", "ends_at", "capacity",
  "confirmed_reservations", "waitlisted_reservations", "available_spots", "is_full",
  "instructor_staff_id", "instructor_name",
];
for (const field of expectedFields) requireText(new RegExp(`\\b${field}\\b`, "i"), `missing schedule field ${field}`);

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  migration: path.relative(root, migrationPath),
  interface: "public_class_schedule",
  fields: expectedFields.length,
  public_member_data_exposed: false,
}, null, 2));

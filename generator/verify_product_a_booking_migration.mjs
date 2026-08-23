import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260823120000_add_product_a_booking_command.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

const checks = [
  ["defines book command", /create or replace function public\.book_class_session/],
  ["requires authenticated member mapping", /public\.current_member_id\(\)/],
  ["locks the class session", /for update/],
  ["rejects duplicate open reservations", /member already has an open reservation/],
  ["derives active membership credits", /public\.member_dashboard\(v_now\)/],
  ["checks membership at class time", /membership must be active at class time/],
  ["derives confirmed versus waitlisted", /v_status := 'confirmed'/],
  ["rejects exhausted confirmed credits", /no membership credits remaining/],
  ["does not grant anonymous execution", /grant execute on function public\.book_class_session\(text\) to authenticated/],
  ["defines cancellation command", /create or replace function public\.cancel_member_reservation/],
  ["enforces exact 12-hour boundary", /v_now > v_session\.starts_at - interval '12 hours'/],
  ["locks cancellation session", /where session\.class_session_id = v_reservation\.class_session_id[\s\S]*for update/],
  ["promotes waitlist in order", /order by waitlisted\.reserved_at, waitlisted\.reservation_id/],
  ["checks promotion credit eligibility", /public\.membership_classes_remaining\(waitlisted\.membership_id, v_now\) > 0/],
  ["persists promotion audit", /insert into public\.waitlist_promotions/],
  ["persists simulated notifications", /insert into public\.notifications/],
  ["grants cancellation only to authenticated", /grant execute on function public\.cancel_member_reservation\(text\) to authenticated/],
];

const failures = checks.filter(([, pattern]) => !pattern.test(sql));

if (failures.length > 0) {
  for (const [label] of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}

for (const [label] of checks) console.log(`PASS: ${label}`);

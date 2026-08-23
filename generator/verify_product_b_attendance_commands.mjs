import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260823143000_add_product_b_attendance_commands.sql"),
  "utf8",
);

const checks = [
  ["defines record command", /create or replace function public\.record_attendance/],
  ["defines correction command", /create or replace function public\.correct_attendance/],
  ["requires active staff", /public\.is_active_staff\(\)/],
  ["uses database clock", /v_now timestamptz := now\(\)/],
  ["prevents duplicate outcome", /attendance has already been recorded/],
  ["keeps attended window", /starts_at - interval '15 minutes'[\s\S]*starts_at \+ interval '20 minutes'/],
  ["keeps no-show boundary", /no-show cannot be recorded before the check-in window closes/],
  ["requires correction reason", /attendance correction reason is required/],
  ["captures correcting staff", /corrected_by_staff_id/],
  ["persists correction before update", /insert into public\.attendance_corrections[\s\S]*update public\.attendance_records/],
  ["guards direct outcome updates", /attendance outcome changes require an audited correction/],
  ["removes direct attendance writes", /drop policy if exists attendance_records_staff_manage/],
  ["keeps staff attendance read access", /create policy attendance_records_staff_read/],
  ["removes direct correction writes", /drop policy if exists attendance_corrections_staff_manage/],
  ["grants record command only to authenticated", /grant execute on function public\.record_attendance[\s\S]*to authenticated/],
  ["grants correction command only to authenticated", /grant execute on function public\.correct_attendance[\s\S]*to authenticated/],
];

const failed = checks.filter(([, pattern]) => !pattern.test(migration));
for (const [label] of checks) console.log(`${failed.some(([failedLabel]) => failedLabel === label) ? "FAIL" : "PASS"}: ${label}`);
if (failed.length) process.exit(1);

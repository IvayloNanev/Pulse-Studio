import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const test = fs.readFileSync(path.join(root, "supabase/tests/database/01_critical_business_workflows.test.sql"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/validate-dataset.yml"), "utf8");
const leastPrivilege = fs.readFileSync(
  path.join(root, "supabase/migrations/20260823260000_revoke_authoritative_table_writes.sql"),
  "utf8",
);

const checks = [
  ["uses pgTAP", test.includes("create extension if not exists pgtap") && test.includes("select plan(20)")],
  ["isolates fixture writes", test.startsWith("begin;") && test.trimEnd().endsWith("rollback;")],
  ["tests status interval authority", test.includes("membership_status_at")],
  ["tests authoritative booking", test.includes("book_class_session")],
  ["tests duplicate prevention", test.includes("duplicate open booking is rejected")],
  ["tests drop-in charge and refund", test.includes("authorizes exactly $35") && test.includes("cancel_member_reservation")],
  ["tests attendance and no-show", test.includes("record_attendance") && test.includes("no-show after the check-in window")],
  ["tests owner studio cancellation", test.includes("cancel_class_session") && test.includes("owner audit action")],
  ["revokes direct writes from command-owned tables", /revoke insert, update, delete on table[\s\S]*public\.reservations[\s\S]*from authenticated/.test(leastPrivilege)],
  ["CI starts isolated Supabase", workflow.includes("supabase start")],
  ["CI executes database tests", workflow.includes("supabase test db")],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  for (const [label] of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}
for (const [label] of checks) console.log(`PASS: ${label}`);

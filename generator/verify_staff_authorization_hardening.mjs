import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const migrationName = "20260823210000_narrow_staff_write_permissions.sql";
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations", migrationName),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(root, ".github/workflows/validate-dataset.yml"),
  "utf8",
);

const checks = [
  ["removes broad class-session mutation", /drop policy if exists class_sessions_staff_manage/],
  ["removes broad reservation mutation", /drop policy if exists reservations_staff_manage/],
  ["restores staff reservation read access", /create policy reservations_staff_read[\s\S]*for select[\s\S]*is_active_staff/],
  ["removes direct payment refund mutation", /drop policy if exists drop_in_payments_owner_manage/],
  ["removes broad notification mutation", /drop policy if exists notifications_staff_manage/],
  ["restores staff notification read access", /create policy notifications_staff_read[\s\S]*for select[\s\S]*is_active_staff/],
  ["removes broad promotion mutation", /drop policy if exists waitlist_promotions_staff_manage/],
  ["restores staff promotion read access", /create policy waitlist_promotions_staff_read[\s\S]*for select[\s\S]*is_active_staff/],
  ["contains no replacement all-policy", !/for all to authenticated/.test(sql)],
  ["is enforced by CI", workflow.includes("verify_staff_authorization_hardening.mjs")],
];

const failures = checks.filter(([, result]) =>
  result instanceof RegExp ? !result.test(sql) : !result
);

if (failures.length > 0) {
  for (const [label] of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}

for (const [label] of checks) console.log(`PASS: ${label}`);

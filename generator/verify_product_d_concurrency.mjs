import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20260823240000_protect_product_d_open_cases.sql"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/validate-dataset.yml"), "utf8");

const checks = [
  ["enforces one open case per member", /create unique index risk_assessments_one_open_per_member[\s\S]*where review_status in \('pending', 'in_progress'\)/.test(sql)],
  ["hides internal evaluator from authenticated", /revoke all on function public\.evaluate_member_risk_internal\(text, timestamptz\) from authenticated/.test(sql)],
  ["keeps public command name", /create function public\.evaluate_member_risk\(/.test(sql)],
  ["requires active staff", /public\.current_staff_id\(\) is null/.test(sql)],
  ["uses per-member transaction lock", /pg_advisory_xact_lock\(hashtextextended\(p_member_id, 0\)\)/.test(sql)],
  ["delegates after acquiring lock", /perform pg_advisory_xact_lock[\s\S]*evaluate_member_risk_internal/.test(sql)],
  ["grants only authenticated command execution", /grant execute on function public\.evaluate_member_risk\(text, timestamptz\) to authenticated/.test(sql)],
  ["is enforced by CI", workflow.includes("verify_product_d_concurrency.mjs")],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  for (const [label] of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}
for (const [label] of checks) console.log(`PASS: ${label}`);

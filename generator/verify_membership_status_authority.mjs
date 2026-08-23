import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260823250000_unify_membership_status_authority.sql"), "utf8");
const schema = fs.readFileSync(path.join(root, "docs/02-canonical-technical-schema.md"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/validate-dataset.yml"), "utf8");

const checks = [
  ["defines timestamp-aware status authority", /create or replace function public\.membership_status_at\(/.test(migration)],
  ["uses half-open effective intervals", /p_at >= history\.effective_at[\s\S]*p_at < coalesce\(history\.ended_at/.test(migration)],
  ["corrects member dashboard output", migration.includes("public.membership_status_at(membership.membership_id, p_as_of)")],
  ["corrects risk evaluation eligibility", migration.includes("public.membership_status_at(membership.membership_id, p_evaluated_at)")],
  ["corrects outreach retry eligibility", migration.includes("public.membership_status_at(m.membership_id, now())")],
  ["corrects Product D queue eligibility", migration.includes("public.membership_status_at(membership.membership_id, now())")],
  ["guards every deployed-definition replacement", (migration.match(/replacement did not match/g) ?? []).length === 4],
  ["documents history as authoritative", schema.includes("authoritative source for status at any point in time")],
  ["is enforced by CI", workflow.includes("verify_membership_status_authority.mjs")],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  for (const [label] of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}
for (const [label] of checks) console.log(`PASS: ${label}`);

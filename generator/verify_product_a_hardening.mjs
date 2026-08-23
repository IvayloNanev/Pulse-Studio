import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260823200000_harden_product_a_booking.sql"),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(root, ".github/workflows/validate-dataset.yml"),
  "utf8",
);

const migrationChecks = [
  ["records a selected drop-in path", /add column uses_drop_in boolean not null default false/],
  ["removes direct member reservation inserts", /drop policy if exists reservations_self_create/],
  ["removes direct member reservation updates", /drop policy if exists reservations_self_cancel/],
  ["removes direct member payment inserts", /drop policy if exists drop_in_payments_self_create/],
  ["accepts explicit drop-in choice", /p_use_drop_in boolean default false/],
  ["checks credit in the class billing cycle", /membership_classes_remaining\([\s\S]*v_membership_id,[\s\S]*v_session\.starts_at/],
  ["charges confirmed drop-ins exactly $35", /if p_use_drop_in and v_status = 'confirmed'[\s\S]*35\.00/],
  ["does not charge a waitlist immediately", /A waitlist choice is not charged until it becomes a confirmed reservation/],
  ["charges a selected drop-in on promotion", /if v_waitlisted\.uses_drop_in then[\s\S]*insert into public\.drop_in_payments/],
  ["refunds an early confirmed drop-in", /uses_drop_in and v_was_confirmed and not v_is_late[\s\S]*status = 'refunded'/],
  ["checks promotion credit in the class cycle", /membership_classes_remaining\([\s\S]*waitlisted\.membership_id,[\s\S]*v_session\.starts_at/],
  ["limits execution to authenticated callers", /grant execute on function public\.book_class_session\(text, boolean\) to authenticated/],
];

const requiredCiVerifiers = [
  "verify_product_a_booking_migration.mjs",
  "verify_product_a_hardening.mjs",
  "verify_product_b_attendance_commands.mjs",
  "verify_product_c_read_only_contract.mjs",
  "verify_product_d_risk_evaluation_command.mjs",
  "verify_product_d_case_outreach_commands.mjs",
];

const failures = migrationChecks
  .filter(([, pattern]) => !pattern.test(migration))
  .map(([label]) => label);

for (const verifier of requiredCiVerifiers) {
  if (!workflow.includes(verifier)) failures.push(`CI runs ${verifier}`);
}
if (!workflow.includes("pnpm --dir apps/web run lint")) failures.push("CI lints the web app");
if (!workflow.includes("pnpm --dir apps/web run build")) failures.push("CI builds the web app");

if (failures.length > 0) {
  for (const label of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}

for (const [label] of migrationChecks) console.log(`PASS: ${label}`);
for (const verifier of requiredCiVerifiers) console.log(`PASS: CI runs ${verifier}`);
console.log("PASS: CI lints the web app");
console.log("PASS: CI builds the web app");

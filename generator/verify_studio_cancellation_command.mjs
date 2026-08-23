import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20260823220000_add_studio_cancellation_command.sql"),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(root, ".github/workflows/validate-dataset.yml"),
  "utf8",
);

const checks = [
  ["creates class-session audit facts", /create table public\.class_session_actions/],
  ["limits audit reads to staff", /class_session_actions_staff_read[\s\S]*is_active_staff/],
  ["defines cancellation command", /create function public\.cancel_class_session/],
  ["requires owner/admin", /if not public\.is_owner_admin\(\)/],
  ["requires a reason", /studio cancellation reason is required/],
  ["locks the session", /where session\.class_session_id = p_class_session_id[\s\S]*for update/],
  ["rejects started sessions", /v_now >= v_session\.starts_at/],
  ["marks the session cancelled", /set is_cancelled = true/],
  ["studio-cancels open reservations", /set status = 'studio_cancelled'[\s\S]*status in \('confirmed', 'waitlisted'\)/],
  ["refunds authorized drop-ins", /set status = 'refunded', refunded_at = v_now[\s\S]*payment\.status = 'authorized'/],
  ["notifies every affected reservation", /'studio_cancelled'[\s\S]*'reservation'[\s\S]*affected\.reservation_id/],
  ["records actor and reason", /performed_by_staff_id[\s\S]*btrim\(p_reason\)[\s\S]*v_staff_id/],
  ["grants command only to authenticated", /grant execute on function public\.cancel_class_session\(text, text\) to authenticated/],
  ["is enforced by CI", workflow.includes("verify_studio_cancellation_command.mjs")],
];

const failures = checks.filter(([, result]) =>
  result instanceof RegExp ? !result.test(sql) : !result
);

if (failures.length) {
  for (const [label] of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}

for (const [label] of checks) console.log(`PASS: ${label}`);

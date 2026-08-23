import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const enumSql = fs.readFileSync(path.join(root, "supabase/migrations/20260823230000_add_membership_pause_outcome.sql"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20260823231000_add_membership_pause_commands.sql"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/validate-dataset.yml"), "utf8");

const checks = [
  ["adds truthful reservation outcome", /add value if not exists 'membership_paused'/.test(enumSql)],
  ["removes direct pause writes", /drop policy if exists pause_requests_self_create[\s\S]*drop policy if exists pause_requests_owner_manage/.test(sql)],
  ["defines member request command", /create function public\.request_membership_pause/.test(sql)],
  ["enforces 30-day notice", /pause requires at least 30 days advance notice/.test(sql)],
  ["enforces 30-to-90-day duration", /pause duration must be between 30 and 90 days/.test(sql)],
  ["enforces rolling 12-month frequency", /only one approved pause is allowed in any rolling 12-month period/.test(sql)],
  ["defines owner approval command", /create function public\.approve_membership_pause/.test(sql)],
  ["locks request and membership", /pause_request_id = p_pause_request_id[\s\S]*for update[\s\S]*membership_id = v_request\.membership_id[\s\S]*for update/.test(sql)],
  ["writes paused and resumed history", /v_request\.membership_id, 'paused'[\s\S]*v_request\.membership_id, 'active'/.test(sql)],
  ["cancels pause-period reservations", /set status = 'membership_paused'/.test(sql)],
  ["refunds authorized drop-ins", /set status = 'refunded', refunded_at = v_now[\s\S]*payment\.status = 'authorized'/.test(sql)],
  ["notifies affected members", /'membership_pause_cancelled'[\s\S]*affected\.reservation_id/.test(sql)],
  ["records simulated $25 fee", /'pause_administration', 25\.00, 'simulated'/.test(sql)],
  ["defines reasoned denial command", /create function public\.deny_membership_pause[\s\S]*denial reason is required/.test(sql)],
  ["records decision actor and time", /decided_by_staff_id = v_staff_id, decided_at = v_now/.test(sql)],
  ["is enforced by CI", workflow.includes("verify_membership_pause_commands.mjs")],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  for (const [label] of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}
for (const [label] of checks) console.log(`PASS: ${label}`);

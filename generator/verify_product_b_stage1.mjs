import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260825160000_add_product_b_command_center_underbooking.sql"), "utf8");
const checks = [
  ["session access helper", /function public\.can_access_product_b_session/],
  ["protected Product B session view", /view public\.staff_product_b_sessions/],
  ["assigned-instructor rule", /session\.instructor_staff_id = staff\.staff_id/],
  ["decision history table", /table public\.product_b_underbooking_decisions/],
  ["one open decision", /unique index product_b_one_open_decision_per_session/],
  ["owner decision authorization", /if not public\.is_owner_admin\(\)/],
  ["confirmed-only utilization", /status = 'confirmed'/],
  ["exact half threshold", /v_confirmed::numeric \/ v_session\.capacity >= 0\.5/],
  ["roster access scope", /can_access_product_b_session\(session\.class_session_id\)/],
  ["attendance access scope", /can_access_product_b_session\(v_session_id\)/],
  ["historical decision comment", /Live warning eligibility and utilization remain derived/],
];

let failures = 0;
for (const [label, pattern] of checks) {
  const ok = pattern.test(migration);
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  if (!ok) failures += 1;
}
if (failures) process.exit(1);

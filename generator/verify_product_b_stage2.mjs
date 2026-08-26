import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260825190000_complete_product_b_attendance_workflow.sql"), "utf8");
const actions = fs.readFileSync(path.join(root, "apps/web/src/app/staff/actions.ts"), "utf8");
const roster = fs.readFileSync(path.join(root, "apps/web/src/app/staff/rosters/[sessionId]/page.tsx"), "utf8");
const commandCenter = fs.readFileSync(path.join(root, "apps/web/src/components/staff/session-operations-card.tsx"), "utf8");

const checks = [
  [migration, /add column recorded_by_staff_id text/i, "canonical recorder attribution"],
  [migration, /v_staff_id text := public\.current_staff_id\(\)/i, "database-derived Staff actor"],
  [migration, /record_session_attendance_bulk/i, "fixed-purpose bulk command"],
  [migration, /can_access_product_b_session\(p_class_session_id\)/i, "session authorization"],
  [migration, /attendance has already been recorded/i, "non-overwrite guard"],
  [migration, /revoke all on function public\.record_session_attendance_bulk.*public, anon/i, "PUBLIC and anon revocation"],
  [actions, /rpc\("record_session_attendance_bulk"/i, "bulk server action"],
  [actions, /rpc\("correct_attendance"/i, "authorized correction route"],
  [actions, /attendanceErrorMessage/i, "safe browser error mapping"],
  [roster, /staff_product_b_sessions/i, "protected Product B session source"],
  [roster, /correction_history/i, "correction history UI"],
  [roster, /Recorder unavailable/i, "truthful historical attribution"],
  [commandCenter, /Attendance complete|Attendance not started/i, "command-center attendance progress"],
];

for (const [source, pattern, label] of checks) {
  if (!pattern.test(source)) throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}
if (/recorded_by_staff_id/.test(actions)) throw new Error("FAIL client/server action must not supply recorder identity");
console.log("PASS no client-supplied recorder identity");
console.log(`Product B Stage 2 verification passed (${checks.length + 1} checks).`);

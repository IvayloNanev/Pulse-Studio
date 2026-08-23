import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20260823160000_add_product_d_risk_evaluation_command.sql"),
  "utf8",
);

const checks = [
  ["defines staff evaluation command", /create or replace function public\.evaluate_member_risk/],
  ["requires active staff", /public\.current_staff_id\(\)/],
  ["uses previous 30-day window", /p_evaluated_at - interval '60 days'/],
  ["uses current 30-day window", /p_evaluated_at - interval '30 days'/],
  ["counts attended only", /attendance\.attendance_status = 'attended'/],
  ["excludes paused attendance", /pause\.status = 'paused'/],
  ["requires 60-day membership history", /insufficient_membership_history/],
  ["requires four previous visits", /v_previous_visits < 4/],
  ["uses canonical decline formula", /v_decline := round\(\(\(v_previous_visits - v_current_visits\)::numeric/],
  ["uses 75-percent high boundary", /v_decline >= 75/],
  ["stores qualifying assessments only", /decline_below_threshold[\s\S]*insert into public\.risk_assessments/],
  ["prevents duplicate open episodes", /open_episode_exists/],
  ["requires recovery before a new episode", /no_recovery_since_previous_episode/],
  ["blocks outreach for do-not-contact", /not v_member\.do_not_contact/],
  ["requires active membership for outreach", /membership\.status = 'active'[\s\S]*history\.status = 'active'/],
  ["creates one initial draft", /attempt_number[\s\S]*v_channel[\s\S]*v_message[\s\S]*'draft'/],
  ["audits draft creation", /insert into public\.outreach_actions/],
  ["grants command only to authenticated", /grant execute on function public\.evaluate_member_risk[\s\S]*to authenticated/],
];

const failed = checks.filter(([, pattern]) => !pattern.test(sql));
for (const [label] of checks) console.log(`${failed.some(([name]) => name === label) ? "FAIL" : "PASS"}: ${label}`);
if (failed.length) process.exit(1);

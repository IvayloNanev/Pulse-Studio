import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const root = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20260823170100_add_product_d_case_outreach_commands.sql"), "utf8");
const names = ["create_risk_note", "edit_risk_note", "delete_risk_note", "start_risk_review", "dismiss_risk_case", "edit_outreach_draft", "approve_outreach", "send_outreach", "complete_outreach", "create_outreach_retry", "resolve_no_response"];
const checks = names.map((name) => [`defines ${name}`, new RegExp(`create or replace function public\\.${name}`)]);
checks.push(
  ["requires note body", /note body is required/], ["soft deletes notes", /deleted_by_staff_id = v_staff_id, deleted_at = now\(\)/],
  ["audits edits", /append_outreach_action\(p_outreach_id, 'edited'\)/], ["preserves ordered states", /status = 'ready'[\s\S]*status = 'sent'[\s\S]*status = 'completed'/],
  ["simulates send notification", /'reengagement_outreach'[\s\S]*'simulated'/], ["records response resolution", /resolution_reason = 'response_' \|\| p_response::text/],
  ["enforces retry cooldown", /now\(\) < v_latest\.sent_at \+ interval '14 days'/], ["enforces three attempts", /v_latest\.attempt_number >= 3/],
  ["resolves three no-responses", /resolution_reason = 'no_response'/], ["removes broad risk writes", /drop policy if exists risk_assessments_staff_manage/],
  ["removes broad outreach writes", /drop policy if exists outreach_records_staff_manage/], ["removes broad notes writes", /drop policy if exists risk_case_notes_staff_manage/]
);
const failed = checks.filter(([, re]) => !re.test(sql));
for (const [name] of checks) console.log(`${failed.some(([x]) => x === name) ? "FAIL" : "PASS"}: ${name}`);
if (failed.length) process.exit(1);

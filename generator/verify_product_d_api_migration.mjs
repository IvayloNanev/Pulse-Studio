import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const migrationPath = path.join(root, "supabase", "migrations", "20260822230000_add_product_d_risk_contracts.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
const errors = [];
const requireText = (pattern, message) => { if (!pattern.test(sql)) errors.push(message); };

requireText(/view public\.product_d_risk_queue/i, "Product D risk queue is missing");
requireText(/view public\.product_d_member_detail/i, "Product D member detail is missing");
requireText(/function public\.staff_display_name/i, "safe staff display-name helper is missing");
requireText(/when public\.is_active_staff\(\)/i, "staff display-name helper is not caller-gated");
requireText(/security_barrier\s*=\s*true[\s\S]*security_invoker\s*=\s*true/i, "Product D views must use invoker and barrier security");
requireText(/risk\.review_status in \('pending', 'in_progress'\)/i, "queue does not restrict itself to open review states");
requireText(/case risk\.risk_level when 'high' then 1 when 'medium' then 2/i, "risk priority mapping is missing");
requireText(/latest_outreach\.sent_at \+ interval '14 days'/i, "14-day cooldown is missing");
requireText(/latest_outreach\.attempt_number < 3/i, "three-attempt limit is missing");
requireText(/member\.do_not_contact then false/i, "do-not-contact blocking is missing");
requireText(/public\.is_active_staff\(\)/i, "Product D interfaces are not restricted to active staff");
requireText(/attendance\.attendance_status = 'attended'/i, "attendance evidence does not restrict itself to attended outcomes");
requireText(/note\.deleted_at is null/i, "deleted coworker notes are not hidden");
requireText(/public\.staff_display_name\(note\.created_by_staff_id\)/i, "coworker note author names do not use the safe display helper");
requireText(/jsonb_agg[\s\S]*outreach_attempts/i, "outreach history aggregation is missing");
requireText(/schedule\.available_spots > 0/i, "class recommendation does not require availability");
requireText(/revoke all on public\.product_d_risk_queue from anon/i, "anonymous queue access is not revoked");
requireText(/revoke all on public\.product_d_member_detail from anon/i, "anonymous detail access is not revoked");

if (/grant select on public\.product_d_[a-z_]+ to anon/i.test(sql)) errors.push("Product D data must never be granted to anonymous users");

const queueFields = [
  "risk_assessment_id", "member_id", "member_name", "risk_level", "risk_priority",
  "review_status", "evaluated_at", "previous_visits", "current_visits", "decline_percentage",
  "risk_reason", "last_attended_at", "active_note_count", "outreach_id",
  "outreach_attempt_number", "outreach_status", "response_outcome", "last_sent_at",
  "cooldown_until", "can_start_outreach", "outreach_blocked_reason",
];
const detailFields = [
  "email", "phone", "preferred_channel", "do_not_contact", "resolved_at", "resolution_reason",
  "attendance_evidence", "active_notes", "outreach_attempts", "recommended_class_session_id",
  "recommended_class_type", "recommended_starts_at", "recommended_available_spots",
];
for (const field of [...queueFields, ...detailFields]) {
  requireText(new RegExp(`\\b${field}\\b`, "i"), `missing Product D field ${field}`);
}

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  migration: path.relative(root, migrationPath),
  interfaces: ["product_d_risk_queue", "product_d_member_detail"],
  queue_fields: queueFields.length,
  detail_specific_fields: detailFields.length,
  staff_only: true,
  product_c_write_access: false,
}, null, 2));

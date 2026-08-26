import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const hardeningMigration = fs.readFileSync(path.join(root, "supabase/migrations/20260825170000_harden_product_d_shared_security.sql"), "utf8");
const reconciliationMigration = fs.readFileSync(path.join(root, "supabase/migrations/20260825180000_reconcile_product_d_staff_interfaces.sql"), "utf8");
const migration = `${hardeningMigration}\n${reconciliationMigration}`;
const queuePage = fs.readFileSync(path.join(root, "apps/web/src/app/staff/retention/page.tsx"), "utf8");
const detailPage = fs.readFileSync(path.join(root, "apps/web/src/app/staff/retention/[riskId]/page.tsx"), "utf8");
const journeyPage = fs.readFileSync(path.join(root, "apps/web/src/app/staff/retention/[riskId]/journey/page.tsx"), "utf8");
const authMigration = fs.readFileSync(path.join(root, "supabase/migrations/20260822210000_add_auth_rls_policies.sql"), "utf8");

const checks = [
  ["defines fixed Product D queue RPC", /function public\.product_d_risk_queue\(\)[\s\S]*returns table/.test(migration)],
  ["defines fixed Product D detail RPC", /function public\.product_d_member_detail\(p_risk_assessment_id text\)[\s\S]*returns table/.test(migration)],
  ["defines fixed Product D evaluation-options RPC", /function public\.product_d_evaluation_member_options\(\)[\s\S]*returns table/.test(reconciliationMigration)],
  ["defines fixed Product D case-history RPC", /function public\.product_d_case_history\(\)[\s\S]*returns table/.test(reconciliationMigration)],
  ["uses security definer with fixed search path", (reconciliationMigration.match(/security definer/g) ?? []).length === 4 && (reconciliationMigration.match(/set search_path = public, pg_temp/g) ?? []).length === 4],
  ["validates active staff inside every reconciliation RPC", (reconciliationMigration.match(/current_staff_id\(\) is null/g) ?? []).length === 4],
  ["revokes Product D RPCs from PUBLIC and anon", /revoke all on function public\.product_d_risk_queue\(\) from public[\s\S]*from anon/.test(migration) && /revoke all on function public\.product_d_member_detail\(text\) from public[\s\S]*from anon/.test(migration)],
  ["grants Product D RPCs only to authenticated", /grant execute on function public\.product_d_risk_queue\(\) to authenticated/.test(migration) && /grant execute on function public\.product_d_member_detail\(text\) to authenticated/.test(migration)],
  ["queue UI uses hardened RPC", /\.rpc\("product_d_risk_queue"\)/.test(queuePage) && !/\.from\("product_d_risk_queue"\)/.test(queuePage)],
  ["detail UI uses hardened RPC", /\.rpc\("product_d_member_detail"/.test(detailPage) && !/\.from\("product_d_member_detail"\)/.test(detailPage)],
  ["evaluation options and case history use hardened RPCs", /\.rpc\("product_d_evaluation_member_options"\)/.test(queuePage) && /\.rpc\("product_d_case_history"\)/.test(queuePage) && !/\.from\("members"\)/.test(queuePage)],
  ["journey uses hardened detail RPC only", /\.rpc\("product_d_member_detail"/.test(journeyPage) && !/\.from\("product_d_(?:risk_queue|member_detail)"\)/.test(journeyPage)],
  ["removes broad canonical instructor policies", ["members_staff_read", "reservations_staff_read", "class_sessions_staff_read", "memberships_staff_read", "membership_history_staff_read"].every((policy) => migration.includes(`drop policy if exists ${policy}`))],
  ["preserves Product A member self policies", /members_self_read/.test(authMigration) && /reservations_self_read/.test(authMigration) && /reservations_self_create/.test(authMigration) && /reservations_self_cancel/.test(authMigration)],
  ["preserves public schedule policy", /class_sessions_public_read[\s\S]*not is_cancelled/.test(authMigration)],
];

for (const [label, passed] of checks) {
  if (!passed) throw new Error(`Product D shared-security verification failed: ${label}`);
  console.log(`PASS ${label}`);
}

console.log(`Product D shared-security verification passed (${checks.length} checks).`);

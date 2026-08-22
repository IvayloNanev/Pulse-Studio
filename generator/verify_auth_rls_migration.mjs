import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const migrationPath = path.join(root, "supabase", "migrations", "20260822210000_add_auth_rls_policies.sql");
const sql = fs.readFileSync(migrationPath, "utf8");
const errors = [];
const requireText = (pattern, message) => {
  if (!pattern.test(sql)) errors.push(message);
};

for (const helper of ["current_member_id", "current_staff_id", "is_active_staff", "is_owner_admin"]) {
  requireText(new RegExp(`create or replace function public\\.${helper}\\(\\)`, "i"), `missing authentication helper ${helper}`);
  requireText(new RegExp(`revoke all on function public\\.${helper}\\(\\) from public`, "i"), `helper ${helper} remains executable by public`);
  requireText(new RegExp(`grant execute on function public\\.${helper}\\(\\) to authenticated`, "i"), `helper ${helper} is not granted to authenticated users`);
}

requireText(/revoke all on all tables in schema public from anon, authenticated/i, "default anon/authenticated table privileges are not revoked");
requireText(/grant select on public\.membership_plans, public\.class_sessions to anon/i, "anonymous schedule/catalog grant is missing");
requireText(/class_sessions_public_read[\s\S]*using \(not is_cancelled\)/i, "public class policy must hide cancelled sessions");
requireText(/members_self_read[\s\S]*member_id = public\.current_member_id\(\)/i, "member profile ownership policy is missing");
requireText(/reservations_self_create[\s\S]*member_id = public\.current_member_id\(\)/i, "member reservation ownership policy is missing");
requireText(/reservations_self_cancel[\s\S]*status = 'cancelled'/i, "member cancellation-only policy is missing");
requireText(/outreach_records_staff_manage[\s\S]*public\.is_active_staff\(\)/i, "Product D outreach staff policy is missing");
requireText(/risk_case_notes_staff_manage[\s\S]*public\.is_active_staff\(\)/i, "Product D notes staff policy is missing");
requireText(/outreach_actions_staff_append[\s\S]*staff_id = public\.current_staff_id\(\)/i, "outreach audit actor policy is missing");

const policies = [...sql.matchAll(/create policy\s+([a-z0-9_]+)/gi)].map((match) => match[1]);
if (policies.length < 30) errors.push(`expected at least 30 explicit RLS policies; found ${policies.length}`);
if (new Set(policies).size !== policies.length) errors.push("duplicate RLS policy names detected");

const unsafeAnon = [...sql.matchAll(/grant\s+(?:select|insert|update|delete|all)[^;]*\s+to\s+anon/gi)]
  .map((match) => match[0])
  .filter((grant) => !grant.includes("membership_plans") && !grant.includes("class_sessions"));
if (unsafeAnon.length) errors.push(`unexpected anonymous table grant: ${unsafeAnon.join(" | ")}`);

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  migration: path.relative(root, migrationPath),
  helper_functions: 4,
  policies: policies.length,
  anonymous_tables: ["membership_plans", "class_sessions"],
  product_d_staff_only: true,
}, null, 2));

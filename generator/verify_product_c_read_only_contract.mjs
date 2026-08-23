import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20260823183000_add_product_c_read_only_contract.sql"), "utf8");
const checks = [
  ["defines approved policy table", /create table public\.product_c_policy_answers/],
  ["publishes general policies", /grant select on public\.product_c_policy_answers to anon, authenticated/],
  ["defines member context", /create or replace function public\.product_c_member_context/],
  ["requires current member", /public\.current_member_id\(\) is not null/],
  ["reuses member dashboard", /public\.member_dashboard\(p_as_of\)/],
  ["reuses member reservations", /public\.member_reservations\(p_from\)/],
  ["returns empty reservation array", /'\[\]'::jsonb/],
  ["grants member context only to authenticated", /grant execute on function public\.product_c_member_context[\s\S]*to authenticated/],
  ["states unsupported-answer behavior", /must not invent a policy or availability fact/],
  ["includes exact cancellation boundary", /exactly 12 hours before class is early/],
  ["includes canonical plan prices", /4 classes monthly for \$99[\s\S]*8 classes monthly for \$179[\s\S]*12 classes monthly for \$249/],
];

for (const forbidden of ["insert into public.risk_assessments", "update public.risk_assessments", "insert into public.outreach_records", "update public.outreach_records", "insert into public.reservations", "update public.reservations"]) {
  checks.push([`forbids ${forbidden}`, new RegExp(forbidden.replaceAll(".", "\\."), "i")]);
}

const failed = checks.filter(([name, pattern]) => name.startsWith("forbids ") ? pattern.test(sql) : !pattern.test(sql));
for (const [name] of checks) console.log(`${failed.some(([failedName]) => failedName === name) ? "FAIL" : "PASS"}: ${name}`);
if (failed.length) process.exit(1);

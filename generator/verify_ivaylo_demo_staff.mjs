import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260825014000_provision_ivaylo_demo_staff.sql"),
  "utf8",
);

const checks = [
  ["uses the approved staff email", /ivaylo\.nanev@pusuit\.org/i],
  ["looks up the Supabase Auth identity", /from auth\.users[\s\S]*lower\(auth_user\.email\)/i],
  ["creates an owner-admin staff profile", /'owner_admin'/i],
  ["keeps the staff account active", /'active'/i],
  ["is idempotent", /on conflict \(staff_id\) do update/i],
  ["does not expose provisioning to clients", /revoke all on function public\.provision_ivaylo_demo_staff\(\) from public, anon, authenticated/i],
];

const failures = checks.filter(([, pattern]) => !pattern.test(migration));
if (failures.length) {
  console.error(`Ivaylo staff provisioning verification failed: ${failures.map(([name]) => name).join(", ")}`);
  process.exit(1);
}

if (/encrypted_password|service_role/i.test(migration.replace(/--[^\n]*/g, ""))) {
  console.error("Staff provisioning must not store passwords or service-role credentials.");
  process.exit(1);
}

console.log("Ivaylo demo staff provisioning verification passed.");

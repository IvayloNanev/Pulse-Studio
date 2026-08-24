import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260824020000_add_ethan_demo_member.sql"),
  "utf8",
);

const requirements = [
  ["dedicated member", /MEM-DEMO-ETHAN/],
  ["dedicated membership", /MSP-DEMO-ETHAN/],
  ["active status history", /MSH-DEMO-ETHAN-001[\s\S]*?'active'/],
  ["simulated payment", /SPM-MEM-DEMO-ETHAN[\s\S]*?'4242'/],
  ["email-based Auth lookup", /from auth\.users[\s\S]*?ethannanev@gmail\.com/],
  ["Lena mapping restoration", /member_id = 'MEM-0016'[\s\S]*?v_auth_subject/],
];

const failures = requirements
  .filter(([, pattern]) => !pattern.test(migration))
  .map(([label]) => label);

if (failures.length > 0) {
  console.error(`Ethan demo-member contract failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log("Ethan demo-member contract: PASS");

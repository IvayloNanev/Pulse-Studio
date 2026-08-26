import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260825200000_add_product_b_session_safeguards.sql"), "utf8");
const actions = fs.readFileSync(path.join(root, "apps/web/src/app/staff/actions.ts"), "utf8");
const detail = fs.readFileSync(path.join(root, "apps/web/src/app/staff/rosters/[sessionId]/page.tsx"), "utf8");
const cancellation = fs.readFileSync(path.join(root, "apps/web/src/components/staff-session-cancellation.tsx"), "utf8");
const errors = fs.readFileSync(path.join(root, "apps/web/src/lib/product-b/session-errors.ts"), "utf8");

const checks = [
  [migration, /create or replace function public\.cancel_class_session/, "reuses authoritative cancellation command"],
  [migration, /session cancellation conflicts with recorded attendance/, "blocks attendance conflict"],
  [migration, /public\.is_owner_admin\(\)/, "preserves owner authorization"],
  [migration, /performed_by_staff_id[\s\S]*v_staff_id/, "derives audit actor"],
  [migration, /status = 'studio_cancelled'/, "preserves reservation outcomes"],
  [migration, /status = 'refunded'/, "preserves simulated refund contract"],
  [migration, /revoke all on function public\.cancel_class_session\(text, text\) from public, anon/, "denies public and anonymous execution"],
  [actions, /rpc\("cancel_class_session"/, "uses fixed-purpose server action"],
  [errors, /This action conflicts with recorded attendance\./, "maps safe attendance conflict"],
  [cancellation, /window\.confirm/, "requires explicit confirmation"],
  [cancellation, /Review for cancellation[\s\S]*actual state-changing command|actual state-changing command[\s\S]*Review for cancellation/, "separates recommendation and command"],
  [detail, /Session state:/, "surfaces factual session state"],
  [detail, /Only an owner\/admin may cancel a session\./, "does not broaden instructor actions"],
  [detail, /Session action history/, "surfaces cancellation audit history"],
];

let failed = false;
for (const [source, pattern, label] of checks) {
  if (!pattern.test(source)) { console.error(`FAIL ${label}`); failed = true; }
  else console.log(`PASS ${label}`);
}
if (/capacity|instructor_staff_id|starts_at|ends_at/.test(actions.match(/export async function cancelClassSession[\s\S]*?\n}/)?.[0] ?? "")) {
  console.error("FAIL cancellation action must not become a generic session editor");
  failed = true;
} else console.log("PASS no generic session editor");
if (failed) process.exit(1);
console.log(`Product B Stage 3 verification passed (${checks.length + 1} checks).`);

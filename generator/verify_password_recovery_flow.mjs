import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const callback = fs.readFileSync(path.join(root, "apps/web/src/app/auth/callback/route.ts"), "utf8");
const login = fs.readFileSync(path.join(root, "apps/web/src/components/login-panel.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "apps/web/src/app/auth/update-password/page.tsx"), "utf8");
const form = fs.readFileSync(path.join(root, "apps/web/src/components/update-password-form.tsx"), "utf8");
const layout = fs.readFileSync(path.join(root, "apps/web/src/app/layout.tsx"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/validate-dataset.yml"), "utf8");

const checks = [
  ["recovery email targets callback", /auth\/callback\?audience=\$\{audience\}/.test(login)],
  ["callback requires a code", /searchParams\.get\("code"\)/.test(callback)],
  ["callback exchanges code server-side", /await supabase\.auth\.exchangeCodeForSession\(code\)/.test(callback)],
  ["callback uses controlled destination", /new URL\("\/auth\/update-password", requestUrl\.origin\)/.test(callback)],
  ["callback handles expired links", /invalid_or_expired/.test(callback)],
  ["page verifies the authenticated user", /await supabase\.auth\.getUser\(\)/.test(page)],
  ["form is disabled without verified session", /disabled=\{isSubmitting \|\| !sessionReady\}/.test(form)],
  ["password update requires Supabase session", /supabase\.auth\.updateUser\(\{ password \}\)/.test(form)],
  ["successful recovery signs out", /await supabase\.auth\.signOut\(\)/.test(form)],
  ["successful recovery returns to audience login", /audience === "staff" \? "\/staff\/login\?password=updated" : "\/login\?password=updated"/.test(form)],
  ["global recovery listener removed", !layout.includes("RecoveryRedirect")],
  ["is enforced by CI", workflow.includes("verify_password_recovery_flow.mjs")],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) {
  for (const [label] of failures) console.error(`FAIL: ${label}`);
  process.exit(1);
}
for (const [label] of checks) console.log(`PASS: ${label}`);

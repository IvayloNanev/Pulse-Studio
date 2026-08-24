import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migration = await fs.readFile(path.join(root, "supabase/migrations/20260823300000_add_simulated_payment_methods.sql"), "utf8");
const joinPage = await fs.readFile(path.join(root, "apps/web/src/app/join/page.tsx"), "utf8");
const joinAction = await fs.readFile(path.join(root, "apps/web/src/app/join/actions.ts"), "utf8");
const account = await fs.readFile(path.join(root, "apps/web/src/app/member/account/page.tsx"), "utf8");
const rules = await fs.readFile(path.join(root, "docs/01-product-shared-contract.md"), "utf8");

const errors = [];
const requireText = (source, token, message) => { if (!source.includes(token)) errors.push(message); };
for (const token of ["create table public.simulated_payment_methods", "last_four", "expiration_month", "billing_zip", "simulated_payment_methods_self_read", "drop_in_payment_method_assignment", "p_security_code", "right(v_card_number, 4)"]) requireText(migration, token, `migration missing ${token}`);
if (/full_card|card_number\s+text|security_code\s+text/.test(migration.match(/create table public\.simulated_payment_methods[\s\S]*?\n\);/)?.[0] ?? "")) errors.push("payment-method table must not store full card number or security code");
for (const token of ["cardholder_name", "card_brand", "card_number", "expiration_month", "expiration_year", "security_code", "billing_zip"]) {
  requireText(joinPage, `name=\"${token}\"`, `Join page missing ${token}`);
  requireText(joinAction, `p_${token}`, `Join action missing p_${token}`);
}
requireText(account, "simulated_payment_methods", "Account does not read simulated methods");
requireText(rules, "Simulated payment policy", "business rules omit simulated payments");

if (errors.length) { console.error(JSON.stringify({ status: "failed", errors }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ status: "passed", full_card_data_stored: false, registration_connected: true, account_connected: true }, null, 2));

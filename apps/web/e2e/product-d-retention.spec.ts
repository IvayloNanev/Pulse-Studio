import { expect, test } from "@playwright/test";

import { productDErrorMessage } from "../src/lib/product-d/errors";

test("Product D database errors map to browser-safe messages", () => {
  const safe = productDErrorMessage({ message: "internal function public.start_risk_review failed at PostgreSQL constraint" });
  expect(safe).toBe("We couldn't update the retention case. Please try again.");
  expect(safe).not.toMatch(/postgres|constraint|public\.|function|P0001/i);
});

test("active staff retention queue and complete detail load through hardened RPCs", async ({ page }) => {
  await page.goto("/staff/login");
  await page.getByLabel("Email address").fill("instructor@pulse.example");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in as staff" }).click();

  await page.goto("/staff/retention");
  await expect(page.getByRole("heading", { name: "Members needing attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evelyn Rivera" })).toBeVisible();
  await expect(page.getByText("Visits fell from 8 to 2: 75% decline")).toBeVisible();

  await page.getByRole("link", { name: "Review case" }).click();
  await expect(page.getByRole("heading", { name: "Evelyn Rivera" })).toBeVisible();
  await expect(page.getByText("evelyn@pulse.example · +1-212-555-0175")).toBeVisible();
  await expect(page.getByText("Member preferred evening classes last month.")).toBeVisible();
  await expect(page.getByText("We would love to help you return.", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Yoga", { exact: true })).toBeVisible();
  await expect(page.getByText("cycling", { exact: true })).toBeVisible();
});

test("Product D action failure never exposes raw database details", async ({ page }) => {
  await page.goto("/staff/login");
  await page.getByLabel("Email address").fill("instructor@pulse.example");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in as staff" }).click();
  await page.goto("/staff/retention/RISK-E2E-PD");

  const [actionResponse] = await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/staff/retention/RISK-E2E-PD")),
    page.getByRole("button", { name: "Start review" }).click(),
  ]);
  const redirect = decodeURIComponent(actionResponse.headers()["x-action-redirect"] ?? "");
  expect(redirect).toContain("You do not have permission to perform this action.");
  expect(redirect).not.toMatch(/PostgreSQL|constraint|public\.|function|P0001/i);
});

import { expect, test } from "@playwright/test";

import { productDErrorMessage } from "../src/lib/product-d/errors";

test("Product D database errors map to browser-safe messages", () => {
  const safe = productDErrorMessage({ message: "internal function public.start_risk_review failed at PostgreSQL constraint" });
  expect(safe).toBe("We couldn't update the retention case. Please try again.");
  expect(safe).not.toMatch(/postgres|constraint|public\.|function|P0001/i);
});

test("active staff retention queue, evaluation options, history, detail, and journey load through hardened RPCs", async ({ page }) => {
  await page.goto("/staff/login");
  await page.getByLabel("Email address").fill("instructor@pulse.example");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in as staff" }).click();

  await expect(page).toHaveURL(/\/staff$/);
  await page.goto("/staff/retention");
  await expect(page.getByRole("heading", { name: "Member retention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evelyn Rivera" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Rivera, Evelyn · evelyn@pulse.example" })).toHaveAttribute("value", "MEM-E2E-PD");
  await expect(page.getByRole("heading", { name: "Attendance change by member" })).toBeVisible();
  await expect(page.getByText("Previous visits").first()).toBeVisible();
  await expect(page.getByText("Current visits").first()).toBeVisible();

  await page.goto("/staff/retention/RISK-E2E-PD");
  await expect(page.getByRole("heading", { name: "Evelyn Rivera" })).toBeVisible();
  await expect(page.getByText("evelyn@pulse.example", { exact: true })).toBeVisible();
  await expect(page.getByText("+1-212-555-0175", { exact: true })).toBeVisible();
  await expect(page.getByText("Member preferred evening classes last month.")).toBeVisible();
  await expect(page.getByText("Yoga", { exact: true })).toBeVisible();
  await expect(page.getByText("cycling", { exact: true })).toBeVisible();

  await page.goto("/staff/retention/RISK-E2E-PD/journey");
  await expect(page.getByRole("heading", { name: "Evelyn Rivera's journey" })).toBeVisible();
  await expect(page.getByText("Previous visits:")).toBeVisible();
  await expect(page.getByText("An outreach attempt is already being prepared", { exact: true })).toBeVisible();
  await expect(page.getByText("We would love to help you return.", { exact: true }).first()).toBeVisible();
});

test("Product D action failure never exposes raw database details", async ({ page }) => {
  await page.goto("/staff/login");
  await page.getByLabel("Email address").fill("instructor@pulse.example");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in as staff" }).click();
  await expect(page).toHaveURL(/\/staff$/);
  await page.goto("/staff/retention/RISK-E2E-PD/journey");

  const [actionResponse] = await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/staff/retention/RISK-E2E-PD/journey")),
    page.getByRole("button", { name: "Start review" }).click(),
  ]);
  const redirect = decodeURIComponent(actionResponse.headers()["x-action-redirect"] ?? "");
  expect(redirect).toContain("You do not have permission to perform this action.");
  expect(redirect).not.toMatch(/PostgreSQL|constraint|public\.|function|P0001/i);
});

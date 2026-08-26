import { expect, test } from "@playwright/test";

import { getUnderbookingState } from "../src/lib/product-b/underbooking";
import { productBDecisionErrorMessage } from "../src/lib/product-b/decision-errors";

const boundaries = [
  [0, "Underbooked", true],
  [39, "Underbooked", true],
  [40, "Moderate", true],
  [49, "Moderate", true],
  [50, "Moderate", false],
  [69, "Moderate", false],
  [70, "Healthy", false],
  [89, "Healthy", false],
  [90, "Nearly full", false],
  [100, "Nearly full", false],
] as const;

for (const [confirmed, band, warning] of boundaries) {
  test(`Product B classifies ${confirmed}% exactly`, () => {
    expect(getUnderbookingState(confirmed, 100)).toEqual({ utilization: confirmed, band, warning });
  });
}

test("canceled and invalid-capacity sessions never warn", () => {
  expect(getUnderbookingState(0, 100, true).warning).toBe(false);
  expect(getUnderbookingState(0, 0).warning).toBe(false);
});

test("warning uses the exact ratio rather than the rounded display percentage", () => {
  expect(getUnderbookingState(50, 101)).toEqual({ utilization: 50, band: "Moderate", warning: true });
  expect(getUnderbookingState(50, 100)).toEqual({ utilization: 50, band: "Moderate", warning: false });
});

test("decision database errors map to stable browser-safe messages", () => {
  const cases = [
    [{ code: "23505", message: 'duplicate key violates constraint "product_b_one_open_decision_per_session"' }, "An open decision already exists for this session."],
    [{ message: "session is not currently underbooked" }, "This session no longer requires an underbooking decision."],
    [{ message: "owner/admin access required" }, "You do not have permission to perform this action."],
    [{ message: "invalid Product B operational action" }, "Choose a valid operational action."],
    [{ message: "internal function public.create_product_b_underbooking_decision failed" }, "We couldn't save the decision. Please try again."],
  ] as const;

  for (const [error, expected] of cases) {
    const safeMessage = productBDecisionErrorMessage(error);
    expect(safeMessage).toBe(expected);
    expect(safeMessage).not.toMatch(/23505|constraint|product_b_one_open_decision|public\.|postgres|function/i);
  }
});

test("unauthenticated staff command center redirects to staff login", async ({ page }) => {
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login$/);
});

test("owner sees live underbooking and preserves a decision across refresh", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/staff/login");
  await page.getByLabel("Email address").fill("owner@pulse.example");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in as staff" }).click();

  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByRole("heading", { name: "Operations command center" })).toBeVisible();
  const attention = page.getByRole("region", { name: "Needs attention" });
  await expect(attention.getByText("40%", { exact: true })).toBeVisible();
  await expect(attention.getByText("Moderate", { exact: true })).toBeVisible();
  await expect(attention.locator("span").getByText("Needs attention", { exact: true })).toBeVisible();
  await expect(attention.getByText("Waitlisted", { exact: true }).locator("..").getByText("10", { exact: true })).toBeVisible();

  await attention.getByLabel("Operational response").selectOption("promote_class");
  await attention.getByLabel("Optional note").fill("Promote in the afternoon newsletter");
  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/staff"),
    attention.getByRole("button", { name: "Save decision" }).click(),
  ]);
  const createRedirect = decodeURIComponent(createResponse.headers()["x-action-redirect"] ?? "").split(";")[0];
  expect(createRedirect).toContain("Operational decision saved.");
  await page.goto(createRedirect);
  await expect(page.getByRole("status")).toContainText("Operational decision saved.");
  await expect(page.getByText("promote class", { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText("Promote in the afternoon newsletter", { exact: true }).first()).toBeVisible();

  const [resolveResponse] = await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/staff"),
    attention.getByRole("button", { name: "Resolve decision" }).click(),
  ]);
  const resolveRedirect = decodeURIComponent(resolveResponse.headers()["x-action-redirect"] ?? "").split(";")[0];
  expect(resolveRedirect).toContain("Operational decision resolved.");
  await page.goto(resolveRedirect);
  await expect(page.getByRole("status")).toContainText("Operational decision resolved.");
  await expect(attention.getByText("Resolved decision history", { exact: true })).toBeVisible();
  await expect(attention.getByText("Resolved historical decision", { exact: true })).toBeVisible();
  await expect(attention.getByLabel("Operational response")).toBeVisible();

  await attention.getByLabel("Operational response").selectOption("monitor");
  await attention.getByLabel("Optional note").fill("Monitor the renewed underbooking warning");
  const [secondCreateResponse] = await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/staff"),
    attention.getByRole("button", { name: "Save decision" }).click(),
  ]);
  const secondCreateRedirect = decodeURIComponent(secondCreateResponse.headers()["x-action-redirect"] ?? "").split(";")[0];
  expect(secondCreateRedirect).toContain("Operational decision saved.");
  await page.goto(secondCreateRedirect);
  await expect(page.getByRole("status")).toContainText("Operational decision saved.");
  await expect(attention.getByText("Open operational decision", { exact: true })).toBeVisible();
  await expect(attention.getByText("Resolved historical decision", { exact: true })).toBeVisible();
  await expect(attention.getByText("Monitor the renewed underbooking warning", { exact: true })).toBeVisible();
  await expect(attention.getByLabel("Operational response")).toHaveCount(0);
});

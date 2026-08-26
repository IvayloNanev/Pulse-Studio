import { expect, test } from "@playwright/test";

import { sessionManagementErrorMessage } from "../src/lib/product-b/session-errors";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/staff/login");
  await page.getByLabel("Email address").fill("owner@pulse.example");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in as staff" }).click();
  await expect(page).toHaveURL(/\/staff$/);
}

test("session command errors map to stable Staff messages", () => {
  expect(sessionManagementErrorMessage({ message: "internal function public.cancel_class_session constraint 23505" })).toBe("Session could not be updated. Refresh and try again.");
  expect(sessionManagementErrorMessage({ message: "session cancellation conflicts with recorded attendance" })).toBe("This action conflicts with recorded attendance.");
});

test("owner confirms a future cancellation and sees its resulting state and audit history", async ({ page }) => {
  await signIn(page);
  await page.goto("/staff/rosters/SESSION-E2E-PB3-CANCEL");

  await expect(page.getByText("Session state: Upcoming", { exact: true })).toBeVisible();
  await page.getByText("Cancel this session", { exact: true }).click();
  await expect(page.getByText(/actual state-changing command/i)).toBeVisible();
  await expect(page.getByText("1 confirmed · 1 waitlisted", { exact: true })).toBeVisible();
  await page.getByLabel("Cancellation reason").fill("Instructor unavailable due to illness");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("This affects 2 member reservations.");
    await dialog.accept();
  });
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.request().method() === "POST" && candidate.url().endsWith("/staff/rosters/SESSION-E2E-PB3-CANCEL")),
    page.getByRole("button", { name: "Confirm session cancellation" }).click(),
  ]);
  const redirect = decodeURIComponent(response.headers()["x-action-redirect"] ?? "").split(";")[0];
  expect(redirect).not.toMatch(/postgres|constraint|public\.|function|23505/i);
  await page.goto(redirect);

  await expect(page.getByText("Session state: Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByText("Session cancelled. Member impacts and audit history were recorded.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Session action history" })).toBeVisible();
  await expect(page.getByText("Instructor unavailable due to illness", { exact: true })).toBeVisible();
  await expect(page.getByText("Cancel this session", { exact: true })).toHaveCount(0);
});

test("attendance blocks cancellation and a valid zero-roster session still loads", async ({ page }) => {
  await signIn(page);
  await page.goto("/staff/rosters/SESSION-E2E-PB3-CONFLICT");
  await expect(page.getByText("Cancellation is blocked because attendance has already been recorded.", { exact: true })).toBeVisible();
  await expect(page.getByText("Cancel this session", { exact: true })).toHaveCount(0);

  await page.goto("/staff/rosters/SESSION-E2E-PB3-ZERO");
  await expect(page.getByText("Session state: Upcoming", { exact: true })).toBeVisible();
  await expect(page.getByText("This valid session has no confirmed reservations. No attendance records will be created.", { exact: true })).toBeVisible();
  await expect(page.getByText("Cancel this session", { exact: true })).toBeVisible();
});

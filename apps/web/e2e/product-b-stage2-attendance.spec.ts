import { expect, test } from "@playwright/test";

import { attendanceErrorMessage } from "../src/lib/product-b/attendance-errors";

test("attendance database errors map to stable Staff messages", () => {
  expect(attendanceErrorMessage({ message: "internal function public.record_session_attendance_bulk constraint 23505" })).toBe("Attendance could not be updated. Try again.");
  expect(attendanceErrorMessage({ message: "Product B session access required" })).toBe("You don't have permission for this session.");
});

test("owner completes a roster in bulk and corrects an audited outcome", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/staff/login");
  await page.getByLabel("Email address").fill("owner@pulse.example");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in as staff" }).click();
  await expect(page).toHaveURL(/\/staff$/);

  await page.goto("/staff/rosters/SESSION-E2E-PB");
  await expect(page.getByRole("heading", { name: "Attendance summary" })).toBeVisible();
  await expect(page.getByText("Attendance in progress", { exact: true })).toBeVisible();
  await expect(page.getByText("1 of 3 marked", { exact: true })).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "Devon Historical" }).getByText(/by Recorder unavailable$/)).toBeVisible();
  await expect(page.getByText("Awaiting promotion. Attendance is unavailable until the reservation is confirmed.")).toBeVisible();

  await page.getByLabel("Avery Stone").check();
  await page.getByLabel("Blake Rivera").check();
  const [bulkResponse] = await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/staff/rosters/SESSION-E2E-PB")),
    page.getByRole("button", { name: "Mark selected no-show" }).click(),
  ]);
  const bulkRedirect = decodeURIComponent(bulkResponse.headers()["x-action-redirect"] ?? "").split(";")[0];
  expect(bulkRedirect).not.toMatch(/postgres|constraint|public\.|function|23505/i);
  await page.goto(bulkRedirect);
  await expect(page.getByText("Attendance complete", { exact: true })).toBeVisible();
  await expect(page.getByText("3 of 3 marked", { exact: true })).toBeVisible();
  await expect(page.getByText("Jordan Lee", { exact: false }).first()).toBeVisible();

  const avery = page.locator("article").filter({ hasText: "Avery Stone" });
  await avery.getByText("Correct attendance").click();
  await avery.getByLabel("Correction reason").fill("Member arrived after the initial roster review");
  await avery.getByRole("button", { name: "Save correction with audit history" }).click();
  await expect(page.getByText("Attendance correction saved with audit history.", { exact: true })).toBeVisible();
  await expect(page.getByText("no-show → attended", { exact: false })).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "Avery Stone" }).getByText("Member arrived after the initial roster review", { exact: false })).toBeVisible();
});

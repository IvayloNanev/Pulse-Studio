import { expect, test } from "@playwright/test";

import { newYorkWeekDays, newYorkWeekStart, newYorkWeekWindow } from "../src/lib/product-b/staff-week";

function newYorkKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/staff/login");
  await page.getByLabel("Email address").fill("owner@pulse.example");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in as staff" }).click();
  await expect(page).toHaveURL(/\/staff$/);
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("New York weeks stay Monday-based across month, year, and daylight-saving boundaries", () => {
  expect(newYorkWeekStart("2026-09-01", new Date("2026-01-01T12:00:00Z"))).toBe("2026-08-31");
  expect(newYorkWeekDays("2025-12-29")).toEqual(["2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]);
  expect(newYorkWeekStart("2026-99-99", new Date("2026-08-26T16:00:00Z"))).toBe("2026-08-24");
  const spring = newYorkWeekWindow("2026-03-02");
  const fall = newYorkWeekWindow("2026-10-26");
  expect((spring.endsAt.getTime() - spring.startsAt.getTime()) / 3_600_000).toBe(167);
  expect((fall.endsAt.getTime() - fall.startsAt.getTime()) / 3_600_000).toBe(169);
});

test("current week is grouped in New York time and sessions open detail", async ({ page }) => {
  await page.goto("/staff/rosters");
  await expect(page.getByRole("heading", { name: "Weekly schedule" })).toBeVisible();
  await expect(page.getByText("New York time", { exact: true })).toBeVisible();
  await expect(page.getByText("Product B", { exact: false })).toHaveCount(0);
  const sectionHeadings = await page.locator("main h2").allTextContents();
  expect(sectionHeadings.slice(0, 3)).toEqual(["Needs attention now", "Capacity watch", "Weekly schedule"]);
  await expect(page.getByTestId("desktop-week-grid").locator("section")).toHaveCount(7);
  const session = page.getByTestId("desktop-week-grid").locator('a[href="/staff/rosters/SESSION-E2E-PB"]');
  await expect(session).toBeVisible();
  await session.click();
  await expect(page).toHaveURL(/\/staff\/rosters\/SESSION-E2E-PB$/);
});

test("previous, next, and Today navigation preserve a usable weekly view", async ({ page }) => {
  await page.goto("/staff/rosters");
  const initialLabel = await page.getByLabel("Week navigation").locator("p").textContent();
  await page.getByRole("link", { name: "Next ›" }).click();
  await expect(page.getByLabel("Week navigation").locator("p")).not.toHaveText(initialLabel ?? "");
  await page.getByRole("link", { name: "‹ Previous" }).click();
  await expect(page.getByLabel("Week navigation").locator("p")).toHaveText(initialLabel ?? "");
  await page.getByRole("link", { name: "Next ›" }).click();
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page.getByLabel("Week navigation").locator("p")).toHaveText(initialLabel ?? "");
});

test("selected-week queries load sessions outside the operational attendance window", async ({ page }) => {
  const priorWeek = newYorkKey(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000));
  await page.goto(`/staff/rosters?week=${priorWeek}`);
  await expect(page.getByTestId("desktop-week-grid").locator('a[href="/staff/rosters/SESSION-E2E-CALENDAR-PRIOR"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs attention now" })).toBeVisible();
});

test("class and instructor filters affect the rendered schedule", async ({ page }) => {
  const yogaWeek = newYorkKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  await page.goto(`/staff/rosters?week=${yogaWeek}`);
  await page.getByRole("link", { name: "Yoga", exact: true }).click();
  await expect(page.getByTestId("desktop-week-grid").getByText("Studio Flow", { exact: true })).toBeVisible();
  await expect(page.getByTestId("desktop-week-grid").getByText("Power Interval", { exact: true })).toHaveCount(0);

  const cyclingWeek = newYorkKey(new Date(Date.now() + 72 * 60 * 60 * 1000));
  await page.goto(`/staff/rosters?week=${cyclingWeek}`);
  await expect(page.getByTestId("desktop-week-grid").getByText("Morgan Chen", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "My sessions" }).click();
  await expect(page.getByTestId("desktop-week-grid").getByText("Morgan Chen", { exact: true })).toHaveCount(0);
});

test("calendar uses one textual dominant state and differentiates empty states", async ({ page }) => {
  const cancelledWeek = newYorkKey(new Date(Date.now() + 48 * 60 * 60 * 1000));
  await page.goto(`/staff/rosters?week=${cancelledWeek}`);
  await expect(page.getByTestId("desktop-week-grid").getByText("Cancelled", { exact: true })).toBeVisible();

  await page.goto("/staff/rosters");
  await expect(page.getByTestId("desktop-week-grid").getByText(/Check-in open|No-show action|Attendance complete|Capacity watch/, { exact: true }).first()).toBeVisible();
  await page.goto("/staff/rosters?week=2035-01-01");
  await expect(page.getByText("No authorized sessions this week.")).toBeVisible();
  await expect(page.getByTestId("desktop-week-grid").getByText("No classes this day")).toHaveCount(7);
  await page.goto("/staff/rosters?week=2035-01-01&class=yoga");
  await expect(page.getByText("No classes match these filters.")).toBeVisible();
});

test("mobile uses a day selector and vertically reflowed session list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/staff/rosters");
  const mobile = page.getByTestId("mobile-day-schedule");
  await expect(mobile).toBeVisible();
  await expect(page.getByTestId("desktop-week-grid")).toBeHidden();
  const tabs = mobile.getByRole("tab");
  await expect(tabs).toHaveCount(7);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(1).press("ArrowRight");
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("tablet keeps readable cards in a deliberate local schedule scroller", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/staff/rosters");
  const schedule = page.getByTestId("desktop-week-grid");
  await expect(schedule).toBeVisible();
  const dimensions = await schedule.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(pageOverflow).toBe(false);
});

test("every visible calendar state retains session-detail navigation", async ({ page }) => {
  await page.goto("/staff/rosters");
  const links = page.getByTestId("desktop-week-grid").locator('a[href^="/staff/rosters/"]');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) await expect(links.nth(index)).toHaveAttribute("href", /^\/staff\/rosters\/[A-Z0-9-]+$/);
});

import { expect, test, type Page } from "@playwright/test";

function failOnPageErrors(page: Page, allowedErrors: RegExp[] = []) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return () => expect(errors.filter((message) => !allowedErrors.some((pattern) => pattern.test(message))), "browser console/page errors").toEqual([]);
}

const publicLinks = [
  ["Membership", "/membership"],
  ["Classes", "/classes"],
  ["Member login", "/login"],
  ["Join today", "/join"],
  ["Start membership", "/join"],
  ["View class schedule", "/classes"],
  ["Full schedule", "/classes"],
  ["Explore memberships", "/membership"],
] as const;

for (const [name, destination] of publicLinks) {
  test(`public link “${name}” reaches ${destination}`, async ({ page }) => {
    const assertNoErrors = failOnPageErrors(page);
    await page.goto("/");
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${destination.replace("/", "\\/")}$`));
    assertNoErrors();
  });
}

for (const [index, plan] of ["PLAN-004", "PLAN-008", "PLAN-012"].entries()) {
  test(`membership selection preserves ${plan}`, async ({ page }) => {
    await page.goto("/membership");
    const planLinks = page.locator('a[href^="/join?plan="]');
    await expect(planLinks).toHaveCount(3);
    await planLinks.nth(index).click();
    await expect(page).toHaveURL(new RegExp(`/join\\?plan=${plan}$`));
  });
}

for (const audience of ["member", "staff"] as const) {
  const route = audience === "staff" ? "/staff/login" : "/login";
  const signInLabel = audience === "staff" ? "Sign in as staff" : "Sign in as member";

  test(`${audience} login is hydrated and gives actionable feedback`, async ({ page }) => {
    const assertNoErrors = failOnPageErrors(page, [/Failed to load resource: the server responded with a status of 400/]);
    await page.route("**/auth/v1/token**", async (routeHandler) => {
      await routeHandler.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: "invalid_credentials", message: "Invalid login credentials" }),
      });
    });

    await page.goto(route);
    await page.getByRole("button", { name: "Forgot or need to create your password?" }).click();
    const formAlert = page.locator('p[role="alert"]');
    await expect(formAlert).toHaveText("Enter your email address above before requesting a recovery link.");

    await page.getByLabel("Email address").fill(`${audience}@example.invalid`);
    await page.getByLabel("Password").fill("not-a-real-password");
    await page.getByRole("button", { name: signInLabel }).click();
    await expect(formAlert).toContainText("The email or password is incorrect.");
    await expect(formAlert).toContainText("Forgot or need to create your password?");
    await expect(page).toHaveURL(route);
    assertNoErrors();
  });
}

test("protected portals redirect to their matching login pages", async ({ page }) => {
  await page.goto("/member");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login$/);
});

test("Pulse Assistant API rejects unauthenticated requests", async ({ request }) => {
  const response = await request.post("/api/member/assistant", {
    data: { question: "How many credits do I have?" },
  });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: "Authentication required." });
});

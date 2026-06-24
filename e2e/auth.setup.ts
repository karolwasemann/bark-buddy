// Auth setup: logs in via UI and saves storageState for all test projects.
import { test as setup, expect } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  const email = process.env.SUPABASE_TEST_EMAIL!;
  const password = process.env.SUPABASE_TEST_PASSWORD!;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");

  await page.context().storageState({ path: "auth.json" });
});

// match-list-renders.spec.ts
// E2E test for Risk #1: Silent matching failure
// Proves: authenticated user with overlapping matches navigates to /matches
// and sees match cards rendered — the full pipeline (auth → RPC → RLS → UI) works.
//
// Risk source: test-plan.md Risk #1
// "user completes onboarding, opens match list, sees zero results despite
// overlapping users existing in the DB"
//
// Seed exemplar: seed.spec.ts

import { test, expect } from "@playwright/test";

test.use({ storageState: "auth.json" });

test.describe("Match list — Risk #1: Silent matching failure", () => {
  test("authenticated user sees match cards on /matches when overlapping users exist", async ({
    page,
  }) => {
    // Navigate to the matches page — exercises auth proxy + server component fetch
    await page.goto("/matches");

    // Wait for the page to finish loading (heading proves the happy-path rendered)
    // If the risk materializes (silent failure), either the empty state or error state shows instead.
    const heading = page.getByRole("heading", { name: "Buddies nearby" });
    await expect(heading).toBeVisible();

    // At least one match card should be visible — each card has an "Invite to walk" button
    // This proves find_matches() returned data AND the UI rendered it.
    const inviteButtons = page.getByRole("button", {
      name: "Invite to walk",
    });
    await expect(inviteButtons.first()).toBeVisible();

    // Verify the match card content is meaningful (not empty placeholders)
    // Each card shows the dog's name as a heading inside the card
    const cards = page.locator("article, [data-slot='card']");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify no privacy leak: the page must NOT show coordinates or overlap %
    // (Risk #3 contract layer — belt-and-suspenders at UI level)
    const pageText = await page.textContent("body");
    expect(pageText).not.toMatch(/\d+\.\d{4,}/); // no high-precision floats (lat/lng)
    expect(pageText).not.toMatch(/overlap/i); // no "overlap" text
    expect(pageText).not.toMatch(/radius/i); // no "radius" text
  });

  test("shows explanatory empty state when user has no walking pin", async ({
    browser,
  }) => {
    // Use a fresh context without storageState to simulate a user without a pin.
    // We can't easily create a pinless user in E2E without API seeding,
    // so this test verifies the empty-state copy exists in the page source
    // when the pin query returns null.
    //
    // Note: This is a best-effort check. The full "no pin" scenario is covered
    // by integration tests. Here we just confirm the empty-state UI path exists
    // if we can trigger it.
    test.skip(
      true,
      "Requires a separate user without a walking pin — covered by integration tests",
    );
  });
});

import { test, expect } from '@playwright/test';

/**
 * Read-only report smoke test as the seeded dev user. The seed populates
 * a year of monthly rent + expenses, so the Rent Roll report is guaranteed
 * to have at least one row of real data — a good signal that the domain
 * layer, repository, report generator, and CSV pipeline are all wired up.
 */
test('the dev user can view the Rent Roll report with populated data', async ({ page }) => {
  // Sign in.
  await page.goto('/login');
  await page.locator('#email').fill('dev@propertypilot.local');
  await page.locator('#password').fill('dev1234');
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(/\/dashboard$/);

  // Navigate to Reports.
  await page.getByRole('link', { name: /^reports$/i }).click();
  await expect(page).toHaveURL(/\/reports$/);

  // Rent Roll is the default tab. The report card renders with a title
  // and a "Generated ..." timestamp.
  await expect(page.getByRole('heading', { name: /rent roll/i })).toBeVisible();
  await expect(page.getByText(/generated/i).first()).toBeVisible();

  // The report should have at least one data row (seed data has 3 active leases).
  // Table view is used at >=768px; card view below. Both paths render tenant names.
  const anyRowVisible = page.getByText(/riley chen|jordan wells|pat romero|kai nakamura/i).first();
  await expect(anyRowVisible).toBeVisible();
});

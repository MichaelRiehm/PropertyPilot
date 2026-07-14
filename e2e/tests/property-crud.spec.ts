import { test, expect } from '@playwright/test';

/**
 * Full write flow: register a fresh isolated user (so we never pollute the
 * dev user's data), navigate to Properties, open the Add Property modal,
 * fill it out, submit, and verify the new row appears in the list.
 *
 * Owner-scoping means this user only ever sees their own property, so the
 * assertion is unambiguous.
 */
test('a signed-in user can add a property and see it in the list', async ({ page }) => {
  const email = `e2e-crud-${Date.now()}@example.com`;
  const password = 'Passw0rd-e2e';
  const propertyName = `E2E Villa ${Date.now()}`;

  // Register + auto-login lands the user on /dashboard.
  await page.goto('/register');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForURL(/\/dashboard$/);

  // Navigate to Properties via the top nav. Use `exact` because the dashboard's
  // "Total properties" summary card is also a link and would match a loose regex.
  await page.getByRole('link', { name: 'Properties', exact: true }).click();
  await expect(page).toHaveURL(/\/properties$/);

  // Empty-state — the user has no properties yet.
  await expect(page.getByText(/no properties yet/i)).toBeVisible();

  // Open the Add Property modal. On an empty properties list, the page shows
  // two "Add property" buttons (header + empty-state CTA) — clicking either
  // opens the same modal, so pick the first deterministically.
  await page.getByRole('button', { name: /add property/i }).first().click();

  // Fill the form.
  await page.locator('#name').fill(propertyName);
  await page.locator('#addressLine1').fill('123 E2E Street');
  await page.locator('#city').fill('Madison');
  await page.locator('#state').fill('WI');
  await page.locator('#postalCode').fill('53703');

  // Submit — the modal Create button is labeled just "Create".
  await page.getByRole('button', { name: /^create$/i }).click();

  // New row appears in the list; empty-state is gone.
  await expect(page.getByText(propertyName)).toBeVisible();
  await expect(page.getByText(/no properties yet/i)).not.toBeVisible();
});

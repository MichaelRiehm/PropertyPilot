import { test, expect } from '@playwright/test';

/**
 * Register + login happy paths. Both flows should land on /dashboard with
 * the dashboard heading visible. Each test uses a unique email so re-runs
 * don't collide on the unique-email constraint.
 */
test.describe('Auth flow', () => {
  test('a new user can register and land on the dashboard', async ({ page }) => {
    const email = `e2e-register-${Date.now()}@example.com`;
    const password = 'Passw0rd-e2e';

    await page.goto('/register');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
  });

  test('the seeded dev user can sign in', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('dev@propertypilot.local');
    await page.locator('#password').fill('dev1234');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    // Dashboard should show at least one summary card with a numeric value.
    await expect(page.getByText(/total properties/i)).toBeVisible();
  });

  test('signing in with a bad password shows an inline error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('dev@propertypilot.local');
    await page.locator('#password').fill('this-is-wrong');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });
});

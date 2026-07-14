import { test, expect } from '@playwright/test';

/**
 * Mobile navigation drawer. The top nav is a hamburger + drawer below the
 * Tailwind `md:` breakpoint (768px). This test runs at an iPhone-ish viewport
 * so the mobile presentation is what's on screen.
 */
test.describe('Mobile navigation drawer', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the drawer opens, navigates, and closes when a nav item is tapped', async ({ page }) => {
    // Sign in as the seeded dev user.
    await page.goto('/login');
    await page.locator('#email').fill('dev@propertypilot.local');
    await page.locator('#password').fill('dev1234');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.waitForURL(/\/dashboard$/);

    // At mobile width, the desktop nav row should NOT be visible.
    // (There are still hidden NavLinks in the DOM inside the drawer, but the
    // primary nav on desktop is `hidden md:flex` so it's display:none here.)
    const hamburger = page.getByRole('button', { name: /open navigation menu/i });
    await expect(hamburger).toBeVisible();

    // Tap hamburger → drawer opens.
    await hamburger.click();
    const drawer = page.getByRole('dialog', { name: /navigation menu/i });
    await expect(drawer).toBeVisible();

    // The user's email appears in the drawer.
    await expect(drawer.getByText('dev@propertypilot.local')).toBeVisible();

    // Tap the Properties link inside the drawer → navigates + drawer closes.
    await drawer.getByRole('link', { name: /^properties$/i }).click();
    await expect(page).toHaveURL(/\/properties$/);
    await expect(drawer).not.toBeVisible();
  });

  test('escape key closes the drawer', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('dev@propertypilot.local');
    await page.locator('#password').fill('dev1234');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.waitForURL(/\/dashboard$/);

    await page.getByRole('button', { name: /open navigation menu/i }).click();
    const drawer = page.getByRole('dialog', { name: /navigation menu/i });
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });
});

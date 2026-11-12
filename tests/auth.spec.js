import { test, expect } from '@playwright/test';

const testEmail = `auth_${Date.now()}@example.com`;
const testPassword = 'password123';

test.describe.serial('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByText('Expense Tracker', { exact: true })).toHaveCSS('writing-mode', 'horizontal-tb');
  });

  test('restores a saved session without showing the login page', async ({ page }) => {
    await page.route('**/api/transactions', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.route('**/api/budgets', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );

    await page.evaluate(() => localStorage.setItem('token', 'saved-session-token'));
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveCount(0);
  });

  test('signs in automatically with the demo guest button', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'demo-token', user: { id: 1, email: 'demo@example.com' } }),
      });
    });

    await page.goto('/');
    const loginRequest = page.waitForRequest((request) =>
      request.url().endsWith('/api/auth/login') && request.method() === 'POST'
    );
    const clickedAt = Date.now();
    await page.getByRole('button', { name: 'Sign in as demo guest' }).click();

    const request = await loginRequest;
    expect(Date.now() - clickedAt).toBeGreaterThanOrEqual(180);
    expect(request.postDataJSON()).toEqual({
      email: 'demo@example.com',
      password: 'password123',
    });
  });

  test('can register a new account', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();

    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { name: 'Expense Tracker' })).toBeVisible();
  });

  test('shows error for duplicate email', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create account' }).click();

    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('That email is already in use')).toBeVisible();
  });

  test('can login with existing account', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Expense Tracker' })).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password', { exact: true }).fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Incorrect email or password')).toBeVisible();
  });

  test('can logout', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Expense Tracker' })).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});

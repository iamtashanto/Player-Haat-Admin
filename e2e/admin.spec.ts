import { expect, test } from '@playwright/test';
import { seedNoShowDispute, signInAsNewAdmin } from './helpers';

test.describe.configure({ mode: 'serial' });

const PAGES: Array<[string, RegExp]> = [
  ['/', /welcome back/i], ['/users', /users|accounts/i], ['/profiles', /profiles|players/i], ['/recruiters', /recruiters/i],
  ['/verifications', /verifications/i], ['/payments', /payments/i], ['/requests', /requests/i], ['/reports', /reports/i],
  ['/ratings', /ratings/i], ['/health', /app health/i], ['/config/sports', /sports/i], ['/config/locations', /locations/i], ['/config/flags', /flags|config/i],
  ['/notifications', /announcement|notification/i], ['/audit', /audit/i], ['/account', /account|two-factor/i],
];

test('first sign-in enrols 2FA; every page renders real data or an honest empty state', async ({ page }) => {
  await signInAsNewAdmin(page);
  for (const [path, heading] of PAGES) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/couldn.t load/i)).toHaveCount(0);
    await expect(page.getByText(/lorem|Sohel Rana|sample data/i)).toHaveCount(0);
  }
  // dashboard: the date-range filter changes the chart titles
  await page.goto('/');
  await page.getByRole('button', { name: /last 7 days/i }).click();
  await expect(page.getByRole('heading', { name: /sign-ups, last 7 days/i })).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/dashboard-1440x900.png' });
});

test('a disputed no-show: the queue shows it, removing it is audit-logged and shows in the user history', async ({ page }) => {
  const seeded = seedNoShowDispute();
  await signInAsNewAdmin(page);
  await page.goto('/ratings');
  const row = page.getByRole('row').filter({ hasText: seeded.playerName });
  await expect(row).toBeVisible();
  await expect(row.getByText(/no-show strike/i)).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/ratings-disputes.png' });
  await row.getByRole('button', { name: /remove it/i }).click();
  await page.getByRole('textbox').last().fill('Player has a photo at the ground; organiser confused two players');
  await page.getByRole('button', { name: /^remove$/i }).click();
  await expect(page.getByText(/dispute resolved/i)).toBeVisible();
  await expect(row).toHaveCount(0); // it left the "waiting" filter
  await page.getByLabel('Status').selectOption('REMOVED');
  await expect(page.getByRole('row').filter({ hasText: seeded.playerName })).toBeVisible();

  // the user's history shows the removed strike, and the strike no longer counts
  await page.goto(`/users/${seeded.playerId}`);
  await expect(page.getByRole('heading', { name: /rating history/i })).toBeVisible();
  await expect(page.getByText(/removed by admin/i)).toBeVisible();
  await page.goto('/audit');
  await expect(page.getByText(/dispute/i).first()).toBeVisible();
});

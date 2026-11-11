import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';
import { totp } from './totp';

export const SERVER_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../server');
export const DB = process.env.E2E_DATABASE_URL ?? (() => { throw new Error('Set E2E_DATABASE_URL to the API database'); })();
export const stamp = Date.now().toString(36);
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? `admin-${stamp}@e2e.test`;
export const ADMIN_PASSWORD = 'E2e-admin-passw0rd!';

export const sql = (q: string) => execFileSync('psql', [DB, '-Atc', q], { encoding: 'utf8' }).trim();

/** The real CLI: there is no default admin, so the suite creates one the way an operator would. */
export function createAdmin() {
  const r = spawnSync('pnpm', ['admin:create', '--email', ADMIN_EMAIL, '--password', ADMIN_PASSWORD, '--name', 'E2E Admin'], { cwd: SERVER_DIR, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`admin:create failed: ${r.stderr || r.stdout}`);
}

let enrolledSecret: string | null = null;

/**
 * Email + password, then either first-time authenticator enrolment (the secret is on screen) or, for later
 * sign-ins in the same run, the 6-digit code from that same secret. Both paths are the real screens.
 */
export async function signInAsNewAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.locator('#login-submit').click();
  if (enrolledSecret === null) {
    enrolledSecret = (await page.locator('code').first().textContent({ timeout: 15_000 }))!.trim();
    await page.locator('#code').fill(totp(enrolledSecret));
    await page.locator('#totp-enable').click();
    await page.locator('#backup-saved').check();
    await page.locator('#backup-continue').click();
  } else {
    await page.locator('#code').waitFor({ timeout: 15_000 });
    // a code is single-use per 30-second step: wait for the next step if the enrolment code is still the current one
    let code = totp(enrolledSecret);
    if (code === lastCode) { await page.waitForTimeout(31_000); code = totp(enrolledSecret); }
    await page.locator('#code').fill(code);
    await page.locator('#totp-submit').click();
  }
  lastCode = totp(enrolledSecret);
  await expect(page).toHaveURL(/\/$/);
}

let lastCode = '';

const id = () => `'e2e${Math.random().toString(36).slice(2, 14)}'`;

/**
 * A finished game where the organiser marked the player absent and the player disputed it. Written straight to
 * the database (the web suite covers the real screens for this); every row belongs to @e2e.test users so cleanup removes it.
 */
export function seedNoShowDispute() {
  const tag = `${stamp}${Math.random().toString(36).slice(2, 6)}`;
  const organiserName = `Org ${tag}`;
  const playerName = `Pl ${tag}`;
  const sport = sql(`select id from "Sport" where code = 'FOOTBALL'`);
  const [districtId, upazilaId] = sql(`select d.id, u.id from "Upazila" u join "District" d on d.id = u."districtId" where u.slug = 'kalapara' limit 1`).split('|');
  const org = id(), pl = id(), req = id(), app = id(), rating = id(), dispute = id();
  sql(`
    insert into "User" (id, name, email, role, status, "updatedAt") values
      (${org}, '${organiserName}', 'org-${tag}@e2e.test', 'RECRUITER', 'ACTIVE', now()),
      (${pl}, '${playerName}', 'pl-${tag}@e2e.test', 'PLAYER', 'ACTIVE', now());
    insert into "PlayerProfile" (id, "userId", "districtId", "upazilaId", "updatedAt") values (${id()}, ${pl}, ${districtId}, ${upazilaId}, now());
    insert into "PlayerRequest" (id, "createdById", "sportId", "matchAt", "venueText", "districtId", "upazilaId", "positionsNeeded", "playersNeeded", "playersAccepted", status, "completedAt", "updatedAt")
      values (${req}, ${org}, ${sport}, now() - interval '2 days', 'E2E Ground ${tag}', ${districtId}, ${upazilaId}, '{}', 1, 1, 'COMPLETED', now() - interval '1 day', now());
    insert into "Application" (id, "requestId", "playerId", status, "respondedAt", attendance, "attendanceMarkedAt", "updatedAt")
      values (${app}, ${req}, ${pl}, 'ACCEPTED', now(), 'NO_SHOW', now() - interval '1 day', now());
    insert into "Rating" (id, "requestId", "raterId", "rateeId", direction, scores, overall, "noShow", "revealedAt")
      values (${rating}, ${req}, ${org}, ${pl}, 'CAPTAIN_TO_PLAYER', '{}', 1, true, now() - interval '1 day');
    insert into "RatingDispute" (id, "ratingId", "disputerId", reason) values (${dispute}, ${rating}, ${pl}, 'I was there at 6pm, the organiser mixed me up with someone else');
  `);
  return { organiserName, playerName, playerId: pl.replace(/'/g, ''), ratingId: rating.replace(/'/g, '') };
}

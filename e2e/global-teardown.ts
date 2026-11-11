import { spawnSync } from 'node:child_process';
import { SERVER_DIR } from './helpers';
/** Removes every @e2e.test account (the admin included) and what they own. */
export default function globalTeardown() {
  if (process.env.E2E_KEEP_DATA) return;
  const r = spawnSync('npx', ['tsx', 'scripts/cleanup-demo-and-e2e.ts'], { cwd: SERVER_DIR, encoding: 'utf8' });
  console.log(r.status === 0 ? 'e2e cleanup ok' : `e2e cleanup FAILED: ${(r.stderr || r.stdout).slice(-300)}`);
}

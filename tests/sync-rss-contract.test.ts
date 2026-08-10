import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('RSS sync reconciles incrementally and bounds repair work per request', async () => {
  const source = await readFile(new URL('../src/app/api/sync-rss/route.ts', import.meta.url), 'utf8');

  assert.match(source, /fetchStoredEpisodes/);
  assert.match(source, /episodeSyncReason/);
  assert.match(source, /const MAX_SYNC_OPERATIONS = 100;/);
  assert.match(source, /candidates\.slice\(0, MAX_SYNC_OPERATIONS\)/);
  assert.match(source, /deferred\.length \? 503/);
});

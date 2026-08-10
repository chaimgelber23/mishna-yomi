import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('database seed uses the shared exact resolver and protected sync RPC', async () => {
  const source = await readFile(new URL('../scripts/seed-db.mjs', import.meta.url), 'utf8');

  assert.match(source, /resolveEpisodeMapping/);
  assert.match(source, /isPotentialMishnaLesson/);
  assert.match(source, /import episodeMappingModule/);
  assert.match(source, /import calendarModule/);
  assert.match(source, /\.rpc\('sync_mishna_episode'/);
  assert.doesNotMatch(source, /function\s+parseMishnaTitle/);
  assert.doesNotMatch(source, /\.from\('mishna_episodes'\)\s*\.upsert/);
});

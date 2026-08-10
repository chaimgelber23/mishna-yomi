import assert from 'node:assert/strict';
import test from 'node:test';
import { generateEpisodeMappingBackfillSql } from '../scripts/generate-episode-mapping-backfill';

const EPISODE_A = '00000000-0000-4000-8000-000000000001';
const EPISODE_B = '00000000-0000-4000-8000-000000000002';

test('backfill generator emits exact transactional mapping SQL and dynamic checks', () => {
  const sql = generateEpisodeMappingBackfillSql([
    { id: EPISODE_A, title: 'Mishna Yomi - Kinim 3:6 -Kelim 1:1' },
    { id: EPISODE_B, title: 'Mishna Yomi - Kelim 1:2-3' },
  ]);

  assert.match(sql, /^-- Generated from 2 raw episodes; 4 exact mapping rows\./);
  assert.match(sql, /begin;/);
  assert.match(sql, /delete from public\.mishna_episode_units;/);
  assert.match(sql, /'resolver_v1'/);
  assert.match(sql, /Raw episode export is stale or incomplete/);
  assert.match(sql, /except[\s\S]+public\.mishna_episode_units/);
  assert.match(sql, /commit;/);
  assert.doesNotMatch(sql, /Kinim 3:6/);
});

test('backfill generator refuses unresolved, duplicate, or malformed input', () => {
  assert.throws(
    () => generateEpisodeMappingBackfillSql([{ id: EPISODE_A, title: 'Mishna Yomi - Unknown 1:1' }]),
    /Refusing to generate a partial backfill/
  );

  assert.throws(
    () => generateEpisodeMappingBackfillSql([
      { id: EPISODE_A, title: 'Mishna Yomi - Kelim 1:1-2' },
      { id: EPISODE_A, title: 'Mishna Yomi - Kelim 1:3-4' },
    ]),
    /Duplicate episode id/
  );

  assert.throws(
    () => generateEpisodeMappingBackfillSql([{ id: 'not-a-uuid', title: 'Mishna Yomi - Kelim 1:1-2' }]),
    /invalid UUID/
  );
});

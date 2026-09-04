import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVerifiedEpisodeTitleOverride,
  resolveEpisodeMapping,
} from '../src/lib/episode-mapping';

const CASES = [
  {
    guid: '362576ec-75cc-4771-af9a-5f88533c2844',
    source: "Mishna Yomi - Kelim 20:2-3 - By R' Shloimie Friedman",
    corrected: "Mishna Yomi - Kelim 20:4-5 - By R' Shloimie Friedman",
    mishnayot: [4, 5],
  },
  {
    guid: '6db3bf7b-934c-4b8f-bff4-f023dcce956b',
    source: "Mishna Yomi - Kelim 20:4-5 - By R' Shloimie Friedman",
    corrected: "Mishna Yomi - Kelim 20:6-7 - By R' Shloimie Friedman",
    mishnayot: [6, 7],
  },
  {
    guid: 'acf6df39-7fbf-443a-a62e-ea8903bef88f',
    source: "Mishna Yomi - Kelim 20:6-7 - By R' Shloimie Friedman",
    corrected: "Mishna Yomi - Kelim 20:2-3 - By R' Shloimie Friedman",
    mishnayot: [2, 3],
  },
] as const;

test('repairs the verified Kelim chapter 20 recording rotation by stable RSS GUID', () => {
  for (const item of CASES) {
    const corrected = applyVerifiedEpisodeTitleOverride(item.guid, item.source);
    assert.equal(corrected, item.corrected);

    const mapping = resolveEpisodeMapping(corrected);
    assert.equal(mapping.ok, true);
    if (!mapping.ok) continue;

    assert.deepEqual(
      mapping.units.map(({ chapter, mishna }) => [chapter, mishna]),
      item.mishnayot.map(mishna => [20, mishna]),
    );
  }
});

test('does not change an unrelated episode that happens to use the same source title', () => {
  assert.equal(
    applyVerifiedEpisodeTitleOverride('unrelated-guid', CASES[0].source),
    CASES[0].source,
  );
});

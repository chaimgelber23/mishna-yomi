import assert from 'node:assert/strict';
import test from 'node:test';
import {
  choosePreferredMappedEpisodes,
  episodeSyncReason,
  isPotentialMishnaLesson,
  normalizeTractate,
  resolveEpisodeMapping,
} from '../src/lib/episode-mapping';
import { fetchRSSFeed } from '../src/lib/rss';

function resolve(title: string) {
  const result = resolveEpisodeMapping(title);
  if (result.ok === false) assert.fail(`${title}: ${result.reason}`);
  return result;
}

test('resolves same-chapter, cross-chapter, and cross-tractate lessons', () => {
  const sameChapter = resolve("Mishna Yomi - Kelim 1:2-3 - By R' Shloimie Friedman");
  assert.deepEqual(sameChapter.globalIndices, [3191, 3192]);
  assert.deepEqual(
    sameChapter.units.map(({ tractate, chapter, mishna, sequence }) => ({ tractate, chapter, mishna, sequence })),
    [
      { tractate: 'Kelim', chapter: 1, mishna: 2, sequence: 1 },
      { tractate: 'Kelim', chapter: 1, mishna: 3, sequence: 2 },
    ]
  );

  const crossChapter = resolve("Mishna Yomi - Kelim 22:10-23:1 - By R' Shloimie Friedman");
  assert.equal(crossChapter.units.length, 2);
  assert.deepEqual(
    crossChapter.units.map(({ chapter, mishna }) => [chapter, mishna]),
    [[22, 10], [23, 1]]
  );

  const crossTractate = resolve("Mishna Yomi - Kinim 3:6 -Kelim 1:1 - By R' Shloimie Friedman");
  assert.deepEqual(
    crossTractate.units.map(({ tractate, chapter, mishna }) => [tractate, chapter, mishna]),
    [['Kinnim', 3, 6], ['Kelim', 1, 1]]
  );
});

test('normalizes feed aliases, including the current Klim typo', () => {
  assert.equal(normalizeTractate('Kesubos'), 'Ketubot');
  assert.equal(normalizeTractate('Gitin'), 'Gittin');
  assert.equal(normalizeTractate('Kinim'), 'Kinnim');
  assert.equal(normalizeTractate('Klim'), 'Kelim');
  assert.equal(normalizeTractate('keilim'), 'Kelim');

  const typo = resolve("Mishna Yomi - Klim 24:3-4 - By R' Shloimie Friedman");
  assert.deepEqual(
    typo.units.map(({ tractate, chapter, mishna }) => [tractate, chapter, mishna]),
    [['Kelim', 24, 3], ['Kelim', 24, 4]]
  );
});

test('keeps the two genuine single recordings separate', () => {
  const ketubot = resolve("Mishna Yomi - Kesubos 13:11 - By R' Shloimie Friedman");
  const nedarim = resolve("Mishna Yomi - Nedarim 1:1 - By R' Shloimie Friedman");

  assert.deepEqual(ketubot.globalIndices, [1575]);
  assert.deepEqual(nedarim.globalIndices, [1576]);
});

test('resolves all 15 known cross-tractate titles to two consecutive units', () => {
  const titles = [
    'Kinim 3:6 -Kelim 1:1',
    'Temurah 7:6 -Kerisus 1:1',
    'Chulin 12:5 -Bechoros 1:1',
    'Menachos 13:11 -Chulin 1:1',
    'Horayos 3:8 -Zevachim 1:1',
    'Avos 6:11 -Horayos 1:1',
    'Avodah Zarah 5:12 -Avos 1:1',
    'Eduyos 8:7 -Avodah Zarah 1:1',
    'Shevuos 8:6 -Eduyos 1:1',
    'Makos 3:16 -Shevuos 1:1',
    'Sanhedrin 11:6 -Makos 1:1',
    'Bava Kama 10:10 -Bava Metzia 1:1',
    'Gitin 9:10 -Kidushin 1:1',
    'Nazir 9:5 -Sotah 1:1',
    'Nedarim 11:12 -Nazir 1:1',
  ];

  for (const title of titles) {
    const mapping = resolve(`Mishna Yomi - ${title} - By R' Shloimie Friedman`);
    assert.equal(mapping.units.length, 2, title);
    assert.equal(mapping.globalIndices[1] - mapping.globalIndices[0], 1, title);
  }
});

test('fails closed for malformed, unknown, backward, and oversized ranges', () => {
  const invalidTitles = [
    "Mishna Yomi - By R' Shloimie Friedman",
    'Halacha Yomi - Kelim 1:1-2',
    'Mishna Yomi - Madeup 1:1-2',
    'Mishna Yomi - Kelim 31:1-2',
    'Mishna Yomi - Kelim 2:1-1:9',
    'Mishna Yomi - Kelim 1:1-3',
  ];

  for (const title of invalidTitles) {
    assert.equal(resolveEpisodeMapping(title).ok, false, title);
  }

  assert.equal(isPotentialMishnaLesson("Mishna Yomi - By R' Shloimie Friedman"), false);
  assert.equal(isPotentialMishnaLesson('Halacha Yomi - Kelim 1:1-2'), false);
  assert.equal(isPotentialMishnaLesson('Mishna Yomi - Madeup 1:1-2'), true);
});

test('deduplicates exact content by newest publication and then stable id', () => {
  const mappings = [{ global_index: 3000, sequence: 1 }, { global_index: 3001, sequence: 2 }];
  const preferred = choosePreferredMappedEpisodes([
    { id: 'b', published_at: '2026-01-01T00:00:00Z', mishna_episode_units: mappings },
    { id: 'c', published_at: '2026-02-01T00:00:00Z', mishna_episode_units: mappings },
    { id: 'a', published_at: '2026-02-01T00:00:00Z', mishna_episode_units: mappings },
    {
      id: 'd',
      published_at: '2026-03-01T00:00:00Z',
      mishna_episode_units: [{ global_index: 3002, sequence: 1 }],
    },
  ]);

  assert.deepEqual(preferred.map((episode) => episode.id), ['a', 'd']);
});

test('orders lessons by canonical Mishnah mapping instead of publication time', () => {
  const preferred = choosePreferredMappedEpisodes([
    {
      id: 'later-uploaded-first',
      published_at: '2026-01-01T00:00:00Z',
      mishna_episode_units: [
        { global_index: 1471, sequence: 1 },
        { global_index: 1472, sequence: 2 },
      ],
    },
    {
      id: 'earlier-mishnah-uploaded-later',
      published_at: '2026-01-02T00:00:00Z',
      mishna_episode_units: [
        { global_index: 1469, sequence: 1 },
        { global_index: 1470, sequence: 2 },
      ],
    },
  ]);

  assert.deepEqual(preferred.map((episode) => episode.id), [
    'earlier-mishnah-uploaded-later',
    'later-uploaded-first',
  ]);
});

test('incremental sync skips exact rows and repairs missing, changed, or unmapped rows', () => {
  const desired = {
    title: 'Mishna Yomi - Kelim 1:1-2',
    description: 'Description',
    audioUrl: 'https://example.com/audio.mp3',
    durationSeconds: 180,
    publishedAt: '2026-08-10T12:00:00.000Z',
    tractate: 'Kelim',
    chapterFrom: 1,
    mishnaFrom: 1,
    chapterTo: 1,
    mishnaTo: 2,
    mishnaDayNumber: 100,
    globalIndices: [3190, 3191],
  };
  const stored = {
    title: desired.title,
    description: desired.description,
    audio_url: desired.audioUrl,
    duration_seconds: desired.durationSeconds,
    published_at: '2026-08-10T08:00:00-04:00',
    tractate: desired.tractate,
    chapter_from: desired.chapterFrom,
    mishna_from: desired.mishnaFrom,
    chapter_to: desired.chapterTo,
    mishna_to: desired.mishnaTo,
    mishna_day_number: desired.mishnaDayNumber,
    mishna_episode_units: [
      { global_index: 3191, sequence: 2, mapping_source: 'resolver_v1' },
      { global_index: 3190, sequence: 1, mapping_source: 'resolver_v1' },
    ],
  };

  assert.equal(episodeSyncReason(stored, desired), null);
  assert.equal(episodeSyncReason(undefined, desired), 'missing_episode');
  assert.equal(
    episodeSyncReason({ ...stored, mishna_episode_units: [] }, desired),
    'mapping_changed'
  );
  assert.equal(
    episodeSyncReason({
      ...stored,
      mishna_episode_units: stored.mishna_episode_units.map((unit) => ({
        ...unit,
        mapping_source: 'legacy',
      })),
    }, desired),
    'mapping_changed'
  );
  assert.equal(
    episodeSyncReason({ ...stored, title: `${stored.title} corrected` }, desired),
    'metadata_changed'
  );
});

test(
  'live RSS audit maps every current Mishnah lesson',
  { skip: process.env.RUN_LIVE_RSS_AUDIT !== '1' },
  async (context) => {
    const episodes = await fetchRSSFeed();
    const lessonEpisodes = episodes.filter((episode) => isPotentialMishnaLesson(episode.title));
    const results = lessonEpisodes.map((episode) => ({
      episode,
      mapping: resolveEpisodeMapping(episode.title),
    }));
    const unresolved = results.filter(({ mapping }) => !mapping.ok);

    assert.deepEqual(
      unresolved.map(({ episode, mapping }) => ({
        title: episode.title,
        reason: mapping.ok === false ? mapping.reason : '',
      })),
      []
    );

    const successful = results.flatMap(({ mapping }) => (mapping.ok ? [mapping] : []));
    const relationships = successful.flatMap((mapping) => mapping.globalIndices);
    const uniqueUnits = new Set(relationships);
    const singles = successful.filter((mapping) => mapping.units.length === 1).length;
    const crossTractates = successful.filter(
      (mapping) => mapping.parsed.tractate !== mapping.parsed.tractateTo
    ).length;

    context.diagnostic(
      JSON.stringify({
        feedItems: episodes.length,
        mappedEpisodes: successful.length,
        relationships: relationships.length,
        uniqueUnits: uniqueUnits.size,
        singles,
        crossTractates,
      })
    );
  }
);

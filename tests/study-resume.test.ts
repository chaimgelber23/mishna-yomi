import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_MISHNAYOT, TOTAL_MISHNAYOT } from '../src/lib/mishna-data';
import {
  STUDY_RESUME_STORAGE_KEY,
  STUDY_RESUME_STORAGE_VERSION,
  buildBrowseHref,
  deriveServerStudyResume,
  readStudyResume,
  resolveStudyResume,
  writeStudyResume,
  type StorageLike,
  type StudyResumeRecord,
} from '../src/lib/study-resume';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function localPointer(globalIndex: number, updatedAt: string): StudyResumeRecord {
  return {
    version: STUDY_RESUME_STORAGE_VERSION,
    globalIndex,
    updatedAt,
  };
}

test('writes and reads a versioned canonical self-study pointer', () => {
  const storage = new MemoryStorage();
  const saved = writeStudyResume(storage, 3276, '2026-08-23T15:00:00.000Z');

  assert.deepEqual(saved, {
    version: 1,
    globalIndex: 3276,
    updatedAt: '2026-08-23T15:00:00.000Z',
  });
  assert.equal(
    storage.getItem(STUDY_RESUME_STORAGE_KEY),
    JSON.stringify(saved),
  );
  assert.deepEqual(readStudyResume(storage), saved);
});

test('malformed, stale-version, non-canonical, and throwing storage fail safely', () => {
  const storage = new MemoryStorage();
  for (const raw of [
    '{not json',
    JSON.stringify({ version: 2, globalIndex: 3276, updatedAt: '2026-08-23T15:00:00Z' }),
    JSON.stringify({ version: 1, globalIndex: TOTAL_MISHNAYOT + 1, updatedAt: '2026-08-23T15:00:00Z' }),
    JSON.stringify({ version: 1, globalIndex: 3276, updatedAt: 'not-a-date' }),
  ]) {
    storage.values.set(STUDY_RESUME_STORAGE_KEY, raw);
    assert.equal(readStudyResume(storage), null);
  }

  const throwingStorage: StorageLike = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); },
  };
  assert.equal(readStudyResume(throwingStorage), null);
  assert.equal(writeStudyResume(throwingStorage, 3276), null);
  assert.equal(writeStudyResume(storage, 0), null);
  assert.equal(writeStudyResume(storage, 3276, 'not-a-date'), null);
});

test('sparse self-study resumes after the newest activity, not at an earlier gap', () => {
  const selection = deriveServerStudyResume([
    { global_index: 1, self_studied_at: '2026-08-23T12:00:00Z' },
    { global_index: 100, self_studied_at: null },
    { global_index: 3275, self_studied_at: '2026-08-23T15:00:00Z' },
  ]);

  assert.deepEqual(selection, {
    globalIndex: 3276,
    updatedAt: '2026-08-23T15:00:00.000Z',
    source: 'server',
  });
  assert.deepEqual(
    ALL_MISHNAYOT.slice(3274, 3276).map(ref => `${ref.tractate} ${ref.chapter}:${ref.mishna}`),
    ['Kelim 11:9', 'Kelim 12:1'],
  );
  assert.equal(
    buildBrowseHref(selection!.globalIndex),
    '/browse?seder=Taharot&tractate=Kelim&chapter=12&mishna=1',
  );
});

test('equal server timestamps from a bulk mark use the highest global index', () => {
  const timestamp = '2026-08-23T15:00:00Z';
  const selection = deriveServerStudyResume([
    { global_index: 3273, self_studied_at: timestamp },
    { global_index: 3275, self_studied_at: timestamp },
    { global_index: 3274, self_studied_at: timestamp },
  ]);

  assert.equal(selection?.globalIndex, 3276);
});

test('the final self-studied Mishnah stays capped at the final canonical index', () => {
  assert.equal(TOTAL_MISHNAYOT, 4192);
  assert.deepEqual(
    deriveServerStudyResume([
      { global_index: 4192, self_studied_at: '2026-08-23T15:00:00Z' },
    ]),
    {
      globalIndex: 4192,
      updatedAt: '2026-08-23T15:00:00.000Z',
      source: 'server',
    },
  );
});

test('the freshest browser or server pointer wins, with a forward-most tie', () => {
  const serverRows = [
    { global_index: 3275, self_studied_at: '2026-08-23T15:00:00Z' },
  ];

  assert.equal(resolveStudyResume({
    localPointer: localPointer(200, '2026-08-23T16:00:00Z'),
    serverProgress: serverRows,
  })?.globalIndex, 200);

  assert.deepEqual(resolveStudyResume({
    localPointer: localPointer(200, '2026-08-23T14:00:00Z'),
    serverProgress: serverRows,
  }), {
    globalIndex: 3276,
    updatedAt: '2026-08-23T15:00:00.000Z',
    source: 'server',
  });

  assert.equal(resolveStudyResume({
    localPointer: localPointer(3275, '2026-08-23T15:00:00Z'),
    serverProgress: serverRows,
  })?.globalIndex, 3276);
});

test('an explicit URL target takes precedence over every saved position', () => {
  assert.deepEqual(resolveStudyResume({
    explicitGlobalIndex: 42,
    localPointer: localPointer(3275, '2026-08-23T16:00:00Z'),
    serverProgress: [
      { global_index: 4000, self_studied_at: '2026-08-23T17:00:00Z' },
    ],
    fallbackGlobalIndex: 1,
  }), {
    globalIndex: 42,
    updatedAt: null,
    source: 'explicit',
  });
});

test('resolution returns a valid fallback or null when no saved place exists', () => {
  assert.deepEqual(resolveStudyResume({ fallbackGlobalIndex: 1 }), {
    globalIndex: 1,
    updatedAt: null,
    source: 'fallback',
  });
  assert.equal(resolveStudyResume({}), null);
  assert.equal(resolveStudyResume({ fallbackGlobalIndex: TOTAL_MISHNAYOT + 1 }), null);
  assert.equal(deriveServerStudyResume([
    { global_index: 1, self_studied_at: null },
    { global_index: TOTAL_MISHNAYOT + 1, self_studied_at: '2026-08-23T15:00:00Z' },
  ]), null);
});

test('Browse links resolve through ALL_MISHNAYOT even when passed a reference', () => {
  assert.equal(
    buildBrowseHref(ALL_MISHNAYOT[3275]),
    '/browse?seder=Taharot&tractate=Kelim&chapter=12&mishna=1',
  );
  assert.equal(buildBrowseHref(0), '/browse');
});

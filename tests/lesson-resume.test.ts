import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LAST_PLACE_STORAGE_KEY,
  createThrottledLatestSaver,
  episodeMatchesExactUnits,
  episodeResumeKey,
  legacyPositionKey,
  readBestEpisodePlace,
  readEpisodeResume,
  readLastPlace,
  resolveEpisodePosition,
  resolveInitialLesson,
  writeLessonResume,
  type StorageLike,
  type TimerFunctions,
} from '../src/lib/lesson-resume';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test('writes versioned episode/global state and the legacy rollback position', () => {
  const storage = new MemoryStorage();
  const saved = writeLessonResume(storage, {
    episodeId: 'episode-2',
    positionSeconds: 41.9,
    completed: false,
  }, '2026-08-23T10:15:00-04:00');

  assert.deepEqual(saved, {
    version: 1,
    episodeId: 'episode-2',
    positionSeconds: 41,
    updatedAt: '2026-08-23T14:15:00.000Z',
    completed: false,
  });
  assert.equal(storage.getItem(legacyPositionKey('episode-2')), '41');
  assert.equal(storage.getItem(episodeResumeKey('episode-2')), storage.getItem(LAST_PLACE_STORAGE_KEY));
  assert.deepEqual(readEpisodeResume(storage, 'episode-2'), {
    episodeId: 'episode-2',
    positionSeconds: 41,
    updatedAt: '2026-08-23T14:15:00.000Z',
    completed: false,
    source: 'local',
  });
  assert.deepEqual(readLastPlace(storage), readEpisodeResume(storage, 'episode-2'));
});

test('malformed and throwing storage fails safely while legacy raw positions still migrate', () => {
  const storage = new MemoryStorage();
  storage.values.set(episodeResumeKey('legacy'), '{not json');
  storage.values.set(legacyPositionKey('legacy'), '73');
  assert.deepEqual(readEpisodeResume(storage, 'legacy'), {
    episodeId: 'legacy',
    positionSeconds: 73,
    updatedAt: null,
    completed: false,
    source: 'local-legacy',
  });

  storage.values.set(legacyPositionKey('legacy'), '73 seconds');
  storage.values.set(LAST_PLACE_STORAGE_KEY, JSON.stringify({ version: 1, episodeId: 'legacy' }));
  assert.equal(readEpisodeResume(storage, 'legacy'), null);
  assert.equal(readLastPlace(storage), null);

  const throwingStorage: StorageLike = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('full'); },
  };
  assert.equal(readEpisodeResume(throwingStorage, 'episode-1'), null);
  assert.equal(readLastPlace(throwingStorage), null);
  assert.doesNotThrow(() => writeLessonResume(throwingStorage, {
    episodeId: 'episode-1', positionSeconds: 2, completed: false,
  }, '2026-08-23T14:00:00Z'));
});

test('old per-episode positions recover a likely last place before the new pointer exists', () => {
  const storage = new MemoryStorage();
  storage.setItem(legacyPositionKey('one'), '90');
  storage.setItem(legacyPositionKey('two'), '0');
  storage.setItem(legacyPositionKey('three'), '27');

  assert.deepEqual(readBestEpisodePlace(storage, ['one', 'two', 'three']), {
    episodeId: 'three', positionSeconds: 27, completed: false,
    updatedAt: null, source: 'local-legacy',
  });

  writeLessonResume(storage, {
    episodeId: 'one', positionSeconds: 105, completed: false,
  }, '2026-08-23T16:00:00Z');
  storage.values.delete(LAST_PLACE_STORAGE_KEY);
  assert.equal(readBestEpisodePlace(storage, ['one', 'two', 'three'])?.episodeId, 'one');
});

test('initial selection honors explicit episode, explicit day, freshness, then fallback', () => {
  const episodes = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
  const base = {
    episodes,
    explicitEpisodeId: 'one',
    explicitDayMatch: { episodeId: 'two' },
    localLastPlace: {
      episodeId: 'two', positionSeconds: 50, completed: false,
      updatedAt: '2026-08-23T12:00:00Z', source: 'local' as const,
    },
    serverProgress: [{
      episode_id: 'three', position_seconds: 60, completed: false,
      updated_at: '2026-08-23T13:00:00Z',
    }],
    fallbackIndex: 2,
  };

  assert.deepEqual(resolveInitialLesson(base), {
    index: 0, episodeId: 'one', source: 'explicit-episode', positionSeconds: 0,
    completed: false, updatedAt: null, advancedFromCompleted: false,
    resumedFromEpisodeId: null,
  });
  assert.equal(resolveInitialLesson({ ...base, explicitEpisodeId: 'missing' }).episodeId, 'two');

  const freshest = resolveInitialLesson({
    ...base,
    explicitEpisodeId: null,
    explicitDayMatch: null,
  });
  assert.equal(freshest.episodeId, 'three');
  assert.equal(freshest.source, 'server-last-place');
  assert.equal(freshest.positionSeconds, 60);

  const fallback = resolveInitialLesson({
    episodes,
    localLastPlace: { ...base.localLastPlace, episodeId: 'removed' },
    serverProgress: [{ ...base.serverProgress[0], episode_id: 'removed' }],
    fallbackIndex: 2,
  });
  assert.equal(fallback.episodeId, 'three');
  assert.equal(fallback.source, 'fallback');
});

test('a freshest completed lesson advances once when a next episode exists', () => {
  const episodes = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
  const advanced = resolveInitialLesson({
    episodes,
    localLastPlace: {
      episodeId: 'two', positionSeconds: 180, completed: true,
      updatedAt: '2026-08-23T14:00:00Z', source: 'local',
    },
    serverProgress: [],
  });
  assert.deepEqual(advanced, {
    index: 2, episodeId: 'three', source: 'local-last-place', positionSeconds: 0,
    completed: false, updatedAt: null, advancedFromCompleted: true,
    resumedFromEpisodeId: 'two',
  });

  const atEnd = resolveInitialLesson({
    episodes,
    serverProgress: [{
      episode_id: 'three', position_seconds: 180, completed: true,
      updated_at: '2026-08-23T15:00:00Z',
    }],
  });
  assert.equal(atEnd.episodeId, 'three');
  assert.equal(atEnd.completed, true);
  assert.equal(atEnd.advancedFromCompleted, false);
});

test('episode position resolution never lets stale local data override newer server data', () => {
  const staleLocal = {
    episodeId: 'one', positionSeconds: 90, completed: false,
    updatedAt: '2026-08-23T12:00:00Z', source: 'local' as const,
  };
  const newerServer = {
    episode_id: 'one', position_seconds: 120, completed: false,
    updated_at: '2026-08-23T13:00:00Z',
  };
  assert.deepEqual(resolveEpisodePosition('one', staleLocal, newerServer), {
    episodeId: 'one', positionSeconds: 120, completed: false,
    updatedAt: '2026-08-23T13:00:00.000Z', source: 'server',
  });

  const newerLocal = { ...staleLocal, positionSeconds: 140, updatedAt: '2026-08-23T14:00:00Z' };
  assert.equal(resolveEpisodePosition('one', newerLocal, newerServer).positionSeconds, 140);

  const legacyLocal = {
    episodeId: 'one', positionSeconds: 37, completed: false,
    updatedAt: null, source: 'local-legacy' as const,
  };
  assert.equal(resolveEpisodePosition('one', legacyLocal, null).positionSeconds, 37);
  const olderUntimestampedServer = {
    ...newerServer,
    position_seconds: 10,
    updated_at: null,
  };
  assert.deepEqual(resolveEpisodePosition('one', legacyLocal, olderUntimestampedServer), {
    episodeId: 'one', positionSeconds: 37, completed: false,
    updatedAt: null, source: 'local-legacy',
  });
  assert.deepEqual(resolveEpisodePosition('one', legacyLocal, {
    ...olderUntimestampedServer,
    completed: true,
  }), {
    episodeId: 'one', positionSeconds: 37, completed: true,
    updatedAt: null, source: 'server',
  });
});

test('an unavailable explicit day never falls through to an unrelated resume lesson', () => {
  const selection = resolveInitialLesson({
    episodes: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
    explicitDayRequested: true,
    explicitDayMatch: null,
    localLastPlace: {
      episodeId: 'two', positionSeconds: 42, completed: false,
      updatedAt: '2026-08-23T15:00:00Z', source: 'local',
    },
  });

  assert.equal(selection.index, -1);
  assert.equal(selection.episodeId, null);
  assert.equal(selection.source, 'explicit-day-unavailable');
});

class FakeTimers implements TimerFunctions {
  readonly callbacks = new Map<number, () => void>();
  nextId = 1;
  setTimeout(callback: () => void) {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  }
  clearTimeout(timer: unknown) { this.callbacks.delete(timer as number); }
  runNext() {
    const next = this.callbacks.entries().next().value as [number, () => void] | undefined;
    assert.ok(next);
    this.callbacks.delete(next[0]);
    next[1]();
  }
}

test('continuous scheduling coalesces to the latest value once per fixed window', () => {
  const timers = new FakeTimers();
  const saves: number[] = [];
  const saver = createThrottledLatestSaver((value: number) => saves.push(value), 5000, timers);

  saver.schedule(1);
  saver.schedule(2);
  saver.schedule(3);
  assert.equal(timers.callbacks.size, 1);
  assert.deepEqual(saves, []);
  timers.runNext();
  assert.deepEqual(saves, [3]);

  saver.schedule(4);
  saver.schedule(5);
  assert.equal(timers.callbacks.size, 1);
  timers.runNext();
  assert.deepEqual(saves, [3, 5]);
});

test('flush saves the latest pending value and cancel discards it', () => {
  const timers = new FakeTimers();
  const saves: string[] = [];
  const saver = createThrottledLatestSaver((value: string) => saves.push(value), 5000, timers);

  saver.schedule('old');
  saver.schedule('latest');
  saver.flush();
  assert.deepEqual(saves, ['latest']);
  assert.equal(timers.callbacks.size, 0);
  saver.flush();
  assert.deepEqual(saves, ['latest']);

  saver.schedule('discard me');
  saver.cancel();
  assert.equal(timers.callbacks.size, 0);
  assert.deepEqual(saves, ['latest']);
});

test('exact cross-perek matching rejects a partial one-unit recording', () => {
  const day = [3275, 3276];
  assert.equal(episodeMatchesExactUnits([
    { global_index: 3275 },
    { global_index: 3276 },
  ], day), true);
  assert.equal(episodeMatchesExactUnits([
    { global_index: 3275 },
  ], day), false);
  assert.equal(episodeMatchesExactUnits([
    { global_index: 3276 },
    { global_index: 3275 },
  ], new Set(day)), true);
});

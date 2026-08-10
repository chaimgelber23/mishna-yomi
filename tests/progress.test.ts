import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseEpisodeProgressMutation,
  parseMishnaProgressMutation,
} from '../src/lib/progress';

function parseEpisode(body: unknown) {
  const parsed = parseEpisodeProgressMutation(body);
  if ('error' in parsed) assert.fail(parsed.error);
  return parsed.value;
}

test('position heartbeats never become remove-listened mutations', () => {
  const modern = parseEpisode({ episodeId: 'episode-1', positionSeconds: 42 });
  assert.equal(modern.hasPosition, true);
  assert.equal(modern.hasCompletion, false);

  const legacy = parseEpisode({
    episodeId: 'episode-1',
    positionSeconds: 43,
    completed: false,
  });
  assert.equal(legacy.hasPosition, true);
  assert.equal(legacy.hasCompletion, false);
});

test('explicit listened mark and undo remain distinct from position', () => {
  const listened = parseEpisode({ episodeId: 'episode-1', completed: true });
  assert.equal(listened.hasPosition, false);
  assert.equal(listened.hasCompletion, true);
  assert.equal(listened.completed, true);

  const undo = parseEpisode({ episodeId: 'episode-1', completed: false });
  assert.equal(undo.hasPosition, false);
  assert.equal(undo.hasCompletion, true);
  assert.equal(undo.completed, false);
});

test('a completion request may also carry position without making undo ambiguous', () => {
  const mutation = parseEpisode({
    episodeId: 'episode-1',
    completed: true,
    positionSeconds: 99,
  });

  assert.equal(mutation.hasPosition, true);
  assert.equal(mutation.positionSeconds, 99);
  assert.equal(mutation.hasCompletion, true);
  assert.equal(mutation.completed, true);
});

test('rejects invalid episode and Mishnah mutations', () => {
  assert.deepEqual(
    parseEpisodeProgressMutation({ episodeId: 'episode-1', positionSeconds: -1 }),
    { error: 'positionSeconds must be a non-negative integer' }
  );
  assert.deepEqual(
    parseEpisodeProgressMutation({ episodeId: 'episode-1', completed: 'yes' }),
    { error: 'completed must be a boolean' }
  );
  assert.deepEqual(
    parseMishnaProgressMutation({ globalIndex: 0, selfStudied: true }),
    { error: 'globalIndex must be an integer from 1 to 4192' }
  );
  assert.deepEqual(
    parseMishnaProgressMutation({ globalIndex: 4192, selfStudied: false }),
    { value: { globalIndex: 4192, selfStudied: false } }
  );
});

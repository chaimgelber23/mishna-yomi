import assert from 'node:assert/strict';
import test from 'node:test';
import { MISHNA_STRUCTURE } from '../src/lib/mishna-data';
import {
  MAX_BULK_MISHNAYOT,
  parseEpisodeProgressMutation,
  parseMishnaBulkProgressMutation,
  parseMishnaProgressMutation,
  resolveMishnaBulkScope,
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

test('resolves perek and masechta bulk scopes on the server', () => {
  const perek = resolveMishnaBulkScope({
    scope: 'chapter',
    tractate: 'Berakhot',
    chapter: 1,
  });
  assert.ok('value' in perek);
  assert.deepEqual(perek.value.globalIndices, [1, 2, 3, 4, 5]);

  const masechta = resolveMishnaBulkScope({
    scope: 'tractate',
    tractate: 'berakhot',
  });
  assert.ok('value' in masechta);
  assert.equal(masechta.value.globalIndices.length, 57);
  assert.equal(masechta.value.startGlobalIndex, 1);
  assert.equal(masechta.value.endGlobalIndex, 57);

  const kelim = resolveMishnaBulkScope({ scope: 'tractate', tractate: 'Kelim' });
  assert.ok('value' in kelim);
  assert.equal(kelim.value.globalIndices.length, 254);
  assert.equal(kelim.value.startGlobalIndex, 3190);
  assert.equal(kelim.value.endGlobalIndex, 3443);
  assert.equal(kelim.value.globalIndices.length, MAX_BULK_MISHNAYOT);
  assert.equal(
    Math.max(...MISHNA_STRUCTURE.map(tractate => tractate.totalMishnayot)),
    MAX_BULK_MISHNAYOT,
  );

  const largestPerek = resolveMishnaBulkScope({
    scope: 'chapter',
    tractate: 'Avot',
    chapter: 5,
  });
  assert.ok('value' in largestPerek);
  assert.equal(largestPerek.value.globalIndices.length, 23);
});

test('bulk scope input fails closed and never accepts client-supplied indices', () => {
  assert.deepEqual(
    parseMishnaBulkProgressMutation({
      scope: 'chapter',
      tractate: 'Berakhot',
      chapter: 1,
      globalIndices: [4192],
    }),
    { error: 'Mishnah indices are resolved from the requested scope' },
  );
  assert.deepEqual(
    parseMishnaBulkProgressMutation({ scope: 'tractate', tractate: 'Berakhot', chapter: 1 }),
    { error: 'chapter is only allowed for chapter scope' },
  );
  assert.deepEqual(
    parseMishnaBulkProgressMutation({
      scope: 'tractate',
      tractate: 'Berakhot',
      selfStudied: false,
    }),
    { error: 'Unexpected field: selfStudied' },
  );
  assert.deepEqual(
    resolveMishnaBulkScope({ scope: 'chapter', tractate: 'Berakhot', chapter: 10 }),
    { error: 'Chapter is outside this tractate' },
  );
  assert.deepEqual(
    resolveMishnaBulkScope({ scope: 'tractate', tractate: 'Not a tractate' }),
    { error: 'Unknown tractate' },
  );
});

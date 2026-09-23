import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDayNumberFromCalendarParts,
  getDayNumberForGlobalIndices,
  getMishnaPairLabel,
  getMishnayotForDay,
} from '../src/lib/calendar';

test('calendar grid dates resolve from civil parts without timezone drift', () => {
  const dayNumber = getDayNumberFromCalendarParts(2026, 7, 1);

  assert.equal(dayNumber, 1681);
  assert.equal(
    getMishnaPairLabel(getMishnayotForDay(dayNumber)),
    'Kelim 22:2-3',
  );
});

test('canonical Mishnah numbers determine the official day, not the upload date', () => {
  assert.equal(getDayNumberForGlobalIndices([3401, 3402]), 1701);
  assert.equal(getDayNumberForGlobalIndices([3401]), 1701);
  assert.equal(getDayNumberForGlobalIndices([3402]), 1701);
});

test('canonical day validation rejects missing, invalid, or cross-day indices', () => {
  assert.throws(() => getDayNumberForGlobalIndices([]), /without a canonical Mishnah index/);
  assert.throws(() => getDayNumberForGlobalIndices([0]), /Invalid canonical Mishnah index/);
  assert.throws(() => getDayNumberForGlobalIndices([3402, 3403]), /span multiple/);
});

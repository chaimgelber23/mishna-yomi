import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDayNumberFromCalendarParts,
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

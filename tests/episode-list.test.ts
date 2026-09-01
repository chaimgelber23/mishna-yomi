import assert from 'node:assert/strict';
import test from 'node:test';
import { getEpisodeListWindow } from '../src/lib/episode-list';

const episodes = ['Berachos', 'Peah', 'Demai', 'Kilayim', 'Sheviit'];

test('compact list starts with the current episode and includes only following episodes', () => {
  assert.deepEqual(
    getEpisodeListWindow(episodes, 'Demai', {
      hasSearch: false,
      showAll: false,
      limit: 2,
    }),
    ['Demai', 'Kilayim'],
  );
});

test('compact list does not wrap when the current episode is at the end', () => {
  assert.deepEqual(
    getEpisodeListWindow(episodes, 'Sheviit', {
      hasSearch: false,
      showAll: false,
      limit: 3,
    }),
    ['Sheviit'],
  );
});

test('compact list falls back to the first limited items when current is missing', () => {
  assert.deepEqual(
    getEpisodeListWindow(episodes, 'Missing', {
      hasSearch: false,
      showAll: false,
      limit: 3,
    }),
    ['Berachos', 'Peah', 'Demai'],
  );
});

test('search and show-all modes each return the full passed list', () => {
  assert.deepEqual(
    getEpisodeListWindow(episodes, 'Demai', {
      hasSearch: true,
      showAll: false,
      limit: 1,
    }),
    episodes,
  );
  assert.deepEqual(
    getEpisodeListWindow(episodes, 'Demai', {
      hasSearch: false,
      showAll: true,
      limit: 1,
    }),
    episodes,
  );
});

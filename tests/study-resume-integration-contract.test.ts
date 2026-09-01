import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const browsePagePath = new URL('../src/app/browse/page.tsx', import.meta.url);
const progressPagePath = new URL('../src/app/progress/page.tsx', import.meta.url);

test('Browse only restores for Continue, then opens and advances the self-study pointer', async () => {
  const source = await readFile(browsePagePath, 'utf8');

  assert.match(source, /resumeRequested\.current = params\.get\('resume'\) === '1'/);
  assert.match(source, /if \(!resumeRequested\.current \|\| explicitBrowseLocation\.current\) return/);
  assert.match(source, /resolveStudyResume\(\{[\s\S]*serverProgress:\s*Object\.values\(mishnaProgress\)/);
  assert.match(source, /openStudyMishna\(selection\.globalIndex, true\)/);
  assert.match(source, /setOpenText\(`\$\{requestedChapter\}:\$\{requestedMishna\}`\)/);
  assert.match(source, /rememberNextStudyPlace\(globalIndex, desiredSelfStudy\)/);
  assert.match(source, /openStudyMishna\(nextIndex, true\)/);
  assert.match(source, /if \(cancelPendingResume\) didResolveStudyResume\.current = true/);
  assert.match(source, /onClick=\{\(\) => toggleMishnaText\(/);
});

test('Progress continuation uses self-study recency instead of an old global gap', async () => {
  const source = await readFile(progressPagePath, 'utf8');

  assert.match(source, /resolveStudyResume\(\{/);
  assert.match(source, /serverProgress:\s*progressRows/);
  assert.match(source, /const continueHref = nextMishna \? buildBrowseHref\(nextMishna\) : '\/browse'/);
  assert.match(source, /Continue Self-Study/);
});

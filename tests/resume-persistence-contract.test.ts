import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../supabase/migrations/20260823151804_add_mishna_progress_updated_at.sql',
  import.meta.url,
);
const routePath = new URL('../src/app/api/progress/route.ts', import.meta.url);

test('episode progress records an honest last-touched timestamp for resume', async () => {
  const [migration, route] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(routePath, 'utf8'),
  ]);

  assert.match(
    migration,
    /alter table public\.mishna_progress\s+add column if not exists updated_at timestamptz/i,
  );
  assert.match(migration, /before insert or update on public\.mishna_progress/i);
  assert.match(migration, /new\.updated_at := now\(\)/i);
  assert.match(
    migration,
    /revoke all on function public\.set_mishna_progress_updated_at\(\)\s+from public, anon, authenticated, service_role/i,
  );

  const selectedUpdatedAtFields = route.match(/updated_at/g) ?? [];
  assert.ok(selectedUpdatedAtFields.length >= 2, 'GET and POST progress reads must return updated_at');
});

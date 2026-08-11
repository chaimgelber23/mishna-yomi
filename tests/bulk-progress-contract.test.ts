import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../supabase/migrations/20260810235010_bulk_mishna_self_study.sql',
  import.meta.url,
);
const routePath = new URL(
  '../src/app/api/progress/mishna/bulk/route.ts',
  import.meta.url,
);

test('bulk self-study is one authenticated atomic database mutation', async () => {
  const [migration, route] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(routePath, 'utf8'),
  ]);

  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /returns table\s*\(/i);
  assert.match(migration, /pg_catalog\.generate_series\s*\(/i);
  assert.match(migration, /on conflict on constraint mishna_manual_progress_pkey do nothing/i);
  assert.match(migration, /canonical progress range incomplete/i);
  assert.match(migration, /return query\s+select/i);
  assert.match(
    migration,
    /revoke all on function public\.mark_mishna_self_studied_range\(integer, integer\)\s+from public, anon, authenticated, service_role/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.mark_mishna_self_studied_range\(integer, integer\)\s+to authenticated/i,
  );
  assert.match(route, /resolveMishnaBulkScope\(parsed\.value\)/);
  assert.match(route, /supabase\.rpc\(\s*'mark_mishna_self_studied_range'/);
});

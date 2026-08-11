import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  MishnaProgressRow,
  parseMishnaBulkProgressMutation,
  postgresMutationStatus,
  resolveMishnaBulkScope,
} from '@/lib/progress';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = parseMishnaBulkProgressMutation(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const resolved = resolveMishnaBulkScope(parsed.value);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  if (!user.email) {
    return NextResponse.json({ error: 'An email address is required to save progress' }, { status: 409 });
  }

  const { error: profileError } = await supabase
    .from('mishna_users')
    .upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const scope = resolved.value;
  const { data: rpcData, error: mutationError } = await supabase.rpc(
    'mark_mishna_self_studied_range',
    {
      p_start_global_index: scope.startGlobalIndex,
      p_end_global_index: scope.endGlobalIndex,
    },
  );

  if (mutationError) {
    return NextResponse.json(
      { error: mutationError.message },
      { status: postgresMutationStatus(mutationError.code) },
    );
  }

  const rows = (rpcData ?? []) as unknown as Array<
    MishnaProgressRow & { newly_self_studied: number }
  >;
  if (
    rows.length !== scope.globalIndices.length
    || rows.some((row, index) => row.global_index !== scope.globalIndices[index])
  ) {
    return NextResponse.json({ error: 'Bulk progress response was incomplete' }, { status: 500 });
  }

  const mishnaProgress: MishnaProgressRow[] = rows.map(row => ({
    user_id: row.user_id,
    global_index: row.global_index,
    listened_at: row.listened_at,
    self_studied_at: row.self_studied_at,
    cycle_completed_at: row.cycle_completed_at,
    learned_at: row.learned_at,
    learned_by_listening: row.learned_by_listening,
    learned_by_self_study: row.learned_by_self_study,
    learned_by_cycle: row.learned_by_cycle,
    learned: row.learned,
  }));

  return NextResponse.json({
    scope: {
      kind: scope.scope,
      tractate: scope.tractate,
      chapter: scope.chapter,
      totalMishnayot: scope.globalIndices.length,
    },
    newlySelfStudied: rows[0]?.newly_self_studied ?? 0,
    mishnaProgress,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  MishnaProgressRow,
  emptyMishnaProgress,
  parseMishnaProgressMutation,
  postgresMutationStatus,
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

  const parsed = parseMishnaProgressMutation(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
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

  const { globalIndex, selfStudied } = parsed.value;
  const { error: mutationError } = await supabase.rpc('set_mishna_self_studied', {
    p_global_index: globalIndex,
    p_self_studied: selfStudied,
  });

  if (mutationError) {
    return NextResponse.json(
      { error: mutationError.message },
      { status: postgresMutationStatus(mutationError.code) }
    );
  }

  const { data, error } = await supabase
    .from('mishna_canonical_progress')
    .select(`
      user_id,
      global_index,
      listened_at,
      self_studied_at,
      cycle_completed_at,
      learned_at,
      learned_by_listening,
      learned_by_self_study,
      learned_by_cycle,
      learned
    `)
    .eq('user_id', user.id)
    .eq('global_index', globalIndex)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mishnaProgress = data
    ? data as unknown as MishnaProgressRow
    : { user_id: user.id, ...emptyMishnaProgress(globalIndex) };

  return NextResponse.json({ mishnaProgress });
}

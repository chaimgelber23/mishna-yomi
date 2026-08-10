'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SeferDivider } from '@/components/Ornament';
import { SEDARIM, TRACTATE_HEBREW, TOTAL_MISHNAYOT } from '@/lib/mishna-data';
import {
  CustomCycle,
  cycleDayNumber,
  cycleEndDate,
  cycleTotalDays,
  diffDays,
  mishnaRangeLabel,
  mishnayotForCycleDay,
  paceForTargetDate,
  parseDateUTC,
  todayString,
  tractateStartIndex,
} from '@/lib/cycle';

type View = 'loading' | 'signed-out' | 'choose' | 'wizard' | 'dashboard';

const FIXED_PACES = [1, 2, 3, 4, 5, 10];

function formatLongDate(dateStr: string): string {
  return parseDateUTC(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export default function CyclesPage() {
  const [view, setView]               = useState<View>('loading');
  const [cycle, setCycle]             = useState<CustomCycle | null>(null);
  const [doneDays, setDoneDays]       = useState<Set<number>>(new Set());
  const [error, setError]             = useState('');
  const [busy, setBusy]               = useState(false);
  const [pendingDays, setPendingDays] = useState<Set<number>>(new Set());
  const [cycleSaveError, setCycleSaveError] = useState('');

  // Wizard state
  const [startChoice, setStartChoice] = useState<'beginning' | 'tractate'>('beginning');
  const [seder, setSeder]             = useState(SEDARIM[0].name);
  const [tractate, setTractate]       = useState(SEDARIM[0].tractates[0].tractate);
  const [paceMode, setPaceMode]       = useState<'fixed' | 'target'>('fixed');
  const [pace, setPace]               = useState(2);
  const [targetDate, setTargetDate]   = useState('');
  const [startDate, setStartDate]     = useState(todayString());
  const [name, setName]               = useState('');

  function getSupabase() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@/lib/supabase/client');
    return createClient();
  }

  async function loadCycle() {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setView('signed-out'); return; }

    const { data: cycles } = await supabase
      .from('mishna_cycles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const active = cycles?.[0] as CustomCycle | undefined;
    if (!active) { setView('choose'); return; }

    const { data: progress } = await supabase
      .from('mishna_cycle_progress')
      .select('day_number')
      .eq('cycle_id', active.id);

    setCycle(active);
    setDoneDays(new Set((progress || []).map((p: { day_number: number }) => p.day_number)));
    setView('dashboard');
  }

  useEffect(() => {
    loadCycle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wizard derived values ──
  const startIndex = startChoice === 'beginning' ? 0 : tractateStartIndex(tractate);
  const remaining  = TOTAL_MISHNAYOT - startIndex;
  const effectivePace = paceMode === 'fixed'
    ? pace
    : (targetDate && diffDays(startDate, targetDate) >= 0
        ? paceForTargetDate(startIndex, startDate, targetDate)
        : 0);
  const previewCycle: CustomCycle | null = effectivePace >= 1 ? {
    id: 'preview', name: '', start_date: startDate, pace: effectivePace,
    start_index: startIndex, target_date: targetDate || null, is_active: true,
  } : null;

  async function handleCreate() {
    if (!previewCycle) return;
    setBusy(true); setError('');
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setView('signed-out'); return; }

    // Ensure a profile row exists (cycles reference mishna_users)
    await supabase.from('mishna_users').upsert({ id: user.id, email: user.email });

    const { error: insertError } = await supabase.from('mishna_cycles').insert({
      user_id: user.id,
      name: name.trim() || (startChoice === 'beginning' ? 'My Mishna Cycle' : `${tractate} & onward`),
      start_date: startDate,
      pace: effectivePace,
      start_index: startIndex,
      target_date: paceMode === 'target' && targetDate ? targetDate : null,
    });

    if (insertError) { setError(insertError.message); setBusy(false); return; }
    setBusy(false);
    await loadCycle();
  }

  async function setDayDone(dayNumber: number, done: boolean) {
    if (!cycle || pendingDays.has(dayNumber)) return;
    const supabase = getSupabase();
    const wasDone = doneDays.has(dayNumber);
    if (wasDone === done) return;

    setCycleSaveError('');
    setPendingDays(current => new Set(current).add(dayNumber));
    setDoneDays(prev => {
      const next = new Set(prev);
      if (done) next.add(dayNumber); else next.delete(dayNumber);
      return next;
    });

    try {
      const { error: saveError } = await supabase.rpc('set_mishna_cycle_day_complete', {
        p_cycle_id: cycle.id,
        p_day_number: dayNumber,
        p_completed: done,
      });
      if (saveError) throw saveError;
    } catch {
      setDoneDays(prev => {
        const next = new Set(prev);
        if (wasDone) next.add(dayNumber); else next.delete(dayNumber);
        return next;
      });
      setCycleSaveError(`We couldn't save Day ${dayNumber}. Your previous progress is still shown; please try again.`);
    } finally {
      setPendingDays(current => {
        const next = new Set(current);
        next.delete(dayNumber);
        return next;
      });
    }
  }

  async function archiveCycle() {
    if (!cycle) return;
    if (!window.confirm('End this cycle? Your progress is kept, but the cycle will no longer be active.')) return;
    setBusy(true);
    await getSupabase().from('mishna_cycles').update({ is_active: false }).eq('id', cycle.id);
    setCycle(null); setDoneDays(new Set()); setBusy(false);
    setView('choose');
  }

  // ── Render helpers ──

  const card: React.CSSProperties = {
    background: 'var(--surface)', borderColor: 'var(--border)',
  };

  function renderSignedOut() {
    return (
      <div className="rounded-2xl p-10 border text-center" style={card}>
        <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
          Your own pace through Shas
        </h2>
        <p className="text-sm leading-relaxed mb-6 max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
          Create a personal cycle — start from any tractate, set your own pace, or pick a date
          you want to finish by. Sign in to begin.
        </p>
        <Link href="/auth/login"
          className="inline-block py-3 px-8 rounded-full font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, var(--navy), #3D2E1A)', boxShadow: '0 4px 16px rgba(34,26,16,0.3)' }}>
          Sign in to create a cycle
        </Link>
      </div>
    );
  }

  function renderChoose() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl p-8 border flex flex-col" style={card}>
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--gold)' }}>
            Option 1
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
            Follow the communal cycle
          </h2>
          <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: 'var(--muted)' }}>
            Learn 2 mishnayot a day alongside thousands of others worldwide on the
            Mishna Yomit schedule. Nothing to set up — today&apos;s learning is always ready.
          </p>
          <Link href="/learn"
            className="inline-block text-center py-3 px-6 rounded-full font-bold text-sm border transition-all"
            style={{ color: 'var(--navy)', borderColor: 'var(--border)' }}>
            Go to today&apos;s learning
          </Link>
        </div>

        <div className="rounded-2xl p-8 border-2 flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--gold)' }}>
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--gold)' }}>
            Option 2
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
            Create your own cycle
          </h2>
          <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: 'var(--muted)' }}>
            Start today from anywhere in Shas. Set your own pace — or pick a finish date
            (a siyum, a yahrzeit, a simcha) and we&apos;ll calculate your daily schedule.
          </p>
          <button onClick={() => setView('wizard')}
            className="py-3 px-6 rounded-full font-bold text-white text-sm cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--navy), #3D2E1A)', boxShadow: '0 4px 16px rgba(34,26,16,0.3)' }}>
            Build my cycle
          </button>
        </div>
      </div>
    );
  }

  function renderWizard() {
    const currentSeder = SEDARIM.find(s => s.name === seder) || SEDARIM[0];
    return (
      <div className="rounded-2xl p-6 sm:p-10 border" style={card}>
        <h2 className="text-2xl font-bold mb-8" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
          Build your cycle
        </h2>

        {/* 1 — Starting point */}
        <div className="mb-8">
          <div className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>1 · Where do you want to start?</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setStartChoice('beginning')}
              className="text-left p-4 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: startChoice === 'beginning' ? 'var(--gold)' : 'var(--border)', background: startChoice === 'beginning' ? 'rgba(201,169,110,0.06)' : 'transparent' }}>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--fg)' }}>From the beginning</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Berakhot 1:1 — all {TOTAL_MISHNAYOT.toLocaleString()} mishnayot</div>
            </button>
            <button onClick={() => setStartChoice('tractate')}
              className="text-left p-4 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: startChoice === 'tractate' ? 'var(--gold)' : 'var(--border)', background: startChoice === 'tractate' ? 'rgba(201,169,110,0.06)' : 'transparent' }}>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--fg)' }}>From a specific tractate</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Pick up wherever you are in Shas</div>
            </button>
          </div>

          {startChoice === 'tractate' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="seder" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Seder</label>
                <select id="seder" value={seder}
                  onChange={e => { setSeder(e.target.value); const s = SEDARIM.find(x => x.name === e.target.value); if (s) setTractate(s.tractates[0].tractate); }}
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none cursor-pointer"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}>
                  {SEDARIM.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="tractate" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Tractate</label>
                <select id="tractate" value={tractate} onChange={e => setTractate(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none cursor-pointer"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}>
                  {currentSeder.tractates.map(t => (
                    <option key={t.tractate} value={t.tractate}>
                      {t.tractate} ({TRACTATE_HEBREW[t.tractate] ?? ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 2 — Pace */}
        <div className="mb-8">
          <div className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>2 · How fast do you want to go?</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button onClick={() => setPaceMode('fixed')}
              className="text-left p-4 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: paceMode === 'fixed' ? 'var(--gold)' : 'var(--border)', background: paceMode === 'fixed' ? 'rgba(201,169,110,0.06)' : 'transparent' }}>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--fg)' }}>Set a daily pace</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>A steady number of mishnayot each day</div>
            </button>
            <button onClick={() => setPaceMode('target')}
              className="text-left p-4 rounded-xl border-2 cursor-pointer transition-all"
              style={{ borderColor: paceMode === 'target' ? 'var(--gold)' : 'var(--border)', background: paceMode === 'target' ? 'rgba(201,169,110,0.06)' : 'transparent' }}>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--fg)' }}>Finish by a date</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>A siyum, yahrzeit, or simcha — we&apos;ll set the pace</div>
            </button>
          </div>

          {paceMode === 'fixed' ? (
            <div className="flex flex-wrap gap-2">
              {FIXED_PACES.map(p => (
                <button key={p} onClick={() => setPace(p)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: pace === p ? 'var(--navy)' : 'var(--border)',
                    background: pace === p ? 'var(--navy)' : 'transparent',
                    color: pace === p ? '#fff' : 'var(--muted)',
                  }}>
                  {p}/day
                </button>
              ))}
            </div>
          ) : (
            <div className="max-w-xs">
              <label htmlFor="target_date" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Finish by</label>
              <input id="target_date" type="date" value={targetDate} min={startDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }} />
            </div>
          )}
        </div>

        {/* 3 — Start date + name */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>3 · When do you begin?</div>
            <input type="date" value={startDate} aria-label="Start date"
              onChange={e => { setStartDate(e.target.value); }}
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }} />
          </div>
          <div>
            <div className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>4 · Name it <span className="font-normal" style={{ color: 'var(--muted)' }}>(optional)</span></div>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. L'iluy nishmas Zeidy"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }} />
          </div>
        </div>

        {/* Live summary */}
        <div className="rounded-xl p-5 mb-6 border"
          style={{ background: 'rgba(201,169,110,0.06)', borderColor: 'rgba(201,169,110,0.25)' }}>
          {previewCycle ? (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
              <span className="font-bold">{remaining.toLocaleString()} mishnayot</span>
              {' '}at <span className="font-bold">{effectivePace}/day</span>
              {' '}· {cycleTotalDays(previewCycle).toLocaleString()} days
              {' '}· finishing around <span className="font-bold">{formatLongDate(cycleEndDate(previewCycle))}</span>
              {paceMode === 'target' && effectivePace > 10 && (
                <span className="block mt-1 text-xs" style={{ color: '#B45309' }}>
                  That&apos;s an ambitious pace — consider a later date or a later starting point.
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {paceMode === 'target' ? 'Pick a finish date to see your daily pace.' : 'Choose your options to see a summary.'}
            </p>
          )}
        </div>

        {error && (
          <div className="text-sm px-4 py-3 rounded-xl border mb-4"
            style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleCreate} disabled={!previewCycle || busy}
            className="py-3 px-8 rounded-full font-bold text-white text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, var(--navy), #3D2E1A)', boxShadow: '0 4px 16px rgba(34,26,16,0.3)' }}>
            {busy ? 'Creating…' : 'Start my cycle'}
          </button>
          <button onClick={() => setView('choose')}
            className="text-sm font-medium cursor-pointer" style={{ color: 'var(--muted)' }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  function renderDashboard() {
    if (!cycle) return null;
    const today      = todayString();
    const todayNum   = cycleDayNumber(cycle, today);
    const totalDays  = cycleTotalDays(cycle);
    const started    = todayNum >= 1;
    const todayRefs  = started ? mishnayotForCycleDay(cycle, todayNum) : [];
    const doneCount  = doneDays.size;
    const pct        = totalDays > 0 ? Math.round((doneCount / totalDays) * 100) : 0;
    const elapsed    = started ? todayNum : 0;
    const behind     = Math.max(0, elapsed - doneCount - (doneDays.has(todayNum) ? 0 : 1));
    const upcoming   = started
      ? Array.from({ length: Math.min(7, totalDays - todayNum) }, (_, i) => todayNum + 1 + i)
      : [];

    return (
      <div className="space-y-5">
        {/* Header card */}
        <div className="rounded-2xl p-6 sm:p-8 border" style={card}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                {cycle.name}
              </h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {cycle.pace} mishnayot/day · started {formatLongDate(cycle.start_date)} · finishes ~{formatLongDate(cycleEndDate(cycle))}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--navy)' }}>{pct}%</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{doneCount.toLocaleString()} of {totalDays.toLocaleString()} days</div>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--gold), #d97706)' }} />
          </div>
          {behind > 0 && (
            <p className="text-xs mt-3" style={{ color: '#B45309' }}>
              You&apos;re about {behind} day{behind === 1 ? '' : 's'} behind — the earlier days below are waiting for you.
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Completed cycle days update your overall Mishnah progress. Learning already saved through audio or self-study is counted only once.
          </p>
        </div>

        {cycleSaveError && (
          <div role="alert" className="rounded-xl border px-4 py-3 text-sm"
            style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
            {cycleSaveError}
          </div>
        )}

        {/* Today */}
        <div className="rounded-2xl p-6 sm:p-8 border" style={card}>
          <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>
            {started ? `Day ${todayNum}` : 'Starting soon'}
          </div>
          {started ? (
            <>
              <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                {mishnaRangeLabel(todayRefs)}
              </h3>
              <ul className="space-y-1.5 mb-6">
                {todayRefs.map(r => (
                  <li key={r.globalIndex} className="flex items-center gap-3 text-sm" style={{ color: 'var(--muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--gold)' }} />
                    {r.tractate} {r.chapter}:{r.mishna}
                    <span dir="rtl" style={{ fontFamily: 'var(--font-hebrew)' }}>
                      {TRACTATE_HEBREW[r.tractate] ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => void setDayDone(todayNum, !doneDays.has(todayNum))}
                disabled={pendingDays.has(todayNum)}
                aria-busy={pendingDays.has(todayNum)}
                aria-label={doneDays.has(todayNum) ? `Remove Day ${todayNum} completion` : `Mark Day ${todayNum} complete`}
                className="min-h-11 py-3 px-7 rounded-full font-bold text-sm cursor-pointer transition-all border-2 disabled:cursor-wait disabled:opacity-65"
                style={doneDays.has(todayNum)
                  ? { background: '#ECFDF5', borderColor: 'rgba(6,95,70,0.3)', color: '#065F46' }
                  : { background: 'linear-gradient(135deg, var(--navy), #3D2E1A)', borderColor: 'transparent', color: '#fff', boxShadow: '0 4px 16px rgba(34,26,16,0.3)' }}>
                {pendingDays.has(todayNum) ? 'Saving…' : doneDays.has(todayNum) ? '✓ Done for today' : 'Mark today done'}
              </button>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Your cycle begins on {formatLongDate(cycle.start_date)}. Day 1: {mishnaRangeLabel(mishnayotForCycleDay(cycle, 1))}.
            </p>
          )}
        </div>

        {/* Catch up + upcoming */}
        {started && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl p-6 border" style={card}>
              <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>Catch up</h3>
              {(() => {
                const missed = [];
                for (let d = todayNum - 1; d >= 1 && missed.length < 5; d--) {
                  if (!doneDays.has(d)) missed.push(d);
                }
                if (!missed.length) return <p className="text-sm" style={{ color: 'var(--muted)' }}>You&apos;re all caught up.</p>;
                return (
                  <ul className="space-y-2">
                    {missed.map(d => (
                      <li key={d} className="flex flex-col items-stretch gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span style={{ color: 'var(--fg)' }}>
                          <span className="font-medium">Day {d}:</span>{' '}
                          <span style={{ color: 'var(--muted)' }}>{mishnaRangeLabel(mishnayotForCycleDay(cycle, d))}</span>
                        </span>
                        <button type="button" onClick={() => void setDayDone(d, true)}
                          disabled={pendingDays.has(d)} aria-busy={pendingDays.has(d)}
                          aria-label={`Mark Day ${d} complete: ${mishnaRangeLabel(mishnayotForCycleDay(cycle, d))}`}
                          className="min-h-11 self-end text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer flex-shrink-0 disabled:cursor-wait disabled:opacity-65 sm:self-auto"
                          style={{ color: 'var(--navy)', borderColor: 'var(--border)' }}>
                          {pendingDays.has(d) ? 'Saving…' : 'Mark done'}
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
            <div className="rounded-2xl p-6 border" style={card}>
              <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>Coming up</h3>
              <ul className="space-y-2">
                {upcoming.map(d => {
                  const date = parseDateUTC(cycle.start_date);
                  date.setUTCDate(date.getUTCDate() + d - 1);
                  return (
                    <li key={d} className="flex items-center justify-between gap-3 text-sm">
                      <span style={{ color: 'var(--muted)' }}>
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                      </span>
                      <span className="font-medium text-right" style={{ color: 'var(--fg)' }}>
                        {mishnaRangeLabel(mishnayotForCycleDay(cycle, d))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Manage */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/learn" className="text-sm" style={{ color: 'var(--muted)' }}>
            Prefer the communal cycle? Today&apos;s shiur →
          </Link>
          <button onClick={archiveCycle} disabled={busy}
            className="text-sm font-medium cursor-pointer transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseOver={e => (e.currentTarget.style.color = '#DC2626')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}>
            End this cycle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full mx-auto" style={{ maxWidth: '880px' }}>
        <div className="text-hebrew text-2xl mb-2" style={{ color: 'var(--brass-deep)' }}>מחזור שלי</div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-frank)', color: 'var(--fg)' }}>
          My Cycle
        </h1>
        <SeferDivider className="mb-5" />
        <p className="text-sm mb-10" style={{ color: 'var(--muted)' }}>
          Learn on your terms — follow the worldwide cycle or build your own path through Shas.
        </p>

        {view === 'loading' && (
          <div className="rounded-2xl p-10 border text-center" style={card}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
          </div>
        )}
        {view === 'signed-out' && renderSignedOut()}
        {view === 'choose'     && renderChoose()}
        {view === 'wizard'     && renderWizard()}
        {view === 'dashboard'  && renderDashboard()}
      </div>
    </div>
  );
}

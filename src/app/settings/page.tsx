'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Zurich',
  'Europe/Moscow',
  'Asia/Jerusalem',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
];

const REMINDER_TIMES = [
  ['05:00:00', '5:00 AM'], ['06:00:00', '6:00 AM'], ['07:00:00', '7:00 AM'],
  ['08:00:00', '8:00 AM'], ['09:00:00', '9:00 AM'], ['12:00:00', '12:00 PM'],
  ['15:00:00', '3:00 PM'], ['18:00:00', '6:00 PM'], ['20:00:00', '8:00 PM'],
  ['21:00:00', '9:00 PM'], ['22:00:00', '10:00 PM'],
];

interface Profile {
  display_name: string;
  daily_reminder_time: string;
  daily_reminder_tz: string;
  subscribed_to_emails: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    daily_reminder_time: '08:00:00',
    daily_reminder_tz: 'America/New_York',
    subscribed_to_emails: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  function getSupabase() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@/lib/supabase/client');
    return createClient();
  }

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: { id: string; email?: string } | null } }) => {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setEmail(user.email || '');

      const { data: row } = await supabase
        .from('mishna_users')
        .select('display_name, daily_reminder_time, daily_reminder_tz, subscribed_to_emails')
        .eq('id', user.id)
        .maybeSingle();

      if (row) {
        setProfile({
          display_name: row.display_name || '',
          daily_reminder_time: row.daily_reminder_time || '08:00:00',
          daily_reminder_tz: row.daily_reminder_tz || 'America/New_York',
          subscribed_to_emails: row.subscribed_to_emails ?? true,
        });
      } else {
        // First visit — prefill with detected timezone
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz) setProfile(p => ({ ...p, daily_reminder_tz: tz }));
        } catch { /* keep default */ }
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);

    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login'); return; }

    const { error: upsertError } = await supabase
      .from('mishna_users')
      .upsert({
        id: user.id,
        email: user.email,
        display_name: profile.display_name || null,
        daily_reminder_time: profile.daily_reminder_time,
        daily_reminder_tz: profile.daily_reminder_tz,
        subscribed_to_emails: profile.subscribed_to_emails,
      });

    if (upsertError) setError(upsertError.message);
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  }

  async function handleSignOut() {
    await getSupabase().auth.signOut();
    router.push('/');
  }

  const detectedTz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; }
  })();
  const tzOptions = detectedTz && !TIMEZONES.includes(detectedTz)
    ? [detectedTz, ...TIMEZONES]
    : TIMEZONES;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading your settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
          Settings
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          Signed in as <span className="font-medium" style={{ color: 'var(--navy)' }}>{email}</span>
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile */}
          <section className="rounded-2xl p-6 sm:p-8 border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="font-bold mb-5" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
              Profile
            </h2>
            <label htmlFor="display_name" className="block text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
              Display name
            </label>
            <input
              id="display_name"
              type="text"
              value={profile.display_name}
              onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
              placeholder="How should we greet you?"
              className="w-full rounded-xl px-4 py-3 text-sm border transition-all outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </section>

          {/* Daily reminders */}
          <section className="rounded-2xl p-6 sm:p-8 border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                Daily reminder email
              </h2>
              <button
                type="button"
                role="switch"
                aria-checked={profile.subscribed_to_emails}
                aria-label="Toggle daily reminder emails"
                onClick={() => setProfile(p => ({ ...p, subscribed_to_emails: !p.subscribed_to_emails }))}
                className="relative w-12 h-7 rounded-full transition-colors cursor-pointer flex-shrink-0"
                style={{ background: profile.subscribed_to_emails ? 'var(--navy)' : 'rgba(0,0,0,0.15)' }}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: profile.subscribed_to_emails ? 'calc(100% - 1.5rem)' : '0.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              style={{ opacity: profile.subscribed_to_emails ? 1 : 0.45 }}>
              <div>
                <label htmlFor="reminder_time" className="block text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                  Time
                </label>
                <select
                  id="reminder_time"
                  value={profile.daily_reminder_time}
                  disabled={!profile.subscribed_to_emails}
                  onChange={e => setProfile(p => ({ ...p, daily_reminder_time: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none cursor-pointer"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                >
                  {REMINDER_TIMES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reminder_tz" className="block text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                  Timezone
                </label>
                <select
                  id="reminder_tz"
                  value={profile.daily_reminder_tz}
                  disabled={!profile.subscribed_to_emails}
                  onChange={e => setProfile(p => ({ ...p, daily_reminder_tz: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none cursor-pointer"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                >
                  {tzOptions.map(tz => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}{tz === detectedTz ? ' (detected)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {error && (
            <div className="text-sm px-4 py-3 rounded-xl border"
              style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="py-3 px-8 rounded-full font-bold text-white text-sm transition-all cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--navy), #3D2E1A)', boxShadow: '0 4px 16px rgba(34,26,16,0.3)' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span className="text-sm font-medium" style={{ color: '#065F46' }}>
                ✓ Saved
              </span>
            )}
          </div>
        </form>

        {/* Account */}
        <div className="mt-10 pt-8 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <Link href="/" className="text-sm" style={{ color: 'var(--muted)' }}>← Back to home</Link>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium transition-colors cursor-pointer"
            style={{ color: 'var(--muted)' }}
            onMouseOver={e => (e.currentTarget.style.color = '#DC2626')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

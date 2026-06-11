'use client';

import { useState } from 'react';

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [reminderTime, setReminderTime] = useState('08:00:00');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Auto-detect the visitor's timezone so reminders arrive at THEIR local time
      let timezone = 'America/New_York';
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
      } catch {
        // keep default
      }

      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reminderTime, timezone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card-gold p-8 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(201,169,110,0.12)', border: '2px solid rgba(201,169,110,0.3)' }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold-dark)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold-dark)' }}>You&apos;re subscribed!</h3>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Check your inbox for a welcome email. Your daily reminder will arrive at your chosen time.
        </p>
      </div>
    );
  }

  return (
    <div className="card-gold p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1.5 uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none transition-colors"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5 uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Reminder time
            </label>
            <select
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none transition-colors cursor-pointer"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
            >
              <option value="06:00:00">6:00 AM</option>
              <option value="07:00:00">7:00 AM</option>
              <option value="08:00:00">8:00 AM</option>
              <option value="09:00:00">9:00 AM</option>
              <option value="12:00:00">12:00 PM</option>
              <option value="18:00:00">6:00 PM</option>
              <option value="21:00:00">9:00 PM</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm rounded-lg px-4 py-2 border"
            style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#DC2626' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full btn-gold py-3 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Subscribing...' : 'Subscribe to Daily Reminders →'}
        </button>

        <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
          Free forever. No spam. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}

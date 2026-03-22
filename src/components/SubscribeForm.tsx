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
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reminderTime }),
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
        <div className="text-4xl mb-3">📬</div>
        <h3 className="text-lg font-semibold text-gold-300 mb-2">You&apos;re subscribed!</h3>
        <p className="text-slate-400 text-sm">
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
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-4 py-3 text-parchment-100 placeholder-slate-600 focus:outline-none focus:border-gold-500 text-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">
              Reminder time
            </label>
            <select
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-4 py-3 text-parchment-100 focus:outline-none focus:border-gold-500 text-sm transition-colors"
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
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
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

        <p className="text-center text-slate-600 text-xs">
          Free forever. No spam. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}

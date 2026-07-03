import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { getTodaySummary } from '@/lib/calendar';
import { buildDailyReminderEmail } from '@/lib/email/templates';
import { fetchMishnayotText } from '@/lib/sefaria';
import {
  CustomCycle,
  cycleDayNumber,
  mishnaRangeLabel,
  mishnayotForCycleDay,
  todayString,
} from '@/lib/cycle';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 60;

// Cap how many mishnayot we fetch+show inline in one email. The communal cycle
// is always 2/day; this only bounds aggressive custom cycles (pace can be large)
// so a single recipient can't fan out dozens of live Sefaria fetches.
const MAX_EMAIL_MISHNAYOT = 4;

export async function GET(request: NextRequest) {
  return POST(request);
}

/**
 * Returns the current hour (0-23) in the given IANA timezone.
 * Falls back to UTC if the timezone string is invalid.
 */
function currentHourInTz(tz: string | null | undefined): number {
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      hour: 'numeric',
      hour12: false,
    }).format(new Date());
    return parseInt(hourStr, 10) % 24;
  } catch {
    return new Date().getUTCHours();
  }
}

/** Parses 'HH:MM:SS' to the hour as a number, defaulting to 8. */
function reminderHour(time: string | null | undefined): number {
  const h = parseInt((time || '08:00:00').split(':')[0], 10);
  return Number.isFinite(h) ? h : 8;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Fail hard if the secret is not configured — never run unprotected.
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = await createServiceClient();

  // Get today's info
  const { label, mishnayot, dayNumber, dateLabel } = getTodaySummary();

  // Find matching episode from DB
  const { data: episode } = await supabase
    .from('mishna_episodes')
    .select('*')
    .eq('mishna_day_number', dayNumber)
    .single();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mishna-yomi.com';
  const listenUrl = episode
    ? `${siteUrl}/learn?episode=${episode.id}`
    : `${siteUrl}/learn`;

  // Hebrew + English text of today's communal mishnayot — fetched once (cached).
  // Best-effort: a Sefaria hiccup must never block the daily send.
  let communalTexts: { label: string; he: string; en: string }[] = [];
  try {
    communalTexts = await fetchMishnayotText(mishnayot);
  } catch {
    communalTexts = [];
  }

  // Fetch all active subscribers, then filter by each subscriber's OWN timezone:
  // a subscriber is due when the current hour in their timezone matches their
  // chosen reminder hour. (Run this cron hourly.)
  const { data: allSubscribers, error: subError } = await supabase
    .from('mishna_email_subscribers')
    .select('*')
    .eq('subscribed', true);

  if (subError) {
    console.error('Subscriber query error:', subError);
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const subscribers = (allSubscribers || []).filter(
    s => currentHourInTz(s.daily_reminder_tz) === reminderHour(s.daily_reminder_time)
  );

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${subscriber.unsubscribe_token}`;

      const { subject, html, text } = buildDailyReminderEmail({
        recipientName: subscriber.display_name,
        mishnayot,
        episodeTitle: episode?.title || label,
        listenUrl,
        completedCount: 0, // No auth-based progress for quick subscribers
        unsubscribeUrl,
        episodeDescription: episode?.description || undefined,
        texts: communalTexts,
      });

      await resend.emails.send({
        from: process.env.MISHNA_FROM_EMAIL || 'learn@mishna-yomi.com',
        to: subscriber.email,
        subject,
        html,
        text,
      });

      sent++;
    } catch (err) {
      console.error('Email send error:', subscriber.email, err);
      failed++;
    }
  }

  // Also send to authenticated users (mishna_users with subscribed_to_emails = true),
  // filtered by each user's own timezone.
  const { data: allAuthUsers } = await supabase
    .from('mishna_users')
    .select('*')
    .eq('subscribed_to_emails', true);

  const authUsers = (allAuthUsers || []).filter(
    u => currentHourInTz(u.daily_reminder_tz) === reminderHour(u.daily_reminder_time)
  );

  for (const user of authUsers) {
    try {
      // Get user's completion count
      const { count } = await supabase
        .from('mishna_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      const unsubscribeUrl = `${siteUrl}/settings`;

      // If the user has an active personal cycle, send THEIR day's learning
      // instead of the communal portion.
      let userMishnayot = mishnayot;
      let userTitle = episode?.title || label;
      let userListenUrl = listenUrl;
      let userDescription = episode?.description || undefined;
      let userTexts = communalTexts;

      const { data: cycles } = await supabase
        .from('mishna_cycles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      const cycle = cycles?.[0] as CustomCycle | undefined;
      if (cycle) {
        const dayNum = cycleDayNumber(cycle, todayString());
        if (dayNum >= 1) {
          const refs = mishnayotForCycleDay(cycle, dayNum);
          if (refs.length) {
            userMishnayot = refs;
            userTitle = `${cycle.name} — Day ${dayNum}: ${mishnaRangeLabel(refs)}`;
            userListenUrl = `${siteUrl}/cycles`;
            userDescription = undefined;
            try { userTexts = await fetchMishnayotText(refs.slice(0, MAX_EMAIL_MISHNAYOT)); } catch { userTexts = []; }
          }
        }
      }

      const { subject, html, text } = buildDailyReminderEmail({
        recipientName: user.display_name,
        mishnayot: userMishnayot,
        episodeTitle: userTitle,
        listenUrl: userListenUrl,
        completedCount: count || 0,
        unsubscribeUrl,
        episodeDescription: userDescription,
        texts: userTexts,
      });

      await resend.emails.send({
        from: process.env.MISHNA_FROM_EMAIL || 'learn@mishna-yomi.com',
        to: user.email,
        subject,
        html,
        text,
      });

      sent++;
    } catch (err) {
      console.error('Auth user email error:', user.email, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    date: dateLabel,
    today: label,
    dayNumber,
    episodeFound: !!episode,
    subscribersSent: sent,
    failed,
  });
}

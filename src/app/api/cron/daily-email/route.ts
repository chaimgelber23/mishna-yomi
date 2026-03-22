import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { getTodaySummary } from '@/lib/calendar';
import { buildDailyReminderEmail } from '@/lib/email/templates';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

  // Get current UTC hour to send emails at the right time
  const nowHour = new Date().getUTCHours();
  // We'll send emails whose preferred time matches current UTC hour (±1 buffer)
  const hourStr = String(nowHour).padStart(2, '0') + ':00:00';

  // Get subscribers due for this hour
  const { data: subscribers, error: subError } = await supabase
    .from('mishna_email_subscribers')
    .select('*')
    .eq('subscribed', true)
    .gte('daily_reminder_time', `${String(nowHour).padStart(2, '0')}:00:00`)
    .lt('daily_reminder_time', `${String(nowHour + 1).padStart(2, '0')}:00:00`);

  if (subError) {
    console.error('Subscriber query error:', subError);
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers || []) {
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

  // Also send to authenticated users (mishna_users with subscribed_to_emails = true)
  const { data: authUsers } = await supabase
    .from('mishna_users')
    .select('*')
    .eq('subscribed_to_emails', true)
    .gte('daily_reminder_time', `${String(nowHour).padStart(2, '0')}:00:00`)
    .lt('daily_reminder_time', `${String(nowHour + 1).padStart(2, '0')}:00:00`);

  for (const user of authUsers || []) {
    try {
      // Get user's completion count
      const { count } = await supabase
        .from('mishna_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      const unsubscribeUrl = `${siteUrl}/settings`;

      const { subject, html, text } = buildDailyReminderEmail({
        recipientName: user.display_name,
        mishnayot,
        episodeTitle: episode?.title || label,
        listenUrl,
        completedCount: count || 0,
        unsubscribeUrl,
        episodeDescription: episode?.description || undefined,
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
    hourWindow: hourStr,
    subscribersSent: sent,
    failed,
  });
}

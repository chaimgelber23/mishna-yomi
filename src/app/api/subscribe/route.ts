import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { buildWelcomeEmail } from '@/lib/email/templates';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, name, reminderTime, timezone } = body;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  try {
    const supabase = await createServiceClient();

    // Upsert subscriber
    const { data: subscriber, error } = await supabase
      .from('mishna_email_subscribers')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          display_name: name || null,
          daily_reminder_time: reminderTime || '08:00:00',
          daily_reminder_tz: timezone || 'America/New_York',
          subscribed: true,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) {
      console.error('Subscriber upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send welcome email
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mishna-yomi.com'}/unsubscribe?token=${subscriber.unsubscribe_token}`;
      const { subject, html, text } = buildWelcomeEmail({
        recipientEmail: email,
        recipientName: name,
        unsubscribeUrl,
      });

      await resend.emails.send({
        from: process.env.MISHNA_FROM_EMAIL || 'learn@mishna-yomi.com',
        to: email,
        subject,
        html,
        text,
      });
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/subscribe?token=xxx — unsubscribe
export async function DELETE(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('mishna_email_subscribers')
    .update({ subscribed: false })
    .eq('unsubscribe_token', token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

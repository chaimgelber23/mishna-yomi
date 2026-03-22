import { MishnaReference, TOTAL_MISHNAYOT } from '../mishna-data';
import { getMishnaPairLabel } from '../calendar';

interface DailyReminderData {
  recipientName?: string;
  mishnayot: MishnaReference[];
  episodeTitle: string;
  listenUrl: string;
  completedCount: number;
  unsubscribeUrl: string;
  episodeDescription?: string;
}

export function buildDailyReminderEmail(data: DailyReminderData): { subject: string; html: string; text: string } {
  const { recipientName, mishnayot, episodeTitle, listenUrl, completedCount, unsubscribeUrl, episodeDescription } = data;
  const label = getMishnaPairLabel(mishnayot);
  const greeting = recipientName ? `Shalom, ${recipientName}!` : 'Shalom!';
  const percentage = TOTAL_MISHNAYOT > 0 ? ((completedCount / TOTAL_MISHNAYOT) * 100).toFixed(1) : '0.0';
  const remaining = TOTAL_MISHNAYOT - completedCount;

  const subject = `📖 Today's Mishna Yomi — ${label}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #040d1a; font-family: 'Georgia', serif; color: #e2d9c5; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #0c1a35, #163059); padding: 40px 32px 32px; text-align: center; border-bottom: 2px solid #d97706; }
    .hebrew { font-size: 36px; color: #f59e0b; font-family: 'Times New Roman', serif; direction: rtl; display: block; margin-bottom: 8px; }
    .header h1 { font-size: 22px; color: #fcd34d; letter-spacing: 0.5px; font-weight: normal; }
    .header p { color: #94a3b8; font-size: 13px; margin-top: 6px; }
    .today-card { background: linear-gradient(135deg, #112347, #163059); margin: 0; padding: 32px; border-bottom: 1px solid #1e4480; }
    .today-label { font-size: 11px; color: #f59e0b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
    .today-mishna { font-size: 28px; color: #fcd34d; font-weight: bold; margin-bottom: 6px; }
    .today-episode { font-size: 14px; color: #94a3b8; margin-bottom: 24px; }
    .description { background: rgba(245, 158, 11, 0.05); border-left: 3px solid #d97706; padding: 16px 20px; margin-bottom: 24px; font-size: 14px; line-height: 1.7; color: #cbd5e1; font-style: italic; }
    .cta-button { display: block; background: linear-gradient(135deg, #d97706, #f59e0b); color: #040d1a !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center; letter-spacing: 0.5px; }
    .progress-section { background: #070f1f; padding: 24px 32px; border-bottom: 1px solid #112347; }
    .progress-label { font-size: 11px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
    .progress-numbers { font-size: 22px; color: #e2d9c5; margin-bottom: 4px; }
    .progress-numbers span { color: #f59e0b; }
    .progress-sub { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    .progress-bar-bg { background: #112347; border-radius: 4px; height: 8px; overflow: hidden; }
    .progress-bar-fill { background: linear-gradient(90deg, #d97706, #f59e0b); height: 8px; border-radius: 4px; }
    .footer { background: #040d1a; padding: 24px 32px; text-align: center; }
    .footer p { font-size: 12px; color: #334155; line-height: 1.6; }
    .footer a { color: #475569; text-decoration: underline; }
    .quote { font-size: 14px; color: #64748b; font-style: italic; margin-top: 16px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="hebrew">משנה יומי</span>
      <h1>Your Daily Mishna Yomi</h1>
      <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="today-card">
      <p class="today-label">Today's Learning</p>
      <p class="today-mishna">${label}</p>
      <p class="today-episode">${episodeTitle}</p>

      ${episodeDescription ? `<div class="description">${episodeDescription.substring(0, 400)}${episodeDescription.length > 400 ? '...' : ''}</div>` : ''}

      <a href="${listenUrl}" class="cta-button">▶ Listen Now</a>
    </div>

    <div class="progress-section">
      <p class="progress-label">Your Progress</p>
      <p class="progress-numbers"><span>${completedCount.toLocaleString()}</span> of ${TOTAL_MISHNAYOT.toLocaleString()} Mishnayot</p>
      <p class="progress-sub">${percentage}% complete · ${remaining.toLocaleString()} remaining</p>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${percentage}%"></div>
      </div>
    </div>

    <div class="footer">
      <p class="quote">"כָּל יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא" — Sanhedrin 10:1</p>
      <br />
      <p>You're receiving this because you subscribed to daily Mishna Yomi reminders.<br />
      <a href="${unsubscribeUrl}">Unsubscribe</a> · <a href="https://mishna-yomi.com">Visit Site</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = `${greeting}

TODAY'S MISHNA YOMI
${label}
${episodeTitle}

${episodeDescription ? episodeDescription.substring(0, 200) + '...\n\n' : ''}Listen Now: ${listenUrl}

YOUR PROGRESS
${completedCount.toLocaleString()} of ${TOTAL_MISHNAYOT.toLocaleString()} Mishnayot (${percentage}%)
${remaining.toLocaleString()} Mishnayot remaining

---
Unsubscribe: ${unsubscribeUrl}
`;

  return { subject, html, text };
}

interface WelcomeEmailData {
  recipientEmail: string;
  recipientName?: string;
  unsubscribeUrl: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const { recipientEmail, recipientName, unsubscribeUrl } = data;
  const greeting = recipientName ? `Shalom, ${recipientName}!` : 'Shalom!';
  const subject = 'Welcome to Mishna Yomi Daily — Your learning begins today';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #040d1a; font-family: 'Georgia', serif; color: #e2d9c5; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #0c1a35, #163059); padding: 48px 32px; text-align: center; border-bottom: 2px solid #d97706; }
    .hebrew { font-size: 48px; color: #f59e0b; font-family: 'Times New Roman', serif; direction: rtl; display: block; margin-bottom: 12px; }
    .header h1 { font-size: 24px; color: #fcd34d; font-weight: normal; }
    .body { padding: 32px; }
    .body p { font-size: 15px; line-height: 1.8; color: #cbd5e1; margin-bottom: 16px; }
    .highlight { color: #fcd34d; font-weight: bold; }
    .stats { background: #0c1a35; border: 1px solid #1e4480; border-radius: 8px; padding: 24px; margin: 24px 0; display: flex; gap: 16px; text-align: center; }
    .stat { flex: 1; }
    .stat-number { font-size: 24px; color: #f59e0b; font-weight: bold; display: block; }
    .stat-label { font-size: 12px; color: #64748b; }
    .cta-button { display: block; background: linear-gradient(135deg, #d97706, #f59e0b); color: #040d1a !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center; margin: 24px 0; }
    .footer { background: #040d1a; padding: 24px 32px; text-align: center; border-top: 1px solid #112347; }
    .footer p { font-size: 12px; color: #334155; }
    .footer a { color: #475569; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="hebrew">משנה יומי</span>
      <h1>Welcome to Mishna Yomi Daily</h1>
    </div>
    <div class="body">
      <p>${greeting}</p>
      <p>You've joined the daily learning program of <span class="highlight">Rabbi Shloimie Friedman's Mishna Yomi</span> podcast. Starting today, you'll receive a daily email with the two Mishnayot for the day, a direct link to listen, and a running tally of your progress.</p>
      <p>Together, we are learning through all <span class="highlight">4,192 Mishnayot</span> of the entire Mishnah — two per day, following the official Mishna Yomit calendar.</p>
      <div class="stats">
        <div class="stat"><span class="stat-number">4,192</span><span class="stat-label">Mishnayot Total</span></div>
        <div class="stat"><span class="stat-number">63</span><span class="stat-label">Tractates</span></div>
        <div class="stat"><span class="stat-number">6</span><span class="stat-label">Sedarim</span></div>
      </div>
      <a href="https://mishna-yomi.com/learn" class="cta-button">Start Learning Today →</a>
      <p>Your daily reminder will arrive at your chosen time. You can change your preferences anytime on the website.</p>
      <p style="font-style: italic; color: #64748b; font-size: 14px;">"כָּל יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא"</p>
    </div>
    <div class="footer">
      <p>Signed up as: ${recipientEmail}<br />
      <a href="${unsubscribeUrl}">Unsubscribe</a> · <a href="https://mishna-yomi.com">Visit Site</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = `${greeting}

Welcome to Mishna Yomi Daily!

You've joined Rabbi Shloimie Friedman's daily Mishna Yomi program. Starting today you'll receive daily reminders with today's 2 Mishnayot and a direct listen link.

4,192 Mishnayot · 63 Tractates · 6 Sedarim

Start Learning: https://mishna-yomi.com/learn

---
Unsubscribe: ${unsubscribeUrl}
`;

  return { subject, html, text };
}

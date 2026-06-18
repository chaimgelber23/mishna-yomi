import { MishnaReference, TOTAL_MISHNAYOT } from '../mishna-data';
import { mishnaRangeLabel } from '../cycle';

/* Sefer email palette — parchment paper, warm ink, brass.
   Email-safe hex only (no CSS vars); Georgia / Times for serif. */

/** The actual text of one mishna, for the read-in-email block. */
export interface MishnaEmailText {
  label: string;
  he: string;
  en: string;
}

/** Escape text before injecting it into the email HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface DailyReminderData {
  recipientName?: string;
  mishnayot: MishnaReference[];
  episodeTitle: string;
  listenUrl: string;
  completedCount: number;
  unsubscribeUrl: string;
  episodeDescription?: string;
  /** Hebrew + English text of today's mishnayot, shown inline in the email. */
  texts?: MishnaEmailText[];
}

export function buildDailyReminderEmail(data: DailyReminderData): { subject: string; html: string; text: string } {
  const { recipientName, mishnayot, episodeTitle, listenUrl, completedCount, unsubscribeUrl, episodeDescription, texts } = data;
  const label = mishnaRangeLabel(mishnayot);
  const greeting = recipientName ? `Shalom, ${recipientName}!` : 'Shalom!';
  const percentage = TOTAL_MISHNAYOT > 0 ? ((completedCount / TOTAL_MISHNAYOT) * 100).toFixed(1) : '0.0';
  const remaining = TOTAL_MISHNAYOT - completedCount;

  const subject = `Today's Mishna Yomi — ${label}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #F4EAD6; font-family: 'Georgia', serif; color: #221A10; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #FBF6EC; }
    .header { background: #FBF6EC; padding: 40px 32px 28px; text-align: center; border-bottom: 2px solid #A07840; }
    .hebrew { font-size: 38px; color: #856230; font-family: 'Times New Roman', serif; direction: rtl; display: block; margin-bottom: 8px; font-weight: bold; }
    .header h1 { font-size: 21px; color: #221A10; letter-spacing: 0.3px; font-weight: normal; }
    .header p { color: #6F6049; font-size: 13px; margin-top: 6px; }
    .today-card { background: #FFFDF8; margin: 0; padding: 32px; border-bottom: 1px solid #E4D8C0; }
    .today-label { font-size: 11px; color: #856230; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
    .today-mishna { font-size: 28px; color: #221A10; font-weight: bold; margin-bottom: 6px; }
    .today-episode { font-size: 14px; color: #6F6049; margin-bottom: 24px; }
    .description { background: rgba(160,120,64,0.06); border-left: 3px solid #A07840; padding: 16px 20px; margin-bottom: 24px; font-size: 14px; line-height: 1.7; color: #4A3A24; font-style: italic; }
    .text-section { background: #FFFDF8; padding: 28px 32px; border-bottom: 1px solid #E4D8C0; }
    .text-section .sec-label { font-size: 11px; color: #856230; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 18px; }
    .mishna-block { margin-bottom: 22px; }
    .mishna-num { font-size: 12px; color: #856230; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 8px; }
    .mishna-he { direction: rtl; text-align: right; font-family: 'Times New Roman', serif; font-size: 19px; line-height: 1.95; color: #221A10; margin-bottom: 10px; }
    .mishna-en { font-size: 14px; line-height: 1.75; color: #4A3A24; }
    .text-divider { border: 0; border-top: 1px solid #E4D8C0; margin: 0 0 22px; }
    .cta-button { display: block; background: linear-gradient(135deg, #2E2316, #1C160D); color: #F6EAD2 !important; text-decoration: none; padding: 16px 32px; border-radius: 9999px; font-size: 16px; font-weight: bold; text-align: center; letter-spacing: 0.5px; }
    .progress-section { background: #F4EAD6; padding: 24px 32px; border-bottom: 1px solid #E4D8C0; }
    .progress-label { font-size: 11px; color: #856230; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
    .progress-numbers { font-size: 22px; color: #221A10; margin-bottom: 4px; }
    .progress-numbers span { color: #856230; font-weight: bold; }
    .progress-sub { font-size: 13px; color: #6F6049; margin-bottom: 16px; }
    .progress-bar-bg { background: #EADBBE; border-radius: 4px; height: 8px; overflow: hidden; }
    .progress-bar-fill { background: linear-gradient(90deg, #C9A96E, #A07840); height: 8px; border-radius: 4px; }
    .footer { background: #FBF6EC; padding: 24px 32px; text-align: center; border-top: 1px solid #E4D8C0; }
    .footer p { font-size: 12px; color: #6F6049; line-height: 1.6; }
    .footer a { color: #856230; text-decoration: underline; }
    .quote { font-size: 14px; color: #6F6049; font-style: italic; margin-top: 16px; line-height: 1.6; }
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

      <a href="${listenUrl}" class="cta-button">&#9654;&nbsp; Listen Now</a>
    </div>

    ${texts && texts.length ? `<div class="text-section">
      <p class="sec-label">Today's Mishnayot</p>
      ${texts.map((t, i) => `<div class="mishna-block">
        <p class="mishna-num">${escapeHtml(t.label)}</p>
        ${t.he ? `<div class="mishna-he" dir="rtl">${escapeHtml(t.he)}</div>` : ''}
        ${t.en ? `<p class="mishna-en">${escapeHtml(t.en)}</p>` : ''}
      </div>${i < texts.length - 1 ? '<hr class="text-divider" />' : ''}`).join('')}
    </div>` : ''}

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
${texts && texts.length ? `
TODAY'S MISHNAYOT
${texts.map(t => `${t.label}\n${t.he}\n\n${t.en}`).join('\n\n----\n\n')}
` : ''}
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
    body { background-color: #F4EAD6; font-family: 'Georgia', serif; color: #221A10; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #FBF6EC; }
    .header { background: #FBF6EC; padding: 48px 32px; text-align: center; border-bottom: 2px solid #A07840; }
    .hebrew { font-size: 50px; color: #856230; font-family: 'Times New Roman', serif; direction: rtl; display: block; margin-bottom: 12px; font-weight: bold; }
    .header h1 { font-size: 24px; color: #221A10; font-weight: normal; }
    .body { padding: 32px; background: #FFFDF8; }
    .body p { font-size: 15px; line-height: 1.8; color: #3A2C1B; margin-bottom: 16px; }
    .highlight { color: #856230; font-weight: bold; }
    .stats { background: #FBF6EC; border: 1px solid #E4D8C0; border-radius: 8px; padding: 24px; margin: 24px 0; display: flex; gap: 16px; text-align: center; }
    .stat { flex: 1; }
    .stat-number { font-size: 24px; color: #856230; font-weight: bold; display: block; }
    .stat-label { font-size: 12px; color: #6F6049; }
    .cta-button { display: block; background: linear-gradient(135deg, #2E2316, #1C160D); color: #F6EAD2 !important; text-decoration: none; padding: 16px 32px; border-radius: 9999px; font-size: 16px; font-weight: bold; text-align: center; margin: 24px 0; }
    .footer { background: #FBF6EC; padding: 24px 32px; text-align: center; border-top: 1px solid #E4D8C0; }
    .footer p { font-size: 12px; color: #6F6049; }
    .footer a { color: #856230; text-decoration: underline; }
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
      <a href="https://mishna-yomi.com/learn" class="cta-button">Start Learning Today &rarr;</a>
      <p>Your daily reminder will arrive at your chosen time. You can change your preferences anytime on the website.</p>
      <p style="font-style: italic; color: #6F6049; font-size: 14px;">"כָּל יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא"</p>
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

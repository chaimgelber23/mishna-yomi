# Mishna Yomi — Firebase Studio Setup Guide

Follow these steps in order. When you're done, the app works end to end: signup → daily emails at the right time → custom cycles → progress tracking.

## What was just built/fixed

- **NEW: Custom cycles** (`/cycles`) — users start their own cycle from any tractate, at any pace, or pick a siyum date and the app calculates their daily schedule. Daily emails automatically send each user *their* cycle's mishnayot.
- **NEW: Settings page** (`/settings`) — users manage reminder time, timezone, and email preferences.
- **NEW: Unsubscribe page** (`/unsubscribe`) — email unsubscribe links now work (they were 404ing).
- **FIXED: Timezone bug** — daily emails now send at each user's local time, not UTC.
- **FIXED: Security** — removed hardcoded database URL; cron routes now refuse to run without `CRON_SECRET`.
- **FIXED: Mobile navigation** — there was no menu on phones at all; now there's a hamburger menu.
- **POLISH** — emoji icons replaced with proper icons; dark-theme leftovers on Learn/Progress/Calendar pages converted to the light design (text was nearly invisible before); hero now sells the custom cycle feature.
- **Removed `runtime = 'edge'`** from all routes — required for Firebase App Hosting (it was only needed for Cloudflare).

---

## Step 1 — Get this code into Firebase Studio

If your Firebase Studio workspace is connected to the same GitHub repo:

1. On this computer, open a terminal in the project folder and run:
   ```
   git add -A
   git commit -m "Custom cycles, settings, unsubscribe, timezone fix, UI polish"
   git push
   ```
2. In Firebase Studio, open the terminal (bottom panel) and run:
   ```
   git pull
   npm install
   ```

If Firebase Studio is NOT connected to your repo yet: in Firebase Studio, choose **Import repo** and paste your GitHub repo URL, then run `npm install` in its terminal.

## Step 2 — Run the new database migration in Supabase

1. Go to https://supabase.com/dashboard → your project → **SQL Editor**.
2. Open the file `supabase/migrations/002_custom_cycles.sql` from this project.
3. Copy ALL of its contents, paste into the SQL Editor, click **Run**.
4. You should see "Success". This creates the `mishna_cycles` and `mishna_cycle_progress` tables.

## Step 3 — Set environment variables in Firebase Studio

1. In Firebase Studio's file explorer, create a file named `.env.local` in the project root.
2. Paste this and fill in each value:
   ```
   NEXT_PUBLIC_SUPABASE_URL=        ← Supabase dashboard → Project Settings → API → Project URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← same page → anon/public key
   SUPABASE_SERVICE_ROLE_KEY=       ← same page → service_role key (keep secret!)
   RESEND_API_KEY=                  ← resend.com → API Keys
   MISHNA_FROM_EMAIL=learn@yourdomain.com
   CRON_SECRET=                     ← make up a long random string (30+ characters)
   NEXT_PUBLIC_SITE_URL=            ← your live site URL once deployed, e.g. https://mishna-yomi.com
   ```
3. Restart the dev server after saving (`Ctrl+C` then `npm run dev`).

## Step 4 — Tell Supabase about your URLs (magic-link login)

1. Supabase dashboard → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your production URL.
3. Under **Redirect URLs**, add:
   - Your Firebase Studio preview URL (copy it from the preview window address bar) + `/auth/callback`
   - Your production URL + `/auth/callback`

Without this, magic-link sign-in will redirect to the wrong place.

## Step 5 — Test everything in the Firebase Studio preview

Run `npm run dev` and check each flow:

1. **Home page** loads, hero mentions "Create Your Own Cycle".
2. **Subscribe** with your real email → welcome email arrives → click unsubscribe link in the email → unsubscribe page works (no 404).
3. **Sign in** (`/auth/login`) with magic link → arrives → click → you're signed in.
4. **My Cycle** (`/cycles`) → Build my cycle → pick a tractate, pick "Finish by a date" → check the math in the summary looks right → create → dashboard shows today's mishnayot → "Mark today done" works.
5. **Settings** (`/settings`) → change reminder time/timezone → Save → refresh → values stuck.
6. **Mobile**: shrink the window → hamburger menu appears and works.

## Step 6 — Schedule the two cron jobs

The app needs two URLs called automatically. Easiest free option: https://cron-job.org (create a free account).

**Job 1 — Daily emails (run EVERY HOUR):**
- URL: `https://YOUR-SITE-URL/api/cron/daily-email`
- Schedule: every hour at minute 0
- Request method: POST
- Add header: `Authorization` = `Bearer YOUR_CRON_SECRET` (the same string from Step 3)

**Job 2 — Podcast sync (run ONCE A DAY, e.g. 3:00 AM):**
- URL: `https://YOUR-SITE-URL/api/sync-rss`
- Request method: POST
- Same `Authorization` header.

Why hourly for emails: the app checks every hour which users' local time matches their chosen reminder time, so everyone gets it at *their* morning.

## Step 7 — Deploy with Firebase App Hosting

1. In Firebase Studio, click the **Firebase** / **Publish** button (top right) and choose **App Hosting**.
2. When asked about environment variables, add every variable from Step 3. Mark `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `CRON_SECRET` as **secrets**.
3. After the first deploy, copy your live URL, then:
   - Update `NEXT_PUBLIC_SITE_URL` to that URL and redeploy.
   - Add the live URL to Supabase redirect URLs (Step 4).
   - Update the cron-job.org URLs (Step 6).

## Troubleshooting

- **Emails not arriving**: verify your sending domain in Resend (Domains → Add Domain → add the DNS records). Until verified, Resend only delivers to your own email.
- **Magic link goes to localhost**: fix Step 4 redirect URLs.
- **"CRON_SECRET not configured"**: the env var isn't set in production — add it in App Hosting settings.
- **Cycle creation fails**: re-run Step 2; the migration probably didn't run.

## What's next (when you're ready to charge)

Pricing was parked on purpose. When the product feels worth paying for, the clean path is Stripe Checkout + a `subscription_status` column on `mishna_users`, gating `/cycles` as the premium feature. Ask me and I'll build it.

# Customer OTP setup (email or SMS)

GarmentLoop sends a **random 6-digit code** after email/password (or mobile/password) sign-in. The channel depends on what the customer typed:

- An **email address** → OTP by **email** (Resend)
- A **mobile number** (`03xx…`, `+92…`, or another `+` E.164 number) → OTP by **SMS** (Twilio)

Owner / admin / staff emails still skip OTP and open `/admin`. Guest checkout and COD are unchanged.

Do **not** put API keys in the repo. Add them to `.env.local` (local) and Vercel **Environment Variables** (production).

---

## 1. Email OTP — Resend

1. Create a free account at [https://resend.com](https://resend.com).
2. Open [API Keys](https://resend.com/api-keys) → **Create API Key** → copy `re_…`.
3. For testing, you can send from Resend’s sandbox address to **the email that owns the Resend account**:
   - `EMAIL_FROM=GarmentLoop <onboarding@resend.dev>`
4. For real customers, add your domain under [Domains](https://resend.com/domains), complete DNS (SPF / DKIM), then use something like:
   - `EMAIL_FROM=GarmentLoop <hello@yourdomain.com>`
5. Put these in `.env.local` / Vercel:

```bash
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=GarmentLoop <hello@yourdomain.com>
```

The store calls `POST https://api.resend.com/emails` (no extra npm package).

---

## 2. SMS OTP — Twilio

1. Create an account at [https://www.twilio.com](https://www.twilio.com) and open the [Console](https://console.twilio.com).
2. Copy **Account SID** (`AC…`) and **Auth Token**.
3. Get a number that can send SMS:
   - [Phone numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/search) → buy a number with SMS, **or**
   - Use the trial number Twilio assigns (trial accounts can only SMS verified numbers).
4. For Pakistan (`+92`) check Twilio’s SMS coverage and sender rules for that country. Trial accounts often cannot SMS unverified Pakistani numbers until you upgrade.
5. Put these in `.env.local` / Vercel (E.164 format for the from-number):

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM_NUMBER=+1234567890
```

The store calls `POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`.

Pakistan numbers typed as `03XXXXXXXXX` are sent as `+92XXXXXXXXXX`.

---

## 3. Local development without keys

If Resend / Twilio are missing:

- **Development** (`npm run dev`): login still works. The 6-digit code is printed in the server log and shown on the sign-in screen as a preview.
- **Production**: login returns an error telling you which variables to set.

To force the on-screen preview even in production (staging only):

```bash
AUTH_SHOW_OTP=true
```

Never leave `AUTH_SHOW_OTP=true` on a public store.

---

## 4. Vercel

In the Vercel project → **Settings → Environment Variables**, add the same keys for Production (and Preview if you test deploys). Redeploy after saving.

Confirm from the Vercel function logs that Resend/Twilio returned HTTP 200 if a code never arrives.

# The day Google approves — switching to the Web Store extension

Plain words, in order. **You do not need to edit any code, and you do not need Claude.**
Total time: about 10 minutes, plus a 15-minute check at the end.

## What actually changes

Right now your site tells people: *download a zip, unzip it, turn on Developer mode,
load unpacked.* Almost no normal person will finish that.

After these steps it shows one green **Add to Chrome** button that opens your store page.
No download, no unzipping, no Developer mode. Nothing else about the product changes.

The two places that switch are onboarding step 2 (a new user's second screen) and the
"Connect SatyaShift" card on the dashboard. Both are already built and waiting — they read
one setting and change themselves.

---

## Step 1 — Copy your store link (2 minutes)

1. Go to https://chrome.google.com/webstore/devconsole and sign in with
   niraj2055adk@gmail.com.
2. Click your SatyaShift item.
3. Find the public store link. It looks like:
   `https://chromewebstore.google.com/detail/satyashift-verified-focus/abcdefghijklmnopabcdefghijklmnop`
4. Copy the whole thing.

> If you can only find the 32-letter ID (`abcdefghijklmnop…`) and not the full link, that
> is fine — the ID on its own works just as well. Paste whichever you have.

---

## Step 2 — Paste it into Vercel (3 minutes)

1. Go to https://vercel.com and sign in.
2. Open your SatyaShift project.
3. **Settings** → **Environment Variables**.
4. Add a new one:
   - **Key:** `NEXT_PUBLIC_EXTENSION_STORE_URL`
   - **Value:** the link (or ID) you copied
   - **Environments:** tick **Production**
5. **Do NOT tick "Sensitive".** This setting has to be readable by the browser. Marking it
   Sensitive hides it from the browser and the button will silently never appear — this has
   already happened once on this project with the Paddle settings, so it is a real trap and
   not a theoretical one.
6. Click **Save**.

---

## Step 3 — Redeploy (2 minutes)

Saving the setting is not enough on its own. The value gets baked in when the site is
built, so the site has to be rebuilt once.

1. In the same Vercel project, open the **Deployments** tab.
2. Find the newest deployment at the top.
3. Click the **⋯** menu on its right → **Redeploy** → confirm.
4. Wait until it says **Ready** (usually 1–2 minutes).

---

## Step 4 — Check that it worked (2 minutes)

1. Open a **private/incognito window** (so you see it as a visitor would).
2. Go to satyashift.com and sign in.
3. On the dashboard, the connect card should now show a green **Add to Chrome** button.
4. Click it. Your Chrome Web Store page should open.

**If you still see "Download the extension":**

| What you see | What it means | What to do |
| --- | --- | --- |
| Still the download steps | The redeploy has not finished, or you skipped it | Wait for **Ready**, then reload with Ctrl+Shift+R |
| Still the download steps after a finished redeploy | The link was rejected on purpose | See below |
| Button appears but the link 404s | The listing is not public yet | Wait for the store page to go live, no code change needed |

The site refuses a link that is not an `https://` address on `chromewebstore.google.com`
or `chrome.google.com`. This is deliberate: a mistyped link would send every new user to a
dead page, and nothing on the outside would tell you. When it refuses, it keeps the honest
download path instead. Re-copy the link, check for a missing `https://` or a stray space,
save, redeploy.

**To undo any of this:** delete the variable and redeploy. The site goes back to the
download path. Nothing breaks.

---

## Step 5 — Open sign-ups (1 minute) — this is the real launch switch

Until you do this, the homepage's **Create your account** button leads to a form that
politely says new accounts are not open yet.

1. Go to https://supabase.com/dashboard and open your project.
2. **Authentication** → **Sign In / Providers** → **Email**.
3. Turn **Allow new users to sign up** ON. Save.
4. Test it in a private window: satyashift.com → Create your account.

### One warning before you flip it

Confirmation emails currently go through Supabase's own mail server, which only sends a
handful per hour. If a lot of people sign up at once, most will never get their email and
will think the product is broken. You have two options, both in the Supabase dashboard:

- **Easiest:** Authentication → Sign In / Providers → Email → turn **Confirm email** OFF.
  People get in immediately. Some addresses will be fake; for a free trial that is a normal
  trade.
- **Better long term:** Authentication → Emails → **SMTP Settings** → connect a real mail
  service (Resend is free to start, about 20 minutes to set up).

You can launch with the first and move to the second later.

---

## Step 6 — Prove it like a stranger (15 minutes)

Do not skip this. It is the only step that tests what a real user gets.

1. In Chrome, go to `chrome://extensions` and **Remove** your unpacked dev extension.
2. Install SatyaShift from your own store page, exactly like a stranger would.
3. Create a brand-new account (a different email from your usual one).
4. Run one short focus session — even 10 minutes — then stop it.
5. Check all four:
   - the session says **verified**
   - domains appear
   - the reflection text reads true
   - the dashboard no longer nags you to connect the extension

If all four are true, you are launched. Share the store link.

---

## Optional tidying, once the store version works

- The old zip at `web/public/satyashift-extension.zip` is no longer linked from anywhere,
  so you can leave it. Deleting it needs a redeploy and gains nothing.
- If you ever change the extension, you upload a new version to the Web Store dashboard.
  Users update themselves. The website needs no change at all.

---

Related: `docs/launch-steps-simple.md` (everything before approval),
`docs/payment-readiness-2026-07-14.md` (money, a separate decision).

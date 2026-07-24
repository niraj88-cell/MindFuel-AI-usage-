# The day Google approves your extension — what to do

**You will NOT touch any code. You do NOT need Claude. You do NOT need to be a programmer.**
The whole thing is copy, paste, and clicking buttons.

---

## Don't be scared by the length — here is the ENTIRE thing

This page is long only because I explain every single click. But the real work is tiny.
Here is literally all of it:

> 1. **Copy** your extension's link from the Chrome store dashboard.
> 2. **Paste** it into one box on Vercel (a setting called `NEXT_PUBLIC_EXTENSION_STORE_URL`).
> 3. **Click Redeploy** on Vercel and wait for "Ready."
>
> That's the switch done. Your site now shows an "Add to Chrome" button instead of the
> download steps. Everything below is just me holding your hand through those 3 things,
> plus opening sign-ups (one Supabase switch) and a final test.

**Time:** about **5 minutes** for the switch itself, then a **15-minute** test at the end to
make sure a real stranger can use it. You cannot break anything — every step has a fix and an
undo right underneath it.

Now take it slow, one step at a time, from the top.

---

## First, the idea — read this so the steps make sense

Think of your website as having a light switch for the extension, with two positions:

- **Position 1 (where it is now):** the website tells people
  *"download this file, unzip it, turn on a special mode, and load it by hand."*
  That is a lot of work. Most people give up. This is fine for testing, bad for real users.

- **Position 2 (where you're going):** the website shows one green button that says
  **Add to Chrome**. People click it, Chrome installs the extension, done. Like installing
  any normal app.

You are going to flip that switch from Position 1 to Position 2.

Here's the good part: **the switch is already built into your website.** You are not
building anything. You are just telling the website *"here is the address of my extension
on the Chrome store"* — and the moment it knows that address, it flips itself to Position 2.

You tell it the address by typing it into one box on a website called **Vercel** (that's
the company that runs your website for you). That's the whole job.

---

## Before you start — do you have these?

You need to be able to log in to two places. Have the passwords ready:

1. **The Chrome Web Store dashboard** — where you uploaded your extension.
   (Login: your Google account, niraj2055adk@gmail.com)
2. **Vercel** — where your website lives. (You log in with the same Google account.)

That's it. Let's go.

---

## STEP 1 — Get your extension's address (about 2 minutes)

Every extension on the Chrome store has its own web address, like every website does.
You need to copy yours.

1. Open a new browser tab.
2. Go to this address (type it in the bar at the top):
   **`chrome.google.com/webstore/devconsole`**
3. If it asks you to log in, use your Google account (niraj2055adk@gmail.com).
4. You'll see a list of your items. Click on **SatyaShift**.
5. Look for a link or a button that opens your **public store page** — the page a normal
   person would see. It might say "View in store" or show the address directly.
6. That address looks like this (yours will have different letters at the end):

   ```
   https://chromewebstore.google.com/detail/satyashift-verified-focus/abcdefghijklmnop...
   ```

7. **Select the whole address and copy it** (highlight it, then press Ctrl+C).

> **Can't find the full address, only a code?** Sometimes the dashboard only shows a long
> code made of 32 letters, like `abcdefghijklmnopabcdefghijklmnop`, and not the full link.
> That is totally fine. Copy just that code. It works exactly the same. The website is
> smart enough to build the full address from the code on its own.

Now you have the address on your clipboard. Don't copy anything else until Step 2 is done,
or you'll lose it.

---

## STEP 2 — Give that address to your website (about 3 minutes)

This is the main step. You're going to paste the address into one box on Vercel.

1. Open a new tab and go to **`vercel.com`**.
2. Log in (same Google account).
3. You'll see your projects. Click the one called **`web`** (that's your SatyaShift site —
   its exact name is `web`).
4. Near the top you'll see a row of tabs: Overview, Deployments, Analytics, **Settings**…
   Click **Settings**.
5. On the left side there's a menu. Click **Environment Variables**.
   (An "environment variable" is just a fancy name for a setting with a name and a value.
   Don't let the words scare you — it's a labelled box you type into.)
6. You'll see a place to add a new one, with two boxes: a **Key** (the name) and a
   **Value** (what it's set to). Fill them in like this:

   - In the **Key** box, type exactly:
     ```
     NEXT_PUBLIC_EXTENSION_STORE_URL
     ```
     (Copy that from here to be safe. One wrong letter and it won't work. No spaces.)

   - In the **Value** box, **paste the address you copied in Step 1** (press Ctrl+V).

7. There will be checkboxes for **Production**, **Preview**, **Development**.
   Make sure **Production** is ticked. (Production means your real, live website.)

8. **⚠️ IMPORTANT — do NOT tick the box called "Sensitive."**
   If you see a "Sensitive" option, leave it OFF. Ticking it hides this setting from
   people's browsers, and then the button will silently never show up and you'll have no
   idea why. This exact mistake already happened once on your project with the payment
   settings — so this is a real warning, not a "just in case."

9. Click **Save**.

Done with the typing. But the website hasn't picked up the change yet — that's Step 3.

---

## STEP 3 — Tell the website to rebuild itself (about 2 minutes)

Your website only reads that new setting when it gets built. So you have to rebuild it
once. This is one click; the computer does the work.

1. Still in Vercel, at the top, click the **Deployments** tab.
   (A "deployment" is one published version of your website.)
2. The newest one is at the very top of the list.
3. On the right end of that top row, there are three dots: **⋯** — click them.
4. A little menu opens. Click **Redeploy**.
5. A box pops up asking if you're sure. Click **Redeploy** again to confirm.
6. Now wait. It takes 1 to 2 minutes. You'll see it working, and then it will say
   **Ready**. When it says Ready, your change is live.

Grab a glass of water. When it says Ready, go to Step 4.

---

## STEP 4 — Check it actually worked (about 2 minutes)

Never trust it worked — look with your own eyes, the way a stranger would.

1. Open a **private window** (also called incognito). This makes the site think you're a
   brand-new visitor, so you see exactly what real people see.
   - In Chrome: press **Ctrl+Shift+N**.
2. Go to **satyashift.com** and sign in.
3. Go to your dashboard. Find the card that talks about connecting SatyaShift.
4. It should now show a green button that says **Add to Chrome**.
5. Click it. It should open your Chrome store page.

**🎉 If the green "Add to Chrome" button is there and it opens your store page — you did it.**
The switch is flipped. Skip to Step 5.

### If it still shows the old "Download the extension" steps

Don't panic. Find your situation in this table:

| What's happening | Why | What to do |
| --- | --- | --- |
| You just did Step 3 a moment ago | The rebuild isn't finished, or your browser cached the old page | Wait until Vercel says **Ready**, then reload hard with **Ctrl+Shift+R** |
| Rebuild says Ready, still the old steps | The address you pasted got rejected on purpose | Go back to Step 2. Re-copy the address. Check there's no missing `https://` and no extra spaces before or after it. Save, then redeploy (Step 3) again |
| Green button shows, but clicking it gives a "not found" page | Your store page isn't switched to public/live yet on Google's side | Nothing wrong on your end. Wait for the store page to go live. No code change needed |

**Why does it reject a bad address instead of just using it?** On purpose, to protect you.
If you had a typo in the address, the button would send every single new user to a broken,
dead page — and nothing would warn you. So the website only accepts a real Chrome store
address. If it's not one, it quietly keeps the old download instructions, which at least
work. A working old path beats a broken new one.

**Want to undo the whole thing?** Go back to the Environment Variables (Step 2), delete the
`NEXT_PUBLIC_EXTENSION_STORE_URL` setting, and redeploy (Step 3). The site goes right back
to how it was. Nothing is damaged.

---

## STEP 5 — Open the doors (about 1 minute) — THIS is the real launch

Here's the thing most people forget. Even with the extension button working, **people still
can't make an account yet.** You turned account sign-ups OFF on purpose, and they're still
off. Right now, if someone clicks "Create your account," they get a polite message saying
new accounts aren't open yet. That's by design, so nothing looks broken while you wait.

When you're ready for real users, turn sign-ups on:

1. Go to **`supabase.com/dashboard`** and open your project.
   (Supabase is the service that stores your accounts and data.)
2. Click **Authentication** on the left.
3. Click **Sign In / Providers**, then **Email**.
4. Find **Allow new users to sign up** and turn it **ON**. Save.
5. Test it: open a private window, go to satyashift.com, click **Create your account**,
   and make a test account with an email you don't normally use.

### One thing to know before you flip that on

Your account-confirmation emails currently go out through Supabase's basic free mailer,
which only sends a small number per hour. If a bunch of people sign up at once, most of them
won't get their email, and they'll think it's broken. You have two choices, both in the
Supabase dashboard:

- **Fastest right now:** Authentication → Sign In / Providers → Email → turn
  **Confirm email OFF**. Then people get in instantly, no email needed. (Some fake emails
  will sneak in, but for a free trial that's normal and fine.)
- **Better for the long run:** Authentication → Emails → **SMTP Settings** → connect a real
  email service. **Resend** is free to start and takes about 20 minutes. You can switch to
  this later.

Either is fine. You can launch with the fast one and upgrade later.

---

## STEP 6 — Test it like a total stranger (about 15 minutes) — don't skip this

This is the only test that proves a real person can actually use your product start to
finish. Do it before you tell anyone about SatyaShift.

1. In Chrome, go to **`chrome://extensions`** (type it in the address bar).
2. Find your old hand-loaded test extension and click **Remove**. Get rid of it completely,
   so you're not accidentally testing the old one.
3. Now go to your Chrome store page and install SatyaShift the normal way — the way a
   stranger would.
4. Make a brand-new account with an email you've never used here before.
5. Do one short focus session — even 10 minutes — then stop it.
6. Check all four of these:
   - The session says **verified** ✔
   - The websites (domains) you were on show up
   - The reflection text about your session reads true
   - The dashboard is no longer nagging you to connect the extension

If all four are true — **you are fully launched.** Share your store link with the world.

---

## Later, whenever — small tidy-ups (optional, ignore for now)

- There's an old leftover file at `web/public/satyashift-extension.zip` (the download
  version). Nothing links to it anymore, so it just sits there harmlessly. You can leave it
  forever. Deleting it needs a redeploy and gains nothing.
- If you ever change the extension in the future, you upload the new version to the Chrome
  store dashboard. Users update themselves automatically. **Your website needs no change at
  all** — you never repeat this whole process.

---

## The whole thing in six lines (stick this on a sticky note)

1. Copy your extension's store address from the Chrome dashboard.
2. Paste it into Vercel → Settings → Environment Variables, as
   `NEXT_PUBLIC_EXTENSION_STORE_URL`, Production ticked, **NOT Sensitive**. Save.
3. Vercel → Deployments → top row → ⋯ → Redeploy. Wait for **Ready**.
4. Check in a private window: green **Add to Chrome** button on your dashboard.
5. Supabase → turn **Allow new users to sign up** ON (and handle the email thing).
6. Install from your own store page and run one test session. All good = launched.

---

Related guides: `docs/launch-steps-simple.md` (everything to do BEFORE approval),
`docs/payment-readiness-2026-07-14.md` (charging money — a completely separate decision,
not needed to launch).

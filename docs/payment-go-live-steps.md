# Payments: What To Do Next (plain steps)

A simple checklist to switch on payments safely and test them before real customers arrive.
Do the steps in order. You can stop after any step and ask me to take over or double-check.

Two words you will see a lot:
- **Paddle**: the company that collects the card payments for you.
- **Vercel**: the service that runs your website.

Everything in the code is ready. These steps are the settings and the one real test that only
you can finish.

---

## Step 1: Check if checkout is already switched on

1. Open your browser and go to **satyashift.com**.
2. Sign in with your account.
3. In the address bar, type **satyashift.com/profile** and press Enter.
4. Scroll to the plan / billing area and look at what it shows:
   - If you see buttons like **"Choose Monthly — $8/month"**, checkout is ON. Skip to Step 3.
   - If you see grey boxes saying **"Billing isn't switched on yet"**, checkout is OFF. Do Step 2.

That is the whole check. The buttons appearing is the proof that your Paddle settings are live.

---

## Step 2: Switch on checkout (only if Step 1 showed it was off)

If it was off, one or more settings are empty. Here is how to look:

1. Go to **vercel.com** and sign in.
2. Click the project named **web**.
3. Click **Settings** at the top.
4. Click **Environment Variables** on the left.
5. Find these four names and check their values:
   - **NEXT_PUBLIC_PADDLE_ENV** should be exactly: `production`
   - **NEXT_PUBLIC_PADDLE_CLIENT_TOKEN** should start with: `live_`
   - **NEXT_PUBLIC_PADDLE_PRICE_MONTHLY** should start with: `pri_`
   - **NEXT_PUBLIC_PADDLE_PRICE_YEARLY** should start with: `pri_`
6. If any one is empty or looks wrong, fix it. The correct values live in your Paddle dashboard.
7. Tell me when you have saved. I will republish the site so the change takes effect, then we
   re-do Step 1 together.

If you are not sure what a value should be, stop here and tell me. We will sort it out together.

---

## Step 3: Confirm Paddle is ready (four quick checks)

Log into **paddle.com** and confirm all four. Checkout will not open until these are done. It is
normal for a first launch if some are not finished yet, and I will help you complete them.

1. **Your business is verified.** Paddle checks who you are before letting you take money. Look
   for an approved status, or a "verify your business" banner that still needs finishing.
2. **Your website is approved.** Find the checkout or domains section. **satyashift.com** should
   say **approved**.
3. **You are using live keys, not test keys.** This matches the `production` value from Step 2.
4. **Your webhook is set up.** In Paddle's Developer Tools, under Notifications, there should be a
   destination pointing to this exact address:
   `https://satyashift.com/api/billing/webhook`
   A "webhook" is simply Paddle telling your app when someone pays.

Tell me what you find for each one.

---

## Step 4: Run one safe test purchase (costs $0, nothing to refund)

We do this part together. The idea: a real checkout with a real card, but a 100%-off code so the
total is $0. That proves the whole thing works with nothing to refund afterward.

One catch: the test uses a "Paddle connector" tool that is not connected to me right now. Two ways
to handle it:

- **Option A, I drive it:** Tell me you want to connect the Paddle tool. I will walk you through
  connecting it, then I create the discount and check everything.
- **Option B, you drive Paddle and I check the results:**
  1. In Paddle, create a **discount** for **100% off**.
  2. Go to **satyashift.com/profile** and click a plan.
  3. In the Paddle popup, enter the discount code and use your real card. The total should be
     **$0**.
  4. Tell me it is done. I will check your database and confirm the payment was recorded and your
     account switched to "active".

Either way, **I will never enter your card details.** You always do the actual purchase yourself.

---

## Step 5: Clean up (leave nothing live)

After the test works:
1. Cancel the test subscription.
2. Archive (switch off) the 100%-off discount so no one else can use it.

I will confirm your database is clean afterward.

---

## The one rule

Do not advertise paid plans until we have finished one real $0 test all the way through. The code
is ready. This test is the final proof.

## Later, when you are ready (not urgent)

Submitting the Chrome extension needs a short, separate list (plain wording for two permissions
and a privacy note). It is at the bottom of `docs/payment-readiness-2026-07-14.md`. Ask me and I
will turn it into a simple checklist like this one.

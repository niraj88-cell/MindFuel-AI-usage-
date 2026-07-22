# Payments — the simple guide (2026-07-22)

Plain words. Only the things YOU have to do. Everything on the code side is
already done and deployed.

---

## First, how payments work here (30 seconds)

Three things have to happen for someone to become a paying customer:

1. They click "Choose Monthly" -> **Paddle's payment box opens**
2. They enter their card -> **Paddle takes the money**
3. **Paddle tells your website "this person paid"** -> your site unlocks premium

Step 3 is the one people forget. Paddle sends your website a little message
behind the scenes. That message is called a **webhook**. If that message never
arrives, or is wrong, the customer pays and gets nothing. That is the worst
possible outcome, so it is worth getting right.

---

## Where you are right now

| Thing | Status |
|---|---|
| Paddle account verified | DONE |
| satyashift.com approved by Paddle | DONE (today) |
| Website code + security fix | DONE (deployed today) |
| Step 1 and 2 above (taking money) | Should work now |
| Step 3 above (telling your site) | **NEEDS 5 MINUTES OF YOUR TIME** |

---

## YOUR JOB — Part A: fix the message settings (5 minutes)

Go to https://vendors.paddle.com -> left sidebar -> **Notifications**.

You will see one row with a webhook. Click the **...** button on the right,
then **Edit**.

### A1. Fix the address

The address currently says:

    https://satyashift.vercel.app/api/billing/webhook

Change it to your real address:

    https://satyashift.com/api/billing/webhook

IMPORTANT: **Edit** this address. Do NOT delete the webhook and make a new one.
Deleting it creates a new secret password, and your website would stop trusting
Paddle's messages. Editing is safe. Deleting breaks things.

### A2. Turn on all 7 kinds of message

Your website knows how to handle 7 kinds of news. Right now Paddle is only set
to send 3. Find the list of events and tick ALL of these:

    subscription.created      (someone just subscribed)
    subscription.activated    (their subscription went live)
    subscription.updated      (they changed plan)
    subscription.past_due     (their card failed)
    subscription.paused       (they paused)
    subscription.resumed      (they came back)
    subscription.canceled     (they quit)

Why this matters in plain words: if "canceled" is not ticked, someone can quit
and your website never finds out, so they keep premium forever, free. If
"past_due" is not ticked, someone whose card stops working keeps premium too.

Save.

---

## YOUR JOB — Part B: test it for free (5 minutes)

You do NOT need to spend money to check this works. Paddle can send a pretend
message.

1. Still in **Notifications**, look for a **Simulate** option (it may be under
   the **...** menu, or under Developer Tools > Notifications).
2. Send a simulated **subscription.created** event.
3. Now open this address in your browser (you must be signed in as yourself):

       https://satyashift.com/api/billing/health

4. Look at the numbers:
   - `events.total` should have gone UP by 1
   - `events.unprocessed` should be 0
   - `warnings` should be empty or harmless

If total went up and unprocessed is 0, then Paddle can reach your website, your
secret password matches, and your site understood the message. **That is proof
the whole payment pipeline works, and it cost you nothing.**

Copy whatever that page says and send it to Claude if you want it checked.

---

## YOUR JOB — Part C: the real test (optional, do it when ready)

The only way to be 100% certain is to actually buy your own product once.

1. Go to satyashift.com/profile
2. Click "Choose Monthly — $8/month"
3. Pay with your own card
4. Check that your account flips to premium
5. Refund yourself from the Paddle dashboard (one click)

Cost to you: nothing after the refund, minus possibly a small fee.

This is NOT required before launching the extension. Nothing on your site is
locked right now, so nobody is being asked to pay yet.

---

## What you should NOT do

- Do NOT delete and recreate the webhook (it rotates the secret)
- Do NOT remove satyashift.vercel.app from the approved domains list
- Do NOT advertise a price anywhere until Part B passes
- Do NOT let payments delay your Chrome Web Store submission — they are
  completely separate. The extension never touches payments.

---

## Summary

1. Fix the webhook address and tick 7 events  (Part A, 5 min)
2. Simulate an event and check /api/billing/health  (Part B, 5 min)
3. Optionally buy-and-refund once  (Part C, whenever)

That is your entire remaining payment work.

# SatyaShift launch — the simple step-by-step (2026-07-15)

Written in plain words. Do the parts in order. Everything technical is already done
and verified (zero defects, see project-status.md 2026-07-15). What remains needs
YOU, because it involves your Google account, your money ($5), and your dashboards.

The upload file is ready: **`C:\MindFuel\satyashift-store-2.9.3.zip`** (repo root).
Do not rebuild it, do not unzip it. You will upload it exactly as it is.

---

## Part A — Take 3 screenshots (15 minutes, do this first)

Google requires at least 1 screenshot, 1280×800 pixels. Three is better.

1. Open Chrome. Load your unpacked extension if it is not loaded
   (chrome://extensions → Developer mode ON → Load unpacked → pick `C:\MindFuel\extension`).
2. Sign in at satyashift.com, start a focus session, and screenshot:
   - **Shot 1:** the extension popup while a session is running (the calm timer).
   - **Shot 2:** a finished session's reflection page on satyashift.com.
   - **Shot 3:** the /week page ("a week of attention").
3. Any screenshot tool works (Win+Shift+S). Resize or crop each to exactly
   1280×800 before uploading (Paint → Resize works). Save them somewhere easy,
   like the Desktop.

## Part B — Submit to the Chrome Web Store (about 20 minutes)

1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with your MAIN Google account (niraj2055adk@gmail.com), not a throwaway.
3. Pay the one-time $5 developer registration fee.
4. Click **"New item"** and upload `C:\MindFuel\satyashift-store-2.9.3.zip`.
5. **Store listing tab** — open `extension/STORE_LISTING.md` in your editor and
   copy-paste from **section 1**: the name, the summary line, the long description,
   category "Workflow & Planning", language English, and privacy policy URL
   `https://satyashift.com/privacy`. Upload your 3 screenshots.
6. **Privacy tab** — copy-paste from **section 2**: one justification per permission
   (tabs, cookies, storage, alarms, idle, notifications, host permission) and the
   single-purpose statement. Then the data disclosure from **section 3**: tick
   **Web history = YES** and **Authentication information = YES**, everything else NO,
   and tick the three certifications (not sold, not unrelated use, not for lending).
   Be honest here; this honesty is why you will pass review.
7. **Distribution:** Public, all regions, Free.
8. Click **Submit for review**. Review usually takes a few days, sometimes up to
   3 weeks. If a reviewer emails you, answer fast and plainly.
9. Do not worry when the install dialog says "Read your browsing history": that is
   just Chrome's fixed wording for the `tabs` permission. Your justification covers it.

## Part C — While you wait for review (10 minutes, do today)

1. **Supabase redirect allowlist** (needed so login works on satyashift.com):
   Supabase dashboard → your project → Authentication → URL Configuration →
   add `https://satyashift.com/**` to the Redirect URLs. Save.
2. **Rotate the push keys** (an old key was once pasted in a chat; nobody uses push
   yet, so this is free). In a terminal, in the `web` folder, run the five commands
   in `extension/STORE_LISTING.md` **section 7**, one at a time. Or open a Claude
   session and say "rotate the VAPID keys per STORE_LISTING section 7" and it will
   walk you through it.

## Part D — The day Google approves (10 minutes)

**This no longer needs code or a Claude session** (changed 2026-07-24). Copy your store
link, paste it into one Vercel setting, redeploy, and both install screens switch
themselves from "download the zip" to a real **Add to Chrome** button.

Exact clicks, screen by screen, with what to do when something looks wrong:
**`docs/after-approval-steps-simple.md`**. That doc also covers Part E below and the
Supabase switch that actually opens sign-ups.

## Part E — Prove it like a stranger would (15 minutes)

1. In Chrome, REMOVE your unpacked dev extension (chrome://extensions → Remove).
2. Install SatyaShift from your own store page, like any normal user.
3. Sign in, run one short focus session (even 10 minutes), stop it.
4. Check: the session shows **verified**, domains appear, the reflection reads true.
5. If all four are true, you are launched. Share the store link.

## Part F — Money (a separate decision, NOT needed to launch)

Launch free. The billing code is production-ready and dormant. Before ever
advertising a price, read `docs/payment-readiness-2026-07-14.md`: it lists the two
Paddle-dashboard items only you can confirm, and one real checkout must be proven
first. There is no rush; nothing in the launch depends on this.

---

That is everything. The order matters only within each part. Parts A+B today,
C today too, D and E when the approval email arrives.

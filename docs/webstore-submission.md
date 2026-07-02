# Chrome Web Store submission kit — SatyaShift v2.6.2

Everything is prepared; only the Web Store dashboard steps need a human (Google sign-in +
a one-time $5 fee). Follow top to bottom. Total time: ~20 minutes, then Google review
(usually 1–3 days).

The upload file is **`dist/satyashift-extension-2.6.2.zip`** (already built; its manifest
has the localhost dev entries stripped — the repo `extension/` folder keeps them for
local development).

To rebuild the package after any extension change:

```bash
cd /c/MindFuel
mkdir -p dist/webstore-staging && cp extension/{background.js,core.js,bridge.js,popup.html,popup.js,welcome.html,icon16.png,icon32.png,icon48.png,icon128.png,manifest.json} dist/webstore-staging/
node -e "const fs=require('fs');const p='dist/webstore-staging/manifest.json';const m=JSON.parse(fs.readFileSync(p,'utf8'));m.host_permissions=m.host_permissions.filter(h=>!h.includes('localhost'));m.content_scripts[0].matches=m.content_scripts[0].matches.filter(h=>!h.includes('localhost'));fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n')"
powershell -Command "Compress-Archive -Path C:\MindFuel\dist\webstore-staging\* -DestinationPath C:\MindFuel\dist\satyashift-extension-<VERSION>.zip -Force"
```

## Step 1 — developer account (once, ever)

1. Go to https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account you want to own the extension (niraj2055adk@gmail.com).
3. Pay the one-time $5 registration fee and accept the developer agreement.

## Step 2 — upload

1. Click **New item** → upload `dist/satyashift-extension-2.6.2.zip`.
2. The dashboard opens the draft listing. Fill the tabs below.

## Step 3 — Store listing tab (copy-paste)

- **Title:** `SatyaShift — Ambient Focus`
- **Summary (short description):**
  `Verified deep work, zero logging. Sees only bare domains — never pages, content, or what you type.`
- **Description:**

```
SatyaShift turns real focus into proof you can trust — quietly, in the background.

Start a deep session from the popup (or just work; tracking is ambient). The extension
verifies your focus by watching one thing only: the bare domain of your active tab.
"github.com". Never the page, never the address, never what you type.

WHAT IT DOES
• Verifies your deep-work sessions so they can't be faked — for you, and for the small
  circle of friends who keep you honest.
• Sends one gentle nudge if you drift onto a distracting site for a sustained stretch.
  One notification, then it stays quiet. No shame, no streaks, no scoreboard.
• Pause tracking any time, in one click, from the popup.

WHAT IT NEVER DOES
• No page URLs, titles, or content. Domain only.
• No keystrokes, no screenshots, no history.
• No ads, no analytics, no third parties. It talks only to our own server.
• Nothing to log, ever. If a focus tool asks for your time, it's already losing it.

Your circle sees only your verified time and the words you choose to share. Your sites
stay yours. Export or delete everything anytime from Settings.

सत्य · truth. The honest record of your focus.

Privacy policy: https://satyashift.vercel.app/privacy
```

- **Category:** Productivity → Workflow & Planning
- **Language:** English
- **Store icon:** upload `extension/icon128.png`
- **Screenshots (at least 1, 1280×800 PNG):** take these on your machine (the agent
  harness cannot screenshot the extension):
  1. The popup in idle state over a work site (status card + "Start deep session").
  2. The popup in-session ("In deep work" + End session).
  3. The web dashboard "Today" after a verified session.
  Resize/crop to 1280×800 (Win+Shift+S, then paste into any editor and export).

## Step 4 — Privacy practices tab

- **Single purpose description:**
  `SatyaShift verifies the user's deep-work focus sessions using only the bare domain of the active tab, and delivers an optional gentle nudge after sustained time on distracting sites.`

- **Permission justifications:**
  - `storage` — All extension state (queued domain durations, session, auth token) lives in chrome.storage because the MV3 service worker is short-lived.
  - `tabs` — To read the hostname (domain only) of the active tab; this is the entire tracking model.
  - `alarms` — A 1-minute alarm drives the attention timer, sync flushes, and the nudge policy while the service worker sleeps.
  - `idle` — To stop counting time when the user is away or the screen is locked, so focus time is honest.
  - `notifications` — One gentle nudge notification after sustained time on a distracting site; also used for session-end confirmation.
  - `cookies` — Reads the user's own auth session cookie for satyashift.vercel.app so the extension signs in with the account already logged in; no other cookies are accessed.
  - **Host permission `https://satyashift.vercel.app/*`** — Sending the user's own domain-duration batches to their account on our server, and a small bridge script on our own site for sign-in handoff. No other sites are accessed.
  - `remote code` — select **No, I am not using remote code** (all code ships in the package).

- **Data usage disclosures** (tick exactly these):
  - ✅ Personally identifiable information (email address of the account)
  - ✅ Authentication information (the user's own session token for our service)
  - ✅ Web history (bare domains of visited sites with durations — the product's core, disclosed prominently)
  - Everything else: not collected.
  - Certify all three statements (no sale, no unrelated use, no creditworthiness use). All true.

- **Privacy policy URL:** `https://satyashift.vercel.app/privacy` (live, public).

## Step 5 — Distribution tab

- **Visibility: Unlisted** for the founding preview (anyone with the link can install;
  it doesn't appear in search). Switch to Public later with one click, no re-review of
  visibility. Regions: all.

## Step 6 — submit, then wire the URL

1. Click **Submit for review**. Review typically takes 1–3 days; you'll get an email.
2. When approved, copy the listing URL (looks like
   `https://chromewebstore.google.com/detail/<32-char-id>`).
3. Paste it into `web/lib/extension.ts` as `EXTENSION_STORE_URL` and deploy
   (`cd web && npx vercel --prod --yes`). That single edit flips BOTH install surfaces
   (onboarding step 2 and the Today connect card) to a one-click "Add to Chrome".
4. Optional afterwards: your own load-unpacked copy can be removed; install from the
   store like everyone else so you see what users see.

## If review pushes back

The likely question is the `cookies` permission or the web-history disclosure. The honest
answers (already in the justifications): cookies read only the user's own session for our
one domain; domains-with-durations are the entire advertised purpose of the product and
are disclosed in the listing's first paragraph and the privacy policy.

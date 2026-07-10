// core.js — SatyaShift extension pure helpers (NO chrome.* APIs).
// Imported by background.js (the MV3 module service worker) AND by core.test.js,
// so the domain / category / token / cookie logic can be unit-tested with `node --test`.
// Keeping these side-effect-free is what makes the tracker's integrity provable.

export const PROJECT_REF = 'sztvvvphpawuxvvmuddm';
export const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
// Public (publishable) key — the same one shipped in the web client bundle. Safe to embed.
// Used only as the `apikey` header when refreshing an expired session (see background.js H3).
export const SUPABASE_ANON_KEY = 'sb_publishable_u1P2Rr653umqvbVzF8mh-Q_RVhHcxas';

export const MIN_DWELL_S = 15;              // ignore tab flicks shorter than this
export const MAX_DWELL_S = 4 * 60 * 60;     // cap one event well under the server's 86400 hard limit (H1)
export const MAX_QUEUE = 2000;              // bound local storage if the user is logged out
export const MAX_BATCH = 500;               // /api/ingest accepts up to 500 events per batch

// Bare, lowercased, www-stripped hostname. Returns null for anything that isn't a real
// web page (chrome://, about:, file:, view-source:, extension pages) so we never time them.
export function hostnameOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// Exact-or-subdomain match on the registrable host. This is the fix for the substring bugs:
// 'netflix.com'.includes('x.com') was true (mislabeled distraction) and
// 'riverbank.com'.includes('bank') was true (silently dropped). Suffix matching kills both.
export function matchesDomain(host, base) {
  if (!host || !base) return false;
  return host === base || host.endsWith('.' + base);
}

// Domains we never track, for privacy. Precise suffixes only — no broad keywords that
// would over-drop unrelated sites. Domain-only storage means even an unlisted sensitive
// site never reveals more than its bare hostname.
const SENSITIVE_DOMAINS = [
  'chase.com', 'wellsfargo.com', 'bankofamerica.com', 'citi.com', 'capitalone.com',
  'paypal.com', 'venmo.com', 'wise.com',
  'mail.google.com', 'outlook.live.com', 'outlook.office.com', 'proton.me',
  '1password.com', 'lastpass.com', 'bitwarden.com', 'dashlane.com',
  'mychart.com',
];
export function isSensitive(host) {
  return !!host && SENSITIVE_DOMAINS.some((d) => matchesDomain(host, d));
}

const OWN_DOMAINS = ['satyashift.com', 'satyashift.vercel.app', 'localhost'];
export function isOwnApp(host) {
  return !!host && OWN_DOMAINS.some((d) => matchesDomain(host, d));
}

// Lightweight local heuristic (the "local Ext heuristics first" rule). The server clamps
// anything unexpected to 'neutral', but labeling here drives distraction_pct in /api/focus/stop.
const DISTRACTION_DOMAINS = [
  'tiktok.com', 'instagram.com', 'youtube.com', 'reddit.com',
  'twitter.com', 'x.com', 'facebook.com', 'netflix.com', 'twitch.tv', 'pinterest.com',
];
const PRODUCTIVE_DOMAINS = [
  'github.com', 'gitlab.com', 'stackoverflow.com', 'developer.mozilla.org',
  'notion.so', 'linear.app', 'figma.com', 'overleaf.com',
];
// domain_logs.category only allows 'distraction' | 'productive' | 'neutral'.
// workDomains: domains the USER explicitly reclassified as work (see the domain-correction
// block below). Their word beats our heuristic — a social manager's twitter.com IS work.
export function categoryFor(host, workDomains = []) {
  if (!host) return 'neutral';
  if (workDomains.some((d) => matchesDomain(host, d))) return 'productive';
  if (DISTRACTION_DOMAINS.some((d) => matchesDomain(host, d))) return 'distraction';
  if (PRODUCTIVE_DOMAINS.some((d) => matchesDomain(host, d))) return 'productive';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Domain correction ("this is work for me"). The hardcoded distraction list is a heuristic,
// and a wrong nudge is a false accusation from a product whose brand is truth. The fix is
// EXPLICIT and consensual, never silent: when someone answers "Stay, on purpose" to a
// single-domain nudge twice, the popup asks ONCE whether that domain is work for them.
//   - "It's work" => the domain is treated as productive from then on (nudges stop for it,
//     and its time counts as work in session verdicts). Their word, their record.
//   - "Keep checking in" => never asked again for that domain; nudges continue unchanged.
// Only ever backs off — this can never make nudging more aggressive, and the fire
// threshold/cooldown machinery is untouched. All of it lives in chrome.storage.local and
// is never transmitted; the only server-visible effect is the category label on future
// domain_logs, which the extension has always chosen locally.
// ---------------------------------------------------------------------------
export const WORK_OFFER_STAYS = 2;   // deliberate stays on one domain before we ask
const MAX_PREF_DOMAINS = 40;         // bound each prefs map/list

export function emptyDomainPrefs() {
  return { stays: {}, asked: {}, work: [] };
}

function boundKeys(obj) {
  const keys = Object.keys(obj);
  if (keys.length <= MAX_PREF_DOMAINS) return obj;
  const next = { ...obj };
  for (const k of keys.slice(0, keys.length - MAX_PREF_DOMAINS)) delete next[k];
  return next;
}

// Fold one deliberate "Stay, on purpose" into the prefs. Scattered blocks teach nothing
// (they name no single domain honestly), so callers must only record single-domain stays.
export function recordStay(prev, domain) {
  const p = prev || emptyDomainPrefs();
  if (!domain) return p;
  const stays = boundKeys({ ...(p.stays || {}), [domain]: ((p.stays || {})[domain] || 0) + 1 });
  return { ...p, stays };
}

// The one domain (if any) the popup should offer to reclassify right now.
export function pendingWorkOffer(prefs) {
  const p = prefs || emptyDomainPrefs();
  for (const [domain, count] of Object.entries(p.stays || {})) {
    if (count >= WORK_OFFER_STAYS && !(p.asked || {})[domain] && !(p.work || []).includes(domain)) {
      return domain;
    }
  }
  return null;
}

// Resolve the offer, either way. Asked-ness is permanent: one question per domain, ever.
export function resolveWorkOffer(prev, domain, isWork) {
  const p = prev || emptyDomainPrefs();
  if (!domain) return p;
  const asked = boundKeys({ ...(p.asked || {}), [domain]: true });
  const work = isWork && !(p.work || []).includes(domain)
    ? [...(p.work || []), domain].slice(-MAX_PREF_DOMAINS)
    : (p.work || []);
  return { stays: p.stays || {}, asked, work };
}

// Clamp a dwell to a sane integer second count. Guards against clock jumps (negative or
// enormous elapsed) that would otherwise make /api/ingest reject the whole batch (H1).
export function capDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.min(Math.round(seconds), MAX_DWELL_S);
}

// Pick the auth session cookie out of everything on the app's domain and return its raw
// joined value (or null). Mirrors @supabase/ssr's own chunk resolution so we never pick up
// sibling cookies that merely share the prefix. The critical one is
// `sb-<ref>-auth-token-code-verifier` (the PKCE cookie from an OAuth/Google sign-in): a loose
// startsWith match swept it in, and because '-' sorts before '.' its value was prepended to
// the real chunks, corrupting the JSON and showing a false "Not signed in" (the login bug).
//   - Prefer the unchunked cookie `sb-<ref>-auth-token` if present.
//   - Otherwise join `.0`, `.1`, ... in NUMERIC order (localeCompare put `.10` before `.2`).
//   - Match chunk names exactly: `key` then `key.<n>` — nothing else.
export function selectAuthCookie(cookies, ref) {
  const key = `sb-${ref}-auth-token`;
  const byName = new Map((cookies || []).map((c) => [c.name, c.value]));
  if (byName.has(key)) return byName.get(key);
  const chunks = [];
  for (let i = 0; byName.has(`${key}.${i}`); i++) chunks.push(byName.get(`${key}.${i}`));
  return chunks.length ? chunks.join('') : null;
}

// base64url OR standard base64 -> binary string.
function b64decode(input) {
  let s = String(input).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

// Parse the @supabase/ssr auth cookie value(s) into a session object. Tolerates
// URL-encoding, the 'base64-' prefix, and base64url. Returns null on any malformed input
// so a parse hiccup never shows a false "not signed in" (L2).
export function parseSupabaseSession(rawJoined) {
  if (!rawJoined) return null;
  let raw = String(rawJoined);
  try {
    if (/%[0-9a-fA-F]{2}/.test(raw)) raw = decodeURIComponent(raw);
  } catch {
    /* not URL-encoded — use as-is */
  }
  try {
    if (raw.startsWith('base64-')) raw = b64decode(raw.slice('base64-'.length));
    const session = JSON.parse(raw);
    return session && typeof session.access_token === 'string' ? session : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Nudge policy (domain-only JITAI). The intervention watches for a sustained DISTRACTION BLOCK:
// attention that stays inside the distraction category for NUDGE_AFTER_MIN counted minutes. When
// it does, fire one gentle local nudge, then stay quiet for NUDGE_COOLDOWN_MIN so we never spam.
// This is the ONLY intervention the extension makes: it reads nothing but the bare domain it
// already tracks, never blocks navigation, and only ever deep-links into the app's dashboard.
//
// The block is CATEGORY-scoped, not domain-scoped. This is the fix for the fragmentation miss:
// the old logic reset the streak to 1 on every distraction-domain switch, so a channel-surfing
// user (YouTube -> Instagram -> Reddit -> X -> ...) never accrued 5 minutes on any single site
// and was NEVER nudged — the exact person the check-in is for. Switching between distraction
// domains now CONTINUES the block; drift is drift whether it sits on one site or scatters across
// six. We still track how many distinct domains / switches the block spans, so the decision is
// observable and the copy can name a scatter honestly instead of over-claiming one domain.
// ---------------------------------------------------------------------------
export const NUDGE_AFTER_MIN = 5;      // sustained distraction minutes (any distraction domain) before nudging
export const NUDGE_COOLDOWN_MIN = 10;  // quiet window after a nudge
export const NUDGE_GRACE_TICKS = 2;    // off-distraction ticks the block survives (brief alt-tab / work glance / idle blip)
const MAX_TRACKED_DOMAINS = 8;         // bound the distinct-domain memory carried in state

function freshNudge(lastNudgeAt) {
  return { domain: null, minutes: 0, gap: 0, domains: [], switches: 0, lastNudgeAt };
}
function withDomain(list, domain) {
  if (!domain || list.includes(domain)) return list;
  const next = list.concat(domain);
  return next.length > MAX_TRACKED_DOMAINS ? next.slice(next.length - MAX_TRACKED_DOMAINS) : next;
}

// Pure state machine, ticked once per minute by the service worker. Given the previous nudge
// state and the current attention context, return the next state and whether to nudge now.
//   prev: { domain, minutes, gap, domains, switches, lastNudgeAt }
//   ctx:  { domain, counting, category, now }   (now = Date.now())
// Returns { state, fire, decision, domain?, minutes?, distinctDomains?, switches? }.
// Kept pure (no chrome.*, no timers) so every decision is provable in tests.
//   decision ∈ 'building' | 'fire' | 'cooldown' | 'grace' | 'reset' | 'idle'  (observability)
//
// Recovery grace: a real block survives a SHORT detour off distraction — an alt-tab to Slack, a
// 30-second glance at the docs, a momentary idle — for up to NUDGE_GRACE_TICKS ticks. It only
// resets when the detour outlasts the grace (a genuine return to work / walking away). This is
// what keeps a brief, intentional peek from ever earning a nudge while a fragmented 40-minute
// spiral still does.
export function nextNudge(prev, ctx, cfg = {}) {
  const afterMin = cfg.afterMin ?? NUDGE_AFTER_MIN;
  const graceTicks = cfg.graceTicks ?? NUDGE_GRACE_TICKS;
  const cooldownMs = (cfg.cooldownMin ?? NUDGE_COOLDOWN_MIN) * 60_000;
  const p = prev || {};
  const lastNudgeAt = p.lastNudgeAt || 0;

  const onDistraction = !!ctx.counting && ctx.category === 'distraction' && !!ctx.domain;

  if (!onDistraction) {
    // Off the distraction context: a work glance, a blur, idle, or a pause. A live block holds
    // through the grace window so a brief detour doesn't erase genuine drift; anything longer is
    // real recovery and resets. (Both non-counting AND counting-on-non-distraction count as "off".)
    if ((p.minutes || 0) > 0 && (p.gap || 0) < graceTicks) {
      return {
        state: { domain: p.domain || null, minutes: p.minutes, gap: (p.gap || 0) + 1, domains: p.domains || [], switches: p.switches || 0, lastNudgeAt },
        fire: false,
        decision: 'grace',
      };
    }
    return { state: freshNudge(lastNudgeAt), fire: false, decision: (p.minutes || 0) > 0 ? 'reset' : 'idle' };
  }

  // On a distraction domain and counting -> extend the block, across domains.
  const minutes = (p.minutes || 0) + 1;
  const domains = withDomain(p.domains || [], ctx.domain);
  const switches = (p.switches || 0) + (p.domain && p.domain !== ctx.domain ? 1 : 0);
  const signals = { distinctDomains: domains.length, switches };

  // Never-nudged (lastNudgeAt === 0) is always past cooldown, regardless of clock scale.
  const cooledDown = !lastNudgeAt || ctx.now - lastNudgeAt >= cooldownMs;
  if (minutes >= afterMin && cooledDown) {
    // Fire, then zero the block so the next nudge is a full interval away (cooldown also applies).
    return {
      state: { domain: ctx.domain, minutes: 0, gap: 0, domains: [], switches: 0, lastNudgeAt: ctx.now },
      fire: true, decision: 'fire', domain: ctx.domain, minutes, ...signals,
    };
  }
  const decision = minutes >= afterMin ? 'cooldown' : 'building'; // reached threshold but muzzled by cooldown
  return { state: { domain: ctx.domain, minutes, gap: 0, domains, switches, lastNudgeAt }, fire: false, decision, ...signals };
}

// ---------------------------------------------------------------------------
// Attention gate (BALANCED policy + media exemption). Pure so the exact conditions under
// which time counts are provable in tests.
//   gate: { blurred, idleState: 'active' | 'idle' | 'locked' }  (old shape { idle: bool } tolerated)
//   opts: { audible, paused }
// The media exemption: chrome.idle reports 'idle' after 5 minutes without input, but watching a
// video IS attention without input. If the active tab is audibly playing, 'idle' does not pause
// timing. 'locked' always pauses (screen off/locked means gone), and blur always pauses (an
// audible tab behind another app is background music, not attention).
// ---------------------------------------------------------------------------
export function gateAllowsCounting(gate, opts = {}) {
  if (opts.paused) return false;
  const g = gate || {};
  if (g.blurred) return false;
  const idleState = g.idleState || (g.idle ? 'idle' : 'active');
  if (idleState === 'locked') return false;
  if (idleState === 'idle') return !!opts.audible;
  return true;
}

// Gentle, conscious nudge copy. The principle (सत्य / truth): name what's real, add zero blame,
// hand the choice back to the user, keep it short. We rotate a few phrasings so a repeat nudge
// never feels like a robot repeating itself. Pure + tested so the tone can't silently regress.
//
// Two registers. When the block sat mostly on ONE site we name it ("about 5 minutes on
// youtube.com"). When it scattered across several (fragmentation), naming one site would be a
// lie — so we name the pattern instead ("a bit scattered these last few minutes"). Neither ever
// blames; both hand the next moment back to the user.
const NUDGE_PROMPTS = [
  (d, m) => `About ${m} minutes on ${d}. No judgment. Is this where you want your attention right now?`,
  (d, m) => `You've been with ${d} for ${m} minutes. Worth a breath: keep going, or come back to what matters?`,
  (d, m) => `${m} quiet minutes on ${d}. Notice how it feels, then choose the next moment on purpose.`,
];
const NUDGE_PROMPTS_SCATTERED = [
  (d, m) => `The last ${m} minutes have wandered across a few sites. No judgment. Where do you want your attention right now?`,
  (d, m) => `A few different places in ${m} minutes. Worth a breath: keep going, or come back to what matters?`,
  (d, m) => `${m} minutes, several tabs. Notice the pull, then choose the next moment on purpose.`,
];
// The GENTLE register: for someone who tends to let check-ins pass. We speak even more
// softly and ask for nothing — pure acknowledgement, maximum autonomy. Backing off in tone
// (and in frequency, see nudgeCooldownMultiplier) is how the product respects a "no".
const NUDGE_PROMPTS_GENTLE = [
  (d, m) => `Still on ${d}. Nothing to do with this — just a quiet marker of the time.`,
  (d, m) => `${m} minutes on ${d}. Whenever you're ready is fine. Only noticing.`,
  (d, m) => `A soft note on ${d}. Stay if you mean to; this won't ask again for a while.`,
];
// opts.distinctDomains: distinct distraction domains the block spanned (>=3 => scattered).
// opts.register: 'curious' | 'reflective' | 'gentle' — HOW it speaks (see nudgeRegister).
// Backward compatible: with no register, a scattered block still picks the reflective set.
export function nudgeCopy(domain, minutes, seed = 0, opts = {}) {
  const register = opts.register || ((opts.distinctDomains || 1) >= 3 ? 'reflective' : 'curious');
  const prompts = register === 'reflective' ? NUDGE_PROMPTS_SCATTERED
    : register === 'gentle' ? NUDGE_PROMPTS_GENTLE
      : NUDGE_PROMPTS;
  const idx = Math.abs(Math.trunc(Number(seed) || 0)) % prompts.length;
  return { title: 'A quiet check-in', message: prompts[idx](domain, minutes) };
}

// ---------------------------------------------------------------------------
// Local nudge intelligence (Intervention Intelligence — the "HOW", fully local).
//
// The deterministic policy (nextNudge) still decides WHETHER and WHEN to intervene, on the
// fixed 5-minute block. This layer decides only HOW the check-in speaks, and — when a person
// repeatedly lets check-ins pass — spaces them FURTHER apart. Two hard rules keep it honest:
//   * It only ever backs OFF. It never lowers the fire threshold or nudges more aggressively;
//     adaptive threshold-lowering stays a deliberate, visible decision, never a silent one.
//   * It learns ONLY from the extension's own local heeded/ignored signal (did attention
//     return to non-distraction within the welcome window?), kept in chrome.storage.local and
//     NEVER transmitted. No server call, no server-side nudge log — the intervention stays
//     private by design.
// Pure + tested, like the rest of core.js.
// ---------------------------------------------------------------------------
export const NUDGE_RESP_ALPHA = 0.3;   // outcome EWMA rate (gradual, never lurching)
export const NUDGE_BACKOFF_MAX = 3;    // cap on the cooldown multiplier

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function emptyNudgeProfile() {
  return { responsiveness: 0.5, consecutiveIgnored: 0, heeded: 0, ignored: 0, updatedAt: 0 };
}

// Fold one outcome into the local profile. heeded=true when attention came back to
// non-distraction within the welcome window; false when the window lapsed untouched.
export function updateNudgeOutcome(prev, heeded, now = Date.now()) {
  const p = prev || emptyNudgeProfile();
  const r = p.responsiveness == null ? 0.5 : p.responsiveness;
  return {
    responsiveness: clamp01(r + NUDGE_RESP_ALPHA * ((heeded ? 1 : 0) - r)),
    consecutiveIgnored: heeded ? 0 : (p.consecutiveIgnored || 0) + 1,
    heeded: (p.heeded || 0) + (heeded ? 1 : 0),
    ignored: (p.ignored || 0) + (heeded ? 0 : 1),
    updatedAt: now,
  };
}

// Fatigue back-off: after repeated ignores, MULTIPLY the cooldown so check-ins get rarer.
// 0-1 ignored => 1x; then 1.5x, 2x, 2.5x, capped at NUDGE_BACKOFF_MAX. A single heed resets
// consecutiveIgnored, so responsiveness restores the normal cadence immediately.
export function nudgeCooldownMultiplier(prof) {
  const c = (prof && prof.consecutiveIgnored) || 0;
  if (c < 2) return 1;
  return Math.min(NUDGE_BACKOFF_MAX, 1 + 0.5 * (c - 1));
}

// HOW the next nudge should speak. Deterministic from the local profile + the block shape.
//   scattered block            -> 'reflective' (name the pattern, never one site)
//   often lets check-ins pass  -> 'gentle'     (softest, asks for nothing)
//   otherwise                  -> 'curious'    (the default, warm question)
export function nudgeRegister(prof, opts = {}) {
  if ((opts.distinctDomains || 1) >= 3) return 'reflective';
  const r = prof && prof.responsiveness;
  if (r != null && r < 0.35) return 'gentle';
  return 'curious';
}

// ---------------------------------------------------------------------------
// Welcome-back acknowledgement. A nudge is the only time the extension speaks first; this
// closes that loop with warmth. When attention lands back on non-distraction ground within
// WELCOME_WINDOW_MIN of a nudge, the next popup open greets once: "Welcome back." Exactly
// once per nudge — never a recurring pat on the head (that would be engagement mechanics).
// ---------------------------------------------------------------------------
export const WELCOME_WINDOW_MIN = 30; // a return later than this isn't a response to the nudge

// Pure, ticked by the same 1-minute alarm as nextNudge.
//   prev: { ackedNudgeAt }  — newest nudge already resolved (welcomed or expired)
//   ctx:  { lastNudgeAt, counting, category, now }
// Returns { state, fire }. fire=true exactly once, when the nudge was actually heeded.
export function nextWelcome(prev, ctx, cfg = {}) {
  const windowMs = (cfg.windowMin ?? WELCOME_WINDOW_MIN) * 60_000;
  const acked = (prev && prev.ackedNudgeAt) || 0;
  const nudgeAt = ctx.lastNudgeAt || 0;
  // No nudge, or one we've already resolved — nothing to do.
  if (!nudgeAt || nudgeAt <= acked) return { state: { ackedNudgeAt: acked }, fire: false };
  // Came back too late to be a response to the nudge: resolve it silently.
  if (ctx.now - nudgeAt > windowMs) return { state: { ackedNudgeAt: nudgeAt }, fire: false };
  // Heeded: attention is being counted somewhere that isn't a distraction.
  if (ctx.counting && ctx.category !== 'distraction') {
    return { state: { ackedNudgeAt: nudgeAt }, fire: true };
  }
  // Still away (blur/idle) or still on the distraction — keep waiting inside the window.
  return { state: { ackedNudgeAt: acked }, fire: false };
}

// ---------------------------------------------------------------------------
// Sutra — the thread (re-entry layer). सूत्र / thread.
//
// Interruption research says the real cost of a drift isn't the minutes away — it's the
// re-entry: leaving is one click, returning is minutes of "where was I?". Every tool attacks
// the leaving; Sutra attacks the return. While attention sits on non-distraction ground, we
// remember WHICH TAB holds the work — the thread. When a drift ends (via the nudge or the
// popup), we hand the thread back: one click, straight to the tab you left.
//
// Privacy is structural, same as everything else here: the thread is
// { domain, tabId, windowId, at } — a bare domain plus Chrome's own integer ids. NO URL, no
// title, not even locally. Re-entry works by focusing the still-open tab; if the tab is gone
// or navigated elsewhere, the thread is cold and we fall back to the dashboard. The thread
// lives in chrome.storage.session (a browser restart clears it — by then it's stale anyway)
// and is NEVER transmitted.
// ---------------------------------------------------------------------------
export const THREAD_TTL_MIN = 60; // older than this, the context is cold — don't offer it

// Pure, ticked by the same 1-minute alarm as nextNudge.
//   prev: { domain, tabId, windowId, at } | null
//   ctx:  { counting, category, domain, tabId, windowId, now }
// Attention on a counted, non-distraction domain re-anchors the thread there; anything else
// (a drift, a blur, idle, a new tab) leaves the thread untouched — it persists THROUGH the
// drift, which is the whole point.
export function nextThread(prev, ctx) {
  if (ctx.counting && ctx.domain && ctx.category !== 'distraction' && ctx.tabId != null) {
    return { domain: ctx.domain, tabId: ctx.tabId, windowId: ctx.windowId ?? null, at: ctx.now };
  }
  return prev || null;
}

export function threadIsWarm(thread, now, ttlMin = THREAD_TTL_MIN) {
  return !!(thread && thread.at && now - thread.at <= ttlMin * 60_000);
}

// Whether the popup should offer the thread right now. Restraint rules:
//   - only a warm thread (a cold offer would restore stale context — worse than nothing)
//   - never while attention is already counted on non-distraction ground (they're working;
//     the thread will re-anchor to wherever they are within a minute anyway)
//   - never when they're already ON the thread tab (offering a door they're standing in)
// ctx: { counting, category, tabId, now }
export function shouldOfferThread(thread, ctx) {
  if (!threadIsWarm(thread, ctx.now)) return false;
  if (ctx.counting && ctx.category !== 'distraction') return false;
  if (ctx.tabId != null && ctx.tabId === thread.tabId) return false;
  return true;
}

// The quiet ledger line for the popup: "Your thread: github.com · 14 min ago".
// Same register as the rest of the product — a statement of what's true, no push.
export function threadLine(thread, now) {
  const m = Math.max(0, Math.floor((now - thread.at) / 60_000));
  const ago = m < 1 ? 'moments ago' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`;
  return `Your thread: ${thread.domain} · ${ago}`;
}

// expires_at is unix SECONDS. True if the token is missing or within `skewS` of expiry,
// so we refresh proactively instead of waiting for a 401 (H3).
export function tokenExpiresSoon(session, skewS = 60, now = Date.now()) {
  if (!session || !session.access_token) return true;
  const expMs = session.expires_at ? session.expires_at * 1000 : 0;
  return expMs - now <= skewS * 1000;
}

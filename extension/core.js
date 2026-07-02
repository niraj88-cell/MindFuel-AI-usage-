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

const OWN_DOMAINS = ['satyashift.vercel.app', 'localhost'];
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
export function categoryFor(host) {
  if (!host) return 'neutral';
  if (DISTRACTION_DOMAINS.some((d) => matchesDomain(host, d))) return 'distraction';
  if (PRODUCTIVE_DOMAINS.some((d) => matchesDomain(host, d))) return 'productive';
  return 'neutral';
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
// Nudge policy (domain-only JITAI). When attention stays on a single distraction domain for
// NUDGE_AFTER_MIN sustained minutes, fire one gentle local nudge, then stay quiet for
// NUDGE_COOLDOWN_MIN so we never spam. This is the ONLY intervention the extension makes: it
// reads nothing but the bare domain it already tracks, never blocks navigation, and only ever
// deep-links into the app's existing /intercept flow.
// ---------------------------------------------------------------------------
export const NUDGE_AFTER_MIN = 5;      // sustained minutes on a distraction domain before nudging
export const NUDGE_COOLDOWN_MIN = 10;  // quiet window after a nudge
export const NUDGE_GRACE_TICKS = 2;    // non-counting ticks the streak survives (brief alt-tab / idle blip)

// Pure state machine, ticked once per minute by the service worker. Given the previous nudge
// state and the current attention context, return the next state and whether to nudge now.
//   prev: { domain, minutes, gap, lastNudgeAt }
//   ctx:  { domain, counting, category, now }   (now = Date.now())
// Returns { state, fire, domain?, minutes? }. Kept pure (no chrome.*, no timers) so it's testable.
//
// Streak grace: one alt-tab to Slack or a momentary idle blip used to erase a 4-minute streak,
// which made the nudge nearly impossible to hit in real browsing. Now a streak PAUSES (doesn't
// grow) for up to NUDGE_GRACE_TICKS non-counting ticks, and only resets when the gap outlasts
// the grace or attention actually lands somewhere else (counting on a different context).
export function nextNudge(prev, ctx, cfg = {}) {
  const afterMin = cfg.afterMin ?? NUDGE_AFTER_MIN;
  const graceTicks = cfg.graceTicks ?? NUDGE_GRACE_TICKS;
  const cooldownMs = (cfg.cooldownMin ?? NUDGE_COOLDOWN_MIN) * 60_000;
  const p = prev || {};
  const lastNudgeAt = p.lastNudgeAt || 0;

  const attending = !!ctx.counting && ctx.category === 'distraction' && !!ctx.domain;

  if (!attending) {
    // Not counting at all (blur/idle/pause) -> hold the streak through a short gap.
    if (!ctx.counting && p.domain && (p.gap || 0) < graceTicks) {
      return { state: { domain: p.domain, minutes: p.minutes || 0, gap: (p.gap || 0) + 1, lastNudgeAt }, fire: false };
    }
    // Gap outlasted the grace, or attention moved to a non-distraction context -> reset.
    return { state: { domain: null, minutes: 0, gap: 0, lastNudgeAt }, fire: false };
  }

  // Same domain extends the streak; a different distraction domain starts a fresh one.
  const minutes = p.domain === ctx.domain ? (p.minutes || 0) + 1 : 1;

  // Never-nudged (lastNudgeAt === 0) is always past cooldown, regardless of clock scale.
  const cooledDown = !lastNudgeAt || ctx.now - lastNudgeAt >= cooldownMs;
  if (minutes >= afterMin && cooledDown) {
    // Fire, then zero the streak so the next nudge is a full interval away (cooldown also applies).
    return { state: { domain: ctx.domain, minutes: 0, gap: 0, lastNudgeAt: ctx.now }, fire: true, domain: ctx.domain, minutes };
  }
  return { state: { domain: ctx.domain, minutes, gap: 0, lastNudgeAt }, fire: false };
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
const NUDGE_PROMPTS = [
  (d, m) => `About ${m} minutes on ${d}. No judgment. Is this where you want your attention right now?`,
  (d, m) => `You've been with ${d} for ${m} minutes. Worth a breath: keep going, or come back to what matters?`,
  (d, m) => `${m} quiet minutes on ${d}. Notice how it feels, then choose the next moment on purpose.`,
];
export function nudgeCopy(domain, minutes, seed = 0) {
  const idx = Math.abs(Math.trunc(Number(seed) || 0)) % NUDGE_PROMPTS.length;
  return { title: 'A quiet check-in', message: NUDGE_PROMPTS[idx](domain, minutes) };
}

// expires_at is unix SECONDS. True if the token is missing or within `skewS` of expiry,
// so we refresh proactively instead of waiting for a 401 (H3).
export function tokenExpiresSoon(session, skewS = 60, now = Date.now()) {
  if (!session || !session.access_token) return true;
  const expMs = session.expires_at ? session.expires_at * 1000 : 0;
  return expMs - now <= skewS * 1000;
}

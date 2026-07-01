// bridge.js — content script, injected ONLY on SatyaShift's own domain (see manifest
// content_scripts matches). Its single job: read the app's own Supabase auth cookie from
// document.cookie and hand it to the service worker.
//
// Why this exists: reading the session with chrome.cookies.getAll from the MV3 service worker
// proved unreliable across Chrome versions / host-access states (it returned nothing even when
// the cookie was present and valid, showing a signed-in user as "Not signed in"). document.cookie
// in the page context is the source of truth the web app itself uses, so we read it here and
// forward it. The SW keeps its chrome.cookies read as a fallback.
//
// Privacy: this runs on our own domain only. It reads ONLY the sb-<ref>-auth-token* cookie (the
// user's own session) — never page content, never other sites, never anything we don't already
// send to our own backend. It does not read paths, URLs, or keystrokes.
(function () {
  const PREFIX = 'sb-sztvvvphpawuxvvmuddm-auth-token';

  // Collect just the Supabase auth-token cookie chunks (name + value), nothing else.
  function collect() {
    const out = [];
    for (const part of document.cookie.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const name = part.slice(0, eq).trim();
      if (name.startsWith(PREFIX)) out.push({ name, value: part.slice(eq + 1) });
    }
    return out;
  }

  function push() {
    const cookies = collect();
    if (!cookies.length) return;
    try {
      // Fire-and-forget; the SW may be asleep and will wake to receive it.
      chrome.runtime.sendMessage({ type: 'SESSION_FROM_PAGE', cookies }).catch(() => {});
    } catch (_) {
      /* extension context invalidated (e.g. just reloaded) — the next push will reconnect */
    }
  }

  push();
  // The web app rotates the token roughly hourly; re-send when the tab is refocused and on a slow
  // timer so the SW always holds a fresh session while the app is open.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) push(); });
  setInterval(push, 60000);
})();

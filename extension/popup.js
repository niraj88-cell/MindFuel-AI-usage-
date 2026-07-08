// popup.js — SatyaShift popup. Vanilla JS (the extension has no build step).
// Asks the service worker for status over chrome.runtime messaging and renders it.
// No inline JS anywhere, so it satisfies the MV3 default content-security-policy.

const $ = (id) => document.getElementById(id);

let current = null; // last status, so the toggles know what to flip to
let tick = null;    // interval that refreshes the in-session elapsed time
let welcomed = false; // "Welcome back." — one-shot flag held for this popup's lifetime
let sealText = null;  // set after "End session": the settled verdict line, until close

function timeAgo(ts) {
  if (!ts) return 'never';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} hr ago` : `${Math.floor(h / 24)} d ago`;
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return 'the app'; }
}

// Calm, minute-level elapsed for a running deep session (no frantic ticking seconds).
function sessionElapsed(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'Just started';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function sessionDetail(s) {
  return `${sessionElapsed(s.session.startedAt)} of deep work. We're verifying it quietly.`;
}
function paintSession() {
  if (current && current.session) $('detail').textContent = sessionDetail(current);
}

// A calm, human line for a transient sync failure. Only shown when work is actually waiting.
function transientNote(s) {
  if (!s || !s.lastError || !s.queued) return null;
  const host = hostOf(s.baseUrl);
  switch (s.lastError.kind) {
    case 'network': return `Offline — your ${s.queued} pending event(s) are saved and will sync when you reconnect.`;
    case 'server':  return `${host} is briefly unavailable — will retry automatically.`;
    case 'rate_limit': return 'Syncing is briefly throttled — will resume shortly.';
    case 'rejected': return 'A malformed batch was discarded so syncing could continue.';
    default: return null;
  }
}

// Why a start/end action didn't take (surfaced only right after the click).
function actionErrorNote(kind, s) {
  if (kind === 'offline') return "Couldn't reach SatyaShift. Check your connection and try again.";
  if (kind === 'not_signed_in') return `Sign in at ${hostOf(s?.baseUrl)} to start a session.`;
  return 'Could not start the session just now. Give it a moment and try again.';
}

// "24 min", "1h 04m" — calm, minute-level, for the seal and the presence line.
function humanMinutes(totalSeconds) {
  const m = Math.max(1, Math.round(totalSeconds / 60));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

// One quiet line of circle presence under the status card. Hidden entirely when the user
// has no circle (or we can't know) — a presence line with nobody behind it would be noise.
function paintPresence(p) {
  const row = $('presence');
  if (!p || !p.circle) { row.style.display = 'none'; return; }
  row.style.display = 'flex';
  if (p.live && p.live.name) {
    const startedAt = p.live.started_at ? new Date(p.live.started_at).getTime() : null;
    const mins = startedAt ? Math.floor((Date.now() - startedAt) / 60000) : 0;
    $('pdot').className = 'pdot live';
    $('ptext').textContent = mins < 1
      ? `${p.live.name} is focusing · just started`
      : `${p.live.name} is focusing · ${mins} min`;
  } else {
    $('pdot').className = 'pdot';
    $('ptext').textContent = 'Your circle is quiet right now';
  }
}

function render(s) {
  current = s;
  const inSession = !!(s && s.session);

  // "Welcome back." — the worker hands it over once; keep it for this popup's lifetime.
  if (s && s.welcomePending) welcomed = true;
  $('welcome').style.display = welcomed ? 'block' : 'none';

  // Sutra — the thread. The worker only offers it when it's warm and verified (the work tab
  // still exists, still on that domain, and attention is currently elsewhere). One quiet line,
  // one button: the way back costs a single click instead of a reconstruction.
  if (s && s.thread) {
    $('threadline').textContent = s.thread.line;
    $('thread').style.display = 'block';
  } else {
    $('thread').style.display = 'none';
  }

  // Domain correction — asked once, after two deliberate "Stay, on purpose" answers.
  // Their word beats our heuristic: "It's work" ends the check-ins for that domain and
  // counts its time as work from then on.
  if (s && s.workOffer) {
    $('workofferline').textContent =
      `You’ve chosen to stay with ${s.workOffer} twice. Is it work for you?`;
    $('workyes').disabled = false;
    $('workno').disabled = false;
    $('workoffer').style.display = 'block';
  } else {
    $('workoffer').style.display = 'none';
  }

  // Keep the elapsed time fresh while a session runs; stop the ticker otherwise.
  if (tick) { clearInterval(tick); tick = null; }
  if (inSession) tick = setInterval(paintSession, 20000);

  // Status line
  let dot = 'off', state, detail;
  if (!s) {
    dot = 'off'; state = 'Not connected'; detail = 'The tracker is starting up. Reopen in a moment.';
  } else if (inSession) {
    dot = 'ok'; state = 'In deep work'; detail = sessionDetail(s);
  } else if (s.sessionExpired) {
    dot = 'warn'; state = 'Session expired';
    detail = `Sign in again at ${hostOf(s.baseUrl)} to resume verifying your focus.`;
  } else if (!s.signedIn) {
    dot = 'off'; state = 'Not signed in';
    detail = `Sign in at ${hostOf(s.baseUrl)} to start verifying your focus.`;
  } else if (s.paused) {
    dot = 'off'; state = 'Paused';
    detail = 'Tracking is off. Resume whenever you want.';
  } else if (s.counting && s.activeDomain) {
    dot = 'ok'; state = 'Tracking';
    detail = `Timing ${s.activeDomain}.`;
  } else {
    dot = 'ok'; state = 'Connected';
    detail = 'Waiting for a focused tab.';
  }
  $('dot').className = 'dot ' + dot;
  $('state').textContent = state;
  $('detail').textContent = detail;

  // Quiet sync reassurance — hidden during a session (the session view speaks for itself).
  const showSynced = s && s.signedIn && !s.paused && !s.sessionExpired && !inSession && s.lastSync && !transientNote(s);
  $('synced').textContent = showSynced ? `Synced ${timeAgo(s.lastSync)}` : '';
  if (s) $('open').href = s.baseUrl;

  // Note: a transient sync problem, or (right after a click) why a start/end didn't take.
  // Lowest priority: nudges muted at the Chrome level (notifications off for this extension) —
  // otherwise the gentle check-ins silently never appear and nothing anywhere says why.
  let note = transientNote(s);
  if (s && s.actionError) note = actionErrorNote(s.actionError, s);
  if (!note && s && s.nudgesMuted && !s.paused) {
    note = 'Gentle check-ins are muted: Chrome has notifications turned off for SatyaShift.';
  }
  $('note').style.display = note ? 'block' : 'none';
  $('note').textContent = note || '';

  // Deep-session button: the primary action when idle, "End session" while running. Only offered
  // to a signed-in user (you can't verify a session we can't attribute). After a session just
  // ended, the seal takes the button's place until the popup closes — completion gets a moment.
  const sessBtn = $('session');
  const seal = $('seal');
  if (sealText) {
    seal.textContent = sealText;
    seal.style.display = 'block';
    sessBtn.style.display = 'none';
  } else {
    seal.style.display = 'none';
    const canSession = !!(s && s.signedIn && !s.sessionExpired);
    sessBtn.style.display = canSession ? 'block' : 'none';
    sessBtn.textContent = inSession ? 'End session' : 'Start deep session';
    sessBtn.className = 'btn ' + (inSession ? 'ghost' : 'primary');
    sessBtn.disabled = false;
  }

  // Pause toggle — hidden during a session (pausing would undercut the very focus we're verifying).
  const pauseBtn = $('pause');
  pauseBtn.style.display = inSession ? 'none' : 'block';
  pauseBtn.textContent = s && s.paused ? 'Resume tracking' : 'Pause tracking';
  pauseBtn.disabled = false;
}

async function refresh() {
  try {
    render(await chrome.runtime.sendMessage({ type: 'GET_STATUS' }));
  } catch {
    render(null);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Tell the worker we're open. Opening the popup makes Chrome report the browser window as
  // "unfocused" (WINDOW_ID_NONE) on Windows; this port lets the worker ignore that so glancing at
  // the popup never pauses tracking. The port closes automatically when the popup closes.
  try { chrome.runtime.connect({ name: 'popup' }); } catch { /* worker asleep; GET_STATUS will wake it */ }

  refresh();

  // Circle presence arrives separately so a slow network never delays the status render.
  chrome.runtime.sendMessage({ type: 'GET_PRESENCE' }).then(paintPresence).catch(() => {});

  $('open').addEventListener('click', (e) => {
    e.preventDefault();
    const url = $('open').getAttribute('href');
    if (url && url !== '#') chrome.tabs.create({ url });
  });

  $('session').addEventListener('click', async () => {
    const btn = $('session');
    btn.disabled = true;
    const type = current && current.session ? 'STOP_SESSION' : 'START_SESSION';
    try {
      const s = await chrome.runtime.sendMessage({ type });
      // Session just ended: settle the verdict in the button's place — "44 min · verified"
      // (or "saved" when the extension had no signal to verify with). Words only, no glyphs.
      if (type === 'STOP_SESSION' && s && s.ended) {
        sealText = `${humanMinutes(s.ended.durationS)} · ${s.ended.verified ? 'verified' : 'saved'}`;
      }
      render(s);
    } catch {
      btn.disabled = false;
    }
  });

  const answerWorkOffer = (isWork) => async () => {
    const domain = current && current.workOffer;
    if (!domain) return;
    $('workyes').disabled = true;
    $('workno').disabled = true;
    try {
      render(await chrome.runtime.sendMessage({ type: 'SET_DOMAIN_WORK', domain, isWork }));
    } catch {
      $('workyes').disabled = false;
      $('workno').disabled = false;
    }
  };
  $('workyes').addEventListener('click', answerWorkOffer(true));
  $('workno').addEventListener('click', answerWorkOffer(false));

  $('threadbtn').addEventListener('click', async () => {
    const btn = $('threadbtn');
    btn.disabled = true;
    try { await chrome.runtime.sendMessage({ type: 'OPEN_THREAD' }); } catch { /* worker asleep */ }
    window.close(); // the work tab now has focus; the popup's job here is done
  });

  $('pause').addEventListener('click', async () => {
    const btn = $('pause');
    btn.disabled = true;
    try {
      const next = !(current && current.paused);
      render(await chrome.runtime.sendMessage({ type: 'SET_PAUSED', paused: next }));
    } catch {
      btn.disabled = false;
    }
  });
});

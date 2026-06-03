// background.js - Manages interception and passive tracking

// --- CONFIGURATION ---
const MIN_DWELL_TIME_MS = 2 * 60 * 1000; // 2 minutes before logging passive content
const PRODUCTION_URL = 'https://getmindfuel.vercel.app';
const DEV_URL = 'http://localhost:3000';

// Auto-detect environment: use production by default, dev only when explicitly set
let BASE_URL = PRODUCTION_URL;
chrome.storage.local.get(['mindfuel_env'], (result) => {
  if (result.mindfuel_env === 'dev') BASE_URL = DEV_URL;
});

// Doomscroll sites that trigger an intercept
const INTERCEPT_TARGETS = [
  { host: 'tiktok.com', path: '/' },
  { host: 'instagram.com', path: '/reels' },
  { host: 'youtube.com', path: '/shorts' },
  { host: 'reddit.com', path: '/' },
  { host: 'twitter.com', path: '/' },
  { host: 'x.com', path: '/' }
];

// Sensitive domains — NEVER track these for privacy
const SENSITIVE_DOMAINS = [
  'bank', 'chase', 'wellsfargo', 'paypal', 'venmo',
  'health', 'doctor', 'patient', 'medical',
  'mail.google.com', 'outlook.live.com',
  'password', '1password', 'lastpass', 'bitwarden'
];

// State tracking
let activeTabInfo = {
  id: null,
  url: null,
  startTime: null
};

function isSensitiveDomain(hostname) {
  return SENSITIVE_DOMAINS.some(s => hostname.includes(s));
}

// --- INTERCEPT LOGIC ---
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Only intercept main frame navigation
  if (details.frameId !== 0) return;

  let url;
  try {
    url = new URL(details.url);
  } catch { return; } // Invalid URL, skip

  // Skip MindFuel pages, chrome pages, and sensitive domains
  if (url.hostname === 'localhost' || url.hostname.includes('getmindfuel.vercel.app')) return;
  if (url.protocol === 'chrome:' || url.protocol === 'edge:' || url.protocol === 'about:') return;
  if (isSensitiveDomain(url.hostname)) return;

  // Check if URL matches any intercept targets
  const isTarget = INTERCEPT_TARGETS.some(target => 
    url.hostname.includes(target.host) && url.pathname.startsWith(target.path)
  );

  if (isTarget) {
    chrome.storage.local.get(['intercept_bypass'], (result) => {
      const bypass = result.intercept_bypass || {};
      const now = Date.now();
      
      // If bypassed within the last 15 minutes, allow it
      if (bypass[url.hostname] && (now - bypass[url.hostname] < 15 * 60 * 1000)) {
        return; 
      }

      // Redirect to intercept page
      const interceptUrl = `${BASE_URL}/intercept?target=${encodeURIComponent(details.url)}`;
      chrome.tabs.update(details.tabId, { url: interceptUrl });
    });
  }
});

// --- PASSIVE TRACKING LOGIC ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabChange(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    await handleTabChange(tabId);
  }
});

async function handleTabChange(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

    // Never track sensitive domains
    try {
      const tabUrl = new URL(tab.url);
      if (isSensitiveDomain(tabUrl.hostname)) return;
      // Never track incognito
      if (tab.incognito) return;
    } catch { return; }

    const now = Date.now();

    // Process previous tab if it was active long enough
    if (activeTabInfo.id && activeTabInfo.id !== tabId && activeTabInfo.startTime) {
      const dwellTime = now - activeTabInfo.startTime;
      if (dwellTime >= MIN_DWELL_TIME_MS) {
        await logPassiveContent(activeTabInfo.id, activeTabInfo.url, dwellTime);
      }
    }

    // Update active tab tracking
    activeTabInfo = {
      id: tabId,
      url: tab.url,
      startTime: now
    };
  } catch (err) {
    // Tab may have been closed, that's fine
  }
}

async function logPassiveContent(tabId, url, durationMs) {
  try {
    chrome.tabs.sendMessage(tabId, { action: "extract_content_context" }, async (context) => {
      if (chrome.runtime.lastError || !context) return;
      
      context.duration_minutes = Math.round(durationMs / 60000);
      
      chrome.storage.local.get(['mindfuel_api_key'], async (result) => {
        const apiKey = result.mindfuel_api_key;
        if (!apiKey) return;

        try {
          await fetch(`${BASE_URL}/api/track/passive`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(context)
          });
        } catch {
          // Network error, silent fail — don't break the extension
        }
      });
    });
  } catch {
    // Tab closed or inaccessible, silent fail
  }
}

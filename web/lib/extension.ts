// lib/extension.ts — the single place the Chrome Web Store listing is configured.
// While unpublished this stays '', and every install surface (onboarding step 2,
// the Today connect card) shows the honest founding-preview path instead. When the
// listing goes live, paste the URL here — both surfaces flip to one-click install.
export const EXTENSION_STORE_URL = ''
export const EXTENSION_PUBLISHED = EXTENSION_STORE_URL !== ''

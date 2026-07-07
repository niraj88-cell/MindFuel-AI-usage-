// lib/extension.ts — the single place the Chrome Web Store listing is configured.
// While unpublished this stays '', and every install surface (onboarding step 2,
// the Today connect card) shows the honest founding-preview path instead. When the
// listing goes live, paste the URL here — both surfaces flip to one-click install.
export const EXTENSION_STORE_URL = ''
export const EXTENSION_PUBLISHED = EXTENSION_STORE_URL !== ''

// The founding-preview download, served from web/public and rebuilt by
// `npm run package:extension` after any extension change. The install surfaces
// use it only while EXTENSION_PUBLISHED is false.
export const EXTENSION_DOWNLOAD_URL = '/satyashift-extension.zip'

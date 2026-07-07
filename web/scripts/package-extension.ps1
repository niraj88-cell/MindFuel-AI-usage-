# Packages the extension into web/public/satyashift-extension.zip — the founding-preview
# download served by the web app until the Chrome Web Store listing is live.
# Run from web/:  npm run package:extension
# Re-run after ANY extension change, or the downloadable build goes stale.
#
# Ships the runtime files only (no tests, docs, or store kit). The manifest ships as-is:
# the localhost entries are inert for normal users and keep one manifest as the truth.

$ErrorActionPreference = 'Stop'

$webDir = Split-Path -Parent $PSScriptRoot          # web/
$extDir = Join-Path (Split-Path -Parent $webDir) 'extension'
$outZip = Join-Path $webDir 'public\satyashift-extension.zip'
$stage = Join-Path $env:TEMP 'satyashift-extension'

$files = @(
  'manifest.json', 'background.js', 'bridge.js', 'core.js',
  'popup.html', 'popup.js', 'welcome.html',
  'icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'
)

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $stage | Out-Null
foreach ($f in $files) { Copy-Item (Join-Path $extDir $f) $stage }

Remove-Item $outZip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path "$stage\*" -DestinationPath $outZip -Force
Remove-Item -Recurse -Force $stage

$size = [math]::Round((Get-Item $outZip).Length / 1KB)
Write-Output "Packaged $outZip ($size KB)"

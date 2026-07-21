// scripts/store-screenshot.mjs — turn any screenshot into an exact 1280x800 Chrome Web
// Store asset, without stretching it.
//
// The image is scaled to FIT (never distorted, never cropped) and centred on a 1280x800
// canvas. The padding colour is sampled from the image's own top-left pixel, so a light
// page pads with warm paper and the dark-mode popup pads with warm near-black — the frame
// always belongs to the picture.
//
// Usage (from the repo root):
//   node scripts/store-screenshot.mjs "C:\path\to\shot.png"
//   node scripts/store-screenshot.mjs "C:\path\to\shot.png" --fill 0.85
//
// --fill is how much of the canvas the image may occupy (default 0.92). Lower it for a
// small image like the popup so it sits calmly with margin instead of being blown up soft.
// Output lands next to the input as <name>-1280x800.png.

import sharp from '../web/node_modules/sharp/lib/index.js'
import path from 'node:path'

const W = 1280
const H = 800

const input = process.argv[2]
if (!input) {
  console.error('Give me a file: node scripts/store-screenshot.mjs "C:\\path\\to\\shot.png"')
  process.exit(1)
}
const fillArg = process.argv.indexOf('--fill')
const fill = fillArg > -1 ? Number(process.argv[fillArg + 1]) : 0.92
if (!(fill > 0 && fill <= 1)) {
  console.error('--fill must be between 0 and 1')
  process.exit(1)
}

const src = sharp(input)
const meta = await src.metadata()

// Sample the top-left pixel for the padding colour (light page → paper, dark popup → ink).
const { data: corner } = await sharp(input)
  .extract({ left: 0, top: 0, width: 1, height: 1 })
  .raw()
  .toBuffer({ resolveWithObject: true })
const background = { r: corner[0], g: corner[1], b: corner[2], alpha: 1 }

// Scale to fit inside the allowed box, preserving aspect ratio. Never upscale past 2x —
// beyond that a screenshot goes visibly soft and looks worse than honest margin.
const box = { w: Math.round(W * fill), h: Math.round(H * fill) }
const scale = Math.min(box.w / meta.width, box.h / meta.height, 2)
const target = {
  width: Math.max(1, Math.round(meta.width * scale)),
  height: Math.max(1, Math.round(meta.height * scale)),
}

const resized = await sharp(input).resize(target).toBuffer()

const out = path.join(
  path.dirname(input),
  `${path.basename(input, path.extname(input))}-1280x800.png`,
)

// flatten() drops the alpha channel: the store wants 24-bit PNG with no transparency.
await sharp({ create: { width: W, height: H, channels: 3, background } })
  .composite([{ input: resized, gravity: 'centre' }])
  .flatten({ background })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(out)

console.log(`in : ${meta.width}x${meta.height}`)
console.log(`out: ${W}x${H}  (image drawn at ${target.width}x${target.height})`)
console.log(`saved: ${out}`)

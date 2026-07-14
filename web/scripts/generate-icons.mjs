// Rasterizes the bindu seal (the same geometry as app/icon.svg) into the full
// favicon/PWA package. Run after any change to the mark: node scripts/generate-icons.mjs
//
// Two variants:
//  - tile: rounded ink tile — favicon.ico (16/32/48), icon-192/512 (manifest "any"),
//    and the Organization logo Google reads from JSON-LD.
//  - fullBleed: square ink, no rounding — apple-icon (iOS rounds corners itself; a
//    pre-rounded tile shows white corners) and the maskable manifest icon (the mark
//    spans ~58% of the width, inside the 80% maskable safe zone).
//
// The .ico is assembled by hand: ICO is just a directory of BMP (BITMAPINFOHEADER)
// entries, which every crawler and legacy client reads — safer than PNG-in-ICO.
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Hex mirrors globals.css tokens (assets can't read CSS variables): ink #23201B, paper #FAF8F4.
const seal = (size, { rounded }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${rounded ? 7 : 0}" fill="#23201B"/>
  <circle cx="16" cy="15.5" r="8" fill="none" stroke="#FAF8F4" stroke-width="2.4"/>
  <circle cx="16" cy="15.5" r="3.2" fill="#FAF8F4"/>
</svg>`

const png = (size, opts) =>
  sharp(Buffer.from(seal(size, opts))).png({ compressionLevel: 9 }).toBuffer()

const raw = (size, opts) =>
  sharp(Buffer.from(seal(size, opts))).ensureAlpha().raw().toBuffer()

// One ICO image entry: BITMAPINFOHEADER + bottom-up BGRA rows + all-zero AND mask
// (alpha channel carries transparency; the mask is still required by the format).
function icoEntry(size, rgba) {
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0) // biSize
  header.writeInt32LE(size, 4) // biWidth
  header.writeInt32LE(size * 2, 8) // biHeight (XOR + AND stacked)
  header.writeUInt16LE(1, 12) // biPlanes
  header.writeUInt16LE(32, 14) // biBitCount
  const pixels = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = ((size - 1 - y) * size + x) * 4
      pixels[dst] = rgba[src + 2] // B
      pixels[dst + 1] = rgba[src + 1] // G
      pixels[dst + 2] = rgba[src] // R
      pixels[dst + 3] = rgba[src + 3] // A
    }
  }
  const andMask = Buffer.alloc(((size + 31) >> 5) * 4 * size)
  return Buffer.concat([header, pixels, andMask])
}

async function buildIco(sizes) {
  const entries = await Promise.all(
    sizes.map(async (s) => ({ size: s, data: icoEntry(s, await raw(s, { rounded: true })) })),
  )
  const dir = Buffer.alloc(6 + 16 * entries.length)
  dir.writeUInt16LE(0, 0) // reserved
  dir.writeUInt16LE(1, 2) // type: icon
  dir.writeUInt16LE(entries.length, 4)
  let offset = dir.length
  entries.forEach((e, i) => {
    const at = 6 + 16 * i
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, at) // width
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, at + 1) // height
    dir.writeUInt16LE(1, at + 4) // planes
    dir.writeUInt16LE(32, at + 6) // bit count
    dir.writeUInt32LE(e.data.length, at + 8)
    dir.writeUInt32LE(offset, at + 12)
    offset += e.data.length
  })
  return Buffer.concat([dir, ...entries.map((e) => e.data)])
}

const out = async (rel, buf) => {
  await writeFile(path.join(webRoot, rel), buf)
  console.log(`${rel}  ${buf.length} bytes`)
}

await out('app/favicon.ico', await buildIco([16, 32, 48]))
await out('app/apple-icon.png', await png(180, { rounded: false }))
await out('public/icon-192x192.png', await png(192, { rounded: true }))
await out('public/icon-512x512.png', await png(512, { rounded: true }))
await out('public/icon-512x512-maskable.png', await png(512, { rounded: false }))

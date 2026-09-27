import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { ICON_SVG } from './gen-icon-svg.js'

mkdirSync('public', { recursive: true })

const svgBuffer = Buffer.from(ICON_SVG)
const sizes = [
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/icon-512-maskable.png', 512],
]

for (const [path, size] of sizes) {
  await sharp(svgBuffer, { density: 384 }).resize(size, size).png().toFile(path)
  console.log('wrote', path)
}

import fs from 'node:fs'
import path from 'node:path'

const artifactDir = 'C:/Users/ddryj/.gemini/antigravity-ide/brain/5d5224bd-c044-4aa1-b04d-624cce017b20'
const publicPicnicDir = path.resolve('public/picnic')

fs.mkdirSync(publicPicnicDir, { recursive: true })

const artifactCopies = [
  { src: 'picnic_grapes_1788902812450.jpg', dest: 'grapes.jpg' },
  { src: 'picnic_chips_1788902824372.jpg', dest: 'chips.jpg' },
  { src: 'picnic_lays_1788902837602.jpg', dest: 'lays_orange.jpg' },
  { src: 'picnic_blueberries_1788902852861.jpg', dest: 'blueberries.jpg' },
  { src: 'picnic_garage_1788902867556.jpg', dest: 'garage_beer.jpg' },
  { src: 'picnic_cookies_1788902882155.jpg', dest: 'cookies.jpg' },
]

for (const { src, dest } of artifactCopies) {
  const srcPath = path.join(artifactDir, src)
  const destPath = path.join(publicPicnicDir, dest)
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath)
    console.log(`Copied ${src} -> ${dest}`)
  } else {
    console.warn(`Source file not found: ${srcPath}`)
  }
}

// Download Cake and Rose from Wikimedia
const remoteDownloads = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Erdbeerkuchen.png/500px-Erdbeerkuchen.png',
    dest: 'strawberry_cake.png',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Red_rose.png/500px-Red_rose.png',
    dest: 'rose.png',
  },
]

for (const { url, dest } of remoteDownloads) {
  try {
    const destPath = path.join(publicPicnicDir, dest)
    console.log(`Downloading ${url}...`)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'DateInviteApp/1.0 (educational date invite app)',
      },
    })
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(destPath, buffer)
      console.log(`Saved ${dest} (${buffer.length} bytes)`)
    } else {
      console.warn(`Failed to fetch ${url}: ${res.status}`)
    }
  } catch (err) {
    console.warn(`Error downloading ${dest}:`, err)
  }
}

console.log('Picnic assets setup complete!')

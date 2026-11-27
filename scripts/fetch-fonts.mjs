// Downloads the licensed PP Kyoto subsets into public/fonts/kyoto/ before
// `next dev` and `next build`. See scripts/subset-kyoto.py.
//
// PP Kyoto is a commercial font and this repository is public, so the files
// aren't in it. They're fetched from `KYOTO_FONTS_URL`, which only the site's
// own deployments have. Without it (forks, fresh clones), nothing is
// downloaded and the site uses its open-source serif. This script never fails
// the build: on any error it falls back the same way.

import fs from 'node:fs/promises'
import path from 'node:path'

const base = process.env.KYOTO_FONTS_URL?.replace(/\/$/, '')
const dir = path.join(process.cwd(), 'public', 'fonts', 'kyoto')

async function download(file) {
  const response = await fetch(`${base}/${file}`)
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  if (!base) {
    console.log('fonts: KYOTO_FONTS_URL is not set, using the open-source serif')
    return
  }
  try {
    const manifest = JSON.parse((await download('manifest.json')).toString())
    const files = await Promise.all(
      manifest.map(async ({ file }) => [file, await download(file)]),
    )
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir, { recursive: true })
    for (const [file, data] of files) {
      await fs.writeFile(path.join(dir, file), data)
    }
    await fs.writeFile(
      path.join(dir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    )
    console.log(`fonts: downloaded ${files.length} PP Kyoto files`)
  } catch (error) {
    // Don't leave a partial set behind.
    await fs.rm(dir, { recursive: true, force: true })
    console.warn(
      `fonts: couldn't download PP Kyoto (${error.message}), using the open-source serif`,
    )
  }
}

await main()

import { promises as fs } from 'fs'
import { ImageResponse } from 'next/og'
import path from 'path'

import { OgCard, ogFonts, ogSize } from '@/app/_og'

export const alt = 'Thoughts'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Like a table of contents: how many pieces, over which years.
export default async function OpenGraphImage() {
  const dir = path.join(process.cwd(), 'app', 'thoughts', '_articles')
  const years: number[] = []
  for (const file of await fs.readdir(dir)) {
    if (!file.endsWith('.mdx')) continue
    const { metadata } = await import(`./_articles/${file}`)
    if (metadata.draft) continue
    const year = Number(metadata.date?.slice(0, 4))
    if (year) years.push(year)
  }

  return new ImageResponse(
    <OgCard
      title='Thoughts'
      description={`${years.length} pieces, ${Math.min(...years)}–${Math.max(...years)}.`}
      author='Shu Ding'
      collection='shud.in'
    />,
    { ...ogSize, fonts: ogFonts },
  )
}

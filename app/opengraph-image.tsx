import { ImageResponse } from 'next/og'

import { OgCard, ogFonts, ogSize } from './_og'
import * as home from './page.mdx'

// MDX types only declare the default export.
const { metadata } = home as unknown as {
  metadata: { title: string; description: string }
}

// Shared image for the homepage and any page without its own.
export const alt = 'Shu Ding'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <OgCard
      title={metadata.title}
      description={'Whispers in the sounds of silence.'}
    />,
    {
      ...ogSize,
      fonts: ogFonts,
    },
  )
}

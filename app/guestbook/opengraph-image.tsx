import { ImageResponse } from 'next/og'

import { OgCard, ogFonts, ogSize } from '@/app/_og'

export const alt = 'Guestbook'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <OgCard
      title='Guestbook'
      description='Leave a message.'
      author='Shu Ding'
      collection='shud.in'
    />,
    { ...ogSize, fonts: ogFonts },
  )
}

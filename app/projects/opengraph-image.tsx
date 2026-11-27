import { ImageResponse } from 'next/og'

import { OgCard, ogFonts, ogSize } from '@/app/_og'

export const alt = 'Projects'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <OgCard
      title='Projects'
      description='Over the years, I’ve had the privilege of working with talented teams on projects from open-source libraries to large-scale applications.'
      author='Shu Ding'
      collection='shud.in'
    />,
    { ...ogSize, fonts: ogFonts },
  )
}

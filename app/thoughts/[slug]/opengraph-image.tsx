import { ImageResponse } from 'next/og'

import { OgCard, ogFonts, ogSize } from '@/app/_og'

// export const alt = 'Article'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage(props: {
  params: Promise<{ slug: string }>
}) {
  const params = await props.params
  const { metadata } = await import(`../_articles/${params.slug}.mdx`)

  return new ImageResponse(
    <OgCard title={metadata.title + ' →'} description={metadata.description} />,
    {
      ...ogSize,
      fonts: ogFonts,
    },
  )
}

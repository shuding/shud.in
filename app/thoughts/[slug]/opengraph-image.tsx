import { ImageResponse } from 'next/og'

import { OgCard, ogFonts, ogSize } from '@/app/_og'

import { getArticleParams } from './params'

// Generated at build time for every article, like the page itself.
export const dynamicParams = false

export function generateStaticParams() {
  return getArticleParams()
}

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

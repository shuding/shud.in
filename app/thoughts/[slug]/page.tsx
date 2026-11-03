import cn from 'clsx'

import { getArticleParams } from './params'

// Every article is prerendered; anything else is a 404, so posts never render
// at request time.
export const dynamicParams = false

export default async function Page(props: {
  params: Promise<{
    slug: string
  }>
}) {
  const params = await props.params
  const { default: MDXContent, metadata } = await import(
    '../_articles/' + `${params.slug}.mdx`
  )

  return (
    <div
      className={cn(metadata.chinese && 'text-justify font-zh')}
      lang={metadata.chinese ? 'zh-Hans' : 'en'}
    >
      <MDXContent />
    </div>
  )
}

export function generateStaticParams() {
  return getArticleParams()
}

export async function generateMetadata(props: {
  params: Promise<{
    slug: string
  }>
}) {
  const params = await props.params
  const metadata = (await import('../_articles/' + `${params.slug}.mdx`))
    .metadata

  if (metadata.image) {
    return {
      title: metadata.title,
      description: metadata.description,
      openGraph: {
        images: [metadata.image],
      },
    }
  }

  return {
    title: metadata.title,
    description: metadata.description,
  }
}

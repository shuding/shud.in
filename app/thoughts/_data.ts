import { promises as fs } from 'fs'
import path from 'path'

import { isDemoName, type DemoName } from './_demos/names'

export type ThoughtItem = {
  slug: string
  title: string
  date: string
  demo?: DemoName
}

const articlesDirectory = path.join(
  process.cwd(),
  'app',
  'thoughts',
  '_articles'
)

// Published articles, newest first. Appendix articles come back separately so
// the list can show them last, below a divider.
export async function getThoughts() {
  const articles = await fs.readdir(articlesDirectory)

  const items: (ThoughtItem & { sort: number; appendix: boolean })[] = []
  for (const article of articles) {
    if (!article.endsWith('.mdx')) continue
    const module = await import('./_articles/' + article)

    if (!module.metadata) throw new Error('Missing `metadata` in ' + article)
    if (module.metadata.draft) continue

    const { demo } = module.metadata
    if (demo !== undefined && !isDemoName(demo)) {
      throw new Error(`Unknown demo "${demo}" in ${article}`)
    }

    items.push({
      slug: article.replace(/\.mdx$/, ''),
      title: module.metadata.title,
      date: module.metadata.date || '-',
      demo,
      sort: Number(module.metadata.date?.replaceAll('.', '') || 0),
      appendix: Boolean(module.metadata.appendix),
    })
  }
  items.sort((a, b) => b.sort - a.sort)

  const strip = ({ slug, title, date, demo }: ThoughtItem): ThoughtItem => ({
    slug,
    title,
    date,
    demo,
  })

  return {
    articles: items.filter((item) => !item.appendix).map(strip),
    appendix: items.filter((item) => item.appendix).map(strip),
  }
}

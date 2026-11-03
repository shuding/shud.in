import { promises as fs } from 'fs'
import path from 'path'

// One entry per article, shared by the page and its Open Graph image.
export async function getArticleParams() {
  const articles = await fs.readdir(
    path.join(process.cwd(), 'app', 'thoughts', '_articles'),
  )

  return articles
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => ({ slug: name.replace(/\.mdx$/, '') }))
}

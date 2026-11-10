import { promises as fs } from 'fs'
import path from 'path'

// Average reading speeds. Prose is counted in words, CJK text in characters.
// Readers skim code, so it counts at half weight, and every image, video,
// embed or interactive demo adds a short pause.
const WORDS_PER_MINUTE = 230
const CJK_CHARS_PER_MINUTE = 400
const CODE_WEIGHT = 0.5
const SECONDS_PER_MEDIA = 12

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu
const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu
const FENCE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm
// `<video`, `<img`, `<Image`, `<iframe`, Markdown images, and self-closing
// components such as `<CodePixels />`.
const MEDIA =
  /<(?:video|img|Image|iframe)\b|!\[[^\]]*\]\(|<[A-Z][\w.]*(?:\s[^<>]*)?\/>/g

function countWords(text: string) {
  return text.replace(CJK, ' ').match(WORD)?.length || 0
}

// Estimate from the MDX source rather than the rendered page, so the result
// is known while the post is prerendered and ships in its static HTML.
export function estimateReadingMinutes(source: string) {
  let body = source
    // The metadata export and module imports aren't read.
    .replace(/^export\s+const\s+metadata\s*=\s*\{[\s\S]*?^\}\s*$/m, '')
    .replace(/^(?:import|export)\s[^\n]*$/gm, '')

  let codeWords = 0
  body = body.replace(FENCE, (block) => {
    codeWords += countWords(block.split('\n').slice(1, -1).join('\n'))
    return ''
  })

  const media = body.match(MEDIA)?.length || 0

  const prose = body
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // MDX comments
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // keep link text, drop URLs
    .replace(/https?:\/\/\S+/g, '')
    .replace(/<[^<>]*>/g, ' ') // JSX and HTML tags, keeping their children

  const cjk = prose.match(CJK)?.length || 0
  const words = countWords(prose)

  return (
    words / WORDS_PER_MINUTE +
    (codeWords * CODE_WEIGHT) / WORDS_PER_MINUTE +
    cjk / CJK_CHARS_PER_MINUTE +
    (media * SECONDS_PER_MEDIA) / 60
  )
}

export async function getReadingMinutes(slug: string) {
  const source = await fs.readFile(
    path.join(process.cwd(), 'app', 'thoughts', '_articles', `${slug}.mdx`),
    'utf8',
  )
  return estimateReadingMinutes(source)
}

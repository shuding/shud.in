'use client'

import cn from 'clsx'
import { useEffect, useState } from 'react'

// gpu-lexer in miniature: a snippet arrives as plain text, split into the
// parts gpu-lexer sees (word runs, whitespace runs, single symbols), and then
// every part is labeled at once, the way the model labels them in parallel on
// the GPU. The strip below is the same snippet as a 1D image, one pixel per
// part. Each loop is a different language, since there's no grammar.
//
// The labels here are precomputed, not from the model.

type Label =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'type'
  | 'function'
  | 'operator'

const colors: Record<Label, string> = {
  plain: '#3b4149',
  comment: '#8c95a1',
  string: '#e54d2e',
  number: '#e5a000',
  keyword: '#8e4ec6',
  type: '#d6409f',
  function: '#0090ff',
  operator: '#12a594',
}

// Pixel colors match the code-pixels figure in the article: plain is gray.
const pixelColors: Record<Label, string> = { ...colors, plain: '#d8dbdf' }

const UNLABELED = '#b3b9c1'
const UNLABELED_PIXEL = '#ebedef'

const snippets = [
  `// greet everyone
const names = ['ada', 'linus']
for (const name of names) {
  console.log(\`hi \${name}\`, 42)
}`,
  `# fibonacci
def fib(n: int) -> int:
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)`,
  `fn main() {
    let n: u32 = (1..=10).sum();
    println!("{}", n);
}`,
]

const keywords = new Set([
  'const', 'let', 'for', 'of', 'def', 'if', 'return', 'fn', 'in', 'while',
])
const types = new Set(['int', 'u32'])

type Part = { text: string; label: Label; delay: number }

// Precompute the labels for the fixed snippets above.
function label(source: string): Part[][] {
  const parts = source.match(/\n|[^\S\n]+|[A-Za-z_]\w*|\d+|./g) ?? []
  const lines: Part[][] = [[]]
  let quote = ''
  let comment = false

  parts.forEach((text, i) => {
    if (text === '\n') {
      comment = false
      lines.push([])
      return
    }
    const next = parts.slice(i + 1).find((p) => !/^\s+$/.test(p))
    let kind: Label = 'plain'
    if (comment || ((text === '/' && next === '/') || text === '#')) {
      comment = true
      kind = 'comment'
    } else if (quote) {
      kind = 'string'
      if (text === quote) quote = ''
    } else if (text === '"' || text === "'" || text === '`') {
      quote = text
      kind = 'string'
    } else if (/^\s+$/.test(text)) {
      kind = 'plain'
    } else if (keywords.has(text)) {
      kind = 'keyword'
    } else if (types.has(text)) {
      kind = 'type'
    } else if (/^\d/.test(text)) {
      kind = 'number'
    } else if (/^[A-Za-z_]/.test(text) && (next === '(' || next === '!')) {
      kind = 'function'
    } else if (/^[^\w\s]$/.test(text)) {
      kind = 'operator'
    }
    // Each part lands at its own moment within a short window, in no
    // particular order: parallel, not left to right.
    const delay = Math.round(((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 420)
    lines[lines.length - 1].push({ text, label: kind, delay })
  })
  return lines
}

const labeled = snippets.map(label)

// At rest (paused) the demo is the first snippet in plain gray. Playing labels
// it right away, then loops through the snippets. Pausing fades the colors
// back out, or, on a later snippet, swaps back to the first one.
type Phase = 'rest' | 'enter' | 'plain' | 'labeled' | 'exit'

const timings: Record<Exclude<Phase, 'rest'>, number> = {
  enter: 50,
  plain: 900,
  labeled: 3200,
  exit: 450,
}

export default function Highlight({
  paused = false,
  className,
}: {
  paused?: boolean
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>(paused ? 'rest' : 'labeled')
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setReducedMotion(matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (!paused) {
      // Replay from the gray first snippet: label it right away.
      setPhase('labeled')
    } else {
      setPhase((phase) =>
        phase === 'exit' ? phase : index === 0 ? 'rest' : 'exit',
      )
    }
    // Only react to pausing and playing.
  }, [paused])

  useEffect(() => {
    if (phase === 'rest' || reducedMotion) return
    const timer = setTimeout(() => {
      if (phase === 'exit') {
        setIndex(paused ? 0 : (index + 1) % labeled.length)
        setPhase('enter')
      } else if (phase === 'enter') {
        setPhase(paused ? 'rest' : 'plain')
      } else if (!paused) {
        setPhase(phase === 'plain' ? 'labeled' : 'exit')
      }
    }, timings[phase])
    return () => clearTimeout(timer)
  }, [paused, reducedMotion, phase, index])

  const lines = labeled[reducedMotion ? 0 : index]
  const isLabeled = reducedMotion
    ? !paused
    : phase === 'labeled' || phase === 'exit'
  const isShown = reducedMotion || phase !== 'enter'

  return (
    <div
      className={cn(
        // 13px in the 320px preview, smaller in narrower frames (the longest
        // line is ~20em wide).
        'flex flex-col items-center justify-center font-mono text-[min(13px,4.1cqw)] leading-[1.46] select-none',
        className,
      )}
      role='img'
      aria-label='A code snippet in plain gray, then every part of it highlighted at once.'
    >
      <div
        className={cn(
          'w-fit transition-[opacity,translate] duration-450 ease-out',
          phase === 'exit' && !reducedMotion
            ? 'opacity-0 -translate-y-1'
            : isShown
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-1',
        )}
      >
        <div className='whitespace-pre'>
          {lines.map((parts, row) => (
            <div key={row}>
              {parts.map((part, i) => (
                <span
                  key={i}
                  className='transition-colors duration-300'
                  style={{
                    color: isLabeled ? colors[part.label] : UNLABELED,
                    transitionDelay: isLabeled ? `${part.delay}ms` : '0ms',
                  }}
                >
                  {part.text}
                </span>
              ))}
              {parts.length ? null : ' '}
            </div>
          ))}
        </div>
        <div
          className='mt-4 grid h-[3px] gap-px'
          style={{
            gridTemplateColumns: `repeat(${lines.flat().length}, minmax(0, 1fr))`,
          }}
        >
          {lines.flat().map((part, i) => (
            <span
              key={i}
              className='transition-colors duration-300'
              style={{
                backgroundColor: isLabeled
                  ? pixelColors[part.label]
                  : UNLABELED_PIXEL,
                transitionDelay: isLabeled ? `${part.delay}ms` : '0ms',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

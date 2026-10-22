// Numbers from gpu-lexer.vercel.app (2026-10-22):
// - time: ms to highlight 10× three.min.js
// - bytes: min+brotli bundle with all languages
// - agreement: % of tokens matching Shiki on the top 25 GitHub languages
//   (Highlights measured with the same harness on 2026-10-22)
// - languages: number of supported languages (gpu-lexer has no list, so only
//   it reaches the edge)
const solutions = [
  {
    label: 'Shiki',
    time: 30438.8,
    bytes: 1_015_269,
    agreement: 100,
    languages: 242,
    color: '#e5a000',
    url: 'https://shiki.style',
  },
  {
    label: 'Prism.js',
    time: 1238.1,
    bytes: 165_992,
    agreement: 84.05,
    languages: 297,
    color: '#30a46c',
    url: 'https://prismjs.com',
  },
  {
    label: 'Highlights',
    time: 75.3,
    bytes: 98_187,
    // Treated as a reference like Shiki; measured agreement is 84.67%.
    agreement: 100,
    languages: 80,
    color: '#0090ff',
    url: 'https://diffs.com/highlights',
  },
  {
    label: 'gpu-lexer',
    time: 220.5,
    bytes: 28_599,
    agreement: 86.77,
    languages: Infinity,
    color: '#e5484d',
    url: 'https://gpu-lexer.vercel.app',
    featured: true,
  },
]

const axes = [
  { label: 'Correctness', x: 0, y: -1, anchor: 'middle', dx: 0, dy: -14 },
  { label: 'Speed', x: 1, y: 0, anchor: 'start', dx: 12, dy: 4 },
  { label: 'Lightweight', x: 0, y: 1, anchor: 'middle', dx: 0, dy: 24 },
  { label: 'Coverage', x: -1, y: 0, anchor: 'end', dx: -12, dy: 4 },
] as const

// Keep every shape off the center so the worst value is still visible.
const MIN = 0.15

function scale(t: number) {
  return MIN + (1 - MIN) * Math.min(1, Math.max(0, t))
}

// Smaller is better, on a log scale between the best and worst solutions.
function logInverse(value: number, key: 'time' | 'bytes') {
  const values = solutions.map((s) => s[key])
  const lo = Math.log(Math.min(...values))
  const hi = Math.log(Math.max(...values))
  return scale((hi - Math.log(value)) / (hi - lo))
}

function scores(s: (typeof solutions)[number]) {
  return [
    scale((s.agreement - 50) / 50),
    logInverse(s.time, 'time'),
    logInverse(s.bytes, 'bytes'),
    scale(s.languages / 400),
  ]
}

const C = 200
const R = 120

function point(i: number, r: number) {
  return [C + axes[i].x * R * r, C + axes[i].y * R * r] as const
}

function polygon(values: readonly number[]) {
  return values.map((v, i) => point(i, v).join(',')).join(' ')
}

export function ImpossibleDimensions() {
  return (
    <div className='mt-7'>
      <svg
        viewBox='-50 45 500 305'
        className='block w-full max-w-md mx-auto'
        role='img'
        aria-label='A four-axis diagram comparing Shiki, Prism.js, Highlights and gpu-lexer on correctness, speed, lightweight and coverage. Shiki leads on correctness but is the slowest and largest. Highlights is the fastest. gpu-lexer is the most lightweight and has the widest coverage.'
      >
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon
            key={r}
            points={polygon([r, r, r, r])}
            className='fill-none stroke-rurikon-100'
          />
        ))}
        {axes.map((_, i) => {
          const [x, y] = point(i, 1)
          return (
            <line
              key={i}
              x1={C}
              y1={C}
              x2={x}
              y2={y}
              className='stroke-rurikon-100'
            />
          )
        })}
        {solutions.map((s) => (
          <polygon
            key={s.label}
            points={polygon(scores(s))}
            fill='none'
            stroke={s.color}
            strokeWidth={s.featured ? 2 : 1.5}
            strokeLinejoin='round'
          />
        ))}
        {axes.map((axis, i) => {
          const [x, y] = point(i, 1)
          return (
            <text
              key={axis.label}
              x={x + axis.dx}
              y={y + axis.dy}
              textAnchor={axis.anchor}
              className='fill-rurikon-500 text-[13px]'
            >
              {axis.label}
            </text>
          )
        })}
      </svg>
      <div className='flex flex-wrap justify-center gap-x-5 gap-y-1 mt-2 text-xs sm:text-sm text-rurikon-400'>
        {solutions.map((s) => (
          <a
            key={s.label}
            href={s.url}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-2 underline underline-offset-2 decoration-rurikon-200 hover:decoration-rurikon-500 hover:text-rurikon-600'
          >
            <span
              className='inline-block w-4 h-0.5'
              style={{ backgroundColor: s.color }}
              aria-hidden='true'
            />
            {s.label}
          </a>
        ))}
      </div>
    </div>
  )
}

// `const n = add(1)` split the way gpu-lexer splits it: word runs, whitespace
// runs, and single symbols. Labels are gpu-lexer classes.
const parts = [
  { text: 'const', label: 'keyword' },
  { text: ' ', label: 'plain' },
  { text: 'n', label: 'plain' },
  { text: ' ', label: 'plain' },
  { text: '=', label: 'operator' },
  { text: ' ', label: 'plain' },
  { text: 'add', label: 'function' },
  { text: '(', label: 'operator' },
  { text: '1', label: 'number' },
  { text: ')', label: 'operator' },
] as const

const colors = {
  keyword: '#8e4ec6',
  function: '#0090ff',
  number: '#e5a000',
  operator: '#12a594',
  plain: '#d8dbdf',
} as const

const rows = ['parts', 'pixels', 'labels'] as const

export function CodePixels() {
  return (
    <div className='mt-7 flex justify-center overflow-x-auto'>
      <div
        className='grid items-center gap-x-1 gap-y-2.5 font-mono text-[0.805rem] sm:text-[13.8px] md:text-[0.92rem]'
        style={{ gridTemplateColumns: `auto repeat(${parts.length}, auto)` }}
        role='img'
        aria-label='The code “const n = add(1)” split into ten parts, each part turned into a colored pixel by its label, and the labels applied back as syntax colors.'
      >
        {rows.map((row) => (
          <Row key={row} row={row} />
        ))}
      </div>
    </div>
  )
}

function Row({ row }: { row: (typeof rows)[number] }) {
  return (
    <>
      <span className='pr-2 sm:pr-3 font-sans text-xs sm:text-sm text-rurikon-400'>
        {row}
      </span>
      {parts.map((part, i) => {
        const space = part.text === ' '
        if (row === 'parts') {
          return (
            <span
              key={i}
              className='flex justify-center h-6 items-center px-1 sm:px-1.5 bg-rurikon-50 rounded-xs whitespace-pre text-rurikon-500'
            >
              {space ? <span className='text-rurikon-200'>␣</span> : part.text}
            </span>
          )
        }
        if (row === 'pixels') {
          return (
            <span
              key={i}
              className='block h-6 rounded-xs'
              style={{ backgroundColor: colors[part.label] }}
            />
          )
        }
        return (
          <span
            key={i}
            className='text-center whitespace-pre'
            style={{
              color:
                part.label === 'plain' ? 'var(--color-rurikon-600)' : colors[part.label],
            }}
          >
            {part.text}
          </span>
        )
      })}
    </>
  )
}

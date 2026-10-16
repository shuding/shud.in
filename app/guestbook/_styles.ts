import cn from 'clsx'

export const controlClassName = cn(
  'rounded-sm border border-rurikon-border bg-white p-1.5 text-sm leading-5',
  'outline-none focus-visible:border-rurikon-200 transition-colors',
)

export const inputClassName = cn(
  controlClassName,
  'block w-full text-rurikon-600 placeholder:text-rurikon-300 focus:border-rurikon-200',
)

export const buttonClassName = cn(
  controlClassName,
  'shrink-0 text-rurikon-500 hover:border-rurikon-400 hover:text-rurikon-700 disabled:border-rurikon-border disabled:text-rurikon-300 py-1 px-3 select-none',
)

export const dangerButtonClassName = cn(
  controlClassName,
  'shrink-0 text-rurikon-500 hover:border-red-300 hover:text-red-700 py-1 px-3 select-none',
)

export function formatDate(iso: string) {
  // Format in UTC so the server and client render the same string.
  return iso.slice(0, 10).replaceAll('-', '.')
}

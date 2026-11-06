'use client'

import cn from 'clsx'
import { useEffect, useState } from 'react'

// Average reading speeds. Latin text is counted in words, CJK text in
// characters; every image, video or embed adds a short pause.
const WORDS_PER_MINUTE = 230
const CJK_CHARS_PER_MINUTE = 400
const SECONDS_PER_MEDIA = 12
// Posts shorter than this don't need a progress indicator.
const MIN_MINUTES = 2

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu
const WORD = /[\p{L}\p{N}]+(?:['’]\p{L}+)*/gu

function estimateMinutes(el: HTMLElement) {
  const text = el.textContent || ''
  const cjk = text.match(CJK)?.length || 0
  const words = text.replace(CJK, ' ').match(WORD)?.length || 0
  const media = el.querySelectorAll('img, video, iframe, canvas').length

  return (
    words / WORDS_PER_MINUTE +
    cjk / CJK_CHARS_PER_MINUTE +
    (media * SECONDS_PER_MEDIA) / 60
  )
}

// How far the reader is through the article itself, not the page: 0 while its
// top is at or below the top of the viewport, 1 once its bottom reaches the
// bottom of the viewport.
function measureProgress(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const scrollable = rect.height - window.innerHeight
  if (scrollable <= 0) return 1
  return Math.min(1, Math.max(0, -rect.top / scrollable))
}

export function ReadingProgress({ targetId }: { targetId: string }) {
  // `null` until measured after hydration: the prerendered HTML only reserves
  // the space, so nothing shifts or mismatches when the pill appears.
  const [minutes, setMinutes] = useState<number | null>(null)
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el) return

    let frame = 0
    const update = () => {
      frame = 0
      const next = Math.round(measureProgress(el) * 100)
      setPercent((prev) => (prev === next ? prev : next))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    setMinutes(estimateMinutes(el))
    update()

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Images, videos and embeds change the article's height as they load.
    const observer = new ResizeObserver(schedule)
    observer.observe(el)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [targetId])

  const visible = minutes !== null && minutes >= MIN_MINUTES
  const total = Math.max(1, Math.round(minutes || 0))
  const done = percent >= 100
  // Never claim "0 min left" before the end.
  const left = Math.max(1, Math.ceil(total * (1 - percent / 100)))
  const label = done ? 'Finished' : `${left} min left`
  const valueText = done
    ? `${percent}% read, finished`
    : `${percent}% read, ${left} ${left === 1 ? 'minute' : 'minutes'} left`

  return (
    // In flow right after the article and sticky to the bottom of the
    // viewport: the pill only exists while the article is on screen, and comes
    // to rest under its last line. It has no controls, so it never blocks
    // clicks or text selection underneath.
    <div
      className='pointer-events-none sticky bottom-6 sm:bottom-10 md:bottom-14 z-20 mt-7 h-8 flex justify-center'
      data-reading-progress
    >
      {visible ? (
        <div
          role='group'
          aria-label='Reading progress'
          className={cn(
            'flex items-center gap-3 w-[min(320px,calc(100%-32px))] min-h-8 px-4 py-1',
            'rounded-full border border-rurikon-500/10',
            'shadow-[0_1px_2px_rgb(0_0_0/.04),0_4px_12px_rgb(0_0_0/.06)]',
            'font-sans text-[13px] leading-5 text-rurikon-500 tracking-normal',
            // Frosted where the browser can blur, solid where it can't or
            // when the reader asks for less transparency.
            'bg-[#fcfcfc]/94',
            'supports-[backdrop-filter:blur(1px)]:bg-[#fcfcfc]/70',
            'supports-[backdrop-filter:blur(1px)]:backdrop-blur-md',
            'supports-[backdrop-filter:blur(1px)]:backdrop-saturate-140',
            '[@media(prefers-reduced-transparency:reduce)]:bg-[#fcfcfc]',
            '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
            'motion-safe:animate-[reading-progress-in_240ms_cubic-bezier(0.23,1,0.32,1)_both]',
            'motion-reduce:animate-[reading-progress-fade_150ms_ease_both]',
          )}
        >
          <div
            role='progressbar'
            aria-label='Article read'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={valueText}
            className='flex-1 min-w-16 h-0.5 rounded-full bg-rurikon-500/15 overflow-hidden'
          >
            <div
              className={cn(
                'h-full w-full rounded-full bg-[#0070f3] origin-left',
                'motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out',
              )}
              style={{ transform: `scaleX(${percent / 100})` }}
            />
          </div>
          <span
            className='inline-flex items-baseline gap-1 tabular-nums whitespace-nowrap'
            aria-hidden='true'
          >
            <span className='font-medium'>{percent}%</span>
            <span className='text-rurikon-400'>·</span>
            {label}
          </span>
        </div>
      ) : null}
    </div>
  )
}

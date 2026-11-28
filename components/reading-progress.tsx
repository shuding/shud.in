'use client'

import type { ReactNode } from 'react'
import cn from 'clsx'
import { useEffect, useRef, useState } from 'react'

// Posts shorter than this don't need a progress indicator.
const MIN_MINUTES = 2

// How far the reader is through the article itself, not the page: 0 while its
// top is at or below the top of the viewport, 1 once its last line clears the
// bar at the bottom of the viewport.
function measureProgress(content: HTMLElement, bar: HTMLElement) {
  const rect = content.getBoundingClientRect()
  const scrollable =
    rect.height - (window.innerHeight - bar.getBoundingClientRect().height)
  if (scrollable <= 0) return 1
  return Math.min(1, Math.max(0, -rect.top / scrollable))
}

export function ReadingProgress({
  minutes,
  className,
  lang,
  children,
}: {
  // Estimated at build time from the post's source (see reading-time.ts).
  minutes: number
  className?: string
  lang?: string
  children: ReactNode
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  // Starts at 0 so the prerendered HTML already reads "6 min left", which is
  // true at the top of the post and needs no JavaScript.
  const [percent, setPercent] = useState(0)

  const enabled = Number.isFinite(minutes) && minutes >= MIN_MINUTES

  useEffect(() => {
    const content = contentRef.current
    const bar = barRef.current
    if (!enabled || !content || !bar) return

    let frame = 0
    const update = () => {
      frame = 0
      const next = Math.round(measureProgress(content, bar) * 100)
      setPercent((prev) => (prev === next ? prev : next))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Images, videos and demos change the article's height as they load.
    const observer = new ResizeObserver(schedule)
    observer.observe(content)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [enabled])

  const total = Math.max(1, Math.round(minutes))
  const done = percent >= 100
  // Never claim "0 min left" before the end.
  const left = Math.max(1, Math.ceil(total * (1 - percent / 100)))
  const label = done ? 'Finished' : `${left} min left`
  const valueText = done
    ? 'Finished reading'
    : `${percent}% read, ${left} ${left === 1 ? 'minute' : 'minutes'} left`

  return (
    <div className={className} lang={lang}>
      <div ref={contentRef}>{children}</div>
      {enabled ? (
        // In flow right after the article and sticky to the bottom of the
        // viewport, so the bar spans the article column, only shows while the
        // article is on screen, and comes to rest under its last line. It has
        // no controls, so it never blocks clicks or text selection.
        <div
          ref={barRef}
          lang='en'
          className={cn(
            'pointer-events-none select-none print:hidden',
            'sticky bottom-0 z-20 mt-7 pt-5 pb-4 sm:pb-6',
            // Fade the text out underneath so the bar stays legible.
            'bg-linear-to-t from-[#fcfcfc] from-55% to-[#fcfcfc]/0',
          )}
          data-reading-progress
        >
          <div
            role='progressbar'
            aria-label='Reading progress'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={valueText}
            className='flex items-center gap-3'
          >
            <div className='relative flex-1 h-0.5 rounded-full bg-rurikon-100 overflow-hidden'>
              <div
                className={cn(
                  'absolute inset-0 rounded-full bg-[#0070f3] origin-left',
                  // Scrolling moves the bar 1:1. The short ease only smooths
                  // jumps from keys like Page Down or Home.
                  'motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out',
                )}
                style={{ transform: `scaleX(${percent / 100})` }}
              />
            </div>
            <span
              aria-hidden='true'
              className='min-w-[9ch] text-right font-sans text-xs leading-5 tabular-nums whitespace-nowrap text-rurikon-400 tracking-normal'
            >
              <span
                key={label}
                className='inline-block motion-safe:animate-[reading-progress-label_200ms_cubic-bezier(0.23,1,0.32,1)]'
              >
                {label}
              </span>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

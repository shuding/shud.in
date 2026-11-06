'use client'

import cn from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'

// Average reading speeds. Latin text is counted in words, CJK text in
// characters; every image, video or embed adds a short pause.
const WORDS_PER_MINUTE = 230
const CJK_CHARS_PER_MINUTE = 400
const SECONDS_PER_MEDIA = 12
// Posts shorter than this don't need a progress indicator.
const MIN_MINUTES = 2

const STORAGE_KEY = 'reading-progress'
type Mode = 'expanded' | 'minimized'

function readMode(): Mode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'minimized'
      ? 'minimized'
      : 'expanded'
  } catch {
    // Storage can be unavailable (privacy modes); fall back to the default.
    return 'expanded'
  }
}

function writeMode(mode: Mode) {
  try {
    if (mode === 'minimized') localStorage.setItem(STORAGE_KEY, mode)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

function estimateMinutes(el: HTMLElement) {
  const text = el.textContent || ''
  const cjk = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu)
  const words = text
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, ' ')
    .match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu)
  const media = el.querySelectorAll('img, video, iframe, canvas').length

  return (
    (words?.length || 0) / WORDS_PER_MINUTE +
    (cjk?.length || 0) / CJK_CHARS_PER_MINUTE +
    (media * SECONDS_PER_MEDIA) / 60
  )
}

// How far the reader has scrolled through the element itself (not the page):
// 0 when its top reaches the top of the viewport, 1 when its bottom reaches the
// bottom of the viewport.
function measureProgress(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const scrollable = rect.height - window.innerHeight
  if (scrollable <= 0) return 1
  return Math.min(1, Math.max(0, -rect.top / scrollable))
}

export function ReadingProgress({ targetId }: { targetId: string }) {
  // `null` until measured on the client, so nothing flashes during hydration.
  const [minutes, setMinutes] = useState<number | null>(null)
  const [percent, setPercent] = useState(0)
  const [mode, setMode] = useState<Mode | null>(null)
  // Toggling swaps the button under the cursor; move keyboard focus with it.
  const restoreFocus = useRef(false)
  const groupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!restoreFocus.current) return
    restoreFocus.current = false
    groupRef.current?.querySelector('button')?.focus()
  }, [mode])

  useEffect(() => {
    setMode(readMode())

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

    try {
      setMinutes(estimateMinutes(el))
    } catch {
      // If the article can't be measured, keep the indicator hidden.
      return
    }
    update()

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Images and embeds change the article height as they load.
    const observer = new ResizeObserver(schedule)
    observer.observe(el)

    // Keep the preference in sync across tabs.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setMode(readMode())
    }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('storage', onStorage)
      observer.disconnect()
    }
  }, [targetId])

  const toggle = useCallback(() => {
    restoreFocus.current = true
    setMode((prev) => {
      const next = prev === 'minimized' ? 'expanded' : 'minimized'
      writeMode(next)
      return next
    })
  }, [])

  const ready = minutes !== null && mode !== null && minutes >= MIN_MINUTES
  const total = Math.max(1, Math.round(minutes || 0))
  const left = Math.ceil(total * (1 - percent / 100))
  const done = percent >= 100 || left <= 0
  const label = done ? 'Finished' : `${left} min left`
  const valueText = done
    ? `${percent}% read, finished`
    : `${percent}% read, ${left} ${left === 1 ? 'minute' : 'minutes'} left`

  return (
    // In-flow at the end of the article and sticky to the bottom of the
    // viewport, so the indicator only exists while the article is on screen
    // and comes to rest right after its last line.
    <div
      className='sticky bottom-6 sm:bottom-10 md:bottom-14 z-20 mt-7 h-7 flex justify-end items-end pointer-events-none'
      data-reading-progress
    >
      {ready ? (
        <div
          key={mode}
          ref={groupRef}
          role='group'
          aria-label='Reading progress'
          className={cn(
            'pointer-events-auto relative flex items-center bg-[#fcfcfc] text-rurikon-400 font-sans',
            'motion-safe:animate-[reading-progress-in_200ms_cubic-bezier(0.23,1,0.32,1)_both]',
            'motion-reduce:animate-[reading-progress-fade_150ms_ease_both]',
            mode === 'expanded' && 'h-7 pl-2.5 border border-rurikon-border',
          )}
        >
          <div
            role='progressbar'
            aria-label='Read so far'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={valueText}
            className={cn(
              'overflow-hidden bg-rurikon-100',
              mode === 'expanded'
                ? 'absolute -top-px -left-px -right-px h-px'
                : 'w-10 h-0.5',
            )}
          >
            <div
              className='h-full w-full bg-[#0070f3] origin-left motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out'
              style={{ transform: `scaleX(${percent / 100})` }}
            />
          </div>
          {mode === 'expanded' ? (
            <>
              <span className='text-xs leading-5 font-medium tabular-nums whitespace-nowrap'>
                {label}
              </span>
              <button
                type='button'
                onClick={toggle}
                aria-label='Minimize reading progress'
                className={cn(
                  'flex-none inline-flex items-center justify-center w-7 h-full',
                  'text-rurikon-300 hover:text-rurikon-600 transition-colors cursor-pointer',
                  'focus-visible:outline focus-visible:outline-dotted focus-visible:outline-rurikon-400 focus-visible:-outline-offset-2',
                )}
              >
                <svg
                  width='10'
                  height='10'
                  viewBox='0 0 16 16'
                  fill='none'
                  aria-hidden='true'
                >
                  <path
                    d='M4 4l8 8M12 4l-8 8'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='square'
                  />
                </svg>
              </button>
            </>
          ) : (
            // Minimized: just the bar. The whole bar is a 28px hit target
            // that brings the minutes back.
            <button
              type='button'
              onClick={toggle}
              aria-label={`Show reading progress, ${label}`}
              title={label}
              className={cn(
                'absolute -inset-x-1 -inset-y-[13px] cursor-pointer',
                'focus-visible:outline focus-visible:outline-dotted focus-visible:outline-rurikon-400',
              )}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

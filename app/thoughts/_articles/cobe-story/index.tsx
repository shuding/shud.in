'use client'

import cn from 'clsx'
import { useEffect, useRef, useState } from 'react'

import { StoryGlobe, type Look } from './globe'

// A scrollytelling frame for "The Making of COBE". <Story> pins one live globe
// beside the text (in the margin on wide screens, at the top of the column
// otherwise), and every <Step> it passes moves the globe to that stage.

const base: Look = {
  land: 0,
  dots: 1,
  mask: 1,
  fib: 0,
  light: 0,
  markers: 0,
  theta: 0.3,
}

const stages = {
  map: { label: 'A sphere and a map', look: { ...base, land: 1, dots: 0, mask: 0 } },
  lattice: { label: 'A lattice of dots', look: { ...base, mask: 0 } },
  multiply: { label: 'Land × dots', look: base },
  shrink: { label: 'A tiny map', look: base, control: 'map' },
  poles: { label: 'Crowded poles', look: { ...base, theta: 1.05 } },
  fibonacci: {
    label: 'Spherical Fibonacci',
    look: { ...base, fib: 1, theta: 1.05 },
    control: 'lattice',
  },
  light: { label: 'Light and glow', look: { ...base, fib: 1, light: 1 } },
  markers: {
    label: 'Markers',
    look: { ...base, fib: 1, light: 1, markers: 1 },
  },
} satisfies Record<
  string,
  { label: string; look: Look; control?: 'map' | 'lattice' }
>

type Stage = keyof typeof stages
const order = Object.keys(stages) as Stage[]

const MAP_SIZES = [256, 128, 64, 32]
const DOTS = { min: 1000, max: 12000, initial: 4000 }

export function Step({
  stage,
  children,
}: {
  stage: Stage
  children: React.ReactNode
}) {
  return <section data-stage={stage}>{children}</section>
}

export function Story({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Stage>('map')
  const [mapRes, setMapRes] = useState(256)
  const [lattice, setLattice] = useState<'latlong' | 'fibonacci'>('fibonacci')
  const [dotCount, setDotCount] = useState(DOTS.initial)

  // The current step is the last one whose top has passed a line at 55% of
  // the viewport. Near the end of the page the line slides down to the
  // bottom, so short steps at the end still get their turn.
  useEffect(() => {
    const steps = [...ref.current!.querySelectorAll<HTMLElement>('[data-stage]')]
    let frame = 0
    const update = () => {
      frame = 0
      const remaining =
        document.documentElement.scrollHeight - innerHeight - scrollY
      const line =
        innerHeight * 0.55 + Math.max(0, innerHeight * 0.45 - remaining)
      let current = steps[0]
      for (const step of steps) {
        if (step.getBoundingClientRect().top < line) current = step
      }
      setStage(current.dataset.stage as Stage)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
    }
  }, [])

  // Controls belong to their stage: leaving it puts things back.
  useEffect(() => {
    if (stage !== 'shrink') setMapRes(256)
    if (stage !== 'fibonacci') {
      setLattice('fibonacci')
      setDotCount(DOTS.initial)
    }
  }, [stage])

  const { label, look, control } = stages[stage] as (typeof stages)[Stage] & {
    control?: 'map' | 'lattice'
  }
  const shownLook =
    stage === 'fibonacci'
      ? { ...look, fib: lattice === 'fibonacci' ? 1 : 0 }
      : look

  return (
    <div ref={ref} className='relative mt-7'>
      <div
        className={cn(
          // Pinned at the top of the column, over the text that scrolls by.
          'sticky top-0 z-10 -mx-1 px-1 pt-6 sm:pt-10 md:pt-14 pb-4 bg-[var(--background)]',
          // In the margin on wide screens, pinned while its story scrolls.
          'min-[1280px]:absolute min-[1280px]:top-0 min-[1280px]:bottom-0 min-[1280px]:left-[calc(100%+3.5rem)] min-[1280px]:mx-0 min-[1280px]:w-80 min-[1280px]:p-0 min-[1280px]:bg-transparent',
        )}
      >
        <div className='min-[1280px]:sticky min-[1280px]:top-14'>
          <div className='demo-frame relative aspect-video max-h-[38vh] w-full min-[1280px]:max-h-none cursor-grab active:cursor-grabbing'>
            <StoryGlobe
              look={shownLook}
              mapRes={mapRes}
              dotCount={dotCount}
              className='absolute inset-0 size-full'
            />
          </div>
          {/* Two fixed rows, so the pinned block never changes height. */}
          <div className='mt-2 text-xs leading-6 text-rurikon-300'>
            <div className='tabular-nums'>
              {order.indexOf(stage) + 1}/{order.length}
              <span className='mx-1.5 text-rurikon-200'>·</span>
              <span className='text-rurikon-500'>{label}</span>
            </div>
            <div className='flex h-6 items-center'>
            {control === 'map' ? (
              <Choices
                label='Map size'
                options={MAP_SIZES.map((size) => ({
                  value: size,
                  label: `${size}×${size / 2}`,
                }))}
                value={mapRes}
                onChange={setMapRes}
              />
            ) : control === 'lattice' ? (
              <span className='flex items-center gap-3'>
                <Choices
                  label='Lattice'
                  options={[
                    { value: 'latlong', label: 'lat/long' },
                    { value: 'fibonacci', label: 'fibonacci' },
                  ]}
                  value={lattice}
                  onChange={setLattice}
                />
                <label className='flex items-center gap-1.5 tabular-nums'>
                  <span className='sr-only'>Dots</span>
                  <input
                    type='range'
                    min={DOTS.min}
                    max={DOTS.max}
                    step={1000}
                    value={dotCount}
                    onChange={(event) => setDotCount(Number(event.target.value))}
                    className='w-16 accent-rurikon-500'
                  />
                  <span className='w-9 text-right'>
                    {Math.round(dotCount / 1000)}k
                  </span>
                </label>
              </span>
            ) : null}
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

function Choices<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <span role='group' aria-label={label} className='flex gap-2.5'>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'tabular-nums transition-colors hover:text-rurikon-600 focus-visible:outline focus-visible:outline-dotted focus-visible:outline-rurikon-400',
            option.value === value ? 'text-rurikon-700' : 'text-rurikon-300',
          )}
        >
          {option.label}
        </button>
      ))}
    </span>
  )
}

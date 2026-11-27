'use client'

import cn from 'clsx'
import Link from 'next/link'
import { useRef, useState } from 'react'

import type { ThoughtItem } from './_data'
import { demos, preloadDemos } from './_demos'
import type { DemoName } from './_demos/names'

type Active = { slug: string; x: number; y: number; demo: DemoName }

// Must match the preview's height (and `.safe-triangle` in globals.css).
const PREVIEW_HEIGHT = 180
// How long the pointer may rest inside the safe triangle before the row under
// it takes over.
const REST_DELAY = 150
// After the dot has been hidden this long, it reappears in place instead of
// gliding over from where it was.
const GLIDE_WINDOW = 800

const GLIDE =
  'duration-500 ease-[cubic-bezier(0.2,0.9,0.1,1)] motion-reduce:transition-none'

// The article index. Articles with a live demo carry a blue ring. Hovering or
// focusing one fills it with a blue dot (the favicon) that glides between
// them, and on wide screens previews the demo in the margin.
//
// Hover styles stay in CSS. The only per-move work is writing the pointer
// position to CSS variables for the safe triangle (see `.safe-triangle` in
// globals.css).
export function ThoughtList({ groups }: { groups: ThoughtItem[][] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const restTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hiddenAt = useRef(0)
  // The last active row is kept while hidden, so the dot and the preview fade
  // out where they are.
  const [active, setActive] = useState<Active | null>(null)
  const [visible, setVisible] = useState(false)
  const [instant, setInstant] = useState(true)
  // Previews stay mounted once shown, so they can fade out and don't restart.
  const [mounted, setMounted] = useState<DemoName[]>([])

  function activate(item: ThoughtItem, mark: HTMLElement | null) {
    if (!item.demo || !mark) return deactivate()

    const container = containerRef.current!
    const box = container.getBoundingClientRect()
    const rect = mark.getBoundingClientRect()
    const y = rect.top - box.top

    // Centered on the row, but never above the top of the list. The preview
    // opens from its left edge, level with the dot.
    const center = y + rect.height / 2
    const previewTop = Math.max(0, center - PREVIEW_HEIGHT / 2)
    container.style.setProperty('--preview-top', `${previewTop}px`)
    container.style.setProperty('--origin-y', `${center - previewTop}px`)
    setInstant(
      !visible &&
        (!active || performance.now() - hiddenAt.current > GLIDE_WINDOW),
    )
    setVisible(true)
    setActive({ slug: item.slug, x: rect.left - box.left, y, demo: item.demo })
    if (!mounted.includes(item.demo)) setMounted([...mounted, item.demo])
  }

  function deactivate() {
    if (visible) hiddenAt.current = performance.now()
    setVisible(false)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return
    const container = event.currentTarget
    clearTimeout(restTimer.current)

    if ((event.target as Element).classList.contains('safe-triangle')) {
      // Crossing the triangle towards the preview keeps the current row,
      // unless the pointer comes to rest.
      restTimer.current = setTimeout(() => {
        container.dataset.resting = ''
      }, REST_DELAY)
      return
    }

    delete container.dataset.resting
    const box = container.getBoundingClientRect()
    container.style.setProperty('--pointer-x', `${event.clientX - box.left}px`)
    container.style.setProperty('--pointer-y', `${event.clientY - box.top}px`)
  }

  return (
    <div
      ref={containerRef}
      className='relative'
      onPointerEnter={preloadDemos}
      onPointerMove={onPointerMove}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return
        clearTimeout(restTimer.current)
        deactivate()
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) deactivate()
      }}
    >
      {groups.map((items, index) => (
        <div key={index}>
          {index > 0 ? <hr className='my-7 border-0' /> : null}
          <ul>
            {items.map((item) => (
              <Row
                key={item.slug}
                item={item}
                isActive={visible && active?.slug === item.slug}
                onActivate={activate}
              />
            ))}
          </ul>
        </div>
      ))}

      {/* The traveling dot. The outer span moves, the inner one appears. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-0 left-0 size-2',
          !instant && ['transition-transform', GLIDE],
        )}
        style={{
          transform: active
            ? `translate(${active.x}px, ${active.y}px)`
            : undefined,
        }}
      >
        <span
          className={cn(
            'block size-full rounded-full bg-favicon transition-[scale,opacity] duration-300 ease-out',
            visible ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
          )}
        />
      </span>

      {/* Margin preview, only where there's room for it. It grows out of
          the dot's side and folds back into it (see `.demo-preview`). It links
          to the article, and being inside the list keeps it open while
          hovered. */}
      <Link
        href={active ? `/thoughts/${active.slug}` : '/thoughts'}
        aria-hidden
        tabIndex={-1}
        draggable={false}
        data-visible={visible && active ? '' : undefined}
        data-glide={instant ? undefined : ''}
        className={cn(
          'demo-preview demo-frame @container absolute top-[var(--preview-top)] left-[calc(100%+3.5rem)] hidden min-[1280px]:block w-80 h-45 overflow-hidden',
          visible ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        {mounted.map((name) => {
          const Demo = demos[name]
          // The last demo stays in the frame while it folds away, so only a
          // switch between two demos crossfades.
          const current = active?.demo === name
          return (
            <div
              key={name}
              className={cn(
                'absolute inset-0 transition-[opacity,filter] duration-500 ease-out',
                current ? 'opacity-100 blur-none' : 'opacity-0 blur-xs',
              )}
            >
              <Demo paused={!(visible && current)} className='size-full' />
            </div>
          )
        })}
      </Link>
    </div>
  )
}

function Row({
  item,
  isActive,
  onActivate,
}: {
  item: ThoughtItem
  isActive: boolean
  onActivate: (item: ThoughtItem, mark: HTMLElement | null) => void
}) {
  const markRef = useRef<HTMLSpanElement>(null)

  return (
    <li className='font-medium'>
      {/* Neither the row nor its link is positioned, so the safe triangle
          inside is laid out against the whole list. */}
      <Link
        href={`/thoughts/${item.slug}`}
        className='group flex gap-1 -mx-2 px-2 justify-between items-center focus-visible:outline focus-visible:outline-rurikon-400 focus-visible:rounded-xs focus-visible:outline-dotted focus-visible:text-rurikon-600'
        draggable={false}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') onActivate(item, markRef.current)
        }}
        onFocus={() => onActivate(item, markRef.current)}
      >
        <span className='block text-rurikon-500 group-hover:text-rurikon-700 group-focus-visible:text-rurikon-700'>
          {item.title}
          {item.demo ? <span className='sr-only'> (live demo)</span> : null}
        </span>
        {item.demo ? (
          <span
            ref={markRef}
            aria-hidden
            className={cn(
              'ml-1.5 size-2 shrink-0 self-start mt-[calc((1lh-0.5rem)/2)] rounded-full shadow-[inset_0_0_0_1.25px_var(--color-favicon)] transition-opacity duration-300',
              isActive && 'opacity-0',
            )}
          />
        ) : null}
        <span className='text-sm dot-leaders flex-1 text-rurikon-100 font-normal group-hover:text-rurikon-500 group-focus-visible:text-rurikon-500 transition-colors group-hover:transition-none leading-none' />
        <time className='block text-rurikon-200 tabular-nums font-normal tracking-tighter group-hover:text-rurikon-500 group-focus-visible:text-rurikon-500 transition-colors group-hover:transition-none self-start'>
          {item.date}
        </time>
        {/* Part of this link, so hovering it keeps this row hovered (in CSS
            too) while the pointer crosses other rows towards the preview. */}
        {isActive && item.demo ? (
          <span aria-hidden className='safe-triangle' />
        ) : null}
      </Link>
    </li>
  )
}

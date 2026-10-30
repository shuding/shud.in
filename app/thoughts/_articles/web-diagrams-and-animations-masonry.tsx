'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'

const BLOB = 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com'

type Item = {
  type: 'image' | 'video'
  url: string
  poster?: string
  alt: string
  width: number
  height: number
}

const video = (
  name: string,
  alt: string,
  width: number,
  height: number
): Item => ({
  type: 'video',
  url: `${BLOB}/code-viz/${name}.mp4`,
  poster: `${BLOB}/code-viz/${name}-poster.jpg`,
  alt,
  width,
  height,
})

const image = (
  file: string,
  alt: string,
  width: number,
  height: number
): Item => ({
  type: 'image',
  url: `${BLOB}/code-viz/${file}`,
  alt,
  width,
  height,
})

const items: Item[] = [
  video('rsc-component-tree', 'React Server Components tree', 1920, 1080),
  video('cobe-globes', 'COBE globes', 1280, 1280),
  image('ssr-patterns.jpg', 'SSR rendering patterns', 2000, 1125),
  video('fluid-compute', 'Fluid Compute', 1920, 1204),
  video('rsc-server-actions-1', 'Server Actions in Server Components', 1920, 1080),
  video('rsc-server-actions-2', 'Server Actions in a "use server" file', 1920, 1080),
  video('ship-billboard', 'Ship billboard', 1336, 1656),
  {
    ...video('gpu-lexer-pipeline', 'GPU lexer pipeline', 1920, 1080),
    url: `${BLOB}/gpu-lexer-pipeline.mp4`,
  },
  image('glsx.jpg', 'glsx', 1908, 1075),
  video('shadcn-sidebar', 'shadcn/ui sidebar', 1920, 1440),
  video('ssr-explain', 'Server-side rendering', 1918, 1080),
  image('ssr-patterns-2.jpg', 'CSR and Partial Pre-Rendering', 2000, 1125),
  video('calculus-of-interfaces', 'Calculus of interfaces', 1920, 1080),
  image('web-font-subsetting.png', 'Web font subsetting', 1483, 836),
  video('nextra-logo', 'Nextra logo', 996, 560),
]

// Only play videos while they're on screen.
function LazyVideo({ item }: { item: Item }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={item.url}
      poster={item.poster}
      aria-label={item.alt}
      width={item.width}
      height={item.height}
      className='w-full h-auto'
      loop
      muted
      playsInline
      preload='none'
    />
  )
}

// Same simple flex layout as the Code Art page.
export default function () {
  return (
    <div className='flex flex-wrap gap-3.5 mt-7'>
      {items.map((item) => (
        <div
          key={item.url}
          className='relative flex-1 shrink-0 min-w-full max-w-full sm:min-w-0 sm:basis-1/3 sm:max-w-[calc(50%-7px)] flex items-center bg-gradient-to-br from-rurikon-100/60 to-transparent'
        >
          {item.type === 'video' ? (
            <LazyVideo item={item} />
          ) : (
            <Image
              src={item.url}
              alt={item.alt}
              loading='lazy'
              width={item.width}
              height={item.height}
            />
          )}
        </div>
      ))}
    </div>
  )
}

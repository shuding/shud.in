'use client'

import {
  useScroll,
  useTransform,
  motion,
  useMotionValueEvent,
} from 'motion/react'
import dynamic from 'next/dynamic'
import { useRef, useState, useEffect } from 'react'

const artworks = [
  { name: 'artwork1', placeholder: '/api/placeholder/800/1200' },
  { name: 'artwork2', placeholder: '/api/placeholder/800/1200' },
  { name: 'artwork3', placeholder: '/api/placeholder/800/1200' },
]

function ArtworkItem({
  name,
  onActive,
}: {
  name: string
  onActive: (isActive: boolean) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [Component, setComponent] = useState<any>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.7, 1],
    [0, 0.3, 1, 0.3, 0]
  )
  const scale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.7, 1],
    [0.9, 0.95, 1, 0.95, 0.9]
  )
  const height = useTransform(
    scrollYProgress,
    [0, 0.3, 0.5, 0.7, 1],
    ['10px', '30vh', '90vh', '30vh', '10px']
  )

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    // Consider active when centered (0.45 to 0.55)
    onActive(latest > 0.45 && latest < 0.55)
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Lazy load the component when in view
          const DynamicComponent = dynamic(
            () => import(`./_visuals/${name}.tsx`)
          )
          setComponent(() => DynamicComponent)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [name])

  return (
    <motion.div
      ref={ref}
      style={{ opacity, scale }}
      className='h-screen w-full flex items-center justify-center p-px'
      id={name}
    >
      <motion.div
        style={{ height }}
        className='relative w-full overflow-hidden transition-all duration-300'
      >
        {Component ? (
          <Component />
        ) : (
          <div className='w-full h-full bg-neutral-200 animate-pulse' />
        )}
      </motion.div>
    </motion.div>
  )
}

export default function Page() {
  const [activeArtwork, setActiveArtwork] = useState<string | null>(null)

  useEffect(() => {
    if (activeArtwork) {
      window.history.replaceState(null, '', `#${activeArtwork}`)
    }
  }, [activeArtwork])

  const handleActive = (name: string) => (isActive: boolean) => {
    if (isActive) {
      setActiveArtwork(name)
    }
  }

  return (
    <div className='min-h-screen overflow-y-scroll scroll-smooth'>
      {artworks.map((artwork) => (
        <ArtworkItem
          key={artwork.name}
          name={artwork.name}
          onActive={handleActive(artwork.name)}
        />
      ))}
    </div>
  )
}

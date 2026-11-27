'use client'

import { useEffect, useState, type ComponentType } from 'react'

import type { DemoName } from './names'

// Live previews for articles that have a main demo. An article opts in with
// `demo: '<name>'` in its metadata (see `./names.ts`). Previews receive
// `paused` while they're hidden.

export type DemoProps = { paused?: boolean; className?: string }

// Loads a demo on first render without suspending. A Suspense reveal would
// run the layout's <ViewTransition> crossfade over the whole page.
function lazyDemo<P extends DemoProps>(
  load: () => Promise<{ default: ComponentType<P> }>,
) {
  let loaded: ComponentType<P> | null = null
  let promise: Promise<ComponentType<P>> | null = null
  const preload = () =>
    (promise ??= load().then((module) => (loaded = module.default)))

  function LazyDemo(props: P) {
    const [Component, setComponent] = useState(() => loaded)
    useEffect(() => {
      if (!Component) preload().then((c) => setComponent(() => c))
    }, [Component])
    return Component ? <Component {...props} /> : null
  }

  return Object.assign(LazyDemo, { preload })
}

const Globe = lazyDemo(() => import('./globe'))
const Highlight = lazyDemo(() => import('./highlight'))

export const demos: Record<
  DemoName,
  ComponentType<DemoProps> & { preload: () => void }
> = {
  cobe: Object.assign((props: DemoProps) => <Globe {...props} scale={0.8} />, {
    preload: Globe.preload,
  }),
  'gpu-lexer': Highlight,
}

export function preloadDemos() {
  for (const demo of Object.values(demos)) demo.preload()
}

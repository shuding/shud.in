import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'

// @ts-expect-error types are not available yet?
import { ViewTransition } from 'react'

import cn from 'clsx'
import localFont from 'next/font/local'
import 'katex/dist/katex.min.css'

import Navbar from '@/components/navbar'
import './globals.css'

// Fonts are subset by `scripts/subset-fonts.py` (run manually) into a core
// layer (ASCII + common punctuation, preloaded) and an extended layer that the
// browser only downloads when a page uses one of its characters. The
// `unicode-range` values below are printed by that script.
//
// `adjustFontFallback: false` is required: a generated fallback face between
// the core and extended families would draw extended characters instead of
// the real font. Text stays invisible until the font arrives (`block`).

const sansCore = localFont({
  src: './_fonts/subset/inter-core.woff2',
  preload: true,
  display: 'block',
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0020-007E, U+00A0, U+2010, U+2013-2014, U+2018-2019, U+201C-201D, U+2026',
    },
  ],
})

const sansExt = localFont({
  src: './_fonts/subset/inter-ext.woff2',
  preload: false,
  display: 'block',
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+00A1-00AC, U+00AE-0148, U+014A-017F, U+03BB, U+03C0, U+03C3, U+2192',
    },
  ],
})

const serifCore = localFont({
  src: './_fonts/subset/lora-italic-core.woff2',
  preload: true,
  display: 'block',
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0020-007E, U+00A0, U+2010, U+2013-2014, U+2018-2019, U+201C-201D, U+2026',
    },
  ],
})

const serifExt = localFont({
  src: './_fonts/subset/lora-italic-ext.woff2',
  preload: false,
  display: 'block',
  adjustFontFallback: false,
  declarations: [
    { prop: 'unicode-range', value: 'U+00A1-0137, U+0139-017F, U+03C0' },
  ],
})

const monoCore = localFont({
  src: './_fonts/subset/iosevka-core.woff2',
  preload: true,
  display: 'block',
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0020-007E, U+00A0, U+2010, U+2013-2014, U+2018-2019, U+201C-201D, U+2026',
    },
  ],
})

const monoExt = localFont({
  src: './_fonts/subset/iosevka-ext.woff2',
  preload: false,
  display: 'block',
  adjustFontFallback: false,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+00A1-017F, U+03BB, U+03C0, U+03C3, U+2192',
    },
  ],
})

export const metadata: Metadata = {
  title: {
    template: '%s - Shu Ding',
    default: 'Shu Ding',
  },
  // Show the Open Graph image as a large card on X.
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  maximumScale: 1,
  colorScheme: 'only light',
  themeColor: '#fcfcfc',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' className='overflow-x-hidden touch-manipulation'>
      <head>
        <style>{`:root {
  --sans: ${sansCore.style.fontFamily}, ${sansExt.style.fontFamily};
  --serif: ${serifCore.style.fontFamily}, ${serifExt.style.fontFamily};
  --mono: ${monoCore.style.fontFamily}, ${monoExt.style.fontFamily};
}`}</style>
      </head>
      <body
        className={cn(
          'w-full p-6 sm:p-10 md:p-14',
          'text-sm leading-6 sm:text-[15px] sm:leading-7 md:text-base md:leading-7',
          'text-rurikon-500',
          'antialiased',
        )}
      >
        <div className='fixed sm:hidden h-6 sm:h-10 md:h-14 w-full top-0 left-0 z-30 pointer-events-none content-fade-out' />
        <div className='flex flex-col mobile:flex-row'>
          <Navbar />
          <main className='relative flex-1 max-w-2xl [contain:inline-size]'>
            <div className='absolute w-full h-px opacity-50 bg-rurikon-border right-0 mobile:right-auto mobile:left-0 mobile:w-px mobile:h-full mobile:opacity-100 mix-blend-multiply' />
            <ViewTransition name='crossfade'>
              <article className='pl-0 pt-6 mobile:pt-0 mobile:pl-6 sm:pl-10 md:pl-14'>
                {children}
              </article>
            </ViewTransition>
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}

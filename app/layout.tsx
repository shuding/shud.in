import type { Metadata, Viewport } from 'next'

import cn from 'clsx'
import localFont from 'next/font/local'
import { ViewTransitions } from 'next-view-transitions'
import 'katex/dist/katex.min.css'

import './globals.css'
import Navbar from '@/components/navbar'

const sans = localFont({
  src: './_fonts/InterVariable.woff2',
  preload: true,
  variable: '--sans',
})

const serif = localFont({
  src: './_fonts/LoraItalicVariable.woff2',
  preload: true,
  variable: '--serif',
})

const mono = localFont({
  src: './_fonts/IosevkaFixedCurly-ExtendedMedium.woff2',
  preload: true,
  variable: '--mono',
})

export const metadata: Metadata = {
  title: 'Shu Ding',
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
    <ViewTransitions>
      {/* It's critical to disable X direction overscroll as in many browsers
          it's used as the back/forward navigation gesture which shifts the
          whole content and creates a bad experience with view transitions. */}
      <html lang='en' className='overflow-x-hidden touch-manipulation'>
        <body
          className={cn(
            sans.variable,
            serif.variable,
            mono.variable,
            'container p-6 sm:p-10 md:p-14',
            'text-sm leading-6 sm:text-[15px] sm:leading-7 md:text-base md:leading-7',
            'text-rurikon-500',
            'antialiased'
          )}
        >
          <div className='fixed sm:hidden h-6 sm:h-10 md:h-14 w-full top-0 left-0 z-30 pointer-events-none content-fade-out' />
          <div className='flex'>
            <Navbar />
            <main className='relative flex-1 max-w-2xl [contain:inline-size]'>
              <div className='absolute w-px h-full bg-rurikon-border left-0' />
              <article className='pl-6 sm:pl-10 md:pl-14'>{children}</article>
            </main>
          </div>
        </body>
      </html>
    </ViewTransitions>
  )
}

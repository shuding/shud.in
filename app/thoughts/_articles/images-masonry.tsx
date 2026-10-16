'use client'

import Image from 'next/image'

const images = [
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/20222202-in1cxaer5KCYZPPo0O8YB6rPiv6WBz.jpg',
    width: 1600,
    height: 900,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/2020913-Ushzx7VXqbny0nd96bDKYQT1OsoDQ4.jpg',
    width: 1600,
    height: 1600,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/2020126-QnmSkBMXNzTjnzQDROzR98oJs5y5F7.png',
    width: 1600,
    height: 1600,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/2020127-Ku8prrwXLr2PuAwPLQLUO7HdExhvyc.jpg',
    width: 1677,
    height: 1677,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/blob1-BUvlp7iZF5TXENUS8H91WmucqKF71Y.png',
    width: 1600,
    height: 1600,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/fold2-8XRYRCo7Nuj0qFLuvSyQR7zs25dutg.png',
    width: 800,
    height: 800,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/20201123-SMqMnEDL7rq471MAui10v6wklzSc4Z.jpg',
    width: 1600,
    height: 1600,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/claws-oFwwBXg9SBMZcHZTVeLDrbGWeWaeRA.jpg',
    width: 2000,
    height: 1125,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/2020912-03s51YtzGL7beWdltO2fXfGnwnbCro.png',
    width: 1200,
    height: 1200,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/vercel-small-aMAtxJPmeatGJdC6adohEDBlg4e4BX.png',
    width: 800,
    height: 800,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/cobe-uojbCDmWwts3Lglp1hldWlD0PWo9xT.png',
    width: 1600,
    height: 1600,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/2022220-GRiwwHTxznx48j9Kaq76uHVYiUO0sP.jpg',
    width: 1600,
    height: 900,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/blob2-7qoU6cLpNg5S1STaSVxOH5Q8UOAGmY.png',
    width: 1600,
    height: 1600,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/fold1-hvMv1TAkPargBJNndr0ZChng96Ww7W.png',
    width: 800,
    height: 800,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/fold3-F3sXjDJwkf3xbDMiQfyZuWZMKKdD2J.png',
    width: 800,
    height: 800,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/interference-sq-vLFLXWRAxF7KXvLFx2aLzYovO08lhs.png',
    width: 1283,
    height: 1283,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/logo-fog-small-hbj0V2xGxJjwlJf1FBAAoC5QzD1RQM.png',
    width: 800,
    height: 800,
  },
  {
    url: 'https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/ray-sq.png',
    width: 1283,
    height: 1283,
  },
]

// Sadly we don't have a good masonry layout library here. Let's go with a simple flex layout.
export default function () {
  return (
    <div className='flex flex-wrap gap-3.5 mt-7'>
      {images.map((image) => (
        <div
          key={image.url}
          className='relative flex-1 shrink-0 min-w-full max-w-full sm:min-w-0 sm:basis-1/3 sm:max-w-[calc(50%-7px)] flex items-center bg-gradient-to-br from-rurikon-100/60 to-transparent'
        >
          <Image
            src={image.url}
            alt='Image'
            className=''
            loading='lazy'
            width={image.width}
            height={image.height}
            objectFit='contain'
          />
        </div>
      ))}
    </div>
  )
}

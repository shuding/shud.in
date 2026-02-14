import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'
import { codeToHtml, createCssVariablesTheme } from 'shiki'
import { rendererRich, transformerTwoslash } from '@shikijs/twoslash'
import {
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers'

import Link from 'next/link'
import Image from 'next/image'

// @ts-ignore
import { InlineMath, BlockMath } from 'react-katex'

import { Card } from '@/components/tweet-card'
import { BlockSideTitle } from '@/components/block-sidetitle'
import { DoubleSlitPlayground } from '@/app/thoughts/_articles/double-slit-playground'

const cssVariablesTheme = createCssVariablesTheme({})

export const components: Record<
  string,
  (props: any) => ReactNode | Promise<ReactNode>
> = {
  h1: (props) => (
    <h1
      className='font-semibold mb-7 text-rurikon-600 text-balance'
      {...props}
    />
  ),
  h2: ({ children, ...props }) => {
    const getText = (node: any): string => {
      if (typeof node === 'string') return node
      if (Array.isArray(node)) return node.map(getText).join('')
      if (node?.props?.children) return getText(node.props.children)
      return ''
    }
    const id = getText(children)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return (
      <h2
        id={id}
        className='group relative font-semibold mt-14 mb-7 text-rurikon-600 text-balance scroll-mt-6 sm:scroll-mt-14'
        {...props}
      >
        <a
          href={`#${id}`}
          className='absolute md:w-14 sm:w-10 mobile:w-6 w-6 -translate-x-[calc(100%-2px)] text-center opacity-0 blur-xs group-hover:opacity-100 group-hover:blur-none text-rurikon-200 hover:text-rurikon-500 transition-all delay-0 duration-500 group-target:blur-none group-target:opacity-100 group-hover:delay-300 select-none'
          aria-label='Link to this section'
        >
          #
        </a>
        {children}
      </h2>
    )
  },
  h3: (props) => (
    <h3
      className='font-semibold mt-14 mb-7 text-rurikon-600 text-balance'
      {...props}
    />
  ),
  ul: (props) => (
    <ul
      className='mt-7 list-disc list-outside marker:text-rurikon-200 pl-5'
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className='mt-7 list-decimal list-outside marker:text-rurikon-200 pl-5'
      {...props}
    />
  ),
  li: (props) => <li className='pl-1.5' {...props} />,
  a: ({ href, ...props }) => {
    const className =
      'break-words decoration-from-font underline underline-offset-2 decoration-rurikon-300 hover:decoration-rurikon-600 focus-visible:outline focus-visible:outline-rurikon-400 focus-visible:rounded-xs focus-visible:outline-offset-1 focus-visible:outline-dotted'

    if (href?.startsWith('#')) {
      return (
        <a className={className} href={href} draggable={false} {...props} />
      )
    }

    return (
      <Link
        className={className}
        href={href}
        draggable={false}
        {...(href?.startsWith('https://')
          ? {
              target: '_blank',
              rel: 'noopener noreferrer',
            }
          : {})}
        {...props}
      />
    )
  },
  strong: (props) => <strong className='font-bold' {...props} />,
  p: (props) => <p className='mt-7' {...props} />,
  blockquote: (props) => (
    <blockquote
      className='pl-6 -ml-6 sm:pl-10 sm:-ml-10 md:pl-14 md:-ml-14 not-mobile:text-rurikon-400'
      {...props}
    />
  ),
  pre: (props) => (
    <pre className='mt-7 whitespace-pre md:whitespace-pre-wrap' {...props} />
  ),
  code: async (props) => {
    if (typeof props.children === 'string') {
      const classNames = props.className || ''
      let twoSlash = false
      let lang = 'language-jsx'

      for (const className of classNames.split(',')) {
        if (className.startsWith('language-')) {
          lang = className
        } else if (className === 'twoslash') {
          twoSlash = true
        }
      }

      const code = await codeToHtml(props.children, {
        lang: lang.replace('language-', ''),
        theme: cssVariablesTheme,
        // theme: 'min-light',
        // theme: 'snazzy-light',
        transformers: [
          {
            // Since we're using dangerouslySetInnerHTML, the code and pre
            // tags should be removed.
            pre: (hast: any) => {
              if (hast.children.length !== 1) {
                throw new Error('<pre>: Expected a single <code> child')
              }
              if (hast.children[0].type !== 'element') {
                throw new Error('<pre>: Expected a <code> child')
              }
              return hast.children[0]
            },
            postprocess(html: string) {
              return html.replace(/^<code>|<\/code>$/g, '')
            },
          },
          twoSlash
            ? (transformerTwoslash({
                renderer: rendererRich({
                  errorRendering: 'hover',
                }),
              }) as any)
            : undefined,
          transformerNotationHighlight(),
          transformerNotationWordHighlight(),
        ].filter(Boolean),
      })

      return (
        <code
          className='inline shiki css-variables text-[0.805rem] sm:text-[13.8px] md:text-[0.92rem]'
          dangerouslySetInnerHTML={{ __html: code }}
        />
      )
    }

    return <code className='inline' {...props} />
  },
  Card,
  Image,
  img: async ({ src, alt, title }) => {
    let img: React.ReactNode

    if (src.startsWith('https://')) {
      img = (
        <Image
          className='mt-7'
          src={src}
          alt={alt}
          quality={95}
          placeholder='blur'
          draggable={false}
        />
      )
    } else {
      const image = await import('./assets/images/' + src)
      img = (
        <Image
          className='mt-7'
          src={image.default}
          alt={alt}
          quality={95}
          placeholder='blur'
          draggable={false}
        />
      )
    }

    if (title) {
      return <BlockSideTitle title={title}>{img}</BlockSideTitle>
    }

    return img
  },
  hr: (props) => <hr className='my-14 w-24 border-rurikon-border' {...props} />,
  BlockSideTitle,
  InlineMath,
  BlockMath,
  DoubleSlitPlayground,
}

export function useMDXComponents(inherited: MDXComponents): MDXComponents {
  return {
    ...inherited,
    ...(components as any),
  }
}

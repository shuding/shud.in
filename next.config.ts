import withMDX from '@next/mdx'
import { NextConfig } from 'next'

export default withMDX()({
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  turbopack: {},
  redirects: async () => [
    {
      source: '/thoughts/enlightment',
      destination: '/thoughts/enlightenment',
      permanent: true,
    },
    {
      source: '/thoughts/enlightment-2',
      destination: '/thoughts/enlightenment-2',
      permanent: true,
    },
    {
      source: '/posts/enlightment',
      destination: '/thoughts/enlightenment',
      permanent: true,
    },
    {
      source: '/posts/enlightment-2',
      destination: '/thoughts/enlightenment-2',
      permanent: true,
    },
    {
      source: '/posts/:slug',
      destination: '/thoughts/:slug',
      permanent: false,
    },
  ],
  experimental: {
    mdxRs: {
      mdxType: 'gfm',
    },
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
  transpilePackages: ['shiki'],
  serverExternalPackages: ['@shikijs/twoslash'],
  images: {
    contentDispositionType: 'inline',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      new URL('https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/**'),
    ],
  },
} satisfies NextConfig)

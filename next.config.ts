import withMDX from '@next/mdx'
import { NextConfig } from 'next'

export default withMDX()({
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  turbopack: {},
  redirects: async () => [
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
  images: {
    contentDispositionType: 'inline',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
} satisfies NextConfig)

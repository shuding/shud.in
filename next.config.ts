import withMDX from '@next/mdx'
import { NextConfig } from 'next'

export default withMDX()({
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  // Don't generate AGENTS.md / CLAUDE.md when an agent runs `next dev`.
  agentRules: false,
  turbopack: {},
  redirects: async () => [
    {
      source: '/images',
      destination: '/thoughts/images',
      permanent: true,
    },
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
    agentUpgrade: 'security',
  },
  transpilePackages: ['shiki'],
  serverExternalPackages: ['@shikijs/twoslash'],
  // Code blocks are highlighted at build time (every page with MDX is
  // prerendered), so keep the highlighter out of server functions: the
  // TypeScript compiler that Twoslash uses, and Shiki's grammars, themes and
  // wasm. Together they're ~29 MB of each function's ~36 MB.
  outputFileTracingExcludes: {
    '/*': [
      'node_modules/.pnpm/typescript@*/**',
      '.next/server/chunks/**/*_@shikijs_langs_*',
      '.next/server/chunks/**/*_@shikijs_themes_*',
      '.next/server/chunks/**/*_shiki_dist_wasm_*',
    ],
  },
  images: {
    contentDispositionType: 'inline',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      new URL('https://wtw3stpubzkzkxjf.public.blob.vercel-storage.com/**'),
    ],
  },
} satisfies NextConfig)

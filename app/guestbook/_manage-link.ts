// Signed links for hiding or deleting a single entry from the notification
// email. The signature is an HMAC of the entry ID, so a link only works for
// that one entry, and rotating GUESTBOOK_SECRET invalidates every link.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { headers } from 'next/headers'

function getSecret() {
  const secret = process.env.GUESTBOOK_SECRET
  return secret && secret.length >= 32 ? secret : null
}

function sign(id: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`guestbook-manage:${id}`)
    .digest('base64url')
}

export function verifyManageSignature(id: string, signature: string) {
  const secret = getSecret()
  if (!secret || !id || !signature) return false
  const expected = Buffer.from(sign(id, secret))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function getManageUrl(id: string) {
  const secret = getSecret()
  if (!secret) return null

  // Production links always point at the real domain; previews and local dev
  // point at the host that served the request.
  let origin: string
  if (
    process.env.VERCEL_ENV === 'production' &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ) {
    origin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  } else {
    const headerList = await headers()
    const host = headerList.get('x-forwarded-host') || headerList.get('host')
    if (!host) return null
    const proto =
      headerList.get('x-forwarded-proto') ||
      (host.startsWith('localhost') ? 'http' : 'https')
    origin = `${proto}://${host}`
  }

  const url = new URL('/guestbook/manage', origin)
  url.searchParams.set('id', id)
  url.searchParams.set('sig', sign(id, secret))
  return url.toString()
}

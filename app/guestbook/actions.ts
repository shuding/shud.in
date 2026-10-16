'use server'

import { headers } from 'next/headers'
import { refresh } from 'next/cache'
import { after } from 'next/server'
import { checkRateLimit } from '@vercel/firewall'

import { addEntry } from './_store'
import { getManageUrl } from './_manage-link'
import { notifyNewEntry } from './_notify'
import { cleanMessage, cleanSingleLine, countLines } from './_sanitize'

const MAX_MESSAGE = 500
const MAX_LINES = 20
const MAX_NAME = 60
const MAX_EMAIL = 254

// Must match the rate limit ID of the `@vercel/firewall` rule in the project's
// Firewall settings. The limit is keyed by client IP.
const RATE_LIMIT_ID = 'guestbook'

export type SignState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error'
      error: string
      values: { message: string; name: string; email: string }
    }

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export async function sign(
  _prev: SignState,
  formData: FormData,
): Promise<SignState> {
  // Clean before validating, so limits apply to what will be stored.
  const message = cleanMessage(field(formData, 'message'))
  const name = cleanSingleLine(field(formData, 'name'))
  const email = cleanSingleLine(field(formData, 'email'))
  const values = { message, name, email }

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if (field(formData, 'website').trim()) return { status: 'success' }

  let error: string | null = null
  if (!message) error = 'Please write a message.'
  else if (message.length > MAX_MESSAGE)
    error = `Message must be at most ${MAX_MESSAGE} characters.`
  else if (countLines(message) > MAX_LINES)
    error = `Message must be at most ${MAX_LINES} lines.`
  else if (name.length > MAX_NAME)
    error = `Name must be at most ${MAX_NAME} characters.`
  else if (
    email &&
    (email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    error = 'Please enter a valid email, or leave it empty.'

  if (error) return { status: 'error', error, values }

  try {
    const { rateLimited } = await checkRateLimit(RATE_LIMIT_ID, {
      headers: new Headers(await headers()),
    })
    if (rateLimited) {
      return {
        status: 'error',
        error: 'You’re signing a bit too often. Please try again later.',
        values,
      }
    }

    const entry = await addEntry({
      message,
      name: name || undefined,
      email: email || undefined,
    })
    // Email me after the response is sent, so a slow or failing email never
    // delays or breaks signing.
    const manageUrl = await getManageUrl(entry.id)
    after(() =>
      notifyNewEntry({ entry, email: email || undefined, manageUrl }).catch(
        (err) => console.error('Failed to send guestbook notification:', err),
      ),
    )
    // Re-render the page so the new entry shows up in the list.
    refresh()
    return { status: 'success' }
  } catch (err) {
    console.error(err)
    return {
      status: 'error',
      error: 'Something went wrong. Please try again later.',
      values,
    }
  }
}

// Email notification for new guestbook entries, sent with Resend.
//
// Env: RESEND_API_KEY (added by the Resend integration) and
// GUESTBOOK_NOTIFY_EMAIL (where notifications go). Missing either one skips
// the email without affecting signing.

import { Resend } from 'resend'

import type { GuestbookEntry } from './_store'

const FROM = 'Guestbook <guestbook@mail.shud.in>'

export async function notifyNewEntry({
  entry,
  email,
  manageUrl,
}: {
  entry: GuestbookEntry
  email?: string
  manageUrl: string | null
}) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.GUESTBOOK_NOTIFY_EMAIL
  if (!apiKey || !to) return

  // Plain text only: the message is untrusted input.
  const text = [
    entry.message,
    '',
    `— ${entry.name || 'Anonymous'}${email ? ` <${email}>` : ''}`,
    entry.createdAt,
    '',
    manageUrl ? `Hide or delete: ${manageUrl}` : 'GUESTBOOK_SECRET is not set, so there is no manage link.',
  ].join('\n')

  const { error } = await new Resend(apiKey).emails.send({
    from: FROM,
    to,
    subject: `New guestbook message from ${entry.name || 'someone'}`,
    text,
    replyTo: email,
  })
  if (error) console.error('Failed to send guestbook notification:', error)
}

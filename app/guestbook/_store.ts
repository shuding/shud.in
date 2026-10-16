// Guestbook storage backed by Upstash Redis (Vercel Marketplace).
//
// All entries live in one Redis hash, `guestbook`: each field is an entry ID
// and each value is the entry as JSON. Edit or delete individual fields in the
// Upstash data browser. Set `"hidden": true` on an entry to hide it.
//
// Env (added automatically when the store is connected to the project):
// KV_REST_API_URL and KV_REST_API_TOKEN.

import { randomUUID } from 'node:crypto'
import { Redis } from '@upstash/redis'

const KEY = 'guestbook'

export type GuestbookEntry = {
  id: string
  name: string | null
  message: string
  createdAt: string
}

type StoredEntry = {
  message: string
  name?: string
  email?: string
  createdAt: string
  hidden?: boolean
}

let redis: Redis | null = null
function getRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null
  }
  return (redis ??= Redis.fromEnv())
}

function isStoredEntry(value: unknown): value is StoredEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.message === 'string' && typeof entry.createdAt === 'string'
  )
}

// Never return `email` from here: these objects are sent to the client.
export async function getEntries(): Promise<GuestbookEntry[]> {
  const client = getRedis()
  if (!client) return []

  let items: Record<string, unknown> | null
  try {
    items = await client.hgetall(KEY)
  } catch (err) {
    console.error('Failed to read guestbook:', err)
    return []
  }

  const entries: GuestbookEntry[] = []
  for (const [id, value] of Object.entries(items ?? {})) {
    if (!isStoredEntry(value) || value.hidden) continue
    entries.push({
      id,
      // Entries can be hand-edited in Redis: only render a name that is text.
      name: typeof value.name === 'string' && value.name ? value.name : null,
      message: value.message,
      createdAt: value.createdAt,
    })
  }
  // Oldest first: the form is below the list, so new entries land next to it.
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

// Server-only: includes `email`. Used by the manage page behind a signed link.
export async function getStoredEntry(id: string) {
  const client = getRedis()
  if (!client) return null
  const value = await client.hget<unknown>(KEY, id)
  if (!isStoredEntry(value)) return null
  return {
    id,
    message: value.message,
    name: typeof value.name === 'string' && value.name ? value.name : null,
    email: typeof value.email === 'string' && value.email ? value.email : null,
    createdAt: value.createdAt,
    hidden: Boolean(value.hidden),
  }
}

export async function setEntryHidden(id: string, hidden: boolean) {
  const client = getRedis()
  if (!client) throw new Error('Guestbook storage is not configured.')
  const value = await client.hget<unknown>(KEY, id)
  if (!isStoredEntry(value)) return false
  await client.hset(KEY, { [id]: { ...value, hidden } })
  return true
}

export async function deleteEntry(id: string) {
  const client = getRedis()
  if (!client) throw new Error('Guestbook storage is not configured.')
  return (await client.hdel(KEY, id)) > 0
}

export async function addEntry(input: {
  message: string
  name?: string
  email?: string
}): Promise<GuestbookEntry> {
  const client = getRedis()
  if (!client) throw new Error('Guestbook storage is not configured.')

  const createdAt = new Date().toISOString()
  const id = `${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`
  const value: StoredEntry = { message: input.message, createdAt }
  if (input.name) value.name = input.name
  if (input.email) value.email = input.email

  await client.hset(KEY, { [id]: value })

  return { id, name: value.name || null, message: value.message, createdAt }
}

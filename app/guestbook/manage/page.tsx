import type { Metadata } from 'next'

import { getStoredEntry } from '../_store'
import { verifyManageSignature } from '../_manage-link'
import { buttonClassName, dangerButtonClassName, formatDate } from '../_styles'
import { remove, setHidden } from './actions'

export const metadata: Metadata = {
  title: 'Manage message',
  robots: { index: false, follow: false },
  // The URL carries the signature; don't leak it to other sites.
  referrer: 'no-referrer',
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className='font-semibold mb-7 text-rurikon-600'>Manage message</h1>
      <p className='text-rurikon-300'>{children}</p>
    </div>
  )
}

export default async function Page(props: {
  searchParams: Promise<{ id?: string | string[]; sig?: string | string[] }>
}) {
  const { id, sig } = await props.searchParams
  if (
    typeof id !== 'string' ||
    typeof sig !== 'string' ||
    !verifyManageSignature(id, sig)
  ) {
    return <Notice>This link is invalid.</Notice>
  }

  const entry = await getStoredEntry(id)
  if (!entry) return <Notice>This message has been deleted.</Notice>

  return (
    <div>
      <h1 className='font-semibold mb-7 text-rurikon-600'>Manage message</h1>

      <p className='whitespace-pre-wrap break-words text-rurikon-600'>
        {entry.message}
      </p>
      <p className='text-sm text-rurikon-300'>
        {entry.name || 'Anonymous'}
        {entry.email ? (
          <>
            {' '}
            &lt;
            <a
              href={`mailto:${entry.email}`}
              className='underline underline-offset-2 decoration-rurikon-200 hover:decoration-rurikon-500'
            >
              {entry.email}
            </a>
            &gt;
          </>
        ) : null}
        , <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
      </p>

      <p className='mt-7 text-sm text-rurikon-400'>
        {entry.hidden
          ? 'Hidden: not shown in the guestbook.'
          : 'Visible in the guestbook.'}
      </p>

      <div className='mt-3 flex gap-2'>
        <form action={setHidden}>
          <input type='hidden' name='id' value={entry.id} />
          <input type='hidden' name='sig' value={sig} />
          <input
            type='hidden'
            name='hidden'
            value={entry.hidden ? 'false' : 'true'}
          />
          <button type='submit' className={buttonClassName}>
            {entry.hidden ? 'Show' : 'Hide'}
          </button>
        </form>
        <form action={remove}>
          <input type='hidden' name='id' value={entry.id} />
          <input type='hidden' name='sig' value={sig} />
          <button type='submit' className={dangerButtonClassName}>
            Delete permanently
          </button>
        </form>
      </div>
    </div>
  )
}

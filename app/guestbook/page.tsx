import { connection } from 'next/server'

import { getEntries } from './_store'
import { Guestbook } from './guestbook'

export const metadata = {
  title: 'Guestbook',
}

export default async function Page() {
  // Always render on request so new entries show up without a redeploy.
  await connection()
  const entries = await getEntries()

  return (
    <div>
      <h1 className='font-semibold mb-7 text-rurikon-600 text-balance'>
        Guestbook
      </h1>
      <Guestbook entries={entries} />
    </div>
  )
}

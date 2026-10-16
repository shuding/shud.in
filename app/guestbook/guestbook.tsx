'use client'

import { useActionState } from 'react'
import cn from 'clsx'

import { sign, type SignState } from './actions'
import type { GuestbookEntry } from './_store'
import { buttonClassName, formatDate, inputClassName } from './_styles'

export function Guestbook({ entries }: { entries: GuestbookEntry[] }) {
  const [state, formAction, pending] = useActionState<SignState, FormData>(
    sign,
    { status: 'idle' },
  )
  const values = state.status === 'error' ? state.values : undefined

  return (
    <div>
      {entries.length ? (
        <ul className='flex flex-col gap-7'>
          {entries.map((entry) => (
            <li key={entry.id}>
              <p className='whitespace-pre-wrap break-words text-rurikon-600'>
                {entry.message}
              </p>
              <p className='text-sm text-rurikon-300'>
                {entry.name ? <span>{entry.name}, </span> : null}
                <time
                  dateTime={entry.createdAt}
                  className='tabular-nums tracking-tighter'
                >
                  {formatDate(entry.createdAt)}
                </time>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-rurikon-300 font-serif'>No messages.</p>
      )}

      <form action={formAction} className='mt-14 flex flex-col gap-2'>
        <label className='sr-only' htmlFor='guestbook-message'>
          Message
        </label>
        <textarea
          id='guestbook-message'
          name='message'
          required
          maxLength={500}
          rows={3}
          placeholder='Leave a message to me…'
          defaultValue={values?.message}
          className={cn(
            inputClassName,
            // Grow with the content, from two lines up to 60% of the viewport.
            'field-sizing-content min-h-[calc(2lh+0.5rem+6px)] max-h-[60vh] resize-none',
          )}
        />
        <div className='flex flex-col sm:flex-row gap-2'>
          <label className='sr-only' htmlFor='guestbook-name'>
            Name
          </label>
          <input
            id='guestbook-name'
            name='name'
            maxLength={60}
            autoComplete='name'
            placeholder='Name (optional)'
            defaultValue={values?.name}
            className={inputClassName}
          />
          <label className='sr-only' htmlFor='guestbook-email'>
            Email
          </label>
          <input
            id='guestbook-email'
            name='email'
            type='email'
            maxLength={254}
            autoComplete='email'
            placeholder='Email (optional, private)'
            defaultValue={values?.email}
            className={inputClassName}
          />
        </div>
        {/* Honeypot for bots. */}
        <input
          name='website'
          tabIndex={-1}
          autoComplete='off'
          aria-hidden
          className='hidden'
        />
        <div className='flex items-center justify-between gap-3'>
          <p
            aria-live='polite'
            className={cn(
              'text-sm leading-5',
              state.status === 'error' ? 'text-red-700' : 'text-rurikon-300',
            )}
          >
            {state.status === 'error'
              ? state.error
              : state.status === 'success'
                ? 'Thanks!'
                : 'Your email is only visible to me.'}
          </p>
          <button
            type='submit'
            disabled={pending}
            className={buttonClassName}
          >
            {pending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

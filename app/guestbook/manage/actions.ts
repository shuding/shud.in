'use server'

import { refresh } from 'next/cache'

import { deleteEntry, setEntryHidden } from '../_store'
import { verifyManageSignature } from '../_manage-link'

// Both actions re-check the signature: the form fields come from the client.
function getVerifiedId(formData: FormData) {
  const id = formData.get('id')
  const sig = formData.get('sig')
  if (typeof id !== 'string' || typeof sig !== 'string') return null
  return verifyManageSignature(id, sig) ? id : null
}

export async function setHidden(formData: FormData) {
  const id = getVerifiedId(formData)
  if (!id) return
  await setEntryHidden(id, formData.get('hidden') === 'true')
  refresh()
}

export async function remove(formData: FormData) {
  const id = getVerifiedId(formData)
  if (!id) return
  await deleteEntry(id)
  refresh()
}

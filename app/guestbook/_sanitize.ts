// Text cleanup for guestbook input. React already escapes everything it
// renders; this handles text that is valid but misleading or disruptive.

// Control characters (except tab and newline, handled separately), bidi
// overrides/isolates and marks that can reorder how text reads, zero-width
// spaces, invisible operators, and BOM. Zero-width (non-)joiners U+200C/U+200D
// are kept: emoji sequences and several scripts depend on them.
const INVISIBLE =
  /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u061C\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g

function clean(text: string) {
  return text
    .replace(/\r\n?|[\u2028\u2029]/g, '\n')
    .replace(/\t/g, ' ')
    .replace(INVISIBLE, '')
}

// Remove blank (or whitespace-only) lines, keeping single line breaks.
export function collapseBlankLines(text: string) {
  return text.replace(/\n(?:[^\S\n]*\n)+/g, '\n')
}

export function cleanMessage(text: string) {
  return collapseBlankLines(
    clean(text).replace(/[^\S\n]+$/gm, ''), // trailing spaces on each line
  ).trim()
}

export function cleanSingleLine(text: string) {
  return clean(text).replace(/\s+/g, ' ').trim()
}

export function countLines(text: string) {
  return text ? text.split('\n').length : 0
}

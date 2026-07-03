/** Port of js/main.js:copyTextToClipboard / copyTextToClipboardFallback (main.js:1764-1795). */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Permissions-API denial, insecure context, etc — fall back to the DOM trick below.
    }
  }
  copyTextToClipboardFallback(text)
}

function copyTextToClipboardFallback(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    const ok = document.execCommand('copy')
    if (!ok) throw new Error('Clipboard copy command was not accepted')
  } finally {
    document.body.removeChild(textarea)
  }
}

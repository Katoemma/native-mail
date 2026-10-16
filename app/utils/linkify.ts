/** Escape text for safe HTML insertion. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Turn bare URLs / www. / mailto: in plain text into clickable links.
 * Input is escaped first so this is safe for v-html.
 */
export function linkifyPlainText(text: string): string {
  const escaped = escapeHtml(text)

  // URLs, www., and email addresses — trim common trailing punctuation from the match
  const pattern =
    /((?:https?:\/\/|www\.)[^\s<]+)|(mailto:[^\s<]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

  const linked = escaped.replace(pattern, (raw) => {
    let match = raw
    let trailing = ''
    // Peel off trailing punctuation that is usually not part of the URL
    while (/[.,;:!?)\]>'"]$/.test(match)) {
      trailing = match.slice(-1) + trailing
      match = match.slice(0, -1)
    }
    if (!match) return raw

    let href = match
    if (match.includes('@') && !match.startsWith('mailto:') && !/^https?:\/\//i.test(match)) {
      href = `mailto:${match}`
    }
    else if (match.toLowerCase().startsWith('www.')) {
      href = `https://${match}`
    }

    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>${trailing}`
  })

  return linked.replace(/\n/g, '<br>')
}

/** Ensure HTML email anchors open safely in a new tab. */
export function enhanceHtmlLinks(html: string): string {
  if (typeof DOMParser === 'undefined') return html
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') ?? ''
      if (href.startsWith('#') || href.startsWith('javascript:')) return
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    })
    return doc.body.innerHTML
  }
  catch {
    return html
  }
}

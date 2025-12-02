/**
 * Linkify utility - converts URLs in text to clickable links
 */

// URL regex pattern that matches http://, https://, and www. URLs
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi

/**
 * Component that renders text with auto-linked URLs
 * @param {string} text - The text to process
 * @param {string} className - Optional className for the container
 */
export function Linkify({ text, className = '' }) {
  if (!text) return null

  const parts = []
  let lastIndex = 0
  let match

  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0

  // Find all URLs in the text
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0]
    const index = match.index

    // Add text before the URL
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index))
    }

    // Add the URL as a link
    const href = url.startsWith('www.') ? `https://${url}` : url
    parts.push(
      <a
        key={`link-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 hover:text-primary-700 underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    )

    lastIndex = index + url.length
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  // If no URLs were found, return the original text
  if (parts.length === 0) {
    return <span className={className}>{text}</span>
  }

  return <span className={className}>{parts}</span>
}

/**
 * Alternative function that returns an array of React elements
 * Useful for more complex rendering scenarios
 */
export function linkifyText(text) {
  if (!text) return []

  const parts = []
  let lastIndex = 0
  let match

  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0

  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0]
    const index = match.index

    // Add text before the URL
    if (index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, index)
      })
    }

    // Add the URL
    const href = url.startsWith('www.') ? `https://${url}` : url
    parts.push({
      type: 'link',
      content: url,
      href: href
    })

    lastIndex = index + url.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

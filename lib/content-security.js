// Content security and sanitization utilities

class ContentSecurity {
  constructor() {
    this.maxContentLength = 50000 // 50KB limit
    this.maxUrlLength = 2048
    this.blockedDomains = [
      'localhost',
      '127.0.0.1',
      '192.168.',
      '10.',
      '172.16.',
      'file://',
      'chrome://',
      'chrome-extension://'
    ]
    this.sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, // Phone numbers
      /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*['"]\w+['"]/gi // API keys/tokens
    ]
  }

  // Validate URL is safe to process
  isUrlSafe(url) {
    try {
      const urlObj = new URL(url)
      
      // Check URL length
      if (url.length > this.maxUrlLength) {
        return { safe: false, reason: 'URL too long' }
      }
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { safe: false, reason: 'Invalid protocol' }
      }
      
      // Check for blocked domains
      const hostname = urlObj.hostname.toLowerCase()
      for (const blocked of this.blockedDomains) {
        if (hostname.includes(blocked)) {
          return { safe: false, reason: 'Blocked domain' }
        }
      }
      
      return { safe: true }
    } catch (error) {
      return { safe: false, reason: 'Invalid URL' }
    }
  }

  // Sanitize content before sending to API
  sanitizeContent(content, url) {
    // Validate URL first
    const urlCheck = this.isUrlSafe(url)
    if (!urlCheck.safe) {
      throw new Error(`URL validation failed: ${urlCheck.reason}`)
    }

    // Check content length
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content provided')
    }

    if (content.length > this.maxContentLength) {
      // Truncate content but try to keep complete sentences
      content = this.truncateAtSentence(content, this.maxContentLength)
    }

    // Remove potentially sensitive information
    let sanitized = content
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()

    // Basic HTML tag removal (if any)
    sanitized = sanitized.replace(/<[^>]*>/g, ' ')

    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    return {
      content: sanitized,
      originalLength: content.length,
      sanitizedLength: sanitized.length,
      truncated: content.length > this.maxContentLength
    }
  }

  // Truncate content at sentence boundary
  truncateAtSentence(content, maxLength) {
    if (content.length <= maxLength) {
      return content
    }

    const truncated = content.substring(0, maxLength)
    const lastSentence = truncated.lastIndexOf('.')
    const lastQuestion = truncated.lastIndexOf('?')
    const lastExclamation = truncated.lastIndexOf('!')
    
    const lastPunctuation = Math.max(lastSentence, lastQuestion, lastExclamation)
    
    if (lastPunctuation > maxLength * 0.8) {
      return truncated.substring(0, lastPunctuation + 1)
    }
    
    // If no good sentence break, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    return truncated + '...'
  }

  // Validate API key format
  validateApiKey(provider, apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, reason: 'API key is required' }
    }

    const trimmed = apiKey.trim()
    
    const patterns = {
      openai: /^sk-[a-zA-Z0-9]{48,}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9\-_]{30,}$/,
      google: /^[a-zA-Z0-9_-]{39}$/,
      perplexity: /^pplx-[a-zA-Z0-9]{32,}$/,
      x: /^[a-zA-Z0-9]{20,}$/ // X/Grok pattern may vary
    }

    const pattern = patterns[provider]
    if (pattern && !pattern.test(trimmed)) {
      return { valid: false, reason: `Invalid ${provider} API key format` }
    }

    // Check for obviously fake keys
    if (trimmed.includes('your-api-key') || trimmed.includes('replace-me') || trimmed.length < 10) {
      return { valid: false, reason: 'API key appears to be placeholder' }
    }

    return { valid: true }
  }

  // Rate limiting storage
  async checkRateLimit(identifier, maxRequests = 100, windowMs = 3600000) { // 100 requests per hour
    const key = `rate_limit_${identifier}`
    const now = Date.now()
    
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        const data = result[key] || { requests: [], windowStart: now }
        
        // Remove old requests outside the window
        data.requests = data.requests.filter(timestamp => now - timestamp < windowMs)
        
        if (data.requests.length >= maxRequests) {
          resolve({
            allowed: false,
            resetTime: Math.min(...data.requests) + windowMs,
            remaining: 0
          })
          return
        }

        // Add current request
        data.requests.push(now)
        
        chrome.storage.local.set({ [key]: data }, () => {
          resolve({
            allowed: true,
            remaining: maxRequests - data.requests.length,
            resetTime: now + windowMs
          })
        })
      })
    })
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentSecurity
} else {
  window.ContentSecurity = ContentSecurity
}
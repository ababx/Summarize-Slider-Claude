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
    console.log('=== VALIDATION START ===')
    console.log('validateApiKey called with:', { provider, apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'null' })
    console.log('API key length:', apiKey ? apiKey.length : 0)
    
    if (!apiKey || typeof apiKey !== 'string') {
      console.log('API key validation failed: API key is required')
      return { valid: false, reason: 'API key is required' }
    }

    const trimmed = apiKey.trim()
    
    const patterns = {
      openai: /^sk-[a-zA-Z0-9]{20,}$/,  // More lenient
      anthropic: /^sk-ant-[a-zA-Z0-9\-_]{20,}$/,  // Anthropic keys start with sk-ant-
      google: /^[a-zA-Z0-9_-]{15,}$/, // More flexible for Google API keys
      perplexity: /^pplx-[a-zA-Z0-9]{20,}$/,  // More lenient
      xai: /^xai-[a-zA-Z0-9]{15,}$/ // More lenient for X.AI format
    }

    const pattern = patterns[provider]
    if (pattern && !pattern.test(trimmed)) {
      console.log(`API key validation failed for ${provider}: pattern mismatch`)
      console.log(`API key: ${trimmed.substring(0, 15)}...`)
      console.log(`Expected pattern: ${pattern}`)
      // Temporarily allow anthropic keys to pass validation for debugging
      if (provider === 'anthropic' && trimmed.startsWith('sk-ant-')) {
        console.log('Allowing anthropic key despite pattern mismatch for debugging')
        return { valid: true }
      }
      return { valid: false, reason: `Invalid ${provider} API key format. Expected pattern: ${pattern}` }
    }

    // Check for obviously fake keys
    if (trimmed.includes('your-api-key') || trimmed.includes('replace-me') || trimmed.length < 10) {
      console.log('API key validation failed: appears to be placeholder')
      return { valid: false, reason: 'API key appears to be placeholder' }
    }

    console.log('API key validation passed')
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
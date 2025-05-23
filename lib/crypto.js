// Simple encryption utilities for API key storage
// Note: This is browser-side encryption, not a complete security solution

class KeyManager {
  constructor() {
    this.algorithm = 'AES-GCM'
    this.keyLength = 256
  }

  // Generate a key from user's browser fingerprint + random salt
  async generateKey() {
    const fingerprint = await this.getBrowserFingerprint()
    const encoder = new TextEncoder()
    const data = encoder.encode(fingerprint)
    
    const key = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.digest('SHA-256', data),
      { name: this.algorithm },
      false,
      ['encrypt', 'decrypt']
    )
    
    return key
  }

  // Simple browser fingerprint (not perfect, but better than nothing)
  async getBrowserFingerprint() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Browser fingerprint', 2, 2)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')
    
    return fingerprint
  }

  // Encrypt API key
  async encryptApiKey(apiKey) {
    try {
      const key = await this.generateKey()
      const encoder = new TextEncoder()
      const data = encoder.encode(apiKey)
      
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        { name: this.algorithm, iv: iv },
        key,
        data
      )
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt API key')
    }
  }

  // Decrypt API key
  async decryptApiKey(encryptedKey) {
    try {
      const key = await this.generateKey()
      
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedKey).split('').map(char => char.charCodeAt(0))
      )
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)
      
      const decrypted = await crypto.subtle.decrypt(
        { name: this.algorithm, iv: iv },
        key,
        encrypted
      )
      
      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt API key')
    }
  }

  // Store encrypted API key
  async storeApiKey(keyName, apiKey) {
    const encryptedKey = await this.encryptApiKey(apiKey)
    return new Promise((resolve) => {
      chrome.storage.local.set({ 
        [`encrypted_${keyName}`]: encryptedKey,
        [`key_timestamp_${keyName}`]: Date.now()
      }, resolve)
    })
  }

  // Retrieve and decrypt API key
  async getApiKey(keyName) {
    return new Promise((resolve) => {
      chrome.storage.local.get([`encrypted_${keyName}`], async (result) => {
        const encryptedKey = result[`encrypted_${keyName}`]
        if (!encryptedKey) {
          resolve(null)
          return
        }
        
        try {
          const decryptedKey = await this.decryptApiKey(encryptedKey)
          resolve(decryptedKey)
        } catch (error) {
          console.error('Failed to decrypt stored key:', error)
          resolve(null)
        }
      })
    })
  }

  // Check if API key exists
  async hasApiKey(keyName) {
    return new Promise((resolve) => {
      chrome.storage.local.get([`encrypted_${keyName}`], (result) => {
        resolve(!!result[`encrypted_${keyName}`])
      })
    })
  }

  // Remove API key
  async removeApiKey(keyName) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([
        `encrypted_${keyName}`,
        `key_timestamp_${keyName}`
      ], resolve)
    })
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyManager
} else {
  window.KeyManager = KeyManager
}
document.addEventListener("DOMContentLoaded", () => {
  // Initialize security managers
  console.log('Initializing KeyManager and ContentSecurity...')
  const keyManager = new KeyManager()
  const contentSecurity = new ContentSecurity()
  console.log('KeyManager:', keyManager)
  console.log('ContentSecurity:', contentSecurity)
  
  // Basic panel elements
  const summarizeBtn = document.getElementById("summarizeBtn")
  const loadingIndicator = document.getElementById("loadingIndicator")
  const summaryContainer = document.getElementById("summaryContainer")
  const summaryContent = document.getElementById("summaryContent")
  const errorContainer = document.getElementById("errorContainer")
  const errorMessage = document.getElementById("errorMessage")
  const complexitySlider = document.getElementById("complexitySlider")
  const sliderLabelGroups = document.querySelectorAll(".slider-label-group")
  const closeButton = document.getElementById("closePanel")
  const sliderThumb = document.getElementById("sliderThumb")
  
  // New shadcn-style elements
  const modelSelectorBtn = document.getElementById("modelSelectorBtn")
  const modelSelectorOverlay = document.getElementById("modelSelectorOverlay")
  const closeModelSelector = document.getElementById("closeModelSelector")
  const tabsList = document.getElementById("tabsList")
  const apiKeyContainer = document.getElementById("apiKeyContainer")
  const modelsList = document.getElementById("modelsList")
  const usageCounter = document.getElementById("usageCounter")
  const setDefaultBtn = document.getElementById("setDefaultBtn")
  const defaultModelName = document.getElementById("defaultModelName")

  // State
  let currentProvider = "openai"
  let currentTabId = null
  let summarizeUsage = 0
  let summarizeDefault = "gemini-flash-2.5"
  
  // Complexity levels
  const complexityLevels = ["eli5", "standard", "phd"]

  // Provider data (matching your React component)
  const providers = {
    openai: {
      id: "openai",
      name: "OpenAI",
      keyName: "OPENAI_API_KEY"
    },
    anthropic: {
      id: "anthropic", 
      name: "Anthropic",
      keyName: "ANTHROPIC_API_KEY"
    },
    google: {
      id: "google",
      name: "Google", 
      keyName: "GOOGLE_API_KEY"
    },
    perplexity: {
      id: "perplexity",
      name: "Perplexity",
      keyName: "PERPLEXITY_API_KEY"
    },
    xai: {
      id: "xai",
      name: "X AI",
      keyName: "X_API_KEY"
    }
  }

  // Models data (Gemini Flash as default, separate from user API keys)
  const models = [
    { id: "gemini-flash-2.5", name: "Gemini Flash 2.5", provider: "google", isDefault: true, isSystemDefault: true },
    { id: "perplexity-sonar", name: "Perplexity Sonar", provider: "perplexity" },
    { id: "gemini-pro-2.5", name: "Gemini Pro 2.5", provider: "google" },
    { id: "claude-sonnet-4", name: "Claude Sonnet 4", provider: "anthropic" },
    { id: "claude-opus-4", name: "Claude Opus 4", provider: "anthropic" },
    { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
    { id: "gpt-o3", name: "GPT-o3", provider: "openai" },
    { id: "gpt-o4-mini", name: "GPT-o4-mini", provider: "openai" },
    { id: "grok-3", name: "Grok 3", provider: "xai" }
  ]

  // Get models for a specific provider
  function getModelsForProvider(providerId) {
    return models.filter(model => model.provider === providerId)
  }

  // Get default model
  function getDefaultModel() {
    return models.find(model => model.isDefault) || models[0]
  }

  // Set model as default
  function setAsDefault(modelId) {
    models.forEach(model => {
      model.isDefault = model.id === modelId
    })
    
    // Update summarize default and persist it
    summarizeDefault = modelId
    chrome.storage.local.set({ summarizeDefault: modelId })
    updateSummarizeSection()
    renderModelsForCurrentProvider()
    updateTopNavModel()
  }

  // Mask API key for display
  function maskApiKey(apiKey) {
    console.log('Masking API key:', typeof apiKey, apiKey ? apiKey.length : 'null')
    if (!apiKey || typeof apiKey !== 'string') {
      console.log('Invalid API key for masking')
      return 'Invalid key'
    }
    if (apiKey.length <= 8) return apiKey
    
    const first4 = apiKey.substring(0, 4)
    const last4 = apiKey.substring(apiKey.length - 4)
    const middleLength = Math.max(20, apiKey.length - 8) // Show at least 20 bullets
    const masked = first4 + '•'.repeat(middleLength) + last4
    
    console.log('Masked result:', masked.substring(0, 20) + '...')
    return masked
  }

  // Simplified API key check
  async function hasApiKey(keyName) {
    return new Promise((resolve) => {
      chrome.storage.local.get([`encrypted_${keyName}`], (result) => {
        resolve(!!result[`encrypted_${keyName}`])
      })
    })
  }

  // Update tab indicators
  async function updateTabIndicators() {
    for (const providerId of Object.keys(providers)) {
      const provider = providers[providerId]
      const indicator = document.getElementById(`${providerId}-indicator`)
      const hasKey = await hasApiKey(provider.keyName)
      
      if (indicator) {
        if (hasKey) {
          indicator.classList.remove('hidden')
        } else {
          indicator.classList.add('hidden')
        }
      }
    }
  }

  // Tab switching functionality
  async function switchTab(providerId) {
    // Update active tab
    const tabTriggers = tabsList.querySelectorAll('.tab-trigger')
    tabTriggers.forEach(tab => {
      if (tab.dataset.provider === providerId) {
        tab.classList.add('active')
      } else {
        tab.classList.remove('active')
      }
    })
    
    currentProvider = providerId
    await renderApiKeySection()
    await renderModelsForCurrentProvider()
  }

  // Setup tab event listeners
  function setupTabs() {
    const tabTriggers = tabsList.querySelectorAll('.tab-trigger')
    tabTriggers.forEach(tab => {
      tab.addEventListener('click', async () => {
        await switchTab(tab.dataset.provider)
      })
    })
  }

  // Simplified get API key function
  async function getApiKey(keyName) {
    return new Promise((resolve) => {
      chrome.storage.local.get([`encrypted_${keyName}`], (result) => {
        const encryptedKey = result[`encrypted_${keyName}`]
        if (!encryptedKey) {
          resolve(null)
          return
        }
        try {
          // Simple base64 decode
          const apiKey = atob(encryptedKey)
          console.log('Retrieved API key preview:', apiKey.substring(0, 10) + '...')
          resolve(apiKey)
        } catch (error) {
          console.error('Failed to decode API key:', error)
          resolve(null)
        }
      })
    })
  }

  // Render API key section for current provider
  async function renderApiKeySection() {
    const provider = providers[currentProvider]
    const hasKey = await hasApiKey(provider.keyName)
    
    if (hasKey) {
      const apiKey = await getApiKey(provider.keyName)
      console.log('API key for display:', typeof apiKey, apiKey ? apiKey.substring(0, 10) + '...' : 'null')
      const maskedKey = maskApiKey(apiKey)
      
      apiKeyContainer.innerHTML = `
        <div class="api-key-display">
          <div class="api-key-info">
            <svg class="key-icon" width="12" height="12" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clip-path="url(#clip0_22843_178)">
                <path d="M7.38 6.00867L1.5 11.8887L3.5 13.8887" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.75 9.63867L5.5 11.3887" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12.5 3.88867C12.5 5.54552 11.1569 6.88867 9.5 6.88867C7.84315 6.88867 6.5 5.54552 6.5 3.88867C6.5 2.23182 7.84315 0.888672 9.5 0.888672C11.1569 0.888672 12.5 2.23182 12.5 3.88867Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
              <defs>
                <clipPath id="clip0_22843_178">
                  <rect width="14" height="14" fill="white" transform="matrix(-4.37114e-08 1 1 4.37114e-08 0 0.388672)"/>
                </clipPath>
              </defs>
            </svg>
            <span class="key-preview">${maskedKey}</span>
          </div>
          <div class="api-key-actions">
            <button class="btn-small btn-ghost btn-icon" onclick="window.editApiKey('${currentProvider}')" title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-small btn-ghost btn-icon" onclick="window.removeApiKey('${currentProvider}')" title="Remove">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      `
      
      // Show status indicator
      const indicator = document.getElementById(`${currentProvider}-indicator`)
      if (indicator) {
        indicator.classList.remove('hidden')
      }
    } else {
      apiKeyContainer.innerHTML = `
        <div class="key-input-container">
          <input type="password" id="keyInput-${currentProvider}" class="key-input" placeholder="Enter ${provider.name} API key">
          <button class="btn-small btn-primary" disabled>Save</button>
          <button class="btn-small btn-ghost" onclick="cancelEdit('${currentProvider}')">Cancel</button>
        </div>
      `
      
      // Setup input validation
      const keyInput = document.getElementById(`keyInput-${currentProvider}`)
      const saveBtn = apiKeyContainer.querySelector('.btn-primary')
      
      keyInput.addEventListener('input', () => {
        saveBtn.disabled = !keyInput.value.trim()
      })
      
      // Add click event listener for save button
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault()
        console.log('Save button clicked for provider:', currentProvider)
        console.log('Button element:', saveBtn)
        console.log('Input value:', keyInput.value)
        saveApiKey(currentProvider)
      })
      
      // Hide status indicator
      const indicator = document.getElementById(`${currentProvider}-indicator`)
      if (indicator) {
        indicator.classList.add('hidden')
      }
    }
  }

  // Render models for current provider
  async function renderModelsForCurrentProvider() {
    const providerModels = getModelsForProvider(currentProvider)
    
    if (providerModels.length === 0) {
      modelsList.innerHTML = '<div style="text-align: center; color: #6b7280; font-size: 12px; padding: 16px;">No models available for this provider</div>'
      return
    }
    
    // Check if current provider has API key
    const provider = providers[currentProvider]
    const providerHasKey = await hasApiKey(provider.keyName)
    
    modelsList.innerHTML = providerModels.map(model => {
      const isDisabled = !providerHasKey && !model.isSystemDefault
      const buttonClass = isDisabled ? 'btn-small btn-ghost set-default-btn disabled' : 'btn-small btn-ghost set-default-btn'
      const buttonText = isDisabled ? 'API key required' : 'Use this'
      
      return `
        <div class="model-card ${model.isDefault ? 'default' : ''}">
          <div class="model-card-header">
            <div class="model-info">
              <span class="model-name">${model.name}</span>
              ${model.isDefault ? '<span class="default-badge">Default</span>' : ''}
            </div>
            ${!model.isDefault ? `<button class="${buttonClass}" ${isDisabled ? 'disabled' : ''} onclick="${isDisabled ? '' : `setAsDefault('${model.id}')`}">${buttonText}</button>` : ''}
          </div>
        </div>
      `
    }).join('')
  }

  // Update summarize section
  function updateSummarizeSection() {
    const defaultModel = models.find(m => m.id === summarizeDefault)
    const isUsingSystemDefault = summarizeDefault === 'gemini-flash-2.5'
    
    // Only show usage counter for system default (Gemini Flash)
    if (isUsingSystemDefault) {
      usageCounter.textContent = `${summarizeUsage}/25 Monthly`
    } else {
      usageCounter.textContent = 'Unlimited'
    }
    
    // Keep footer text static - do NOT update defaultModelName
    // defaultModelName should always show "Gemini Flash 2.5"
    
    // Show/hide set default button - only show if current default is NOT Gemini Flash
    if (summarizeDefault !== 'gemini-flash-2.5') {
      setDefaultBtn.classList.remove('hidden')
    } else {
      setDefaultBtn.classList.add('hidden')
    }
    
    // Update top nav only
    updateTopNavModel()
  }

  // Update the current model display in top nav
  function updateTopNavModel() {
    const currentModelDiv = document.querySelector('.current-model')
    const defaultModel = models.find(m => m.id === summarizeDefault)
    if (currentModelDiv && defaultModel) {
      currentModelDiv.textContent = defaultModel.name
    }
  }

  // Debug function to check stored keys
  async function debugStoredKeys() {
    console.log('=== DEBUG STORED KEYS ===')
    for (const providerId of Object.keys(providers)) {
      const provider = providers[providerId]
      const keyName = `encrypted_${provider.keyName}`
      chrome.storage.local.get([keyName], (result) => {
        if (result[keyName]) {
          console.log(`${provider.name} key exists, length:`, result[keyName].length)
          console.log(`${provider.name} key preview:`, result[keyName].substring(0, 20) + '...')
          try {
            const decoded = atob(result[keyName])
            console.log(`${provider.name} decoded preview:`, decoded.substring(0, 10) + '...')
          } catch (e) {
            console.log(`${provider.name} decode error:`, e.message)
          }
        }
      })
    }
  }


  // Global functions for API key management
  window.editApiKey = async function(providerId) {
    const provider = providers[providerId]
    
    apiKeyContainer.innerHTML = `
      <div class="key-input-container">
        <input type="password" id="keyInput-${providerId}" class="key-input" placeholder="Enter ${provider.name} API key">
        <button class="btn-small btn-primary" disabled>Save</button>
        <button class="btn-small btn-ghost btn-icon" onclick="window.cancelEdit('${providerId}')" title="Cancel">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `
    
    // Setup input validation and event listeners
    const keyInput = document.getElementById(`keyInput-${providerId}`)
    const saveBtn = apiKeyContainer.querySelector('.btn-primary')
    
    keyInput.addEventListener('input', () => {
      saveBtn.disabled = !keyInput.value.trim()
    })
    
    // Add click event listener for save button
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault()
      saveApiKey(providerId)
    })
    
    keyInput.focus()
  }

  // Simplified and robust API key saving
  async function saveApiKey(providerId) {
    console.log('=== SAVE API KEY START ===')
    console.log('Provider ID:', providerId)
    
    try {
      // 1. Get provider info
      const provider = providers[providerId]
      if (!provider) {
        throw new Error(`Invalid provider: ${providerId}`)
      }
      
      // 2. Get input element
      const keyInput = document.getElementById(`keyInput-${providerId}`)
      if (!keyInput) {
        throw new Error('Input field not found')
      }
      
      // 3. Get API key value
      const apiKey = keyInput.value.trim()
      if (!apiKey) {
        showNotification('Please enter an API key', 'error')
        return false
      }
      
      // 4. Get save button
      const saveBtn = apiKeyContainer.querySelector('.btn-primary')
      if (!saveBtn) {
        throw new Error('Save button not found')
      }
      
      // 5. Show saving state
      const originalText = saveBtn.textContent
      saveBtn.textContent = 'Saving...'
      saveBtn.disabled = true
      
      console.log('Attempting to save API key...')
      
      // 6. Validate API key (simplified validation)
      if (apiKey.length < 10) {
        throw new Error('API key too short')
      }
      
      // 7. Store the API key
      console.log('Storing API key...')
      console.log('Original API key preview:', apiKey.substring(0, 10) + '...')
      
      const encodedKey = btoa(apiKey)
      console.log('Encoded key preview:', encodedKey.substring(0, 20) + '...')
      
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.set({
          [`encrypted_${provider.keyName}`]: encodedKey,
          [`key_timestamp_${provider.keyName}`]: Date.now()
        }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(true)
          }
        })
      })
      
      console.log('API key stored successfully')
      
      // 8. Set first model as default
      const providerModels = getModelsForProvider(providerId)
      if (providerModels.length > 0) {
        setAsDefault(providerModels[0].id)
        chrome.storage.local.set({ summarizeDefault: providerModels[0].id })
      }
      
      // 9. Show success message
      showNotification(`✅ ${provider.name} API key saved successfully!`, 'success')
      
      // 10. Update UI
      await renderApiKeySection()
      await updateTabIndicators()
      await renderModelsForCurrentProvider()
      updateTopNavModel()
      
      return true
      
    } catch (error) {
      console.error('Save API key failed:', error)
      showNotification(`Failed to save API key: ${error.message}`, 'error')
      
      // Reset button state
      const saveBtn = apiKeyContainer.querySelector('.btn-primary')
      if (saveBtn) {
        saveBtn.textContent = 'Save'
        saveBtn.disabled = false
      }
      
      return false
    }
  }

  // Simplified remove API key function
  async function deleteApiKeyFromStorage(keyName) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([
        `encrypted_${keyName}`,
        `key_timestamp_${keyName}`
      ], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(true)
        }
      })
    })
  }

  window.removeApiKey = async function(providerId) {
    console.log('=== REMOVE API KEY START ===')
    console.log('Provider ID:', providerId)
    
    const provider = providers[providerId]
    if (!provider) {
      console.error('Provider not found:', providerId)
      showNotification('Error: Invalid provider', 'error')
      return
    }
    
    if (!confirm(`Are you sure you want to remove your ${provider.name} API key? This action cannot be undone.`)) {
      return
    }
    
    try {
      console.log('Removing API key for:', provider.keyName)
      await deleteApiKeyFromStorage(provider.keyName)
      console.log('API key removed successfully')
      
      showNotification(`🗑️ ${provider.name} API key removed successfully`, 'success')
      
      // Update UI
      await renderApiKeySection()
      await updateTabIndicators()
      await renderModelsForCurrentProvider()
      
      // If current default model uses this provider, reset to gemini-flash-2.5
      const defaultModel = getDefaultModel()
      if (defaultModel && defaultModel.provider === providerId) {
        setAsDefault('gemini-flash-2.5')
        chrome.storage.local.set({ summarizeDefault: 'gemini-flash-2.5' })
        showNotification(`Default model reset to Gemini Flash 2.5`, 'info')
      }
      
      // Update top nav
      updateTopNavModel()
      
    } catch (error) {
      console.error('Failed to remove API key:', error)
      console.error('Error details:', error.stack)
      showNotification('Failed to remove API key. Please try again.', 'error')
    }
  }

  window.cancelEdit = async function(providerId) {
    console.log('Cancel edit for:', providerId)
    await renderApiKeySection()
  }

  window.setAsDefault = setAsDefault
  window.saveApiKey = saveApiKey

  
  // Setup model selector button
  modelSelectorBtn.addEventListener('click', () => {
    const isVisible = !modelSelectorOverlay.classList.contains('hidden')
    if (isVisible) {
      modelSelectorOverlay.classList.add('hidden')
      // Refresh the display when closing
      updateSummarizeSection()
    } else {
      modelSelectorOverlay.classList.remove('hidden')
    }
  })
  
  // Setup set default button
  setDefaultBtn.addEventListener('click', () => {
    setAsDefault('gemini-flash-2.5')
    chrome.storage.local.set({ summarizeDefault: 'gemini-flash-2.5' })
  })

  // Check if chrome is defined, if not, define it as an empty object with required methods
  if (typeof chrome === "undefined") {
    window.chrome = {
      runtime: {
        sendMessage: (message, callback) => {
          if (callback) callback({ tabId: 1 })
        },
      },
      storage: {
        local: {
          get: (keys, callback) => {
            callback({})
          },
          set: (items) => {
            // Mock implementation
          },
        },
      },
    }
  }

  // Initialize the panel
  chrome.runtime.sendMessage({ action: "getCurrentTabId" }, async (response) => {
    if (response && response.tabId) {
      currentTabId = response.tabId

      // Load saved data
      chrome.storage.local.get([
        `summary_${currentTabId}`, 
        `complexity_${currentTabId}`, 
        `model_${currentTabId}`,
        'summarizeUsage',
        'summarizeDefault'
      ], async (result) => {
        // Load summary
        if (result[`summary_${currentTabId}`]) {
          renderMarkdown(result[`summary_${currentTabId}`])
          summaryContainer.classList.remove("hidden")
        }

        // Load complexity
        if (result[`complexity_${currentTabId}`] !== undefined) {
          complexitySlider.value = result[`complexity_${currentTabId}`]
          updateSliderThumbPosition(complexitySlider.value)
        } else {
          updateSliderThumbPosition(1)
        }

        // Load usage and default
        summarizeUsage = result.summarizeUsage || 0
        summarizeDefault = result.summarizeDefault || 'perplexity-sonar'
        
        // Set the saved default (ensure it's never perplexity-sonar)
        if (result.summarizeDefault && result.summarizeDefault !== 'perplexity-sonar') {
          setAsDefault(result.summarizeDefault)
        } else {
          // Always default to Gemini Flash if no saved default or if it was perplexity
          setAsDefault('gemini-flash-2.5')
          chrome.storage.local.set({ summarizeDefault: 'gemini-flash-2.5' })
        }

        // Initialize UI
        setupTabs()
        await updateTabIndicators()
        
        // Debug stored keys
        debugStoredKeys()
        
        // Switch to the first provider tab that doesn't have an API key
        let hasFoundProviderWithoutKey = false
        for (const providerId of Object.keys(providers)) {
          const provider = providers[providerId]
          const hasKey = await hasApiKey(provider.keyName)
          if (!hasKey && !hasFoundProviderWithoutKey) {
            currentProvider = providerId
            await switchTab(providerId)
            hasFoundProviderWithoutKey = true
            break
          }
        }
        
        // If all providers have keys or none found, default to openai
        if (!hasFoundProviderWithoutKey) {
          currentProvider = 'openai'
          await switchTab('openai')
        }
        
        updateSummarizeSection()
      })
    }
  })

  // Function to update slider thumb position
  function updateSliderThumbPosition(value) {
    const sliderContainer = document.querySelector(".slider-container")
    const containerWidth = sliderContainer.offsetWidth
    const thumbWidth = 36
    const leftPadding = 8
    const rightPadding = 8
    const availableWidth = containerWidth - leftPadding - rightPadding - thumbWidth

    let leftPosition
    if (value == 0) {
      leftPosition = leftPadding
    } else if (value == 1) {
      leftPosition = leftPadding + availableWidth / 2
    } else {
      leftPosition = containerWidth - rightPadding - thumbWidth
    }

    sliderThumb.style.left = `${leftPosition}px`
  }

  // Function to render Markdown
  function renderMarkdown(text) {
    let html = text
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>") 
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/^\* (.*$)/gim, "<ul><li>$1</li></ul>")
      .replace(/^- (.*$)/gim, "<ul><li>$1</li></ul>")
      .replace(/<\/ul>\s*<ul>/gim, "")
      .replace(/\n\s*\n/gim, "</p><p>")

    if (!html.startsWith("<h") && !html.startsWith("<p>")) {
      html = "<p>" + html + "</p>"
    }

    summaryContent.innerHTML = html
  }

  // Show notification
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    
    // Enhanced styling based on type
    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      error: { bg: '#ef4444', border: '#dc2626' },
      info: { bg: '#3b82f6', border: '#2563eb' }
    }
    
    const color = colors[type] || colors.info
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      border: 1px solid ${color.border};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 320px;
      line-height: 1.4;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)'
    }, 100)
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, type === 'error' ? 6000 : 4000) // Show errors longer
  }

  // Make labels clickable
  sliderLabelGroups.forEach((group) => {
    group.addEventListener("click", () => {
      const value = Number.parseInt(group.getAttribute("data-value"))
      complexitySlider.value = value
      updateSliderThumbPosition(value)

      if (currentTabId) {
        chrome.storage.local.set({ [`complexity_${currentTabId}`]: value })
      }
    })
  })

  // Update thumb position when slider value changes
  complexitySlider.addEventListener("input", () => {
    updateSliderThumbPosition(complexitySlider.value)
  })

  // Close panel
  closeButton.addEventListener("click", () => {
    window.parent.postMessage({ action: "closePanel" }, "*")
  })

  // Summarize button
  summarizeBtn.addEventListener("click", async () => {
    summaryContainer.classList.add("hidden")
    errorContainer.classList.add("hidden")

    const defaultModel = getDefaultModel()
    const provider = providers[defaultModel.provider]
    let apiKey = null
    
    // Only require API key for non-system models
    if (provider && provider.keyName && !defaultModel.isSystemDefault) {
      apiKey = await getApiKey(provider.keyName)
      if (!apiKey) {
        showNotification(`API key required for ${defaultModel.name}`, 'error')
        return
      }
    }

    loadingIndicator.classList.remove("hidden")
    summarizeBtn.disabled = true

    const complexityLevel = complexityLevels[complexitySlider.value]

    // Only increment usage and enforce limits for system default (Gemini Flash)
    const isUsingSystemDefault = defaultModel.id === 'gemini-flash-2.5'
    if (isUsingSystemDefault) {
      if (summarizeUsage >= 25) {
        showNotification('Monthly limit reached. Please use your own API key for unlimited access.', 'error')
        summarizeBtn.disabled = false
        loadingIndicator.classList.add('hidden')
        return
      }
      
      summarizeUsage++
      chrome.storage.local.set({ summarizeUsage })
      updateSummarizeSection()
    }

    // Send message to content script
    window.parent.postMessage({
      action: "extractContent",
      complexity: complexityLevel,
      model: defaultModel.id,
      apiKey: apiKey
    }, "*")
  })

  // Listen for messages from the content script
  window.addEventListener("message", (event) => {
    if (event.data.action === "summaryResult") {
      loadingIndicator.classList.add("hidden")

      if (event.data.error) {
        errorMessage.textContent = event.data.error
        errorContainer.classList.remove("hidden")
      } else {
        renderMarkdown(event.data.summary)
        summaryContainer.classList.remove("hidden")

        if (event.data.tabId) {
          chrome.storage.local.set({ [`summary_${event.data.tabId}`]: event.data.summary })
        } else if (currentTabId) {
          chrome.storage.local.set({ [`summary_${currentTabId}`]: event.data.summary })
        }
      }

      summarizeBtn.disabled = false
    }
  })

  // Model selector popup handlers
  modelSelectorBtn.addEventListener("click", () => {
    modelSelectorOverlay.classList.remove("hidden")
  })

  closeModelSelector.addEventListener("click", () => {
    modelSelectorOverlay.classList.add("hidden")
  })

  // Close popup when clicking outside the card
  modelSelectorOverlay.addEventListener("click", (e) => {
    if (e.target === modelSelectorOverlay) {
      modelSelectorOverlay.classList.add("hidden")
    }
  })

  // Prevent clicks inside the popup from bubbling up to close the popup
  const modelSelectorPopup = modelSelectorOverlay.querySelector('.model-selector-popup')
  if (modelSelectorPopup) {
    modelSelectorPopup.addEventListener("click", (e) => {
      e.stopPropagation()
    })
  }

  // Initialize slider position and handle resize
  updateSliderThumbPosition(complexitySlider.value)
  window.addEventListener("resize", () => {
    updateSliderThumbPosition(complexitySlider.value)
  })
})
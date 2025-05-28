// Wait for all scripts to load before initializing
function initializeExtension() {
  // Check if required classes are available
  if (typeof KeyManager === 'undefined') {
    console.error('KeyManager class not found. Make sure crypto.js is loaded first.')
    setTimeout(initializeExtension, 100) // Retry after 100ms
    return
  }
  
  if (typeof ContentSecurity === 'undefined') {
    console.error('ContentSecurity class not found. Make sure content-security.js is loaded first.')
    setTimeout(initializeExtension, 100) // Retry after 100ms
    return
  }
  
  // Initialize security managers
  console.log('Initializing KeyManager and ContentSecurity...')
  let keyManager, contentSecurity
  try {
    keyManager = new KeyManager()
    contentSecurity = new ContentSecurity()
    console.log('KeyManager:', keyManager)
    console.log('ContentSecurity:', contentSecurity)
  } catch (error) {
    console.error("Error initializing security managers:", error)
    keyManager = null
    contentSecurity = null
  }
  
  // Basic panel elements
  console.log("Selecting panel elements...")
  const summarizeBtn = document.getElementById("summarizeBtn")
  const loadingIndicator = document.getElementById("loadingIndicator")
  const loadingText = document.getElementById("loadingText")
  const summaryContainer = document.getElementById("summaryContainer")
  const summaryContent = document.getElementById("summaryContent")
  const errorContainer = document.getElementById("errorContainer")
  const errorMessage = document.getElementById("errorMessage")
  const complexitySlider = document.getElementById("complexitySlider")
  const sliderLabelGroups = document.querySelectorAll(".slider-label-group")
  const closeButton = document.getElementById("closePanel")
  const sliderThumb = document.getElementById("sliderThumb")
  
  // Custom query elements
  const customQueryBtn = document.getElementById("customQueryBtn")
  const customQueryContainer = document.getElementById("customQueryContainer")
  const customQueryInput = document.getElementById("customQueryInput")
  const clearQueryBtn = document.getElementById("clearQueryBtn")
  const closeQueryBtn = document.getElementById("closeQueryBtn")
  
  // New shadcn-style elements
  const promptsBtn = document.getElementById("promptsBtn")
  const modelSelectorBtn = document.getElementById("modelSelectorBtn")
  const modelSelectorOverlay = document.getElementById("modelSelectorOverlay")
  const closeModelSelector = document.getElementById("closeModelSelector")
  const tabsList = document.getElementById("tabsList")
  const apiKeyContainer = document.getElementById("apiKeyContainer")
  const modelsList = document.getElementById("modelsList")
  const usageCounter = document.getElementById("usageCounter")
  const setDefaultBtn = document.getElementById("setDefaultBtn")
  const defaultModelName = document.getElementById("defaultModelName")
  const footerUsageCounter = document.getElementById("footerUsageCounter")
  const limitReachedState = document.getElementById("limitReachedState")
  const limitReachedModelBtn = document.getElementById("limitReachedModelBtn")

  // Prompt editor elements
  const promptEditorOverlay = document.getElementById("promptEditorOverlay")
  const closePromptEditor = document.getElementById("closePromptEditor")
  const eli5PromptTextarea = document.getElementById("eli5Prompt")
  const standardPromptTextarea = document.getElementById("standardPrompt")
  const phdPromptTextarea = document.getElementById("phdPrompt")
  const savePromptEdit = document.getElementById("savePromptEdit")
  const cancelPromptEdit = document.getElementById("cancelPromptEdit")
  // Remove resetToDefault element reference since it's no longer in HTML

  // State
  let currentProvider = "openai"
  let currentTabId = null
  let summarizeUsage = 0
  let summarizeDefault = "gemini-flash-2.5"

  // Default prompts
  const defaultPrompts = {
    eli5: "Create a short, simple summary of the content from {url} that a 10-year-old would understand. Format as 3-5 bullet points covering the most important ideas. Use simple words and short sentences. Start directly with bullet points - no introduction needed.",
    standard: "Summarize the content from {url} using insightful bullet points. Focus on key takeaways, main arguments, and practical insights that readers can apply. Organize information clearly with 5-8 comprehensive bullet points. Ensure the summary is complete and doesn't end abruptly.",
    phd: "Provide a comprehensive analytical summary of the content from {url} using detailed bullet points. Include critical analysis, implications, technical context, and scholarly insights. Use 8-12 in-depth bullet points with sub-points where appropriate. Ensure thorough coverage without abrupt endings - complete all important aspects of the content."
  }

  // Custom prompts (loaded from storage)
  let customPrompts = { ...defaultPrompts }
  
  
  // Complexity levels
  const complexityLevels = ["eli5", "standard", "phd"]
  const complexityLabels = {
    "eli5": "ELI5 Summary",
    "standard": "Standard Summary", 
    "phd": "Expert-Level Summary"
  }

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

  // Provider API key URLs
  const providerApiUrls = {
    openai: "https://platform.openai.com/api-keys",
    anthropic: "https://console.anthropic.com/settings/keys", 
    google: "https://aistudio.google.com/app/apikey",
    perplexity: "https://www.perplexity.ai/settings/api",
    xai: "https://console.x.ai/"
  }

  // Models data (Gemini Flash as default, separate from user API keys)
  // Model IDs match the API expected format
  const models = [
    { id: "gemini-flash-2.5", name: "Gemini Flash 2.5", provider: "google", isDefault: true, isSystemDefault: true, apiId: "google-gemini-2.5-flash" },
    { id: "perplexity-sonar", name: "Perplexity Sonar", provider: "perplexity", apiId: "perplexity-sonar" },
    { id: "gemini-flash-2.5-user", name: "Gemini Flash 2.5", provider: "google", apiId: "google-gemini-2.5-flash" },
    { id: "gemini-pro-2.5", name: "Gemini Pro 2.5", provider: "google", apiId: "google-gemini-2.5-pro" },
    { id: "claude-sonnet-4", name: "Claude Sonnet 4", provider: "anthropic", apiId: "anthropic-claude-sonnet-4" },
    { id: "claude-opus-4", name: "Claude Opus 4", provider: "anthropic", apiId: "anthropic-claude-opus-4" },
    { id: "claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "anthropic", apiId: "anthropic-claude-3.5-haiku" },
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", apiId: "openai-gpt-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", apiId: "openai-gpt-4o-mini" },
    { id: "gpt-4.1", name: "GPT-4.1", provider: "openai", apiId: "openai-gpt-4.1" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai", apiId: "openai-gpt-4.1-mini" },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "openai", apiId: "openai-gpt-4.1-nano" },
    { id: "o3-mini", name: "o3 Mini", provider: "openai", apiId: "openai-o3-mini" },
    { id: "o1-mini", name: "o1 Mini", provider: "openai", apiId: "openai-o1-mini" },
    { id: "grok-3", name: "Grok 3", provider: "xai", apiId: "x-grok-3" }
  ]

  // Get models for a specific provider (exclude system defaults from provider lists)
  function getModelsForProvider(providerId) {
    return models.filter(model => model.provider === providerId && !model.isSystemDefault)
  }

  // Get default model
  function getDefaultModel() {
    return models.find(model => model.isDefault) || models[0]
  }

  // Set model as default
  async function setAsDefault(modelId) {
    models.forEach(model => {
      model.isDefault = model.id === modelId
    })
    
    // Update summarize default and persist it
    summarizeDefault = modelId
    chrome.storage.local.set({ summarizeDefault: modelId })
    await updateSummarizeSection()
    renderModelsForCurrentProvider()
    updateTopNavModel()
    updateComplexityLabel()
  }

  // Mask API key for display
  function maskApiKey(apiKey) {
    console.log('Masking API key:', typeof apiKey, apiKey ? apiKey.length : 'null')
    if (!apiKey || typeof apiKey !== 'string') {
      console.log('Invalid API key for masking')
      return 'Invalid key'
    }
    if (apiKey.length <= 8) return apiKey
    
    // Simply return a clean masked format without trying to show actual characters
    // This avoids any encoding issues with the stored key
    return '••••••••••••••••••••••••••••••'
  }

  // Simplified API key check
  async function hasApiKey(keyName) {
    return new Promise((resolve) => {
      chrome.storage.local.get([`encrypted_${keyName}`], (result) => {
        const hasKey = !!result[`encrypted_${keyName}`]
        console.log(`hasApiKey(${keyName}):`, hasKey, result[`encrypted_${keyName}`] ? 'exists' : 'not found')
        resolve(hasKey)
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
          let apiKey = atob(encryptedKey)
          // Clean any problematic characters that might have been introduced during encoding
          apiKey = apiKey.replace(/Â/g, '').replace(/[^\x20-\x7E]/g, '')
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
            <span class="key-preview" id="key-preview-${currentProvider}"></span>
          </div>
          <div class="api-key-actions">
            <button class="btn-small btn-ghost btn-icon edit-key-btn" data-provider="${currentProvider}" title="Edit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-small btn-ghost btn-icon remove-key-btn" data-provider="${currentProvider}" title="Remove">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      `
      
      // Set the masked key using textContent to avoid HTML encoding issues
      const keyPreview = document.getElementById(`key-preview-${currentProvider}`)
      if (keyPreview) {
        keyPreview.textContent = maskedKey
      }
      
      // Add event listeners for edit and remove buttons
      const editBtn = apiKeyContainer.querySelector('.edit-key-btn')
      const removeBtn = apiKeyContainer.querySelector('.remove-key-btn')
      
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          const providerId = editBtn.getAttribute('data-provider')
          console.log('Edit key clicked for:', providerId)
          editApiKey(providerId)
        })
      }
      
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          const providerId = removeBtn.getAttribute('data-provider')
          console.log('Remove key clicked for:', providerId)
          removeApiKey(providerId)
        })
      }
      
      // Show status indicator
      const indicator = document.getElementById(`${currentProvider}-indicator`)
      if (indicator) {
        indicator.classList.remove('hidden')
      }
    } else {
      apiKeyContainer.innerHTML = `
        <div class="api-key-info-text">
          <p class="api-key-description">For unlimited uses, enter your API key. Your API key is stored locally on your device and never sent to our servers. We prioritize your privacy and security.</p>
        </div>
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
    
    // Pre-check API keys for all providers that have models in this list
    const providerKeys = {}
    for (const model of providerModels) {
      if (!providerKeys[model.provider]) {
        const modelProvider = providers[model.provider]
        if (modelProvider) {
          providerKeys[model.provider] = await hasApiKey(modelProvider.keyName)
        }
      }
    }
    
    modelsList.innerHTML = providerModels.map(model => {
      const isDisabled = !providerHasKey && !model.isSystemDefault
      const buttonClass = isDisabled ? 'btn-small btn-ghost set-default-btn disabled' : 'btn-small btn-ghost set-default-btn'
      
      // Different button text for system default vs user API key models
      let buttonText = 'Use this'
      let buttonElement = ''
      
      if (isDisabled) {
        // Create link button for API key required (remove disabled class from links)
        const apiUrl = providerApiUrls[model.provider] || '#'
        const linkClass = 'btn-small btn-ghost set-default-btn api-key-link'
        buttonElement = `<a href="${apiUrl}" target="_blank" rel="noopener noreferrer" class="${linkClass}">API key required</a>`
      } else if (model.isSystemDefault) {
        buttonText = 'Use this (25/month)'
        buttonElement = `<button class="${buttonClass}" data-model-id="${model.id}">${buttonText}</button>`
      } else {
        buttonElement = `<button class="${buttonClass}" data-model-id="${model.id}">${buttonText}</button>`
      }
      
      // Determine if this model is active (selected as default and available)
      // System default models are always available, user models need API keys
      const modelHasKey = model.isSystemDefault || providerKeys[model.provider]
      const isActiveModel = model.isDefault && modelHasKey
      
      const cardClasses = []
      
      if (model.isDefault && !isActiveModel) {
        cardClasses.push('default') // Blue border when default but no API key
      }
      if (isActiveModel) {
        cardClasses.push('active') // Green background when default and available
      }
      
      // System default models get special treatment
      const modelDescription = model.isSystemDefault ? 
        '<div class="model-description">System default - uses Vercel environment keys</div>' : 
        ''
      
      return `
        <div class="model-card ${cardClasses.join(' ')}">
          <div class="model-card-header">
            <div class="model-info">
              <span class="model-name">${model.name}${model.isSystemDefault ? ' (System)' : ''}</span>
            </div>
            ${model.isDefault ? '<span class="default-badge">Active (Your Default)</span>' : buttonElement}
          </div>
          ${modelDescription}
        </div>
      `
    }).join('')
    
    // Add event listeners for "Use this" buttons
    const useThisButtons = modelsList.querySelectorAll('.set-default-btn:not(.disabled)')
    useThisButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const modelId = button.getAttribute('data-model-id')
        if (modelId) {
          console.log('Setting model as default:', modelId)
          await setAsDefault(modelId)
        }
      })
    })
  }

  // Update summarize section
  async function updateSummarizeSection() {
    const defaultModel = models.find(m => m.id === summarizeDefault)
    if (!defaultModel) {
      console.error('No default model found for ID:', summarizeDefault)
      return
    }
    
    const provider = providers[defaultModel.provider]
    if (!provider) {
      console.error('No provider found for model:', defaultModel)
      return
    }
    
    const hasUserApiKey = await hasApiKey(provider.keyName)
    const isUsingSystemDefault = defaultModel.isSystemDefault
    
    console.log('=== updateSummarizeSection DEBUG ===')
    console.log('Default model ID:', summarizeDefault)
    console.log('Default model object:', defaultModel)
    console.log('Provider:', provider)
    console.log('Provider key name:', provider.keyName)
    console.log('Has user API key:', hasUserApiKey)
    console.log('Model isSystemDefault:', defaultModel.isSystemDefault)
    console.log('Calculated isUsingSystemDefault:', isUsingSystemDefault)
    console.log('Current usage:', summarizeUsage)
    console.log('===================================')
    
    // Check if limit is reached for system default
    const limitReached = isUsingSystemDefault && summarizeUsage >= 25
    
    // Show/hide limit reached state and disable button accordingly
    if (limitReached) {
      summarizeBtn.disabled = true
      limitReachedState.classList.remove('hidden')
      usageCounter.textContent = '25/25 Monthly'
      updateResetTimer()
      console.log('Limit reached - showing limit state')
    } else {
      summarizeBtn.disabled = false
      limitReachedState.classList.add('hidden')
      
      if (isUsingSystemDefault) {
        usageCounter.textContent = `${summarizeUsage}/25 Monthly`
        console.log('Setting usage counter to:', `${summarizeUsage}/25 Monthly`)
      } else {
        usageCounter.textContent = 'Unlimited'
        console.log('Setting usage counter to: Unlimited')
      }
    }
    
    // Footer always shows current usage regardless of which model is being used
    footerUsageCounter.textContent = `${summarizeUsage}/25 free monthly summaries used`
    
    // Keep footer text static - do NOT update defaultModelName
    // defaultModelName should always show "Gemini Flash 2.5"
    
    // Show/hide set default button and badge - show badge if current default IS Gemini Flash
    const setDefaultBadge = document.getElementById("setDefaultBadge")
    const modelSelectorFooter = document.querySelector(".model-selector-footer")
    
    if (summarizeDefault === 'gemini-flash-2.5') {
      setDefaultBtn.classList.add('hidden')
      if (setDefaultBadge) setDefaultBadge.classList.remove('hidden')
      if (modelSelectorFooter) modelSelectorFooter.classList.add('active')
    } else {
      setDefaultBtn.classList.remove('hidden')
      if (setDefaultBadge) setDefaultBadge.classList.add('hidden')
      if (modelSelectorFooter) modelSelectorFooter.classList.remove('active')
    }
    
    // Update top nav only
    updateTopNavModel()
  }

  // Calculate and display reset timer
  function updateResetTimer() {
    const resetTimerElement = document.getElementById('resetTimer')
    if (!resetTimerElement) return
    
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const timeUntilReset = nextMonth - now
    
    const days = Math.floor(timeUntilReset / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      resetTimerElement.textContent = `Resets in ${days} day${days > 1 ? 's' : ''}`
    } else if (hours > 0) {
      resetTimerElement.textContent = `Resets in ${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      resetTimerElement.textContent = 'Resets soon'
    }
  }

  // Update the current model display in top nav
  function updateTopNavModel() {
    const currentModelLabel = document.getElementById('currentModelLabel')
    const defaultModel = models.find(m => m.id === summarizeDefault)
    console.log('updateTopNavModel called:', {
      currentModelLabel: !!currentModelLabel,
      defaultModel: defaultModel,
      summarizeDefault: summarizeDefault
    })
    if (currentModelLabel && defaultModel) {
      currentModelLabel.textContent = defaultModel.name
      console.log('Updated currentModelLabel to:', defaultModel.name)
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


  // API key management functions
  async function editApiKey(providerId) {
    const provider = providers[providerId]
    
    apiKeyContainer.innerHTML = `
      <div class="key-input-container">
        <input type="password" id="keyInput-${providerId}" class="key-input" placeholder="Enter ${provider.name} API key">
        <button class="btn-small btn-primary" disabled>Save</button>
        <button class="btn-small btn-ghost btn-icon cancel-edit-btn" data-provider="${providerId}" title="Cancel">
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
    const cancelBtn = apiKeyContainer.querySelector('.cancel-edit-btn')
    
    keyInput.addEventListener('input', () => {
      saveBtn.disabled = !keyInput.value.trim()
    })
    
    // Add click event listener for save button
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault()
      saveApiKey(providerId)
    })
    
    // Add click event listener for cancel button
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        const providerId = cancelBtn.getAttribute('data-provider')
        console.log('Cancel edit clicked for:', providerId)
        cancelEdit(providerId)
      })
    }
    
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
        await setAsDefault(providerModels[0].id)
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

  async function removeApiKey(providerId) {
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
        await setAsDefault('gemini-flash-2.5')
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

  async function cancelEdit(providerId) {
    console.log('Cancel edit for:', providerId)
    await renderApiKeySection()
  }

  // Functions are now properly scoped and use event listeners

  
  // Setup model selector button
  modelSelectorBtn.addEventListener('click', async () => {
    const isVisible = !modelSelectorOverlay.classList.contains('hidden')
    if (isVisible) {
      modelSelectorOverlay.classList.add('hidden')
      // Refresh the display when closing
      await updateSummarizeSection()
    } else {
      modelSelectorOverlay.classList.remove('hidden')
    }
  })
  
  // Setup set default button
  setDefaultBtn.addEventListener('click', async () => {
    await setAsDefault('gemini-flash-2.5')
    chrome.storage.local.set({ summarizeDefault: 'gemini-flash-2.5' })
  })
  
  // Setup limit reached model button
  limitReachedModelBtn.addEventListener('click', () => {
    modelSelectorOverlay.classList.remove('hidden')
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

  // Load custom prompts from storage
  async function loadCustomPrompts() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customPrompts'], (result) => {
        if (result.customPrompts) {
          customPrompts = { ...defaultPrompts, ...result.customPrompts }
        }
        resolve()
      })
    })
  }


  // Save custom prompts to storage
  function saveCustomPrompts() {
    chrome.storage.local.set({ customPrompts })
  }


  // Open prompt editor
  function openPromptEditor() {
    console.log('Opening prompt editor...')
    console.log('Current custom prompts:', customPrompts)
    
    // Prefill with the exact prompts that are being sent to models
    if (eli5PromptTextarea) {
      eli5PromptTextarea.value = customPrompts.eli5 || defaultPrompts.eli5
    }
    if (standardPromptTextarea) {
      standardPromptTextarea.value = customPrompts.standard || defaultPrompts.standard
    }
    if (phdPromptTextarea) {
      phdPromptTextarea.value = customPrompts.phd || defaultPrompts.phd
    }
    
    if (promptEditorOverlay) {
      promptEditorOverlay.classList.remove("hidden")
    }
  }

  // Close prompt editor
  function closePromptEditorPopup() {
    console.log('Closing prompt editor...')
    if (promptEditorOverlay) {
      promptEditorOverlay.classList.add("hidden")
      console.log('Popup should now be hidden')
    }
  }

  // Save edited prompts
  function saveEditedPrompts() {
    // Save prompts
    customPrompts.eli5 = eli5PromptTextarea.value.trim()
    customPrompts.standard = standardPromptTextarea.value.trim()
    customPrompts.phd = phdPromptTextarea.value.trim()
    
    // Fallback to defaults if empty
    if (!customPrompts.eli5) customPrompts.eli5 = defaultPrompts.eli5
    if (!customPrompts.standard) customPrompts.standard = defaultPrompts.standard
    if (!customPrompts.phd) customPrompts.phd = defaultPrompts.phd
    
    saveCustomPrompts()
    closePromptEditorPopup()
  }

  // Reset prompts to default
  function resetPromptsToDefault() {
    console.log('Resetting prompts to default...')
    
    // Reset the textareas to default prompts
    if (eli5PromptTextarea) {
      eli5PromptTextarea.value = defaultPrompts.eli5
    }
    if (standardPromptTextarea) {
      standardPromptTextarea.value = defaultPrompts.standard
    }
    if (phdPromptTextarea) {
      phdPromptTextarea.value = defaultPrompts.phd
    }
    
    console.log('Prompts reset to defaults in textareas')
  }

  // Reset individual prompt to default
  function resetIndividualPrompt(promptType) {
    console.log('Resetting individual prompt to default:', promptType)
    
    switch (promptType) {
      case 'eli5':
        if (eli5PromptTextarea) {
          eli5PromptTextarea.value = defaultPrompts.eli5
        }
        break
      case 'standard':
        if (standardPromptTextarea) {
          standardPromptTextarea.value = defaultPrompts.standard
        }
        break
      case 'phd':
        if (phdPromptTextarea) {
          phdPromptTextarea.value = defaultPrompts.phd
        }
        break
    }
    
    console.log(`${promptType} prompt reset to default`)
  }

  // Get current prompt for complexity level
  function getCurrentPrompt(complexity) {
    return customPrompts[complexity] || defaultPrompts[complexity]
  }


  // Initialize prompt editor event listeners (will be called after DOM is ready)
  function initializePromptEditor() {
    // Ensure popup starts hidden
    if (promptEditorOverlay) {
      promptEditorOverlay.classList.add("hidden")
    }

    // Event listeners for prompt editor
    if (closePromptEditor) {
      closePromptEditor.addEventListener("click", closePromptEditorPopup)
    }
    
    if (cancelPromptEdit) {
      cancelPromptEdit.addEventListener("click", closePromptEditorPopup)
    }
    
    if (savePromptEdit) {
      savePromptEdit.addEventListener("click", saveEditedPrompts)
    }

    // Removed global reset button - now using individual reset buttons only

    // Add event listeners for individual reset buttons
    document.querySelectorAll('.btn-reset-individual').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const promptType = btn.getAttribute('data-prompt')
        resetIndividualPrompt(promptType)
      })
    })

    // Add event listener for prompts button
    if (promptsBtn) {
      promptsBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        openPromptEditor()
      })
    }

    // Close prompt editor when clicking outside
    if (promptEditorOverlay) {
      promptEditorOverlay.addEventListener("click", (e) => {
        if (e.target === promptEditorOverlay) {
          closePromptEditorPopup()
        }
      })
    }
  }

  // Initialize the panel
  chrome.runtime.sendMessage({ action: "getCurrentTabId" }, async (response) => {
    if (response && response.tabId) {
      currentTabId = response.tabId

      // Load custom prompts first
      await loadCustomPrompts()

      // Load saved data
      chrome.storage.local.get([
        `summary_${currentTabId}`, 
        `summary_eli5_${currentTabId}`,
        `summary_standard_${currentTabId}`,
        `summary_phd_${currentTabId}`,
        `complexity_${currentTabId}`, 
        `model_${currentTabId}`,
        'summarizeUsage',
        'summarizeDefault'
      ], async (result) => {
        // Load complexity first, then summary for that complexity
        if (result[`complexity_${currentTabId}`] !== undefined) {
          complexitySlider.value = result[`complexity_${currentTabId}`]
        } else {
          complexitySlider.value = 1 // default to standard
        }
        
        // Update slider position and label
        updateSliderThumbPosition(complexitySlider.value)
        updateComplexityLabel()
        
        // Load summary for the current complexity level
        loadSummaryForCurrentComplexity()
        
        // Fallback: if no complexity-specific summary exists, try old format
        setTimeout(() => {
          if (summaryContainer.classList.contains("hidden")) {
            if (result[`summary_${currentTabId}`]) {
              // Handle old format (just text)
              const oldSummary = result[`summary_${currentTabId}`]
              const summaryText = typeof oldSummary === 'string' ? oldSummary : oldSummary.content
              if (summaryText) {
                renderMarkdown(summaryText)
                summaryContainer.classList.remove("hidden")
              }
            }
          }
        }, 100)

        // Load usage and default
        summarizeUsage = result.summarizeUsage || 0
        summarizeDefault = result.summarizeDefault || 'gemini-flash-2.5'
        
        // Check if usage should reset (monthly reset)
        const now = new Date()
        const lastResetDate = result.usageResetDate ? new Date(result.usageResetDate) : null
        
        // Only reset if we have a reset date AND it's a different month/year
        // If no reset date exists, initialize it without resetting usage
        if (lastResetDate && (now.getMonth() !== lastResetDate.getMonth() || now.getFullYear() !== lastResetDate.getFullYear())) {
          summarizeUsage = 0
          const resetDate = new Date(now.getFullYear(), now.getMonth(), 1) // First day of current month
          chrome.storage.local.set({ 
            summarizeUsage: 0, 
            usageResetDate: resetDate.toISOString() 
          })
        } else if (!lastResetDate) {
          // First time - set reset date without resetting usage
          const resetDate = new Date(now.getFullYear(), now.getMonth(), 1)
          chrome.storage.local.set({ 
            usageResetDate: resetDate.toISOString() 
          })
        }
        
        console.log('=== INITIAL LOAD DEBUG ===')
        console.log('Loaded summarizeUsage:', summarizeUsage)
        console.log('Loaded summarizeDefault:', summarizeDefault)
        console.log('Default model object:', models.find(m => m.id === summarizeDefault))
        console.log('============================')
        
        // Set the saved default (always ensure it's valid)
        if (result.summarizeDefault) {
          // Check if the saved model still exists
          const savedModel = models.find(m => m.id === result.summarizeDefault)
          if (savedModel) {
            await setAsDefault(result.summarizeDefault)
          } else {
            // Model no longer exists, reset to default
            await setAsDefault('gemini-flash-2.5')
            chrome.storage.local.set({ summarizeDefault: 'gemini-flash-2.5' })
          }
        } else {
          // No saved default, use Gemini Flash
          await setAsDefault('gemini-flash-2.5')
          chrome.storage.local.set({ summarizeDefault: 'gemini-flash-2.5' })
        }

        // Initialize UI
        setupTabs()
        await updateTabIndicators()
        
        // Debug stored keys
        debugStoredKeys()
        
        // Clean up any invalid stored model defaults
        chrome.storage.local.get(['summarizeDefault'], async (result) => {
          if (result.summarizeDefault) {
            const isValidModel = models.some(m => m.id === result.summarizeDefault)
            if (!isValidModel) {
              console.log('Clearing invalid stored model:', result.summarizeDefault)
              chrome.storage.local.set({ summarizeDefault: 'gemini-flash-2.5' })
              await setAsDefault('gemini-flash-2.5')
            }
          }
        })
        
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
        
        await updateSummarizeSection()
        
        // Ensure the top nav model is updated
        updateTopNavModel()
        
        // Debug: Check the state after initialization
        console.log('After initialization:', {
          summarizeDefault,
          summarizeUsage,
          usageCounterText: usageCounter.textContent
        })
        
        // Initialize prompt editor after everything else is loaded
        initializePromptEditor()
        
        // Initialize custom query functionality
        initializeCustomQuery()
      })
    }
  })

  // Function to update complexity label
  function updateComplexityLabel() {
    if (!complexitySlider) return
    
    const complexityLevel = complexityLevels[complexitySlider.value]
    const complexityLabel = document.getElementById("complexityLabel")
    
    if (complexityLabel) {
      // Check if there's an existing summary for this complexity level
      if (currentTabId) {
        const storageKey = `summary_${complexityLevel}_${currentTabId}`
        chrome.storage.local.get([storageKey], (result) => {
          const summaryData = result[storageKey]
          
          // If there's an existing summary, show the model that generated it
          if (summaryData) {
            let modelName
            if (typeof summaryData === 'object' && summaryData.modelName) {
              // New format with model info
              modelName = summaryData.modelName
            } else {
              // Old format (just text) - we don't know what model generated it
              modelName = 'Unknown Model'
            }
            complexityLabel.textContent = `${complexityLabels[complexityLevel]} • ${modelName}`
          } else {
            // No existing summary, show currently selected model
            const defaultModel = models.find(m => m.id === summarizeDefault)
            const modelName = defaultModel ? defaultModel.name : 'Gemini Flash 2.5'
            complexityLabel.textContent = `${complexityLabels[complexityLevel]} • ${modelName}`
          }
        })
      } else {
        // No tab ID available, show currently selected model
        const defaultModel = models.find(m => m.id === summarizeDefault)
        const modelName = defaultModel ? defaultModel.name : 'Gemini Flash 2.5'
        complexityLabel.textContent = `${complexityLabels[complexityLevel]} • ${modelName}`
      }
    }
  }

  // Function to load and display summary for current complexity level
  function loadSummaryForCurrentComplexity() {
    if (!currentTabId) return
    
    const complexityLevel = complexityLevels[complexitySlider.value]
    const storageKey = `summary_${complexityLevel}_${currentTabId}`
    
    chrome.storage.local.get([storageKey], (result) => {
      if (result[storageKey]) {
        // Handle both old format (just text) and new format (object with content and model)
        const summaryData = result[storageKey]
        const summaryText = typeof summaryData === 'string' ? summaryData : summaryData.content
        
        if (summaryText) {
          renderMarkdown(summaryText)
          summaryContainer.classList.remove("hidden")
          errorContainer.classList.add("hidden")
        } else {
          summaryContainer.classList.add("hidden")
          errorContainer.classList.add("hidden")
        }
      } else {
        // No summary available for this complexity level
        summaryContainer.classList.add("hidden")
        errorContainer.classList.add("hidden")
      }
      
      // Update complexity label after loading summary
      updateComplexityLabel()
      
      // Update slider position after content changes (scrollbar might appear/disappear)
      setTimeout(() => {
        updateSliderThumbPosition(complexitySlider.value)
      }, 50)
    })
  }

  // Function to update slider thumb position
  function updateSliderThumbPosition(value) {
    const sliderContainer = document.querySelector(".slider-container")
    
    if (!sliderContainer || !sliderThumb) return
    
    // Force a reflow to get accurate measurements
    sliderContainer.offsetHeight
    
    const containerWidth = sliderContainer.offsetWidth
    const thumbWidth = 36
    const leftPadding = 8
    const rightPadding = 8
    
    // Ensure we have a minimum width to prevent issues
    const minContainerWidth = thumbWidth + leftPadding + rightPadding + 20
    const effectiveContainerWidth = Math.max(containerWidth, minContainerWidth)
    const availableWidth = effectiveContainerWidth - leftPadding - rightPadding - thumbWidth

    let leftPosition
    if (value == 0) {
      leftPosition = leftPadding
    } else if (value == 1) {
      leftPosition = leftPadding + availableWidth / 2
    } else {
      leftPosition = effectiveContainerWidth - rightPadding - thumbWidth
    }

    // Clamp position to stay within bounds
    leftPosition = Math.max(leftPadding, Math.min(leftPosition, effectiveContainerWidth - rightPadding - thumbWidth))

    sliderThumb.style.left = `${leftPosition}px`
    
    // Update thumb icon based on value
    sliderThumb.className = 'slider-thumb'
    if (value == 0) {
      sliderThumb.classList.add('eli5')
    } else if (value == 1) {
      sliderThumb.classList.add('standard')
    } else {
      sliderThumb.classList.add('expert')
    }
  }

  // Function to render Markdown
  function renderMarkdown(text) {
    let html = text
    
    // First handle code blocks to protect them from other replacements
    html = html.replace(/```([\s\S]*?)```/gim, "<pre><code>$1</code></pre>")
    html = html.replace(/`(.*?)`/gim, "<code>$1</code>")
    
    // Handle headers
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>")
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>") 
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>")
    
    // Handle bold and italic formatting (order matters - triple asterisks first)
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>")
    html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    html = html.replace(/\*((?![*\s]).*?(?<![*\s]))\*/gim, "<em>$1</em>")
    
    // Handle bullet points (only at start of line with space after asterisk/dash)
    html = html.replace(/^[\*\-]\s+(.+)$/gim, "<li>$1</li>")
    
    // Handle numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gim, "<li>$1</li>")
    
    // Wrap consecutive list items in ul tags
    html = html.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/gim, function(match) {
      return "<ul>" + match + "</ul>"
    })
    
    // Handle line breaks and paragraphs
    html = html.replace(/\n\n+/gim, "</p><p>")
    html = html.replace(/\n/gim, "<br>")

    // Clean up any remaining asterisks that weren't processed
    html = html.replace(/(?<!\w)\*(?!\*)/g, "")

    // Wrap in paragraphs if needed
    if (!html.includes("<h") && !html.includes("<ul") && !html.includes("<ol") && !html.includes("<p>")) {
      html = "<p>" + html + "</p>"
    }

    summaryContent.innerHTML = html
    
    // Update slider position after content is rendered (in case scrollbar appears)
    setTimeout(() => {
      updateSliderThumbPosition(complexitySlider.value)
    }, 100)
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
  if (sliderLabelGroups && sliderLabelGroups.length > 0) {
    sliderLabelGroups.forEach((group) => {
      group.addEventListener("click", () => {
        const value = Number.parseInt(group.getAttribute("data-value"))
        if (complexitySlider) {
          complexitySlider.value = value
        }
        updateSliderThumbPosition(value)
        updateComplexityLabel()
        loadSummaryForCurrentComplexity()

        if (currentTabId) {
          chrome.storage.local.set({ [`complexity_${currentTabId}`]: value })
        }
      })
    })
  }

  // Update thumb position when slider value changes
  if (complexitySlider) {
    complexitySlider.addEventListener("input", () => {
      updateSliderThumbPosition(complexitySlider.value)
      updateComplexityLabel()
      loadSummaryForCurrentComplexity()
    })
    
    // Also add change event as fallback
    complexitySlider.addEventListener("change", () => {
      updateSliderThumbPosition(complexitySlider.value)
      updateComplexityLabel()
      loadSummaryForCurrentComplexity()
    })
  }

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

    // Start with "Extracting content..." state
    loadingText.textContent = "Extracting content..."
    loadingIndicator.classList.remove("hidden")
    summarizeBtn.disabled = true
    
    // After 2 seconds, transition to "Generating summary..."
    setTimeout(() => {
      if (loadingText && !loadingIndicator.classList.contains("hidden")) {
        loadingText.textContent = "Generating summary..."
      }
    }, 2000)

    const complexityLevel = complexityLevels[complexitySlider.value]

    // Only increment usage and enforce limits when using system default model
    const hasUserApiKey = await hasApiKey(provider.keyName)
    const isUsingSystemDefault = defaultModel.isSystemDefault
    
    console.log('=== USAGE TRACKING DEBUG ===')
    console.log('Model being used:', defaultModel)
    console.log('Model ID:', defaultModel.id)
    console.log('Model isSystemDefault:', defaultModel.isSystemDefault)
    console.log('Provider:', provider)
    console.log('Provider key name:', provider.keyName)
    console.log('Has user API key for provider:', hasUserApiKey)
    console.log('Calculated isUsingSystemDefault:', isUsingSystemDefault)
    console.log('Current usage before increment:', summarizeUsage)
    console.log('=============================')
    
    if (isUsingSystemDefault) {
      if (summarizeUsage >= 25) {
        // This shouldn't happen since button should be disabled, but safety check
        console.log('❌ Usage limit reached, request blocked')
        loadingIndicator.classList.add('hidden')
        loadingText.textContent = "Extracting content..."
        summarizeBtn.disabled = false
        return
      }
      
      summarizeUsage++
      console.log('✅ USAGE INCREMENTED! New usage:', summarizeUsage)
      
      // Save usage and ensure reset date is set for this month
      const now = new Date()
      const resetDate = new Date(now.getFullYear(), now.getMonth(), 1)
      chrome.storage.local.set({ 
        summarizeUsage,
        usageResetDate: resetDate.toISOString()
      })
      await updateSummarizeSection()
    } else {
      console.log('❌ Not incrementing usage because not using system default')
    }

    // Send message to content script with correct API model ID
    const modelToSend = defaultModel.isSystemDefault ? defaultModel.id : (defaultModel.apiId || defaultModel.id)
    console.log('=== SUMMARIZE REQUEST ===')
    console.log('Default model object:', defaultModel)
    console.log('Model ID being sent to API:', modelToSend)
    console.log('Is system default:', defaultModel.isSystemDefault)
    console.log('Has API key:', !!apiKey)
    
    // Get custom prompt for the selected complexity
    let customPrompt = getCurrentPrompt(complexityLevel)
    
    // Get custom query if available and modify the prompt to include it
    const customQuery = getCustomQuery()
    if (customQuery) {
      customPrompt = `${customPrompt}\n\nAdditional user instructions: ${customQuery}`
      console.log('Custom query added:', customQuery)
      console.log('Combined prompt:', customPrompt)
    }
    
    window.parent.postMessage({
      action: "extractContent",
      complexity: complexityLevel,
      model: modelToSend,
      apiKey: apiKey,
      customPrompt: customPrompt,
      customQuery: customQuery
    }, "*")
  })

  // Listen for messages from the content script
  window.addEventListener("message", (event) => {
    if (event.data.action === "summaryResult") {
      loadingIndicator.classList.add("hidden")
      // Reset loading text for next time
      loadingText.textContent = "Extracting content..."

      if (event.data.error) {
        errorMessage.textContent = event.data.error
        errorContainer.classList.remove("hidden")
      } else {
        renderMarkdown(event.data.summary)
        summaryContainer.classList.remove("hidden")

        // Save summary with complexity level and model information
        const complexityLevel = complexityLevels[complexitySlider.value]
        const defaultModel = models.find(m => m.id === summarizeDefault)
        const modelName = defaultModel ? defaultModel.name : 'Unknown Model'
        
        const summaryData = {
          content: event.data.summary,
          modelName: modelName,
          modelId: summarizeDefault,
          timestamp: Date.now()
        }
        
        if (event.data.tabId) {
          chrome.storage.local.set({ [`summary_${complexityLevel}_${event.data.tabId}`]: summaryData })
        } else if (currentTabId) {
          chrome.storage.local.set({ [`summary_${complexityLevel}_${currentTabId}`]: summaryData })
        }
        
        // Update the usage counter display after successful summary
        updateSummarizeSection().catch(console.error)
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
  if (complexitySlider && sliderThumb) {
    updateSliderThumbPosition(complexitySlider.value)
    updateComplexityLabel()
    loadSummaryForCurrentComplexity()
  }
  
  // Add resize observer for more robust positioning
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(() => {
      updateSliderThumbPosition(complexitySlider.value)
    })
    
    const sliderContainer = document.querySelector(".slider-container")
    if (sliderContainer) {
      resizeObserver.observe(sliderContainer)
    }
    
    // Also observe the main panel content
    const panelContent = document.querySelector(".panel-content")
    if (panelContent) {
      resizeObserver.observe(panelContent)
    }
  }
  
  // Fallback for older browsers
  window.addEventListener("resize", () => {
    updateSliderThumbPosition(complexitySlider.value)
  })
  
  // Also watch for content changes that might affect layout
  if (summaryContainer) {
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        updateSliderThumbPosition(complexitySlider.value)
      }, 50)
    })
    
    observer.observe(summaryContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
  }

  // Custom query functionality
  function initializeCustomQuery() {
    // Check for pre-selected text when panel opens
    checkForSelectedText()
    
    // Toggle custom query container
    customQueryBtn.addEventListener('click', () => {
      const isVisible = !customQueryContainer.classList.contains('hidden')
      
      if (isVisible) {
        customQueryContainer.classList.add('hidden')
        customQueryBtn.classList.remove('active')
      } else {
        customQueryContainer.classList.remove('hidden')
        customQueryBtn.classList.add('active')
        customQueryInput.focus()
      }
    })
    
    // Clear query input
    clearQueryBtn.addEventListener('click', () => {
      customQueryInput.value = ''
      customQueryInput.focus()
    })
    
    // Close query container
    closeQueryBtn.addEventListener('click', () => {
      customQueryContainer.classList.add('hidden')
      customQueryBtn.classList.remove('active')
    })
    
    // Auto-resize textarea based on content
    customQueryInput.addEventListener('input', () => {
      customQueryInput.style.height = 'auto'
      customQueryInput.style.height = Math.max(200, customQueryInput.scrollHeight) + 'px'
    })
  }

  // Check for selected text and pre-fill if available
  function checkForSelectedText() {
    // Send message to content script to get selected text
    window.parent.postMessage({ action: "getSelectedText" }, "*")
  }

  // Listen for selected text response
  window.addEventListener("message", (event) => {
    if (event.data.action === "selectedTextResult" && event.data.selectedText) {
      // Pre-fill and show custom query if there's selected text
      customQueryInput.value = `Focus on this part: "${event.data.selectedText}"`
      customQueryContainer.classList.remove('hidden')
      customQueryBtn.classList.add('active')
    }
  })

  // Update the summarize request to include custom query
  function getCustomQuery() {
    if (customQueryContainer.classList.contains('hidden') || !customQueryInput.value.trim()) {
      return null
    }
    return customQueryInput.value.trim()
  }
}

// Start the extension when DOM is ready
document.addEventListener("DOMContentLoaded", initializeExtension)
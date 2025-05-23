document.addEventListener("DOMContentLoaded", () => {
  // Initialize security managers
  const keyManager = new KeyManager()
  const contentSecurity = new ContentSecurity()
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
  
  // Custom dropdown elements
  const customModelSelector = document.getElementById("customModelSelector")
  const selectTrigger = document.getElementById("selectTrigger")
  const selectValue = document.getElementById("selectValue")
  const selectContent = document.getElementById("selectContent")
  const keyManagementBtn = document.getElementById("keyManagementBtn")
  const keyManagementDialog = document.getElementById("keyManagementDialog")
  const closeKeyDialog = document.getElementById("closeKeyDialog")
  const keyList = document.getElementById("keyList")
  const providerSelect = document.getElementById("providerSelect")
  const apiKeyInput = document.getElementById("apiKeyInput")
  const toggleKeyVisibility = document.getElementById("toggleKeyVisibility")
  const saveKeyBtn = document.getElementById("saveKeyBtn")
  
  // Current selected model
  let currentSelectedModel = "default"

  // Complexity levels
  const complexityLevels = ["eli5", "standard", "phd"]

  // Model configuration
  const modelConfig = {
    "default": { provider: "perplexity", requiresApiKey: false },
    "perplexity-sonar": { provider: "perplexity", requiresApiKey: true, keyName: "PERPLEXITY_API_KEY" },
    "openai-gpt-4o": { provider: "openai", requiresApiKey: true, keyName: "OPENAI_API_KEY" },
    "openai-o3": { provider: "openai", requiresApiKey: true, keyName: "OPENAI_API_KEY" },
    "openai-o4-mini": { provider: "openai", requiresApiKey: true, keyName: "OPENAI_API_KEY" },
    "google-gemini-2.5-pro": { provider: "google", requiresApiKey: true, keyName: "GOOGLE_API_KEY" },
    "google-gemini-2.5-flash": { provider: "google", requiresApiKey: true, keyName: "GOOGLE_API_KEY" },
    "anthropic-claude-sonnet-4": { provider: "anthropic", requiresApiKey: true, keyName: "ANTHROPIC_API_KEY" },
    "anthropic-claude-opus-4": { provider: "anthropic", requiresApiKey: true, keyName: "ANTHROPIC_API_KEY" },
    "anthropic-claude-sonnet-3.7": { provider: "anthropic", requiresApiKey: true, keyName: "ANTHROPIC_API_KEY" },
    "x-grok-3": { provider: "x", requiresApiKey: true, keyName: "X_API_KEY" }
  }

  // Provider names for display
  const providerNames = {
    openai: "OpenAI",
    google: "Google",
    anthropic: "Anthropic",
    x: "X.AI",
    perplexity: "Perplexity"
  }

  // Function to get display name for models
  function getModelDisplayName(modelId) {
    const displayNames = {
      "default": "Default (Perplexity - No API Key)",
      "perplexity-sonar": "Perplexity Sonar",
      "openai-gpt-4o": "OpenAI GPT-4o",
      "openai-o3": "OpenAI o3",
      "openai-o4-mini": "OpenAI o4-mini",
      "google-gemini-2.5-pro": "Google Gemini 2.5 Pro",
      "google-gemini-2.5-flash": "Google Gemini 2.5 Flash",
      "anthropic-claude-sonnet-4": "Anthropic Claude Sonnet 4",
      "anthropic-claude-opus-4": "Anthropic Claude Opus 4",
      "anthropic-claude-sonnet-3.7": "Anthropic Claude Sonnet 3.7",
      "x-grok-3": "X Grok 3"
    }
    return displayNames[modelId] || modelId
  }

  // Update the selected model display
  function updateSelectedModelDisplay() {
    selectValue.textContent = getModelDisplayName(currentSelectedModel)
    
    // Update selected state in dropdown
    const selectItems = selectContent.querySelectorAll('.select-item')
    selectItems.forEach(item => {
      if (item.getAttribute('data-value') === currentSelectedModel) {
        item.classList.add('selected')
      } else {
        item.classList.remove('selected')
      }
    })
  }

  // Custom dropdown functionality
  selectTrigger.addEventListener("click", () => {
    const isOpen = selectTrigger.classList.contains('open')
    if (isOpen) {
      closeDropdown()
    } else {
      openDropdown()
    }
  })

  function openDropdown() {
    selectTrigger.classList.add('open')
    selectContent.classList.remove('hidden')
    updateModelDropdownOrder()
  }

  function closeDropdown() {
    selectTrigger.classList.remove('open')
    selectContent.classList.add('hidden')
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (event) => {
    if (!customModelSelector.contains(event.target)) {
      closeDropdown()
    }
  })

  // Handle model selection
  selectContent.addEventListener('click', async (event) => {
    const selectItem = event.target.closest('.select-item')
    if (!selectItem) return

    const selectedModel = selectItem.getAttribute('data-value')
    
    // Check if API key is needed and prompt immediately
    if (modelConfig[selectedModel].requiresApiKey) {
      const existingKey = await keyManager.getApiKey(modelConfig[selectedModel].keyName)
      
      if (!existingKey) {
        // Open key management dialog for this provider
        const provider = modelConfig[selectedModel].provider
        openKeyManagementDialog(provider)
        return
      } else {
        // Model already has API key, just set as global default if different
        const currentGlobal = await getGlobalDefaultModel()
        if (currentGlobal !== selectedModel) {
          await setGlobalDefaultModel(selectedModel)
          showNotification(`${getModelDisplayName(selectedModel)} is now your default model`, 'info')
        }
      }
    } else {
      // For models that don't require API keys (like default)
      const currentGlobal = await getGlobalDefaultModel()
      if (currentGlobal !== selectedModel) {
        await setGlobalDefaultModel(selectedModel)
      }
    }
    
    currentSelectedModel = selectedModel
    updateSelectedModelDisplay()
    closeDropdown()
    
    // Save model preference for this tab (this now acts as tab-specific override)
    if (currentTabId) {
      chrome.storage.local.set({ [`model_${currentTabId}`]: selectedModel })
    }
  })

  // Function to check which models have API keys and update dropdown
  async function updateModelDropdownOrder() {
    const modelsWithKeys = []
    const modelsWithoutKeys = []

    // Check each model for stored API keys
    for (const [modelId, config] of Object.entries(modelConfig)) {
      if (modelId === "default") {
        modelsWithoutKeys.push({ id: modelId, config })
        continue
      }

      if (config.requiresApiKey) {
        const hasKey = await keyManager.hasApiKey(config.keyName)

        if (hasKey) {
          modelsWithKeys.push({ id: modelId, config })
        } else {
          modelsWithoutKeys.push({ id: modelId, config })
        }
      } else {
        modelsWithoutKeys.push({ id: modelId, config })
      }
    }

    // Update custom dropdown items
    const selectItems = selectContent.querySelectorAll('.select-item')
    
    selectItems.forEach(item => {
      const modelId = item.getAttribute('data-value')
      const statusElement = item.querySelector('.item-status')
      
      if (modelId === 'default') {
        // Default doesn't need status
        return
      }
      
      const hasKey = modelsWithKeys.some(m => m.id === modelId)
      
      if (hasKey) {
        statusElement.textContent = '🔑✅ Configured'
        statusElement.setAttribute('data-status', 'configured')
      } else {
        statusElement.textContent = '🔑 Required'
        statusElement.setAttribute('data-status', 'unconfigured')
      }
    })

    // Get global default model preference if not already set
    if (currentSelectedModel === "default") {
      const globalDefault = await getGlobalDefaultModel()
      
      // Set the dropdown to the global default if it exists and is configured
      if (globalDefault && modelsWithKeys.some(m => m.id === globalDefault)) {
        currentSelectedModel = globalDefault
      } else if (modelsWithKeys.length > 0) {
        // If no global default, use first configured model
        currentSelectedModel = modelsWithKeys[0].id
      } else {
        currentSelectedModel = "default"
      }
      
      // Update UI
      updateSelectedModelDisplay()
    }
  }

  // Get global default model
  async function getGlobalDefaultModel() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['globalDefaultModel'], (result) => {
        resolve(result.globalDefaultModel)
      })
    })
  }

  // Set global default model
  async function setGlobalDefaultModel(modelId) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ globalDefaultModel: modelId }, resolve)
    })
  }

  // API Key Management Dialog Functions
  keyManagementBtn.addEventListener('click', () => {
    openKeyManagementDialog()
  })

  closeKeyDialog.addEventListener('click', () => {
    closeKeyManagementDialog()
  })

  // Close dialog when clicking overlay
  keyManagementDialog.addEventListener('click', (event) => {
    if (event.target === keyManagementDialog) {
      closeKeyManagementDialog()
    }
  })

  function openKeyManagementDialog(preSelectProvider = null) {
    keyManagementDialog.classList.remove('hidden')
    if (preSelectProvider) {
      providerSelect.value = preSelectProvider
      updateSaveButtonState()
    }
    refreshKeyList()
  }

  function closeKeyManagementDialog() {
    keyManagementDialog.classList.add('hidden')
    // Reset form
    providerSelect.value = ''
    apiKeyInput.value = ''
    apiKeyInput.type = 'password'
    updateSaveButtonState()
  }

  // Toggle password visibility
  toggleKeyVisibility.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text'
      toggleKeyVisibility.innerHTML = `
        <svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          <path d="M1 1l22 22" stroke="currentColor" stroke-width="2"/>
        </svg>
      `
    } else {
      apiKeyInput.type = 'password'
      toggleKeyVisibility.innerHTML = `
        <svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        </svg>
      `
    }
  })

  // Update save button state
  function updateSaveButtonState() {
    const hasProvider = providerSelect.value.trim() !== ''
    const hasKey = apiKeyInput.value.trim() !== ''
    saveKeyBtn.disabled = !(hasProvider && hasKey)
  }

  providerSelect.addEventListener('change', updateSaveButtonState)
  apiKeyInput.addEventListener('input', updateSaveButtonState)

  // Save API key
  saveKeyBtn.addEventListener('click', async () => {
    const provider = providerSelect.value
    const apiKey = apiKeyInput.value.trim()
    
    if (!provider || !apiKey) {
      showNotification('Please select a provider and enter an API key', 'error')
      return
    }

    // Validate API key format
    const validation = contentSecurity.validateApiKey(provider, apiKey)
    if (!validation.valid) {
      showNotification(`Invalid API key: ${validation.reason}`, 'error')
      return
    }

    try {
      // Get the key name for this provider
      const keyName = getKeyNameForProvider(provider)
      
      // Store the encrypted API key
      await keyManager.storeApiKey(keyName, apiKey)
      
      // Set this provider's first model as the new global default
      const firstModelForProvider = Object.keys(modelConfig).find(modelId => 
        modelConfig[modelId].provider === provider && modelConfig[modelId].requiresApiKey
      )
      
      if (firstModelForProvider) {
        await setGlobalDefaultModel(firstModelForProvider)
        currentSelectedModel = firstModelForProvider
        updateSelectedModelDisplay()
      }
      
      showNotification(`${providerNames[provider]} API key saved successfully!`, 'success')
      
      // Reset form
      providerSelect.value = ''
      apiKeyInput.value = ''
      updateSaveButtonState()
      
      // Refresh the key list and model dropdown
      refreshKeyList()
      updateModelDropdownOrder()
      
    } catch (error) {
      console.error('Failed to store API key:', error)
      showNotification('Failed to save API key. Please try again.', 'error')
    }
  })

  // Get key name for provider
  function getKeyNameForProvider(provider) {
    const keyNames = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      x: 'X_API_KEY',
      perplexity: 'PERPLEXITY_API_KEY'
    }
    return keyNames[provider]
  }

  // Refresh the key list in the dialog
  async function refreshKeyList() {
    const storedKeys = await getAllStoredKeys()
    
    if (storedKeys.length === 0) {
      keyList.innerHTML = '<div class="empty-state">No API keys configured yet</div>'
      return
    }

    keyList.innerHTML = ''
    
    for (const key of storedKeys) {
      const keyItem = document.createElement('div')
      keyItem.className = 'key-item'
      
      const maskedKey = maskApiKey(key.value)
      
      keyItem.innerHTML = `
        <div class="key-info">
          <div class="key-provider">${providerNames[key.provider] || key.provider}</div>
          <div class="key-preview">${maskedKey}</div>
        </div>
        <div class="key-actions">
          <button class="btn-small btn-secondary" onclick="showFullKey('${key.keyName}')">Show</button>
          <button class="btn-small btn-danger" onclick="removeKey('${key.keyName}', '${key.provider}')">Remove</button>
        </div>
      `
      
      keyList.appendChild(keyItem)
    }
  }

  // Get all stored keys
  async function getAllStoredKeys() {
    const keys = []
    const providers = ['openai', 'anthropic', 'google', 'x', 'perplexity']
    
    for (const provider of providers) {
      const keyName = getKeyNameForProvider(provider)
      const hasKey = await keyManager.hasApiKey(keyName)
      
      if (hasKey) {
        const keyValue = await keyManager.getApiKey(keyName)
        keys.push({
          provider,
          keyName,
          value: keyValue
        })
      }
    }
    
    return keys
  }

  // Mask API key for display
  function maskApiKey(key) {
    if (!key) return ''
    if (key.length <= 8) return '*'.repeat(key.length)
    return key.substring(0, 4) + '*'.repeat(Math.max(0, key.length - 8)) + key.substring(key.length - 4)
  }

  // Global functions for key management (attached to window)
  window.showFullKey = async function(keyName) {
    try {
      const key = await keyManager.getApiKey(keyName)
      showNotification(`Full key: ${key}`, 'info')
    } catch (error) {
      showNotification('Failed to retrieve key', 'error')
    }
  }

  window.removeKey = async function(keyName, provider) {
    if (!confirm(`Remove ${providerNames[provider]} API key?`)) {
      return
    }
    
    try {
      await keyManager.removeApiKey(keyName)
      showNotification(`${providerNames[provider]} API key removed`, 'success')
      refreshKeyList()
      updateModelDropdownOrder()
      
      // If current model uses this provider, revert to default
      if (modelConfig[currentSelectedModel].provider === provider) {
        currentSelectedModel = 'default'
        updateSelectedModelDisplay()
        await setGlobalDefaultModel('default')
      }
    } catch (error) {
      showNotification('Failed to remove key', 'error')
    }
  }

  // Function to check if API key exists for a model
  async function checkApiKey(model) {
    const config = modelConfig[model]
    if (!config.requiresApiKey) {
      return true
    }

    try {
      return await keyManager.hasApiKey(config.keyName)
    } catch (error) {
      console.error('Failed to check API key:', error)
      return false
    }
  }

  // Function to get API key for a model
  async function getApiKey(model) {
    const config = modelConfig[model]
    if (!config.requiresApiKey) {
      return null
    }

    try {
      return await keyManager.getApiKey(config.keyName)
    } catch (error) {
      console.error('Failed to get API key:', error)
      return null
    }
  }

  // Get the current tab ID
  let currentTabId = null

  // Check if chrome is defined, if not, define it as an empty object with required methods
  if (typeof chrome === "undefined") {
    window.chrome = {
      runtime: {
        sendMessage: (message, callback) => {
          // Mock implementation
          if (callback) callback({ tabId: 1 })
        },
      },
      storage: {
        local: {
          get: (keys, callback) => {
            // Mock implementation
            callback({})
          },
          set: (items) => {
            // Mock implementation
          },
        },
      },
    }
  }

  chrome.runtime.sendMessage({ action: "getCurrentTabId" }, async (response) => {
    if (response && response.tabId) {
      currentTabId = response.tabId

      // Update model dropdown order based on available API keys
      await updateModelDropdownOrder()

      // Load saved summary for this specific tab
      chrome.storage.local.get([`summary_${currentTabId}`, `complexity_${currentTabId}`, `model_${currentTabId}`], (result) => {
        if (result[`summary_${currentTabId}`]) {
          // Render the summary as Markdown
          renderMarkdown(result[`summary_${currentTabId}`])
          summaryContainer.classList.remove("hidden")
        }

        if (result[`complexity_${currentTabId}`] !== undefined) {
          complexitySlider.value = result[`complexity_${currentTabId}`]
          updateSliderThumbPosition(complexitySlider.value)
        } else {
          // Default to Standard (1)
          updateSliderThumbPosition(1)
        }

        // Check if this tab has a specific model override
        if (result[`model_${currentTabId}`]) {
          // Tab has a specific model preference, use it
          currentSelectedModel = result[`model_${currentTabId}`]
          updateSelectedModelDisplay()
        }
        // Otherwise, updateModelDropdownOrder() already set the global default
      })
    }
  })

  // Function to update slider thumb position
  function updateSliderThumbPosition(value) {
    // Get the slider container width
    const sliderContainer = document.querySelector(".slider-container")
    const containerWidth = sliderContainer.offsetWidth

    // Define constants
    const thumbWidth = 36
    const leftPadding = 8
    const rightPadding = 8

    // Calculate the available width for the thumb to move
    const availableWidth = containerWidth - leftPadding - rightPadding - thumbWidth

    // Calculate position based on value (0, 1, or 2)
    let leftPosition

    if (value == 0) {
      // Leftmost position (with leftPadding)
      leftPosition = leftPadding
    } else if (value == 1) {
      // Middle position
      leftPosition = leftPadding + availableWidth / 2
    } else {
      // Rightmost position (containerWidth - rightPadding - thumbWidth)
      leftPosition = containerWidth - rightPadding - thumbWidth
    }

    // Apply the position
    sliderThumb.style.left = `${leftPosition}px`
  }

  // Function to render Markdown
  function renderMarkdown(text) {
    // Basic Markdown parsing
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      // Lists
      .replace(/^\* (.*$)/gim, "<ul><li>$1</li></ul>")
      .replace(/^- (.*$)/gim, "<ul><li>$1</li></ul>")
      // Fix consecutive list items
      .replace(/<\/ul>\s*<ul>/gim, "")
      // Paragraphs
      .replace(/\n\s*\n/gim, "</p><p>")

    // Wrap in paragraph if not already
    if (!html.startsWith("<h") && !html.startsWith("<p>")) {
      html = "<p>" + html + "</p>"
    }

    // Set the HTML content
    summaryContent.innerHTML = html
  }

  // Make labels clickable
  sliderLabelGroups.forEach((group) => {
    group.addEventListener("click", () => {
      const value = Number.parseInt(group.getAttribute("data-value"))
      complexitySlider.value = value
      updateSliderThumbPosition(value)

      // Save complexity preference for this tab
      if (currentTabId) {
        chrome.storage.local.set({ [`complexity_${currentTabId}`]: value })
      }
    })
  })

  // Update thumb position when slider value changes
  complexitySlider.addEventListener("input", () => {
    updateSliderThumbPosition(complexitySlider.value)
  })

  // Show notification to user
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `
    
    document.body.appendChild(notification)
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)'
    }, 100)
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 4000)
  }

  // Close panel
  closeButton.addEventListener("click", () => {
    window.parent.postMessage({ action: "closePanel" }, "*")
  })

  summarizeBtn.addEventListener("click", async () => {
    // Reset UI
    summaryContainer.classList.add("hidden")
    errorContainer.classList.add("hidden")

    // Get selected model and API key (should already be available since checked on selection)
    const selectedModel = currentSelectedModel
    const apiKey = modelConfig[selectedModel].requiresApiKey ? await getApiKey(selectedModel) : null

    // Show loading indicator
    loadingIndicator.classList.remove("hidden")
    summarizeBtn.disabled = true

    // Get the selected complexity level
    const complexityLevel = complexityLevels[complexitySlider.value]

    // Send message to content script to extract content
    window.parent.postMessage(
      {
        action: "extractContent",
        complexity: complexityLevel,
        model: selectedModel,
        apiKey: apiKey
      },
      "*",
    )
  })

  // Listen for messages from the content script
  window.addEventListener("message", (event) => {
    if (event.data.action === "summaryResult") {
      loadingIndicator.classList.add("hidden")

      if (event.data.error) {
        errorMessage.textContent = event.data.error
        errorContainer.classList.remove("hidden")
      } else {
        // Render the summary as Markdown
        renderMarkdown(event.data.summary)
        summaryContainer.classList.remove("hidden")

        // Save the summary for this specific tab
        if (event.data.tabId) {
          chrome.storage.local.set({ [`summary_${event.data.tabId}`]: event.data.summary })
        } else if (currentTabId) {
          chrome.storage.local.set({ [`summary_${currentTabId}`]: event.data.summary })
        }
      }

      summarizeBtn.disabled = false
    }
  })

  // Initialize the slider thumb position
  updateSliderThumbPosition(complexitySlider.value)

  // Handle window resize to update thumb position
  window.addEventListener("resize", () => {
    updateSliderThumbPosition(complexitySlider.value)
  })
})
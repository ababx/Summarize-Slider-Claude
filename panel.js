document.addEventListener("DOMContentLoaded", () => {
  // Initialize security managers
  const keyManager = new KeyManager()
  const contentSecurity = new ContentSecurity()
  
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
  const modelSelectorCard = document.getElementById("modelSelectorCard")
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
  }

  // Mask API key for display
  function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length <= 8) return apiKey
    return apiKey.substring(0, 4) + '••••••••••••••••••••••••••••••••' + apiKey.substring(apiKey.length - 4)
  }

  // Update tab indicators
  async function updateTabIndicators() {
    for (const providerId of Object.keys(providers)) {
      const provider = providers[providerId]
      const indicator = document.getElementById(`${providerId}-indicator`)
      const hasKey = await keyManager.hasApiKey(provider.keyName)
      
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
  function switchTab(providerId) {
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
    renderApiKeySection()
    renderModelsForCurrentProvider()
  }

  // Setup tab event listeners
  function setupTabs() {
    const tabTriggers = tabsList.querySelectorAll('.tab-trigger')
    tabTriggers.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.provider)
      })
    })
  }

  // Render API key section for current provider
  async function renderApiKeySection() {
    const provider = providers[currentProvider]
    const hasApiKey = await keyManager.hasApiKey(provider.keyName)
    
    if (hasApiKey) {
      const apiKey = await keyManager.getApiKey(provider.keyName)
      const maskedKey = maskApiKey(apiKey)
      
      apiKeyContainer.innerHTML = `
        <div class="api-key-display">
          <div class="api-key-info">
            <svg class="key-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.5 7.5L15 5L17.5 7.5L15 10L12.5 7.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3 12L8 7L10 9L5 14L3 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="key-preview">${maskedKey}</span>
          </div>
          <div class="api-key-actions">
            <button class="btn-small btn-ghost btn-icon" onclick="editApiKey('${currentProvider}')" title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-small btn-ghost btn-icon" onclick="removeApiKey('${currentProvider}')" title="Remove">
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
          <button class="btn-small btn-primary" onclick="saveApiKey('${currentProvider}')" disabled>Save</button>
          <button class="btn-small btn-ghost" onclick="cancelEdit('${currentProvider}')">Cancel</button>
        </div>
      `
      
      // Setup input validation
      const keyInput = document.getElementById(`keyInput-${currentProvider}`)
      const saveBtn = apiKeyContainer.querySelector('.btn-primary')
      
      keyInput.addEventListener('input', () => {
        saveBtn.disabled = !keyInput.value.trim()
      })
      
      // Hide status indicator
      const indicator = document.getElementById(`${currentProvider}-indicator`)
      if (indicator) {
        indicator.classList.add('hidden')
      }
    }
  }

  // Render models for current provider
  function renderModelsForCurrentProvider() {
    const providerModels = getModelsForProvider(currentProvider)
    
    if (providerModels.length === 0) {
      modelsList.innerHTML = '<div style="text-align: center; color: #6b7280; font-size: 12px; padding: 16px;">No models available for this provider</div>'
      return
    }
    
    modelsList.innerHTML = providerModels.map(model => `
      <div class="model-card ${model.isDefault ? 'default' : ''}">
        <div class="model-card-header">
          <div class="model-info">
            <span class="model-name">${model.name}</span>
            ${model.isDefault ? '<span class="default-badge">Default</span>' : ''}
          </div>
          ${!model.isDefault ? `<button class="btn-small btn-ghost set-default-btn" onclick="setAsDefault('${model.id}')">Use this</button>` : ''}
        </div>
      </div>
    `).join('')
  }

  // Update summarize section
  function updateSummarizeSection() {
    usageCounter.textContent = `${summarizeUsage}/25 Monthly`
    
    const defaultModel = models.find(m => m.id === summarizeDefault)
    defaultModelName.textContent = defaultModel ? defaultModel.name : 'Gemini Flash 2.5'
    
    // Show/hide set default button - only show if current default is NOT Gemini Flash
    if (summarizeDefault !== 'gemini-flash-2.5') {
      setDefaultBtn.classList.remove('hidden')
    } else {
      setDefaultBtn.classList.add('hidden')
    }
  }


  // Global functions for API key management
  window.editApiKey = async function(providerId) {
    const provider = providers[providerId]
    const currentKey = await keyManager.getApiKey(provider.keyName)
    
    apiKeyContainer.innerHTML = `
      <div class="key-input-container">
        <input type="text" id="keyInput-${providerId}" class="key-input" value="${currentKey}" placeholder="Enter ${provider.name} API key">
        <button class="btn-small btn-primary" onclick="saveApiKey('${providerId}')">Save</button>
        <button class="btn-small btn-ghost" onclick="cancelEdit('${providerId}')">Cancel</button>
      </div>
    `
    
    const keyInput = document.getElementById(`keyInput-${providerId}`)
    keyInput.focus()
    keyInput.select()
  }

  window.saveApiKey = async function(providerId) {
    console.log('saveApiKey called for:', providerId)
    const provider = providers[providerId]
    const keyInput = document.getElementById(`keyInput-${providerId}`)
    
    if (!keyInput) {
      console.error('Key input not found for:', providerId)
      showNotification('Error: input field not found', 'error')
      return
    }
    
    const apiKey = keyInput.value.trim()
    console.log('API key length:', apiKey.length)
    
    if (!apiKey) {
      showNotification('Please enter an API key', 'error')
      return
    }

    // Validate API key format
    const validation = contentSecurity.validateApiKey(providerId, apiKey)
    console.log('Validation result:', validation)
    if (!validation.valid) {
      showNotification(`Invalid API key: ${validation.reason}`, 'error')
      return
    }

    try {
      console.log('Storing API key for:', provider.keyName)
      await keyManager.storeApiKey(provider.keyName, apiKey)
      console.log('API key stored successfully')
      
      // Always set first model for this provider as the new default when API key is added
      const providerModels = getModelsForProvider(providerId)
      console.log('Provider models:', providerModels)
      if (providerModels.length > 0) {
        setAsDefault(providerModels[0].id)
        chrome.storage.local.set({ summarizeDefault: providerModels[0].id })
        showNotification(`${provider.name} API key saved! ${providerModels[0].name} is now your default model.`, 'success')
      } else {
        showNotification(`${provider.name} API key saved successfully!`, 'success')
      }
      
      renderApiKeySection()
      // Update all tab indicators
      updateTabIndicators()
      
    } catch (error) {
      console.error('Failed to store API key:', error)
      showNotification('Failed to save API key. Please try again.', 'error')
    }
  }

  window.removeApiKey = async function(providerId) {
    const provider = providers[providerId]
    
    if (!confirm(`Remove ${provider.name} API key?`)) {
      return
    }
    
    try {
      await keyManager.removeApiKey(provider.keyName)
      showNotification(`${provider.name} API key removed`, 'success')
      renderApiKeySection()
      updateTabIndicators()
      
      // If current default model uses this provider, reset to gemini-flash-2.5
      const defaultModel = getDefaultModel()
      if (defaultModel && defaultModel.provider === providerId) {
        setAsDefault('gemini-flash-2.5')
      }
      
    } catch (error) {
      showNotification('Failed to remove key', 'error')
    }
  }

  window.cancelEdit = function(providerId) {
    renderApiKeySection()
  }

  window.setAsDefault = setAsDefault

  
  // Setup model selector button
  modelSelectorBtn.addEventListener('click', () => {
    const isVisible = !modelSelectorCard.classList.contains('hidden')
    if (isVisible) {
      modelSelectorCard.classList.add('hidden')
      // Refresh the display when closing
      updateSummarizeSection()
    } else {
      modelSelectorCard.classList.remove('hidden')
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
        
        // Switch to the first provider tab that doesn't have an API key
        let hasFoundProviderWithoutKey = false
        for (const providerId of Object.keys(providers)) {
          const provider = providers[providerId]
          const hasKey = await keyManager.hasApiKey(provider.keyName)
          if (!hasKey && !hasFoundProviderWithoutKey) {
            currentProvider = providerId
            switchTab(providerId)
            hasFoundProviderWithoutKey = true
            break
          }
        }
        
        // If all providers have keys or none found, default to openai
        if (!hasFoundProviderWithoutKey) {
          currentProvider = 'openai'
          switchTab('openai')
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
    }, 4000)
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
      apiKey = await keyManager.getApiKey(provider.keyName)
      if (!apiKey) {
        showNotification(`API key required for ${defaultModel.name}`, 'error')
        return
      }
    }

    loadingIndicator.classList.remove("hidden")
    summarizeBtn.disabled = true

    const complexityLevel = complexityLevels[complexitySlider.value]

    // Increment usage
    summarizeUsage++
    chrome.storage.local.set({ summarizeUsage })
    updateSummarizeSection()

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

  // Initialize slider position and handle resize
  updateSliderThumbPosition(complexitySlider.value)
  window.addEventListener("resize", () => {
    updateSliderThumbPosition(complexitySlider.value)
  })
})
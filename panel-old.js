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
  const modelSelector = document.getElementById("modelSelector")

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

  // Function to prompt for API key with validation
  async function promptForApiKey(provider, keyName) {
    const providerNames = {
      openai: "OpenAI",
      google: "Google",
      anthropic: "Anthropic",
      x: "X (formerly Twitter)",
      perplexity: "Perplexity"
    }
    
    const providerName = providerNames[provider] || provider
    const apiKey = prompt(`Please enter your ${providerName} API key to use this model:\n\nNote: Your API key will be encrypted and stored locally.`)
    
    if (apiKey && apiKey.trim()) {
      // Validate API key format
      const validation = contentSecurity.validateApiKey(provider, apiKey.trim())
      if (!validation.valid) {
        alert(`Invalid API key: ${validation.reason}`)
        return null
      }
      
      try {
        // Store the encrypted API key
        await keyManager.storeApiKey(keyName, apiKey.trim())
        return apiKey.trim()
      } catch (error) {
        console.error('Failed to store API key:', error)
        alert('Failed to securely store API key. Please try again.')
        return null
      }
    }
    
    return null
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
      let apiKey = await keyManager.getApiKey(config.keyName)
      if (!apiKey) {
        apiKey = await promptForApiKey(config.provider, config.keyName)
      }
      return apiKey
    } catch (error) {
      console.error('Failed to get API key:', error)
      return null
    }
  }

  // Get the current tab ID
  let currentTabId = null

  // Function to check which models have API keys and reorder dropdown
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

    // Clear existing options except the first one (default)
    const defaultOption = modelSelector.querySelector('option[value="default"]')
    modelSelector.innerHTML = ''
    modelSelector.appendChild(defaultOption)

    // Add models with API keys first (with visual indicators)
    modelsWithKeys.forEach(({ id }) => {
      const option = document.createElement('option')
      option.value = id
      option.textContent = getModelDisplayName(id) + ' 🔑✅'
      option.style.fontWeight = 'bold'
      option.style.color = '#059669' // Green color for configured models
      modelSelector.appendChild(option)
    })

    // Add models without API keys
    modelsWithoutKeys.forEach(({ id }) => {
      if (id !== "default") { // Skip default as it's already added
        const option = document.createElement('option')
        option.value = id
        option.textContent = getModelDisplayName(id)
        option.style.color = '#6b7280' // Gray color for unconfigured models
        modelSelector.appendChild(option)
      }
    })

    // Get global default model preference
    const globalDefault = await getGlobalDefaultModel()
    
    // Set the dropdown to the global default if it exists and is configured
    if (globalDefault && modelsWithKeys.some(m => m.id === globalDefault)) {
      modelSelector.value = globalDefault
    } else if (modelsWithKeys.length > 0) {
      // If no global default, use first configured model
      modelSelector.value = modelsWithKeys[0].id
    } else {
      modelSelector.value = "default"
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

  // Function to get display name for models
  function getModelDisplayName(modelId) {
    const displayNames = {
      "default": "Default (Perplexity - No API Key)",
      "perplexity-sonar": "Perplexity Sonar (API Key)",
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
          modelSelector.value = result[`model_${currentTabId}`]
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

  // Model selection handler
  modelSelector.addEventListener("change", async () => {
    const selectedModel = modelSelector.value
    
    // Check if API key is needed and prompt immediately
    if (modelConfig[selectedModel].requiresApiKey) {
      const existingKey = await keyManager.getApiKey(modelConfig[selectedModel].keyName)
      
      if (!existingKey) {
        // Prompt for new API key
        const apiKey = await getApiKey(selectedModel)
        if (!apiKey) {
          // If user cancels API key prompt, revert to previous selection
          const globalDefault = await getGlobalDefaultModel()
          modelSelector.value = globalDefault || "default"
          return
        } else {
          // API key was added successfully!
          console.log(`New API key added for ${selectedModel}`)
          
          // Set this model as the new global default
          await setGlobalDefaultModel(selectedModel)
          
          // Refresh dropdown to show new configuration
          await updateModelDropdownOrder()
          
          // Ensure the newly configured model is selected
          modelSelector.value = selectedModel
          
          // Show success message
          showNotification(`${getModelDisplayName(selectedModel)} is now configured and set as your default model!`, 'success')
        }
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
    
    // Save model preference for this tab (this now acts as tab-specific override)
    if (currentTabId) {
      chrome.storage.local.set({ [`model_${currentTabId}`]: selectedModel })
    }
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
    const selectedModel = modelSelector.value
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

document.addEventListener("DOMContentLoaded", () => {
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
    "openai-gpt-4o-mini": { provider: "openai", requiresApiKey: true, keyName: "OPENAI_API_KEY" },
    "openai-gpt-3.5-turbo": { provider: "openai", requiresApiKey: true, keyName: "OPENAI_API_KEY" },
    "google-gemini-pro": { provider: "google", requiresApiKey: true, keyName: "GOOGLE_API_KEY" },
    "google-gemini-flash": { provider: "google", requiresApiKey: true, keyName: "GOOGLE_API_KEY" },
    "anthropic-claude-3.5-sonnet": { provider: "anthropic", requiresApiKey: true, keyName: "ANTHROPIC_API_KEY" },
    "anthropic-claude-3-haiku": { provider: "anthropic", requiresApiKey: true, keyName: "ANTHROPIC_API_KEY" },
    "x-grok-beta": { provider: "x", requiresApiKey: true, keyName: "X_API_KEY" }
  }

  // Function to prompt for API key
  function promptForApiKey(provider, keyName) {
    const providerNames = {
      openai: "OpenAI",
      google: "Google",
      anthropic: "Anthropic",
      x: "X (formerly Twitter)",
      perplexity: "Perplexity"
    }
    
    const providerName = providerNames[provider] || provider
    const apiKey = prompt(`Please enter your ${providerName} API key to use this model:`)
    
    if (apiKey && apiKey.trim()) {
      // Store the API key
      chrome.storage.local.set({ [keyName]: apiKey.trim() })
      return apiKey.trim()
    }
    
    return null
  }

  // Function to check if API key exists for a model
  async function checkApiKey(model) {
    const config = modelConfig[model]
    if (!config.requiresApiKey) {
      return true
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([config.keyName], (result) => {
        const hasKey = result[config.keyName] && result[config.keyName].trim()
        resolve(hasKey)
      })
    })
  }

  // Function to get API key for a model
  async function getApiKey(model) {
    const config = modelConfig[model]
    if (!config.requiresApiKey) {
      return null
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([config.keyName], (result) => {
        const apiKey = result[config.keyName]
        if (apiKey && apiKey.trim()) {
          resolve(apiKey.trim())
        } else {
          const newKey = promptForApiKey(config.provider, config.keyName)
          resolve(newKey)
        }
      })
    })
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
        const hasKey = await new Promise((resolve) => {
          chrome.storage.local.get([config.keyName], (result) => {
            resolve(result[config.keyName] && result[config.keyName].trim())
          })
        })

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

    // Add models with API keys first
    modelsWithKeys.forEach(({ id }) => {
      const option = document.createElement('option')
      option.value = id
      option.textContent = getModelDisplayName(id) + ' ✓'
      modelSelector.appendChild(option)
    })

    // Add models without API keys
    modelsWithoutKeys.forEach(({ id }) => {
      if (id !== "default") { // Skip default as it's already added
        const option = document.createElement('option')
        option.value = id
        option.textContent = getModelDisplayName(id)
        modelSelector.appendChild(option)
      }
    })

    // Set default to first model with API key, or "default" if none
    if (modelsWithKeys.length > 0) {
      modelSelector.value = modelsWithKeys[0].id
      // Save this as the default for the current tab
      if (currentTabId) {
        chrome.storage.local.set({ [`model_${currentTabId}`]: modelsWithKeys[0].id })
      }
    } else {
      modelSelector.value = "default"
    }
  }

  // Function to get display name for models
  function getModelDisplayName(modelId) {
    const displayNames = {
      "default": "Default (Perplexity - No API Key)",
      "perplexity-sonar": "Perplexity Sonar (API Key)",
      "openai-gpt-4o": "OpenAI GPT-4o",
      "openai-gpt-4o-mini": "OpenAI GPT-4o Mini",
      "openai-gpt-3.5-turbo": "OpenAI GPT-3.5 Turbo",
      "google-gemini-pro": "Google Gemini Pro",
      "google-gemini-flash": "Google Gemini Flash",
      "anthropic-claude-3.5-sonnet": "Anthropic Claude 3.5 Sonnet",
      "anthropic-claude-3-haiku": "Anthropic Claude 3 Haiku",
      "x-grok-beta": "X Grok Beta"
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

        // Override the dropdown selection if user had a specific preference
        if (result[`model_${currentTabId}`]) {
          modelSelector.value = result[`model_${currentTabId}`]
        }
        // Note: updateModelDropdownOrder() already set the best default
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
      const apiKey = await getApiKey(selectedModel)
      if (!apiKey) {
        // If user cancels API key prompt, revert to default
        modelSelector.value = "default"
        return
      } else {
        // API key was added successfully, refresh dropdown order
        await updateModelDropdownOrder()
        // Ensure the newly configured model is selected
        modelSelector.value = selectedModel
      }
    }
    
    // Save model preference for this tab
    if (currentTabId) {
      chrome.storage.local.set({ [`model_${currentTabId}`]: selectedModel })
    }
  })

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

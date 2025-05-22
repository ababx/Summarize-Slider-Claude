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
    "perplexity-sonar": { provider: "perplexity", requiresApiKey: false },
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
      x: "X (formerly Twitter)"
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

  chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
    if (response && response.tabId) {
      currentTabId = response.tabId

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

        if (result[`model_${currentTabId}`]) {
          modelSelector.value = result[`model_${currentTabId}`]
        } else {
          // Default to Perplexity Sonar
          modelSelector.value = "perplexity-sonar"
        }
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
  modelSelector.addEventListener("change", () => {
    const selectedModel = modelSelector.value
    
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

    // Get selected model and check for API key
    const selectedModel = modelSelector.value
    const apiKey = await getApiKey(selectedModel)
    
    if (modelConfig[selectedModel].requiresApiKey && !apiKey) {
      errorMessage.textContent = "API key is required for this model"
      errorContainer.classList.remove("hidden")
      return
    }

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

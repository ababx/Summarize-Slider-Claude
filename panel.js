// Wait for all scripts to load before initializing
function initializeExtension() {
  // Check if DOM is ready
  if (document.readyState !== 'complete') {
    console.log('DOM not ready, waiting...')
    setTimeout(initializeExtension, 100)
    return
  }
  
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
  
  // Check if CSS is loaded by testing a specific style
  const testElement = document.createElement('div')
  testElement.className = 'summarizer-panel'
  testElement.style.visibility = 'hidden'
  testElement.style.position = 'absolute'
  document.body.appendChild(testElement)
  
  const computedStyle = window.getComputedStyle(testElement)
  const isStyleLoaded = computedStyle.borderRadius === '16px'
  
  document.body.removeChild(testElement)
  
  if (!isStyleLoaded) {
    console.log('CSS not fully loaded, waiting...')
    setTimeout(initializeExtension, 100)
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
  
  // Chat elements
  const chatSection = document.getElementById("chatSection")
  const chatInput = document.getElementById("chatInput")
  const chatSendBtn = document.getElementById("chatSendBtn")
  const chatMessages = document.getElementById("chatMessages")
  const resizeHandle = document.getElementById("resizeHandle")
  const chatExpandBtn = document.getElementById("chatExpandBtn")
  const threePerspectivesBtn = document.getElementById("threePerspectivesBtn")
  
  // Chat sizing configuration
  const CHAT_SIZES = {
    MINIMUM: 100,
    get MINIMUM_WITH_CONTENT() { return Math.max(100, window.innerHeight * 0.1) },
    get HALF() { return window.innerHeight * 0.5 },
    get MAXIMUM() { 
      // Calculate available height based on panel and content constraints
      const panel = document.querySelector('.summarizer-panel')
      const panelContent = document.querySelector('.panel-content')
      const panelHeader = document.querySelector('.panel-header')
      
      if (!panel || !panelContent || !panelHeader) {
        return window.innerHeight * 0.8 // Fallback to original calculation
      }
      
      const panelHeight = panel.offsetHeight
      const headerHeight = panelHeader.offsetHeight
      const contentHeight = panelContent.offsetHeight
      
      // Available height is total panel height minus header and some content margin
      const availableHeight = panelHeight - headerHeight - 100 // 100px margin for content
      
      console.log('📐 MAXIMUM calculation:')
      console.log('- Panel height:', panelHeight)
      console.log('- Header height:', headerHeight)
      console.log('- Content height:', contentHeight)
      console.log('- Available height:', availableHeight)
      console.log('- Original calculation:', window.innerHeight * 0.8)
      
      return Math.min(availableHeight, window.innerHeight * 0.8)
    }
  }
  
  // Debug function to log all size values
  function logChatSizes() {
    console.log('📏 CHAT SIZES DEBUG:')
    console.log('- MINIMUM:', CHAT_SIZES.MINIMUM)
    console.log('- MINIMUM_WITH_CONTENT:', CHAT_SIZES.MINIMUM_WITH_CONTENT)
    console.log('- HALF:', CHAT_SIZES.HALF)
    console.log('- MAXIMUM:', CHAT_SIZES.MAXIMUM)
    console.log('- Window height:', window.innerHeight)
    console.log('- Max threshold (max-10):', CHAT_SIZES.MAXIMUM - 10)
  }
  
  // Content detection function
  function chatHasContent() {
    // Check for text in chat input
    const hasInputText = chatInput && chatInput.value.trim().length > 0
    
    // Check for existing chat messages
    const hasMessages = chatMessages && chatMessages.children.length > 0
    
    return hasInputText || hasMessages
  }
  
  // Get appropriate minimum size based on content
  function getMinimumChatSize() {
    return chatHasContent() ? CHAT_SIZES.MINIMUM_WITH_CONTENT : CHAT_SIZES.MINIMUM
  }
  
  // Get current chat height
  function getCurrentChatHeight() {
    return chatSection ? parseInt(window.getComputedStyle(chatSection).height, 10) : 0
  }
  
  // Set chat height with appropriate classes
  function setChatHeight(height) {
    if (!chatSection) return
    
    console.log('🎯 setChatHeight called with:', height)
    
    // Update CSS classes BEFORE setting height to remove max-height constraint
    const minimumSize = getMinimumChatSize()
    const maxSize = CHAT_SIZES.MAXIMUM
    const maxThreshold = maxSize - 10 // Same threshold as getNextChatSize
    const minThreshold = minimumSize + 20 // Same threshold as getNextChatSize
    
    if (height <= minThreshold) {
      chatSection.classList.add('collapsed')
      chatSection.classList.remove('expanded')
      console.log('🏷️ Applied CSS classes: collapsed=true, expanded=false')
    } else if (height >= maxThreshold) {
      chatSection.classList.add('expanded')
      chatSection.classList.remove('collapsed')
      console.log('🏷️ Applied CSS classes: collapsed=false, expanded=true')
    } else {
      chatSection.classList.remove('collapsed')
      chatSection.classList.remove('expanded')
      console.log('🏷️ Applied CSS classes: collapsed=false, expanded=false (intermediate)')
    }
    
    // Force a reflow to apply the CSS class changes
    chatSection.offsetHeight
    
    // Now set the height after CSS constraints are removed
    chatSection.style.setProperty('height', height + 'px', 'important')
    console.log('🎯 Applied height, actual height now:', getCurrentChatHeight())
    
    // Check what CSS constraints are still active
    const computedStyle = window.getComputedStyle(chatSection)
    console.log('🔍 CSS max-height:', computedStyle.maxHeight)
    console.log('🔍 CSS height:', computedStyle.height)
    console.log('🔍 CSS classes:', chatSection.classList.toString())
    console.log('🔍 Has expanded class:', chatSection.classList.contains('expanded'))
    
    console.log('🏷️ Final height after CSS classes:', getCurrentChatHeight())
    
    // Save to storage
    chrome.storage.local.set({ 
      chatSectionHeight: height,
      chatExpanded: height >= maxThreshold
    })
  }
  
  // Auto-resize chat to fit content
  function autoResizeChatToContent() {
    const currentHeight = getCurrentChatHeight()
    const minimumSize = getMinimumChatSize()
    
    // If chat is smaller than minimum, expand to accommodate content
    if (currentHeight < minimumSize) {
      setChatHeight(minimumSize)
    }
  }
  
  // Cycling button state management
  let expandButtonState = 'collapsed' // collapsed, half, expanded
  
  // Get next size in cycle based on current state and content
  function getNextChatSize() {
    const currentHeight = getCurrentChatHeight()
    const minimumSize = getMinimumChatSize()
    const maxSize = CHAT_SIZES.MAXIMUM
    
    // Debug logging
    console.log('getNextChatSize - Current:', currentHeight, 'Min:', minimumSize, 'Max:', maxSize)
    
    // More robust state detection - check if we're very close to max
    // Account for both manual drag and button click reaching max differently
    const maxThreshold = maxSize - 10 // Smaller tolerance for max detection
    const minThreshold = minimumSize + 20 // Tolerance for min detection
    
    if (currentHeight <= minThreshold) {
      expandButtonState = 'collapsed'
    } else if (currentHeight >= maxThreshold) {
      expandButtonState = 'expanded'
    } else {
      expandButtonState = 'half'
    }
    
    console.log('Determined state:', expandButtonState, 'Thresholds - Min:', minThreshold, 'Max:', maxThreshold)
    
    // Return next size in cycle
    switch (expandButtonState) {
      case 'collapsed':
        return CHAT_SIZES.HALF
      case 'half':
        return CHAT_SIZES.MAXIMUM
      case 'expanded':
        return minimumSize
      default:
        return CHAT_SIZES.HALF
    }
  }
  
  // Update expand button arrow direction
  function updateExpandButtonArrows() {
    console.log('🚀 updateExpandButtonArrows() called')
    
    if (!chatExpandBtn) {
      console.log('❌ No chatExpandBtn found!')
      return
    }
    
    const currentHeight = getCurrentChatHeight()
    const maxSize = CHAT_SIZES.MAXIMUM
    const maxThreshold = maxSize - 10
    
    // Debug logging with more detail
    console.log('=== ARROW UPDATE ===')
    logChatSizes()
    console.log('Current height:', currentHeight)
    console.log('Max size (80% viewport):', maxSize)
    console.log('Max threshold (max-10):', maxThreshold)
    console.log('Difference from max:', maxSize - currentHeight, 'pixels')
    console.log('Is at max?', currentHeight >= maxThreshold)
    console.log('Button has expanded class:', chatExpandBtn.classList.contains('expanded'))
    
    // Update arrow direction based on current height, not next size
    const svg = chatExpandBtn.querySelector('svg')
    console.log('🔍 SVG element found:', !!svg)
    if (svg) {
      // Always use the same up arrow SVG content
      svg.innerHTML = `
        <path d="M8 12L12 8L16 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 16L12 12L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      `
      
      // Simple check: if we're at or near maximum height, show down arrows
      console.log('🔢 About to check condition: currentHeight >= maxThreshold')
      console.log('🔢 Values:', currentHeight, '>=', maxThreshold, '=', currentHeight >= maxThreshold)
      
      if (currentHeight >= maxThreshold) {
        console.log('✅ CONDITION TRUE - entering max height branch')
        // At max height - next action will be collapse
        chatExpandBtn.classList.add('expanded')
        chatExpandBtn.title = 'Collapse chat'
        console.log('🔽 ARROWS: DOWN (collapse) - added expanded class for 180deg rotation')
        
        // Visual debugging - temporarily add background color
        chatExpandBtn.style.background = 'rgba(255, 0, 0, 0.3) !important'
        console.log('🎨 Added red background for visual confirmation')
      } else {
        console.log('❌ CONDITION FALSE - entering non-max height branch')
        // Not at max height - next action will be expand
        chatExpandBtn.classList.remove('expanded')
        chatExpandBtn.title = 'Expand chat'
        console.log('🔼 ARROWS: UP (expand) - removed expanded class')
        
        // Remove visual debugging background
        chatExpandBtn.style.background = 'transparent !important'
      }
      
      // Check computed styles
      const computedTransform = window.getComputedStyle(chatExpandBtn).transform
      console.log('💄 Computed transform:', computedTransform)
      console.log('💄 Button classList:', chatExpandBtn.classList.toString())
      console.log('After update - Button has expanded class:', chatExpandBtn.classList.contains('expanded'))
      console.log('===================')
    }
  }
  
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
  const perspectivesPromptTextarea = document.getElementById("perspectivesPrompt")
  const savePromptEdit = document.getElementById("savePromptEdit")
  const cancelPromptEdit = document.getElementById("cancelPromptEdit")
  // Remove resetToDefault element reference since it's no longer in HTML

  // State
  let currentProvider = "openai"
  let currentTabId = null
  let summarizeUsage = 0
  let summarizeDefault = "gemini-flash-2.5"

  // Load centralized prompts from JSON file
  let PROMPTS = {};
  let defaultPrompts = {};

  // Function to load prompts from centralized JSON file
  async function loadPrompts() {
    try {
      const response = await fetch(chrome.runtime.getURL('lib/prompts.json'));
      PROMPTS = await response.json();
      
      // Legacy mapping for backward compatibility
      defaultPrompts = {
        eli5: PROMPTS.eli5,
        standard: PROMPTS.standard,
        phd: PROMPTS.expert  // Map phd to expert for backward compatibility
      };
      
      console.log('📝 Loaded centralized prompts:', PROMPTS);
      return PROMPTS;
    } catch (error) {
      console.error('❌ CRITICAL: Failed to load centralized prompts from lib/prompts.json:', error);
      console.error('❌ This means prompts are not centralized! Please check that lib/prompts.json exists and is accessible.');
      
      // Last resort minimal fallback
      console.error('❌ Using minimal fallback prompts.');
      PROMPTS = {
        eli5: "Summarize this content in simple terms.",
        standard: "Summarize this content clearly.", 
        expert: "Provide a detailed summary of this content."
      };
      
      defaultPrompts = {
        eli5: PROMPTS.eli5,
        standard: PROMPTS.standard,
        phd: PROMPTS.expert
      };
      
      return PROMPTS;
    }
  }

  // Custom prompts (loaded from storage after initialization)
  let customPrompts = {}
  
  // History functionality
  let summaryHistory = []
  const MAX_HISTORY_ITEMS = 50
  
  // Function to add item to history
  function addToHistory(title, url) {
    const timestamp = Date.now()
    const historyItem = {
      title: title || 'Untitled Page',
      url: url,
      timestamp: timestamp,
      id: `history_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    // Remove existing entry for same URL to avoid duplicates
    summaryHistory = summaryHistory.filter(item => item.url !== url)
    
    // Add to beginning of array (most recent first)
    summaryHistory.unshift(historyItem)
    
    // Limit to MAX_HISTORY_ITEMS
    if (summaryHistory.length > MAX_HISTORY_ITEMS) {
      summaryHistory = summaryHistory.slice(0, MAX_HISTORY_ITEMS)
    }
    
    // Save to storage
    chrome.storage.local.set({ summaryHistory: summaryHistory })
    
    // Update UI
    renderHistoryList()
    
    console.log('📚 Added to history:', title, url)
  }
  
  // Function to load history from storage
  async function loadHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['summaryHistory'], (result) => {
        summaryHistory = result.summaryHistory || []
        renderHistoryList()
        resolve()
      })
    })
  }
  
  // Function to clear all history
  function clearHistory() {
    summaryHistory = []
    chrome.storage.local.remove(['summaryHistory'])
    renderHistoryList()
    console.log('📚 History cleared')
  }
  
  // Function to render history list
  function renderHistoryList() {
    const historyList = document.getElementById('historyList')
    
    if (summaryHistory.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <p>No summaries yet. Start by summarizing a page!</p>
        </div>
      `
      return
    }
    
    const historyItems = summaryHistory.map(item => {
      const date = new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      // Truncate URL for display
      const displayUrl = item.url.length > 60 ? 
        item.url.substring(0, 57) + '...' : 
        item.url
      
      // Truncate title for display
      const displayTitle = item.title.length > 80 ? 
        item.title.substring(0, 77) + '...' : 
        item.title
      
      return `
        <div class="history-item" data-url="${item.url}" data-title="${item.title}">
          <div class="history-title">${displayTitle}</div>
          <div class="history-url">${displayUrl}</div>
          <div class="history-date">${date}</div>
        </div>
      `
    }).join('')
    
    historyList.innerHTML = historyItems
    
    // Add click listeners to history items
    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url
        const title = item.dataset.title
        console.log('📚 Clicked history item:', title, url)
        
        // Navigate to the URL
        window.parent.postMessage({ action: "navigateToUrl", url: url }, "*")
        
        // Close history popup
        toggleHistoryPopup(false)
      })
    })
  }
  
  // Function to toggle history popup
  function toggleHistoryPopup(show = null) {
    const historyOverlay = document.getElementById('historyOverlay')
    const historyBtn = document.getElementById('historyBtn')
    
    const isVisible = !historyOverlay.classList.contains('hidden')
    const shouldShow = show !== null ? show : !isVisible
    
    if (shouldShow) {
      historyOverlay.classList.remove('hidden')
      historyBtn.classList.add('active')
    } else {
      historyOverlay.classList.add('hidden')
      historyBtn.classList.remove('active')
    }
  }
  
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

  // Models data (Gemini Flash Lite as default, separate from user API keys)
  // Model IDs match the API expected format
  const models = [
    { id: "gemini-flash-lite-2.5", name: "Gemini Flash Lite 2.5", provider: "google", isDefault: true, isSystemDefault: true, apiId: "google-gemini-2.5-flash-lite" },
    { id: "gemini-flash-2.5", name: "Gemini Flash 2.5", provider: "google", isSystemDefault: true, apiId: "google-gemini-2.5-flash" },
    { id: "perplexity-sonar", name: "Perplexity Sonar", provider: "perplexity", apiId: "perplexity-sonar" },
    { id: "gemini-flash-lite-2.5-user", name: "Gemini Flash Lite 2.5", provider: "google", apiId: "google-gemini-2.5-flash-lite" },
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
          const apiKey = atob(encryptedKey)
          console.log('Retrieved API key preview:', apiKey.substring(0, 10) + '...')
          console.log('API key length after decode:', apiKey.length)
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
        } else {
          // Initialize with default prompts if no custom prompts exist
          customPrompts = { ...defaultPrompts }
        }
        console.log('📝 Loaded custom prompts:', customPrompts);
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
    if (perspectivesPromptTextarea) {
      perspectivesPromptTextarea.value = customPrompts.perspectives || defaultPrompts.perspectives
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
    customPrompts.perspectives = perspectivesPromptTextarea.value.trim()
    
    // Fallback to defaults if empty
    if (!customPrompts.eli5) customPrompts.eli5 = defaultPrompts.eli5
    if (!customPrompts.standard) customPrompts.standard = defaultPrompts.standard
    if (!customPrompts.phd) customPrompts.phd = defaultPrompts.phd
    if (!customPrompts.perspectives) customPrompts.perspectives = defaultPrompts.perspectives
    
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
      case 'perspectives':
        if (perspectivesPromptTextarea) {
          perspectivesPromptTextarea.value = defaultPrompts.perspectives
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

      // Load centralized prompts first
      await loadPrompts()
      
      // Load custom prompts
      await loadCustomPrompts()
      
      // Load history
      await loadHistory()

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
        
        // Initialize chat functionality
        initializeChat()
        
        // Initialize resize functionality
        initializeResize()
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
    
    
    window.parent.postMessage({
      action: "extractContent",
      complexity: complexityLevel,
      model: modelToSend,
      apiKey: apiKey,
      customPrompt: customPrompt
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
        
        // Store page content for chat functionality
        if (event.data.pageContent) {
          storePageContent(event.data.pageContent)
          // Update chat state after content is stored
          updateChatState()
        }
        
        // Add to history with page info from summaryResult
        console.log('📚 Summary completed - checking history data:', { title: event.data.title, url: event.data.url })
        if (event.data.title && event.data.url) {
          console.log('📚 Adding to history:', event.data.title, event.data.url)
          addToHistory(event.data.title, event.data.url)
        } else {
          console.log('📚 Missing title or URL for history')
        }
        
        // Update the usage counter display after successful summary
        updateSummarizeSection().catch(console.error)
      }

      summarizeBtn.disabled = false
    }
    
    // Handle chat content extraction response
    if (event.data.action === "chatContentResult") {
      if (event.data.error) {
        // Remove the "Extracting..." message and show error
        const messages = chatMessages.querySelectorAll('.chat-message')
        if (messages.length > 0) {
          messages[messages.length - 1].remove()
        }
        addChatMessage('assistant', 'Error extracting page content. Please try again.')
        pendingChatMessage = null
      } else if (event.data.pageContent) {
        // Store content and update chat state
        storePageContent(event.data.pageContent)
        updateChatState()
        
        // Remove the "Extracting..." message
        const messages = chatMessages.querySelectorAll('.chat-message')
        if (messages.length > 0) {
          messages[messages.length - 1].remove()
        }
        
        // Send the pending message
        if (pendingChatMessage) {
          const messageToSend = pendingChatMessage
          pendingChatMessage = null
          
          // Add user message and process it
          addChatMessage('user', messageToSend)
          processChatMessage(messageToSend)
        }
      }
    }
  })

  // Model selector popup handlers
  modelSelectorBtn.addEventListener("click", () => {
    modelSelectorOverlay.classList.remove("hidden")
  })


  closeModelSelector.addEventListener("click", async () => {
    modelSelectorOverlay.classList.add("hidden")
    await updateSummarizeSection()
  })

  // Close popup when clicking outside the card
  modelSelectorOverlay.addEventListener("click", async (e) => {
    if (e.target === modelSelectorOverlay) {
      modelSelectorOverlay.classList.add("hidden")
      await updateSummarizeSection()
    }
  })

  // Prevent clicks inside the popup from bubbling up to close the popup
  const modelSelectorPopup = modelSelectorOverlay.querySelector('.model-selector-popup')
  if (modelSelectorPopup) {
    modelSelectorPopup.addEventListener("click", (e) => {
      e.stopPropagation()
    })
  }

  // History button event listeners
  const historyBtn = document.getElementById('historyBtn')
  const clearHistoryBtn = document.getElementById('clearHistoryBtn')
  const closeHistoryBtn = document.getElementById('closeHistoryBtn')
  const historyOverlay = document.getElementById('historyOverlay')
  
  historyBtn.addEventListener('click', () => {
    toggleHistoryPopup()
  })
  
  clearHistoryBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to clear all summary history?')) {
      clearHistory()
    }
  })
  
  closeHistoryBtn.addEventListener('click', () => {
    toggleHistoryPopup(false)
  })
  
  // Close history popup when clicking overlay background
  historyOverlay.addEventListener('click', (e) => {
    if (e.target === historyOverlay) {
      toggleHistoryPopup(false)
    }
  })
  
  // Prevent clicks inside the popup from closing it
  const historyPopup = historyOverlay.querySelector('.history-popup')
  if (historyPopup) {
    historyPopup.addEventListener('click', (e) => {
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
    updateExpandButtonArrows()
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

  // Chat functionality
  let chatConversation = []
  let pageContent = null
  let pendingChatMessage = null
  
  function initializeChat() {
    // Initialize chat state
    updateChatState()
    
    // Initialize three perspectives button state
    threePerspectivesBtn.disabled = true // Start disabled until content is available
    
    // Initialize chat area with proper sizing
    initializeChatSize()
    
    // Auto-resize chat input and expand section when user starts typing
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto'
      chatInput.style.height = Math.min(120, Math.max(36, chatInput.scrollHeight)) + 'px'
      
      // Enable/disable send button
      chatSendBtn.disabled = !chatInput.value.trim()
      
      // Auto-resize chat to accommodate content
      autoResizeChatToContent()
      
      // Update expand button arrows based on new content state
      updateExpandButtonArrows()
    })
    
    // Also expand on focus to show the user can type
    chatInput.addEventListener('focus', () => {
      autoResizeChatToContent()
      updateExpandButtonArrows()
    })
    
    // Send message on Enter (Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!chatSendBtn.disabled) {
          sendChatMessage()
        }
      }
    })
    
    // Send button click
    chatSendBtn.addEventListener('click', () => {
      if (!chatSendBtn.disabled) {
        sendChatMessage()
      }
    })
    
    // 3 Perspectives button click
    threePerspectivesBtn.addEventListener('click', () => {
      if (!threePerspectivesBtn.disabled) {
        generatePerspectives()
      }
    })
    
    // Note: No unlock button needed - banner is purely informational
    
    // Initialize chat expand/collapse button
    initializeChatExpandButton()
    
    // Add smart click handlers for resizing areas
    initializeSmartResize()
  }
  
  // Function to expand chat section to 50% of panel height when user types
  function expandChatSection() {
    if (!chatSection) return
    
    // Use same calculation as expand button for consistency
    const summarizerPanel = document.querySelector('.summarizer-panel')
    const panelHeader = document.querySelector('.panel-header')
    
    if (!summarizerPanel || !panelHeader) return
    
    const totalPanelHeight = summarizerPanel.offsetHeight
    const headerHeight = panelHeader.offsetHeight
    const availableHeight = totalPanelHeight - headerHeight
    
    // Target 50% of available height, with reasonable bounds
    const targetHeight = Math.max(200, Math.min(availableHeight * 0.5, availableHeight - 120))
    
    // Only expand if currently small
    const currentHeight = parseInt(window.getComputedStyle(chatSection).height, 10)
    if (currentHeight < 150) {
      chatSection.style.height = targetHeight + 'px'
      chatSection.classList.remove('collapsed')
      chatSection.classList.remove('expanded') // Ensure it's not in full expanded state
      
      // Save the expanded height
      chrome.storage.local.set({ 
        chatSectionHeight: targetHeight,
        chatExpanded: false 
      })
      
      console.log('Chat auto-expanded to 50%:', targetHeight + 'px')
    }
  }
  
  // Initialize smart resize click handlers
  function initializeSmartResize() {
    // Click on summary area to minimize chat
    const summaryContainer = document.getElementById('summaryContainer')
    if (summaryContainer) {
      summaryContainer.addEventListener('click', () => {
        minimizeChatToSmall()
      })
    }
    
    // Click on entire panel content area to minimize chat
    const panelContent = document.querySelector('.panel-content')
    if (panelContent) {
      panelContent.addEventListener('click', (e) => {
        // Only trigger if clicked directly on panel content, not on child elements
        if (e.target === panelContent) {
          minimizeChatToSmall()
        }
      })
    }
    
    // Click on complexity section to minimize chat
    const complexitySection = document.querySelector('.complexity-section')
    if (complexitySection) {
      complexitySection.addEventListener('click', () => {
        minimizeChatToSmall()
      })
    }
    
    // Click on chat section to expand based on current size
    if (chatSection) {
      chatSection.addEventListener('click', (e) => {
        // Don't trigger if clicking on resize handle or expand button
        if (e.target.closest('.resize-handle') || e.target.closest('.chat-expand-btn')) {
          return
        }
        
        expandChatOnClick()
      })
    }
    
    // Helper function to minimize chat to appropriate small size
    function minimizeChatToSmall() {
      const minimumSize = getMinimumChatSize()
      setChatHeight(minimumSize)
      updateExpandButtonArrows()
    }
    
    // Helper function to expand chat on click
    function expandChatOnClick() {
      const currentHeight = getCurrentChatHeight()
      const minimumSize = getMinimumChatSize()
      
      // If currently at minimum size, expand to accommodate content
      if (currentHeight <= minimumSize + 10) {
        // If no content, expand to half size
        // If has content, expand to size that accommodates content
        const targetHeight = chatHasContent() ? 
          Math.max(CHAT_SIZES.HALF, minimumSize) : 
          CHAT_SIZES.HALF
        setChatHeight(targetHeight)
      } else {
        // If already expanded, maximize to full height
        setChatHeight(CHAT_SIZES.MAXIMUM)
      }
      
      updateExpandButtonArrows()
    }
  }
  
  // Resize chat to a percentage of panel height
  function resizeChatToPercentage(percentage) {
    if (!chatSection) return
    
    const panelContent = document.querySelector('.panel-content')
    if (!panelContent) return
    
    // Get the total available height (panel content + current chat height)
    const panelHeight = panelContent.offsetHeight
    const currentChatHeight = parseInt(window.getComputedStyle(chatSection).height, 10)
    const totalAvailableHeight = panelHeight + currentChatHeight
    
    // Calculate target height based on percentage, respecting viewport constraints
    // Panel now fills container height, account for overlay padding (32px total)
    const availableHeight = window.innerHeight - 32
    const maxAllowedHeight = Math.min(400, availableHeight * 0.4)
    const targetHeight = Math.max(100, Math.min(maxAllowedHeight, (totalAvailableHeight * percentage) / 100))
    
    chatSection.style.height = targetHeight + 'px'
    
    // Manage collapsed class
    if (targetHeight <= 100) {
      chatSection.classList.add('collapsed')
    } else {
      chatSection.classList.remove('collapsed')
    }
    
    // Save the new height
    chrome.storage.local.set({ chatSectionHeight: targetHeight })
    
    console.log(`Resized chat to ${percentage}% (${targetHeight}px) of total height`)
  }
  
  // Initialize chat expand/collapse button functionality
  function initializeChatExpandButton() {
    if (!chatExpandBtn || !chatSection) return
    
    // Click handler for cycling through size states
    chatExpandBtn.addEventListener('click', (e) => {
      e.stopPropagation() // Prevent triggering resize handle drag
      e.preventDefault() // Prevent any default behavior
      
      console.log('🔘 BUTTON CLICKED')
      const beforeHeight = getCurrentChatHeight()
      const nextSize = getNextChatSize()
      console.log('Button click - Before height:', beforeHeight, 'Will set to:', nextSize)
      console.log('Requested change:', nextSize - beforeHeight, 'pixels')
      
      setChatHeight(nextSize)
      
      // Wait longer and check if height actually changed
      setTimeout(() => {
        const actualHeight = getCurrentChatHeight()
        console.log('After setChatHeight - Actual height is now:', actualHeight, 'Expected:', nextSize)
        updateExpandButtonArrows()
        console.log('Forced arrow update after button click')
      }, 50) // Increased delay
    })
    
    // Initialize expand button arrows
    updateExpandButtonArrows()
  }

  // Initialize chat area with proper minimum size
  function initializeChatSize() {
    if (!chatSection) return
    
    // Set initial size to minimum
    const minimumSize = getMinimumChatSize()
    setChatHeight(minimumSize)
    updateExpandButtonArrows()
  }
  
  function updateChatState() {
    // Chat is now always available - no locked state
    console.log('Chat state updated. Page content length:', pageContent?.length || 0)
    
    // Enable/disable three perspectives button based on content availability
    threePerspectivesBtn.disabled = !pageContent || pageContent.length === 0
  }
  
  async function sendChatMessage() {
    const message = chatInput.value.trim()
    if (!message) return
    
    // If no page content yet, extract it now
    if (!pageContent) {
      // Request page content extraction from content script
      window.parent.postMessage({
        action: "extractContentForChat"
      }, "*")
      
      // Show temporary message
      addChatMessage('assistant', 'Extracting page content...')
      chatInput.value = ''
      chatSendBtn.disabled = true
      
      // Store the message to send after content is extracted
      pendingChatMessage = message
      return
    }
    
    // Clear input and disable send button
    chatInput.value = ''
    chatSendBtn.disabled = true
    chatInput.style.height = '36px'
    
    // Add user message to conversation
    addChatMessage('user', message)
    
    // Process the message
    processChatMessage(message)
  }
  
  async function generatePerspectives() {
    // Show typing indicator in chat
    const typingId = addChatMessage('assistant', '...', true)
    
    try {
      // Use same model/API key logic as summarization
      const defaultModel = getDefaultModel()
      const provider = providers[defaultModel.provider]
      let apiKey = null
      
      // Only require API key for non-system models (same as summarization)
      if (provider && provider.keyName && !defaultModel.isSystemDefault) {
        apiKey = await getApiKey(provider.keyName)
        if (!apiKey) {
          throw new Error(`API key required for ${defaultModel.name}`)
        }
      }
      
      // Check usage limits for system default (same as summarization)
      const isUsingSystemDefault = defaultModel.isSystemDefault
      if (isUsingSystemDefault && summarizeUsage >= 25) {
        throw new Error('Monthly usage limit reached')
      }
      
      // Get custom prompt for perspectives
      const customPrompt = getCurrentPrompt("perspectives")
      
      // Get model to send
      const modelToSend = defaultModel.id
      
      // Send request to background script for perspectives analysis
      chrome.runtime.sendMessage(
        {
          action: "getChatResponse",
          content: pageContent,
          url: window.location.href,
          model: modelToSend,
          apiKey: apiKey,
          customPrompt: customPrompt,
          tabId: currentTabId,
          analysisType: "perspectives"
        },
        (response) => {
          // Remove typing indicator
          removeChatMessage(typingId)
          
          if (response && response.error) {
            addChatMessage('assistant', `Error: ${response.error}`)
          } else if (response && response.summary) {
            // Add perspectives as a chat message
            addChatMessage('assistant', response.summary)
            
            // Update usage tracking for system default
            if (isUsingSystemDefault) {
              summarizeUsage++
              updateUsageDisplay()
              chrome.storage.local.set({ summarizeUsage })
            }
          }
        }
      )
    } catch (error) {
      // Remove typing indicator
      removeChatMessage(typingId)
      addChatMessage('assistant', `Error: ${error.message}`)
    }
  }

  async function processChatMessage(message) {
    // Show typing indicator
    const typingId = addChatMessage('assistant', '...', true)
    
    try {
      // Use same model/API key logic as summarization
      const defaultModel = getDefaultModel()
      const provider = providers[defaultModel.provider]
      let apiKey = null
      
      // Only require API key for non-system models (same as summarization)
      if (provider && provider.keyName && !defaultModel.isSystemDefault) {
        apiKey = await getApiKey(provider.keyName)
        if (!apiKey) {
          throw new Error(`API key required for ${defaultModel.name}`)
        }
      }
      
      // Check usage limits for system default (same as summarization)
      const isUsingSystemDefault = defaultModel.isSystemDefault
      if (isUsingSystemDefault && summarizeUsage >= 25) {
        throw new Error('Monthly usage limit reached. Add your own API key for unlimited chat.')
      }
      
      console.log('=== CHAT API REQUEST ===')
      console.log('Model:', defaultModel.name)
      console.log('Is system default:', isUsingSystemDefault)
      console.log('Has API key:', !!apiKey)
      console.log('Current usage:', summarizeUsage)
      console.log('========================')
      
      // Build chat prompt using conversation history
      let chatPrompt = `You are a helpful assistant answering questions about this webpage content. Be conversational and helpful.

Page Content:
${pageContent}

`
      
      // Add conversation history
      if (chatConversation.length > 0) {
        chatPrompt += "Previous conversation:\n"
        chatConversation.forEach(msg => {
          chatPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
        })
        chatPrompt += "\n"
      }
      
      chatPrompt += `User: ${message}

Please respond naturally as a helpful assistant.`

      // Send request to background script instead of direct API call
      const modelToSend = defaultModel.isSystemDefault ? defaultModel.id : (defaultModel.apiId || defaultModel.id)
      
      chrome.runtime.sendMessage(
        {
          action: "getChatResponse",
          content: pageContent,
          url: window.location.href,
          model: modelToSend,
          apiKey: apiKey,
          customPrompt: chatPrompt,
          tabId: currentTabId
        },
        (response) => {
          try {
            // Check for extension context invalidation
            if (chrome.runtime.lastError) {
              throw new Error(`Extension context invalidated: ${chrome.runtime.lastError.message}`)
            }
            if (!response) {
              throw new Error('No response received from server')
            }
            if (response.error) {
              throw new Error(response.error)
            }
            
            // Remove typing indicator and add response
            removeChatMessage(typingId)
            addChatMessage('assistant', response.summary)
            
            // Update conversation history
            chatConversation.push({ role: 'user', content: message })
            chatConversation.push({ role: 'assistant', content: response.summary })
            
            // Keep conversation to last 10 messages to avoid token limits
            if (chatConversation.length > 10) {
              chatConversation = chatConversation.slice(-10)
            }
            
            // Track usage for system default models (same as summarization)
            if (isUsingSystemDefault) {
              summarizeUsage++
              console.log('Chat usage incremented! New usage:', summarizeUsage)
              
              // Save usage and ensure reset date is set for this month
              const now = new Date()
              const resetDate = new Date(now.getFullYear(), now.getMonth(), 1)
              chrome.storage.local.set({ 
                summarizeUsage,
                usageResetDate: resetDate.toISOString()
              })
              
              // Update UI to reflect new usage
              updateSummarizeSection().catch(console.error)
            }
          } catch (error) {
            console.error('Chat response error:', error)
            removeChatMessage(typingId)
            addChatMessage('assistant', `Error: ${error.message}. Check console for details.`)
          }
        }
      )
      
    } catch (error) {
      console.error('Chat error:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        pageContentLength: pageContent?.length
      })
      removeChatMessage(typingId)
      addChatMessage('assistant', `Error: ${error.message}. Check console for details.`)
    }
  }
  
  function addChatMessage(role, content, isTyping = false) {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const messageDiv = document.createElement('div')
    messageDiv.className = `chat-message chat-message-${role}`
    messageDiv.id = messageId
    
    if (isTyping) {
      messageDiv.classList.add('typing')
    }
    
    // Format content based on role
    let formattedContent = content
    if (role === 'assistant' && !isTyping) {
      formattedContent = renderChatMarkdown(content)
    } else {
      // For user messages and typing indicators, just escape HTML
      formattedContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    
    messageDiv.innerHTML = `
      <div class="chat-message-content">${formattedContent}</div>
    `
    
    chatMessages.appendChild(messageDiv)
    chatMessages.scrollTop = chatMessages.scrollHeight
    
    // Auto-resize chat to accommodate new content
    autoResizeChatToContent()
    
    // Update expand button arrows based on new content state
    updateExpandButtonArrows()
    
    return messageId
  }
  
  // Enhanced markdown renderer for chat messages
  function renderChatMarkdown(text) {
    let html = text
    
    // First handle code blocks to protect them from other replacements
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>')
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    html = html.replace(/`([^`]+)`/gim, '<code class="inline-code">$1</code>')
    
    // Handle headers (but smaller for chat)
    html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>')
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>') 
    html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>')
    
    // Handle bold and italic formatting
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    html = html.replace(/\*((?![*\s]).*?(?<![*\s]))\*/gim, '<em>$1</em>')
    
    // Handle bullet points
    html = html.replace(/^[\*\-]\s+(.+)$/gim, '<li>$1</li>')
    html = html.replace(/^\d+\.\s+(.+)$/gim, '<li class="numbered">$1</li>')
    
    // Group consecutive list items
    html = html.replace(/(<li(?:\s+class="numbered")?>.*?<\/li>)(\s*<li(?:\s+class="numbered")?>.*?<\/li>)*/gim, function(match) {
      const isNumbered = match.includes('class="numbered"')
      const tag = isNumbered ? 'ol' : 'ul'
      return `<${tag}>${match.replace(/\s+class="numbered"/g, '')}</${tag}>`
    })
    
    // Handle line breaks and paragraphs (more conservative for chat)
    html = html.replace(/\n\n+/gim, '</p><p>')
    html = html.replace(/\n/gim, '<br>')
    
    // Wrap in paragraphs if needed (but not if it's mostly lists/headers)
    if (!html.includes('<h') && !html.includes('<ul') && !html.includes('<ol') && !html.includes('<pre>')) {
      html = '<p>' + html + '</p>'
    }
    
    return html
  }
  
  function removeChatMessage(messageId) {
    const messageDiv = document.getElementById(messageId)
    if (messageDiv) {
      messageDiv.remove()
    }
  }
  
  // Store page content when summary is generated
  function storePageContent(content) {
    pageContent = content
    console.log('Stored page content for chat:', content.length, 'characters')
  }
  
  // Resize functionality
  function initializeResize() {
    if (!resizeHandle || !chatSection) return
    
    let isResizing = false
    let startY = 0
    let startHeight = 0
    
    // Always start with small size (ignore any saved large sizes)
    const minimumSize = getMinimumChatSize()
    setChatHeight(minimumSize)
    
    // Force a reflow to ensure styles are applied
    chatSection.offsetHeight
    
    // Clear any large saved height to ensure clean start
    chrome.storage.local.remove(['chatSectionHeight'])
    
    // Double-check height after a brief delay
    setTimeout(() => {
      if (getCurrentChatHeight() !== minimumSize) {
        console.log('Correcting chat section height after initialization')
        setChatHeight(minimumSize)
      }
    }, 200)
    
    // Mouse down on handle (only on the drag bar, not the expand button)
    resizeHandle.addEventListener('mousedown', (e) => {
      // Only start resizing if clicking on the resize bar area, not the expand button
      if (e.target.closest('.chat-expand-btn')) {
        return // Don't start resize if clicking the expand button
      }
      
      isResizing = true
      startY = e.clientY
      startHeight = getCurrentChatHeight()
      
      resizeHandle.classList.add('dragging')
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      
      e.preventDefault()
    })
    
    // Mouse move - resize
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return
      
      const deltaY = startY - e.clientY // Inverted because we want up = bigger
      
      // Use our defined min/max values for full flexibility
      const minHeight = getMinimumChatSize()
      const maxHeight = CHAT_SIZES.MAXIMUM
      
      // Allow smooth resizing with full range from min to max
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY))
      
      // Use setChatHeight to handle height, CSS classes, and storage
      setChatHeight(newHeight)
      
      // Update expand button arrows to reflect new state
      updateExpandButtonArrows()
      
      e.preventDefault()
    })
    
    // Mouse up - stop resizing
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false
        resizeHandle.classList.remove('dragging')
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        
        // Final arrow update after resize is complete
        updateExpandButtonArrows()
      }
    })
    
    // Touch events for mobile support
    resizeHandle.addEventListener('touchstart', (e) => {
      // Only start resizing if touching the resize bar area, not the expand button
      if (e.target.closest('.chat-expand-btn')) {
        return // Don't start resize if touching the expand button
      }
      
      isResizing = true
      startY = e.touches[0].clientY
      startHeight = getCurrentChatHeight()
      
      resizeHandle.classList.add('dragging')
      e.preventDefault()
    })
    
    document.addEventListener('touchmove', (e) => {
      if (!isResizing) return
      
      const deltaY = startY - e.touches[0].clientY
      
      // Use our defined min/max values for full flexibility
      const minHeight = getMinimumChatSize()
      const maxHeight = CHAT_SIZES.MAXIMUM
      
      // Allow smooth resizing with full range from min to max
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY))
      
      // Use setChatHeight to handle height, CSS classes, and storage
      setChatHeight(newHeight)
      
      // Update expand button arrows to reflect new state
      updateExpandButtonArrows()
      
      e.preventDefault()
    })
    
    document.addEventListener('touchend', () => {
      if (isResizing) {
        isResizing = false
        resizeHandle.classList.remove('dragging')
        
        // Final arrow update after resize is complete
        updateExpandButtonArrows()
      }
    })
  }
}

// Start the extension when DOM is ready - multiple fallbacks
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension)
} else if (document.readyState === 'interactive') {
  // DOM is ready but resources might still be loading
  setTimeout(initializeExtension, 100)
} else {
  // Document is completely loaded
  initializeExtension()
}

// Additional fallback in case the above doesn't work
setTimeout(() => {
  if (!document.querySelector('.summarizer-panel')) {
    console.log('Panel not found, retrying initialization...')
    initializeExtension()
  }
}, 500)
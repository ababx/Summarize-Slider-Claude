chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSummary") {
    // Use sender.tab.id if tabId is not provided in request
    const tabId = request.tabId || (sender.tab && sender.tab.id)
    
    // Check if panel is closed before starting summarization
    checkPanelStatusAndNotify(tabId, 'summary')
    
    summarizeContent(request.content, request.url, request.complexity, request.model, request.apiKey, request.customPrompt, request.tokenLimit)
      .then((summary) => {
        // Show notification if panel is closed when summary is ready
        showCompletionNotification(tabId, 'summary')
        sendResponse({ summary, tabId: tabId })
      })
      .catch((error) => {
        console.error("Error summarizing content:", error)
        sendResponse({ error: error.message || "Failed to generate summary", tabId: tabId })
      })

    // Return true to indicate we will send a response asynchronously
    return true
  }
  
  if (request.action === "getChatResponse") {
    // Use sender.tab.id if tabId is not provided in request
    const tabId = request.tabId || (sender.tab && sender.tab.id)
    
    // Check if panel is closed before starting chat response
    checkPanelStatusAndNotify(tabId, 'chat')
    
    summarizeContent(request.content, request.url, "chat", request.model, request.apiKey, request.customPrompt, request.tokenLimit)
      .then((response) => {
        // Show notification if panel is closed when chat response is ready
        showCompletionNotification(tabId, 'chat')
        sendResponse({ summary: response, tabId: tabId })
      })
      .catch((error) => {
        console.error("Error getting chat response:", error)
        sendResponse({ error: error.message || "Failed to get chat response", tabId: tabId })
      })

    // Return true to indicate we will send a response asynchronously
    return true
  }

  // Add handler to get the current tab ID
  if (request.action === "getCurrentTabId") {
    // If the message comes from a content script, we can use sender.tab
    if (sender.tab) {
      sendResponse({ tabId: sender.tab.id })
    } else {
      // Otherwise, query for the current active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          sendResponse({ tabId: tabs[0].id })
        } else {
          sendResponse({ tabId: null })
        }
      })
    }
    return true
  }
})

async function summarizeContent(content, url, complexity = "standard", model = "default", apiKey = null, customPrompt = null, tokenLimit = null) {
  try {
    console.log("Sending request to API endpoint...")
    console.log("Complexity level:", complexity)
    console.log("Model:", model)

    const apiUrl = "https://summarize-slider-claude.vercel.app/api/summarize"
    console.log("API URL:", apiUrl)

    const requestBody = {
      text: content,
      url: url,
      complexity: complexity
    }

    // Only include model if it's not default (to maintain original API compatibility)
    if (model && model !== "default") {
      requestBody.model = model
    }

    // Only include API key if it's provided
    if (apiKey) {
      requestBody.apiKey = apiKey
    }

    // Include custom prompt if provided
    if (customPrompt) {
      requestBody.customPrompt = customPrompt
    }

    // Include token limit if provided
    if (tokenLimit) {
      requestBody.tokenLimit = tokenLimit
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error response status:", response.status)
      console.error("Error response text:", errorText)
      console.error("Full response object:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      })

      let errorMessage = `API request failed with status ${response.status}: ${response.statusText}`
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error) {
          errorMessage = `${errorMessage} - ${errorData.error}`
        }
      } catch (e) {
        errorMessage = `${errorMessage} - Raw response: ${errorText}`
      }

      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data.summary
  } catch (error) {
    console.error("Error in summarizeContent:", error)
    throw error
  }
}

// When the extension icon is clicked, toggle the panel
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "togglePanel" })
})

// Log when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Webpage Summarizer extension installed")

  // Clear any existing panel visibility states to prevent auto-opening
  chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter((key) => key.startsWith("panelVisible_") || key === "panelVisible")
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove)
    }
  })
})

// Check if panel is closed and prepare for notifications
async function checkPanelStatusAndNotify(tabId, type) {
  if (!tabId) return
  
  try {
    // Check if panel is visible for this tab
    const result = await chrome.storage.local.get([`panelVisible_${tabId}`])
    const isPanelVisible = result[`panelVisible_${tabId}`] || false
    
    if (!isPanelVisible) {
      console.log(`Panel is closed, will show notification when ${type} is ready`)
    }
  } catch (error) {
    console.error('Error checking panel status:', error)
  }
}

// Show notification when content generation is complete
async function showCompletionNotification(tabId, type) {
  if (!tabId) {
    console.log('No tabId provided for notification')
    return
  }
  
  try {
    // Check if panel is still closed
    const result = await chrome.storage.local.get([`panelVisible_${tabId}`])
    const isPanelVisible = result[`panelVisible_${tabId}`] || false
    
    if (!isPanelVisible) {
      // Get tab info for notification
      let pageTitle = 'Webpage'
      try {
        const tab = await chrome.tabs.get(tabId)
        pageTitle = tab.title || 'Webpage'
        // Truncate title if too long
        if (pageTitle.length > 50) {
          pageTitle = pageTitle.substring(0, 47) + '...'
        }
      } catch (tabError) {
        console.log('Could not get tab info, using default title')
      }
      
      const notificationOptions = {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Summarize Slider',
        message: type === 'summary' 
          ? `Summary ready for "${pageTitle}"`
          : `Chat response ready for "${pageTitle}"`,
        buttons: [
          { title: 'View Result' }
        ],
        requireInteraction: false // Changed to false so it doesn't persist forever
      }
      
      // Create notification
      const notificationId = `summarizer_${type}_${tabId}_${Date.now()}`
      
      try {
        await chrome.notifications.create(notificationId, notificationOptions)
        
        // Handle notification click - use a more specific listener
        const handleNotificationClick = (clickedNotificationId) => {
          if (clickedNotificationId === notificationId) {
            // Focus the tab and open the panel
            chrome.tabs.update(tabId, { active: true }).catch(console.error)
            chrome.tabs.sendMessage(tabId, { action: 'togglePanel' }).catch(console.error)
            chrome.notifications.clear(clickedNotificationId).catch(console.error)
            // Remove this specific listener
            chrome.notifications.onClicked.removeListener(handleNotificationClick)
          }
        }
        
        // Handle button click
        const handleButtonClick = (clickedNotificationId, buttonIndex) => {
          if (clickedNotificationId === notificationId && buttonIndex === 0) {
            // Focus the tab and open the panel
            chrome.tabs.update(tabId, { active: true }).catch(console.error)
            chrome.tabs.sendMessage(tabId, { action: 'togglePanel' }).catch(console.error)
            chrome.notifications.clear(clickedNotificationId).catch(console.error)
            // Remove this specific listener
            chrome.notifications.onButtonClicked.removeListener(handleButtonClick)
          }
        }
        
        chrome.notifications.onClicked.addListener(handleNotificationClick)
        chrome.notifications.onButtonClicked.addListener(handleButtonClick)
        
        // Auto-clear notification after 15 seconds
        setTimeout(() => {
          chrome.notifications.clear(notificationId).catch(console.error)
          chrome.notifications.onClicked.removeListener(handleNotificationClick)
          chrome.notifications.onButtonClicked.removeListener(handleButtonClick)
        }, 15000)
        
        console.log(`Notification shown for completed ${type} on tab ${tabId}`)
        
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError)
      }
    } else {
      console.log(`Panel is visible, no notification needed for ${type}`)
    }
  } catch (error) {
    console.error('Error showing notification:', error)
  }
}

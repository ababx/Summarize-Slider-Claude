chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSummary") {
    summarizeContent(request.content, request.url, request.complexity, request.model, request.apiKey)
      .then((summary) => {
        sendResponse({ summary, tabId: request.tabId })
      })
      .catch((error) => {
        console.error("Error summarizing content:", error)
        sendResponse({ error: error.message || "Failed to generate summary", tabId: request.tabId })
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

async function summarizeContent(content, url, complexity = "standard", model = "default", apiKey = null) {
  try {
    console.log("Sending request to API endpoint...")
    console.log("Complexity level:", complexity)
    console.log("Model:", model)

    const apiUrl = "https://summarize-slider-claude-git-main.vercel.app/api/summarize"
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

// When the extension icon is clicked, send a message to the content script to toggle the panel
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

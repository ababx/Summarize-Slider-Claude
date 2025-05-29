chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSummary") {
    summarizeContent(request.content, request.url, request.complexity, request.model, request.apiKey, request.customPrompt, request.customQuery, request.tokenLimit)
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

async function summarizeContent(content, url, complexity = "standard", model = "default", apiKey = null, customPrompt = null, customQuery = null, tokenLimit = null) {
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

    // Include custom query if provided
    if (customQuery) {
      requestBody.customQuery = customQuery
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

// When the extension icon is clicked, first capture selected text, then toggle the panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Inject a script to capture selected text immediately
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Capture selection immediately, before any DOM changes
        let selectedText = "";
        
        try {
          // Try multiple methods to get selected text
          const selection = window.getSelection();
          if (selection && selection.toString().trim()) {
            selectedText = selection.toString().trim();
            console.log('🎯 Background script captured selection:', selectedText);
            return selectedText;
          }
          
          const docSelection = document.getSelection();
          if (docSelection && docSelection.toString().trim()) {
            selectedText = docSelection.toString().trim();
            console.log('🎯 Background script captured doc selection:', selectedText);
            return selectedText;
          }
          
          // Check for form element selections
          const activeElement = document.activeElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            if (start !== undefined && end !== undefined && start !== end) {
              selectedText = activeElement.value.substring(start, end).trim();
              console.log('🎯 Background script captured form selection:', selectedText);
              return selectedText;
            }
          }
        } catch (e) {
          console.log('🎯 Background script selection capture error:', e);
        }
        
        console.log('🎯 Background script found no selection');
        return "";
      }
    });
    
    const selectedText = results[0]?.result || "";
    console.log('🎯 Background: Captured selected text:', `"${selectedText}"`);
    
    // Send the toggle message with the captured text
    chrome.tabs.sendMessage(tab.id, { 
      action: "togglePanel", 
      selectedText: selectedText 
    });
    
  } catch (error) {
    console.error('🎯 Error capturing selected text:', error);
    // Fallback to normal toggle
    chrome.tabs.sendMessage(tab.id, { action: "togglePanel" });
  }
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

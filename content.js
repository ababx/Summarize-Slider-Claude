// Check if the panel already exists to avoid duplicates
if (!document.getElementById("summarizer-panel-container")) {
  // Create container for the panel
  const container = document.createElement("div")
  container.id = "summarizer-panel-container"
  container.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
    background: transparent !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    opacity: 1 !important;
    visibility: visible !important;
  `

  // Create a Shadow DOM root to isolate our styles
  const shadowRoot = container.attachShadow({ mode: "closed" })

  // Create overlay for the panel
  const overlay = document.createElement("div")
  overlay.id = "summarizer-overlay"
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 2147483646;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  `

  // Create and inject the iframe
  const iframe = document.createElement("iframe")
  iframe.id = "summarizer-panel-iframe"
  iframe.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: 560px !important;
    height: 100vh !important;
    border: none !important;
    z-index: 2147483647 !important;
    transition: transform 0.3s ease !important;
    transform: translateX(100%) !important;
    background: transparent !important;
    background-color: transparent !important;
    margin: 0 !important;
    padding: 0 !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  `
  
  // Additional iframe transparency enforcement
  iframe.setAttribute('allowtransparency', 'true')
  iframe.setAttribute('frameborder', '0')

  // Get the URL for the panel.html file
  const panelURL = chrome.runtime.getURL("panel.html")
  iframe.src = panelURL

  // Add elements to shadow DOM
  shadowRoot.appendChild(overlay)
  shadowRoot.appendChild(iframe)

  // Add container to document
  document.body.appendChild(container)

  // Get the current tab ID to use for storage
  let currentTabId = null
  chrome.runtime.sendMessage({ action: "getCurrentTabId" }, (response) => {
    // Check for extension context invalidation
    if (chrome.runtime.lastError) {
      console.error('Extension context invalidated while getting tab ID:', chrome.runtime.lastError.message)
      return
    }
    
    if (response && response.tabId) {
      currentTabId = response.tabId

      // Only check if panel should be shown for this specific tab
      if (currentTabId) {
        chrome.storage.local.get([`panelVisible_${currentTabId}`], (result) => {
          // Do NOT automatically open the panel on page load
          // Only store the state for later use
          if (result[`panelVisible_${currentTabId}`]) {
            // We're intentionally NOT opening the panel automatically
            // Just keeping the state for when the user clicks the extension icon
          }
        })
      }
    }
  })

  // Function to open the panel
  function openPanel() {
    iframe.style.transform = "translateX(0)"
    overlay.style.opacity = "1"
    overlay.style.visibility = "visible"
    overlay.style.pointerEvents = "auto"
    if (currentTabId) {
      chrome.storage.local.set({ [`panelVisible_${currentTabId}`]: true })
    }
  }

  // Function to close the panel
  function closePanel() {
    iframe.style.transform = "translateX(100%)"
    overlay.style.opacity = "0"
    overlay.style.visibility = "hidden"
    overlay.style.pointerEvents = "none"
    if (currentTabId) {
      chrome.storage.local.set({ [`panelVisible_${currentTabId}`]: false })
    }
  }

  // Close panel when clicking on the overlay
  overlay.addEventListener("click", closePanel)

  // Listen for messages from the iframe
  window.addEventListener("message", async (event) => {
    // Make sure the message is from our iframe
    if (event.source !== iframe.contentWindow) return

    if (event.data.action === "closePanel") {
      closePanel()
    }
    
    if (event.data.action === "navigateToUrl") {
      // Navigate to the specified URL
      const url = event.data.url
      if (url) {
        window.location.href = url
      }
    }

    if (event.data.action === "extractContent") {
      try {
        // Extract the content from the page
        const rawContent = extractPageContent()

        if (!rawContent || rawContent.trim() === "") {
          iframe.contentWindow.postMessage(
            {
              action: "summaryResult",
              error: "Could not extract content from this page.",
              title: document.title,
              url: window.location.href
            },
            "*",
          )
          return
        }

        // Sanitize content before sending
        const contentSecurity = new (function() {
          const maxContentLength = 50000
          const sensitivePatterns = [
            /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit cards
            /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
            /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*['"]\w+['"]/gi // API keys
          ]

          this.sanitize = function(content) {
            if (content.length > maxContentLength) {
              content = content.substring(0, maxContentLength) + '...'
            }
            
            for (const pattern of sensitivePatterns) {
              content = content.replace(pattern, '[REDACTED]')
            }
            
            return content.replace(/\s+/g, ' ').trim()
          }
        })()

        const content = contentSecurity.sanitize(rawContent)

        // Send message to background script to get summary
        chrome.runtime.sendMessage(
          {
            action: "getSummary",
            content: content,
            url: window.location.href,
            complexity: event.data.complexity,
            model: event.data.model,
            apiKey: event.data.apiKey,
            customPrompt: event.data.customPrompt,
            tokenLimit: event.data.tokenLimit,
            tabId: currentTabId, // Pass the tab ID
          },
          (response) => {
            // Check for extension context invalidation
            if (chrome.runtime.lastError) {
              iframe.contentWindow.postMessage(
                {
                  action: "summaryResult",
                  error: `Extension context invalidated: ${chrome.runtime.lastError.message}. Please reload the page.`,
                  title: document.title,
                  url: window.location.href
                },
                "*",
              )
              return
            }
            
            iframe.contentWindow.postMessage(
              {
                action: "summaryResult",
                summary: response?.summary,
                error: response?.error,
                tabId: currentTabId,
                title: document.title,
                url: window.location.href,
                pageContent: content // Include the extracted content for chat
              },
              "*",
            )
          },
        )
      } catch (error) {
        iframe.contentWindow.postMessage(
          {
            action: "summaryResult",
            error: error.message || "An error occurred while summarizing the page.",
            title: document.title,
            url: window.location.href
          },
          "*",
        )
      }
    }
    
    if (event.data.action === "extractContentForChat") {
      try {
        // Extract the content from the page for chat
        const rawContent = extractPageContent()

        if (!rawContent || rawContent.trim() === "") {
          iframe.contentWindow.postMessage(
            {
              action: "chatContentResult",
              error: "Could not extract content from this page."
            },
            "*",
          )
          return
        }

        // Sanitize content before sending
        const contentSecurity = new (function() {
          const maxContentLength = 50000
          const sensitivePatterns = [
            /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit cards
            /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
            /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*['"]\w+['"]/gi // API keys
          ]

          this.sanitize = function(content) {
            if (content.length > maxContentLength) {
              content = content.substring(0, maxContentLength) + '...'
            }
            
            for (const pattern of sensitivePatterns) {
              content = content.replace(pattern, '[REDACTED]')
            }
            
            return content.replace(/\s+/g, ' ').trim()
          }
        })()

        const content = contentSecurity.sanitize(rawContent)

        // Send content directly to panel
        iframe.contentWindow.postMessage(
          {
            action: "chatContentResult",
            pageContent: content
          },
          "*",
        )
      } catch (error) {
        iframe.contentWindow.postMessage(
          {
            action: "chatContentResult",
            error: error.message || "An error occurred while extracting page content for chat."
          },
          "*",
        )
      }
    }
  })

  // Function to extract the main content from the webpage
  function extractPageContent() {
    // Try to find the main content using common selectors
    const selectors = [
      "article",
      '[role="main"]',
      "main",
      ".main-content",
      "#content",
      ".content",
      ".post-content",
      ".article-content",
    ]

    let content = ""

    // Try each selector
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        // Use the first matching element with the most text content
        let bestElement = elements[0]
        let maxLength = bestElement.textContent.length

        for (let i = 1; i < elements.length; i++) {
          const length = elements[i].textContent.length
          if (length > maxLength) {
            maxLength = length
            bestElement = elements[i]
          }
        }

        content = bestElement.textContent
        break
      }
    }

    // If no content found with selectors, use the body as fallback
    if (!content || content.trim() === "") {
      // Get all paragraphs
      const paragraphs = document.querySelectorAll("p")
      if (paragraphs.length > 0) {
        content = Array.from(paragraphs)
          .map((p) => p.textContent)
          .join("\n\n")
      } else {
        // Last resort: just get the body text
        content = document.body.textContent
      }
    }

    // Clean up the content
    content = content.replace(/\s+/g, " ").trim().substring(0, 15000) // Limit content length for API

    return content
  }


  // Add keyboard shortcut listener
  document.addEventListener("keydown", (event) => {
    // Check for Ctrl+S (Mac) or Ctrl+Alt+S (Windows/Linux)
    const isMac = navigator.platform.includes('Mac')
    let shortcutMatch = false
    
    if (isMac) {
      // Mac: Ctrl+S
      shortcutMatch = event.ctrlKey && !event.metaKey && !event.altKey && event.key === 's'
    } else {
      // Windows/Linux: Ctrl+Alt+S
      shortcutMatch = event.ctrlKey && event.altKey && !event.metaKey && event.key === 's'
    }
    
    if (shortcutMatch) {
      // Prevent the default save action
      event.preventDefault()
      event.stopPropagation()
      
      // Toggle the panel
      if (iframe.style.transform === "translateX(0px)") {
        closePanel()
      } else {
        openPanel()
      }
    }
  })

  // Add this event listener at the end of the file to handle messages from the background script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "togglePanel") {
      if (iframe.style.transform === "translateX(0px)") {
        closePanel()
      } else {
        openPanel()
      }
    }
  })
}

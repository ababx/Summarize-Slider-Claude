// Check if the panel already exists to avoid duplicates
if (!document.getElementById("summarizer-panel-container")) {
  // Create container for the panel
  const container = document.createElement("div")
  container.id = "summarizer-panel-container"

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
    transition: opacity 0.3s ease, visibility 0.3s ease;
  `

  // Create and inject the iframe
  const iframe = document.createElement("iframe")
  iframe.id = "summarizer-panel-iframe"
  iframe.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 560px;
    height: 100vh;
    border: none;
    z-index: 2147483647;
    transition: transform 0.3s ease;
    transform: translateX(100%);
  `

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
    if (currentTabId) {
      chrome.storage.local.set({ [`panelVisible_${currentTabId}`]: true })
    }
  }

  // Function to close the panel
  function closePanel() {
    iframe.style.transform = "translateX(100%)"
    overlay.style.opacity = "0"
    overlay.style.visibility = "hidden"
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
    

    if (event.data.action === "extractContent") {
      try {
        // Extract the content from the page
        const rawContent = extractPageContent()

        if (!rawContent || rawContent.trim() === "") {
          iframe.contentWindow.postMessage(
            {
              action: "summaryResult",
              error: "Could not extract content from this page.",
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
            customQuery: event.data.customQuery,
            tokenLimit: event.data.tokenLimit,
            tabId: currentTabId, // Pass the tab ID
          },
          (response) => {
            iframe.contentWindow.postMessage(
              {
                action: "summaryResult",
                summary: response.summary,
                error: response.error,
                tabId: currentTabId, // Pass the tab ID
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

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

  // Complexity levels
  const complexityLevels = ["eli5", "standard", "phd"]

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
      chrome.storage.local.get([`summary_${currentTabId}`, `complexity_${currentTabId}`], (result) => {
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

  // Close panel
  closeButton.addEventListener("click", () => {
    window.parent.postMessage({ action: "closePanel" }, "*")
  })

  summarizeBtn.addEventListener("click", async () => {
    // Reset UI
    summaryContainer.classList.add("hidden")
    errorContainer.classList.add("hidden")

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

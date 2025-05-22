document.addEventListener("DOMContentLoaded", () => {
  const summarizeBtn = document.getElementById("summarizeBtn")
  const loadingIndicator = document.getElementById("loadingIndicator")
  const summaryContainer = document.getElementById("summaryContainer")
  const summaryContent = document.getElementById("summaryContent")
  const errorContainer = document.getElementById("errorContainer")
  const errorMessage = document.getElementById("errorMessage")
  const complexitySlider = document.getElementById("complexitySlider")
  const sliderFill = document.querySelector(".slider-fill")

  // Complexity levels
  const complexityLevels = ["eli5", "standard", "phd"]

  // Update slider fill based on current value
  function updateSliderFill() {
    const value = complexitySlider.value
    const percentage = (value / 2) * 100
    sliderFill.style.width = `${percentage}%`
  }

  // Initialize slider fill
  updateSliderFill()

  // Update slider fill when slider value changes
  complexitySlider.addEventListener("input", updateSliderFill)

  summarizeBtn.addEventListener("click", async () => {
    // Reset UI
    summaryContainer.classList.add("hidden")
    errorContainer.classList.add("hidden")

    // Show loading indicator
    loadingIndicator.classList.remove("hidden")
    summarizeBtn.disabled = true

    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      // Execute content script to extract the main content
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageContent,
      })

      const content = result[0].result

      if (!content || content.trim() === "") {
        throw new Error("Could not extract content from this page.")
      }

      // Get the selected complexity level
      const complexityLevel = complexityLevels[complexitySlider.value]

      // Send message to background script to get summary
      chrome.runtime.sendMessage(
        {
          action: "getSummary",
          content: content,
          url: tab.url,
          complexity: complexityLevel,
        },
        (response) => {
          loadingIndicator.classList.add("hidden")

          if (response.error) {
            errorMessage.textContent = response.error
            errorContainer.classList.remove("hidden")
          } else {
            summaryContent.textContent = response.summary
            summaryContainer.classList.remove("hidden")
          }

          summarizeBtn.disabled = false
        },
      )
    } catch (error) {
      loadingIndicator.classList.add("hidden")
      errorMessage.textContent = error.message || "An error occurred while summarizing the page."
      errorContainer.classList.remove("hidden")
      summarizeBtn.disabled = false
    }
  })
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

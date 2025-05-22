import { type NextRequest, NextResponse } from "next/server"
import { perplexity } from "@ai-sdk/perplexity"
import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

export async function POST(req: NextRequest) {
  try {
    const { text, url, complexity = "standard", model = "perplexity-sonar", apiKey } = await req.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided for summarization" }, { status: 400 })
    }

    // Model configuration mapping
    const modelMapping = {
      "perplexity-sonar": { provider: perplexity, model: "sonar-pro" },
      "openai-gpt-4o": { provider: openai, model: "gpt-4o" },
      "openai-gpt-4o-mini": { provider: openai, model: "gpt-4o-mini" },
      "openai-gpt-3.5-turbo": { provider: openai, model: "gpt-3.5-turbo" },
      "google-gemini-pro": { provider: google, model: "gemini-1.5-pro" },
      "google-gemini-flash": { provider: google, model: "gemini-1.5-flash" },
      "anthropic-claude-3.5-sonnet": { provider: anthropic, model: "claude-3-5-sonnet-20241022" },
      "anthropic-claude-3-haiku": { provider: anthropic, model: "claude-3-haiku-20240307" },
      "x-grok-beta": { provider: openai, model: "grok-beta" } // X models use OpenAI-compatible API
    }

    const selectedModel = modelMapping[model]
    if (!selectedModel) {
      return NextResponse.json({ error: "Invalid model selected" }, { status: 400 })
    }

    // Configure provider with API key if needed
    let aiProvider
    if (model.startsWith("openai-") || model === "x-grok-beta") {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }
      if (model === "x-grok-beta") {
        aiProvider = openai({
          apiKey: apiKey,
          baseURL: "https://api.x.ai/v1"
        })
      } else {
        aiProvider = openai({ apiKey: apiKey })
      }
    } else if (model.startsWith("google-")) {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }
      aiProvider = google({ apiKey: apiKey })
    } else if (model.startsWith("anthropic-")) {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }
      aiProvider = anthropic({ apiKey: apiKey })
    } else {
      // Perplexity doesn't need API key for this setup
      aiProvider = selectedModel.provider
    }

    // Create a prompt based on the complexity level
    let prompt = ""

    switch (complexity) {
      case "eli5":
        prompt = `Please summarize the following content from ${url} in simple terms that a 5-year-old could understand. Use short sentences, simple words, and explain any complex concepts in a very basic way:\n\n${text}`
        break
      case "phd":
        prompt = `Please provide a sophisticated, academic-level summary of the following content from ${url}. Use technical terminology where appropriate, maintain scholarly tone, and include nuanced analysis:\n\n${text}`
        break
      case "standard":
      default:
        prompt = `Please summarize the following content from ${url} in a clear, concise manner for a general audience. Use markdown formatting for better readability:\n\n${text}`
        break
    }

    // Use the selected AI model to generate a summary
    const result = await generateText({
      model: aiProvider(selectedModel.model),
      prompt,
      maxTokens: 1000,
    })

    // Return the summary
    return NextResponse.json({ summary: result.text })
  } catch (error) {
    console.error("Error in summarize API route:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}

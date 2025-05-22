import { type NextRequest, NextResponse } from "next/server"
import { perplexity } from "@ai-sdk/perplexity"
import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

export async function POST(req: NextRequest) {
  try {
    const { text, url, complexity = "standard", model, apiKey } = await req.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided for summarization" }, { status: 400 })
    }

    // If no model specified or model is "default", use original working code
    if (!model || model === "default") {
      // EXACT ORIGINAL WORKING CODE - DO NOT MODIFY
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

      // Use the Perplexity Sonar API to generate a summary
      const result = await generateText({
        model: perplexity("sonar-pro"),
        prompt,
        maxTokens: 1000,
      })

      // Return the summary
      return NextResponse.json({ summary: result.text })
    }

    // Model configuration mapping
    const modelMapping = {
      "perplexity-sonar": { provider: perplexity, model: "sonar-pro", requiresApiKey: true },
      "openai-gpt-4o": { provider: openai, model: "gpt-4o", requiresApiKey: true },
      "openai-gpt-4o-mini": { provider: openai, model: "gpt-4o-mini", requiresApiKey: true },
      "openai-gpt-3.5-turbo": { provider: openai, model: "gpt-3.5-turbo", requiresApiKey: true },
      "google-gemini-pro": { provider: google, model: "gemini-1.5-pro", requiresApiKey: true },
      "google-gemini-flash": { provider: google, model: "gemini-1.5-flash", requiresApiKey: true },
      "anthropic-claude-3.5-sonnet": { provider: anthropic, model: "claude-3-5-sonnet-20241022", requiresApiKey: true },
      "anthropic-claude-3-haiku": { provider: anthropic, model: "claude-3-haiku-20240307", requiresApiKey: true },
      "x-grok-beta": { provider: openai, model: "grok-beta", requiresApiKey: true } // X models use OpenAI-compatible API
    }

    const selectedModel = modelMapping[model]
    if (!selectedModel) {
      return NextResponse.json({ error: "Invalid model selected" }, { status: 400 })
    }

    // Configure provider with API key
    let configuredModel
    if (model.startsWith("openai-") || model === "x-grok-beta") {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }
      if (model === "x-grok-beta") {
        const aiProvider = openai({
          apiKey: apiKey,
          baseURL: "https://api.x.ai/v1"
        })
        configuredModel = aiProvider(selectedModel.model)
      } else {
        const aiProvider = openai({ apiKey: apiKey })
        configuredModel = aiProvider(selectedModel.model)
      }
    } else if (model.startsWith("google-")) {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }
      const aiProvider = google({ apiKey: apiKey })
      configuredModel = aiProvider(selectedModel.model)
    } else if (model.startsWith("anthropic-")) {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }
      const aiProvider = anthropic({ apiKey: apiKey })
      configuredModel = aiProvider(selectedModel.model)
    } else if (model === "perplexity-sonar") {
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }
      const aiProvider = perplexity({ apiKey: apiKey })
      configuredModel = aiProvider(selectedModel.model)
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
      model: configuredModel,
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

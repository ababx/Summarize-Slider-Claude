import { type NextRequest, NextResponse } from "next/server"
import { perplexity } from "@ai-sdk/perplexity"
import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"

export async function POST(req: NextRequest) {
  try {
    const { text, url, complexity = "standard", model, apiKey } = await req.json()
    
    console.log("API Request received:", { 
      hasText: !!text, 
      textLength: text?.length, 
      url, 
      complexity, 
      model, 
      hasApiKey: !!apiKey 
    })

    if (!text) {
      return NextResponse.json({ error: "No text provided for summarization" }, { status: 400 })
    }

    // If no model specified (original behavior), use exact original working code
    if (!model) {
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

    console.log("Model mapping lookup for:", model, "->", modelMapping[model])

    const selectedModel = modelMapping[model]
    if (!selectedModel) {
      return NextResponse.json({ error: "Invalid model selected" }, { status: 400 })
    }

    // Configure provider with API key
    let configuredModel
    try {
      if (model.startsWith("openai-") || model === "x-grok-beta") {
        console.log("Configuring OpenAI model:", selectedModel.model)
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
        console.log("OpenAI model configured successfully")
      } else if (model.startsWith("google-")) {
        console.log("Configuring Google model:", selectedModel.model)
        if (!apiKey) {
          return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
        }
        const aiProvider = google({ apiKey: apiKey })
        configuredModel = aiProvider(selectedModel.model)
        console.log("Google model configured successfully")
      } else if (model.startsWith("anthropic-")) {
        console.log("Configuring Anthropic model:", selectedModel.model)
        if (!apiKey) {
          return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
        }
        const aiProvider = anthropic({ apiKey: apiKey })
        configuredModel = aiProvider(selectedModel.model)
        console.log("Anthropic model configured successfully")
      } else if (model === "perplexity-sonar") {
        console.log("Configuring Perplexity model:", selectedModel.model)
        if (!apiKey) {
          return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
        }
        const aiProvider = perplexity({ apiKey: apiKey })
        configuredModel = aiProvider(selectedModel.model)
        console.log("Perplexity model configured successfully")
      } else {
        return NextResponse.json({ error: `Unsupported model configuration: ${model}` }, { status: 400 })
      }

      if (!configuredModel) {
        return NextResponse.json({ error: `Failed to configure model: ${model}` }, { status: 400 })
      }
    } catch (providerError) {
      console.error("Provider configuration error:", providerError)
      return NextResponse.json({ error: `Provider configuration failed for ${model}: ${providerError.message}` }, { status: 400 })
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
    console.log("Calling generateText with model:", model, "prompt length:", prompt.length)
    try {
      const result = await generateText({
        model: configuredModel,
        prompt,
        maxTokens: 1000,
      })
      console.log("Generated text successfully, length:", result.text?.length)
      
      // Return the summary
      return NextResponse.json({ summary: result.text })
    } catch (generateError) {
      console.error("Generate text error:", generateError)
      
      // Check if it's an authentication error
      if (generateError.message?.includes('401') || generateError.message?.toLowerCase().includes('unauthorized') || generateError.message?.toLowerCase().includes('invalid api key')) {
        return NextResponse.json({ error: `Invalid API key for ${model}. Please check your API key is correct and has the required permissions.` }, { status: 401 })
      }
      
      return NextResponse.json({ error: `Text generation failed for ${model}: ${generateError.message}` }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in summarize API route:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}

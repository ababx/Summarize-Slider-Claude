import { type NextRequest, NextResponse } from "next/server"
import { perplexity } from "@ai-sdk/perplexity"
import { generateText } from "ai"

// Lazy import other AI providers to avoid initialization issues
async function getOpenAI() {
  const { openai } = await import("@ai-sdk/openai")
  return openai
}

async function getGoogle() {
  const { google } = await import("@ai-sdk/google")
  return google
}

async function getAnthropic() {
  const { anthropic } = await import("@ai-sdk/anthropic")
  return anthropic
}

export async function GET() {
  return NextResponse.json({ 
    message: "Summarize API is working", 
    timestamp: new Date().toISOString(),
    supportedMethods: ["POST"],
    supportedModels: ["default", "openai-gpt-4o", "anthropic-claude-3.5-sonnet", "google-gemini-pro", "x-grok-beta", "perplexity-sonar"]
  })
}

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
      console.log("Using default Perplexity model (no model parameter)")
      try {
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

        // Use direct Perplexity API call to avoid SDK issues
        const perplexityApiKey = process.env.PERPLEXITY_API_KEY
        
        if (!perplexityApiKey) {
          throw new Error("PERPLEXITY_API_KEY environment variable is not set")
        }
        
        console.log("Using direct Perplexity API call")
        
        // Direct API call to Perplexity
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${perplexityApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 1000,
            temperature: 0.2,
            top_p: 0.9
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Perplexity API error ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        const summaryText = data.choices?.[0]?.message?.content || "No summary generated"

        // Return the summary
        return NextResponse.json({ summary: summaryText })
      } catch (defaultError) {
        console.error("Error in default Perplexity processing:", defaultError)
        return NextResponse.json({ error: `Default model failed: ${defaultError.message}` }, { status: 500 })
      }
    }

    // Model configuration mapping
    const modelMapping = {
      "perplexity-sonar": { providerName: "perplexity", model: "sonar-pro", requiresApiKey: true },
      "openai-gpt-4o": { providerName: "openai", model: "gpt-4o", requiresApiKey: true },
      "openai-gpt-4o-mini": { providerName: "openai", model: "gpt-4o-mini", requiresApiKey: true },
      "openai-gpt-3.5-turbo": { providerName: "openai", model: "gpt-3.5-turbo", requiresApiKey: true },
      "google-gemini-pro": { providerName: "google", model: "gemini-1.5-pro", requiresApiKey: true },
      "google-gemini-flash": { providerName: "google", model: "gemini-1.5-flash", requiresApiKey: true },
      "anthropic-claude-3.5-sonnet": { providerName: "anthropic", model: "claude-3-5-sonnet-20241022", requiresApiKey: true },
      "anthropic-claude-3-haiku": { providerName: "anthropic", model: "claude-3-haiku-20240307", requiresApiKey: true },
      "x-grok-beta": { providerName: "openai", model: "grok-beta", requiresApiKey: true, baseURL: "https://api.x.ai/v1" }
    }

    console.log("Model mapping lookup for:", model, "->", modelMapping[model])

    const selectedModel = modelMapping[model]
    if (!selectedModel) {
      return NextResponse.json({ error: "Invalid model selected" }, { status: 400 })
    }

    // Configure provider with API key
    let configuredModel
    try {
      console.log("Configuring model:", selectedModel.model, "for provider:", selectedModel.providerName)
      
      if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }

      switch (selectedModel.providerName) {
        case "openai":
          const openai = await getOpenAI()
          const openaiConfig = selectedModel.baseURL 
            ? { apiKey: apiKey, baseURL: selectedModel.baseURL }
            : { apiKey: apiKey }
          const openaiProvider = openai(openaiConfig)
          configuredModel = openaiProvider(selectedModel.model)
          break
          
        case "google":
          const google = await getGoogle()
          const googleProvider = google({ apiKey: apiKey })
          configuredModel = googleProvider(selectedModel.model)
          break
          
        case "anthropic":
          const anthropic = await getAnthropic()
          const anthropicProvider = anthropic({ apiKey: apiKey })
          configuredModel = anthropicProvider(selectedModel.model)
          break
          
        case "perplexity":
          const perplexityProvider = perplexity({ apiKey: apiKey })
          configuredModel = perplexityProvider(selectedModel.model)
          break
          
        default:
          return NextResponse.json({ error: `Unsupported provider: ${selectedModel.providerName}` }, { status: 400 })
      }

      if (!configuredModel) {
        return NextResponse.json({ error: `Failed to configure model: ${model}` }, { status: 400 })
      }
      
      console.log("Model configured successfully:", selectedModel.providerName)
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

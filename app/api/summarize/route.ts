import { type NextRequest, NextResponse } from "next/server"
import { perplexity } from "@ai-sdk/perplexity"
import { generateText } from "ai"
import { getPrompt } from "../../../lib/prompts.js"

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
    supportedModels: ["default", "gemini-flash-lite-2.5", "gemini-flash-2.5", "gemini-flash-2.5-user", "openai-gpt-4o", "openai-gpt-4o-mini", "openai-gpt-4-turbo", "openai-gpt-3.5-turbo", "anthropic-claude-3.5-sonnet", "anthropic-claude-3.5-haiku", "anthropic-claude-3-opus", "anthropic-claude-3-sonnet", "anthropic-claude-3-haiku", "google-gemini-2.5-pro", "google-gemini-2.5-flash", "x-grok-3", "perplexity-sonar"]
  })
}

export async function POST(req: NextRequest) {
  try {
    const { text, url, complexity = "standard", model, apiKey, customPrompt, analysisType = "summary" } = await req.json()
    
    console.log("API Request received:", { 
      hasText: !!text, 
      textLength: text?.length, 
      url, 
      complexity, 
      model, 
      hasApiKey: !!apiKey,
      hasCustomPrompt: !!customPrompt,
      analysisType
    })

    if (!text) {
      return NextResponse.json({ error: "No text provided for summarization" }, { status: 400 })
    }

    // Model is always provided by the extension now (gemini-flash-lite-2.5 is the default)
    if (!model) {
      return NextResponse.json({ error: "No model specified" }, { status: 400 })
    }

    // Model configuration mapping
    const modelMapping = {
      "gemini-flash-lite-2.5": { providerName: "google", model: "gemini-2.5-flash-lite", requiresApiKey: false, useSystemKey: true },
      "gemini-flash-2.5": { providerName: "google", model: "gemini-2.5-flash", requiresApiKey: false, useSystemKey: true },
      "gemini-flash-lite-2.5-user": { providerName: "google", model: "gemini-2.5-flash-lite", requiresApiKey: true, useSystemKey: false },
      "gemini-flash-2.5-user": { providerName: "google", model: "gemini-2.5-flash", requiresApiKey: true, useSystemKey: false },
      "google-gemini-2.5-flash-lite": { providerName: "google", model: "gemini-2.5-flash-lite", requiresApiKey: true, useSystemKey: false },
      "google-gemini-2.5-flash": { providerName: "google", model: "gemini-2.5-flash", requiresApiKey: true, useSystemKey: false },
      "perplexity-sonar": { providerName: "perplexity", model: "sonar-pro", requiresApiKey: true },
      "openai-gpt-4o": { providerName: "openai", model: "gpt-4o", requiresApiKey: true },
      "openai-gpt-4o-mini": { providerName: "openai", model: "gpt-4o-mini", requiresApiKey: true },
      "openai-gpt-4.1": { providerName: "openai", model: "gpt-4.1", requiresApiKey: true },
      "openai-gpt-4.1-mini": { providerName: "openai", model: "gpt-4.1-mini", requiresApiKey: true },
      "openai-gpt-4.1-nano": { providerName: "openai", model: "gpt-4.1-nano", requiresApiKey: true },
      "openai-o3-mini": { providerName: "openai", model: "o3-mini", requiresApiKey: true },
      "openai-o1-mini": { providerName: "openai", model: "o1-mini", requiresApiKey: true },
      "google-gemini-2.5-pro": { providerName: "google", model: "gemini-1.5-pro", requiresApiKey: true },
      "anthropic-claude-opus-4": { providerName: "anthropic", model: "claude-3-opus-20240229", requiresApiKey: true },
      "anthropic-claude-sonnet-4": { providerName: "anthropic", model: "claude-3-5-sonnet-20241022", requiresApiKey: true },
      "anthropic-claude-3.5-haiku": { providerName: "anthropic", model: "claude-3-5-haiku-20241022", requiresApiKey: true },
      "x-grok-3": { providerName: "xai", model: "grok-2-latest", requiresApiKey: true, baseURL: "https://api.x.ai/v1" }
    }

    console.log("Model mapping lookup for:", model, "->", modelMapping[model])

    const selectedModel = modelMapping[model]
    if (!selectedModel) {
      return NextResponse.json({ error: "Invalid model selected" }, { status: 400 })
    }

    // Create a prompt based on the analysis type, complexity level, or use custom prompt
    let prompt = ""
    if (customPrompt) {
      // Use custom prompt and replace {url} placeholder
      prompt = customPrompt.replace('{url}', url) + `\n\n${text}`
    } else {
      // Use centralized prompts
      if (analysisType === "perspectives") {
        // Use perspectives prompt
        let basePrompt = getPrompt("perspectives", url);
        prompt = `${basePrompt}\n\n${text}`
      } else {
        // Use complexity-based prompts for regular summaries
        const complexityLevel = complexity === "phd" ? "expert" : complexity;
        let basePrompt = getPrompt(complexityLevel, url);
        prompt = `${basePrompt}\n\n${text}`
      }
    }

    // Set generous max tokens based on analysis type and complexity to prevent cutoffs
    const getMaxTokens = (analysisType: string, complexity: string) => {
      if (analysisType === "perspectives") {
        return 3000   // Generous tokens for 3 perspectives
      }
      
      switch (complexity) {
        case "eli5":
          return 1200   // Short but complete summaries
        case "standard":
          return 2500   // Comprehensive bullet-point summaries
        case "phd":
          return 4000   // Detailed analysis without cutoffs
        default:
          return 2500   // Default to standard
      }
    }

    const maxTokens = getMaxTokens(analysisType, complexity)
    console.log("Max tokens for", analysisType === "perspectives" ? "perspectives" : `${complexity} complexity`, ":", maxTokens)

    // Use direct API calls for all providers to avoid SDK issues
    try {
      console.log("Using direct API call for:", selectedModel.model, "provider:", selectedModel.providerName)
      
      // Handle system key vs user key
      let effectiveApiKey = apiKey
      if (selectedModel.useSystemKey) {
        // Use system environment variable for Gemini Flash
        effectiveApiKey = process.env.GOOGLE_API_KEY
        console.log("System key check - GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY)
        console.log("System key length:", effectiveApiKey?.length)
        if (!effectiveApiKey) {
          return NextResponse.json({ error: "System API key not configured" }, { status: 500 })
        }
      } else if (!apiKey) {
        return NextResponse.json({ error: "API key required for this model" }, { status: 400 })
      }

      let apiResponse
      
      switch (selectedModel.providerName) {
        case "openai":
          const openaiBaseURL = selectedModel.baseURL || "https://api.openai.com/v1"
          apiResponse = await fetch(`${openaiBaseURL}/chat/completions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${effectiveApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: selectedModel.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: maxTokens,
              temperature: 0.2
            })
          })
          break
          
        case "google":
          console.log("Google API call with model:", selectedModel.model, "API key length:", effectiveApiKey?.length)
          apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.model}:generateContent?key=${effectiveApiKey}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 }
            })
          })
          break
          
        case "anthropic":
          console.log("Anthropic API call with model:", selectedModel.model, "API key length:", effectiveApiKey?.length)
          console.log("Anthropic API key prefix:", effectiveApiKey?.substring(0, 10))
          console.log("Anthropic request body:", JSON.stringify({
            model: selectedModel.model,
            max_tokens: maxTokens,
            messages: [{ role: "user", content: prompt }]
          }))
          apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": effectiveApiKey,
              "Content-Type": "application/json",
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
              model: selectedModel.model,
              max_tokens: maxTokens,
              messages: [{ role: "user", content: prompt }]
            })
          })
          break
          
        case "perplexity":
          console.log("Perplexity API call with model:", selectedModel.model, "API key length:", effectiveApiKey?.length)
          apiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${effectiveApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: selectedModel.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: maxTokens,
              temperature: 0.2
            })
          })
          break
          
        case "xai":
          console.log("XAI API call with model:", selectedModel.model, "API key length:", effectiveApiKey?.length, "baseURL:", selectedModel.baseURL)
          apiResponse = await fetch(`${selectedModel.baseURL}/chat/completions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${effectiveApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: selectedModel.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: maxTokens,
              temperature: 0.2,
              stream: false
            })
          })
          break
          
        default:
          return NextResponse.json({ error: `Unsupported provider: ${selectedModel.providerName}` }, { status: 400 })
      }

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text()
        console.error(`${selectedModel.providerName} API error ${apiResponse.status}:`, errorText)
        throw new Error(`${selectedModel.providerName} API error ${apiResponse.status}: ${errorText}`)
      }

      const data = await apiResponse.json()
      let summaryText = "No summary generated. Try again."
      
      // Extract text based on provider response format
      switch (selectedModel.providerName) {
        case "openai":
        case "perplexity":
        case "xai":
          summaryText = data.choices?.[0]?.message?.content || summaryText
          break
        case "google":
          summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text || summaryText
          break
        case "anthropic":
          summaryText = data.content?.[0]?.text || summaryText
          break
      }
      
      console.log("API call successful for:", selectedModel.providerName)
      return NextResponse.json({ summary: summaryText })
      
    } catch (providerError) {
      console.error("Provider API error:", providerError)
      return NextResponse.json({ error: `API call failed for ${model}: ${providerError.message}` }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in summarize API route:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}

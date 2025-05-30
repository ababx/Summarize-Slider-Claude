import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { message, conversation, pageContent, model, apiKey } = await req.json()
    
    console.log("Chat API Request received:", { 
      hasMessage: !!message, 
      messageLength: message?.length,
      conversationLength: conversation?.length || 0,
      hasPageContent: !!pageContent,
      pageContentLength: pageContent?.length,
      model, 
      hasApiKey: !!apiKey
    })

    if (!message || !pageContent || !apiKey) {
      return NextResponse.json({ error: "Missing required fields: message, pageContent, and apiKey" }, { status: 400 })
    }

    // Model configuration mapping (same as summarize)
    const modelMapping = {
      "gemini-flash-2.5-user": { providerName: "google", model: "gemini-2.5-flash-preview-05-20", requiresApiKey: true },
      "google-gemini-2.5-flash": { providerName: "google", model: "gemini-2.5-flash-preview-05-20", requiresApiKey: true },
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

    const selectedModel = modelMapping[model]
    if (!selectedModel) {
      return NextResponse.json({ error: "Invalid model selected for chat" }, { status: 400 })
    }

    // Build the conversation context
    const systemPrompt = `You are a helpful assistant that can answer questions about the following webpage content. Be conversational and helpful.

Page Content:
${pageContent}

Please answer the user's questions based on this content. If the question is not related to the content, politely redirect them to ask about the page content.`

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt }
    ]
    
    // Add conversation history
    if (conversation && conversation.length > 0) {
      messages.push(...conversation)
    }
    
    // Add current message
    messages.push({ role: "user", content: message })

    const maxTokens = 1000 // Shorter responses for chat

    // Make API call based on provider
    let apiResponse
    
    switch (selectedModel.providerName) {
      case "openai":
        const openaiBaseURL = selectedModel.baseURL || "https://api.openai.com/v1"
        apiResponse = await fetch(`${openaiBaseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel.model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: 0.7
          })
        })
        break
        
      case "google":
        // Convert messages to Google format
        const googleMessages = messages.filter(m => m.role !== "system").map(m => ({
          parts: [{ text: m.content }]
        }))
        
        // Add system prompt to the first user message
        if (googleMessages.length > 0) {
          googleMessages[0].parts[0].text = systemPrompt + "\n\nUser: " + googleMessages[0].parts[0].text
        }
        
        apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel.model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: googleMessages,
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
          })
        })
        break
        
      case "anthropic":
        apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: selectedModel.model,
            max_tokens: maxTokens,
            messages: messages.filter(m => m.role !== "system"),
            system: systemPrompt
          })
        })
        break
        
      case "perplexity":
        apiResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel.model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: 0.7
          })
        })
        break
        
      case "xai":
        apiResponse = await fetch(`${selectedModel.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel.model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: 0.7,
            stream: false
          })
        })
        break
        
      default:
        return NextResponse.json({ error: `Unsupported provider for chat: ${selectedModel.providerName}` }, { status: 400 })
    }

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error(`${selectedModel.providerName} chat API error ${apiResponse.status}:`, errorText)
      throw new Error(`${selectedModel.providerName} chat API error ${apiResponse.status}: ${errorText}`)
    }

    const data = await apiResponse.json()
    let responseText = "Sorry, I couldn't generate a response."
    
    // Extract text based on provider response format
    switch (selectedModel.providerName) {
      case "openai":
      case "perplexity":
      case "xai":
        responseText = data.choices?.[0]?.message?.content || responseText
        break
      case "google":
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || responseText
        break
      case "anthropic":
        responseText = data.content?.[0]?.text || responseText
        break
    }
    
    console.log("Chat API call successful for:", selectedModel.providerName)
    return NextResponse.json({ response: responseText })
    
  } catch (error) {
    console.error("Error in chat API route:", error)
    return NextResponse.json({ error: "Failed to generate chat response" }, { status: 500 })
  }
}
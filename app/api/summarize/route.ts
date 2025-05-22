import { type NextRequest, NextResponse } from "next/server"
import { perplexity } from "@ai-sdk/perplexity"
import { generateText } from "ai"

export async function POST(req: NextRequest) {
  try {
    const { text, url, complexity = "standard" } = await req.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided for summarization" }, { status: 400 })
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

    // Use the Perplexity Sonar API to generate a summary
    const result = await generateText({
      model: perplexity("sonar-pro"),
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

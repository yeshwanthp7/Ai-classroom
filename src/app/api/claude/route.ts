import { type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { system, message } = await request.json()

    if (!message) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    // If no API key, fall back to a generated response
    if (!apiKey) {
      console.warn("ANTHROPIC_API_KEY not set — using local fallback")
      const fallbackText = generateFallbackResponse(message)
      return Response.json({
        content: [{ type: "text", text: fallbackText }],
        fallback: true,
      })
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system:
          system ||
          "You are Professor AI, an engaging teacher. Explain topics in 4-5 sentences. Be clear, use examples, speak naturally.",
        messages: [{ role: "user", content: message }],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("Anthropic API error:", response.status, errorBody)
      // Fall back gracefully
      const fallbackText = generateFallbackResponse(message)
      return Response.json({
        content: [{ type: "text", text: fallbackText }],
        fallback: true,
      })
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    console.error("Claude API route error:", error)
    const fallbackText =
      "Let me explain this concept. In science and engineering, understanding fundamental principles helps us build upon existing knowledge. Each topic connects to the next, forming a comprehensive framework for deeper learning."
    return Response.json({
      content: [{ type: "text", text: fallbackText }],
      fallback: true,
    })
  }
}

function generateFallbackResponse(message: string): string {
  const topic = message.replace(/^teach this topic:\s*/i, "").trim()
  const lower = topic.toLowerCase()

  const responses: Record<string, string> = {
    thermodynamics:
      "Thermodynamics is the branch of physics that deals with the relationships between heat and other forms of energy. Think of it like a rulebook for how energy moves and transforms — when you boil water, the heat energy converts to kinetic energy in the steam. The four laws of thermodynamics govern everything from car engines to biological processes. For example, the first law tells us energy cannot be created or destroyed, only transferred. This is why a perpetual motion machine is impossible — you always lose some energy to heat.",
    "carnot cycle":
      "The Carnot cycle is a theoretical thermodynamic cycle that sets the absolute maximum efficiency for any heat engine. Imagine two reservoirs — one hot, one cold — with an engine between them extracting work. Nicolas Carnot showed in 1824 that no real engine can ever be more efficient than this ideal cycle. The efficiency depends only on the temperature difference between the hot and cold reservoirs. For example, a power plant with steam at 500°C and cooling water at 25°C has a theoretical maximum efficiency of about 62%.",
    entropy:
      "Entropy is a measure of disorder or randomness in a system, and it's one of the most fascinating concepts in physics. Think of a deck of cards — there's only one way to arrange them in perfect order, but millions of ways to shuffle them randomly. The Second Law of Thermodynamics tells us that entropy in an isolated system always increases over time. This is why ice melts in warm water but warm water never spontaneously freezes — the disordered state is overwhelmingly more probable. Entropy explains the arrow of time itself.",
    "absolute zero":
      "Absolute zero is the lowest possible temperature, defined as zero Kelvin or minus 273.15 degrees Celsius. At this temperature, particles would have minimal vibrational motion — essentially the lowest energy state quantum mechanics allows. Scientists have gotten incredibly close, cooling atoms to billionths of a degree above absolute zero. However, the Third Law of Thermodynamics tells us we can never actually reach it — each step of cooling gets exponentially harder. It's like trying to reach the horizon — you can always get closer, but never arrive.",
  }

  for (const [key, value] of Object.entries(responses)) {
    if (lower.includes(key)) return value
  }

  return `Let's explore ${topic}. This is a fundamental concept that builds upon the principles we've discussed earlier. Understanding it requires connecting theory with practical examples from the real world. Pay attention to how each element relates to the broader framework we're building. The key insight here is how these principles apply across multiple domains of science and engineering.`
}

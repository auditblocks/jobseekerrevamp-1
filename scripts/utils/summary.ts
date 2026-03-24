const SUMMARY_MODEL = "openai/gpt-4o-mini";

export async function generateAISummary(fullText: string, fallback: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const maxLen = 220;

  if (!apiKey || !fullText.trim()) {
    return normalizeSummary(fallback, maxLen);
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Summarize Indian government job notifications in one concise sentence for SEO cards. Keep facts only. Max 200 characters.",
          },
          {
            role: "user",
            content: fullText.slice(0, 5000),
          },
        ],
      }),
    });

    if (!response.ok) {
      return normalizeSummary(fallback, maxLen);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const summary = data.choices?.[0]?.message?.content || fallback;
    return normalizeSummary(summary, maxLen);
  } catch {
    return normalizeSummary(fallback, maxLen);
  }
}

function normalizeSummary(input: string, maxLen: number): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLen) return compact;
  return `${compact.slice(0, maxLen - 1)}…`;
}

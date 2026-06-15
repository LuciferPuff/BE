export async function runClaudeAnalyse(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Saknar ANTHROPIC_API_KEY");
  }

  const startedAt = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const elapsedMs = Date.now() - startedAt;

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(
      `Anthropic ${res.status}: ${rawText.slice(0, 600)}`,
    );
  }

  const data = JSON.parse(rawText) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  // TEMP-MÄTNING (BYG): ta bort efter att kall svarstid + tokens är uppmätta.
  console.log(
    "[analyse][measure]",
    JSON.stringify({
      elapsedMs,
      inputTokens: data.usage?.input_tokens ?? null,
      outputTokens: data.usage?.output_tokens ?? null,
    }),
  );
  const block = data.content?.[0];
  const text =
    block?.type === "text" && typeof block.text === "string" ? block.text : "";
  if (text.trim() === "") {
    throw new Error("Tomt svar från Claude");
  }
  return text;
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function isAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const PROMPT = `You are helping someone understand how a document was edited.
Compare the OLD version to the NEW version and summarise what changed in 2-4 short
bullet points. Focus on meaning — added, removed, or reworded ideas — not formatting.
If nothing of substance changed, say exactly that in one line. Reply with plain text bullets only.`;

/** Ask Gemini to summarise the difference between two document snapshots. */
export async function summarizeChanges(oldText: string, newText: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI is not configured");

  const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PROMPT}\n\nOLD:\n${oldText}\n\nNEW:\n${newText}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned no summary");
  return text;
}

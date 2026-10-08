import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAiEnabled } from "@/lib/ai/gemini";
import { streamTask, workspaceAskMessages } from "@/lib/ai/tasks";
import { ndjsonStream } from "@/lib/ai/stream-response";
import { retrieveChunks } from "@/lib/search/search";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { badRequest, readJson } from "@/lib/security/document-route";
import { workspaceAskSchema } from "@/lib/validation/ai";

const NOT_FOUND = "I couldn't find that in your documents.";

/**
 * "Ask your workspace": retrieval-augmented answers across every document the
 * caller can access. Only passages from those documents are retrieved (the
 * permission join in `retrieveChunks`), so the model can never see — or leak —
 * text from someone else's document.
 *
 * Streams NDJSON: first the numbered sources, then the answer, which cites
 * them as [n].
 */
export async function POST(request: Request) {
  const limited = await checkRateLimit(request, "ai-ask-workspace", 10, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 2_048);
  if (tooLarge) return tooLarge;

  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: "AI features aren't configured on this deployment." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = workspaceAskSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);
  const question = parsed.data.question;

  return ndjsonStream(request, async (send, signal) => {
    const hits = await retrieveChunks(userId, question, 8);

    if (hits.length === 0) {
      send({ type: "sources", sources: [] });
      send({ type: "text", text: NOT_FOUND });
      return;
    }

    const sources = hits.map((hit, index) => ({
      n: index + 1,
      documentId: hit.documentId,
      title: hit.title,
      content: hit.content,
    }));
    send({
      type: "sources",
      sources: sources.map(({ n, documentId, title }) => ({ n, documentId, title })),
    });

    for await (const chunk of streamTask(
      "workspace-ask",
      workspaceAskMessages(question, sources),
      signal,
    )) {
      send({ type: "text", text: chunk });
    }
  });
}

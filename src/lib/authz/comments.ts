import { Prisma } from "@/generated/prisma";
import { withUser, type TxClient } from "@/lib/db";
import { recordActivity } from "@/lib/activity/record";

/**
 * Comment threads and replies.
 *
 * Authorisation (who may comment, resolve, delete) is decided by the route via
 * the capability matrix; this module enforces *consistency*: a thread id must
 * belong to the document in the URL, and mentions are filtered to people who
 * actually have access — otherwise a crafted request could notify arbitrary
 * users about a document they can't see.
 */

export type CommentView = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  mentions: string[];
  createdAt: string;
};

export type ThreadView = {
  id: string;
  quote: string;
  authorId: string;
  authorName: string;
  resolved: boolean;
  resolvedByName: string | null;
  createdAt: string;
  comments: CommentView[];
};

const displayName = (user: { name: string | null; email: string }) =>
  user.name ?? user.email.split("@")[0] ?? "Someone";

export async function listThreads(userId: string, documentId: string): Promise<ThreadView[]> {
  return withUser(userId, async (tx) => {
    const threads = await tx.commentThread.findMany({
      where: { documentId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { name: true, email: true } },
        resolvedBy: { select: { name: true, email: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true, email: true } } },
        },
      },
    });

    return threads.map((thread) => ({
      id: thread.id,
      quote: thread.quote,
      authorId: thread.authorId,
      authorName: displayName(thread.author),
      resolved: Boolean(thread.resolvedAt),
      resolvedByName: thread.resolvedBy ? displayName(thread.resolvedBy) : null,
      createdAt: thread.createdAt.toISOString(),
      comments: thread.comments.map((comment) => ({
        id: comment.id,
        authorId: comment.authorId,
        authorName: displayName(comment.author),
        body: comment.body,
        mentions: comment.mentions,
        createdAt: comment.createdAt.toISOString(),
      })),
    }));
  });
}

/** Keeps only mentions of other people who can access the document. */
async function validMentions(
  tx: TxClient,
  documentId: string,
  actorId: string,
  mentions: string[],
): Promise<string[]> {
  const unique = [...new Set(mentions)].filter((id) => id !== actorId);
  if (unique.length === 0) return [];
  const members = await tx.documentPermission.findMany({
    where: { documentId, userId: { in: unique } },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

async function notifyMentions(
  tx: TxClient,
  input: { documentId: string; actorId: string; threadId: string; body: string; userIds: string[] },
) {
  if (input.userIds.length === 0) return;
  const preview = input.body.length > 140 ? `${input.body.slice(0, 139)}…` : input.body;
  await tx.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      actorId: input.actorId,
      documentId: input.documentId,
      threadId: input.threadId,
      type: "mention",
      preview,
    })),
  });
}

type CreateThreadResult = { ok: true } | { ok: false; reason: "duplicate" };

export async function createThread(input: {
  actorId: string;
  documentId: string;
  threadId: string;
  quote: string;
  body: string;
  mentions: string[];
}): Promise<CreateThreadResult> {
  try {
    await withUser(input.actorId, async (tx) => {
      const mentions = await validMentions(tx, input.documentId, input.actorId, input.mentions);

      await tx.commentThread.create({
        data: {
          id: input.threadId,
          documentId: input.documentId,
          authorId: input.actorId,
          quote: input.quote,
          comments: {
            create: { authorId: input.actorId, body: input.body, mentions },
          },
        },
      });

      await recordActivity(tx, {
        documentId: input.documentId,
        actorId: input.actorId,
        type: "comment.created",
        meta: { threadId: input.threadId, quote: input.quote.slice(0, 120) },
      });

      await notifyMentions(tx, {
        documentId: input.documentId,
        actorId: input.actorId,
        threadId: input.threadId,
        body: input.body,
        userIds: mentions,
      });
    });
    return { ok: true };
  } catch (error) {
    // The client minted the id; a collision means the same request arrived
    // twice (e.g. a double click), which is harmless.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, reason: "duplicate" };
    }
    throw error;
  }
}

type ThreadMutation = { ok: true } | { ok: false; reason: "not_found" | "forbidden" };

export async function addReply(input: {
  actorId: string;
  documentId: string;
  threadId: string;
  body: string;
  mentions: string[];
}): Promise<{ ok: true; comment: CommentView } | { ok: false; reason: "not_found" }> {
  return withUser(input.actorId, async (tx) => {
    const thread = await tx.commentThread.findFirst({
      where: { id: input.threadId, documentId: input.documentId },
      select: { id: true },
    });
    if (!thread) return { ok: false, reason: "not_found" };

    const mentions = await validMentions(tx, input.documentId, input.actorId, input.mentions);
    const comment = await tx.comment.create({
      data: { threadId: input.threadId, authorId: input.actorId, body: input.body, mentions },
      include: { author: { select: { name: true, email: true } } },
    });

    await notifyMentions(tx, {
      documentId: input.documentId,
      actorId: input.actorId,
      threadId: input.threadId,
      body: input.body,
      userIds: mentions,
    });

    return {
      ok: true,
      comment: {
        id: comment.id,
        authorId: comment.authorId,
        authorName: displayName(comment.author),
        body: comment.body,
        mentions: comment.mentions,
        createdAt: comment.createdAt.toISOString(),
      },
    };
  });
}

export async function setThreadResolved(input: {
  actorId: string;
  documentId: string;
  threadId: string;
  resolved: boolean;
}): Promise<ThreadMutation> {
  return withUser(input.actorId, async (tx) => {
    const thread = await tx.commentThread.findFirst({
      where: { id: input.threadId, documentId: input.documentId },
      select: { resolvedAt: true, quote: true },
    });
    if (!thread) return { ok: false, reason: "not_found" };
    // Already in the requested state: nothing to change or log.
    if (Boolean(thread.resolvedAt) === input.resolved) return { ok: true };

    await tx.commentThread.update({
      where: { id: input.threadId },
      data: input.resolved
        ? { resolvedAt: new Date(), resolvedById: input.actorId }
        : { resolvedAt: null, resolvedById: null },
    });
    await recordActivity(tx, {
      documentId: input.documentId,
      actorId: input.actorId,
      type: input.resolved ? "comment.resolved" : "comment.reopened",
      meta: { threadId: input.threadId, quote: thread.quote.slice(0, 120) },
    });
    return { ok: true };
  });
}

/**
 * Deletes a thread. Allowed for its author or the document owner — the owner
 * can moderate their document, but editors can't delete each other's threads.
 */
export async function deleteThread(input: {
  actorId: string;
  documentId: string;
  threadId: string;
  isOwner: boolean;
}): Promise<ThreadMutation> {
  return withUser(input.actorId, async (tx) => {
    const thread = await tx.commentThread.findFirst({
      where: { id: input.threadId, documentId: input.documentId },
      select: { authorId: true },
    });
    if (!thread) return { ok: false, reason: "not_found" };
    if (thread.authorId !== input.actorId && !input.isOwner) {
      return { ok: false, reason: "forbidden" };
    }
    await tx.commentThread.delete({ where: { id: input.threadId } });
    return { ok: true };
  });
}

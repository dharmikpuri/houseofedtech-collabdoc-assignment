import type { Prisma } from "@/generated/prisma";
import { withUser } from "@/lib/db";

export type VersionSummary = {
  id: string;
  label: string;
  authorName: string;
  createdAt: Date;
};

export async function listVersions(userId: string, documentId: string): Promise<VersionSummary[]> {
  return withUser(userId, async (tx) => {
    const versions = await tx.version.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true, email: true } } },
    });

    return versions.map((version) => ({
      id: version.id,
      label: version.label,
      authorName: version.author.name ?? version.author.email,
      createdAt: version.createdAt,
    }));
  });
}

export async function getVersionContent(userId: string, documentId: string, versionId: string) {
  return withUser(userId, (tx) =>
    tx.version.findFirst({
      where: { id: versionId, documentId },
      select: { content: true },
    }),
  );
}

export async function createVersion(input: {
  documentId: string;
  authorId: string;
  label: string;
  content: Prisma.InputJsonValue;
}) {
  return withUser(input.authorId, (tx) =>
    tx.version.create({
      data: {
        documentId: input.documentId,
        authorId: input.authorId,
        label: input.label,
        content: input.content,
      },
      select: { id: true },
    }),
  );
}

/**
 * Seeds a demo workspace for reviewers.
 *
 *   DEMO_PASSWORD="…" node scripts/seed-demo.mjs          # create if missing
 *   DEMO_PASSWORD="…" node scripts/seed-demo.mjs --reset  # rebuild demo data
 *
 * Creates two users (the demo account and a teammate), three documents with
 * real content, tags, a folder, a saved version and a share — enough to show
 * collaboration, history and search the moment someone signs in.
 *
 * Content is written as Yjs state (the same structure the editor produces), so
 * documents open with their text already in place. Only the demo users' data
 * is ever touched; `--reset` deletes and recreates just their documents.
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import * as Y from "yjs";

// Node's built-in .env loader (no dotenv dependency). Real environment
// variables, e.g. in CI, take precedence and a missing file is fine.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file — rely on the environment.
}
const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma");

const DEMO_EMAIL = (process.env.DEMO_EMAIL ?? "demo@collabdoc.dev").toLowerCase();
const TEAMMATE_EMAIL = (process.env.DEMO_TEAMMATE_EMAIL ?? "teammate@collabdoc.dev").toLowerCase();
const PASSWORD = process.env.DEMO_PASSWORD;
const RESET = process.argv.includes("--reset");

if (!PASSWORD || PASSWORD.length < 8 || !/[A-Za-z]/.test(PASSWORD) || !/\d/.test(PASSWORD)) {
  console.error("Set DEMO_PASSWORD (8+ characters, with a letter and a number) before seeding.");
  process.exit(1);
}

// ── Content ──────────────────────────────────────────────────────────────────
// A tiny block model mapped to TipTap/ProseMirror node names.

const h = (level, text) => ({ type: "heading", level, text });
const p = (text) => ({ type: "paragraph", text });
const ul = (...items) => ({ type: "bulletList", items });
const todo = (...items) => ({ type: "taskList", items });

const DOCUMENTS = [
  {
    title: "Q4 Launch Plan",
    tags: ["launch", "planning"],
    folder: "Launch",
    shareWithTeammate: "EDITOR",
    blocks: [
      h(1, "Q4 Launch Plan"),
      p(
        "We are launching the offline-first editor to all workspaces on November 18. The goal is zero lost edits during flaky connectivity.",
      ),
      h(2, "Milestones"),
      ul(
        "Beta to 50 design partners by October 20",
        "Performance budget: first edit in under 300 ms on a mid-range laptop",
        "Public launch post and changelog on November 18",
      ),
      h(2, "Action items"),
      todo(
        [false, "Priya ships the offline sync queue by Friday"],
        [false, "Marcus drafts the launch announcement"],
        [true, "Security review of invite links"],
      ),
      h(2, "Risks"),
      p(
        "The main risk is large documents on older phones. We cap document size and warn early, and the team agreed to split any document over 1 MB.",
      ),
    ],
  },
  {
    title: "Offline Sync — Design Notes",
    tags: ["engineering", "sync"],
    folder: "Launch",
    shareWithTeammate: "VIEWER",
    blocks: [
      h(1, "Offline Sync — Design Notes"),
      p(
        "Document text is a Yjs CRDT, so concurrent edits merge deterministically without a central lock. REST actions such as saving a version go through a durable outbox in IndexedDB.",
      ),
      h(2, "Decisions"),
      ul(
        "Sharing and deletion are online-only: replaying permission changes later is surprising",
        "Every queued action carries an idempotency key",
        "Restore always backs up the current draft on the server first",
      ),
      p("Open question: should we compact version history older than a year?"),
    ],
  },
  {
    title: "Weekly Team Sync — Notes",
    tags: ["meeting"],
    folder: null,
    shareWithTeammate: null,
    blocks: [
      h(1, "Weekly Team Sync"),
      p("Attendees: Demo, Priya, Marcus."),
      h(2, "Updates"),
      ul("Search & Ask is live behind the AI flag", "Comment mentions now send notifications"),
      h(2, "Next week"),
      todo([false, "Review onboarding checklist"], [false, "Plan the retro"]),
    ],
  },
];

/** Builds Yjs state in the shape y-prosemirror / TipTap Collaboration use. */
function toYjsState(blocks) {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("default");

  const text = (value) => {
    const node = new Y.XmlText();
    node.insert(0, value);
    return node;
  };
  const element = (name, children = [], attrs = {}) => {
    const node = new Y.XmlElement(name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    node.insert(0, children);
    return node;
  };
  const paragraph = (value) => element("paragraph", [text(value)]);

  doc.transact(() => {
    fragment.insert(
      0,
      blocks.map((block) => {
        switch (block.type) {
          case "heading":
            return element("heading", [text(block.text)], { level: block.level });
          case "bulletList":
            return element(
              "bulletList",
              block.items.map((item) => element("listItem", [paragraph(item)])),
            );
          case "taskList":
            return element(
              "taskList",
              block.items.map(([checked, item]) =>
                element("taskItem", [paragraph(item)], { checked }),
              ),
            );
          default:
            return paragraph(block.text);
        }
      }),
    );
  });

  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return Buffer.from(state);
}

/** The same content as TipTap JSON, for the saved version snapshot. */
function toTipTapJson(blocks) {
  const paragraph = (value) => ({ type: "paragraph", content: [{ type: "text", text: value }] });
  return {
    type: "doc",
    content: blocks.map((block) => {
      switch (block.type) {
        case "heading":
          return {
            type: "heading",
            attrs: { level: block.level },
            content: [{ type: "text", text: block.text }],
          };
        case "bulletList":
          return {
            type: "bulletList",
            content: block.items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
          };
        case "taskList":
          return {
            type: "taskList",
            content: block.items.map(([checked, item]) => ({
              type: "taskItem",
              attrs: { checked },
              content: [paragraph(item)],
            })),
          };
        default:
          return paragraph(block.text);
      }
    }),
  };
}

// ── Seed ─────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function upsertUser(email, name) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash },
    update: { passwordHash },
    select: { id: true },
  });
}

async function main() {
  const demo = await upsertUser(DEMO_EMAIL, "Demo User");
  const teammate = await upsertUser(TEAMMATE_EMAIL, "Priya (teammate)");

  const existing = await prisma.document.count({ where: { ownerId: demo.id, deletedAt: null } });
  if (existing > 0 && !RESET) {
    console.log(
      `Demo workspace already exists (${existing} documents). Use --reset to rebuild it.`,
    );
    return;
  }
  if (RESET) {
    // Only the demo account's own documents and folders; cascades clean the rest.
    await prisma.document.deleteMany({ where: { ownerId: demo.id } });
    await prisma.folder.deleteMany({ where: { userId: demo.id } });
  }

  const folder = await prisma.folder.create({
    data: { userId: demo.id, name: "Launch" },
    select: { id: true },
  });

  for (const spec of DOCUMENTS) {
    const document = await prisma.document.create({
      data: {
        title: spec.title,
        ownerId: demo.id,
        permissions: { create: { userId: demo.id, role: "OWNER" } },
        state: { create: { state: toYjsState(spec.blocks) } },
        tags: { create: spec.tags.map((tag) => ({ tag })) },
        versions: {
          create: {
            authorId: demo.id,
            label: "First draft",
            content: toTipTapJson(spec.blocks),
            clientMutationId: randomUUID(),
          },
        },
        activities: { create: { actorId: demo.id, type: "document.created" } },
      },
      select: { id: true },
    });

    await prisma.userDocumentMeta.create({
      data: {
        userId: demo.id,
        documentId: document.id,
        favorite: spec.title === "Q4 Launch Plan",
        folderId: spec.folder ? folder.id : null,
        lastOpenedAt: new Date(),
      },
    });

    if (spec.shareWithTeammate) {
      await prisma.documentPermission.create({
        data: { documentId: document.id, userId: teammate.id, role: spec.shareWithTeammate },
      });
      await prisma.documentActivity.create({
        data: {
          documentId: document.id,
          actorId: demo.id,
          type: "member.added",
          meta: { userId: teammate.id, name: "Priya (teammate)", role: spec.shareWithTeammate },
        },
      });
    }
  }

  console.log(
    `Seeded demo workspace: ${DOCUMENTS.length} documents for ${DEMO_EMAIL} (teammate: ${TEAMMATE_EMAIL}).`,
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

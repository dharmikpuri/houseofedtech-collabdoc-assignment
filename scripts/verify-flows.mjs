/**
 * End-to-end verification against the real Supabase database and real Gemini.
 *
 * Two transports, both authentic:
 *   - a real browser (CDP) for flows that go through Next.js server actions
 *     (sign-up, sign-in, create document), whose wire format is internal;
 *   - plain HTTP for the REST API, carrying the session cookies that browser
 *     actually obtained.
 *
 * Nothing bypasses authentication, authorization, RLS, rate limits or payload
 * caps — proving those hold is the point.
 *
 * Usage: node scripts/verify-flows.mjs
 */
import { launchBrowser, newPage } from "./lib/browser.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "VerifyPass!2026";

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const section = (title) => console.log(`\n=== ${title} ===`);
const preview = (s) => `${String(s).slice(0, 100).replace(/\s+/g, " ")}…`;

/** Performs an authenticated API call using a browser session's cookies. */
async function api(actor, path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("cookie", actor.cookies);
  return fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
}
const json = (res) => res.json().catch(() => ({}));

/**
 * Order-insensitive deep equality.
 *
 * Postgres `jsonb` normalises objects and does not preserve key order, so a
 * plain JSON.stringify comparison reports a false mismatch on an otherwise
 * perfectly intact round-trip.
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a !== "object") return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => deepEqual(a[k], b[k]));
}

/**
 * Registers and signs in a user through the real sign-up form, then captures
 * the resulting session cookies.
 */
async function createActor(port, label, email) {
  const page = await newPage(port);

  // Sign-up is rate limited to 5/min per IP. That guard is correct and must not
  // be weakened, so the harness backs off and retries instead — every actor
  // still registers through the real, throttled form.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.goto(`${BASE}/sign-up`, 2500);

    const submitted = await page.evaluate(`(() => {
      const form = document.querySelector('form');
      if (!form) return 'no-form';
      const set = (sel, value) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      };
      if (!set('#name', ${JSON.stringify(`Verify ${label}`)})) return 'no-name';
      set('#email', ${JSON.stringify(email)});
      set('#password', ${JSON.stringify(PASSWORD)});
      form.requestSubmit();
      return 'ok';
    })()`);

    if (submitted !== "ok") {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    // Wait for the redirect to /dashboard, or an inline error.
    let outcome = "";
    for (let i = 0; i < 15; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      outcome = String(
        await page.evaluate(
          "location.pathname + '|' + (document.querySelector('[role=alert]')?.textContent ?? '')",
        ),
      );
      if (outcome.startsWith("/dashboard") || outcome.includes("|")) {
        if (outcome.startsWith("/dashboard") || outcome.split("|")[1]) break;
      }
    }

    const cookies = await page.cookieHeader();
    const session = await (
      await fetch(`${BASE}/api/auth/session`, { headers: { cookie: cookies } })
    )
      .json()
      .catch(() => ({}));

    if (session?.user?.id) {
      return { label, email, page, cookies, userId: session.user.id, ok: true };
    }

    // Throttled — wait for the fixed window to roll over, then try again.
    const throttled = /Too many/i.test(outcome);
    console.log(
      `  (…) ${label}: ${throttled ? "rate limited, waiting for the window" : "retrying sign-up"}`,
    );
    await new Promise((r) => setTimeout(r, throttled ? 62_000 : 3_000));
  }

  return { label, email, page, cookies: "", ok: false };
}

async function main() {
  const stamp = Date.now();
  const browser = await launchBrowser({ port: 9333 });

  let owner, viewer, stranger;
  try {
    section("Authentication — real sign-up through the rendered form");
    owner = await createActor(browser.port, "owner", `v.owner.${stamp}@example.com`);
    check("owner signs up and holds a session", owner.ok, `userId=${owner.userId ?? "none"}`);
    viewer = await createActor(browser.port, "viewer", `v.viewer.${stamp}@example.com`);
    check("viewer signs up and holds a session", viewer.ok);
    stranger = await createActor(browser.port, "stranger", `v.stranger.${stamp}@example.com`);
    check("third user signs up and holds a session", stranger.ok);

    if (!owner?.ok) {
      console.log("\nCannot continue without an owner session.");
      return finish(browser);
    }

    section("Unauthenticated access is refused");
    const anonDash = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    check(
      "GET /dashboard redirects anonymous users",
      [301, 302, 307, 308].includes(anonDash.status),
      `status=${anonDash.status}`,
    );
    const anonApi = await fetch(`${BASE}/api/documents/anything/versions`, { redirect: "manual" });
    check(
      "versions API returns 401 when anonymous",
      anonApi.status === 401,
      `status=${anonApi.status}`,
    );
    const anonAi = await fetch(`${BASE}/api/documents/anything/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: {}, task: "summary" }),
      redirect: "manual",
    });
    check("AI API returns 401 when anonymous", anonAi.status === 401, `status=${anonAi.status}`);

    section("Dashboard against the real Supabase database");
    const dash = await api(owner, "/dashboard");
    const dashHtml = await dash.text();
    check("GET /dashboard returns 200", dash.status === 200, `status=${dash.status}`);
    check("dashboard greets the signed-in user", dashHtml.includes("Welcome back"));
    check(
      "dashboard shows the empty state for a new account",
      dashHtml.includes("Create your first document"),
    );

    section("Document creation (real server action in the browser)");
    await owner.page.goto(`${BASE}/dashboard`, 2500);
    await owner.page.evaluate(`(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => /New document/i.test(b.textContent));
      btn.click();
      return true;
    })()`);
    // The action creates the row then redirects; poll rather than guessing a
    // fixed delay, which is flaky on a cold route compile.
    let url = "/dashboard";
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      url = String(await owner.page.evaluate("location.pathname"));
      if (/\/documents\//.test(url)) break;
    }
    const documentId = url.match(/\/documents\/([a-z0-9]+)/i)?.[1];
    check("creating a document navigates to the editor", Boolean(documentId), `url=${url}`);
    if (!documentId) return finish(browser);

    section("Editor against real data");
    const docRes = await api(owner, `/documents/${documentId}`);
    const docHtml = await docRes.text();
    check(
      "GET /documents/:id returns 200 for the owner",
      docRes.status === 200,
      `status=${docRes.status}`,
    );
    check(
      "editor renders a sync state",
      /Saved locally|Synced|Connecting|Offline|Syncing/.test(docHtml),
    );
    check("editor renders the Owner badge", docHtml.includes("Owner"));

    section("Collab token — real-time authentication");
    const tokenRes = await api(owner, "/api/collab-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    const tokenBody = await json(tokenRes);
    check("owner receives a collab token", tokenRes.status === 200 && Boolean(tokenBody.token));
    if (tokenBody.token) {
      const p = JSON.parse(Buffer.from(tokenBody.token.split(".")[1], "base64url").toString());
      check("token carries OWNER role", p.role === "OWNER", `role=${p.role}`);
      check("token is scoped to this document", p.documentId === documentId);
      check("token is short-lived (<=60s)", p.exp - p.iat <= 60, `ttl=${p.exp - p.iat}s`);
    }

    section("Versions against real data");
    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Kickoff notes. Priya ships the offline sync queue by Friday. Risk: the transaction pooler drops long-running interactive transactions.",
            },
          ],
        },
      ],
    };
    const vCreate = await api(owner, `/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Verification snapshot", content }),
    });
    check("owner can create a version", vCreate.status === 201, `status=${vCreate.status}`);

    const vList = await json(await api(owner, `/api/documents/${documentId}/versions`));
    const versionId = vList.versions?.[0]?.id;
    check("version appears in the list", Boolean(versionId));
    if (versionId) {
      const vGet = await json(
        await api(owner, `/api/documents/${documentId}/versions/${versionId}`),
      );
      check("version content round-trips intact", deepEqual(vGet.content, content));
    }

    section("Sharing and role enforcement");
    const share = await api(owner, `/api/documents/${documentId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: viewer.email, role: "VIEWER" }),
    });
    check(
      "owner can share the document as VIEWER (201)",
      share.status === 201,
      `status=${share.status}`,
    );

    const viewerDoc = await api(viewer, `/documents/${documentId}`);
    const viewerHtml = await viewerDoc.text();
    check(
      "viewer can open the shared document",
      viewerDoc.status === 200,
      `status=${viewerDoc.status}`,
    );
    check("viewer sees the view-only notice", viewerHtml.includes("View-only access"));

    const viewerVersion = await api(viewer, `/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "viewer attempt", content }),
    });
    check(
      "viewer CANNOT create a version (403)",
      viewerVersion.status === 403,
      `status=${viewerVersion.status}`,
    );

    const viewerToken = await json(
      await api(viewer, "/api/collab-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      }),
    );
    if (viewerToken.token) {
      const p = JSON.parse(Buffer.from(viewerToken.token.split(".")[1], "base64url").toString());
      check(
        "viewer token carries VIEWER role (collab server enforces read-only)",
        p.role === "VIEWER",
        `role=${p.role}`,
      );
    } else {
      check("viewer receives a collab token", false);
    }

    section("Tenant isolation");
    const sDoc = await api(stranger, `/documents/${documentId}`);
    check(
      "unrelated user gets 404 on the document page",
      sDoc.status === 404,
      `status=${sDoc.status}`,
    );
    const sVersions = await api(stranger, `/api/documents/${documentId}/versions`);
    check(
      "unrelated user gets 404 from versions API",
      sVersions.status === 404,
      `status=${sVersions.status}`,
    );
    const sToken = await api(stranger, "/api/collab-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    check(
      "unrelated user cannot obtain a collab token (404)",
      sToken.status === 404,
      `status=${sToken.status}`,
    );

    section("AI read access for a Viewer (checked before the owner's burst)");
    // The rate limiter buckets per IP, and all three actors share localhost, so
    // this is asserted first — otherwise the owner's AI calls below exhaust the
    // shared budget and this would see a 429 from a correctly-working guard.
    const viewerAnalyzeEarly = await api(viewer, `/api/documents/${documentId}/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task: "summary" }),
    });
    check(
      "viewer CAN call read-only /ai/analyze (200)",
      viewerAnalyzeEarly.status === 200,
      `status=${viewerAnalyzeEarly.status}`,
    );

    section("AI flows against real Gemini");
    const analyze = await api(owner, `/api/documents/${documentId}/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task: "summary" }),
    });
    const analyzeBody = await json(analyze);
    check(
      "AI analyze → summary",
      analyze.status === 200 && Boolean(analyzeBody.result),
      `status=${analyze.status} ${analyzeBody.error ?? ""}`,
    );
    if (analyzeBody.result) console.log(`        ↳ ${preview(analyzeBody.result)}`);

    const items = await api(owner, `/api/documents/${documentId}/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task: "action-items" }),
    });
    const itemsBody = await json(items);
    check(
      "AI analyze → action items",
      items.status === 200 && Boolean(itemsBody.result),
      `status=${items.status}`,
    );
    if (itemsBody.result) console.log(`        ↳ ${preview(itemsBody.result)}`);

    const insights = await api(owner, `/api/documents/${documentId}/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task: "key-insights" }),
    });
    check("AI analyze → key insights", insights.status === 200, `status=${insights.status}`);

    const ask = await api(owner, `/api/documents/${documentId}/ai/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        question: "Who owns the offline sync queue and when is it due?",
      }),
    });
    const askBody = await json(ask);
    check(
      "AI ask → grounded answer",
      ask.status === 200 && Boolean(askBody.answer),
      `status=${ask.status} ${askBody.error ?? ""}`,
    );
    if (askBody.answer) console.log(`        ↳ ${preview(askBody.answer)}`);

    const rewrite = await api(owner, `/api/documents/${documentId}/ai/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "the pooler drops long transactions sometimes",
        mode: "improve",
      }),
    });
    const rewriteBody = await json(rewrite);
    check(
      "AI rewrite → improved text",
      rewrite.status === 200 && Boolean(rewriteBody.result),
      `status=${rewrite.status} ${rewriteBody.error ?? ""}`,
    );
    if (rewriteBody.result) console.log(`        ↳ ${preview(rewriteBody.result)}`);

    if (versionId) {
      const changed = await api(
        owner,
        `/api/documents/${documentId}/versions/${versionId}/summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentContent: content }),
        },
      );
      check("AI version-diff summary responds", changed.status === 200, `status=${changed.status}`);
    }

    section("AI authorization — /rewrite requires the edit capability");
    const viewerRewrite = await api(viewer, `/api/documents/${documentId}/ai/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "viewer must not be able to rewrite", mode: "improve" }),
    });
    check(
      "viewer CANNOT call /ai/rewrite (403)",
      viewerRewrite.status === 403,
      `status=${viewerRewrite.status}`,
    );

    const strangerAi = await api(stranger, `/api/documents/${documentId}/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task: "summary" }),
    });
    check(
      "unrelated user gets 404 from AI endpoints",
      strangerAi.status === 404,
      `status=${strangerAi.status}`,
    );

    section("Payload caps (OOM protection)");
    const huge = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(1_200_000) }] }],
    };
    const bigAi = await api(owner, `/api/documents/${documentId}/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: huge, task: "summary" }),
    });
    check("oversized AI payload rejected (413)", bigAi.status === 413, `status=${bigAi.status}`);

    const bigVersion = await api(owner, `/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "too big", content: huge }),
    });
    check(
      "oversized version payload rejected (413)",
      bigVersion.status === 413,
      `status=${bigVersion.status}`,
    );

    section("Input validation");
    const badTask = await api(owner, `/api/documents/${documentId}/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task: "not-a-real-task" }),
    });
    check("invalid AI task rejected (400)", badTask.status === 400, `status=${badTask.status}`);

    const blankQuestion = await api(owner, `/api/documents/${documentId}/ai/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, question: "   " }),
    });
    check(
      "blank AI question rejected (400)",
      blankQuestion.status === 400,
      `status=${blankQuestion.status}`,
    );

    const badMode = await api(owner, `/api/documents/${documentId}/ai/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello", mode: "destroy" }),
    });
    check(
      "invalid rewrite mode rejected (400)",
      badMode.status === 400,
      `status=${badMode.status}`,
    );

    section("Sharing authorization and revocation");
    const viewerShares = await api(viewer, `/api/documents/${documentId}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: stranger.email, role: "EDITOR" }),
    });
    check(
      "viewer CANNOT share the document (403)",
      viewerShares.status === 403,
      `status=${viewerShares.status}`,
    );

    const revoke = await api(owner, `/api/documents/${documentId}/permissions/${viewer.userId}`, {
      method: "DELETE",
    });
    check("owner can revoke the viewer's access", revoke.status === 200, `status=${revoke.status}`);

    const afterRevoke = await api(viewer, `/documents/${documentId}`);
    check(
      "revoked user immediately loses access (404)",
      afterRevoke.status === 404,
      `status=${afterRevoke.status}`,
    );

    finish(browser, { documentId });
  } catch (error) {
    console.error("\nHarness error:", error.stack ?? error.message);
    finish(browser);
  }
}

function finish(browser, context = {}) {
  try {
    browser?.close();
  } catch {
    // ignore
  }
  console.log(`\n${"=".repeat(56)}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed`);
  if (context.documentId) console.log(`(verification document: ${context.documentId})`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail ? 1 : 0);
}

main();

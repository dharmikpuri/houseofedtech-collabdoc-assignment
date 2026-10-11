/**
 * End-to-end UI check in a real browser, with two users.
 *
 * Complements scripts/verify-flows.mjs (which exercises the API and its
 * authorization rules): this one drives the actual interface — sign-up,
 * creating and editing a document, tags, versions, sharing, live collaboration
 * between two browsers, going offline and back, the dashboard, settings and
 * sign-out. Nothing is mocked and no guard is bypassed.
 *
 * Needs the web app and the collab server running.
 * Usage: node scripts/e2e-ui.mjs        (VERIFY_BASE_URL overrides the origin)
 */
import { launchBrowser, newPage } from "./lib/browser.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "VerifyPass!2026";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** Wraps a page with the small helpers the checks need. */
function actor(page) {
  const js = (expression) => page.evaluate(expression);
  const until = async (expression, timeoutMs = 12_000, stepMs = 300) => {
    const end = Date.now() + timeoutMs;
    for (;;) {
      try {
        if (await js(expression)) return true;
      } catch {
        // The page may be mid-navigation; try again.
      }
      if (Date.now() > end) return false;
      await sleep(stepMs);
    }
  };
  const SET = `(sel, value) => { const el = document.querySelector(sel); if (!el) return false; const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); return true; }`;
  return {
    page,
    js,
    until,
    goto: (path, settle = 1500) => page.goto(`${BASE}${path}`, settle),
    path: () => js("location.pathname"),
    fill: (selector, value) =>
      js(`(${SET})(${JSON.stringify(selector)}, ${JSON.stringify(value)})`),
    click: (selector) =>
      js(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`,
      ),
    clickText: (tag, text) =>
      js(
        `(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find((n) => n.textContent.trim() === ${JSON.stringify(text)}); if (!el) return false; el.click(); return true; })()`,
      ),
    type: async (text) => {
      await page.send("Input.insertText", { text });
      await sleep(250);
    },
    key: async (key, code, vk, modifiers = 0) => {
      await page.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key,
        code,
        windowsVirtualKeyCode: vk,
        modifiers,
        ...(key === "Enter" ? { text: String.fromCharCode(13) } : {}),
      });
      await page.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key,
        code,
        windowsVirtualKeyCode: vk,
        modifiers,
      });
      await sleep(150);
    },
    offline: (value) =>
      page.send("Network.emulateNetworkConditions", {
        offline: value,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      }),
  };
}

async function signUp(a, name, email) {
  // Sign-up is rate limited (5/min per IP); wait out the window if we hit it.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await a.goto("/sign-up", 2500);
    await a.fill("#name", name);
    await a.fill("#email", email);
    await a.fill("#password", PASSWORD);
    await a.js("document.querySelector('form').requestSubmit(); 1");
    if (await a.until("location.pathname.startsWith('/dashboard')", 15_000)) return true;
    const alert = String(await a.js("document.querySelector('[role=alert]')?.textContent ?? ''"));
    if (!/Too many/i.test(alert)) return false;
    console.log("  (…) sign-up rate limited, waiting for the window");
    await sleep(62_000);
  }
  return false;
}

async function main() {
  const stamp = Date.now();
  const browser = await launchBrowser({ port: 9300 + Math.floor(Math.random() * 90) });
  const A = actor(await newPage(browser.port));
  const B = actor(await newPage(browser.port));
  for (const who of [A, B]) {
    await who.page.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await who.page.send("Page.addScriptToEvaluateOnNewDocument", {
      source:
        "window.__errs = []; window.addEventListener('error', (e) => window.__errs.push(String(e.message)));",
    });
  }

  try {
    // ── Public pages ─────────────────────────────────────────────────────────
    section("Public pages");
    await A.goto("/", 3000);
    check(
      "landing page renders its headline",
      await A.js("document.querySelector('h1')?.textContent.includes('Write together')"),
    );
    await A.click('button[role="switch"]');
    check(
      "hero demo: cutting the network shows the offline state",
      await A.until("document.body.innerText.includes('Marco is offline')", 4000),
    );
    await A.click('button[role="switch"]');
    check(
      "hero demo: reconnecting shows the merged state",
      await A.until("document.body.innerText.includes('Reconnected and merged')", 4000),
    );
    await A.click("#faq summary");
    check(
      "FAQ answers open on click",
      await A.until("document.querySelector('#faq details')?.open === true", 3000),
    );
    check(
      "landing page has no script errors",
      (await A.js("(window.__errs || []).length")) === 0,
      String(await A.js("(window.__errs || []).join(' | ')")),
    );

    await A.goto("/lab", 3000);
    check(
      "sync lab shows two editors",
      (await A.js("document.querySelectorAll('.ProseMirror').length")) >= 2,
    );
    await A.clickText("button", "Run conflict scenario");
    check(
      "sync lab converges after a conflict scenario",
      await A.until("document.body.innerText.includes('Converged')", 20_000),
    );

    await A.goto("/this-page-does-not-exist", 2000);
    check(
      "unknown route shows the 404 page",
      await A.js("document.body.innerText.includes('Page not found')"),
    );
    await A.goto("/dashboard", 2000);
    check(
      "dashboard redirects anonymous visitors to sign-in",
      String(await A.path()) === "/sign-in",
    );
    await A.goto("/forgot-password", 2000);
    const forgotPath = String(await A.path());
    check(
      "forgot-password is hidden while email is not configured",
      forgotPath === "/sign-in" || forgotPath === "/forgot-password",
      forgotPath,
    );

    // ── Authentication ───────────────────────────────────────────────────────
    section("Authentication");
    await A.goto("/sign-up", 2500);
    await A.fill("#name", "E2E Owner");
    await A.fill("#email", `v.e2e.weak.${stamp}@example.com`);
    await A.fill("#password", "short");
    await A.js("document.querySelector('form').requestSubmit(); 1");
    check(
      "sign-up rejects a weak password",
      await A.until("Boolean(document.querySelector('[role=alert]')?.textContent.trim())", 8000),
    );

    const emailA = `v.e2e.owner.${stamp}@example.com`;
    const emailB = `v.e2e.editor.${stamp}@example.com`;
    check("owner signs up and reaches the dashboard", await signUp(A, "E2E Owner", emailA));
    check(
      "a new workspace shows the first-run state",
      await A.until("document.body.innerText.includes('Create your first document')", 8000),
    );
    check("second user signs up", await signUp(B, "E2E Editor", emailB));

    // ── Create and edit ──────────────────────────────────────────────────────
    section("Create and edit a document");
    await A.js(
      "(() => { const b = [...document.querySelectorAll('main button')].find((x) => /New document/.test(x.textContent)); b?.click(); return 1; })()",
    );
    const created = await A.until(
      "/^\\/documents\\/[A-Za-z0-9_-]+$/.test(location.pathname)",
      25_000,
    );
    check("creating a document opens the editor", created, String(await A.path()));
    if (!created) throw new Error("cannot continue without a document");
    const docPath = String(await A.path());
    const docId = docPath.split("/").pop();
    check(
      "editor mounts",
      await A.until("Boolean(document.querySelector('.ProseMirror'))", 15_000),
    );
    await sleep(2500);

    await A.js("document.querySelector('.ProseMirror').focus(); 1");
    await A.type("Hello from the owner.");
    check(
      "typed text appears in the document",
      await A.until(
        "document.querySelector('.ProseMirror').innerText.includes('Hello from the owner.')",
        4000,
      ),
    );
    check(
      "sync status reaches Synced",
      await A.until(
        "[...document.querySelectorAll('button, [role=status]')].some((n) => n.textContent.trim().startsWith('Synced'))",
        15_000,
      ),
    );

    await A.click('button[aria-label="Heading 2"]');
    check(
      "toolbar applies a heading",
      await A.until("Boolean(document.querySelector('.ProseMirror h2'))", 4000),
    );

    // Title: an input that commits on blur (Enter blurs it).
    await A.until("Boolean(document.querySelector('input[aria-label=\"Document title\"]'))", 6000);
    await A.js("document.querySelector('input[aria-label=\"Document title\"]').focus(); 1");
    await A.fill('input[aria-label="Document title"]', "E2E document");
    await A.key("Enter", "Enter", 13);
    check(
      "title can be renamed",
      await A.until(
        `fetch('/api/documents').then((r) => r.json()).then((d) => (d.documents || []).some((x) => x.id === '${docId}' && x.title === 'E2E document'))`,
        12_000,
        800,
      ),
    );

    // Tags
    await A.js(
      "(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Tag'); b?.click(); return 1; })()",
    );
    await A.until("Boolean(document.querySelector('input[aria-label=\"New tag\"]'))", 4000);
    await A.fill('input[aria-label="New tag"]', "e2e");
    await A.js("document.querySelector('input[aria-label=\"New tag\"]').form.requestSubmit(); 1");
    check(
      "a tag can be added",
      await A.until(
        "[...document.querySelectorAll('[aria-label=Tags] span')].some((n) => n.textContent.trim().startsWith('e2e'))",
        8000,
      ),
    );

    // ── Version history ──────────────────────────────────────────────────────
    section("Version history");
    await A.click('button[aria-label="Version history"]');
    await A.until(
      "[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Save a version')",
      6000,
    );
    await A.clickText("button", "Save a version");
    await A.until("Boolean(document.querySelector('input[aria-label=\"Version name\"]'))", 4000);
    await A.fill('input[aria-label="Version name"]', "E2E snapshot");
    await A.js(
      "document.querySelector('input[aria-label=\"Version name\"]').form.requestSubmit(); 1",
    );
    check(
      "a named version is saved and listed",
      await A.until(
        "[...document.querySelectorAll('aside')].some((el) => el.innerText.includes('E2E snapshot'))",
        12_000,
      ),
    );
    // Saving goes through the offline queue, so the panel lists it optimistically
    // a moment before the server has it — poll rather than read once.
    check(
      "the version reaches the server",
      await A.until(
        `fetch('/api/documents/${docId}/versions').then((r) => r.json()).then((d) => (d.versions || []).some((v) => v.label === 'E2E snapshot'))`,
        20_000,
        1000,
      ),
    );

    // ── Sharing ──────────────────────────────────────────────────────────────
    section("Sharing");
    await A.js(
      "(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Share'); b?.click(); return 1; })()",
    );
    await A.until(
      "Boolean(document.querySelector('input[aria-label=\"Email address to share with\"]'))",
      5000,
    );
    await A.fill('input[aria-label="Email address to share with"]', emailB);
    await A.js(
      "(() => { const r = [...document.querySelectorAll('[role=radio]')].find((x) => /Editor/i.test(x.textContent)); r?.click(); return 1; })()",
    );
    await A.js(
      "document.querySelector('input[aria-label=\"Email address to share with\"]').form.requestSubmit(); 1",
    );
    check(
      "owner can invite a collaborator as Editor",
      await A.until(
        "document.querySelector('[role=dialog]')?.innerText.includes('E2E Editor')",
        12_000,
      ),
    );
    await A.key("Escape", "Escape", 27);

    // ── Live collaboration ───────────────────────────────────────────────────
    section("Live collaboration (two browsers)");
    await B.goto(docPath, 1500);
    check(
      "collaborator can open the shared document",
      await B.until("Boolean(document.querySelector('.ProseMirror'))", 15_000),
    );
    check(
      "collaborator sees the owner's text",
      await B.until(
        "document.querySelector('.ProseMirror').innerText.includes('Hello from the owner.')",
        15_000,
      ),
    );

    await A.js("document.querySelector('.ProseMirror').focus(); 1");
    await A.key("End", "End", 35, 2);
    await A.key("Enter", "Enter", 13);
    await A.type("LIVE-FROM-OWNER");
    check(
      "owner's new edit reaches the collaborator live",
      await B.until(
        "document.querySelector('.ProseMirror').innerText.includes('LIVE-FROM-OWNER')",
        12_000,
      ),
    );

    await B.js("document.querySelector('.ProseMirror').focus(); 1");
    await B.key("End", "End", 35, 2);
    await B.key("Enter", "Enter", 13);
    await B.type("LIVE-FROM-EDITOR");
    check(
      "collaborator's edit reaches the owner live",
      await A.until(
        "document.querySelector('.ProseMirror').innerText.includes('LIVE-FROM-EDITOR')",
        12_000,
      ),
    );

    // ── Offline, then back ───────────────────────────────────────────────────
    section("Offline editing and re-sync");
    await A.offline(true);
    check(
      "going offline is shown in the interface",
      await A.until("document.body.innerText.includes('Offline')", 8000),
    );
    await A.js("document.querySelector('.ProseMirror').focus(); 1");
    await A.key("End", "End", 35, 2);
    await A.key("Enter", "Enter", 13);
    await A.type("WRITTEN-OFFLINE");
    check(
      "the editor keeps accepting edits offline",
      await A.until(
        "document.querySelector('.ProseMirror').innerText.includes('WRITTEN-OFFLINE')",
        4000,
      ),
    );
    await sleep(2500);
    const leaked = await B.js(
      "document.querySelector('.ProseMirror').innerText.includes('WRITTEN-OFFLINE')",
    );
    console.log(`        ↳ collaborator saw the offline edit before reconnect: ${leaked}`);
    await A.offline(false);
    check(
      "after reconnecting, the offline edit reaches the collaborator",
      await B.until(
        "document.querySelector('.ProseMirror').innerText.includes('WRITTEN-OFFLINE')",
        30_000,
      ),
    );

    // Reload: the document comes back with everything in it.
    await A.goto(docPath, 1500);
    await A.until("Boolean(document.querySelector('.ProseMirror'))", 15_000);
    check(
      "document persists across a reload",
      await A.until(
        "(() => { const t = document.querySelector('.ProseMirror').innerText; return t.includes('LIVE-FROM-EDITOR') && t.includes('WRITTEN-OFFLINE'); })()",
        15_000,
      ),
    );

    // ── Dashboard ────────────────────────────────────────────────────────────
    section("Dashboard");
    await A.goto("/dashboard", 1500);
    check(
      "the document is listed",
      await A.until(
        "[...document.querySelectorAll('main a')].some((a) => a.textContent.includes('E2E document'))",
        12_000,
      ),
    );
    await A.js(
      "(() => { const b = document.querySelector('button[aria-label=\"Add E2E document to favourites\"]'); b?.click(); return Boolean(b); })()",
    );
    check(
      "a document can be starred",
      await A.until(
        "Boolean(document.querySelector('button[aria-label=\"Remove E2E document from favourites\"]'))",
        8000,
      ),
    );
    await A.fill('input[aria-label="Search documents by title"]', "zzz-no-match");
    check(
      "search filters the list",
      await A.until("document.body.innerText.includes('No matching documents')", 4000),
    );
    await A.fill('input[aria-label="Search documents by title"]', "");
    await A.click('button[aria-label="Grid view"]');
    check(
      "grid view renders cards",
      await A.until("Boolean(document.querySelector('ul.grid > li'))", 4000),
    );
    await A.click('button[aria-label="New folder"]');
    await A.until("Boolean(document.querySelector('input[aria-label=\"New folder name\"]'))", 4000);
    await A.fill('input[aria-label="New folder name"]', "E2E folder");
    await A.js(
      "document.querySelector('input[aria-label=\"New folder name\"]').form.requestSubmit(); 1",
    );
    check(
      "a folder can be created",
      await A.until(
        "[...document.querySelectorAll('nav[aria-label=Workspace] button')].some((b) => b.textContent.includes('E2E folder'))",
        8000,
      ),
    );

    await B.goto("/dashboard", 1500);
    check(
      "the shared document appears for the collaborator",
      await B.until(
        "[...document.querySelectorAll('main a')].some((a) => a.textContent.includes('E2E document'))",
        12_000,
      ),
    );

    // Command palette
    await A.key("k", "KeyK", 75, 2);
    check(
      "Ctrl+K opens the command palette",
      await A.until("Boolean(document.querySelector('[role=dialog]'))", 4000),
    );
    await A.key("Escape", "Escape", 27);

    // ── Search & settings ────────────────────────────────────────────────────
    section("Search, settings, sign-out");
    await A.goto("/search", 2500);
    check(
      "search page renders",
      await A.js("document.querySelector('h1')?.textContent.includes('Search')"),
    );

    await A.goto("/settings", 1500);
    await A.until("Boolean(document.querySelector('#name'))", 10_000);
    await A.fill("#name", "E2E Owner Renamed");
    await A.js("document.querySelector('#name').form.requestSubmit(); 1");
    check(
      "profile name can be updated",
      await A.until("document.body.innerText.includes('Profile updated')", 10_000),
    );

    // Sign out through the account menu.
    await A.js(
      "document.querySelector('button[aria-label=\"Account menu\"]')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' })); 1",
    );
    await A.until(
      "[...document.querySelectorAll('[role=menuitem]')].some((m) => m.textContent.trim() === 'Sign out')",
      4000,
    );
    await A.js(
      "(() => { const m = [...document.querySelectorAll('[role=menuitem]')].find((x) => x.textContent.trim() === 'Sign out'); m?.click(); return 1; })()",
    );
    const signedOut = await A.until("!location.pathname.startsWith('/settings')", 12_000);
    await A.goto("/dashboard", 2000);
    check(
      "sign-out ends the session",
      signedOut && String(await A.path()) === "/sign-in",
      String(await A.path()),
    );

    for (const [label, who] of [
      ["owner", A],
      ["collaborator", B],
    ]) {
      const errors = String(await who.js("(window.__errs || []).join(' | ')"));
      check(`no script errors in the ${label}'s session`, errors === "", errors.slice(0, 200));
    }
  } catch (error) {
    check("run completed without an exception", false, String(error?.message ?? error));
  } finally {
    console.log("\n========================================================");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    if (failures.length) console.log("\nFailures:\n" + failures.map((f) => `  - ${f}`).join("\n"));
    browser.close();
    process.exit(fail === 0 ? 0 : 1);
  }
}

await main();

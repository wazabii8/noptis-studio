// Run against a production preview with the Playwright Chromium browser installed.
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {mkdtemp, rm} = require("node:fs/promises");
const {tmpdir} = require("node:os");
const {join} = require("node:path");
const {randomUUID} = require("node:crypto");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const app = process.env.STUDIO_URL || "http://127.0.0.1:4187/noptis-studio/";
const host = "https://sync.test";
const storage = "/storage/noptis-studio/";
const numberPath = "number-THM_007.json";
const address = "test@sync.test";
const button = (page, name) => page.getByRole("button", {name, exact: true});

function fixture() {
  const files = new Map();
  const uploads = [];
  let revision = 0;
  const system = {
    files, uploads, deny: false, revoked: false, interrupt: false, race: undefined,
    set(path, document) {
      files.set(path, {etag: String(++revision), document});
    },
    async route(route) {
      const request = route.request();
      const url = new URL(request.url());
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, PUT, OPTIONS",
        "access-control-allow-headers": "authorization, content-type, if-match, if-none-match",
        "access-control-expose-headers": "ETag",
      };
      const reply = (status, options = {}) => route.fulfill({...options, status, headers: {...cors, ...options.headers}});
      if (request.method() === "OPTIONS") return reply(204);
      if (url.pathname === "/.well-known/webfinger") {
        return reply(200, {json: {links: [{
          rel: "remotestorage", type: "draft-dejong-remotestorage-02", href: host + "/storage",
          properties: {"auth-endpoint": host + "/authorize"},
        }]}});
      }
      if (url.pathname === "/authorize") {
        const redirect = new URL(url.searchParams.get("redirect_uri"));
        assert.equal(redirect.href, app);
        assert.equal(url.searchParams.get("scope"), "noptis-studio:rw");
        const state = url.searchParams.get("state");
        assert.ok(state);
        redirect.hash = new URLSearchParams(system.deny
          ? {error: "access_denied", state}
          : {access_token: "fixture", token_type: "bearer", state}).toString();
        system.deny = false;
        return reply(302, {headers: {location: redirect.href}});
      }
      assert.ok(url.pathname.startsWith(storage));
      assert.equal(request.headers().authorization, "Bearer fixture");
      if (system.revoked) return reply(401);
      const path = url.pathname.slice(storage.length);
      if (!path) {
        if (!files.size) return reply(404);
        return reply(200, {json: {
          "@context": "http://remotestorage.io/spec/folder-description",
          items: Object.fromEntries([...files].map(([name, {etag}]) => [name, {ETag: etag}])),
        }});
      }
      if (request.method() === "PUT" && system.race) {
        system.set(path, system.race);
        system.race = undefined;
      }
      const existing = files.get(path);
      if (request.method() === "GET") {
        return existing
          ? reply(200, {json: existing.document, headers: {etag: '"' + existing.etag + '"'}})
          : reply(404);
      }
      assert.equal(request.method(), "PUT");
      const headers = request.headers();
      assert.ok(headers["if-match"] || headers["if-none-match"]);
      if (existing ? headers["if-match"] !== '"' + existing.etag + '"' : headers["if-none-match"] !== "*") {
        return reply(412);
      }
      system.set(path, request.postDataJSON());
      uploads.push(path);
      if (system.interrupt) {
        system.interrupt = false;
        return route.abort();
      }
      return reply(existing ? 200 : 201, {headers: {etag: '"' + files.get(path).etag + '"'}});
    },
  };
  return system;
}

async function getLocal(page, store) {
  return page.evaluate(name => new Promise((resolve, reject) => {
    const open = indexedDB.open("noptis-studio");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const read = db.transaction(name).objectStore(name).getAll();
      read.onsuccess = () => { db.close(); resolve(read.result); };
      read.onerror = () => { db.close(); reject(read.error); };
    };
  }), store);
}

async function seed(context, tag) {
  await context.addInitScript(label => {
    if (localStorage.getItem("seeded")) return;
    // Register the version-2 open before the app loads its database module.
    const open = indexedDB.open("noptis-studio", 2);
    open.onupgradeneeded = () => {
      const db = open.result;
      db.createObjectStore("gidSegments", {keyPath: "key"}).put({key: "THM_007", value: "Authority", updatedAt: "2025-01-01"});
      const lists = db.createObjectStore("queryLists", {keyPath: "id", autoIncrement: true});
      lists.add({id: 1, title: "Custom " + label, description: ""});
      lists.add({id: 2, title: " doi ", description: "Saved DOI description"});
      const queries = db.createObjectStore("queries", {keyPath: "id", autoIncrement: true});
      queries.createIndex("listId", "listId");
      queries.add({id: 1, listId: 1, title: "Query " + label, description: "", sql: "SELECT\n  1"});
      queries.add({id: 2, listId: 2, title: "Legacy DOI query " + label, description: "", sql: "SELECT\n  2"});
    };
    open.onsuccess = () => { open.result.close(); localStorage.setItem("seeded", "yes"); };
  }, tag);
}

async function setup(browser, server, tag) {
  const context = await browser.newContext({viewport: {width: 375, height: 800}});
  await context.route(host + "/**", route => server.route(route));
  if (tag) await seed(context, tag);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(app + "#sync");
  return {context, page};
}

async function waitFor(page, predicate, message, interval = 10000) {
  const timeout = Date.now() + interval;
  while (!await predicate()) {
    if (Date.now() >= timeout) assert.fail(message + "\n" + await page.locator("main").innerText());
    await page.waitForTimeout(100);
  }
}

async function connect(page, reconnect = false) {
  await page.getByLabel("Remote storage address").fill(address);
  await button(page, reconnect ? "Reconnect" : "Connect").click();
  await page.getByText("Connected", {exact: true}).waitFor();
}

async function sync(page) {
  await button(page, "Sync now").click();
  await page.getByText("Connected", {exact: true}).waitFor();
}

async function editNumber(page, text) {
  await page.getByRole("navigation").getByRole("link", {name: "Saved numbers", exact: true}).click();
  await page.getByRole("button", {name: "Edit 007"}).click();
  await page.getByRole("main").getByRole("textbox").last().fill(text);
  await button(page, "Save").click();
  await page.getByText(text, {exact: true}).waitFor();
  await page.getByRole("link", {name: "Synchronization"}).click();
}

test("production preview migrates local records and safely syncs two independent profiles", {timeout: 90000}, async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const server = fixture();
  const first = await setup(browser, server, "A");
  const second = await setup(browser, server, "B");

  await first.page.getByRole("link", {name: "NOPTIS Queries"}).click();
  await first.page.getByText("Saved DOI description", {exact: true}).waitFor();
  assert.equal((await getLocal(first.page, "queries")).find(query => query.id === 1).sql, "SELECT\n  1");
  assert.equal(server.uploads.length, 0);

  const syncLink = first.page.getByRole("link", {name: "Synchronization", exact: true});
  await syncLink.click();
  const signUp = first.page.getByRole("link", {name: "No account? Sign up for 5apps Storage"});
  await signUp.waitFor();
  assert.equal(await syncLink.getAttribute("aria-current"), "page");
  assert.equal(await signUp.getAttribute("href"), "https://5apps.com/users/sign_up?site=storage");
  server.deny = true;
  await first.page.getByLabel("Remote storage address").fill(address);
  await button(first.page, "Connect").click();
  await first.page.getByText("Authorization was canceled or denied.").waitFor();
  await connect(first.page);
  await connect(second.page);
  await sync(first.page);

  for (const {page} of [first, second]) {
    const lists = await getLocal(page, "queryLists");
    const queries = await getLocal(page, "queries");
    for (const label of ["A", "B"]) {
      assert.equal(lists.find(list => list.id === queries.find(query => query.title === "Query " + label).listId).title, "Custom " + label);
    }
    assert.equal(queries.filter(query => query.listId === -1).length, 2);
  }

  // Change the remote record after reconciliation and before the conditional PUT.
  const cloud = {...server.files.get(numberPath).document, revision: randomUUID(), data: {value: "Cloud edit"}};
  server.race = cloud;
  await editNumber(first.page, "Local edit");
  await first.page.getByRole("heading", {name: "Conflicts"}).waitFor();
  assert.equal(server.files.get(numberPath).document.revision, cloud.revision);
  await first.page.reload();
  await first.page.getByText("Local edit", {exact: true}).waitFor();
  await first.page.getByText("Cloud edit", {exact: true}).waitFor();
  await button(first.page, "Keep local version").click();
  await waitFor(first.page, () => server.files.get(numberPath).document.data.value === "Local edit", "conflict resolution did not sync");

  // The server commits a write but the client loses the response.
  server.interrupt = true;
  const before = server.uploads.length;
  await editNumber(first.page, "Interrupted upload");
  await waitFor(first.page, () => server.files.get(numberPath).document.data.value === "Interrupted upload", "upload never committed");
  await first.page.reload();
  await first.page.getByText("Pending changes: 0", {exact: true}).waitFor();
  assert.equal(server.uploads.length, before + 1);

  server.revoked = true;
  await button(first.page, "Sync now").click();
  await first.page.getByText("Storage access expired or was revoked. Reconnect to resume.").waitFor();
  await first.page.getByText(/^Last confirmed sync:/).waitFor({state: "hidden"});
  server.revoked = false;
  await button(first.page, "Reconnect").click();
  await first.page.getByText("Connected", {exact: true}).waitFor();
  await first.page.getByText(/^Last confirmed sync:/).waitFor();

  // Sync stays off while the service worker serves a cold offline navigation.
  await button(first.page, "Disconnect").click();
  await button(first.page, "Reconnect").waitFor();
  await first.page.getByRole("status").waitFor({state: "hidden"});
  await first.page.evaluate(() => navigator.serviceWorker.ready);
  await first.context.setOffline(true);
  await first.page.reload();
  await editNumber(first.page, "Offline edit");
  await first.page.reload();
  await button(first.page, "Reconnect").waitFor();
  assert.equal(await first.page.getByRole("status").count(), 0);
  assert.equal((await getLocal(first.page, "gidSegments")).find(record => record.key === "THM_007").value, "Offline edit");
  await first.context.setOffline(false);
  await connect(first.page, true);
  assert.equal(server.files.get(numberPath).document.data.value, "Offline edit");

  // An external update while a form is open must preserve the visible draft
  // and reject a save based on its old revision.
  const manager = first.page.getByRole("navigation").getByRole("link", {name: "Saved numbers", exact: true});
  await manager.click();
  await button(first.page, "Edit 007").click();
  const draft = first.page.getByRole("main").getByRole("textbox").last();
  await draft.fill("Unsaved draft");
  const companion = await first.context.newPage();
  await companion.goto(app + "#sync");
  await companion.getByText("Sync is managed in another Noptis Studio window or tab.").waitFor();
  server.set(numberPath, {...server.files.get(numberPath).document, revision: randomUUID(), data: {value: "Updated elsewhere"}});
  await waitFor(first.page, async () => (await getLocal(first.page, "gidSegments"))[0].value === "Updated elsewhere",
    "automatic polling did not deliver the cloud edit", 25000);
  await button(first.page, "Save").click();
  await first.page.getByText(/This record changed after you opened the form/).waitFor();
  assert.equal(await draft.inputValue(), "Unsaved draft");
  await button(first.page, "Cancel").click();
  await first.page.getByText("Updated elsewhere", {exact: true}).waitFor();
  await companion.close();

  // Delete one list while another profile adds a query to it.
  await first.context.setOffline(true);
  const firstQueries = first.page.getByRole("link", {name: "NOPTIS Queries"});
  await firstQueries.click();
  await first.page.locator("#query-list").selectOption({label: "Custom A"});
  await button(first.page, "Manage list").click();
  await button(first.page, "Delete list").click();
  await first.page.getByText("Delete Custom A and its 1 query?").waitFor();
  await button(first.page, "Delete list").click();
  await first.page.getByRole("link", {name: "Synchronization"}).click();
  await second.page.getByRole("link", {name: "NOPTIS Queries"}).click();
  await second.page.locator("#query-list").selectOption({label: "Custom A"});
  await button(second.page, "Add query").click();
  await second.page.getByLabel("Title").fill("Concurrent query");
  await second.page.getByLabel("SQL").fill("SELECT\n  3");
  await button(second.page, "Save").click();
  await second.page.getByRole("button", {name: "Concurrent query", exact: true}).waitFor();
  await second.page.getByRole("link", {name: "Synchronization"}).click();
  await waitFor(second.page, () => Array.from(server.files.values()).some(({document}) => document.data?.title === "Concurrent query"),
    "concurrent query did not sync", 25000);
  await first.context.setOffline(false);
  await first.page.getByRole("heading", {name: "Queries awaiting a list"}).waitFor();
  await button(first.page, "Move query").click();
  await waitFor(first.page, () => Array.from(server.files.values()).some(({document}) =>
    document.data?.title === "Concurrent query" && document.data.parent === "doi"), "recovered query did not move");
  await sync(second.page);
  assert.ok((await getLocal(second.page, "queries")).some(query => query.title === "Concurrent query" && query.listId === -1));

  await first.page.getByRole("link", {name: "GID", exact: true}).click();
  const gid = first.page.locator("#inp-gid");
  await gid.fill("9031123123412345");
  assert.deepEqual((await first.page.locator("table td").allTextContents()).map(value => value.trim()),
    ["9031", "123", "1234", "12345"]);
  await gid.fill("903112312341234");
  assert.ok(await first.page.locator("table td.error").count());
  await gid.fill("9999123123412345");
  assert.equal(await first.page.locator("table").count(), 0);
  await gid.fill("9031123123412345");
  await button(first.page, "EN").click();
  await first.page.getByRole("link", {name: "Synkronisering", exact: true}).waitFor();
  assert.equal((await first.page.locator("table td").allTextContents()).map(value => value.trim()).join(" "),
    "9031 123 1234 12345");
});

test("installed Chromium PWA completes OAuth in its own window and resumes queued edits", {timeout: 45000}, async () => {
  const directory = await mkdtemp(join(tmpdir(), "noptis-studio-pwa-"));
  let context;
  let api;
  try {
    // The full Chromium build provides the DevTools PWA management commands.
    context = await chromium.launchPersistentContext(directory, {channel: "chromium", headless: true});
    const server = fixture();
    await context.route(host + "/**", route => server.route(route));
    await seed(context, "installed");
    const tab = context.pages()[0];
    await tab.goto(app);
    await tab.evaluate(() => navigator.serviceWorker.ready);
    const pageSession = await context.newCDPSession(tab);
    const {manifest, errors} = await pageSession.send("Page.getAppManifest");
    assert.deepEqual(errors, []);
    assert.equal(manifest.scope, app);
    assert.equal(manifest.startUrl, app);
    api = await context.browser().newBrowserCDPSession();
    await api.send("PWA.install", {manifestId: app, installUrlOrBundleUrl: app});
    await api.send("PWA.changeAppUserSettings", {manifestId: app, displayMode: "standalone"});
    await tab.close();

    async function openInstalled() {
      const opening = context.waitForEvent("page", {timeout: 8000});
      await api.send("PWA.launch", {manifestId: app, url: app + "#sync"});
      const page = await opening;
      page.setDefaultTimeout(10000);
      await page.waitForURL(app + "#sync");
      assert.equal(await page.evaluate(() => matchMedia("(display-mode: standalone)").matches), true);
      return page;
    }

    const installed = await openInstalled();
    await connect(installed);
    assert.equal(await installed.evaluate(() => matchMedia("(display-mode: standalone)").matches), true);
    assert.equal(server.files.get(numberPath).document.data.value, "Authority");
    const cloud = {...server.files.get(numberPath).document, revision: randomUUID(), data: {value: "New from cloud"}};
    server.set(numberPath, cloud);
    await sync(installed);
    assert.equal((await getLocal(installed, "gidSegments"))[0].value, "New from cloud");

    await context.setOffline(true);
    await editNumber(installed, "Installed offline");
    assert.equal(server.files.get(numberPath).document.data.value, "New from cloud");
    await installed.close();
    await context.setOffline(false);
    const reopened = await openInstalled();
    await reopened.getByText("Pending changes: 0", {exact: true}).waitFor();
    assert.equal(server.files.get(numberPath).document.data.value, "Installed offline");
  } finally {
    await api?.send("PWA.uninstall", {manifestId: app}).catch(() => {});
    await context?.close();
    await rm(directory, {recursive: true, force: true});
  }
});

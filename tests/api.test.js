import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createApp, initialize } from "../server/app.js";
let db, server, base, token, draft, version;
async function request(
  path,
  { body, method = "GET", auth = true, origin } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  db = new PGlite();
  await initialize(db, { username: "admin", password: "testing-password-123" });
  server = createApp(db).listen(0, "127.0.0.1");
  await new Promise((r) => server.on("listening", r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await new Promise((r) => server.close(r));
  await db.close();
});
test("admin content is protected; invalid password and untrusted origins are rejected", async () => {
  assert.equal((await request("/admin/content", { auth: false })).status, 401);
  assert.equal(
    (
      await request("/admin/login", {
        method: "POST",
        body: { username: "admin", password: "wrong" },
      })
    ).status,
    401,
  );
  assert.equal(
    (await request("/content", { origin: "https://attacker.example" })).status,
    403,
  );
  const r = await request("/admin/login", {
    method: "POST",
    body: { username: "admin", password: "testing-password-123" },
  });
  assert.equal(r.status, 200);
  token = r.data.token;
  const content = await request("/admin/content");
  draft = content.data.draft;
  version = content.data.version;
  assert.equal(draft.properties[0].title, "Skanda-1");
  assert.ok(draft.properties[0].pricing.length > 0);
});
test("draft edits remain private, publication persists, stale saves cannot overwrite", async () => {
  draft.home.title = "Updated homepage";
  let r = await request("/admin/content", {
    method: "PUT",
    body: { content: draft, version, publish: false },
  });
  assert.equal(r.status, 200);
  version = r.data.version;
  assert.notEqual(
    (await request("/content")).data.home.title,
    "Updated homepage",
  );
  r = await request("/admin/content", {
    method: "PUT",
    body: { content: draft, version: version - 1, publish: true },
  });
  assert.equal(r.status, 409);
  r = await request("/admin/content", {
    method: "PUT",
    body: { content: draft, version, publish: true },
  });
  assert.equal(r.status, 200);
  version = r.data.version;
  const publicData = (await request("/content")).data;
  assert.equal(publicData.home.title, "Updated homepage");
  assert.equal(publicData.properties[0].internalNotes, undefined);
});
test("property CRUD and ordered six-property limit are enforced by the API", async () => {
  const original = draft.properties[0];
  draft.properties = [
    original,
    ...Array.from({ length: 7 }, (_, i) => ({
      ...original,
      id: `test-${i}`,
      slug: `test-${i}`,
      title: `Property ${i}`,
      published: i !== 6,
    })),
  ];
  draft.featuredIds = draft.properties.slice(0, 7).map((p) => p.id);
  assert.equal(
    (
      await request("/admin/content", {
        method: "PUT",
        body: { content: draft, version, publish: true },
      })
    ).status,
    400,
  );
  draft.featuredIds = ["test-6"];
  assert.equal(
    (
      await request("/admin/content", {
        method: "PUT",
        body: { content: draft, version, publish: true },
      })
    ).status,
    400,
  );
  draft.featuredIds = [
    "test-5",
    "test-4",
    "test-3",
    "test-2",
    "test-1",
    "test-0",
  ];
  let r = await request("/admin/content", {
    method: "PUT",
    body: { content: draft, version, publish: true },
  });
  assert.equal(r.status, 200);
  version = r.data.version;
  let data = (await request("/content")).data;
  assert.deepEqual(data.featuredIds, draft.featuredIds);
  assert.equal(data.properties.length, 7);
  assert.equal(
    data.properties.some((p) => p.id === "test-6"),
    false,
  );
  draft.properties = draft.properties.filter((p) => p.id !== "test-0");
  draft.featuredIds = draft.featuredIds.filter((id) => id !== "test-0");
  r = await request("/admin/content", {
    method: "PUT",
    body: { content: draft, version, publish: true },
  });
  assert.equal(r.status, 200);
  version = r.data.version;
  assert.equal(
    (await request("/content")).data.properties.some((p) => p.id === "test-0"),
    false,
  );
});
test("invalid fractions, duplicate URLs and unsafe image URLs are rejected", async () => {
  for (const mutate of [
    (c) => (c.properties[0].availableFractions = 9999),
    (c) => (c.properties[1].slug = c.properties[0].slug),
    (c) => (c.home.image = "javascript:alert(1)"),
  ]) {
    const content = structuredClone(draft);
    mutate(content);
    assert.equal(
      (
        await request("/admin/content", {
          method: "PUT",
          body: { content, version, publish: true },
        })
      ).status,
      400,
    );
  }
});
test("enquiries persist and their status can be updated only by admin", async () => {
  assert.equal(
    (
      await request("/enquiries", {
        method: "POST",
        body: {
          name: "Visitor",
          email: "test@example.com",
          phone: "1234567890",
          message: "Please share the details",
          propertyId: "skanda-1",
        },
        auth: false,
      })
    ).status,
    201,
  );
  const r = await request("/admin/enquiries");
  assert.equal(r.data.length, 1);
  assert.equal(
    (
      await request(`/admin/enquiries/${r.data[0].id}`, {
        method: "PATCH",
        body: { status: "Contacted" },
        auth: false,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(`/admin/enquiries/${r.data[0].id}`, {
        method: "PATCH",
        body: { status: "Contacted" },
      })
    ).status,
    200,
  );
  assert.equal((await request("/admin/enquiries")).data[0].status, "Contacted");
});
test("images persist in PostgreSQL and non-image uploads are rejected", async () => {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
    "base64",
  );
  const result = await request("/admin/media", {
    method: "POST",
    body: { data: bytes.toString("base64") },
  });
  assert.equal(result.status, 201);
  const response = await fetch(base.replace(/\/api$/, "") + result.data.url);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal(
    (
      await request("/admin/media", {
        method: "POST",
        body: {
          data: Buffer.from("<script>alert(1)</script>").toString("base64"),
        },
      })
    ).status,
    400,
  );
});
test("password changes invalidate existing sessions; new password signs in", async () => {
  assert.equal(
    (
      await request("/admin/password", {
        method: "POST",
        body: {
          currentPassword: "testing-password-123",
          newPassword: "new-testing-password-456",
        },
      })
    ).status,
    200,
  );
  assert.equal((await request("/admin/content")).status, 401);
  const result = await request("/admin/login", {
    method: "POST",
    body: { username: "admin", password: "new-testing-password-456" },
  });
  assert.equal(result.status, 200);
  token = result.data.token;
  assert.equal(
    (await request("/admin/logout", { method: "POST" })).status,
    200,
  );
  assert.equal((await request("/admin/content")).status, 401);
});

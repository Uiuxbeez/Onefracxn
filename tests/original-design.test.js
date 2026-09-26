import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
const dom = new JSDOM();
globalThis.DOMParser = dom.window.DOMParser;
const home = readFileSync("legacy/index.html", "utf8");
const detail = readFileSync("legacy/skanda.html", "utf8");
const source = readFileSync("src/original-template.js", "utf8")
  .replace(
    /import homeHtml from [^;]+;/,
    `const homeHtml=${JSON.stringify(home)};`,
  )
  .replace(
    /import propertyHtml from [^;]+;/,
    `const propertyHtml=${JSON.stringify(detail)};`,
  )
  .replace(
    /import \{ mediaUrl \} from [^;]+;/,
    "const mediaUrl = value => value;",
  );
const { buildOriginalPage } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const seed = JSON.parse(readFileSync("server/seed.json", "utf8"));
const parse = (html) => new DOMParser().parseFromString(html, "text/html");
test("homepage retains original sections, hero structure and original stylesheet", () => {
  const page = buildOriginalPage(seed),
    doc = parse(page.html),
    original = parse(home);
  assert.deepEqual(
    [...doc.querySelectorAll("section")].map((el) => el.className),
    [...original.querySelectorAll("section")].map((el) => el.className),
  );
  assert.equal(
    doc.querySelector(".Home-banner-section").className,
    original.querySelector(".Home-banner-section").className,
  );
  assert.equal(
    doc.querySelector(".banner-content h1").textContent,
    "Invest Earn and Grow",
  );
  assert.ok(page.styles.includes("/assets/css/style.css"));
  assert.equal(
    page.styles.some((s) => s.includes("src/styles")),
    false,
  );
  for (const src of [...page.styles, ...page.scripts])
    if (src.startsWith("/assets/")) assert.ok(existsSync(src.slice(1)), src);
});
test("selected properties use original card HTML in selected order without placeholder duplicates", () => {
  const data = structuredClone(seed),
    base = data.properties[0];
  data.properties = Array.from({ length: 8 }, (_, i) => ({
    ...base,
    id: `p-${i}`,
    slug: `p-${i}`,
    title: `Property ${i}`,
    published: i !== 7,
  }));
  data.featuredIds = ["p-5", "p-3", "p-0", "p-2", "p-1", "p-4"];
  const doc = parse(buildOriginalPage(data).html);
  assert.deepEqual(
    [...doc.querySelectorAll(".features-slider .title a")].map(
      (a) => a.textContent,
    ),
    [
      "Property 5",
      "Property 3",
      "Property 0",
      "Property 2",
      "Property 1",
      "Property 4",
    ],
  );
  assert.equal(doc.querySelectorAll(".features-slide-card").length, 3);
  assert.equal(
    doc.querySelectorAll(".features-slider .buy-grid-details").length,
    6,
  );
  const listing = parse(buildOriginalPage(data, "/properties").html);
  assert.equal(listing.querySelectorAll("[data-property-search]").length, 7);
  assert.ok(listing.querySelector("[data-property-filter]"));
});
test("property page uses original gallery, accordions and a persisted enquiry form", () => {
  const data = structuredClone(seed);
  data.properties[0].title = "New property";
  data.properties[0].description = "<script>bad()</script>";
  const page = buildOriginalPage(data, "/properties/skanda-1"),
    doc = parse(page.html);
  assert.equal(
    doc.querySelector(".breadcrumb-title").textContent,
    "New property",
  );
  assert.equal(
    doc.querySelectorAll(".service-slider .service-img-wrap").length,
    6,
  );
  assert.equal(
    doc.querySelector("#accordion-1 .accordion-body").textContent,
    "<script>bad()</script>",
  );
  assert.equal(doc.querySelectorAll("script").length, 0);
  assert.equal(
    doc.querySelector("form[data-enquiry]").dataset.enquiry,
    "skanda-1",
  );
  assert.equal(doc.querySelector("form [name=email]").type, "email");
  assert.ok(doc.querySelector(".theiaStickySidebar"));
});
test("contact form and not-found route retain original styling", () => {
  assert.ok(
    parse(buildOriginalPage(seed, "/contact").html).querySelector(
      "form[data-enquiry]",
    ),
  );
  assert.match(
    buildOriginalPage(seed, "/properties/missing").html,
    /Page not found/,
  );
});

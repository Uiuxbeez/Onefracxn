import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { buildOriginalPage } from "./original-template";
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.append(el);
  });
}
export default function OriginalSite() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/content")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const page = useMemo(
    () => (data ? buildOriginalPage(data, window.location.pathname) : null),
    [data],
  );
  useEffect(() => {
    if (!page) return;
    document.title = page.title;
    document
      .querySelector("meta[name=description]")
      ?.setAttribute("content", page.description);
    const styleReady = [];
    const links = page.styles.map((href) => {
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      styleReady.push(
        new Promise((resolve) => {
          el.onload = resolve;
          el.onerror = resolve;
        }),
      );
      document.head.append(el);
      return el;
    });
    let disposed = false;
    (async () => {
      await Promise.all(styleReady);
      for (const src of page.scripts) {
        if (disposed) return;
        await loadScript(src);
      }
      if (window.location.hash)
        document
          .getElementById(window.location.hash.slice(1))
          ?.scrollIntoView();
    })().catch((e) => {
      console.error(e);
      document
        .querySelectorAll("[data-aos]")
        .forEach((el) => el.classList.add("aos-animate"));
    });
    const filter = (e) => {
      if (!e.target.matches("[data-property-filter]")) return;
      let shown = 0;
      document.querySelectorAll("[data-property-search]").forEach((el) => {
        el.hidden = !el.dataset.propertySearch.includes(
          e.target.value.toLowerCase(),
        );
        el.style.setProperty(
          "display",
          el.hidden ? "none" : "flex",
          "important",
        );
        if (!el.hidden) shown++;
      });
      const empty = document.querySelector("[data-empty-listings]");
      if (empty) empty.hidden = shown > 0;
    };
    const submit = async (e) => {
      const form = e.target;
      if (!form.matches("form[data-enquiry]")) return;
      e.preventDefault();
      const status = form.querySelector("[role=status]"),
        button = form.querySelector("button[type=submit]");
      button.disabled = true;
      status.textContent = "Sending…";
      try {
        await api("/enquiries", {
          method: "POST",
          body: {
            ...Object.fromEntries(new FormData(form)),
            propertyId: form.dataset.enquiry || null,
          },
        });
        status.textContent = "Thank you. Your enquiry has been received.";
        form.reset();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };
    document.addEventListener("input", filter);
    document.addEventListener("submit", submit);
    return () => {
      disposed = true;
      links.forEach((el) => el.remove());
      document.removeEventListener("input", filter);
      document.removeEventListener("submit", submit);
    };
  }, [page]);
  if (error)
    return (
      <p role="alert">
        {error} <button onClick={() => window.location.reload()}>Retry</button>
      </p>
    );
  if (!page) return <p role="status">Loading…</p>;
  return <div dangerouslySetInnerHTML={{ __html: page.html }} />;
}
// Isolate previews so the admin stylesheet cannot affect the original design.
function Preview({ data, path = "/", property }) {
  const page = useMemo(
    () => buildOriginalPage(data, path, { property, preview: true }),
    [data, path, property],
  );
  const escape = (value) =>
    value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const srcDoc = `<!doctype html><html><head><base href="${escape(window.location.origin)}/"><meta name="viewport" content="width=device-width,initial-scale=1">${page.styles.map((href) => `<link rel="stylesheet" href="${escape(href)}">`).join("")}</head><body>${page.html}${page.scripts.map((src) => `<script src="${escape(src)}"></script>`).join("")}</body></html>`;
  return (
    <iframe
      title="Original website preview"
      srcDoc={srcDoc}
      style={{ width: "100%", height: 900, border: 0 }}
    />
  );
}
export function Home({ data }) {
  return <Preview data={data} />;
}
export function PropertyDetail({ data, override }) {
  return (
    <Preview
      data={data}
      path={`/properties/${override.slug}`}
      property={override}
    />
  );
}
export function PagePreview({ data, page }) {
  return (
    <Preview
      data={{
        ...data,
        pages: data.pages.map((p) =>
          p.slug === page.slug ? { ...p, published: true } : p,
        ),
      }}
      path={`/${page.slug}`}
    />
  );
}

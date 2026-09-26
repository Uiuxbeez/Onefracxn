// Preserve the original HTML presentation; insert CMS values as text, not HTML.
import homeHtml from "../legacy/index.html?raw";
import propertyHtml from "../legacy/skanda.html?raw";
import { mediaUrl } from "./api";
const text = (root, selector, value) => {
  const el = root?.querySelector(selector);
  if (el && value !== undefined) el.textContent = value;
};
function iconText(el, value) {
  if (!el) return;
  const icon = el.querySelector("i")?.cloneNode(true);
  el.replaceChildren();
  if (icon) el.append(icon, " ");
  el.append(String(value));
}
function image(el, src, alt) {
  if (el && src) {
    el.setAttribute("src", mediaUrl(src));
    if (alt) el.setAttribute("alt", alt);
  }
}
function paragraphs(container, value) {
  if (!container) return;
  container.replaceChildren();
  for (const line of (value || "").split(/\n\s*\n/)) {
    const p = container.ownerDocument.createElement("p");
    p.textContent = line;
    container.append(p);
  }
}
function repeat(container, template, values, update) {
  if (!container || !template) return;
  container.replaceChildren();
  values.forEach((value, i) => {
    const clone = template.cloneNode(true);
    update(clone, value, i);
    container.append(clone);
  });
}
function card(template, p) {
  const node = template.cloneNode(true);
  node
    .querySelectorAll(".buy-grid-img > a, .title a")
    .forEach((a) => a.setAttribute("href", `/properties/${p.slug}`));
  image(
    node.querySelector(".buy-grid-img > a img"),
    p.id === "skanda-1" && p.cover === "/assets/img/buy/buy-grid-img-01.jpg"
      ? "/assets/img/buy/buy-grid-img-01.jpeg"
      : p.cover || p.gallery[0],
    p.title,
  );
  text(node, ".title a", p.title);
  iconText(node.querySelector(".buy-grid-content p"), p.location);
  text(node, ".buy-grid-img h6", `${p.price}${p.priceSuffix}`);
  text(node, ".buy-grid-content h6 span", `: ${p.totalFractions}`);
  iconText(node.querySelector(".badge.bg-success"), p.status);
  const details = node.querySelectorAll(".buy-grid-details li");
  iconText(details[0], `${p.bedrooms} Bedroom${p.bedrooms === 1 ? "" : "s"}`);
  iconText(
    details[2],
    `${p.bathrooms} Bathroom${p.bathrooms === 1 ? "" : "s"}`,
  );
  if (p.area) iconText(details[3], p.area);
  return node;
}
function editSection(section, data) {
  if (!section) return;
  section.hidden = !data.visible;
  if (!data.visible) section.style.display = "none";
  text(section, "h2", data.title);
  text(section, ".section-heading p", data.body);
  if (data.image) image(section.querySelector("img"), data.image, data.title);
  const selector = section.querySelector(".testimonials-item")
    ? ".testimonials-item"
    : section.querySelector(".partners-items")
      ? ".partners-items"
      : data.title === "Our Team"
        ? ".card-body"
        : null;
  if (selector) {
    const first = section.querySelector(selector);
    if (!first || !data.items.length) return;
    const wrapper =
      first.closest(".testimonials-slide, .partners-slide, .col-md-6") || first;
    repeat(wrapper.parentElement, wrapper, data.items, (node, item) => {
      text(node, "h6, a.fw-semibold", item.title);
      text(node, "p", item.body);
      image(node.querySelector("img"), item.image, item.title);
    });
  } else {
    const headings = [...section.querySelectorAll("h5, h6")];
    data.items.forEach((item, i) => {
      const heading = headings[i];
      if (!heading) return;
      heading.textContent = item.title;
      if (heading.nextElementSibling?.tagName === "P")
        heading.nextElementSibling.textContent = item.body;
      image(heading.parentElement.querySelector("img"), item.image, item.title);
    });
  }
}
function faqs(container, items, prefix) {
  const template = container?.querySelector(".accordion-item, .faq-card");
  repeat(container, template, items, (node, item, i) => {
    const id = `${prefix}-${i}`,
      trigger = node.querySelector(".accordion-button, .faq-title a"),
      body = node.querySelector(".accordion-collapse, .card-collapse");
    if (!trigger || !body) return;
    trigger.textContent = item.question;
    trigger.setAttribute("data-bs-target", `#${id}`);
    trigger.setAttribute("href", `#${id}`);
    trigger.setAttribute("aria-expanded", "false");
    trigger.classList.add("collapsed");
    body.id = id;
    body.classList.remove("show");
    text(body, "p", item.answer);
  });
}
function navigation(doc, data) {
  const links = {
    Home: "/",
    "Why Onefracxn": "/why-onefracxn",
    "Why OneFracxn": "/why-onefracxn",
    Properties: "/properties",
    FAQ: "/#homepage-faq",
    "Contact Us": "/contact",
    "Agent Login": "/admin",
    "Schedule a Call": "/contact",
  };
  doc.querySelectorAll("a").forEach((a) => {
    const title = a.textContent.replace(/arrow_forward/g, "").trim();
    if (links[title]) a.setAttribute("href", links[title]);
  });
  doc
    .querySelectorAll(".navbar-brand, .menu-logo")
    .forEach((a) => a.setAttribute("href", "/"));
  text(doc, ".navbar-brand h4", data.settings.brand);
  text(doc, ".join-sec h2", data.settings.footerTitle);
  const contacts = doc.querySelectorAll(".footer-contacts .contact-info p");
  [data.settings.address, data.settings.phone, data.settings.email].forEach(
    (v, i) => {
      if (v && contacts[i]) contacts[i].textContent = v;
    },
  );
  text(
    doc,
    ".copy-right",
    `Copyright © ${new Date().getFullYear()}. All Rights Reserved, ${data.settings.brand}`,
  );
}
function enquiryForm(doc, container, propertyId) {
  if (!container) return;
  const form = doc.createElement("form");
  form.className = container.className;
  form.innerHTML = container.innerHTML;
  form.dataset.enquiry = propertyId || "";
  const fields = form.querySelectorAll("input, textarea");
  ["name", "email", "phone", "message"].forEach((name, i) => {
    if (!fields[i]) return;
    fields[i].name = name;
    fields[i].id = `enquiry-${name}`;
    fields[i].required = true;
    const label = fields[i].parentElement.querySelector("label");
    if (label) label.htmlFor = fields[i].id;
  });
  if (fields[0]) {
    fields[0].minLength = 2;
    fields[0].maxLength = 100;
  }
  if (fields[1]) fields[1].type = "email";
  if (fields[2]) {
    fields[2].type = "tel";
    fields[2].minLength = 6;
    fields[2].maxLength = 30;
  }
  if (fields[3]) {
    fields[3].minLength = 5;
    fields[3].maxLength = 4000;
  }
  const link = form.querySelector("a.btn");
  if (link) {
    const button = doc.createElement("button");
    button.type = "submit";
    button.className = link.className;
    button.textContent = link.textContent;
    link.replaceWith(button);
  }
  const status = doc.createElement("p");
  status.setAttribute("role", "status");
  status.className = "mt-3 mb-0";
  form.append(status);
  form.id = "property-enquiry";
  container.replaceWith(form);
}
function serialize(doc) {
  const styles = [...doc.querySelectorAll("link[rel=stylesheet]")].map((el) =>
    el.getAttribute("href"),
  );
  const scripts = [...doc.querySelectorAll("script[src]")].map((el) =>
    el.getAttribute("src"),
  );
  doc.querySelectorAll("script").forEach((el) => el.remove());
  return {
    html: doc.body.innerHTML,
    styles,
    scripts: [...new Set(scripts)].filter(
      (src) => !src.endsWith("/theme-script.js"),
    ),
    title: doc.title,
    description: doc.querySelector("meta[name=description]")?.content || "",
  };
}
function missing(doc) {
  const wrapper = doc.querySelector(".main-wrapper");
  wrapper.replaceChildren();
  const p = doc.createElement("p");
  p.className = "container py-5";
  p.textContent = "Page not found. ";
  const a = doc.createElement("a");
  a.href = "/properties";
  a.textContent = "View properties";
  p.append(a);
  wrapper.append(p);
  doc.title = "Page not found | OneFracxn";
  return serialize(doc);
}
export function buildOriginalPage(
  data,
  path = "/",
  { property, preview = false } = {},
) {
  const detail = Boolean(
    property ||
    path.startsWith("/properties/") ||
    /\/property\/skanda(?:\.html)?$/.test(path),
  );
  const doc = new DOMParser().parseFromString(
    detail ? propertyHtml : homeHtml,
    "text/html",
  );
  doc.querySelectorAll("[src], [href]").forEach((el) => {
    for (const attr of ["src", "href"]) {
      const v = el.getAttribute(attr);
      if (v && /^(?:\.\.\/)?assets\//.test(v))
        el.setAttribute(attr, "/" + v.replace(/^\.\.\//, ""));
    }
  });
  const sourceSections = [...doc.querySelectorAll("section")];
  navigation(doc, data);
  const originalCard = doc.querySelector(".property-card"),
    properties = data.properties.filter((p) => p.published);
  if (detail) {
    const slug = path.split("/").pop(),
      p =
        property ||
        properties.find(
          (p) =>
            p.slug === slug || (slug === "skanda.html" && p.id === "skanda-1"),
        );
    if (!p) return missing(doc);
    text(doc, ".breadcrumb-title", p.title);
    const address = doc.querySelector(".custom-address-item");
    if (address) {
      const a = address.querySelector("a")?.cloneNode(true);
      iconText(address, p.location);
      if (a && p.mapUrl) {
        a.href = p.mapUrl;
        address.append(" ", a);
      }
    }
    const price = doc.querySelector(".custom-breadcrumb-bar h4");
    if (price) {
      price.textContent = p.price + " ";
      const span = doc.createElement("span");
      span.className = "fs-14 fw-normal text-white";
      span.textContent = p.priceSuffix;
      price.append(span);
    }
    text(doc, ".col-xl-8 > .mb-4 strong", p.availableFractions);
    const gallery = p.gallery.length ? p.gallery : [p.cover].filter(Boolean),
      slides = doc.querySelector(".service-slider"),
      thumbs = doc.querySelector(".slider-nav-thumbnails");
    repeat(slides, slides?.firstElementChild, gallery, (el, src) =>
      image(el.querySelector("img"), src, p.title),
    );
    repeat(thumbs, thumbs?.firstElementChild, gallery, (el, src) =>
      image(el.querySelector("img"), src, p.title),
    );
    paragraphs(
      doc.querySelector("#accordion-1 .accordion-body"),
      p.description,
    );
    paragraphs(doc.querySelector("#accordion-3 .accordion-body"), p.about);
    const row = doc.querySelector("#accordion-2 .accordion-body .row");
    repeat(
      row,
      row?.firstElementChild,
      [
        `Bedrooms: ${p.bedrooms}`,
        `Bathrooms: ${p.bathrooms}`,
        ...(p.area ? [`Area: ${p.area}`] : []),
        ...p.amenities,
      ],
      (el, value) => {
        const box = el.querySelector(".buy-property-items");
        if (box) {
          const first = box.querySelector("p");
          box.replaceChildren(first);
          iconText(first, value);
        }
      },
    );
    const stats = doc.querySelectorAll(".counter-list .counting-item h4");
    [p.targetIrr, p.possession, p.rentalYield].forEach((v, i) => {
      if (stats[i]) stats[i].textContent = v;
    });
    image(
      doc.querySelector("#accordion-5 img"),
      p.floorPlan,
      p.title + " floor plan",
    );
    if (!p.floorPlan)
      doc.querySelector("#accordion-5")?.closest(".accordion-item")?.remove();
    const tbody = doc.querySelector(".gallery-body tbody");
    repeat(tbody, tbody?.querySelector("tr"), p.pricing, (el, v) => {
      const cells = el.querySelectorAll("td");
      [v.label, v.total, v.fraction].forEach((s, i) => {
        if (cells[i]) cells[i].textContent = s;
      });
    });
    const video = doc.querySelector("#accordion-7 .video-icon");
    if (video && p.videoUrl) video.href = p.videoUrl;
    else
      doc.querySelector("#accordion-7")?.closest(".accordion-item")?.remove();
    faqs(doc.querySelector("#accordion-8 .faq-items"), p.faqs, "property-faq");
    text(doc, ".buy-details-item .custom-btn h6 a", p.coOwnPrice || p.price);
    iconText(
      doc.querySelector(".buy-details-item .border.p-2 a"),
      `Booking Amount : ${p.bookingAmount}`,
    );
    const enquiry = [...doc.querySelectorAll(".buy-details-item > .card")].find(
      (el) => el.querySelector("h5")?.textContent.trim() === "Enquire Us",
    );
    enquiryForm(doc, enquiry?.querySelector(".card-body"), p.id);
    const booking = doc.querySelector(".custom-breadcrumb-bar a.btn");
    if (booking) booking.href = "#property-enquiry";
    const map = doc.querySelector(".custom-map");
    if (map) {
      map
        .querySelector("iframe")
        ?.setAttribute(
          "src",
          `https://maps.google.com/maps?q=${encodeURIComponent(p.location)}&output=embed`,
        );
      const a = map.querySelector("a");
      if (a) a.href = p.mapUrl || "#";
    }
    const related = doc.querySelector(".custom-properties-items");
    repeat(
      related,
      related?.firstElementChild,
      properties.filter((other) => other.id !== p.id).slice(0, 3),
      (el, other) =>
        el
          .querySelector(".property-card")
          ?.replaceWith(card(originalCard, other)),
    );
    doc.title = p.metaTitle || `${p.title} | ${data.settings.brand}`;
    doc
      .querySelector("meta[name=description]")
      ?.setAttribute("content", p.metaDescription || p.description);
  } else {
    text(
      doc,
      ".banner-content h1",
      data.home.title === "Invest, Earn and Grow"
        ? "Invest Earn and Grow"
        : data.home.title,
    );
    text(doc, ".banner-content p", data.home.description);
    if (
      data.home.image &&
      data.home.image !== "/assets/img/new-home/banner-image.png"
    ) {
      const hero = doc.querySelector(".Home-banner-section");
      if (hero)
        hero.style.backgroundImage = `url("${mediaUrl(data.home.image).replace(/["\\\n\r]/g, "")}")`;
    }
    // Keep the original section order and wrappers; only update CMS content.
    data.home.sections.forEach((s) => {
      const index = Number(s.id.replace("section-", ""));
      editSection(sourceSections[index], s);
    });
    const slider = doc.querySelector(".features-slider"),
      showcase = slider?.closest("section");
    text(showcase, ".section-heading h2", data.home.showcaseTitle);
    text(showcase, ".section-heading p", data.home.showcaseDescription);
    const slideTemplate = slider?.querySelector(".features-slide-card"),
      cardWrapper = slideTemplate?.firstElementChild;
    if (slider && slideTemplate && cardWrapper) {
      slider.replaceChildren();
      const featured = data.featuredIds
        .map((id) => properties.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, 6);
      for (let i = 0; i < featured.length; i += 2) {
        const slide = slideTemplate.cloneNode(false);
        featured.slice(i, i + 2).forEach((p) => {
          const wrapper = cardWrapper.cloneNode(false);
          wrapper.append(card(originalCard, p));
          slide.append(wrapper);
        });
        slider.append(slide);
      }
    }
    const faq = doc.querySelector("#faq-accordion");
    if (faq) {
      faq.closest("section").id = "homepage-faq";
      faqs(faq, data.home.faqs.slice(0, 3), "home-general");
      faqs(
        doc.querySelector("#faq-accordion1"),
        data.home.faqs.slice(3),
        "home-buying",
      );
    }
    if (path === "/properties") {
      doc.querySelectorAll("section").forEach((el) => {
        if (el !== showcase) el.remove();
      });
      text(showcase, ".section-heading h2", data.settings.listingsTitle);
      text(showcase, ".section-heading p", data.settings.listingsDescription);
      slider.className = "row row-gap-4";
      slider.replaceChildren();
      properties.forEach((p) => {
        const col = doc.createElement("div");
        col.className = "col-xl-4 col-md-6 d-flex";
        col.dataset.propertySearch =
          `${p.title} ${p.location} ${p.type}`.toLowerCase();
        col.append(card(originalCard, p));
        slider.append(col);
      });
      const search = doc.createElement("input");
      search.className = "form-control mb-4";
      search.type = "search";
      search.placeholder = "Search properties or location";
      search.setAttribute("aria-label", "Search properties");
      search.dataset.propertyFilter = "";
      slider.before(search);
      const empty = doc.createElement("p");
      empty.dataset.emptyListings = "";
      empty.textContent = "No properties found.";
      empty.hidden = properties.length > 0;
      slider.after(empty);
      doc.title = `${data.settings.listingsTitle} | ${data.settings.brand}`;
    } else if (path !== "/" && path !== "/index.html") {
      const page = data.pages.find(
        (p) => p.slug === path.slice(1) && p.published,
      );
      if (!page) return missing(doc);
      doc.querySelectorAll("section").forEach((el) => el.remove());
      const section = doc.createElement("section");
      section.className = "section-padding";
      section.innerHTML =
        '<div class="container"><div class="section-heading"><h1></h1><p></p></div><div data-page-sections></div></div>';
      text(section, "h1", page.title);
      text(section, ".section-heading p", page.description);
      const region = section.querySelector("[data-page-sections]");
      page.sections
        .filter((s) => s.visible)
        .forEach((s) => {
          const source = sourceSections[Number(s.id.replace("section-", ""))];
          if (source) {
            const clone = source.cloneNode(true);
            editSection(clone, s);
            region.append(clone);
          } else {
            const block = doc.createElement("div");
            block.className = "mb-4";
            const title = doc.createElement("h2");
            title.textContent = s.title;
            block.append(title);
            const body = doc.createElement("div");
            paragraphs(body, s.body);
            block.append(body);
            s.items.forEach((item) => {
              const h = doc.createElement("h5");
              h.textContent = item.title;
              const p = doc.createElement("p");
              p.textContent = item.body;
              block.append(h, p);
            });
            region.append(block);
          }
        });
      if (page.slug === "contact") {
        const original = new DOMParser().parseFromString(
          propertyHtml,
          "text/html",
        );
        const body = [...original.querySelectorAll(".buy-details-item > .card")]
          .find(
            (el) => el.querySelector("h5")?.textContent.trim() === "Enquire Us",
          )
          ?.querySelector(".card-body");
        if (body) {
          const col = doc.createElement("div");
          col.className = "col-lg-6";
          col.append(doc.importNode(body, true));
          region.append(col);
          enquiryForm(doc, col.firstElementChild, null);
        }
      }
      const wrapper = doc.querySelector(".main-wrapper");
      wrapper.insertBefore(section, wrapper.querySelector("footer"));
      doc.title = `${page.title} | ${data.settings.brand}`;
    }
  }
  if (preview)
    doc
      .querySelectorAll("form")
      .forEach((form) =>
        form.querySelectorAll("button").forEach((b) => (b.disabled = true)),
      );
  return serialize(doc);
}

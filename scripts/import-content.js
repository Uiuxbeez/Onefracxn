import { load } from "cheerio";
import { readFileSync, writeFileSync } from "node:fs";
const home = load(readFileSync("legacy/index.html", "utf8"));
const og = load(readFileSync("legacy/skanda.html", "utf8"));
const clean = (s) => s.replace(/\s+/g, " ").trim();
const paragraphs = (sel) =>
  og(sel)
    .find("p")
    .map((_, el) => clean(og(el).text()))
    .get()
    .join("\n\n");
const sections = [];
home("section").each((i, el) => {
  const section = home(el),
    title = clean(section.find("h2").first().text());
  if (!title || /Open for Investments|Portfoilo/.test(title)) return;
  let items = section
    .find("h5, h6")
    .map((_, h) => ({
      title: clean(home(h).text()),
      body: clean(home(h).next("p").text()),
      image: "",
    }))
    .get()
    .filter((x) => x.title);
  if (section.find(".testimonials-item").length)
    items = section
      .find(".testimonials-item")
      .map((_, card) => ({
        title: clean(home(card).find("h6").text()),
        body: clean(home(card).find("p").text()),
        image: "/" + home(card).find("img").attr("src"),
      }))
      .get();
  if (section.find(".partners-items").length)
    items = section
      .find(".partners-items img")
      .map((_, img) => ({
        title: "",
        body: "",
        image: "/" + home(img).attr("src"),
      }))
      .get();
  if (title === "Our Team")
    items = section
      .find(".card-body")
      .map((_, card) => ({
        title: clean(home(card).find("a.fw-semibold").text()),
        body: clean(home(card).find("p").text()),
        image: "/" + home(card).find("img").attr("src"),
      }))
      .get();
  sections.push({
    id: `section-${i}`,
    title,
    body: clean(section.find(".section-heading p").first().text()),
    image: "",
    visible: true,
    items,
  });
});
const faqs = home(".faq-accordion .accordion-item")
  .map((_, el) => ({
    question: clean(home(el).find("button").text()),
    answer: clean(home(el).find(".accordion-body").text()),
  }))
  .get();
const propertyFaqs = og(".faq-card")
  .map((_, el) => ({
    question: clean(og(el).find(".faq-title").text()),
    answer: clean(og(el).find(".faq-content").text()),
  }))
  .get();
const pricing = og(".gallery-body tbody tr")
  .map((_, el) => {
    const cells = og(el).find("td");
    return {
      label: clean(cells.eq(0).text()).replace(/ info$/, ""),
      total: clean(cells.eq(1).text()),
      fraction: clean(cells.eq(2).text()),
    };
  })
  .get();
const seed = {
  settings: {
    listingsTitle: "Our properties",
    listingsDescription: "Extraordinary spaces. A fraction to call your own.",
    brand: "ONE FRACXN",
    tagline: "A fraction of a property. A world of possibilities.",
    email: "",
    phone: "",
    address: "",
    footerTitle: "Ready to Start Your Investment Journey!",
    footerBody: "Explore a different way to own extraordinary places.",
  },
  home: {
    eyebrow: "THOUGHTFUL OWNERSHIP. EXTRAORDINARY PLACES.",
    title: "Invest, Earn and Grow",
    description: clean(home(".banner-content p").first().text()),
    image: "/assets/img/new-home/banner-image.png",
    showcaseTitle: "Open for Investments",
    showcaseDescription:
      "Discover your next property. Choose a fraction that fits your vision.",
    sections: sections.filter((x) => !/Frequently/.test(x.title)),
    faqs,
  },
  pages: [
    {
      slug: "why-onefracxn",
      title: "Why OneFracxn",
      description: "Discover the advantages of fractional property ownership.",
      published: true,
      sections: [
        {
          id: "why",
          title: "More possibilities. Shared ownership.",
          body: "Explore premium holiday homes, choose your fraction, and let a professionally managed property become part of your journey.",
          image: "/assets/img/home/bg/faq-img.jpg",
          visible: true,
          items: [
            {
              title: "Professionally Managed",
              body: "Expert guidance throughout your property journey.",
              image: "",
            },
            {
              title: "Rental Income",
              body: "Explore properties with rental potential.",
              image: "",
            },
            {
              title: "Complimentary Stays",
              body: "Discover the stay benefits available with each property.",
              image: "",
            },
          ],
        },
      ],
    },
    {
      slug: "how-it-works",
      title: "How It Works",
      description: "Your journey to shared property ownership.",
      published: true,
      sections: sections.filter((x) => /How It Works/.test(x.title)),
    },
    {
      slug: "contact",
      title: "Let’s find your next property",
      description: "Tell us what you have in mind. Our team will get in touch.",
      published: true,
      sections: [],
    },
  ],
  properties: [
    {
      id: "skanda-1",
      slug: "skanda-1",
      title: "Skanda-1",
      location: "Poonamallee, Chennai, India",
      type: "Apartment",
      status: "Live",
      published: true,
      price: "₹1Lac",
      priceSuffix: "/ Fraction",
      totalFractions: 50,
      availableFractions: 41,
      bedrooms: 3,
      bathrooms: 2,
      area: "",
      description: paragraphs("#accordion-1 .accordion-body"),
      about: paragraphs("#accordion-3 .accordion-body"),
      amenities: [
        "Gym",
        "Swimming Pool",
        "Power Backup",
        "Clubhouse",
        "Visitor Parking",
        "Natural Light",
        "Airy Rooms",
        "Spacious Interior",
      ],
      gallery: Array.from(
        { length: 6 },
        (_, i) => `/assets/img/buy/buy-slide-img-${i + 1}.jpg`,
      ),
      cover: "/assets/img/buy/buy-grid-img-01.jpg",
      floorPlan: "/assets/img/gallery/floor-plan.jpeg",
      videoUrl: "https://www.youtube.com/embed/AWovHEZcpQU",
      mapUrl:
        "https://www.google.com/maps/search/?api=1&query=Poonamallee%20Chennai",
      targetIrr: "16%",
      rentalYield: "6–8%",
      possession: "Aug 2026",
      coOwnPrice: "₹5,30,272",
      bookingAmount: "₹1,16,820",
      pricing,
      faqs: propertyFaqs,
      metaTitle: "Skanda-1 | OneFracxn",
      metaDescription: "Explore Skanda-1 in Poonamallee, Chennai.",
      internalNotes:
        "Imported from original skanda.html. Review before launch: description mentions New York; homepage bedrooms differ; fraction price, co-own price and cost breakdown differ. Original source retained in legacy/. Repeated homepage cards are the same property, not distinct listings.",
    },
  ],
  featuredIds: ["skanda-1"],
};
writeFileSync("server/seed.json", JSON.stringify(seed, null, 2) + "\n");

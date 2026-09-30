import { z } from "zod";
const text = z.string().max(20000);
const short = z.string().max(300);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
export const url = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      !v ||
      /^\/assets\/img\/[\w/ .-]+$/.test(v) ||
      /^\/api\/media\/[a-f0-9-]+$/.test(v) ||
      /^https:\/\/[^\s]+$/.test(v),
    "Use an HTTPS URL or an existing image path",
  );
const link = z.string().max(2000).refine(
  (v) =>
    !v ||
    /^https:\/\/[^\s]+$/.test(v) ||
    /^\/(?!\/)[^\s]*$/.test(v) ||
    /^#[\w-]+$/.test(v),
  "Use an HTTPS URL or an internal site path",
);
const item = z.object({
  title: short,
  body: text,
  image: url,
  link: link.optional().default(""),
});
const section = z.object({
  id: short.min(1),
  title: short,
  body: text,
  image: url,
  visible: z.boolean(),
  items: z.array(item).max(100),
});
const faq = z.object({ question: short, answer: text });
export const propertySchema = z
  .object({
    id: slug,
    slug,
    title: short.min(1),
    location: short,
    type: short.min(1),
    status: z.enum(["Live", "Coming soon", "Sold out"]),
    published: z.boolean(),
    price: short,
    priceSuffix: short,
    totalFractions: z.number().int().min(1).max(1000000),
    availableFractions: z.number().int().min(0),
    bedrooms: z.number().int().min(0).max(1000),
    bathrooms: z.number().int().min(0).max(1000),
    area: short,
    description: text,
    about: text,
    amenities: z.array(short).max(100),
    gallery: z.array(url).max(30),
    cover: url,
    floorPlan: url,
    videoUrl: url,
    mapUrl: url,
    targetIrr: short,
    rentalYield: short,
    possession: short,
    coOwnPrice: short,
    bookingAmount: short,
    pricing: z
      .array(z.object({ label: short, total: short, fraction: short }))
      .max(100),
    faqs: z.array(faq).max(100),
    metaTitle: short,
    metaDescription: short,
    internalNotes: text,
  })
  .refine(
    (p) => p.availableFractions <= p.totalFractions,
    "Available fractions cannot exceed total fractions",
  )
  .superRefine((p, ctx) => {
    if (p.published && !p.location.trim())
      ctx.addIssue({ code: "custom", path: ["location"], message: "Required for published properties" });
    if (p.published && !p.price.trim())
      ctx.addIssue({ code: "custom", path: ["price"], message: "Required for published properties" });
  });
export const contentSchema = z
  .object({
    settings: z.object({
      listingsTitle: short.min(1),
      listingsDescription: text,
      brand: short.min(1),
      tagline: text,
      email: z.union([z.literal(""), z.email()]),
      phone: short,
      address: text,
      footerTitle: short,
      footerBody: text,
    }),
    home: z.object({
      eyebrow: short,
      title: short.min(1),
      description: text,
      image: url,
      showcaseTitle: short,
      showcaseDescription: text,
      sections: z.array(section).max(50),
      faqs: z.array(faq).max(100),
    }),
    pages: z
      .array(
        z.object({
          slug,
          title: short.min(1),
          description: text,
          published: z.boolean(),
          sections: z.array(section).max(50),
        }),
      )
      .max(30),
    properties: z.array(propertySchema).max(500),
    featuredIds: z.array(slug).max(6),
  })
  .superRefine((data, ctx) => {
    const fail = (message) => ctx.addIssue({ code: "custom", message });
    for (const key of ["id", "slug"])
      if (
        new Set(data.properties.map((p) => p[key])).size !==
        data.properties.length
      )
        fail(`Property ${key} values must be unique`);
    if (new Set(data.pages.map((p) => p.slug)).size !== data.pages.length)
      fail("Page URLs must be unique");
    if (
      data.pages.some((p) =>
        ["admin", "properties", "preview", "api"].includes(p.slug),
      )
    )
      fail("This page URL is reserved");
    if (new Set(data.featuredIds).size !== data.featuredIds.length)
      fail("Showcase properties cannot repeat");
    if (
      data.featuredIds.some(
        (id) => !data.properties.some((p) => p.id === id && p.published),
      )
    )
      fail("Only published properties can be selected for the homepage");
  });
export function publicContent(data) {
  return {
    ...data,
    properties: data.properties
      .filter((p) => p.published)
      .map(({ internalNotes, ...p }) => p),
    pages: data.pages.filter((p) => p.published),
  };
}

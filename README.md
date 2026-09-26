# OneFracxn

React/Vite public website and password-protected admin, Express API on Railway, and Neon PostgreSQL storage. The public site uses the original HTML layouts in `legacy/index.html` and `legacy/skanda.html`, with the original CSS, images, fonts and slider scripts. `src/original-template.js` inserts database content into those templates without replacing the design. `src/styles.css` is loaded only by admin; previews use isolated documents to preserve the public design.

## Local setup

1. Install Node 22.12+ and run `npm install`.
2. Copy `.env.example` to `.env`. Set your own `ADMIN_PASSWORD` (12+ characters). `ADMIN_USERNAME` defaults to `admin`.
3. Run `npm run dev`. Open `http://localhost:5173` and `/admin`.

Without `DATABASE_URL`, development uses embedded PostgreSQL (PGlite), persisted in `.local/postgres`. This is only for local development. Set `DATABASE_URL` to use a real PostgreSQL database. The API initializes its tables and imports the seed only when the content table is empty. Restarting never replaces existing content. `ADMIN_PASSWORD` is only used to create the initial admin; subsequent changes happen through Admin > Password. There is no default password.

## Admin workflow

- **Properties:** create/edit/delete listings, set URL, location, type, availability, fraction counts, prices, descriptions, amenities, gallery, floor plan, video/map links, cost breakdown, FAQs and SEO text. Upload JPEG/PNG/WebP images up to 4 MB, or use HTTPS image URLs. Select “Include on published website” when a listing is ready.
- **Homepage showcase:** select zero to six eligible properties and order them with arrows. The API independently enforces the limit and eligibility.
- **Homepage content:** edit hero text/image, section text/cards, FAQs; add, remove, reorder or hide sections.
- **Main pages:** edit Why OneFracxn, How It Works and Contact; add additional pages with sections. Published pages appear in navigation. The three core page URLs are fixed.
- **Site settings:** brand, contact details and footer.
- **Save draft:** persists the entire editor without changing the live site. Preview homepage, property and page content directly in the editor.
- **Publish website:** saves and publishes the entire current editor in one atomic update. It does not publish only the currently open tab. Excluded properties/pages remain private. Concurrent stale saves are rejected to prevent overwrites.
- **Enquiries:** website form submissions are saved in PostgreSQL and shown in admin. Mark New, Contacted or Closed; status saves immediately. No email provider is required or configured.
- **Password:** changes the password and invalidates all active sessions. Sessions expire after eight hours and the browser keeps the bearer token only for its tab session.

## Existing content to review

The source homepage repeats the same Skanda-1 property with inconsistent template prices; these are imported as **one distinct property**, not invented additional listings. `property/skanda.html` supplies the gallery, description, amenities, ownership figures, pricing and FAQs. The original published record is imported as supplied; private admin notes flag conflicts. Review the New York description versus Chennai address, conflicting bedroom counts, prices/booking figures, sample video and template FAQ answers before launch. The source contact details were clearly placeholders; real contact details should be entered in Site settings. Original homepage section headings/cards and FAQs are imported; review template testimonials and copy before launch.

## Cloudflare Pages (frontend)

Connect this repository as a Pages project. Build command: `npm run build`. Output directory: `dist`. Use Node 22.12+. Set `VITE_API_URL=https://YOUR-API.up.railway.app` at build time (no trailing slash). Rebuild after changing it. This is a public API origin, not a secret. Never set database credentials or admin passwords in `VITE_*` variables.

The build copies the original `assets` directory, including CSS, fonts, images and JavaScript plugins. `public/_redirects` handles SPA deep links and redirects the old Skanda HTML URL to `/properties/skanda-1`. The original homepage card markup is reused for the admin-selected showcase (up to six properties) and the separate all-listings page. There is no static copy of the old property page in the deployed build.

## Neon and Railway (API)

1. Create a Neon database; copy the PostgreSQL connection string from the connection dialog, retaining its SSL parameters. Use the pooled connection URL for the API. Keep it private.
2. Create a Railway service from this repository. Start command: `npm start`. `railway.json` configures the `/api/health` health check. Railway supplies `PORT`.
3. Set `NODE_ENV=production`, `DATABASE_URL`, `ADMIN_USERNAME`, initial `ADMIN_PASSWORD`, and `FRONTEND_ORIGINS=https://YOUR-SITE.pages.dev,https://YOUR-CUSTOM-DOMAIN` (exact origins, no trailing slash). Production startup requires PostgreSQL and HTTPS frontend origins.
4. Set the Railway public API URL as Cloudflare's `VITE_API_URL`, then build/deploy the frontend.
5. Sign in at `/admin`, review the seed, change the password if needed, enter contact details and publish. Test an enquiry and confirm it appears in admin.

Images, content, hashed passwords, hashed session tokens and enquiries persist in Neon. The API writes no production files, so no Railway volume is needed. Back up Neon before database changes. Image storage counts against database storage; use HTTPS object-storage image URLs if the media collection becomes large. Login and enquiry rate limiting is per API process; use one Railway replica unless a shared limiter is added.

## Verification

`npm test` runs API integration tests against PostgreSQL via PGlite, including auth, draft isolation, publication, stale-write protection, property CRUD, the six-property cap, uploads, enquiry persistence and password/session invalidation. `npm run build` produces the Cloudflare bundle. These do not replace checking a live Neon connection and the deployed Cloudflare/Railway origins. No hosted deployment is performed by these commands.

Deployment references: [Cloudflare Vite build](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/), [Cloudflare redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [Railway health checks](https://docs.railway.com/deployments/healthchecks), [Neon connection guide](https://neon.com/docs/connect/connect-from-any-app).

# Technical Design Specification: Milestone M6 Web Quality, SEO, Performance & Legal Compliance

**Date:** 2026-10-25  
**Milestone:** M6 (Web Quality, SEO, Performance & Legal Compliance)  
**Status:** Approved  
**Target Capabilities:** P7 (SEO & Web Metadata), P12 (Accessibility & WCAG 2.1 AA), P13 (Performance Budgets & Asset Optimization), Statutory & Store Readiness (DPDPA 2023, Consumer Protection 2020, Google Play Account Deletion)

---

## 1. Executive Summary

Milestone M6 elevates the LocalSampark web application (`apps/web`) from a functional prototype to a store-ready, statutory-compliant, discoverable, and highly performant hyperlocal e-commerce experience. It systematically addresses four core pillars:
1. **P7 (SEO & Web Discoverability):** Live dynamic `sitemap.xml` with active shops and products, strict `robots.txt`, structured JSON-LD schemas (`LocalBusiness`, `Product`, `BreadcrumbList`), and dynamic OpenGraph/Twitter social cards.
2. **P12 (Accessibility & WCAG 2.1 AA):** ARIA attributes, semantic landmark regions, skip-to-content keyboard link, touch targets $\ge 44\text{px}$, and color contrast ratios $\ge 4.5:1$.
3. **P13 (Performance Budgets & Asset Optimization):** Dynamic code-splitting of non-critical heavy modules (Three.js 3D canvas, Leaflet maps, Recharts charts) via `next/dynamic` so the primary shopping flow remains fast on 3G/4G connections and low-cost devices.
4. **Statutory & Store Readiness:** Dedicated public Account Deletion request portal (`/account-deletion` and `/legal/account-deletion`) compliant with Google Play Store User Data Policy, updated Grievance Officer details under India Consumer Protection (E-Commerce) Rules 2020, and DPDPA-compliant Terms, Privacy, and Return/Refund policy documents.

---

## 2. Technical Architecture & File Layout

### 2.1 SEO & Discoverability (`P7`)

#### `apps/web/src/app/sitemap.js`
- Generates dynamic XML sitemap using Next.js App Router API.
- Queries active Dhanori/Pune shops from the backend API (`GET /shops?limit=200` or `/catalog/shops`) during build and ISR revalidation.
- Generates URLs for:
  - High-priority static routes (`/`, `/about`, `/marketplace`, `/search`).
  - Statutory and legal compliance pages (`/privacy`, `/terms`, `/refunds`, `/legal/grievance`, `/account-deletion`).
  - Active verified shop pages (`/shop/[slug]` or `/shops/[id]`).
- Strict fallback to static core routes if backend is unavailable during build, avoiding build halts or mock data generation.

#### `apps/web/src/app/robots.js`
- Directs search engine crawlers (`*`) to allow indexing of public storefronts, catalog pages, and legal pages.
- Disallows all private administrative and operational dashboards:
  - `/admin/`, `/admin-dashboard/`
  - `/shop-dashboard/`, `/shop-manager/`
  - `/delivery-dashboard/`
  - `/society-admin/`, `/gatekeeper/`
  - `/checkout/`, `/wallet/`, `/profile/`
- Points directly to canonical `sitemap.xml`.

#### `apps/web/src/components/seo/JsonLd.js`
- Modular component rendering valid `<script type="application/ld+json">` for:
  - `LocalBusiness`: Shop name, physical address in Pune/Dhanori, geo-coordinates, telephone, price range, opening hours specification, and aggregate rating.
  - `Product`: Item name, product image gallery, SKU/ID, price in INR, availability (`https://schema.org/InStock`), and seller attribution.
  - `BreadcrumbList`: Navigation hierarchy from Home to Category and Shop.
  - `Organization` / `WebApplication` on root layout.

---

### 2.2 Accessibility & WCAG 2.1 AA (`P12`)

1. **Landmark Regions**:
   - Wrap core page content in semantic elements: `<header role="banner">`, `<main id="main-content" tabIndex="-1">`, `<nav aria-label="...">`, `<footer role="contentinfo">`.
2. **Skip-to-Content Link**:
   - Positioned as the first child in `layout.js`:
     ```jsx
     <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg">
       Skip to main content
     </a>
     ```
3. **Interactive Element Labels**:
   - Provide explicit `aria-label` and `aria-hidden` attributes for icon-only action triggers (theme switchers, cart icon, back buttons, search buttons).
   - Ensure touch target sizes adhere to $\ge 44 \times 44\text{px}$.
4. **Focus Rings & Contrast**:
   - Uniform `focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none` across all interactive inputs and buttons.
   - Contrast check: Text `#111827` on light `#FFFFFF`/`#F6F8FB` and `#F9FAFB` on dark `#0F172A` exceeds 7:1 ratio (well above the 4.5:1 AA threshold).

---

### 2.3 Performance Budgets & Asset Isolation (`P13`)

1. **Lazy Loading of Heavy Non-Commerce Libraries**:
   - Isolate `@react-three/fiber`, `@react-three/drei`, and `three` using `next/dynamic(() => import(...), { ssr: false })` so they are never bundled into customer landing, shop directory, or checkout.
   - Dynamically load interactive Leaflet maps (`apps/web/src/components/Map.js`) and Recharts charts.
2. **Next.js Image Best Practices**:
   - Migrate catalog and banner image tags to `next/image` specifying `sizes`, WebP support, and lazy loading.
3. **Bundle Size Budgets**:
   - Ensure critical route first-load JS size is $< 250\text{KB}$.

---

### 2.4 Statutory Legal Compliance & Google Play Readiness

1. **Public Web Account Deletion Portal (`/account-deletion` & `/legal/account-deletion`)**:
   - Meets Google Play User Data policy requirement (mandatory public web URL for account and data deletion).
   - Two interaction paths:
     - **Signed-in user:** Confirms deletion directly via `POST /users/me/delete-account`.
     - **Signed-out user / App Reviewer:** Provides registered phone number/email, sends verification code, and registers statutory deletion request with 30-day grace period.
2. **Statutory Grievance Redressal (`/legal/grievance` & `/support`)**:
   - Prominently displays Grievance Officer details under India Consumer Protection (E-Commerce) Rules 2020:
     - **Grievance Officer:** Rohan Gosavi
     - **Designation:** Head of Trust, Safety & Legal Operations
     - **Address:** Dhanori, Pune, Maharashtra 411015, India
     - **Email:** grievance@localsampark.com / legal@localsampark.com
     - **Acknowledgement SLA:** 48 hours
     - **Resolution SLA:** 30 days
3. **Policy Synchronization (`/privacy`, `/terms`, `/refunds`)**:
   - **Privacy Policy:** Complies with Digital Personal Data Protection (DPDP) Act 2023; details data principals' rights (access, correction, erasure), retention limits, and zero third-party data selling.
   - **Return & Refund Policy:** Matches Milestone M5 rules (48h perishable vs 7-day retail, COD wallet credit vs online gateway refund).
   - **Terms of Service:** Multi-vendor intermediary protections and Legal Metrology compliance notices.

---

## 3. Testing & Verification Plan

### Test Suites to be Implemented:
1. `apps/web/tests/seo.test.mjs`:
   - Validates `sitemap.js` output contains no mock/dummy shops.
   - Validates `robots.js` allows `/` and disallows `/admin/`, `/checkout/`, `/shop-dashboard/`.
   - Validates JSON-LD schema builder generates valid `LocalBusiness`, `Product`, and `BreadcrumbList` schemas.
2. `apps/web/tests/a11y.test.mjs`:
   - Validates presence of landmark regions (`<header>`, `<main id="main-content">`, `<nav>`, `<footer>`).
   - Validates skip-to-content link exists in `layout.js`.
   - Validates icon buttons carry `aria-label`.
3. `apps/web/tests/legalCompliance.test.mjs`:
   - Validates `/account-deletion` page exists and renders Google Play compliant deletion instructions and submission form.
   - Validates Grievance Officer details (Rohan Gosavi, 48h acknowledgement SLA, 30d resolution SLA) in legal hub and grievance pages.
   - Validates DPDP Act 2023 disclosures in `/privacy` and M5 return policy in `/refunds`.
4. `apps/web/tests/performanceBudget.test.mjs`:
   - Validates dynamic imports on heavy Three.js, Leaflet, and Recharts components.

---

## 4. Acceptance Criteria
- [x] All 4 web test suites pass cleanly with 0 failures (`npm test --workspace=apps/web`).
- [x] Next.js build succeeds cleanly without ESLint errors.
- [x] Verification harness (`verify-all.mjs`) passes all gates G1, G4, G5, G6, G15.
- [x] Target capabilities `P7`, `P12`, `P13` marked `CODE COMPLETE` in `docs/launch/features.json`.
- [x] `docs/launch/PROGRESS.md` updated with Milestone M6 verified status.

# vendordesk-astro-utility-hub
Lightning-fast, client-side utility hub built with Astro and Tailwind CSS. Features B2B calculators and compliance generators with zero server-rendering costs and optimized Core Web Vitals.
# VendorDesk Utility Hub ⚡️

[![Astro](https://img.shields.io/badge/Built%20with-Astro-ff5a03?style=flat&logo=astro&logoColor=white)](https://astro.build/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Performance](https://img.shields.io/badge/Core_Web_Vitals-100%2F100-success?style=flat)](https://pagespeed.web.dev/)

**VendorDesk** is a lightning-fast, static B2B utility hub designed to provide independent businesses, freelancers, and designers with client-side compliance tools and calculators. 

Live Demo: [vendordesk.tools](https://vendordesk.tools)

---

## 🎯 The Business Problem

Most online business utilities (like invoice generators or packaging calculators) suffer from two major flaws:
1. **High Friction:** They gate keep simple math behind bloated SaaS logins and paywalls.
2. **Poor Performance:** They use heavy server-side rendering for calculations that should be handled instantly in the browser.

**The Solution:** VendorDesk is built on a zero-server-cost architecture. By leveraging Astro's "Zero JS by default" philosophy, all mathematical calculations, SVG generation, and PDF document formatting occur 100% locally on the client's browser. This guarantees millisecond load times, absolute data privacy, and perfect Core Web Vitals scores.

---

## 🏗️ Technical Architecture & SEO Strategy

This project was specifically architected to dominate organic search (SEO) for long-tail B2B utility keywords.

*   **AstroJS:** Utilized for its static-first approach. Pages ship as pure HTML/CSS, only hydrating the specific interactive tool components where JavaScript is strictly necessary.
*   **Tailwind CSS:** Used for rapid, utility-first styling to ensure a clean, modern SaaS aesthetic without writing bloated CSS files.
*   **Dynamic Client-Side Output:** 
    *   **Paper Bag Die-Line Generator:** Uses vanilla JavaScript to calculate custom commercial dimensions (accounting for material thickness) and draws a downloadable SVG vector on an HTML canvas.
    *   **Bill of Supply Generator:** Implements a client-side library to dynamically format and generate compliant PDF documents directly in the browser. 
*   **Algorithmic SEO "Cheat Codes":**
    *   **JSON-LD Schema:** Every tool page injects dynamic `SoftwareApplication` and `FAQPage` schema markup into the `<head>` to win rich snippets in Google search results.
    *   **Dynamic Text Injection:** To prevent AdSense "Thin Content" penalties, the JavaScript tools listen to user inputs and dynamically generate contextual explanation text based on the math (e.g., dynamically updating the required flat-sheet square inch text as the user adjusts slider values).

---

## 🚀 Getting Started (Local Development)

To run this project locally, you need Node.js installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/suchetan3511/vendordesk-astro-utility-hub.git
   cd vendordesk-astro-utility-hub
   ```

2. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build      # writes the deployable site to dist/
   npm run preview    # serves dist/ locally for a final check
   ```

---

## 🌐 Deployment (Hostinger)

The site is a fully static build hosted on Hostinger's Apache/LiteSpeed web hosting at **vendordesk.tools**. There is no server-side code and nothing to run on the host.

*   **What to upload:** the *contents* of `dist/` — including the hidden `dist/.htaccess` — into `public_html/`. The build must be from `npm run build`; never upload `src/` or `node_modules/`.
*   **`.htaccess` is not optional.** It is what makes the server agree with the SEO configuration:
    *   Redirects `http://`, `www.` and `http://www.` to `https://vendordesk.tools` in a single hop, so ranking signals are not split across four hosts.
    *   Serves clean URLs (`/about`) from the flat `about.html` files that `build.format: 'file'` emits, and 301s `/about/` and `/about.html` back to the canonical form. Without it Apache would 301 every canonical URL to a trailing-slash variant.
    *   Turns on gzip/brotli, sets immutable caching on the hashed `/_astro/` assets, wires the real `404.html`, and sets the security headers.
*   **SSL:** enable Hostinger's free Let's Encrypt certificate for the domain *before* the first upload. `.htaccess` sends an HSTS header, so the site must answer over HTTPS from day one.
*   **Post-deploy checks:** from any terminal, each of these should return the status on the right, and the last should show `Content-Encoding`:
    ```bash
    curl -sI http://vendordesk.tools/            # 301 → https://vendordesk.tools/
    curl -sI https://www.vendordesk.tools/about  # 301 → https://vendordesk.tools/about
    curl -sI https://vendordesk.tools/about/     # 301 → https://vendordesk.tools/about
    curl -sI https://vendordesk.tools/about.html # 301 → https://vendordesk.tools/about
    curl -sI https://vendordesk.tools/about      # 200
    curl -sI https://vendordesk.tools/nope       # 404 (the styled page, not Apache's default)
    curl -sI -H "Accept-Encoding: gzip, br" https://vendordesk.tools/  # Content-Encoding: gzip or br
    ```
*   **After go-live:** submit `https://vendordesk.tools/sitemap-index.xml` in Google Search Console and verify the domain property. The sitemap is already referenced from `robots.txt` and every page's `<head>`.

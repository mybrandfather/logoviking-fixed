# LogoViking

LogoViking is a React/Vite creator, image, design, and SEO toolkit focused on practical web utilities.

## Current direction
- No AI image generator
- No AI logo generator
- Core browser utilities are free
- No live paid checkout or credit sales
- Google Analytics: G-TW18DKF0FZ
- Microsoft Clarity: y2aph4d480
- Canonical production domain: https://www.logoviking.com

## Build
```bash
npm install
npm run build
```
The build runs Vite and then `scripts/prerender.mjs`, which creates crawlable static HTML for public tool, category, blog, and trust pages plus consistent sitemaps.

## Deployment
Deploy to Vercel with the project root set to this repository root. The production domain should redirect non-www to `https://www.logoviking.com`.

## SEO
Public URLs are pre-rendered with unique metadata, canonical URLs, route-specific content/schema, and sitemap entries. Account/credits/dashboard routes are noindex.

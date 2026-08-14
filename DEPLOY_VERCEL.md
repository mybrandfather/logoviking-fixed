# LogoViking Vercel Deployment

1. Back up the current production deployment.
2. Install dependencies with `npm install`.
3. Run `npm run build`.
4. Confirm the build creates `dist/` and route HTML files.
5. Deploy a Vercel Preview first.
6. Test `/`, `/tools/compress-image`, `/tools/gif-to-video`, `/tools/qr-code-generator`, `/tools/favicon-generator`, `/blog/png-vs-jpg-explained`, `/robots.txt`, `/sitemap.xml`, and an intentionally invalid URL.
7. Confirm invalid URLs return the real 404 page rather than the homepage shell.
8. Confirm `https://logoviking.com/...` permanently redirects to `https://www.logoviking.com/...`.
9. Confirm Google Analytics realtime receives a test visit (`G-TW18DKF0FZ`).
10. Confirm Microsoft Clarity receives a test visit (`y2aph4d480`).
11. Promote the Preview to Production only after these checks pass.

No Stripe/payment setup is required for this release; paid plans and credit sales are not live.

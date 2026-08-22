import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogoVikingServer } from '../server.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const reportDir = path.join(root, 'reports');
const origin = 'https://www.logoviking.com';
if (!fs.existsSync(path.join(dist, 'sitemap.xml'))) throw new Error('Build output missing. Run npm run build first.');

const server = createLogoVikingServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

function request(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, headers }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

try {
  const xml = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  const pages = [];
  const linkedPaths = new Set();
  const placeholder = /(?::slug|:page|:mode|\{search|\/&(?:\/|$)|\/\*)/i;

  for (const url of urls) {
    const parsed = new URL(url);
    const response = await request(parsed.pathname);
    const canonical = response.body.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
    const robots = response.body.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? null;
    for (const match of response.body.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
      if (/^(?:#|mailto:|tel:)/.test(match[1])) continue;
      const linked = new URL(match[1], origin);
      if (linked.origin === origin) linkedPaths.add(linked.pathname);
    }
    pages.push({ url, status: response.status, canonical, indexable: response.status === 200 && !/noindex/i.test(robots ?? ''), redirectTarget: response.headers.location ?? null, robots });
  }

  const linkChecks = [];
  for (const pathname of [...linkedPaths].sort()) {
    const response = await request(pathname);
    linkChecks.push({ pathname, status: response.status, redirectTarget: response.headers.location ?? null, placeholder: placeholder.test(pathname) });
  }

  const redirectInputs = [
    ['http apex', '/about?x=1', { Host: 'logoviking.com', 'X-Forwarded-Proto': 'http' }],
    ['http www', '/about', { Host: 'www.logoviking.com', 'X-Forwarded-Proto': 'http' }],
    ['legacy apex', '/subscription', { Host: 'logoviking.com', 'X-Forwarded-Proto': 'http' }],
    ['legacy tool', '/tools/ai-smart-image-optimizer', { Host: 'www.logoviking.com', 'X-Forwarded-Proto': 'https' }],
    ['trailing slash', '/tools/', {}],
  ];
  const redirects = [];
  for (const [name, pathname, headers] of redirectInputs) {
    const response = await request(pathname, headers);
    redirects.push({ name, pathname, status: response.status, target: response.headers.location ?? null });
  }

  const invalidPaths = ['/tools/edit', '/tools/:slug', '/categories/:slug', '/:page', '/auth/:mode', '/path/', '/*', '/&', '/month', '/definitely-not-a-page'];
  const invalid = [];
  for (const pathname of invalidPaths) invalid.push({ pathname, status: (await request(pathname)).status });

  const problems = {
    non200SitemapUrls: pages.filter(page => page.status !== 200),
    canonicalMismatches: pages.filter(page => page.canonical !== page.url),
    nonIndexableSitemapUrls: pages.filter(page => !page.indexable),
    brokenLinks: linkChecks.filter(link => link.status >= 400),
    redirectingLinks: linkChecks.filter(link => link.status >= 300 && link.status < 400),
    placeholderLinks: linkChecks.filter(link => link.placeholder),
    invalidPathsNot404: invalid.filter(item => item.status !== 404),
  };
  const report = { generatedAt: new Date().toISOString(), canonicalOrigin: origin, pages, linkChecks, redirects, invalid, problems };
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'seo-crawl.json'), `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    '# LogoViking built-site SEO crawl', '', `Generated: ${report.generatedAt}`, '',
    `Sitemap pages: ${pages.length}; status/canonical/indexability failures: ${problems.non200SitemapUrls.length + problems.canonicalMismatches.length + problems.nonIndexableSitemapUrls.length}; broken internal links: ${problems.brokenLinks.length}; placeholder links: ${problems.placeholderLinks.length}.`, '',
    '| URL | Status | Canonical | Indexable | Redirect target |', '|---|---:|---|:---:|---|',
    ...pages.map(page => `| ${page.url} | ${page.status} | ${page.canonical ?? ''} | ${page.indexable ? 'yes' : 'no'} | ${page.redirectTarget ?? ''} |`), '',
    '## Redirect checks', '', '| Case | Request | Status | Target |', '|---|---|---:|---|',
    ...redirects.map(item => `| ${item.name} | ${item.pathname} | ${item.status} | ${item.target ?? ''} |`), '',
    '## Invalid-route checks', '', '| Path | Status |', '|---|---:|',
    ...invalid.map(item => `| ${item.pathname.replaceAll('|', '\\|')} | ${item.status} |`), '',
  ];
  fs.writeFileSync(path.join(reportDir, 'seo-crawl.md'), `${lines.join('\n')}\n`);

  const problemCount = Object.values(problems).reduce((sum, items) => sum + items.length, 0);
  console.log(`Crawled ${pages.length} sitemap URLs and ${linkChecks.length} linked internal paths.`);
  console.log(`Problems: ${problemCount}. Report: reports/seo-crawl.md`);
  if (problemCount) process.exitCode = 1;
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

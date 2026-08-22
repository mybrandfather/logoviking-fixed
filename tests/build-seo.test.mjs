import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createLogoVikingServer } from '../server.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(root, 'scripts/seo-data.json'), 'utf8'));
const origin = 'https://www.logoviking.com';
const locs = xml => [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
const readDist = file => fs.readFileSync(path.join(dist, file), 'utf8');
const routeFile = pathname => pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`;

test('sitemap inventory is complete, unique, concrete, and canonical', () => {
  assert.deepEqual(locs(readDist('sitemap-index.xml')), [
    `${origin}/sitemap-pages.xml`, `${origin}/sitemap-tools.xml`,
    `${origin}/sitemap-categories.xml`, `${origin}/sitemap-blog.xml`,
  ]);
  const urls = locs(readDist('sitemap.xml'));
  const expected = 14 + data.tools.length + new Set(data.tools.map(tool => tool.category)).size + data.blogs.length;
  assert.equal(urls.length, expected);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, origin);
    assert.equal(parsed.search + parsed.hash, '');
    assert.doesNotMatch(parsed.pathname, /[:*{}\\]|\/&(?:\/|$)/);
    assert.ok(fs.existsSync(path.join(dist, routeFile(parsed.pathname))), `missing ${parsed.pathname}`);
  }
  assert.equal((readDist('sitemap.xml').match(new RegExp(`<lastmod>${data.lastModified}<\\/lastmod>`, 'g')) ?? []).length, urls.length);
});

test('every sitemap page is self-canonical, indexable, and prerendered', () => {
  for (const url of locs(readDist('sitemap.xml'))) {
    const parsed = new URL(url);
    const html = readDist(routeFile(parsed.pathname));
    assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1], url);
    assert.match(html, /<meta name="robots" content="index, follow/);
    assert.match(html, /<meta name="googlebot" content="index, follow/);
    assert.match(html, /<h1\b[^>]*>.+?<\/h1>/s);
    assert.ok(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length > 180, `thin ${parsed.pathname}`);
    assert.doesNotMatch(html, /https:\/\/logoviking\.com(?:[\/'"]|$)/i);
    assert.doesNotMatch(html, /(?:href|url|urlTemplate)[=:]["'][^"']*(?::slug|:page|:mode|\{search|\/&(?:\/|$)|\/\*)/i);
  }
});

test('private pages, 404, and former soft-404 examples have correct outcomes', () => {
  for (const route of ['/credits', '/dashboard', '/account', '/settings', '/auth/login', '/auth/register']) {
    const html = readDist(routeFile(route));
    for (const bot of ['robots', 'googlebot', 'bingbot']) assert.match(html, new RegExp(`<meta name="${bot}" content="noindex, nofollow"`));
  }
  const notFound = readDist('404.html');
  assert.match(notFound, /<meta name="robots" content="noindex"/);
  assert.doesNotMatch(notFound, /rel="canonical"/);
  const article = readDist('blog/png-vs-jpg-explained.html');
  assert.match(article, /PNG and JPG solve different problems/);
  assert.match(article, /Which is better for a website\?/);
  assert.ok(!fs.existsSync(path.join(dist, 'tools/edit.html')));
});

const server = createLogoVikingServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
test.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

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

test('production server serves real routes and 404s invalid dynamic routes', async () => {
  for (const route of ['/', '/about', '/tools/compress-image', '/blog/png-vs-jpg-explained']) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
  }
  for (const route of ['/tools/edit', '/tools/:slug', '/categories/:slug', '/auth/:mode', '/path/', '/*', '/&', '/month', '/definitely-not-a-page']) {
    const response = await request(route);
    assert.equal(response.status, 404, route);
    assert.match(response.body, /Page not found/);
  }
});

test('query variants canonicalize cleanly and redirects are one-hop 308s', async () => {
  for (const route of ['/tools?q=test', '/tools?q=%7Bsearch_term_string%7D', '/?lang=fr', '/about?lang=de']) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    assert.doesNotMatch(response.body.match(/rel="canonical" href="([^"]+)/)?.[1] ?? '', /\?/);
  }
  const cases = [
    ['/about?x=1', { Host: 'logoviking.com', 'X-Forwarded-Proto': 'http' }, `${origin}/about?x=1`],
    ['/subscription', { Host: 'logoviking.com', 'X-Forwarded-Proto': 'http' }, `${origin}/pricing`],
    ['/tools', { Host: 'www.logoviking.com', 'X-Forwarded-Proto': 'http' }, `${origin}/tools`],
    ['/tools/', {}, '/tools'], ['/about.html', {}, '/about'],
  ];
  for (const [pathname, headers, target] of cases) {
    const response = await request(pathname, headers);
    assert.equal(response.status, 308, pathname);
    assert.equal(response.headers.location, target);
  }
});

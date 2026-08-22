import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const origin = 'https://www.logoviking.com';

test('base metadata exposes only canonical, clean public URLs', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.logoviking\.com\/"/);
  assert.doesNotMatch(html, /SearchAction|search_term_string|hreflang|og:locale:alternate|favicon\.ico/);
  assert.doesNotMatch(html, /href="https:\/\/logoviking\.com/i);
  assert.doesNotMatch(html, /href="[^"#]*(?::slug|:page|:mode|\{search|\/&(?:"|\/)|\/\*)/i);
});

test('robots rules protect private routes without crawler-specific overrides', () => {
  const robots = read('public/robots.txt');
  assert.equal((robots.match(/^User-agent:/gm) ?? []).length, 1);
  for (const route of ['/auth/', '/dashboard', '/account', '/settings', '/credits', '/api/']) {
    assert.ok(robots.includes(`Disallow: ${route}`));
  }
  assert.equal((robots.match(/^Sitemap:/gm) ?? []).length, 1);
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap-index.xml`));
});

test('SEO inventory contains only unique, concrete slugs', () => {
  const data = JSON.parse(read('scripts/seo-data.json'));
  assert.match(data.lastModified, /^\d{4}-\d{2}-\d{2}$/);
  for (const key of ['tools', 'blogs']) {
    const slugs = data[key].map(item => item.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
  assert.equal(data.tools.length, 80);
  assert.ok(data.blogs.some(post => post.slug === 'png-vs-jpg-explained' && post.sections?.length >= 2));
});

test('redirect configuration canonicalizes legacy and apex URLs in one hop', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.equal(config.rewrites, undefined);
  const bySource = new Map(config.redirects.map(rule => [rule.source, rule]));
  assert.equal(bySource.get('/index.html').destination, `${origin}/`);
  assert.equal(bySource.get('/subscription').destination, `${origin}/pricing`);
  assert.equal(bySource.get('/tools/ai-smart-image-optimizer').destination, `${origin}/tools/image-optimizer`);
  assert.equal(bySource.get('/:path*').destination, `${origin}/:path*`);
  assert.deepEqual(bySource.get('/:path*').has, [{ type: 'host', value: 'logoviking.com' }]);
});

test('runtime canonical and bot-directive sources are consistent', () => {
  const app = read('src/App.tsx');
  assert.match(app, /new URL\(pathOnly,siteDomain\)/);
  assert.doesNotMatch(app, /new URL\(p,window\.location\.origin\)/);
  assert.match(app, /set\("googlebot","name",noIndex\?/);
  assert.match(app, /set\("bingbot","name",noIndex\?/);
});

test('build script is the only sitemap source', () => {
  const publicSitemaps = fs.readdirSync(path.join(root, 'public')).filter(name => /^sitemap.*\.xml$/.test(name));
  assert.deepEqual(publicSitemaps, []);
  const generator = read('scripts/prerender.mjs');
  for (const name of ['sitemap.xml', 'sitemap-index.xml', 'sitemap-pages.xml', 'sitemap-tools.xml', 'sitemap-categories.xml', 'sitemap-blog.xml']) {
    assert.ok(generator.includes(name), `${name} must be generated`);
  }
});

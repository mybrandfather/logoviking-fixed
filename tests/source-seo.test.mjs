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

test('critical handoff paints no temporary UI before React mounts', () => {
  const html = read('index.html');
  const main = read('src/main.tsx');
  const criticalCss = html.match(/<style id="lv-boot-style">([\s\S]*?)<\/style>/)?.[1] ?? '';
  assert.ok(html.indexOf("classList.add('lv-js')") < html.indexOf('<body>'), 'JS marker must run before body paint');
  assert.ok(html.indexOf('id="lv-boot-style"') < html.indexOf('<body>'), 'critical boot CSS must be inline in head');
  assert.match(html, /html\.lv-js #lv-prerender-shell \{ visibility: hidden; \}/);
  assert.match(html, /html\.lv-app-failed #lv-prerender-shell \{ visibility: visible; \}/);
  assert.match(criticalCss, /background: #f9fafb/);
  assert.match(criticalCss, /background: #030712/);
  assert.doesNotMatch(html, /lv-app-boot|lv-boot-(?:header|brand|line|card|grid|panel|pulse)/);
  assert.doesNotMatch(criticalCss, /animation|opacity|transition/);
  assert.match(html, /src="\/src\/main\.tsx" onerror="document\.documentElement\.classList\.add\('lv-app-failed'\)"/);
  assert.doesNotMatch(main, /MutationObserver|requestAnimationFrame/);
  assert.match(main, /useLayoutEffect\(\(\) =>/);
  assert.match(main, /const prerenderMarkup = rootElement\.innerHTML/);
  assert.match(main, /class AppErrorBoundary/);
  assert.match(main, /classList\.add\("lv-app-ready"\)/);
});

test('mobile homepage uses real tool routes without duplicating the homepage', () => {
  const app = read('src/App.tsx');
  assert.match(app, /function MobileHomeExperience\(\)/);
  assert.match(app, /function MobileBottomNav\(\)/);
  assert.match(app, /What do you want to/);
  assert.match(app, /placeholder="Search tools"/);
  for (const slug of ['compress-image', 'resize-image', 'gif-to-video', 'background-remover']) {
    assert.ok(app.includes(`slug:"${slug}"`), `missing mobile tool ${slug}`);
  }
  for (const route of ['/categories/image', '/categories/designer', '/categories/seo', '/categories/ai']) {
    assert.ok(app.includes(route), `missing mobile category ${route}`);
  }
  assert.match(app, /className="relative hidden overflow-hidden[^"]*md:block"/);
  assert.match(app, /<MobileHomeExperience\/>/);
  assert.doesNotMatch(app, /mobile\.logoviking|\/mobile-home|\/m\//i);
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



test('priority SEO pages have focused metadata, FAQs, and valid internal-link targets', () => {
  const data = JSON.parse(read('scripts/seo-data.json'));
  const tools = new Map(data.tools.map(tool => [tool.slug, tool]));
  const blogs = new Map(data.blogs.map(post => [post.slug, post]));
  const priorityTools = {
    'gif-to-video': /GIF to WebM Converter/i,
    'resize-image': /Resize Image Online/i,
    'gradient-generator': /Color Gradient Generator/i,
    'logo-size-generator': /Logo Size Generator/i,
  };
  for (const [slug, titlePattern] of Object.entries(priorityTools)) {
    const tool = tools.get(slug);
    assert.ok(tool, `missing ${slug}`);
    assert.match(tool.seoTitle, titlePattern);
    assert.match(tool.h1, titlePattern);
    assert.ok(tool.description.length >= 70 && tool.description.length <= 180, `${slug} description length`);
    assert.ok(tool.intro.length >= 120, `${slug} intro is thin`);
    assert.ok(tool.sections?.length >= 2, `${slug} needs substantive sections`);
    assert.ok(tool.faqs?.length >= 3, `${slug} needs focused FAQs`);
    for (const related of tool.relatedTools ?? []) assert.ok(tools.has(related), `${slug} bad related tool ${related}`);
    for (const related of tool.relatedBlogs ?? []) assert.ok(blogs.has(related), `${slug} bad related blog ${related}`);
  }

  for (const slug of ['compress-images-for-web', 'etsy-image-size-guide']) {
    const post = blogs.get(slug);
    assert.ok(post, `missing ${slug}`);
    assert.ok(post.seoTitle && post.h1, `${slug} needs dedicated title and H1`);
    assert.ok(post.description.length >= 90 && post.description.length <= 180, `${slug} description length`);
    assert.ok(post.sections?.length >= 4, `${slug} needs substantive sections`);
    assert.ok(post.faqs?.length >= 3, `${slug} needs FAQs`);
    for (const related of post.relatedTools ?? []) assert.ok(tools.has(related), `${slug} bad related tool ${related}`);
    for (const related of post.relatedBlogs ?? []) assert.ok(blogs.has(related), `${slug} bad related blog ${related}`);
  }
  assert.match(blogs.get('etsy-image-size-guide').sections[0].paragraphs.join(' '), /2000 pixels/i);
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

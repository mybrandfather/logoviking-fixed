import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'seo-data.json'), 'utf8'));
const BASE = 'https://www.logoviking.com';
const TODAY = data.lastModified;
const templatePath = path.join(dist, 'index.html');
if (!fs.existsSync(templatePath)) throw new Error('dist/index.html missing; run vite build first');
const template = fs.readFileSync(templatePath, 'utf8');

const categoryMeta = {
  image: ['Image Tools','Compress, resize, crop, convert, inspect, and optimize images directly in your browser.'],
  designer: ['Designer Tools','Practical color, typography, QR, favicon, aspect-ratio, GIF, and creative utilities for designers and creators.'],
  youtube: ['YouTube Tools','Free YouTube calculators, thumbnail helpers, titles, tags, descriptions, and publishing utilities.'],
  tiktok: ['TikTok Tools','TikTok calculators, hashtag, caption, username, and content-idea helpers for creators.'],
  instagram: ['Instagram Tools','Instagram engagement, caption, hashtag, bio, Reel, and brand-deal utilities.'],
  pinterest: ['Pinterest Tools','Pinterest title, description, keyword, and content-idea tools for search-driven creators.'],
  seo: ['SEO Tools','Free SEO utilities for metadata, schema, sitemaps, robots.txt, readability, counters, and on-page checks.'],
  ai: ['Creator Generators','Text-based creator helpers for hooks, content ideas, scripts, calendars, and social posts.']
};

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (!/^\d{4}-\d{2}-\d{2}$/.test(TODAY)) throw new Error('seo-data.json needs a YYYY-MM-DD lastModified value');
for (const key of ['tools', 'blogs']) {
  if (!Array.isArray(data[key])) throw new Error(`seo-data.json ${key} must be an array`);
  const slugs = data[key].map(item => item.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error(`Duplicate ${key} slug in seo-data.json`);
  for (const slug of slugs) if (!validSlug.test(slug)) throw new Error(`Invalid ${key} slug: ${slug}`);
}
for (const tool of data.tools) {
  if (!categoryMeta[tool.category]) throw new Error(`Unknown tool category: ${tool.category}`);
}

const trust = {
  about:['About LogoViking','Learn why LogoViking exists and how we build practical creator, image, design, and SEO tools.'],
  contact:['Contact LogoViking','Contact LogoViking for support, partnerships, bug reports, and business inquiries.'],
  privacy:['Privacy Policy','How LogoViking handles browser-side tool data, Google Analytics, Microsoft Clarity, cookies, and support information.'],
  terms:['Terms of Service','Terms for using LogoViking tools, content, calculators, and optional paid features.'],
  disclaimer:['Disclaimer','Important limitations for generated content, calculations, rankings, earnings estimates, and third-party services.'],
  cookies:['Cookie Policy','How LogoViking uses browser storage, analytics, and cookies.'],
  'affiliate-disclosure':['Affiliate Disclosure','How affiliate links and partner placements may appear on LogoViking.'],
  dmca:['DMCA','How to submit a copyright or takedown request to LogoViking.']
};

const specificCopy = {
  'compress-image': ['Free Image Compressor','Compress JPG, PNG, and WebP images for faster websites, uploads, email, and sharing. Adjust quality, compare the result, and download the smaller file.','Image compression is one of the most common online file tasks. Resize oversized images first, then compress the final delivery copy for the best balance of speed and quality.'],
  'resize-image': ['Free Image Resizer','Resize an image to exact pixel dimensions while preserving aspect ratio.','Use the smallest dimensions that still match the final display area. Downscaling oversized images before compression can substantially reduce page weight.'],
  'background-remover': ['Free Background Remover','Remove image backgrounds for product photos, profile images, thumbnails, and design assets.','This tool is designed to process the image in the browser with a downloaded model. Review fine edges such as hair and fur before publishing.'],
  'gif-to-video': ['GIF to WebM / MP4 Converter','Prepare animated GIFs for faster web delivery with WebM or MP4 workflows, embed code, and frame extraction.','Animated GIF files can be very large. Modern video formats are usually much more efficient for full-color animation and can reduce transferred bytes.'],
  'favicon-generator': ['Free Favicon Generator','Create common favicon PNG sizes from one square source image and copy ready-to-use HTML tags.','Use a simple 512×512 source with strong contrast. Tiny favicons lose fine detail quickly, so simple marks work best.'],
  'aspect-ratio-calculator': ['Aspect Ratio Calculator','Find an image or video aspect ratio and calculate a matching missing dimension without stretching.','Useful ratios include 16:9 for widescreen video, 9:16 for vertical video, 1:1 for square media, and 4:5 for portrait social posts.'],
  'webp-to-jpg': ['WebP to JPG Converter','Convert WebP images to JPG directly in your browser.','Use JPG when an older editor, marketplace, or upload form does not accept WebP. JPG does not support transparency.'],
  'webp-to-png': ['WebP to PNG Converter','Convert WebP images to lossless PNG directly in your browser.','PNG is useful for transparency, screenshots, line art, and compatibility with workflows that do not accept WebP.'],
  'png-to-webp': ['PNG to WebP Converter','Convert PNG images to smaller WebP files for websites and apps.','Keep the original PNG as your source asset and use WebP as an optimized delivery format when it fits your workflow.'],
  'jpg-to-webp': ['JPG to WebP Converter','Convert JPG photos to WebP for modern web delivery.','Compare the converted image at its final display size and keep your original JPG as a source copy.'],
  'image-to-base64': ['Image to Base64 Converter','Convert an image to a Base64 data URL for HTML, CSS, prototypes, email templates, and development.','Base64 is useful for embedding small assets, but it is not a compression format and usually produces more text data than the original binary file.'],
  'image-dimensions': ['Image Dimensions Checker','Check image width, height, aspect ratio, file size, type, orientation, and megapixels instantly.','Use this before resizing or publishing so you know exactly what file you are working with.'],
  'qr-code-generator': ['Free QR Code Generator','Create a QR code for a URL or text and download it for print or digital use.','Always scan a generated QR code with a second device before printing or distributing it widely.'],
  'word-counter': ['Free Word Counter','Count words, characters, sentences, paragraphs, and estimated reading time instantly.','Useful for articles, captions, descriptions, essays, and platform limits.'],
  'character-counter': ['Free Character Counter','Count characters and compare text against common social, search, email, and creator platform limits.','Front-load important words because many platforms truncate long titles, captions, and descriptions in previews.']
};

const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stripBrand = t => t.includes('LogoViking') ? t : `${t} | LogoViking`;

function headFor(route,title,description,{noindex=false,type='website',schema=null}={}){
  const canonical = `${BASE}${route==='/'?'':route}`;
  let html = template;
  html = html.replace(/<title>.*?<\/title>/s, `<title>${esc(stripBrand(title))}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(description)}" />`);
  html = html.replace(/<meta name="robots" content="[^"]*"\s*\/>/, `<meta name="robots" content="${noindex?'noindex, nofollow':'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'}" />`);
  html = html.replace(/<meta name="googlebot" content="[^"]*"\s*\/>/, `<meta name="googlebot" content="${noindex?'noindex, nofollow':'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'}" />`);
  html = html.replace(/<meta name="bingbot" content="[^"]*"\s*\/>/, `<meta name="bingbot" content="${noindex?'noindex, nofollow':'index, follow'}" />`);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${esc(stripBrand(title))}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${esc(description)}" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`);
  html = html.replace(/<meta property="og:type" content="[^"]*"\s*\/>/, `<meta property="og:type" content="${type}" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${esc(stripBrand(title))}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${esc(description)}" />`);
  if(schema){ html = html.replace('</head>', `<script id="lv-prerender-jsonld" type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>\n</head>`); }
  return html;
}

function bodyShell(title,description,route,extra='',links=[]){
  const linkHtml = links.slice(0,8).map(([label,href])=>`<a href="${esc(href)}" style="display:inline-flex;align-items:center;margin:5px 8px 5px 0;padding:9px 12px;border:1px solid rgba(196,181,253,.22);border-radius:12px;background:rgba(124,58,237,.12);color:#ddd6fe;text-decoration:none;font-size:13px">${esc(label)}</a>`).join('');
  return `<div id="root"><div id="lv-prerender-shell" style="min-height:100vh;background:radial-gradient(circle at 75% 15%,rgba(124,58,237,.34),transparent 34%),radial-gradient(circle at 18% 55%,rgba(59,130,246,.16),transparent 35%),#050713;color:#f8fafc;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><style>#lv-prerender-shell *{box-sizing:border-box}#lv-prerender-shell p,#lv-prerender-shell li{color:#cbd5e1!important}#lv-prerender-shell h2{color:#f8fafc!important}#lv-prerender-shell a{color:inherit}</style><header style="height:72px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(5,7,19,.92);display:flex;align-items:center"><div style="width:min(1180px,100%);margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between"><a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;font-weight:800"><span style="width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#f59e0b,#7c3aed);box-shadow:0 0 24px rgba(124,58,237,.35)">LV</span><span>Logo<span style="color:#fbbf24">Viking</span></span></a><nav style="display:flex;gap:16px;font-size:13px;color:#cbd5e1"><a href="/tools" style="text-decoration:none">Tools</a><a href="/categories" style="text-decoration:none">Categories</a><a href="/blog" style="text-decoration:none">Blog</a></nav></div></header><main style="max-width:980px;margin:0 auto;padding:42px 20px 56px"><div style="display:inline-flex;align-items:center;padding:7px 12px;border:1px solid rgba(196,181,253,.22);border-radius:999px;background:rgba(124,58,237,.10);font-size:12px;color:#c4b5fd;margin-bottom:18px">Free creator tools · no signup needed</div><section style="border:1px solid rgba(196,181,253,.16);border-radius:24px;padding:clamp(24px,5vw,46px);background:linear-gradient(145deg,rgba(30,18,62,.86),rgba(12,17,35,.88));box-shadow:0 26px 70px rgba(0,0,0,.28)"><h1 style="font-size:clamp(32px,6vw,54px);line-height:1.04;letter-spacing:-.035em;margin:0 0 16px;color:#fff">${esc(title)}</h1><p style="font-size:clamp(16px,2.7vw,19px);line-height:1.65;margin:0;max-width:760px">${esc(description)}</p></section><section style="margin-top:20px;border:1px solid rgba(148,163,184,.14);border-radius:20px;padding:22px;background:rgba(15,23,42,.72)">${extra}<div style="margin-top:12px">${linkHtml}</div></section><p style="margin-top:22px;font-size:12px;text-align:center;color:#64748b!important">Loading the interactive LogoViking workspace…</p></main></div></div>`;
}

function writeRoute(route,html){
  if(route==='/'){fs.writeFileSync(path.join(dist,'index.html'),html);return;}
  const clean = route.replace(/^\//,'').replace(/\/$/,'');
  const out = path.join(dist, `${clean}.html`);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,html);
}

const allToolLinks = data.tools.map(t=>[t.name,`/tools/${t.slug}`]);
const allBlogLinks = data.blogs.map(b=>[b.title,`/blog/${b.slug}`]);
const catSlugs = [...new Set(data.tools.map(t=>t.category))];

// Home
{
  const title='LogoViking — 80+ Free Image, Creator, Design & SEO Tools';
  const desc='Free browser tools for image compression, resizing, WebP conversion, creator workflows, YouTube, social media, design, and SEO.';
  const schema={"@context":"https://schema.org","@type":"WebSite","name":"LogoViking","url":BASE,"description":desc};
  let html=headFor('/',title,desc,{schema});
  html=html.replace('<div id="root"></div>',bodyShell('80+ practical creator tools',desc,'/',`<section><h2>Popular free tools</h2><p>Start with Image Compressor, Background Remover, QR Code Generator, Aspect Ratio Calculator, Favicon Generator, Word Counter, and the WebP converters.</p></section>`,allToolLinks));
  writeRoute('/',html);
}

// Directory pages
for (const [route,title,desc,links] of [
  ['/tools','All Free Tools','Browse 80+ practical image, creator, design, social media, and SEO tools.',allToolLinks],
  ['/categories','Tool Categories','Browse LogoViking tools by image, design, YouTube, TikTok, Instagram, Pinterest, SEO, and creator workflows.',catSlugs.map(c=>[categoryMeta[c]?.[0]||c,`/categories/${c}`])],
  ['/blog','Creator & SEO Guides','Practical guides connected to the image, creator, design, and SEO tools available on LogoViking.',allBlogLinks],
]){
  let html=headFor(route,title,desc,{schema:{"@context":"https://schema.org","@type":"CollectionPage","name":title,"url":`${BASE}${route}`,"description":desc}});
  html=html.replace('<div id="root"></div>',bodyShell(title,desc,route,'',links));
  writeRoute(route,html);
}

// Tools
for (const t of data.tools){
  const route=`/tools/${t.slug}`;
  const spec=specificCopy[t.slug];
  const title=t.seoTitle || spec?.[0] || `${t.name} — Free Online Tool`;
  const h1=t.h1 || spec?.[0] || t.name;
  const desc=t.description || spec?.[1] || `Use ${t.name} on LogoViking.`;
  const intro=t.intro || spec?.[2] || `Use ${t.name} for a focused ${t.category} workflow. Review the result before publishing and keep source files when the output changes format or quality.`;
  const howTo=`<section><h2>How to use ${esc(h1)}</h2><ol style="line-height:1.8;color:#cbd5e1"><li>Open the tool and provide the image, colors, text, URL, or values it needs.</li><li>Adjust the available settings while reviewing the result.</li><li>Copy or download the output and verify it in the destination platform.</li></ol></section>`;
  const sections=Array.isArray(t.sections)?t.sections.map(section=>`<section><h2>${esc(section.title)}</h2>${section.paragraphs.map(paragraph=>`<p style="line-height:1.8;color:#cbd5e1">${esc(paragraph)}</p>`).join('')}</section>`).join(''):'';
  const faqs=Array.isArray(t.faqs)?t.faqs:[];
  const faqHtml=faqs.length?`<section><h2>${esc(h1)} FAQ</h2>${faqs.map(f=>`<h3>${esc(f.question)}</h3><p style="line-height:1.8;color:#cbd5e1">${esc(f.answer)}</p>`).join('')}</section>`:'';
  const relatedToolSlugs=Array.isArray(t.relatedTools)?t.relatedTools:[];
  const relatedBlogSlugs=Array.isArray(t.relatedBlogs)?t.relatedBlogs:[];
  const relatedTools=(relatedToolSlugs.length?relatedToolSlugs.map(slug=>data.tools.find(x=>x.slug===slug)).filter(Boolean):data.tools.filter(x=>x.category===t.category&&x.slug!==t.slug).slice(0,6)).map(x=>[x.name,`/tools/${x.slug}`]);
  const relatedBlogs=relatedBlogSlugs.map(slug=>data.blogs.find(x=>x.slug===slug)).filter(Boolean).map(x=>[x.title,`/blog/${x.slug}`]);
  const links=[...relatedTools,...relatedBlogs,[categoryMeta[t.category][0],`/categories/${t.category}`]];
  const appSchema={"@type":"WebApplication","name":h1,"url":`${BASE}${route}`,"description":desc,"applicationCategory":['image','designer'].includes(t.category)?'DesignApplication':'UtilitiesApplication',"operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}};
  const graph=[appSchema];
  if(faqs.length)graph.push({"@type":"FAQPage","mainEntity":faqs.map(f=>({"@type":"Question","name":f.question,"acceptedAnswer":{"@type":"Answer","text":f.answer}}))});
  const schema={"@context":"https://schema.org","@graph":graph};
  let html=headFor(route,title,desc,{schema});
  const extra=`<section style="margin-top:28px"><p style="line-height:1.8;color:#cbd5e1">${esc(intro)}</p></section>${howTo}${sections}${faqHtml}`;
  html=html.replace('<div id="root"></div>',bodyShell(h1,desc,route,extra,links));
  writeRoute(route,html);
}

// Categories
for (const c of catSlugs){
  const [title,desc]=categoryMeta[c]||[c,`Browse ${c} tools on LogoViking.`];
  const links=data.tools.filter(t=>t.category===c).map(t=>[t.name,`/tools/${t.slug}`]);
  let html=headFor(`/categories/${c}`,title,desc,{schema:{"@context":"https://schema.org","@type":"CollectionPage","name":title,"url":`${BASE}/categories/${c}`,"description":desc}});
  html=html.replace('<div id="root"></div>',bodyShell(title,desc,`/categories/${c}`,`<section><h2>${esc(title)} available now</h2><p style="line-height:1.7;color:#4b5563">Every public tool should solve a clear task and provide a real result. Choose a tool below to start.</p></section>`,links));
  writeRoute(`/categories/${c}`,html);
}

// Blogs
for (const b of data.blogs){
  const route=`/blog/${b.slug}`;
  const title=b.seoTitle || b.title;
  const h1=b.h1 || b.title;
  const faqs=Array.isArray(b.faqs)?b.faqs:[];
  const articleSchema={"@type":"BlogPosting","headline":h1,"description":b.description,"dateModified":TODAY,"mainEntityOfPage":{"@type":"WebPage","@id":`${BASE}${route}`},"publisher":{"@type":"Organization","name":"LogoViking","url":BASE}};
  const graph=[articleSchema];
  if(faqs.length)graph.push({"@type":"FAQPage","mainEntity":faqs.map(f=>({"@type":"Question","name":f.question,"acceptedAnswer":{"@type":"Answer","text":f.answer}}))});
  const schema={"@context":"https://schema.org","@graph":graph};
  let html=headFor(route,title,b.description,{type:'article',schema});
  const sections = Array.isArray(b.sections) && b.sections.length
    ? b.sections.map(section=>`<section><h2>${esc(section.title)}</h2>${section.paragraphs.map(paragraph=>`<p style="line-height:1.8;color:#cbd5e1">${esc(paragraph)}</p>`).join('')}</section>`).join('')
    : `<section><h2>About this guide</h2><p style="line-height:1.8;color:#cbd5e1">${esc(b.description)} This guide connects the topic to practical LogoViking tools and workflows.</p></section>`;
  const faqHtml=faqs.length?`<section><h2>Frequently asked questions</h2>${faqs.map(f=>`<h3>${esc(f.question)}</h3><p style="line-height:1.8;color:#cbd5e1">${esc(f.answer)}</p>`).join('')}</section>`:'';
  const relatedToolSlugs=Array.isArray(b.relatedTools)?b.relatedTools:[];
  const relatedBlogSlugs=Array.isArray(b.relatedBlogs)?b.relatedBlogs:[];
  const relatedTools=relatedToolSlugs.map(slug=>data.tools.find(x=>x.slug===slug)).filter(Boolean).map(x=>[x.name,`/tools/${x.slug}`]);
  const relatedBlogs=(relatedBlogSlugs.length?relatedBlogSlugs.map(slug=>data.blogs.find(x=>x.slug===slug)).filter(Boolean).map(x=>[x.title,`/blog/${x.slug}`]):allBlogLinks.filter(x=>x[1]!==route).slice(0,5));
  const links=[...relatedTools,...relatedBlogs,['Browse Image Tools','/categories/image']];
  html=html.replace('<div id="root"></div>',bodyShell(h1,b.description,route,`<article style="margin-top:26px">${sections}${faqHtml}</article>`,links));
  writeRoute(route,html);
}

// Static public/trust pages
for (const [slug,[title,desc]] of Object.entries(trust)){
  const route=`/${slug}`;
  const schema={"@context":"https://schema.org","@type":"WebPage","name":title,"url":`${BASE}${route}`,"description":desc};
  let html=headFor(route,title,desc,{schema});
  html=html.replace('<div id="root"></div>',bodyShell(title,desc,route,`<section style="margin-top:28px"><p style="line-height:1.8;color:#4b5563">${esc(desc)}</p></section>`,[['Privacy','/privacy'],['Terms','/terms'],['Contact','/contact'],['About','/about']]));
  writeRoute(route,html);
}

for (const [route,title,desc] of [
  ['/faq','LogoViking FAQ','Answers to common questions about LogoViking tools, browser processing, accounts, pricing, analytics, and privacy.'],
  ['/pricing','LogoViking Pricing','Review the current LogoViking free and optional paid plans.'],
]){
  let html=headFor(route,title,desc,{schema:{"@context":"https://schema.org","@type":"WebPage","name":title,"url":`${BASE}${route}`,"description":desc}});
  html=html.replace('<div id="root"></div>',bodyShell(title,desc,route));
  writeRoute(route,html);
}

// Direct-loadable private/app pages, explicitly noindex.
for (const route of ['/credits','/dashboard','/account','/settings','/auth/login','/auth/register']){
  let html=headFor(route,'LogoViking Account','Private account and application page.',{noindex:true});
  html=html.replace('<div id="root"></div>',bodyShell('LogoViking Account','This application page is not intended for search indexing.',route));
  writeRoute(route,html);
}

// A real static 404 page for unknown paths.
fs.writeFileSync(path.join(dist,'404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | LogoViking</title></head><body style="font-family:system-ui;padding:40px;max-width:720px;margin:auto"><h1>Page not found</h1><p>The page you requested does not exist.</p><p><a href="/">Home</a> · <a href="/tools">All tools</a> · <a href="/blog">Blog</a></p></body></html>`);

// Sitemaps
const publicPages=['/','/tools','/categories','/blog','/faq','/pricing',...Object.keys(trust).map(x=>`/${x}`)];
const toolPages=data.tools.map(t=>`/tools/${t.slug}`);
const categoryPages=catSlugs.map(c=>`/categories/${c}`);
const blogPages=data.blogs.map(b=>`/blog/${b.slug}`);
const allPublicRoutes=[...publicPages,...toolPages,...categoryPages,...blogPages];
if (new Set(allPublicRoutes).size !== allPublicRoutes.length) throw new Error('Duplicate public route in sitemap inventory');
for (const route of allPublicRoutes) {
  if (/[?:*{}\\]/.test(route)) throw new Error(`Malformed public route: ${route}`);
  const routeFile=route==='/'?path.join(dist,'index.html'):path.join(dist,`${route.slice(1)}.html`);
  if (!fs.existsSync(routeFile)) throw new Error(`Missing prerendered route: ${route}`);
}
const urlXml=(routes)=>`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(r=>`  <url><loc>${BASE}${r==='/'?'':r}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(dist,'sitemap-pages.xml'),urlXml(publicPages));
fs.writeFileSync(path.join(dist,'sitemap-tools.xml'),urlXml(toolPages));
fs.writeFileSync(path.join(dist,'sitemap-categories.xml'),urlXml(categoryPages));
fs.writeFileSync(path.join(dist,'sitemap-blog.xml'),urlXml(blogPages));
fs.writeFileSync(path.join(dist,'sitemap.xml'),urlXml(allPublicRoutes));
fs.writeFileSync(path.join(dist,'sitemap-index.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['sitemap-pages.xml','sitemap-tools.xml','sitemap-categories.xml','sitemap-blog.xml'].map(f=>`  <sitemap><loc>${BASE}/${f}</loc><lastmod>${TODAY}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);

console.log(`Prerendered ${data.tools.length} tools, ${data.blogs.length} blog posts, ${catSlugs.length} categories.`);

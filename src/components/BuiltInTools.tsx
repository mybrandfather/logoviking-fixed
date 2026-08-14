// src/components/BuiltInTools.tsx
// All built-in (non-AI) tool implementations
// Maps slug → real functional component, replacing the generic AI workbench.

import React, { useState, useRef, useCallback, useEffect, ChangeEvent } from "react";
import { Copy, Download, RefreshCw, Upload, Check, Zap, Plus, Trash2, ImageIcon } from "lucide-react";

// ─── Shared helpers ───────────────────────────────────────────────────────────
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function DownloadBtn({ href, filename, label = "Download" }: { href: string; filename: string; label?: string }) {
  return (
    <a href={href} download={filename} className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
      <Download size={13} /> {label}
    </a>
  );
}

function ToolWrap({ children, single }: { children: React.ReactNode; single?: boolean }) {
  return <div className={single ? "" : "grid gap-5 lg:grid-cols-2"}>{children}</div>;
}

function Panel({ children, title, className }: { children: React.ReactNode; title?: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900", className)}>
      {title && <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">{title}</p>}
      {children}
    </div>
  );
}

function Lbl({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{text}</span>
      {children}
    </label>
  );
}

const inputCls = "block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const btnCls = "flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors";

function ResultBox({ content, filename = "output.txt" }: { content: string; filename?: string }) {
  if (!content) return null;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-mono whitespace-pre-wrap text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 max-h-72 overflow-y-auto">
        {content}
      </div>
      <div className="flex gap-2">
        <CopyBtn text={content} />
        <DownloadBtn href={`data:text/plain;charset=utf-8,${encodeURIComponent(content)}`} filename={filename} />
      </div>
    </div>
  );
}

// ─── Image upload hook ────────────────────────────────────────────────────────
function useImageFile() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("image.png");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setDataUrl(url);
      const image = new Image();
      image.onload = () => setImg(image);
      image.src = url;
    };
    reader.readAsDataURL(f);
  };

  const UploadZone = () => (
    <div onClick={() => inputRef.current?.click()} className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center hover:border-violet-300 transition-colors dark:border-gray-700 dark:hover:border-violet-600">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <Upload size={20} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{img ? fileName : "Click to upload image"}</p>
      <p className="mt-1 text-xs text-gray-400">PNG, JPG, WebP supported</p>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </div>
  );
  return { dataUrl, fileName, file, img, UploadZone };
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(baseHex: string, type: string): string[] {
  const [h, s, l] = hexToHsl(baseHex);
  switch (type) {
    case "analogous":      return [-30, -15, 0, 15, 30].map(o => hslToHex((h + o + 360) % 360, s, l));
    case "complementary":  return [0, 15, 180, 195, 210].map(o => hslToHex((h + o) % 360, s, l));
    case "triadic":        return [0, 120, 240, 60, 180].map(o => hslToHex((h + o) % 360, s, l));
    case "tetradic":       return [0, 90, 180, 270, 45].map(o => hslToHex((h + o) % 360, s, l));
    default:               return [20, 35, 50, 65, 80].map(lt => hslToHex(h, s, lt)); // monochromatic
  }
}

// ─── Stat row helper ──────────────────────────────────────────────────────────
function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between rounded-xl border px-4 py-3", highlight ? "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/20" : "border-gray-100 dark:border-gray-800")}>
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={cn("font-bold", highlight ? "text-violet-700 dark:text-violet-300" : "text-gray-900 dark:text-white")}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. YOUTUBE MONEY CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
export function YouTubeMoneyCalculator() {
  const [views, setViews] = useState(200000);
  const [cpm, setCpm] = useState(4);
  const [subs, setSubs] = useState(20000);
  const monthly = (views * cpm) / 1000 * 0.55;
  return (
    <ToolWrap>
      <Panel title="Channel Settings">
        <div className="space-y-5">
          <Lbl text={`Monthly views: ${views.toLocaleString()}`}>
            <input type="range" min={1000} max={10000000} step={10000} value={views} onChange={e => setViews(+e.target.value)} className="mt-2 w-full accent-violet-600" />
          </Lbl>
          <Lbl text={`CPM ($ per 1,000 views): $${cpm}`}>
            <input type="range" min={0.5} max={30} step={0.5} value={cpm} onChange={e => setCpm(+e.target.value)} className="mt-2 w-full accent-violet-600" />
          </Lbl>
          <Lbl text={`Subscribers: ${subs.toLocaleString()}`}>
            <input type="range" min={100} max={10000000} step={1000} value={subs} onChange={e => setSubs(+e.target.value)} className="mt-2 w-full accent-violet-600" />
          </Lbl>
          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <strong>Typical CPM by niche:</strong> Finance/Tech $10–$30 · Business $8–$20 · Gaming $1–$5 · Entertainment $2–$6
          </div>
        </div>
      </Panel>
      <Panel title="Monthly Earnings Estimate">
        <div className="space-y-2.5">
          <StatRow label="Daily ad revenue" value={`$${(monthly / 30).toFixed(2)}`} />
          <StatRow label="Monthly ad revenue" value={`$${monthly.toFixed(2)}`} highlight />
          <StatRow label="Yearly ad revenue" value={`$${(monthly * 12).toFixed(0)}`} />
          <StatRow label="Sponsorship range" value={`$${Math.round(subs * 0.02).toLocaleString()}–$${Math.round(subs * 0.08).toLocaleString()}/video`} />
        </div>
        <p className="mt-3 text-xs text-gray-400">YouTube keeps ~45% of ad revenue. Estimates vary by audience location, season, and ad format.</p>
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TIKTOK EARNINGS CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
export function TikTokEarningsCalculator() {
  const [followers, setFollowers] = useState(50000);
  const [avgViews, setAvgViews] = useState(30000);
  const [videos, setVideos] = useState(10);
  const fund = (avgViews * videos * 0.03) / 1000;
  const brandMin = Math.round(followers * 0.005);
  const brandMax = Math.round(followers * 0.02);
  return (
    <ToolWrap>
      <Panel title="TikTok Stats">
        <div className="space-y-5">
          <Lbl text={`Followers: ${followers.toLocaleString()}`}>
            <input type="range" min={1000} max={10000000} step={1000} value={followers} onChange={e => setFollowers(+e.target.value)} className="mt-2 w-full accent-violet-600" />
          </Lbl>
          <Lbl text={`Avg views per video: ${avgViews.toLocaleString()}`}>
            <input type="range" min={1000} max={5000000} step={1000} value={avgViews} onChange={e => setAvgViews(+e.target.value)} className="mt-2 w-full accent-violet-600" />
          </Lbl>
          <Lbl text={`Videos per month: ${videos}`}>
            <input type="range" min={1} max={60} step={1} value={videos} onChange={e => setVideos(+e.target.value)} className="mt-2 w-full accent-violet-600" />
          </Lbl>
        </div>
      </Panel>
      <Panel title="Monthly Earnings Estimate">
        <div className="space-y-2.5">
          <StatRow label="Creator Fund (views)" value={`$${fund.toFixed(2)}`} />
          <StatRow label="Brand deal per video" value={`$${brandMin.toLocaleString()}–$${brandMax.toLocaleString()}`} highlight />
          <StatRow label="Monthly brand potential" value={`$${(brandMin * videos).toLocaleString()}–$${(brandMax * videos).toLocaleString()}`} />
        </div>
        <p className="mt-3 text-xs text-gray-400">TikTok Creator Fund pays ~$0.02–$0.04/1,000 views. Brand deals vary by niche and engagement.</p>
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INSTAGRAM EARNINGS CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
export function InstagramEarningsCalculator() {
  const [followers, setFollowers] = useState(25000);
  const [er, setEr] = useState(3.5);
  const erRating = er >= 6 ? "Excellent 🌟" : er >= 3 ? "Good ✅" : er >= 1 ? "Average ⚠️" : "Low ❌";
  return (
    <ToolWrap>
      <Panel title="Instagram Profile">
        <div className="space-y-5">
          <Lbl text={`Followers: ${followers.toLocaleString()}`}>
            <input type="range" min={1000} max={10000000} step={1000} value={followers} onChange={e => setFollowers(+e.target.value)} className="mt-2 w-full accent-violet-600" />
          </Lbl>
          <Lbl text={`Engagement rate: ${er}%`}>
            <input type="range" min={0.1} max={15} step={0.1} value={er} onChange={e => setEr(+e.target.value)} className="mt-2 w-full accent-violet-600" />
          </Lbl>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Engagement rating: <strong className="text-gray-900 dark:text-white">{erRating}</strong></p>
          </div>
        </div>
      </Panel>
      <Panel title="Sponsored Content Rates">
        <div className="space-y-2.5">
          <StatRow label="Feed post" value={`$${Math.round(followers * 0.01).toLocaleString()}–$${Math.round(followers * 0.035).toLocaleString()}`} highlight />
          <StatRow label="Story (swipe-up)" value={`$${Math.round(followers * 0.003).toLocaleString()}–$${Math.round(followers * 0.008).toLocaleString()}`} />
          <StatRow label="Reel" value={`$${Math.round(followers * 0.015).toLocaleString()}–$${Math.round(followers * 0.05).toLocaleString()}`} />
        </div>
        <p className="mt-3 text-xs text-gray-400">Industry average estimates. Actual rates depend on niche, audience quality, and brand budget.</p>
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ENGAGEMENT RATE CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
export function EngagementRateCalculator() {
  const [followers, setFollowers] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const f = Number(followers) || 0;
  const total = (Number(likes) || 0) + (Number(comments) || 0) + (Number(shares) || 0);
  const erNum = f > 0 ? (total / f) * 100 : 0;
  const er = f > 0 && total > 0 ? erNum.toFixed(2) : "—";
  const rating = erNum >= 6 ? { label: "Excellent", cls: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" }
    : erNum >= 3 ? { label: "Good", cls: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800" }
    : erNum >= 1 ? { label: "Average", cls: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" }
    : erNum > 0 ? { label: "Low", cls: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800" }
    : null;
  return (
    <ToolWrap>
      <Panel title="Post Stats">
        <div className="space-y-3">
          {[{ l: "Followers / Reach", v: followers, s: setFollowers }, { l: "Likes", v: likes, s: setLikes }, { l: "Comments", v: comments, s: setComments }, { l: "Shares / Saves (optional)", v: shares, s: setShares }].map(({ l, v, s }) => (
            <Lbl key={l} text={l}><input type="number" min={0} value={v} onChange={e => s(e.target.value)} placeholder="0" className={inputCls} /></Lbl>
          ))}
        </div>
      </Panel>
      <Panel title="Result">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-6xl font-bold text-violet-600 dark:text-violet-400">{er}%</p>
          <p className="mt-2 text-sm text-gray-500">Engagement rate</p>
          {rating && <div className={cn("mt-4 rounded-2xl border px-5 py-2.5 text-sm font-bold", rating.cls)}>{rating.label}</div>}
        </div>
        <div className="mt-4 space-y-1.5 text-xs text-gray-500">
          {[{ l: "Industry average", v: "1–3%" }, { l: "Good", v: "3–6%" }, { l: "Excellent", v: "6%+" }].map(({ l, v }) => (
            <div key={l} className="flex justify-between"><span>{l}</span><strong>{v}</strong></div>
          ))}
        </div>
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LOGO SIZE GUIDE
// ─────────────────────────────────────────────────────────────────────────────
export function LogoSizeGuide() {
  const sizes = [
    { platform: "YouTube", uses: "Channel icon", size: "800×800", format: "PNG" },
    { platform: "YouTube", uses: "Channel art banner", size: "2560×1440", format: "PNG/JPG" },
    { platform: "TikTok", uses: "Profile picture", size: "200×200", format: "JPG" },
    { platform: "Instagram", uses: "Profile picture", size: "320×320", format: "JPG/PNG" },
    { platform: "Instagram", uses: "Story cover", size: "1080×1920", format: "JPG/PNG" },
    { platform: "Twitter/X", uses: "Profile picture", size: "400×400", format: "PNG" },
    { platform: "Twitter/X", uses: "Header banner", size: "1500×500", format: "PNG/JPG" },
    { platform: "LinkedIn", uses: "Profile picture", size: "400×400", format: "PNG" },
    { platform: "LinkedIn", uses: "Cover image", size: "1584×396", format: "JPG/PNG" },
    { platform: "Facebook", uses: "Profile picture", size: "180×180", format: "PNG/JPG" },
    { platform: "Facebook", uses: "Cover photo", size: "820×312", format: "JPG/PNG" },
    { platform: "Pinterest", uses: "Profile image", size: "165×165", format: "PNG" },
    { platform: "Discord", uses: "Server icon", size: "512×512", format: "PNG" },
    { platform: "Twitch", uses: "Profile image", size: "256×256", format: "PNG" },
    { platform: "Website", uses: "Favicon", size: "32×32", format: "ICO/PNG" },
    { platform: "Website", uses: "OG Image (social)", size: "1200×630", format: "JPG/PNG" },
    { platform: "Email", uses: "Logo in email", size: "600×200", format: "PNG" },
  ];
  const platforms = [...new Set(sizes.map(s => s.platform))];
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? sizes : sizes.filter(s => s.platform === filter);
  const text = filtered.map(s => `${s.platform} — ${s.uses}: ${s.size}px (${s.format})`).join("\n");
  return (
    <ToolWrap single>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Logo & Image Size Guide</p>
            <h3 className="mt-0.5 font-semibold text-gray-900 dark:text-white">Correct sizes for every platform</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["All", ...platforms].map(p => (
              <button key={p} type="button" onClick={() => setFilter(p)} className={cn("rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors", filter === p ? "bg-violet-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800")}>{p}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-gray-800">{["Platform", "Use", "Size (px)", "Format"].map(h => <th key={h} className="pb-2.5 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-2.5 pr-4 font-semibold text-gray-900 dark:text-white">{row.platform}</td>
                  <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">{row.uses}</td>
                  <td className="py-2.5 pr-4 font-mono text-violet-600 dark:text-violet-400">{row.size}</td>
                  <td className="py-2.5 text-gray-500">{row.format}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4"><CopyBtn text={text} label="Copy all sizes" /></div>
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SOCIAL MEDIA SIZE GUIDE
// ─────────────────────────────────────────────────────────────────────────────
export function SocialMediaSizeGuide() {
  const sizes = [
    { platform: "Instagram", type: "Post (square)", size: "1080×1080", ar: "1:1" },
    { platform: "Instagram", type: "Post (portrait)", size: "1080×1350", ar: "4:5" },
    { platform: "Instagram", type: "Story / Reel", size: "1080×1920", ar: "9:16" },
    { platform: "TikTok", type: "Video", size: "1080×1920", ar: "9:16" },
    { platform: "TikTok", type: "Cover photo", size: "1080×1080", ar: "1:1" },
    { platform: "YouTube", type: "Thumbnail", size: "1280×720", ar: "16:9" },
    { platform: "YouTube", type: "Short", size: "1080×1920", ar: "9:16" },
    { platform: "YouTube", type: "Channel art", size: "2560×1440", ar: "16:9" },
    { platform: "Pinterest", type: "Standard pin", size: "1000×1500", ar: "2:3" },
    { platform: "Pinterest", type: "Square pin", size: "1000×1000", ar: "1:1" },
    { platform: "Twitter/X", type: "Post image", size: "1600×900", ar: "16:9" },
    { platform: "Facebook", type: "Post image", size: "1200×630", ar: "1.91:1" },
    { platform: "Facebook", type: "Story", size: "1080×1920", ar: "9:16" },
    { platform: "LinkedIn", type: "Post image", size: "1200×628", ar: "1.91:1" },
    { platform: "LinkedIn", type: "Article cover", size: "1920×1080", ar: "16:9" },
  ];
  const text = sizes.map(s => `${s.platform} ${s.type}: ${s.size}px (${s.ar})`).join("\n");
  return (
    <ToolWrap single>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Social Media Size Guide</p>
            <h3 className="mt-0.5 font-semibold text-gray-900 dark:text-white">Perfect dimensions for every format</h3>
          </div>
          <CopyBtn text={text} label="Copy all" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-gray-800">{["Platform", "Type", "Size (px)", "Ratio"].map(h => <th key={h} className="pb-2.5 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-gray-400">{h}</th>)}</tr></thead>
            <tbody>
              {sizes.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-2.5 pr-4 font-semibold text-gray-900 dark:text-white">{row.platform}</td>
                  <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">{row.type}</td>
                  <td className="py-2.5 pr-4 font-mono text-violet-600 dark:text-violet-400">{row.size}</td>
                  <td className="py-2.5 text-gray-500">{row.ar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. KEYWORD DENSITY CHECKER
// ─────────────────────────────────────────────────────────────────────────────
export function KeywordDensityChecker() {
  const [text, setText] = useState("");
  const [kw, setKw] = useState("");
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  const kwLower = kw.trim().toLowerCase();
  const kwCount = kwLower ? words.filter(w => w.toLowerCase().replace(/[^a-z0-9]/g, "") === kwLower).length : 0;
  const densityNum = wc > 0 && kwLower ? (kwCount / wc) * 100 : 0;
  const density = wc > 0 && kwLower ? densityNum.toFixed(2) : "—";
  const rating = densityNum > 5 ? "⚠️ Keyword stuffing — reduce" : densityNum >= 1 ? "✅ Optimal range" : densityNum > 0 ? "📉 Low — consider more uses" : "";
  const wordFreq = words.reduce<Record<string, number>>((acc, w) => { const c = w.toLowerCase().replace(/[^a-z0-9]/g, ""); if (c.length > 3) acc[c] = (acc[c] || 0) + 1; return acc; }, {});
  const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return (
    <ToolWrap>
      <Panel title="Your Content">
        <div className="space-y-3">
          <Lbl text="Target keyword"><input type="text" value={kw} onChange={e => setKw(e.target.value)} placeholder="e.g. content marketing" className={inputCls} /></Lbl>
          <Lbl text="Your content"><textarea value={text} onChange={e => setText(e.target.value)} rows={8} placeholder="Paste your blog post or page copy here…" className={cn(inputCls, "resize-y")} /></Lbl>
        </div>
      </Panel>
      <Panel title="Analysis">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[{ l: "Word count", v: wc.toLocaleString() }, { l: `"${kw || "keyword"}" count`, v: String(kwCount) }, { l: "Keyword density", v: `${density}%` }, { l: "Rating", v: rating || "Enter keyword" }].map(({ l, v }) => (
            <div key={l} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800"><p className="text-xs text-gray-400">{l}</p><p className="mt-0.5 font-bold text-gray-900 dark:text-white text-sm">{v}</p></div>
          ))}
        </div>
        {topWords.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Top words (4+ letters)</p>
            <div className="space-y-1.5">
              {topWords.map(([word, count]) => (
                <div key={word} className="flex items-center gap-2">
                  <span className="w-28 text-sm text-gray-700 dark:text-gray-300 truncate">{word}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min(100, (count / (topWords[0][1] || 1)) * 100)}%` }} /></div>
                  <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ROBOTS.TXT GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function RobotsGenerator() {
  const [domain, setDomain] = useState("https://example.com");
  const [sitemap, setSitemap] = useState(true);
  const [disallows, setDisallows] = useState(["/admin/", "/private/"]);
  const [allows, setAllows] = useState(["/public/"]);
  const robots = ["User-agent: *", ...disallows.filter(Boolean).map(d => `Disallow: ${d}`), ...allows.filter(Boolean).map(a => `Allow: ${a}`), "", ...(sitemap ? [`Sitemap: ${domain}/sitemap.xml`] : [])].join("\n").trim();
  return (
    <ToolWrap>
      <Panel title="Settings">
        <div className="space-y-4">
          <Lbl text="Site domain"><input type="url" value={domain} onChange={e => setDomain(e.target.value)} className={inputCls} /></Lbl>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Disallow paths</p>
            {disallows.map((d, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={d} onChange={e => setDisallows(ds => ds.map((x, j) => j === i ? e.target.value : x))} placeholder="/path/" className={cn(inputCls, "flex-1")} />
                <button type="button" onClick={() => setDisallows(ds => ds.filter((_, j) => j !== i))} className="rounded-xl border border-red-200 p-2.5 text-red-400 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setDisallows(d => [...d, ""])} className="flex items-center gap-1 text-xs text-violet-600 font-semibold"><Plus size={13} /> Add path</button>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Allow paths</p>
            {allows.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={a} onChange={e => setAllows(as => as.map((x, j) => j === i ? e.target.value : x))} placeholder="/path/" className={cn(inputCls, "flex-1")} />
                <button type="button" onClick={() => setAllows(as => as.filter((_, j) => j !== i))} className="rounded-xl border border-red-200 p-2.5 text-red-400 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/20"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setAllows(a => [...a, ""])} className="flex items-center gap-1 text-xs text-violet-600 font-semibold"><Plus size={13} /> Add path</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={sitemap} onChange={e => setSitemap(e.target.checked)} className="accent-violet-600" /> Include sitemap URL</label>
        </div>
      </Panel>
      <Panel title="robots.txt Output"><ResultBox content={robots} filename="robots.txt" /></Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. OPEN GRAPH GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function OpenGraphGenerator() {
  const [title, setTitle] = useState("My Awesome Page");
  const [desc, setDesc] = useState("A great description for social sharing.");
  const [url, setUrl] = useState("https://example.com/page");
  const [image, setImage] = useState("https://example.com/og-image.jpg");
  const [type, setType] = useState("website");
  const [siteName, setSiteName] = useState("My Site");
  const tags = `<!-- Open Graph / Social Media Meta Tags -->
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${image}" />
<meta property="og:type" content="${type}" />
<meta property="og:site_name" content="${siteName}" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${image}" />`;
  return (
    <ToolWrap>
      <Panel title="Page Details">
        <div className="space-y-3">
          {[{ l: "Page title", v: title, s: setTitle }, { l: "Description (155 chars max)", v: desc, s: setDesc }, { l: "Page URL", v: url, s: setUrl }, { l: "OG Image URL (1200×630 px)", v: image, s: setImage }, { l: "Site name", v: siteName, s: setSiteName }].map(({ l, v, s }) => (
            <Lbl key={l} text={l}><input type="text" value={v} onChange={e => s(e.target.value)} className={inputCls} /></Lbl>
          ))}
          <Lbl text="Page type">
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
              {["website", "article", "product", "profile", "video.other"].map(t => <option key={t}>{t}</option>)}
            </select>
          </Lbl>
        </div>
      </Panel>
      <Panel title="Meta Tags Output">
        <ResultBox content={tags} filename="og-tags.html" />
        <div className="mt-4 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-400 mb-2">Social preview</p>
          {image && <div className="mb-2 h-24 w-full rounded-xl bg-gray-200 bg-cover bg-center dark:bg-gray-700" style={{ backgroundImage: `url(${image})` }} />}
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{title}</p>
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{desc}</p>
          <p className="text-xs text-gray-400 mt-1">{url}</p>
        </div>
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. SITEMAP GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function SitemapGenerator() {
  const [domain, setDomain] = useState("https://example.com");
  const [pages, setPages] = useState("/\n/about\n/contact\n/blog\n/pricing\n/tools");
  const [freq, setFreq] = useState("weekly");
  const [priority, setPriority] = useState("0.8");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.split("\n").filter(Boolean).map(p => `  <url>\n    <loc>${domain}${p.trim()}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${p.trim() === "/" ? "1.0" : priority}</priority>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </url>`).join("\n")}\n</urlset>`;
  return (
    <ToolWrap>
      <Panel title="Settings">
        <div className="space-y-3">
          <Lbl text="Domain (with https://)"><input type="url" value={domain} onChange={e => setDomain(e.target.value)} className={inputCls} /></Lbl>
          <Lbl text="Pages (one path per line)"><textarea value={pages} onChange={e => setPages(e.target.value)} rows={8} className={cn(inputCls, "resize-y font-mono text-xs")} /></Lbl>
          <div className="grid grid-cols-2 gap-3">
            <Lbl text="Change frequency">
              <select value={freq} onChange={e => setFreq(e.target.value)} className={inputCls}>
                {["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].map(f => <option key={f}>{f}</option>)}
              </select>
            </Lbl>
            <Lbl text="Priority">
              <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>
                {["1.0", "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3"].map(p => <option key={p}>{p}</option>)}
              </select>
            </Lbl>
          </div>
        </div>
      </Panel>
      <Panel title="XML Sitemap Output"><ResultBox content={sitemap} filename="sitemap.xml" /></Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. COLOR PALETTE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function ColorPaletteGeneratorTool() {
  const [base, setBase] = useState("#7C3AED");
  const [type, setType] = useState("analogous");
  const [palette, setPalette] = useState<string[]>([]);
  const generate = useCallback(() => setPalette(generatePalette(base, type)), [base, type]);
  useEffect(() => { generate(); }, [generate]);
  const cssVars = palette.map((c, i) => `--color-${i + 1}: ${c};`).join("\n");
  return (
    <ToolWrap>
      <Panel title="Settings">
        <div className="space-y-4">
          <Lbl text="Base color">
            <div className="flex gap-3 mt-1.5">
              <input type="color" value={base} onChange={e => setBase(e.target.value)} className="h-10 w-20 cursor-pointer rounded-xl border border-gray-200 p-1 dark:border-gray-700" />
              <input type="text" value={base} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBase(e.target.value); }} className={cn(inputCls, "flex-1 font-mono")} />
            </div>
          </Lbl>
          <Lbl text="Harmony type">
            <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
              {["analogous", "complementary", "triadic", "tetradic", "monochromatic"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </Lbl>
          <button type="button" onClick={generate} className={btnCls}><RefreshCw size={14} /> Generate</button>
        </div>
      </Panel>
      <Panel title="Your Palette">
        {palette.length > 0 && (
          <>
            <div className="flex h-20 overflow-hidden rounded-2xl mb-4">
              {palette.map((c, i) => (
                <div key={i} className="flex-1 relative group cursor-pointer" style={{ background: c }} onClick={() => navigator.clipboard.writeText(c).catch(() => {})}>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{c}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-4">
              {palette.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl flex-shrink-0 border border-white/20 shadow-sm" style={{ background: c }} />
                  <span className="flex-1 font-mono text-sm text-gray-700 dark:text-gray-300">{c}</span>
                  <CopyBtn text={c} label="Copy" />
                </div>
              ))}
            </div>
            <CopyBtn text={cssVars} label="Copy as CSS vars" />
          </>
        )}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. GRADIENT GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function GradientGeneratorTool() {
  const [c1, setC1] = useState("#7C3AED");
  const [c2, setC2] = useState("#2DD4BF");
  const [direction, setDirection] = useState("135deg");
  const [gtype, setGtype] = useState("linear");
  const [customAngle, setCustomAngle] = useState("45");
  const dir = direction === "custom" ? `${customAngle}deg` : direction;
  const grad = gtype === "radial" ? `radial-gradient(circle, ${c1}, ${c2})` : `linear-gradient(${dir}, ${c1}, ${c2})`;
  const css = `background: ${grad};`;
  return (
    <ToolWrap>
      <Panel title="Settings">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[{ l: "Color 1", v: c1, s: setC1 }, { l: "Color 2", v: c2, s: setC2 }].map(({ l, v, s }) => (
              <Lbl key={l} text={l}>
                <div className="flex gap-2 mt-1">
                  <input type="color" value={v} onChange={e => s(e.target.value)} className="h-10 w-10 cursor-pointer rounded-xl border border-gray-200 p-1 dark:border-gray-700" />
                  <input type="text" value={v} onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) s(e.target.value); }} className={cn(inputCls, "flex-1 font-mono text-xs")} />
                </div>
              </Lbl>
            ))}
          </div>
          <Lbl text="Type">
            <select value={gtype} onChange={e => setGtype(e.target.value)} className={inputCls}>
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </Lbl>
          {gtype === "linear" && (
            <Lbl text="Direction">
              <select value={direction} onChange={e => setDirection(e.target.value)} className={inputCls}>
                {[["to right", "→ Left to right"], ["to bottom", "↓ Top to bottom"], ["135deg", "↘ Diagonal 135°"], ["45deg", "↗ Diagonal 45°"], ["to bottom right", "↘ Bottom right"], ["custom", "✏️ Custom angle"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Lbl>
          )}
          {direction === "custom" && gtype === "linear" && (
            <Lbl text="Custom angle (degrees)">
              <input type="number" min={0} max={360} value={customAngle} onChange={e => setCustomAngle(e.target.value)} className={inputCls} />
            </Lbl>
          )}
        </div>
      </Panel>
      <Panel title="Preview & Code">
        <div className="h-32 rounded-2xl mb-4 shadow-inner" style={{ background: grad }} />
        <div className="rounded-xl bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300 mb-3">{css}</div>
        <CopyBtn text={css} label="Copy CSS" />
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. FONT PAIR GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function FontPairGeneratorTool() {
  const pairs = [
    { heading: "Inter", body: "Inter", style: "Modern & Clean", tags: ["UI", "SaaS", "Tech"], hw: 700 },
    { heading: "Playfair Display", body: "Source Sans 3", style: "Editorial & Elegant", tags: ["Blog", "Magazine", "Luxury"], hw: 700 },
    { heading: "Poppins", body: "Poppins", style: "Friendly & Modern", tags: ["Brand", "Agency", "App"], hw: 700 },
    { heading: "Montserrat", body: "Lora", style: "Bold Meets Literary", tags: ["Portfolio", "Creative"], hw: 800 },
    { heading: "Space Grotesk", body: "DM Sans", style: "Tech & Startup", tags: ["Startup", "Fintech"], hw: 700 },
    { heading: "Raleway", body: "Nunito", style: "Soft & Approachable", tags: ["Wellness", "Community"], hw: 700 },
    { heading: "Bebas Neue", body: "Open Sans", style: "Impact & Strength", tags: ["Sport", "Fitness"], hw: 400 },
    { heading: "Merriweather", body: "Merriweather Sans", style: "Newspaper Classic", tags: ["News", "Authority"], hw: 700 },
  ];
  const [sel, setSel] = useState(0);
  const pair = pairs[sel];
  const css = `/* Heading */\nfont-family: '${pair.heading}', sans-serif;\nfont-weight: ${pair.hw};\n\n/* Body */\nfont-family: '${pair.body}', sans-serif;\nfont-weight: 400;`;
  const gfLink = `<link href="https://fonts.googleapis.com/css2?family=${pair.heading.replace(/ /g, "+")}:wght@${pair.hw}&family=${pair.body.replace(/ /g, "+")}:wght@400&display=swap" rel="stylesheet">`;
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${pair.heading.replace(/ /g, "+")}:wght@${pair.hw}&family=${pair.body.replace(/ /g, "+")}:wght@400&display=swap`;
    document.head.appendChild(link);
  }, [pair.heading, pair.body, pair.hw]);
  return (
    <ToolWrap>
      <Panel title="Choose a Pair">
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <button key={i} type="button" onClick={() => setSel(i)} className={cn("w-full text-left rounded-xl border p-3 transition-all", i === sel ? "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/20" : "border-gray-200 hover:border-violet-200 dark:border-gray-800")}>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.heading} + {p.body}</p>
              <div className="flex gap-1 mt-0.5">{p.tags.map(t => <span key={t} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">{t}</span>)}</div>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Preview">
        <div className="mb-5 rounded-xl border border-gray-100 p-5 dark:border-gray-800">
          <h3 style={{ fontFamily: `'${pair.heading}', sans-serif`, fontWeight: pair.hw, fontSize: "1.5rem", lineHeight: 1.2 }} className="text-gray-900 dark:text-white mb-3">The Creator Grows Fast</h3>
          <p style={{ fontFamily: `'${pair.body}', sans-serif`, fontWeight: 400, fontSize: "0.875rem", lineHeight: 1.7 }} className="text-gray-600 dark:text-gray-400">This font pairing brings clarity and personality to your brand. The heading commands attention while the body stays warm and readable on any screen.</p>
        </div>
        <div className="space-y-3">
          <pre className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">{css}</pre>
          <div className="flex gap-2 flex-wrap">
            <CopyBtn text={css} label="Copy CSS" />
            <CopyBtn text={gfLink} label="Copy Google link" />
          </div>
        </div>
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. QR CODE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export function QRCodeGeneratorTool() {
  const [text, setText] = useState("https://www.logoviking.com");
  const [size, setSize] = useState(300);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const fg = fgColor.replace("#", "");
  const bg = bgColor.replace("#", "");
  const qrUrl = text ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${fg}&bgcolor=${bg}&margin=10&qzone=1` : "";
  return (
    <ToolWrap>
      <Panel title="QR Settings">
        <div className="space-y-4">
          <Lbl text="URL or text"><textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="https://your-site.com" className={cn(inputCls, "resize-none")} /></Lbl>
          <Lbl text={`Size: ${size}×${size}px`}><input type="range" min={100} max={600} step={50} value={size} onChange={e => setSize(+e.target.value)} className="w-full accent-violet-600" /></Lbl>
          <div className="grid grid-cols-2 gap-3">
            <Lbl text="Foreground">
              <div className="flex gap-2 mt-1"><input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="h-10 w-10 rounded-xl border border-gray-200 p-1" /><span className={cn(inputCls, "flex-1 font-mono text-xs flex items-center")}>{fgColor}</span></div>
            </Lbl>
            <Lbl text="Background">
              <div className="flex gap-2 mt-1"><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-10 w-10 rounded-xl border border-gray-200 p-1" /><span className={cn(inputCls, "flex-1 font-mono text-xs flex items-center")}>{bgColor}</span></div>
            </Lbl>
          </div>
        </div>
      </Panel>
      <Panel title="QR Code">
        {qrUrl ? (
          <>
            <div className="flex justify-center mb-4"><img src={qrUrl} alt="QR Code" className="rounded-2xl border border-gray-200 dark:border-gray-700 max-w-full" style={{ width: Math.min(size, 280) }} /></div>
            <DownloadBtn href={qrUrl} filename={`qr-${text.slice(0, 20).replace(/[^a-z0-9]/gi, "-")}.png`} />
          </>
        ) : <div className="flex h-48 items-center justify-center text-gray-400">Enter text to generate a QR code</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. COMPRESS IMAGE
// ─────────────────────────────────────────────────────────────────────────────
export function CompressImageTool() {
  const { img, fileName, UploadZone } = useImageFile();
  const [quality, setQuality] = useState(0.78);
  const [format, setFormat] = useState<"webp"|"jpeg">("webp");
  const [output, setOutput] = useState<string | null>(null);
  const [outSize, setOutSize] = useState(0);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{setOutput(null);setOutSize(0);},[img]);
  const compress = async () => {
    if (!img) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx=canvas.getContext("2d")!;
    if(format==="jpeg"){ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height)}
    ctx.drawImage(img, 0, 0);
    const mime=format==="webp"?"image/webp":"image/jpeg";
    const blob=await new Promise<Blob|null>(res=>canvas.toBlob(res,mime,quality));
    if(blob){
      if(output?.startsWith("blob:"))URL.revokeObjectURL(output);
      setOutput(URL.createObjectURL(blob));setOutSize(blob.size);
    }
    setBusy(false);
  };
  return (
    <ToolWrap>
      <Panel title="Upload Image">
        <UploadZone />
        {img && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Lbl text="Output format"><select value={format} onChange={e=>setFormat(e.target.value as "webp"|"jpeg")} className={inputCls}><option value="webp">WebP</option><option value="jpeg">JPG</option></select></Lbl>
              <Lbl text={`Quality: ${Math.round(quality * 100)}%`}><input type="range" min={0.1} max={1} step={0.05} value={quality} onChange={e => setQuality(+e.target.value)} className="mt-3 w-full accent-violet-600" /></Lbl>
            </div>
            <p className="text-xs text-gray-500">{img.naturalWidth}×{img.naturalHeight}px · WebP usually gives a smaller result; JPG is useful for broad compatibility.</p>
            <button type="button" onClick={compress} disabled={busy} className={btnCls}>{busy?<RefreshCw size={14} className="animate-spin"/>:<Zap size={14} />} {busy?"Compressing…":"Compress Image"}</button>
          </div>
        )}
      </Panel>
      <Panel title="Result">
        {output ? (
          <div className="space-y-3">
            <img src={output} alt="Compressed" className="w-full rounded-xl object-contain max-h-48" />
            <p className="text-sm font-semibold text-emerald-600">{Math.max(1,Math.round(outSize / 1024)).toLocaleString()} KB output</p>
            <DownloadBtn href={output} filename={`compressed-${fileName.replace(/\.[^.]+$/, "")}.${format==="webp"?"webp":"jpg"}`} />
          </div>
        ) : <div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to compress</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. RESIZE IMAGE
// ─────────────────────────────────────────────────────────────────────────────
export function ResizeImageTool() {
  const { img, fileName, UploadZone } = useImageFile();
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [keepAspect, setKeepAspect] = useState(true);
  const [output, setOutput] = useState<string | null>(null);
  useEffect(() => { if (img && keepAspect) setHeight(Math.round(img.naturalHeight * (width / img.naturalWidth))); }, [width, img, keepAspect]);
  const resize = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = keepAspect ? Math.round(img.naturalHeight * (width / img.naturalWidth)) : height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    setOutput(canvas.toDataURL("image/png"));
  };
  return (
    <ToolWrap>
      <Panel title="Upload & Settings">
        <UploadZone />
        {img && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-400">Original: {img.naturalWidth}×{img.naturalHeight}px</p>
            <div className="grid grid-cols-2 gap-3">
              <Lbl text="Width (px)"><input type="number" min={1} max={10000} value={width} onChange={e => setWidth(+e.target.value)} className={inputCls} /></Lbl>
              <Lbl text="Height (px)"><input type="number" min={1} max={10000} value={height} onChange={e => { if (!keepAspect) setHeight(+e.target.value); }} disabled={keepAspect} className={cn(inputCls, keepAspect && "opacity-50")} /></Lbl>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={keepAspect} onChange={e => setKeepAspect(e.target.checked)} className="accent-violet-600" /> Keep aspect ratio</label>
            <button type="button" onClick={resize} className={btnCls}><Zap size={14} /> Resize</button>
          </div>
        )}
      </Panel>
      <Panel title="Result">
        {output ? (
          <div className="space-y-3">
            <img src={output} alt="Resized" className="w-full rounded-xl object-contain max-h-48" />
            <DownloadBtn href={output} filename={`resized-${width}x${height}-${fileName}`} />
          </div>
        ) : <div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to resize</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. ROTATE IMAGE
// ─────────────────────────────────────────────────────────────────────────────
export function RotateImageTool() {
  const { img, fileName, UploadZone } = useImageFile();
  const [output, setOutput] = useState<string | null>(null);
  const [totalAngle, setTotalAngle] = useState(0);
  const doRotate = (deg: number) => {
    if (!img) return;
    const newAngle = (totalAngle + deg + 360) % 360;
    setTotalAngle(newAngle);
    const rad = (newAngle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
    canvas.height = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    setOutput(canvas.toDataURL("image/png"));
  };
  return (
    <ToolWrap>
      <Panel title="Upload Image">
        <UploadZone />
        {img && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-400">Current angle: {totalAngle}°</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => doRotate(-90)} className="rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200">↺ 90° left</button>
              <button type="button" onClick={() => doRotate(90)} className="rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200">↻ 90° right</button>
              <button type="button" onClick={() => doRotate(180)} className="rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 col-span-2">↕ Flip 180°</button>
            </div>
          </div>
        )}
      </Panel>
      <Panel title="Result">
        {output ? (
          <div className="space-y-3">
            <img src={output} alt="Rotated" className="w-full rounded-xl object-contain max-h-48" />
            <DownloadBtn href={output} filename={`rotated-${totalAngle}deg-${fileName}`} />
          </div>
        ) : <div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to rotate</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. IMAGE FORMAT CONVERTER (PNG↔JPG, WebP)
// ─────────────────────────────────────────────────────────────────────────────
export function ImageConverterTool({ targetFormat }: { targetFormat: "jpeg" | "png" | "webp" }) {
  const { img, fileName, UploadZone } = useImageFile();
  const [quality, setQuality] = useState(0.9);
  const [output, setOutput] = useState<string | null>(null);
  const ext = targetFormat === "jpeg" ? "jpg" : targetFormat;
  const label = targetFormat === "jpeg" ? "JPEG" : targetFormat.toUpperCase();
  const convert = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    if (targetFormat === "jpeg") { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0);
    setOutput(canvas.toDataURL(`image/${targetFormat}`, quality));
  };
  return (
    <ToolWrap>
      <Panel title={`Convert to ${label}`}>
        <UploadZone />
        {img && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-400">{img.naturalWidth}×{img.naturalHeight}px</p>
            {targetFormat !== "png" && <Lbl text={`Quality: ${Math.round(quality * 100)}%`}><input type="range" min={0.5} max={1} step={0.05} value={quality} onChange={e => setQuality(+e.target.value)} className="w-full accent-violet-600" /></Lbl>}
            <button type="button" onClick={convert} className={btnCls}><Zap size={14} /> Convert to {label}</button>
          </div>
        )}
      </Panel>
      <Panel title="Result">
        {output ? (
          <div className="space-y-3">
            <img src={output} alt="Converted" className="w-full rounded-xl object-contain max-h-48" />
            <DownloadBtn href={output} filename={`${fileName.replace(/\.[^.]+$/, "")}.${ext}`} label={`Download .${ext}`} />
          </div>
        ) : <div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to convert</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 19. WATERMARK TOOL
// ─────────────────────────────────────────────────────────────────────────────
export function WatermarkTool() {
  const { img, fileName, UploadZone } = useImageFile();
  const [text, setText] = useState("© YourBrand");
  const [position, setPosition] = useState("bottom-right");
  const [opacity, setOpacity] = useState(0.7);
  const [color, setColor] = useState("#FFFFFF");
  const [output, setOutput] = useState<string | null>(null);
  const apply = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const fs = Math.max(16, Math.round(canvas.height / 20));
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    const tw = ctx.measureText(text).width;
    const pad = fs;
    const pos: Record<string, [number, number]> = { "center": [canvas.width / 2, canvas.height / 2], "bottom-right": [canvas.width - tw / 2 - pad, canvas.height - pad], "bottom-left": [tw / 2 + pad, canvas.height - pad], "top-right": [canvas.width - tw / 2 - pad, pad + fs], "top-left": [tw / 2 + pad, pad + fs] };
    const [x, y] = pos[position] || pos["bottom-right"];
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.strokeStyle = color === "#FFFFFF" ? "#000" : "#FFF"; ctx.lineWidth = 1.5;
    ctx.strokeText(text, x, y); ctx.fillText(text, x, y);
    setOutput(canvas.toDataURL("image/png"));
  };
  return (
    <ToolWrap>
      <Panel title="Settings">
        <UploadZone />
        {img && (
          <div className="mt-4 space-y-3">
            <Lbl text="Watermark text"><input type="text" value={text} onChange={e => setText(e.target.value)} className={inputCls} /></Lbl>
            <Lbl text="Position">
              <select value={position} onChange={e => setPosition(e.target.value)} className={inputCls}>
                {[["bottom-right", "Bottom right"], ["bottom-left", "Bottom left"], ["top-right", "Top right"], ["top-left", "Top left"], ["center", "Center"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Lbl>
            <div className="grid grid-cols-2 gap-3">
              <Lbl text={`Opacity: ${Math.round(opacity * 100)}%`}><input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={e => setOpacity(+e.target.value)} className="w-full accent-violet-600" /></Lbl>
              <Lbl text="Color"><input type="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1.5 h-10 w-full cursor-pointer rounded-xl border border-gray-200 p-1" /></Lbl>
            </div>
            <button type="button" onClick={apply} className={btnCls}><ImageIcon size={14} /> Add Watermark</button>
          </div>
        )}
      </Panel>
      <Panel title="Result">
        {output ? (
          <div className="space-y-3">
            <img src={output} alt="Watermarked" className="w-full rounded-xl object-contain max-h-48" />
            <DownloadBtn href={output} filename={`watermarked-${fileName}`} />
          </div>
        ) : <div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to add watermark</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 20. MEME CREATOR
// ─────────────────────────────────────────────────────────────────────────────
export function MemeCreatorTool() {
  const { img, UploadZone } = useImageFile();
  const [topText, setTopText] = useState("WHEN YOU FINALLY");
  const [bottomText, setBottomText] = useState("UNDERSTAND CSS FLEXBOX");
  const [output, setOutput] = useState<string | null>(null);
  const create = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const fs = Math.max(20, Math.round(canvas.height / 10));
    ctx.font = `900 ${fs}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = "center"; ctx.lineWidth = fs / 8;
    const draw = (t: string, y: number) => {
      ctx.strokeStyle = "black"; ctx.fillStyle = "white";
      ctx.strokeText(t.toUpperCase(), canvas.width / 2, y);
      ctx.fillText(t.toUpperCase(), canvas.width / 2, y);
    };
    if (topText) draw(topText, fs + 10);
    if (bottomText) draw(bottomText, canvas.height - fs / 2 - 10);
    setOutput(canvas.toDataURL("image/jpeg", 0.92));
  };
  return (
    <ToolWrap>
      <Panel title="Meme Settings">
        <UploadZone />
        {img && (
          <div className="mt-4 space-y-3">
            <Lbl text="Top text"><input type="text" value={topText} onChange={e => setTopText(e.target.value)} placeholder="TOP TEXT" className={inputCls} /></Lbl>
            <Lbl text="Bottom text"><input type="text" value={bottomText} onChange={e => setBottomText(e.target.value)} placeholder="BOTTOM TEXT" className={inputCls} /></Lbl>
            <button type="button" onClick={create} className={btnCls}><ImageIcon size={14} /> Create Meme</button>
          </div>
        )}
      </Panel>
      <Panel title="Your Meme">
        {output ? (
          <div className="space-y-3">
            <img src={output} alt="Meme" className="w-full rounded-xl" />
            <DownloadBtn href={output} filename="meme.jpg" />
          </div>
        ) : <div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to make a meme</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 21. COLOR PICKER
// ─────────────────────────────────────────────────────────────────────────────
export function ColorPickerTool() {
  const { img, UploadZone } = useImageFile();
  const [picked, setPicked] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
  }, [img]);
  const pickFromCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !img) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (img.naturalWidth / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (img.naturalHeight / rect.height));
    const [r, g, b] = canvasRef.current.getContext("2d")!.getImageData(x, y, 1, 1).data;
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    setPicked(hex);
    setHistory(h => [hex, ...h.filter(c => c !== hex)].slice(0, 12));
  };
  const pickFromScreen = async () => {
    if (!("EyeDropper" in window)) return;
    try {
      const result = await (new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper()).open();
      const hex = result.sRGBHex;
      setPicked(hex); setHistory(h => [hex, ...h.filter(c => c !== hex)].slice(0, 12));
    } catch { /* user cancelled */ }
  };
  const hsl = picked ? hexToHsl(picked) : null;
  return (
    <ToolWrap>
      <Panel title="Color Picker">
        <UploadZone />
        {img && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Click anywhere on the image to pick a color</p>
            <canvas ref={canvasRef} onClick={pickFromCanvas} className="w-full cursor-crosshair rounded-xl border border-gray-200 dark:border-gray-700" style={{ maxHeight: "12rem", objectFit: "contain" }} />
          </div>
        )}
        {"EyeDropper" in window && !img && (
          <button type="button" onClick={pickFromScreen} className={cn(btnCls, "w-full justify-center mt-4")}>🎨 Pick color from screen</button>
        )}
      </Panel>
      <Panel title="Picked Colors">
        {picked ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-2xl border border-white/20 shadow-lg flex-shrink-0" style={{ background: picked }} />
              <div>
                <p className="font-bold text-xl text-gray-900 dark:text-white">{picked.toUpperCase()}</p>
                {hsl && <p className="text-sm text-gray-400">HSL({hsl[0]}, {hsl[1]}%, {hsl[2]}%)</p>}
              </div>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <CopyBtn text={picked.toUpperCase()} label="Copy HEX" />
              {hsl && <CopyBtn text={`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`} label="Copy HSL" />}
            </div>
          </>
        ) : <p className="text-sm text-gray-400 mb-4">Upload an image and click to pick a color</p>}
        {history.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 mb-2">History</p>
            <div className="flex flex-wrap gap-2">
              {history.map(c => <button key={c} type="button" title={c} onClick={() => setPicked(c)} className="h-8 w-8 rounded-xl border-2 border-white shadow-md dark:border-gray-900" style={{ background: c }} />)}
            </div>
          </>
        )}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 22. IMAGE FILTER TOOL
// ─────────────────────────────────────────────────────────────────────────────
export function ImageFilterTool() {
  const { img, fileName, UploadZone } = useImageFile();
  const [filter, setFilter] = useState("blur");
  const [intensity, setIntensity] = useState(5);
  const [output, setOutput] = useState<string | null>(null);
  const apply = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    const filterMap: Record<string, string> = {
      blur: `blur(${intensity}px)`,
      grayscale: "grayscale(100%)",
      sepia: "sepia(80%)",
      brightness: `brightness(${1 + intensity / 10})`,
      contrast: `contrast(${1 + intensity / 10})`,
      saturate: `saturate(${1 + intensity / 5})`,
      invert: "invert(100%)",
      sharpen: `contrast(1.2) brightness(1.05)`,
    };
    ctx.filter = filterMap[filter] || `blur(${intensity}px)`;
    ctx.drawImage(img, 0, 0);
    setOutput(canvas.toDataURL("image/png"));
  };
  return (
    <ToolWrap>
      <Panel title="Settings">
        <UploadZone />
        {img && (
          <div className="mt-4 space-y-3">
            <Lbl text="Filter">
              <select value={filter} onChange={e => setFilter(e.target.value)} className={inputCls}>
                {[["blur", "Blur"], ["grayscale", "Grayscale"], ["sepia", "Sepia vintage"], ["brightness", "Brighten"], ["contrast", "Contrast"], ["saturate", "Saturate"], ["invert", "Invert"], ["sharpen", "Sharpen"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Lbl>
            {!["grayscale", "invert", "sharpen"].includes(filter) && (
              <Lbl text={`Intensity: ${intensity}`}><input type="range" min={1} max={20} value={intensity} onChange={e => setIntensity(+e.target.value)} className="w-full accent-violet-600" /></Lbl>
            )}
            <button type="button" onClick={apply} className={btnCls}><Zap size={14} /> Apply Filter</button>
          </div>
        )}
      </Panel>
      <Panel title="Result">
        {output ? (
          <div className="space-y-3">
            <img src={output} alt="Filtered" className="w-full rounded-xl object-contain max-h-48" />
            <DownloadBtn href={output} filename={`${filter}-${fileName}`} />
          </div>
        ) : <div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to apply filters</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 23. IMAGE UPSCALER
// ─────────────────────────────────────────────────────────────────────────────
export function ImageUpscalerTool() {
  const { img, fileName, UploadZone } = useImageFile();
  const [scale, setScale] = useState(2);
  const [output, setOutput] = useState<string | null>(null);
  const upscale = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth * scale; canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    setOutput(canvas.toDataURL("image/png"));
  };
  return (
    <ToolWrap>
      <Panel title="Upscale Settings">
        <UploadZone />
        {img && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-gray-400">{img.naturalWidth}×{img.naturalHeight} → {img.naturalWidth * scale}×{img.naturalHeight * scale}px</p>
            <Lbl text={`Scale: ${scale}×`}><input type="range" min={1.5} max={4} step={0.5} value={scale} onChange={e => setScale(+e.target.value)} className="w-full accent-violet-600" /></Lbl>
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">⚠️ Browser-based upscaling uses smart interpolation. For AI upscaling, try Topaz Gigapixel.</div>
            <button type="button" onClick={upscale} className={btnCls}><Zap size={14} /> Upscale</button>
          </div>
        )}
      </Panel>
      <Panel title="Result">
        {output ? (
          <div className="space-y-3">
            <img src={output} alt="Upscaled" className="w-full rounded-xl object-contain max-h-48" />
            <DownloadBtn href={output} filename={`${scale}x-${fileName}`} />
          </div>
        ) : <div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to upscale</div>}
      </Panel>
    </ToolWrap>
  );
}

// ─── CharacterCounterTool ────────────────────────────────────────────────────
const PLATFORM_LIMITS = [
  { name: "Twitter / X",          limit: 280 },
  { name: "Instagram Caption",    limit: 2200 },
  { name: "Instagram Bio",        limit: 150 },
  { name: "TikTok Caption",       limit: 150 },
  { name: "YouTube Title",        limit: 100 },
  { name: "YouTube Description",  limit: 5000 },
  { name: "LinkedIn Post",        limit: 3000 },
  { name: "Facebook Post",        limit: 63206 },
];

function CharacterCounterTool() {
  const [text, setText] = useState("");
  const chars = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  function barColor(chars: number, limit: number) {
    const pct = chars / limit;
    if (pct >= 1) return "bg-red-500";
    if (pct >= 0.85) return "bg-yellow-400";
    return "bg-green-500";
  }
  function textColor(chars: number, limit: number) {
    const pct = chars / limit;
    if (pct >= 1) return "text-red-500";
    if (pct >= 0.85) return "text-yellow-500";
    return "text-green-500";
  }

  return (
    <ToolWrap>
      {/* LEFT PANEL */}
      <Panel title="Your Text">
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder="Start typing or paste your text here…"
            className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-200">{chars.toLocaleString()}</span> characters &nbsp;·&nbsp;
              <span className="font-semibold text-gray-700 dark:text-gray-200">{words.toLocaleString()}</span> words
            </span>
            <CopyBtn text={text} />
          </div>
        </div>
      </Panel>

      {/* RIGHT PANEL */}
      <Panel title="Platform Limits">
        <div className="space-y-4">
          {PLATFORM_LIMITS.map(({ name, limit }) => {
            const remaining = limit - chars;
            const pct = Math.min(chars / limit, 1);
            return (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{name}</span>
                  <span className={cn("font-semibold", textColor(chars, limit))}>
                    {remaining >= 0 ? `${remaining.toLocaleString()} left` : `${Math.abs(remaining).toLocaleString()} over`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={cn("h-2 rounded-full transition-all", barColor(chars, limit))}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
                <div className="text-right text-[10px] text-gray-400 mt-0.5">{limit.toLocaleString()} max</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </ToolWrap>
  );
}

// ─── WordCounterTool ──────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "the","a","an","is","are","was","were","to","of","and","in","that","it",
  "for","on","with","as","at","this","be","by","from","or","but","not",
  "have","had","he","she","they","we","you","do","i","me","my","your","his","her","its",
]);

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  const matches = word.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  if (word.endsWith("e") && count > 1) count--;
  return Math.max(count, 1);
}

function WordCounterTool() {
  const [text, setText] = useState("");

  const words      = text.trim() === "" ? [] : text.trim().split(/\s+/);
  const wordCount  = words.length;
  const charsAll   = text.length;
  const charsNoSp  = text.replace(/\s/g, "").length;

  const sentences  = (text.match(/[^.!?]+[.!?]+/g) || []).length || (text.trim() ? 1 : 0);
  const paragraphs = text.trim() === "" ? 0 : text.trim().split(/\n\s*\n+/).length;

  const readMin    = wordCount > 0 ? Math.ceil(wordCount / 200) : 0;
  const speakMin   = wordCount > 0 ? Math.ceil(wordCount / 130) : 0;

  // Flesch-Kincaid grade (simplified)
  const syllableCount = words.reduce((s, w) => s + countSyllables(w), 0);
  const fkGrade =
    wordCount > 0 && sentences > 0
      ? Math.round(
          (0.39 * (wordCount / sentences) + 11.8 * (syllableCount / wordCount) - 15.59) * 10
        ) / 10
      : 0;
  const gradeLabel =
    fkGrade <= 6  ? "Very Easy" :
    fkGrade <= 8  ? "Easy" :
    fkGrade <= 10 ? "Standard" :
    fkGrade <= 12 ? "Fairly Difficult" :
    fkGrade <= 14 ? "Difficult" : "Very Difficult";

  // Top 10 words
  const freq: Record<string, number> = {};
  words.forEach((w) => {
    const clean = w.toLowerCase().replace(/[^a-z']/g, "");
    if (clean && !STOP_WORDS.has(clean)) freq[clean] = (freq[clean] || 0) + 1;
  });
  const topWords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxFreq = topWords[0]?.[1] || 1;

  const stats = [
    { label: "Words",                 value: wordCount.toLocaleString() },
    { label: "Chars (with spaces)",   value: charsAll.toLocaleString() },
    { label: "Chars (no spaces)",     value: charsNoSp.toLocaleString() },
    { label: "Sentences",             value: sentences.toLocaleString() },
    { label: "Paragraphs",            value: paragraphs.toLocaleString() },
    { label: "Reading Time",          value: wordCount === 0 ? "—" : `~${readMin} min` },
    { label: "Speaking Time",         value: wordCount === 0 ? "—" : `~${speakMin} min` },
    { label: "Readability Grade",     value: wordCount === 0 ? "—" : `${fkGrade > 0 ? fkGrade : "—"} · ${gradeLabel}` },
  ];

  return (
    <ToolWrap>
      {/* LEFT */}
      <Panel title="Your Text">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          placeholder="Paste or type your text here…"
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </Panel>

      {/* RIGHT */}
      <Panel title="Statistics">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60 p-3 text-center">
                <div className="text-lg font-bold text-violet-600 dark:text-violet-400 truncate">{value}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {topWords.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Top Words</p>
              <div className="space-y-1.5">
                {topWords.map(([word, count]) => (
                  <div key={word} className="flex items-center gap-2">
                    <span className="w-24 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{word}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-violet-500 transition-all"
                        style={{ width: `${(count / maxFreq) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-gray-400">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>
    </ToolWrap>
  );
}

// ─── BrandDealCalculatorTool ──────────────────────────────────────────────────
const PLATFORMS_BD = [
  { id: "instagram",  label: "Instagram",  mult: 1.0 },
  { id: "youtube",    label: "YouTube",     mult: 2.0 },
  { id: "tiktok",     label: "TikTok",      mult: 0.8 },
  { id: "twitter",    label: "Twitter / X", mult: 0.6 },
  { id: "linkedin",   label: "LinkedIn",    mult: 1.5 },
];
const NICHES_BD = [
  { id: "general",   label: "General",        mult: 1.0 },
  { id: "fashion",   label: "Fashion/Beauty",  mult: 1.2 },
  { id: "gaming",    label: "Gaming",          mult: 0.9 },
  { id: "finance",   label: "Finance",         mult: 2.0 },
  { id: "food",      label: "Food",            mult: 1.05 },
  { id: "fitness",   label: "Fitness",         mult: 1.3 },
  { id: "tech",      label: "Tech",            mult: 1.8 },
  { id: "travel",    label: "Travel",          mult: 1.1 },
  { id: "education", label: "Education",       mult: 1.5 },
  { id: "parenting", label: "Parenting",       mult: 1.0 },
  { id: "pets",      label: "Pets",            mult: 0.95 },
  { id: "comedy",    label: "Comedy",          mult: 0.9 },
];
const CONTENT_TYPES_BD = [
  { id: "post",     label: "Post / Photo",       mult: 1.0 },
  { id: "story",    label: "Story",              mult: 0.5 },
  { id: "reel",     label: "Reel / Short",       mult: 1.5 },
  { id: "video",    label: "Dedicated Video",    mult: 3.0 },
  { id: "mention",  label: "Mention in Video",   mult: 0.3 },
];
const NEGOTIATION_TIPS = [
  "Always negotiate usage rights separately — they can double your base rate.",
  "Request a kill fee (25-50%) if the brand can cancel within 72 hours.",
  "Ask for an analytics report deadline so you can share post performance.",
  "Bundle deliverables (e.g., 1 reel + 3 stories) for a better package rate.",
  "Exclusivity clauses beyond 30 days should add at least 20% per extra month.",
  "For affiliate deals, negotiate a minimum guarantee + commission.",
  "Get the contract before creating any content — protect your work.",
];

function fmtUSD(n: number) {
  if (n >= 10000) return `$${Math.round(n / 100) * 100 < 1000 ? (Math.round(n)).toLocaleString() : (Math.round(n / 100) * 100).toLocaleString()}`;
  return `$${Math.round(n).toLocaleString()}`;
}
function logSliderVal(raw: number, min: number, max: number) {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return Math.round(Math.pow(10, logMin + (raw / 100) * (logMax - logMin)));
}
function fmtFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return n.toString();
}

function BrandDealCalculatorTool() {
  const [platform, setPlatform]     = useState("instagram");
  const [followerSlider, setFollowerSlider] = useState(50); // 0-100 log scale
  const [engRate, setEngRate]       = useState(3);
  const [contentType, setContentType] = useState("post");
  const [niche, setNiche]           = useState("general");
  const [usageRights, setUsageRights] = useState(false);
  const [exclusivity, setExclusivity] = useState(false);
  const [rushFee, setRushFee]       = useState(false);

  const followers = logSliderVal(followerSlider, 1000, 10_000_000);
  const platMult  = PLATFORMS_BD.find((p) => p.id === platform)?.mult ?? 1;
  const nicheMult = NICHES_BD.find((n) => n.id === niche)?.mult ?? 1;
  const contMult  = CONTENT_TYPES_BD.find((c) => c.id === contentType)?.mult ?? 1;
  const erMult    = engRate > 6 ? 2.0 : engRate > 3 ? 1.5 : engRate > 1 ? 1.0 : 0.7;

  let base = followers * 0.01 * erMult * platMult * nicheMult * contMult;
  if (usageRights) base *= 1.25;
  if (exclusivity) base *= 1.20;
  if (rushFee)     base *= 1.30;

  const minRate     = base * 0.6;
  const marketRate  = base;
  const premiumRate = base * 1.8;
  const storyRate   = base * 0.5;
  const swipeRate   = base * 0.15;
  const cpm         = followers > 0 ? (marketRate / (followers * 0.03)) * 1000 : 0; // assume 3% reach

  const rateCards = [
    { label: "Minimum Rate",  value: fmtUSD(minRate),     sub: "Starting point",       color: "from-green-500 to-emerald-600" },
    { label: "Market Rate",   value: fmtUSD(marketRate),  sub: "Industry standard",    color: "from-violet-500 to-purple-600" },
    { label: "Premium Rate",  value: fmtUSD(premiumRate), sub: "Top-tier positioning",  color: "from-amber-500 to-orange-600" },
  ];

  const selectCls = "block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  return (
    <ToolWrap>
      {/* LEFT — Inputs */}
      <Panel title="Campaign Details">
        <div className="space-y-4">
          {/* Platform */}
          <Lbl text="Platform">
            <div className="flex flex-wrap gap-2 mt-1">
              {PLATFORMS_BD.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                    platform === p.id
                      ? "bg-violet-600 text-white border-violet-600"
                      : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 hover:border-violet-400"
                  )}
                >{p.label}</button>
              ))}
            </div>
          </Lbl>

          {/* Followers */}
          <div>
            <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              <span>Followers</span>
              <span className="text-violet-600 font-bold">{fmtFollowers(followers)}</span>
            </div>
            <input
              type="range" min={0} max={100} value={followerSlider}
              onChange={(e) => setFollowerSlider(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>1K</span><span>10M</span>
            </div>
          </div>

          {/* Engagement Rate */}
          <div>
            <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              <span>Engagement Rate</span>
              <span className="text-violet-600 font-bold">{engRate.toFixed(1)}%</span>
            </div>
            <input
              type="range" min={0.5} max={15} step={0.1} value={engRate}
              onChange={(e) => setEngRate(Number(e.target.value))}
              className="w-full accent-violet-600"
            />
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>0.5%</span><span>15%</span>
            </div>
          </div>

          {/* Content Type */}
          <Lbl text="Content Type">
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectCls}>
              {CONTENT_TYPES_BD.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Lbl>

          {/* Niche */}
          <Lbl text="Niche">
            <select value={niche} onChange={(e) => setNiche(e.target.value)} className={selectCls}>
              {NICHES_BD.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
          </Lbl>

          {/* Deliverables */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Add-ons</p>
            <div className="space-y-2">
              {[
                { label: "Usage Rights (+25%)",         value: usageRights, set: setUsageRights },
                { label: "Exclusivity 30 days (+20%)",  value: exclusivity, set: setExclusivity },
                { label: "Rush Fee 48h (+30%)",          value: rushFee,     set: setRushFee },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={value} onChange={(e) => set(e.target.checked)}
                    className="h-4 w-4 rounded accent-violet-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* RIGHT — Results */}
      <div className="space-y-4">
        {/* Rate Cards */}
        <div className="grid grid-cols-3 gap-3">
          {rateCards.map(({ label, value, sub, color }) => (
            <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-4 text-white`}>
              <div className="text-xl font-extrabold">{value}</div>
              <div className="text-xs font-semibold opacity-90 mt-0.5">{label}</div>
              <div className="text-[10px] opacity-70 mt-1">{sub}</div>
            </div>
          ))}
        </div>

        {/* Secondary stats */}
        <Panel title="Additional Rates">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-base font-bold text-violet-600 dark:text-violet-400">{fmtUSD(storyRate)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Per Story</div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-base font-bold text-violet-600 dark:text-violet-400">{fmtUSD(swipeRate)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Per Swipe-Up / Link</div>
            </div>
            <div className="col-span-2 rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className="text-base font-bold text-violet-600 dark:text-violet-400">{fmtUSD(cpm)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Effective CPM (est.)</div>
            </div>
          </div>
        </Panel>

        {/* Negotiation Tips */}
        <Panel title="Negotiation Tips">
          <ul className="space-y-2">
            {NEGOTIATION_TIPS.map((tip, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                <Zap size={13} className="mt-0.5 shrink-0 text-violet-500" />
                {tip}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </ToolWrap>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// TRAFFIC-FOCUSED CREATOR / IMAGE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
export function CropImageTool() {
  const { img, fileName, UploadZone } = useImageFile();
  const [ratio, setRatio] = useState("1:1");
  const [output, setOutput] = useState<string | null>(null);
  const ratios: Record<string, number | null> = { "Free": null, "1:1": 1, "4:5": 4/5, "3:2": 3/2, "16:9": 16/9, "9:16": 9/16 };
  const crop = () => {
    if (!img) return;
    const target = ratios[ratio];
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (target) {
      const sourceRatio = sw / sh;
      if (sourceRatio > target) { sw = Math.round(sh * target); sx = Math.round((img.naturalWidth - sw) / 2); }
      else { sh = Math.round(sw / target); sy = Math.round((img.naturalHeight - sh) / 2); }
    }
    const canvas = document.createElement("canvas");
    canvas.width = sw; canvas.height = sh;
    canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    setOutput(canvas.toDataURL("image/png"));
  };
  return <ToolWrap>
    <Panel title="Crop image"><UploadZone />{img&&<div className="mt-4 space-y-3">
      <p className="text-xs text-gray-400">Original: {img.naturalWidth}×{img.naturalHeight}px</p>
      <Lbl text="Aspect ratio"><select value={ratio} onChange={e=>setRatio(e.target.value)} className={inputCls}>{Object.keys(ratios).map(r=><option key={r}>{r}</option>)}</select></Lbl>
      <p className="text-xs text-gray-400">Crop is centered so the selected ratio is preserved without stretching.</p>
      <button type="button" onClick={crop} className={btnCls}><Zap size={14}/> Crop image</button>
    </div>}</Panel>
    <Panel title="Result">{output?<div className="space-y-3"><img src={output} alt="Cropped result" className="w-full rounded-xl object-contain max-h-64"/><DownloadBtn href={output} filename={`cropped-${fileName.replace(/\.[^.]+$/,"")}.png`}/></div>:<div className="flex h-48 items-center justify-center text-sm text-gray-400">Upload an image to crop</div>}</Panel>
  </ToolWrap>;
}

export function ImageToBase64Tool() {
  const [name,setName]=useState(""); const [size,setSize]=useState(0); const [value,setValue]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const onFile=(e:ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0]; if(!f)return; if(!f.type.startsWith("image/"))return; setName(f.name);setSize(f.size); const r=new FileReader();r.onload=()=>setValue(String(r.result||""));r.readAsDataURL(f)};
  return <ToolWrap>
    <Panel title="Choose image"><button type="button" onClick={()=>fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-violet-300 p-8 text-center hover:border-violet-500 dark:border-violet-700"><Upload className="mx-auto mb-2 text-violet-500"/><span className="text-sm font-semibold">Select an image</span></button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile}/>{name&&<p className="mt-3 text-xs text-gray-500">{name} · {(size/1024).toFixed(1)} KB</p>}</Panel>
    <Panel title="Base64 data URL">{value?<div className="space-y-3"><textarea readOnly value={value} rows={10} className={cn(inputCls,"font-mono text-xs resize-none")}/><div className="flex flex-wrap gap-2"><CopyBtn text={value} label="Copy Base64"/><DownloadBtn href={`data:text/plain;charset=utf-8,${encodeURIComponent(value)}`} filename={`${name||"image"}.base64.txt`} label="Download TXT"/></div><p className="text-xs text-gray-400">Base64 increases text size compared with the original binary file, so use it mainly for small assets and embedded data.</p></div>:<div className="flex h-48 items-center justify-center text-sm text-gray-400">Your Base64 data will appear here</div>}</Panel>
  </ToolWrap>;
}

export function ImageDimensionsTool() {
  const { img, fileName, file, UploadZone } = useImageFile();
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  let ratio="—"; if(img){const g=gcd(img.naturalWidth,img.naturalHeight);ratio=`${img.naturalWidth/g}:${img.naturalHeight/g}`;}
  return <ToolWrap single><Panel title="Image dimensions checker"><UploadZone/>{img&&<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
    ["Width",`${img.naturalWidth}px`],["Height",`${img.naturalHeight}px`],["Aspect ratio",ratio],["File size",file?`${(file.size/1024).toFixed(1)} KB`:"—"],["File type",file?.type||"—"],["Megapixels",`${((img.naturalWidth*img.naturalHeight)/1e6).toFixed(2)} MP`],["Orientation",img.naturalWidth===img.naturalHeight?"Square":img.naturalWidth>img.naturalHeight?"Landscape":"Portrait"],["Filename",fileName]
  ].map(([k,v])=><div key={k} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800"><p className="text-xs text-gray-400">{k}</p><p className="mt-1 break-all text-sm font-bold text-gray-900 dark:text-white">{v}</p></div>)}</div>}</Panel></ToolWrap>;
}

export function AspectRatioCalculatorTool(){
  const [w,setW]=useState(1920); const [h,setH]=useState(1080); const [newW,setNewW]=useState(1280);
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a; const g=gcd(Math.max(1,w),Math.max(1,h)); const ratio=`${Math.round(w/g)}:${Math.round(h/g)}`; const newH=w>0?Math.round(h*(newW/w)):0;
  const presets=[["16:9",1920,1080],["9:16",1080,1920],["1:1",1080,1080],["4:5",1080,1350],["3:2",1500,1000]] as const;
  return <ToolWrap>
    <Panel title="Find aspect ratio"><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Lbl text="Width"><input className={inputCls} type="number" min="1" value={w} onChange={e=>setW(Math.max(1,+e.target.value))}/></Lbl><Lbl text="Height"><input className={inputCls} type="number" min="1" value={h} onChange={e=>setH(Math.max(1,+e.target.value))}/></Lbl></div><div className="rounded-2xl bg-violet-50 p-5 text-center dark:bg-violet-950/30"><p className="text-xs uppercase tracking-widest text-violet-500">Aspect ratio</p><p className="mt-1 text-3xl font-black text-violet-700 dark:text-violet-300">{ratio}</p></div><div className="flex flex-wrap gap-2">{presets.map(([r,pw,ph])=><button key={r} onClick={()=>{setW(pw);setH(ph)}} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-700">{r}</button>)}</div></div></Panel>
    <Panel title="Calculate matching dimension"><div className="space-y-3"><Lbl text="New width"><input className={inputCls} type="number" min="1" value={newW} onChange={e=>setNewW(Math.max(1,+e.target.value))}/></Lbl><div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-800"><p className="text-xs text-gray-400">At {ratio}</p><p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{newW} × {newH}px</p></div><CopyBtn text={`${newW}x${newH}`} label="Copy dimensions"/></div></Panel>
  </ToolWrap>;
}

export function FaviconGeneratorTool(){
  const {img,UploadZone}=useImageFile(); const [outputs,setOutputs]=useState<{size:number,url:string}[]>([]); const sizes=[16,32,48,180,192,512];
  const generate=()=>{if(!img)return; const next=sizes.map(size=>{const c=document.createElement("canvas");c.width=size;c.height=size;const ctx=c.getContext("2d")!;ctx.clearRect(0,0,size,size);const scale=Math.min(size/img.naturalWidth,size/img.naturalHeight);const w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);return{size,url:c.toDataURL("image/png")}});setOutputs(next)};
  const html=`<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;
  return <ToolWrap><Panel title="Create favicon files"><UploadZone/>{img&&<div className="mt-4 space-y-3"><p className="text-xs text-gray-400">Use a square source image with a simple mark for the best small-size result.</p><button onClick={generate} className={btnCls}><Zap size={14}/> Generate favicon sizes</button></div>}</Panel><Panel title="Downloads">{outputs.length?<div className="space-y-4"><div className="grid grid-cols-3 gap-3">{outputs.map(o=><div key={o.size} className="rounded-xl border border-gray-200 p-3 text-center dark:border-gray-700"><img src={o.url} width={Math.min(o.size,64)} height={Math.min(o.size,64)} alt={`${o.size}px favicon`} className="mx-auto object-contain"/><p className="mt-2 text-xs font-semibold">{o.size}×{o.size}</p><a download={`favicon-${o.size}x${o.size}.png`} href={o.url} className="mt-2 inline-block text-xs font-semibold text-violet-600">Download</a></div>)}</div><pre className="overflow-x-auto rounded-xl bg-gray-900 p-3 text-xs text-green-400">{html}</pre><CopyBtn text={html} label="Copy HTML"/></div>:<div className="flex h-48 items-center justify-center text-sm text-gray-400">Generate favicon sizes from one image</div>}</Panel></ToolWrap>;
}

export function AvifConverterTool(){
  const {img,fileName,UploadZone}=useImageFile(); const [quality,setQuality]=useState(.82); const [output,setOutput]=useState<string|null>(null); const [message,setMessage]=useState("");
  const convert=()=>{if(!img)return;const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d")!.drawImage(img,0,0);c.toBlob(blob=>{if(blob&&blob.type==="image/avif"){setOutput(URL.createObjectURL(blob));setMessage("")}else{setOutput(null);setMessage("This browser cannot encode AVIF. Use the WebP Converter instead, or try a browser with AVIF canvas encoding support.")}},"image/avif",quality)};
  return <ToolWrap><Panel title="Convert to AVIF"><UploadZone/>{img&&<div className="mt-4 space-y-3"><Lbl text={`Quality: ${Math.round(quality*100)}%`}><input type="range" min="0.5" max="1" step="0.05" value={quality} onChange={e=>setQuality(+e.target.value)} className="w-full accent-violet-600"/></Lbl><button onClick={convert} className={btnCls}><Zap size={14}/> Try AVIF conversion</button>{message&&<p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}</div>}</Panel><Panel title="Result">{output?<div className="space-y-3"><img src={output} alt="AVIF preview" className="max-h-64 w-full object-contain"/><DownloadBtn href={output} filename={`${fileName.replace(/\.[^.]+$/,"")}.avif`} label="Download .avif"/></div>:<div className="flex h-48 items-center justify-center text-center text-sm text-gray-400">AVIF encoding depends on browser support; the tool checks before offering a download.</div>}</Panel></ToolWrap>;
}


export function BulkResizeTool(){
  type Item={name:string,url:string;width:number;height:number};
  const [files,setFiles]=useState<File[]>([]); const [width,setWidth]=useState(1200); const [items,setItems]=useState<Item[]>([]); const [busy,setBusy]=useState(false); const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>()=>items.forEach(i=>URL.revokeObjectURL(i.url)),[items]);
  const choose=(e:ChangeEvent<HTMLInputElement>)=>{setFiles(Array.from(e.target.files||[]).filter(f=>f.type.startsWith('image/')).slice(0,25));setItems([])};
  const process=async()=>{if(!files.length)return;setBusy(true);items.forEach(i=>URL.revokeObjectURL(i.url));const out:Item[]=[];for(const f of files){const data=URL.createObjectURL(f);try{const img=new Image();img.src=data;await new Promise<void>((res,rej)=>{img.onload=()=>res();img.onerror=()=>rej(new Error('decode'))});const h=Math.max(1,Math.round(img.naturalHeight*(width/img.naturalWidth)));const c=document.createElement('canvas');c.width=width;c.height=h;c.getContext('2d')!.drawImage(img,0,0,width,h);const blob=await new Promise<Blob|null>(res=>c.toBlob(res,'image/webp',.88));if(blob)out.push({name:f.name.replace(/\.[^.]+$/,'.webp'),url:URL.createObjectURL(blob),width,height:h});}catch{}finally{URL.revokeObjectURL(data)}}setItems(out);setBusy(false)};
  return <ToolWrap single><Panel title="Bulk resize images"><div className="space-y-4"><button onClick={()=>ref.current?.click()} className="w-full rounded-xl border-2 border-dashed border-violet-300 p-7 dark:border-violet-700"><Upload className="mx-auto mb-2 text-violet-500"/><span className="text-sm font-semibold">Choose up to 25 images</span></button><input ref={ref} className="hidden" type="file" accept="image/*" multiple onChange={choose}/>{files.length>0&&<><p className="text-xs text-gray-500">{files.length} image{files.length===1?'':'s'} selected</p><Lbl text="Output width (px)"><input type="number" min="16" max="8000" value={width} onChange={e=>setWidth(Math.max(16,+e.target.value))} className={inputCls}/></Lbl><button onClick={process} disabled={busy} className={btnCls}>{busy?<RefreshCw size={14} className="animate-spin"/>:<Zap size={14}/>} {busy?'Resizing…':'Resize all to WebP'}</button></>}{items.length>0&&<div className="grid gap-2 sm:grid-cols-2">{items.map(i=><div key={i.url} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800"><div className="min-w-0"><p className="truncate text-xs font-semibold">{i.name}</p><p className="text-[11px] text-gray-400">{i.width}×{i.height}</p></div><a href={i.url} download={i.name} className="shrink-0 text-xs font-bold text-violet-600">Download</a></div>)}</div>}</div></Panel></ToolWrap>;
}

export function YouTubeThumbnailDownloaderTool(){
  const [input,setInput]=useState(''); const [videoId,setVideoId]=useState(''); const [err,setErr]=useState('');
  const parse=()=>{const raw=input.trim();let id='';try{const u=new URL(raw.startsWith('http')?raw:`https://${raw}`);if(u.hostname.includes('youtu.be'))id=u.pathname.split('/').filter(Boolean)[0]||'';else if(u.hostname.includes('youtube.com')){id=u.searchParams.get('v')||'';if(!id&&u.pathname.includes('/shorts/'))id=u.pathname.split('/shorts/')[1]?.split('/')[0]||'';if(!id&&u.pathname.includes('/embed/'))id=u.pathname.split('/embed/')[1]?.split('/')[0]||'';}}catch{if(/^[\w-]{11}$/.test(raw))id=raw}if(!/^[\w-]{11}$/.test(id)){setErr('Enter a valid YouTube video URL or 11-character video ID.');setVideoId('');return}setErr('');setVideoId(id)};
  const variants=videoId?[['Max resolution','maxresdefault.jpg'],['HD','hqdefault.jpg'],['Medium','mqdefault.jpg'],['Standard','sddefault.jpg']]:[];
  const download=async(url:string,name:string)=>{try{const r=await fetch(url,{mode:'cors'});if(!r.ok)throw new Error();const b=await r.blob();const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}catch{window.open(url,'_blank','noopener,noreferrer')}};
  return <ToolWrap single><Panel title="YouTube thumbnail downloader"><div className="space-y-4"><div className="flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')parse()}} placeholder="Paste YouTube URL or video ID" className={cn(inputCls,'flex-1')}/><button onClick={parse} className={btnCls}>Get thumbnails</button></div>{err&&<p className="text-sm text-rose-600">{err}</p>}{videoId&&<div className="grid gap-4 sm:grid-cols-2">{variants.map(([label,file])=>{const url=`https://i.ytimg.com/vi/${videoId}/${file}`;return <div key={file} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"><img src={url} alt={`${label} YouTube thumbnail`} className="aspect-video w-full rounded-lg bg-gray-100 object-cover"/><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs font-semibold">{label}</span><button onClick={()=>download(url,`${videoId}-${file}`)} className="text-xs font-bold text-violet-600">Download</button></div></div>})}</div>}<p className="text-xs text-gray-400">Only download thumbnails you have permission to use. Some videos do not provide a max-resolution image.</p></div></Panel></ToolWrap>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL COMPONENT MAP — slug → component
// ─────────────────────────────────────────────────────────────────────────────
export const toolComponents: Record<string, React.ComponentType> = {
  // Calculators
  "youtube-money-calculator":        YouTubeMoneyCalculator,
  "thumbnail-downloader":            YouTubeThumbnailDownloaderTool,
  "tiktok-earnings-calculator":      TikTokEarningsCalculator,
  "instagram-earnings-calculator":   InstagramEarningsCalculator,
  "engagement-calculator":           EngagementRateCalculator,
  // Reference tables
  "logo-size-generator":             LogoSizeGuide,
  "social-media-size-generator":     SocialMediaSizeGuide,
  // SEO form tools
  "keyword-density-checker":         KeywordDensityChecker,
  "robots-generator":                RobotsGenerator,
  "open-graph-generator":            OpenGraphGenerator,
  "sitemap-generator":               SitemapGenerator,
  // Designer tools
  "color-palette-generator":         ColorPaletteGeneratorTool,
  "gradient-generator":              GradientGeneratorTool,
  "font-pair-generator":             FontPairGeneratorTool,
  "qr-code-generator":               QRCodeGeneratorTool,
  // Canvas image tools
  "compress-image":                  CompressImageTool,
  "bulk-resize":                     BulkResizeTool,
  "resize-image":                    ResizeImageTool,
  "crop-image":                      CropImageTool,
  "rotate-image":                    RotateImageTool,
  "convert-png-to-jpg":              () => React.createElement(ImageConverterTool, { targetFormat: "jpeg" }),
  "convert-jpg-to-png":              () => React.createElement(ImageConverterTool, { targetFormat: "png" }),
  "webp-converter":                  () => React.createElement(ImageConverterTool, { targetFormat: "webp" }),
  "webp-to-jpg":                     () => React.createElement(ImageConverterTool, { targetFormat: "jpeg" }),
  "webp-to-png":                     () => React.createElement(ImageConverterTool, { targetFormat: "png" }),
  "png-to-webp":                     () => React.createElement(ImageConverterTool, { targetFormat: "webp" }),
  "jpg-to-webp":                     () => React.createElement(ImageConverterTool, { targetFormat: "webp" }),
  "watermark-tool":                  WatermarkTool,
  "meme-creator":                    MemeCreatorTool,
  "color-picker":                    ColorPickerTool,
  "blur-background":                 ImageFilterTool,
  "image-filters":                   ImageFilterTool,
  "image-upscaler":                  ImageUpscalerTool,
  "image-optimizer":                 CompressImageTool,
  "image-to-base64":                 ImageToBase64Tool,
  "image-dimensions":                ImageDimensionsTool,
  "favicon-generator":               FaviconGeneratorTool,
  "aspect-ratio-calculator":         AspectRatioCalculatorTool,
  // Text analysis tools
  "character-counter":               CharacterCounterTool,
  "word-counter":                    WordCounterTool,
  // Monetization calculators
  "brand-deal-calculator":           BrandDealCalculatorTool,
  // New tools
  "readability-checker":             ReadabilityCheckerTool,
  "gif-to-video":                    GifToVideoTool,
  "gif-converter":                   GifToVideoTool,
};

// ─── READABILITY CHECKER ──────────────────────────────────────────────────────
export function ReadabilityCheckerTool() {
  const [text, setText] = useState("");

  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
  const sentences = text.trim() ? (text.match(/[^.!?]*[.!?]+/g) || [text]).filter(s => s.trim().length > 2) : [];
  const syllableCount = words.reduce((s, w) => s + countSyllables(w), 0);

  const wc = words.length;
  const sc = Math.max(sentences.length, 1);
  const syl = syllableCount || wc;

  const asl = wc / sc;                         // avg sentence length
  const asw = syl / Math.max(wc, 1);           // avg syllables per word
  const fre = Math.round(206.835 - 1.015 * asl - 84.6 * asw); // Flesch Reading Ease
  const fkg = Math.round(0.39 * asl + 11.8 * asw - 15.59);    // Flesch-Kincaid Grade

  const clampedFre = Math.min(100, Math.max(0, fre));

  function freLabel(score: number) {
    if (score >= 90) return { label: "Very Easy", color: "text-emerald-500", grade: "5th grade" };
    if (score >= 80) return { label: "Easy", color: "text-green-500", grade: "6th grade" };
    if (score >= 70) return { label: "Fairly Easy", color: "text-lime-500", grade: "7th grade" };
    if (score >= 60) return { label: "Standard", color: "text-yellow-500", grade: "8–9th grade" };
    if (score >= 50) return { label: "Fairly Difficult", color: "text-orange-500", grade: "10–12th grade" };
    if (score >= 30) return { label: "Difficult", color: "text-red-400", grade: "College" };
    return { label: "Very Confusing", color: "text-red-600", grade: "College graduate" };
  }

  const info = wc > 0 ? freLabel(clampedFre) : null;

  const suggestions: string[] = [];
  if (wc > 0) {
    if (asl > 25) suggestions.push("Your sentences average " + Math.round(asl) + " words — try breaking long sentences into two.");
    if (asw > 2.0) suggestions.push("Many long words detected. Swap jargon for simpler alternatives where possible.");
    if (clampedFre < 60) suggestions.push("Aim for a Flesch score above 60 for general audiences.");
    if (clampedFre >= 60) suggestions.push("Great readability! Content is accessible to most readers.");
    if (sc < 3 && wc > 50) suggestions.push("Add more sentence variety — mix short punchy sentences with longer ones.");
  }

  return (
    <ToolWrap>
      <Panel title="Your Text">
        <textarea
          id="readability-input"
          rows={12}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your blog post, caption, or script here…"
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">{wc} words · {text.length} chars</span>
          {wc > 0 && <CopyBtn text={text} label="Copy text" />}
        </div>
      </Panel>
      <Panel title="Readability Scores">
        {wc === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Paste some text to see your readability score.</p>
        ) : (
          <div className="space-y-4">
            {/* Big score */}
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Flesch Reading Ease</p>
              <p className={`text-5xl font-black ${info?.color}`}>{clampedFre}</p>
              <p className={`text-sm font-bold mt-1 ${info?.color}`}>{info?.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{info?.grade} level</p>
              <div className="mt-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${clampedFre}%`, background: clampedFre >= 60 ? "#22c55e" : clampedFre >= 40 ? "#f59e0b" : "#ef4444" }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Hard</span><span>Easy</span></div>
            </div>
            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Grade Level", val: `${Math.max(1, fkg)}` },
                { label: "Avg Sentence", val: `${Math.round(asl)} words` },
                { label: "Avg Word", val: `${asw.toFixed(1)} syllables` },
                { label: "Sentences", val: sc },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{val}</p>
                </div>
              ))}
            </div>
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3 space-y-1">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-2">💡 Suggestions</p>
                {suggestions.map((s, i) => (
                  <p key={i} className="text-xs text-violet-800 dark:text-violet-200">• {s}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>
    </ToolWrap>
  );
}

// ─── GIF TO VIDEO / WEBM GUIDE TOOL ──────────────────────────────────────────
export function GifToVideoTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(5);
  const [converting, setConverting] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
  }, [previewUrl, outputUrl]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "image/gif" && !f.name.toLowerCase().endsWith(".gif")) {
      setErr("Please choose a GIF file."); return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setFile(f); setOutputUrl(null); setErr("");
    setPreviewUrl(URL.createObjectURL(f));
  };

  const convert = async () => {
    const img = imgRef.current;
    if (!file || !img || !img.naturalWidth) return;
    const preferred = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mime = preferred.find(m => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
    if (!mime) { setErr("This browser cannot encode WebM with MediaRecorder. Try current Chrome, Edge, or Firefox, or use the ffmpeg commands below."); return; }
    setErr(""); setConverting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas is unavailable.");
      const stream = canvas.captureStream(30);
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>((resolve,reject)=>{recorder.onstop=()=>resolve();recorder.onerror=()=>reject(new Error("WebM recording failed."));});
      recorder.start(250);
      const started = performance.now();
      await new Promise<void>(resolve => {
        const draw = (now:number) => {
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          if (now-started >= duration*1000) { recorder.stop(); resolve(); return; }
          requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
      });
      await stopped;
      stream.getTracks().forEach(t=>t.stop());
      const blob = new Blob(chunks,{type:"video/webm"});
      if (!blob.size) throw new Error("No video data was produced.");
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
    } catch (e:unknown) { setErr(e instanceof Error?e.message:"Conversion failed."); }
    finally { setConverting(false); }
  };

  const embed = `<video autoplay loop muted playsinline>\n  <source src="animation.webm" type="video/webm">\n  <img src="animation.gif" alt="Animation">\n</video>`;
  const ffmpeg = `ffmpeg -i input.gif -c:v libvpx-vp9 -pix_fmt yuva420p output.webm\nffmpeg -i input.gif -movflags faststart -pix_fmt yuv420p output.mp4`;

  return <ToolWrap single><div className="space-y-5">
    <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white"><h3 className="text-lg font-bold">GIF → WebM Converter</h3><p className="mt-1 text-sm text-violet-100">Turn an animated GIF into a looping WebM video directly in supported browsers. WebM is often much smaller than GIF for full-color animation.</p></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Upload GIF"><button onClick={()=>fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-violet-300 p-6 dark:border-violet-700">{previewUrl?<img ref={imgRef} src={previewUrl} alt="Animated GIF preview" className="mx-auto max-h-56 rounded-lg object-contain"/>:<><ImageIcon className="mx-auto mb-2 text-violet-500"/><span className="text-sm font-semibold">Choose GIF</span></>}</button><input ref={fileRef} type="file" accept="image/gif,.gif" onChange={onFile} className="hidden"/>{file&&<div className="mt-4 space-y-3"><p className="text-xs text-gray-500">{file.name} · {(file.size/1024).toFixed(1)} KB</p><Lbl text={`Capture duration: ${duration} seconds`}><input type="range" min="1" max="15" value={duration} onChange={e=>setDuration(+e.target.value)} className="w-full accent-violet-600"/></Lbl><button onClick={convert} disabled={converting} className={btnCls}>{converting?<RefreshCw size={14} className="animate-spin"/>:<Zap size={14}/>} {converting?"Converting…":"Convert to WebM"}</button>{err&&<p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{err}</p>}</div>}</Panel>
      <Panel title="WebM result">{outputUrl?<div className="space-y-3"><video src={outputUrl} controls autoPlay loop muted playsInline className="max-h-64 w-full rounded-xl bg-black"/><DownloadBtn href={outputUrl} filename={`${file?.name.replace(/\.gif$/i,"")||"animation"}.webm`} label="Download WebM"/><p className="text-xs text-gray-400">The converter records the animated GIF for the selected duration. Choose a duration that captures the loop you need.</p></div>:<div className="flex h-48 items-center justify-center text-center text-sm text-gray-400">Your converted WebM will appear here</div>}</Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-2"><Panel title="HTML embed code"><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-900 p-3 text-xs text-green-400">{embed}</pre><div className="mt-2"><CopyBtn text={embed} label="Copy HTML"/></div></Panel><Panel title="Need MP4 or exact timing?"><p className="mb-2 text-xs text-gray-500">For frame-perfect conversion or MP4 output, use free ffmpeg:</p><pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-gray-900 p-3 text-xs text-green-400">{ffmpeg}</pre><div className="mt-2"><CopyBtn text={ffmpeg} label="Copy ffmpeg commands"/></div></Panel></div>
  </div></ToolWrap>;
}


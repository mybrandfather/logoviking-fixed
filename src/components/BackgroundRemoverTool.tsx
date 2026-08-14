import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Download,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";

type Stage = "idle" | "loading-model" | "processing" | "done" | "error";

// Lazy loader — fetches the library + ~30MB model from CDN at runtime only
// when the user actually clicks "Remove background". This keeps it out of
// the main bundle entirely (the package is too large to inline).
type RemoveBackgroundFn = (
  source: File | Blob | string,
  options?: {
    model?: "isnet" | "isnet_fp16" | "isnet_quint8";
    output?: { format?: "image/png" | "image/jpeg" | "image/webp"; quality?: number };
    progress?: (key: string, current: number, total: number) => void;
  }
) => Promise<Blob>;

declare global {
  interface Window {
    __lvBgRemoval?: { removeBackground: RemoveBackgroundFn };
  }
}

const CDN_URL = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm";

async function loadRemover(): Promise<RemoveBackgroundFn> {
  if (typeof window !== "undefined" && window.__lvBgRemoval) {
    return window.__lvBgRemoval.removeBackground;
  }
  // Dynamic import from CDN at runtime — keeps the library out of our bundle.
  // We construct the URL in a variable so Vite/TS don't try to resolve it at build time.
  const url = CDN_URL;
  const mod = (await import(/* @vite-ignore */ url)) as { removeBackground: RemoveBackgroundFn };
  if (typeof window !== "undefined") window.__lvBgRemoval = mod;
  return mod.removeBackground;
}

const SAMPLE_BG_COLORS = [
  { id: "transparent", label: "Transparent", value: "transparent", swatch: "linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%,#ddd),linear-gradient(45deg,#ddd 25%,#fff 25%,#fff 75%,#ddd 75%,#ddd)" },
  { id: "white", label: "White", value: "#ffffff", swatch: "#ffffff" },
  { id: "black", label: "Black", value: "#0f172a", swatch: "#0f172a" },
  { id: "violet", label: "Violet", value: "#7C3AED", swatch: "#7C3AED" },
  { id: "rose", label: "Rose", value: "#E11D48", swatch: "#E11D48" },
  { id: "emerald", label: "Emerald", value: "#10B981", swatch: "#10B981" },
  { id: "cyan", label: "Cyan", value: "#06B6D4", swatch: "#06B6D4" },
  { id: "studio", label: "Studio", value: "linear-gradient(135deg,#f5f3ff,#ede9fe)", swatch: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
];

function fileToObjectUrl(file: File) {
  return URL.createObjectURL(file);
}

async function applyBackground(transparentPng: Blob, bg: string): Promise<Blob> {
  if (bg === "transparent") return transparentPng;
  const url = URL.createObjectURL(transparentPng);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load processed image"));
    i.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  if (bg.startsWith("linear-gradient")) {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    // Parse simple two-stop gradient
    const colors = bg.match(/#[0-9a-fA-F]{3,8}/g) ?? ["#f5f3ff", "#ede9fe"];
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[colors.length - 1]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = bg;
  }
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png",
      0.95
    );
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function BackgroundRemoverTool() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [transparentBlob, setTransparentBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bg, setBg] = useState("transparent");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Re-apply background when bg color changes
  useEffect(() => {
    if (!transparentBlob) return;
    let cancelled = false;
    applyBackground(transparentBlob, bg).then((blob) => {
      if (cancelled) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg, transparentBlob]);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (f: File | null) => {
    setErr("");
    setTransparentBlob(null);
    setPreviewUrl(null);
    setStage("idle");
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setErr("File too large. Maximum 25 MB.");
      return;
    }
    setFile(f);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalUrl(fileToObjectUrl(f));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const reset = () => {
    setFile(null);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setOriginalUrl(null);
    setPreviewUrl(null);
    setTransparentBlob(null);
    setStage("idle");
    setProgress(0);
    setErr("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const run = async () => {
    if (!file) {
      setErr("Upload an image first.");
      return;
    }
    setErr("");
    setStage("loading-model");
    setProgress(0);
    const start = performance.now();

    try {
      const removeBackground = await loadRemover();
      setStage("processing");

      const blob = await removeBackground(file, {
        // Smaller, faster model — accurate enough for most use cases
        model: "isnet_fp16",
        output: { format: "image/png", quality: 0.95 },
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) {
            setProgress(Math.min(100, Math.round((current / total) * 100)));
          }
        },
      });

      setTransparentBlob(blob);
      setStage("done");
      setElapsedMs(Math.round(performance.now() - start));
    } catch (e) {
      console.error(e);
      setErr(
        "Background removal failed. This may be due to limited browser support (use Chrome, Edge, or Safari 17+) or the image being too large. Please try a different image."
      );
      setStage("error");
    }
  };

  const onDownload = async () => {
    if (!transparentBlob) return;
    const finalBlob = await applyBackground(transparentBlob, bg);
    const base = file?.name?.replace(/\.[^.]+$/, "") ?? "image";
    downloadBlob(finalBlob, `${base}-no-bg.png`);
  };

  const onDownloadTransparent = () => {
    if (!transparentBlob || !file) return;
    const base = file.name.replace(/\.[^.]+$/, "");
    downloadBlob(transparentBlob, `${base}-transparent.png`);
  };

  const isBusy = stage === "loading-model" || stage === "processing";

  return (
    <div className="space-y-5">
      {/* Hero info card */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-5 dark:border-violet-800 dark:from-violet-950/30 dark:to-pink-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 text-white">
            <Wand2 size={18} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">AI Background Remover</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Runs entirely in your browser using AI. <strong>Your image never leaves your device</strong> — no uploads, no servers, 100% private. First use loads the AI model (~30MB, cached after).
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Upload + controls */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Input
          </p>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-6 text-center transition-colors hover:border-violet-300 dark:border-gray-700 dark:hover:border-violet-600"
          >
            <Upload size={28} className="mx-auto text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              Drop image or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">PNG, JPG, WebP up to 25 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {file && (
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <strong className="text-gray-900 dark:text-white">{file.name}</strong>{" "}
              · {Math.round(file.size / 1024)} KB
            </div>
          )}

          {originalUrl && (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Original
              </p>
              <img
                src={originalUrl}
                alt="Original"
                className="max-h-48 w-full rounded-xl object-contain bg-gray-50 dark:bg-gray-800"
              />
            </div>
          )}

          {err && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {err}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={run}
              disabled={!file || isBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-violet-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Wand2 size={14} />
              )}
              {stage === "loading-model"
                ? "Loading AI model…"
                : stage === "processing"
                  ? "Removing background…"
                  : stage === "done"
                    ? "Run again"
                    : "Remove background"}
            </button>
            <button
              onClick={reset}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Trash2 size={13} /> Reset
            </button>
          </div>

          {/* Progress bar */}
          {isBusy && (
            <div className="space-y-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress || (stage === "loading-model" ? 8 : 50)}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center">
                {stage === "loading-model"
                  ? "Downloading AI model (~30MB) — only on first use, then cached"
                  : `Processing… ${progress}%`}
              </p>
            </div>
          )}

          {/* Background picker */}
          {transparentBlob && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                Background
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SAMPLE_BG_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBg(c.value)}
                    className={`relative h-12 rounded-xl border-2 transition-all ${
                      bg === c.value
                        ? "border-violet-500 ring-2 ring-violet-200 dark:ring-violet-900"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                    style={{
                      background:
                        c.id === "transparent"
                          ? "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50%/12px 12px"
                          : c.swatch,
                    }}
                    title={c.label}
                  >
                    {bg === c.value && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
                          <Check size={12} className="text-violet-600" />
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <label className="mt-3 block text-xs font-medium text-gray-700 dark:text-gray-200">
                Custom color
                <input
                  type="color"
                  onChange={(e) => setBg(e.target.value)}
                  className="mt-1 h-9 w-full cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700"
                />
              </label>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Result
          </p>

          {!transparentBlob && !isBusy && (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-gray-50 text-center dark:bg-gray-800">
              <ImageIcon size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Upload an image and click <strong>Remove background</strong>
              </p>
            </div>
          )}

          {isBusy && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/20">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    className="h-2.5 w-2.5 rounded-full bg-violet-500"
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {stage === "loading-model" ? "Loading AI model…" : "Removing background…"}
              </p>
              <p className="text-xs text-gray-400">100% in your browser — no data leaves your device</p>
            </div>
          )}

          {transparentBlob && previewUrl && (
            <>
              <div
                className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
                style={{
                  background:
                    bg === "transparent"
                      ? "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50%/16px 16px"
                      : "transparent",
                }}
              >
                <img
                  src={previewUrl}
                  alt="Background removed"
                  className="block w-full max-h-80 object-contain"
                />
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
                <Check size={13} /> Done in {(elapsedMs / 1000).toFixed(1)}s · Ready to download
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
                >
                  <Download size={14} /> Download
                </button>
                {bg !== "transparent" && (
                  <button
                    onClick={onDownloadTransparent}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Download size={13} /> Transparent PNG
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-white">🔒 100% Private</p>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Your image is processed in your browser. Nothing uploaded.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-white">⚡ Fast after first use</p>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Model is cached after the first download — instant on every reuse.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-900 dark:text-white">🎨 Add any background</p>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Replace the transparent background with any color or gradient before downloading.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-sm dark:border-violet-800 dark:bg-violet-950/20">
        <div className="flex items-start gap-3">
          <Zap size={16} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div>
            <p className="font-semibold text-violet-900 dark:text-violet-200">Tip for best results</p>
            <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
              Works best with clear subject-vs-background contrast. Portraits, products, and objects on clean backgrounds give the cleanest cuts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
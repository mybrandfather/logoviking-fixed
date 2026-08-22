import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  Suspense,
  lazy,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

// Lazy-loaded heavy tools (only fetched when the user opens them)
const BackgroundRemoverTool = lazy(() => import("./components/BackgroundRemoverTool"));
import { toolComponents } from "./components/BuiltInTools";

import { runAITool, getActiveProvider, type AIProvider, type AIToolResult } from "./ai";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  Copy,
  Globe,
  Grid3X3,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  Mail,
  Camera,
  MapPin,
  Menu,
  Moon,
  Palette,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Target,
  Trash2,
  UserPlus,
  Video,
  WandSparkles,
  Wand2,
  X,
  Zap,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { cn } from "./utils/cn";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tier = "guest" | "free" | "premium";
type Theme = "light" | "dark";
type ColorTheme = "violet" | "rose" | "emerald" | "amber" | "cyan";
type LangCode = "en" | "es" | "pt" | "ar" | "ru" | "fr" | "de" | "zh" | "hi" | "ja" | "it" | "ko" | "tr" | "nl" | "id";
type ToolGroup =
  | "image"
  | "designer"
  | "youtube"
  | "tiktok"
  | "instagram"
  | "pinterest"
  | "seo"
  | "ai";

type Tool = {
  slug: string;
  name: string;
  category: ToolGroup;
  description: string;
  featured?: boolean;
  isNew?: boolean;
  isPremium?: boolean;
};



type HistoryEntry = { id: string; slug: string; query: string; createdAt: string };
type Project = { id: string; slug: string; title: string; summary: string; createdAt: string };
type Account = {
  name: string;
  email: string;
  tier: Tier;
  provider: "email" | "google" | "guest";
  authenticated: boolean;
};
// ─── Credit packs (one-time purchase) ────────────────────────────────────────
const CREDIT_PACKS = [
  { id:"starter",  name:"Starter",  credits:50,    price:4.99,  priceId:"price_starter",  color:"from-emerald-400 to-teal-400",  badge:"",             popular:false, perUse:0.10, desc:"Great for occasional use" },
  { id:"creator",  name:"Creator",  credits:250,   price:14.99, priceId:"price_creator",  color:"from-violet-500 to-fuchsia-500",badge:"Most popular",  popular:true,  perUse:0.06, desc:"Best for regular creators" },
  { id:"power",    name:"Power",    credits:1000,  price:39.99, priceId:"price_power",    color:"from-orange-400 to-rose-400",   badge:"Best value",   popular:false, perUse:0.04, desc:"For high-volume publishing" },
];
type BlogSection = { id: string; title: string; paragraphs: string[] };
type BlogFaq = { question: string; answer: string };
type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: string;
  updatedAt: string;
  sections: BlogSection[];
  faqs: BlogFaq[];
  related: string[];
};
type SiteContextValue = {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  colorTheme: ColorTheme;
  setColorTheme: Dispatch<SetStateAction<ColorTheme>>;
  lang: LangCode;
  setLang: Dispatch<SetStateAction<LangCode>>;
  t: (key: string) => string;
  isRTL: boolean;
  account: Account;
  setAccount: Dispatch<SetStateAction<Account>>;
  credits: number;
  addCredits: (n: number) => void;
  favorites: string[];
  toggleFavorite: (slug: string) => void;
  history: HistoryEntry[];
  recordToolUse: (slug: string, query: string) => { allowed: boolean; remaining: number; limit: number; usedCredit: boolean };
  clearHistory: () => void;
  projects: Project[];
  saveProject: (p: Project) => void;
  deleteProject: (id: string) => void;
  aiProvider: AIProvider;
  setAiProvider: Dispatch<SetStateAction<AIProvider>>;
};

// ─── Constants ───────────────────────────────────────────────────────────────
const TOOL_LIMITS: Record<Tier, number> = { guest: 25, free: 25, premium: 25 };
const siteName = "LogoViking";
const siteDomain = "https://www.logoviking.com";

// ─── Color themes ─────────────────────────────────────────────────────────────
// `accent` is the complementary color used for the second word of the "LogoViking" wordmark
const colorThemes: { id: ColorTheme; label: string; color: string; accent: string; textClass: string; bgClass: string; borderClass: string }[] = [
  { id: "violet",  label: "Violet",  color: "#7C3AED", accent: "#0EA5E9", textClass: "text-violet-600 dark:text-violet-400",  bgClass: "bg-violet-600 hover:bg-violet-700",  borderClass: "border-violet-400" },
  { id: "rose",    label: "Rose",    color: "#E11D48", accent: "#1E293B", textClass: "text-rose-600 dark:text-rose-400",      bgClass: "bg-rose-600 hover:bg-rose-700",      borderClass: "border-rose-400"   },
  { id: "emerald", label: "Emerald", color: "#059669", accent: "#0F172A", textClass: "text-emerald-600 dark:text-emerald-400",bgClass: "bg-emerald-600 hover:bg-emerald-700",borderClass: "border-emerald-400"},
  { id: "amber",   label: "Gold Viking", color: "#B8860B", accent: "#C0A060", textClass: "text-amber-700 dark:text-amber-400", bgClass: "bg-amber-700 hover:bg-amber-800",   borderClass: "border-amber-500"  },
  { id: "cyan",    label: "Cyan",    color: "#0891B2", accent: "#1E293B", textClass: "text-cyan-600 dark:text-cyan-400",      bgClass: "bg-cyan-600 hover:bg-cyan-700",      borderClass: "border-cyan-400"   },
];

// ─── Languages ───────────────────────────────────────────────────────────────
const languages: { code: LangCode; label: string; native: string; flag: string; rtl?: boolean }[] = [
  { code: "en", label: "English",    native: "English",    flag: "🇺🇸" },
  { code: "es", label: "Spanish",    native: "Español",    flag: "🇪🇸" },
  { code: "pt", label: "Portuguese", native: "Português",  flag: "🇧🇷" },
  { code: "fr", label: "French",     native: "Français",   flag: "🇫🇷" },
  { code: "de", label: "German",     native: "Deutsch",    flag: "🇩🇪" },
  { code: "it", label: "Italian",    native: "Italiano",   flag: "🇮🇹" },
  { code: "nl", label: "Dutch",      native: "Nederlands", flag: "🇳🇱" },
  { code: "ru", label: "Russian",    native: "Русский",    flag: "🇷🇺" },
  { code: "tr", label: "Turkish",    native: "Türkçe",     flag: "🇹🇷" },
  { code: "ar", label: "Arabic",     native: "العربية",    flag: "🇸🇦", rtl: true },
  { code: "hi", label: "Hindi",      native: "हिन्दी",      flag: "🇮🇳" },
  { code: "zh", label: "Chinese",    native: "中文",       flag: "🇨🇳" },
  { code: "ja", label: "Japanese",   native: "日本語",     flag: "🇯🇵" },
  { code: "ko", label: "Korean",     native: "한국어",     flag: "🇰🇷" },
  { code: "id", label: "Indonesian", native: "Indonesia",  flag: "🇮🇩" },
];

type Translations = Record<string, string>;

const translations: Partial<Record<LangCode, Translations>> = {
  en: {
    // Nav
    "nav.home": "Home", "nav.tools": "Tools", "nav.categories": "Categories",
    "nav.blog": "Blog", "nav.pricing": "Pricing", "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard", "nav.login": "Login", "nav.signup": "Sign up",
    "nav.account": "Account", "nav.logout": "Logout",
    "nav.all": "All",
    // Hero
    "hero.badge": "80+ free creator tools, no signup needed",
    "hero.title1": "One platform.", "hero.title2": "Every creator tool.",
    "hero.subtitle": "Compress, resize and convert images, build creator assets, check SEO, generate metadata, and use 80+ practical tools — free to try, no account required.",
    "hero.cta1": "Try the Creator Kit", "hero.cta2": "Logo Generator", "hero.cta3": "AI Image Gen",
    "hero.check1": "No signup to use tools", "hero.check2": "Free plan available", "hero.check3": "Useful tools, no signup needed",
    // Sections
    "section.newTools": "Just added", "section.categories": "Browse by workflow",
    "section.featured": "All-in-One Creator Kit", "section.featuredSub": "One topic → titles, hashtags, thumbnails, captions, and keywords.",
    "section.popularTools": "Popular tools", "section.allTools": "All Tools",
    "section.blog": "Guides and tutorials", "section.pricing": "Simple pricing",
    "section.pricingSub": "Core tools are free. Paid plans are not live yet.",
    // Buttons
    "btn.viewAll": "View all", "btn.allTools": "All tools", "btn.openTool": "Open",
    "btn.generate": "Generate", "btn.generating": "Generating…",
    "btn.generateLogo": "Generate Logo Concepts", "btn.generatingLogo": "Generating 2 concepts…",
    "btn.generateImage": "Generate Image",
    "btn.download": "Download", "btn.copy": "Copy", "btn.export": "Export",
    "btn.save": "Save", "btn.upgrade": "Upgrade", "btn.back": "Back",
    "btn.readMore": "Read", "btn.explore": "Explore",
    "btn.createAccount": "Create free account", "btn.openDashboard": "Open dashboard",
    "btn.getStarted": "Get started", "btn.startFree": "Start free",
    "btn.upgradePro": "Upgrade to Pro", "btn.chooseBusiness": "Choose Business",
    "btn.saveChanges": "Save changes", "btn.sendMessage": "Send message",
    "btn.sendReset": "Send reset link", "btn.googleLogin": "Continue with Google",
    "btn.clearHistory": "Clear", "btn.deletePlan": "Delete",
    "btn.manageplan": "Manage plan", "btn.viewFullComparison": "View full comparison",
    // Labels
    "label.account": "Account", "label.guest": "Guest visitor",
    "label.recentlyUsed": "Recently used", "label.recommended": "Recommended",
    "label.noRecent": "No tools used yet.", "label.noFavorites": "No favorites yet.",
    "label.noProjects": "Premium saves appear here.",
    "label.noHistory": "No history yet. Try a tool to get started.",
    "label.topTools": "Top tools used", "label.noData": "No data yet.",
    "label.relatedTools": "Related tools", "label.readNext": "Read next",
    "label.popularTools": "Popular tools", "label.faqs": "FAQs",
    "label.tableOfContents": "Table of Contents", "label.relatedPosts": "Related posts",
    "label.subscription": "Subscription", "label.currentPlan": "Current plan",
    "label.status": "Status", "label.savedProjects": "Saved projects",
    "label.favorites": "Favorites", "label.recentHistory": "Recent history",
    "label.totalUses": "Total uses", "label.dailyLimit": "Daily limit",
    "label.plan": "Plan", "label.unlimited": "Unlimited",
    "label.tools": "tools", "label.new": "New", "label.pro": "Pro", "label.featured": "Featured",
    "label.input": "Input", "label.output": "Output",
    "label.topic": "Topic or query", "label.uploadImage": "Upload image",
    "label.optional": "(optional)",
    "label.themeColor": "Theme color", "label.mode": "Mode",
    "label.light": "Light", "label.dark": "Dark",
    "label.language": "Language",
    "label.advertisement": "Advertisement",
    "label.blogCategory": "Blog", "label.readingTime": "read",
    "label.updated": "Updated",
    "label.upgradeNote": "Guest/Free: Watermark and limits apply.",
    "label.upgradeLink": "Upgrade to remove ads and unlock unlimited usage.",
    "label.tagline": "Creator Toolkit",
    "label.footerDesc": "All-in-one creator, designer, and SEO toolkit for high-traffic publishing and passive income.",
    "label.footerProduct": "Product", "label.footerCategories": "Categories", "label.footerLegal": "Legal",
    "label.footerCopy": "Built for creators, SEO, and passive income.",
    "label.menu": "Menu",
    "label.name": "Name", "label.email": "Email", "label.password": "Password", "label.message": "Message",
    "label.industry": "Industry", "label.stylePreference": "Style preference", "label.primaryPlatform": "Primary platform",
    "label.brandPrompt": "Brand / Channel prompt",
    "label.brandPromptHint": "(be specific)",
    "label.promptCounter": "/400 — include brand name, colors, style, and vibe for best results",
    "label.aiLogoTitle": "Branding Ideas",
    "label.aiLogoSub": "Describe your brand → get 2 logo concepts",
    "label.your2Concepts": "Your 2 Logo Concepts",
    "label.chooseConcept": "Choose the one that fits your brand best",
    "label.conceptSelected": "selected ✓",
    "label.downloadExport": "Download & Export",
    "label.downloadPng": "Download PNG", "label.downloadSvg": "Download SVG",
    "label.copyCss": "Copy CSS colors", "label.saveProject": "Save to projects",
    "label.upgradeHd": "Upgrade for HD export",
    "label.upgradeForFull": "Upgrade to Creator Pro",
    "label.upgradeForFullSub": "for HD PNG, vector SVG, all platform sizes, and saved projects.",
    "label.generatingLogo": "AI is generating your 2 logo concepts…",
    "label.analyzingPrompt": "Analyzing your brand prompt, industry, style, and platform",
    "label.describeImage": "Describe your image",
    "label.style": "Style", "label.aspectRatio": "Aspect Ratio",
    "label.generatedImage": "Generated Image",
    "label.imagePromptHint": "Describe your image above and click Generate",
    "label.upgradeResolution": "Upgrade for full resolution",
    "label.removeWatermark": "Remove watermark",
    "label.regenerate": "Regenerate",
    "label.settings": "Settings and preferences",
    "label.settingsSub": "Manage your profile and preferences.",
    "label.toggleTheme": "Toggle theme",
    "label.logout": "Logout",
    "label.savedSuccessfully": "Saved successfully.",
    "label.invalidForm": "Enter a valid name and email.",
    "label.contactSent": "Your email app should open with the message ready to send.",
    "label.invalidContact": "Enter a valid message without spam patterns.",
    "label.sendUs": "Send us a message",
    "label.resetSent": "Accounts are not currently enabled.",
    "label.invalidAuth": "Use a valid email and a password with at least 8 characters.",
    "label.dailyLimitReached": "Daily limit reached. Try again after the free limit resets.",
    "label.addTopic": "Add a topic or upload an image.",
    "label.keepConcise": "Keep input concise and spam-free.",
    "label.upgradeNow": "Upgrade now",
    "label.search": "Search tools…",
    "label.notFound": "Page not found",
    "label.notFoundSub": "Try browsing tools, categories, or blog posts instead.",
    "label.browseTools": "Browse tools",
    "label.welcomeBack": "Welcome back", "label.createFreeAccount": "Create free account",
    "label.resetPassword": "Reset your password",
    "label.minPassword": "Min. 8 characters",
    "label.forgotPassword": "Forgot password",
    "label.authTagline": "Logoviking — Creator Toolkit",
    "label.tier": "plan",
    "label.concept": "Concept",
    "label.upgradeCreatorPro": "Upgrade to Creator Pro",
    "label.upgradeCreatorProSub": "Unlimited usage, no ads, batch processing, and saved projects.",
  },
  es: {
    "nav.home": "Inicio", "nav.tools": "Herramientas", "nav.categories": "Categorías",
    "nav.blog": "Blog", "nav.pricing": "Precios", "nav.faq": "Preguntas",
    "nav.dashboard": "Panel", "nav.login": "Iniciar sesión", "nav.signup": "Registrarse",
    "nav.account": "Cuenta", "nav.logout": "Cerrar sesión", "nav.all": "Todo",
    "hero.badge": "Más de 60 herramientas gratuitas, sin registro",
    "hero.title1": "Una plataforma.", "hero.title2": "Todas las herramientas.",
    "hero.subtitle": "Genera logos, imágenes con IA, títulos de YouTube, metadatos SEO, hashtags, descripciones y más de 60 herramientas — todas gratuitas.",
    "hero.cta1": "Probar el Kit Creador", "hero.cta2": "Generador de Logos", "hero.cta3": "IA de Imágenes",
    "hero.check1": "Sin registro para usar herramientas", "hero.check2": "Plan gratuito disponible", "hero.check3": "Premium desde $19/mes",
    "section.newTools": "Recién agregado", "section.categories": "Explorar por flujo de trabajo",
    "section.featured": "Kit Todo en Uno para Creadores", "section.featuredSub": "Un tema → títulos, hashtags, miniaturas, descripciones y palabras clave.",
    "section.popularTools": "Herramientas populares", "section.allTools": "Todas las herramientas",
    "section.blog": "Guías y tutoriales", "section.pricing": "Precios simples",
    "section.pricingSub": "Empieza gratis. Mejora cuando necesites más.",
    "btn.viewAll": "Ver todo", "btn.allTools": "Todas las herramientas", "btn.openTool": "Abrir",
    "btn.generate": "Generar", "btn.generating": "Generando…",
    "btn.generateLogo": "Generar Conceptos de Logo", "btn.generatingLogo": "Generando 2 conceptos…",
    "btn.generateImage": "Generar Imagen",
    "btn.download": "Descargar", "btn.copy": "Copiar", "btn.export": "Exportar",
    "btn.save": "Guardar", "btn.upgrade": "Mejorar", "btn.back": "Volver",
    "btn.readMore": "Leer", "btn.explore": "Explorar",
    "btn.createAccount": "Crear cuenta gratuita", "btn.openDashboard": "Abrir panel",
    "btn.getStarted": "Comenzar", "btn.startFree": "Empezar gratis",
    "btn.upgradePro": "Mejorar a Pro", "btn.chooseBusiness": "Elegir Business",
    "btn.saveChanges": "Guardar cambios", "btn.sendMessage": "Enviar mensaje",
    "btn.sendReset": "Enviar enlace", "btn.googleLogin": "Continuar con Google",
    "btn.clearHistory": "Limpiar", "btn.deletePlan": "Eliminar",
    "btn.manageplan": "Gestionar plan", "btn.viewFullComparison": "Ver comparación",
    "label.account": "Cuenta", "label.guest": "Visitante invitado",
    "label.recentlyUsed": "Usadas recientemente", "label.recommended": "Recomendadas",
    "label.noRecent": "Aún no has usado herramientas.", "label.noFavorites": "Sin favoritos aún.",
    "label.noProjects": "Los guardados premium aparecen aquí.",
    "label.noHistory": "Sin historial. Prueba una herramienta.",
    "label.topTools": "Herramientas más usadas", "label.noData": "Sin datos aún.",
    "label.relatedTools": "Herramientas relacionadas", "label.readNext": "Leer después",
    "label.popularTools": "Herramientas populares", "label.faqs": "Preguntas frecuentes",
    "label.tableOfContents": "Tabla de contenidos", "label.relatedPosts": "Artículos relacionados",
    "label.subscription": "Suscripción", "label.currentPlan": "Plan actual",
    "label.status": "Estado", "label.savedProjects": "Proyectos guardados",
    "label.favorites": "Favoritos", "label.recentHistory": "Historial reciente",
    "label.totalUses": "Total de usos", "label.dailyLimit": "Límite diario",
    "label.plan": "Plan", "label.unlimited": "Ilimitado",
    "label.tools": "herramientas", "label.new": "Nuevo", "label.pro": "Pro", "label.featured": "Destacado",
    "label.input": "Entrada", "label.output": "Salida",
    "label.topic": "Tema o consulta", "label.uploadImage": "Subir imagen", "label.optional": "(opcional)",
    "label.themeColor": "Color del tema", "label.mode": "Modo",
    "label.light": "Claro", "label.dark": "Oscuro", "label.language": "Idioma",
    "label.advertisement": "Publicidad",
    "label.blogCategory": "Blog", "label.readingTime": "lectura", "label.updated": "Actualizado",
    "label.upgradeNote": "Invitado/Gratis: Se aplican límites y marcas de agua.",
    "label.upgradeLink": "Mejora para quitar anuncios y desbloquear uso ilimitado.",
    "label.tagline": "Kit para Creadores",
    "label.footerDesc": "Kit todo en uno para creadores, diseñadores y SEO.",
    "label.footerProduct": "Producto", "label.footerCategories": "Categorías", "label.footerLegal": "Legal",
    "label.footerCopy": "Creado para creadores, SEO e ingresos pasivos.",
    "label.menu": "Menú",
    "label.name": "Nombre", "label.email": "Correo", "label.password": "Contraseña", "label.message": "Mensaje",
    "label.industry": "Industria", "label.stylePreference": "Estilo preferido", "label.primaryPlatform": "Plataforma principal",
    "label.brandPrompt": "Descripción de marca / canal", "label.brandPromptHint": "(sé específico)",
    "label.promptCounter": "/400 — incluye nombre, colores, estilo y ambiente",
    "label.aiLogoTitle": "Generador de Logos con IA", "label.aiLogoSub": "Describe tu marca → obtén 2 conceptos de logo",
    "label.your2Concepts": "Tus 2 Conceptos de Logo", "label.chooseConcept": "Elige el que mejor se adapte",
    "label.conceptSelected": "seleccionado ✓", "label.downloadExport": "Descargar y Exportar",
    "label.downloadPng": "Descargar PNG", "label.downloadSvg": "Descargar SVG",
    "label.copyCss": "Copiar colores CSS", "label.saveProject": "Guardar en proyectos",
    "label.upgradeHd": "Mejorar para exportar en HD",
    "label.upgradeForFull": "Mejorar a Creator Pro",
    "label.upgradeForFullSub": "para PNG HD, SVG vectorial y todos los tamaños de plataforma.",
    "label.generatingLogo": "La IA está generando tus 2 conceptos…",
    "label.analyzingPrompt": "Analizando tu descripción, industria, estilo y plataforma",
    "label.describeImage": "Describe tu imagen", "label.style": "Estilo", "label.aspectRatio": "Relación de aspecto",
    "label.generatedImage": "Imagen Generada", "label.imagePromptHint": "Describe tu imagen arriba y haz clic en Generar",
    "label.upgradeResolution": "Mejorar para resolución completa", "label.removeWatermark": "Quitar marca de agua",
    "label.regenerate": "Regenerar", "label.settings": "Configuración y preferencias",
    "label.settingsSub": "Gestiona tu perfil y preferencias.",
    "label.toggleTheme": "Cambiar tema", "label.logout": "Cerrar sesión",
    "label.savedSuccessfully": "Guardado correctamente.", "label.invalidForm": "Ingresa un nombre y correo válidos.",
    "label.contactSent": "¡Gracias! Tu mensaje está en camino (modo demo).",
    "label.invalidContact": "Ingresa un mensaje válido sin patrones de spam.",
    "label.sendUs": "Envíanos un mensaje",
    "label.resetSent": "Enlace de restablecimiento enviado (modo demo).",
    "label.invalidAuth": "Usa un correo válido y una contraseña de al menos 8 caracteres.",
    "label.dailyLimitReached": "Límite diario alcanzado. Mejora para uso ilimitado.",
    "label.addTopic": "Agrega un tema o sube una imagen.", "label.keepConcise": "Mantén la entrada concisa y sin spam.",
    "label.upgradeNow": "Mejorar ahora", "label.search": "Buscar herramientas…",
    "label.notFound": "Página no encontrada", "label.notFoundSub": "Intenta explorar herramientas, categorías o artículos.",
    "label.browseTools": "Explorar herramientas",
    "label.welcomeBack": "Bienvenido de nuevo", "label.createFreeAccount": "Crear cuenta gratis",
    "label.resetPassword": "Restablecer contraseña", "label.minPassword": "Mín. 8 caracteres",
    "label.forgotPassword": "¿Olvidaste tu contraseña?", "label.authTagline": "Logoviking — Kit para Creadores",
    "label.tier": "plan", "label.concept": "Concepto",
    "label.upgradeCreatorPro": "Mejorar a Creator Pro",
    "label.upgradeCreatorProSub": "Uso ilimitado, sin anuncios, procesamiento por lotes y proyectos guardados.",
  },
  pt: {
    "nav.home": "Início", "nav.tools": "Ferramentas", "nav.categories": "Categorias",
    "nav.blog": "Blog", "nav.pricing": "Preços", "nav.faq": "Perguntas",
    "nav.dashboard": "Painel", "nav.login": "Entrar", "nav.signup": "Cadastrar",
    "nav.account": "Conta", "nav.logout": "Sair", "nav.all": "Todas",
    "hero.badge": "Mais de 60 ferramentas gratuitas, sem cadastro",
    "hero.title1": "Uma plataforma.", "hero.title2": "Todas as ferramentas.",
    "hero.subtitle": "Gere logos, imagens com IA, títulos para YouTube, metadados SEO, hashtags, legendas e mais de 60 ferramentas — todas gratuitas.",
    "hero.cta1": "Experimentar o Kit", "hero.cta2": "Gerador de Logos", "hero.cta3": "IA de Imagens",
    "hero.check1": "Sem cadastro para usar ferramentas", "hero.check2": "Plano gratuito disponível", "hero.check3": "Premium a partir de $19/mês",
    "section.newTools": "Recém adicionado", "section.categories": "Explorar por fluxo de trabalho",
    "section.featured": "Kit Completo para Criadores", "section.featuredSub": "Um tema → títulos, hashtags, miniaturas, legendas e palavras-chave.",
    "section.popularTools": "Ferramentas populares", "section.allTools": "Todas as ferramentas",
    "section.blog": "Guias e tutoriais", "section.pricing": "Preços simples",
    "section.pricingSub": "Comece grátis. Atualize quando precisar.",
    "btn.viewAll": "Ver tudo", "btn.allTools": "Todas as ferramentas", "btn.openTool": "Abrir",
    "btn.generate": "Gerar", "btn.generating": "Gerando…",
    "btn.generateLogo": "Gerar Conceitos de Logo", "btn.generatingLogo": "Gerando 2 conceitos…",
    "btn.generateImage": "Gerar Imagem",
    "btn.download": "Baixar", "btn.copy": "Copiar", "btn.export": "Exportar",
    "btn.save": "Salvar", "btn.upgrade": "Atualizar", "btn.back": "Voltar",
    "btn.readMore": "Ler", "btn.explore": "Explorar",
    "btn.createAccount": "Criar conta grátis", "btn.openDashboard": "Abrir painel",
    "btn.getStarted": "Começar", "btn.startFree": "Começar grátis",
    "btn.upgradePro": "Atualizar para Pro", "btn.chooseBusiness": "Escolher Business",
    "btn.saveChanges": "Salvar alterações", "btn.sendMessage": "Enviar mensagem",
    "btn.sendReset": "Enviar link", "btn.googleLogin": "Continuar com Google",
    "btn.clearHistory": "Limpar", "btn.deletePlan": "Excluir",
    "btn.manageplan": "Gerenciar plano", "btn.viewFullComparison": "Ver comparação",
    "label.account": "Conta", "label.guest": "Visitante",
    "label.recentlyUsed": "Usadas recentemente", "label.recommended": "Recomendadas",
    "label.noRecent": "Nenhuma ferramenta usada ainda.", "label.noFavorites": "Sem favoritos ainda.",
    "label.noProjects": "Salvamentos premium aparecem aqui.",
    "label.noHistory": "Sem histórico. Experimente uma ferramenta.",
    "label.topTools": "Ferramentas mais usadas", "label.noData": "Sem dados ainda.",
    "label.relatedTools": "Ferramentas relacionadas", "label.readNext": "Ler depois",
    "label.popularTools": "Ferramentas populares", "label.faqs": "Perguntas frequentes",
    "label.tableOfContents": "Sumário", "label.relatedPosts": "Artigos relacionados",
    "label.subscription": "Assinatura", "label.currentPlan": "Plano atual",
    "label.status": "Status", "label.savedProjects": "Projetos salvos",
    "label.favorites": "Favoritos", "label.recentHistory": "Histórico recente",
    "label.totalUses": "Total de usos", "label.dailyLimit": "Limite diário",
    "label.plan": "Plano", "label.unlimited": "Ilimitado",
    "label.tools": "ferramentas", "label.new": "Novo", "label.pro": "Pro", "label.featured": "Destaque",
    "label.input": "Entrada", "label.output": "Saída",
    "label.topic": "Tema ou consulta", "label.uploadImage": "Enviar imagem", "label.optional": "(opcional)",
    "label.themeColor": "Cor do tema", "label.mode": "Modo",
    "label.light": "Claro", "label.dark": "Escuro", "label.language": "Idioma",
    "label.advertisement": "Publicidade", "label.blogCategory": "Blog", "label.readingTime": "leitura", "label.updated": "Atualizado",
    "label.upgradeNote": "Visitante/Grátis: Limites e marcas d'água se aplicam.",
    "label.upgradeLink": "Atualize para remover anúncios e desbloquear uso ilimitado.",
    "label.tagline": "Kit para Criadores",
    "label.footerDesc": "Kit completo para criadores, designers e SEO.",
    "label.footerProduct": "Produto", "label.footerCategories": "Categorias", "label.footerLegal": "Legal",
    "label.footerCopy": "Criado para criadores, SEO e renda passiva.",
    "label.menu": "Menu",
    "label.name": "Nome", "label.email": "E-mail", "label.password": "Senha", "label.message": "Mensagem",
    "label.industry": "Indústria", "label.stylePreference": "Preferência de estilo", "label.primaryPlatform": "Plataforma principal",
    "label.brandPrompt": "Descrição da marca / canal", "label.brandPromptHint": "(seja específico)",
    "label.promptCounter": "/400 — inclua nome, cores, estilo e ambiente",
    "label.aiLogoTitle": "Gerador de Logos com IA", "label.aiLogoSub": "Descreva sua marca → obtenha 2 conceitos de logo",
    "label.your2Concepts": "Seus 2 Conceitos de Logo", "label.chooseConcept": "Escolha o que melhor representa sua marca",
    "label.conceptSelected": "selecionado ✓", "label.downloadExport": "Baixar e Exportar",
    "label.downloadPng": "Baixar PNG", "label.downloadSvg": "Baixar SVG",
    "label.copyCss": "Copiar cores CSS", "label.saveProject": "Salvar nos projetos",
    "label.upgradeHd": "Atualizar para exportar em HD",
    "label.upgradeForFull": "Atualizar para Creator Pro",
    "label.upgradeForFullSub": "para PNG HD, SVG vetorial e todos os tamanhos de plataforma.",
    "label.generatingLogo": "A IA está gerando seus 2 conceitos de logo…",
    "label.analyzingPrompt": "Analisando sua descrição, indústria, estilo e plataforma",
    "label.describeImage": "Descreva sua imagem", "label.style": "Estilo", "label.aspectRatio": "Proporção",
    "label.generatedImage": "Imagem Gerada", "label.imagePromptHint": "Descreva sua imagem acima e clique em Gerar",
    "label.upgradeResolution": "Atualizar para resolução completa", "label.removeWatermark": "Remover marca d'água",
    "label.regenerate": "Regenerar", "label.settings": "Configurações e preferências",
    "label.settingsSub": "Gerencie seu perfil e preferências.",
    "label.toggleTheme": "Alternar tema", "label.logout": "Sair",
    "label.savedSuccessfully": "Salvo com sucesso.", "label.invalidForm": "Insira um nome e e-mail válidos.",
    "label.contactSent": "Obrigado! Sua mensagem está a caminho (modo demo).",
    "label.invalidContact": "Insira uma mensagem válida sem padrões de spam.",
    "label.sendUs": "Envie-nos uma mensagem",
    "label.resetSent": "Link de redefinição enviado (modo demo).",
    "label.invalidAuth": "Use um e-mail válido e senha com pelo menos 8 caracteres.",
    "label.dailyLimitReached": "Limite diário atingido. Atualize para uso ilimitado.",
    "label.addTopic": "Adicione um tema ou envie uma imagem.", "label.keepConcise": "Mantenha a entrada concisa e sem spam.",
    "label.upgradeNow": "Atualizar agora", "label.search": "Buscar ferramentas…",
    "label.notFound": "Página não encontrada", "label.notFoundSub": "Tente explorar ferramentas, categorias ou artigos.",
    "label.browseTools": "Explorar ferramentas",
    "label.welcomeBack": "Bem-vindo de volta", "label.createFreeAccount": "Criar conta grátis",
    "label.resetPassword": "Redefinir senha", "label.minPassword": "Mín. 8 caracteres",
    "label.forgotPassword": "Esqueceu a senha?", "label.authTagline": "Logoviking — Kit para Criadores",
    "label.tier": "plano", "label.concept": "Conceito",
    "label.upgradeCreatorPro": "Atualizar para Creator Pro",
    "label.upgradeCreatorProSub": "Uso ilimitado, sem anúncios, processamento em lote e projetos salvos.",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.tools": "الأدوات", "nav.categories": "الفئات",
    "nav.blog": "المدونة", "nav.pricing": "الأسعار", "nav.faq": "الأسئلة",
    "nav.dashboard": "لوحة التحكم", "nav.login": "تسجيل الدخول", "nav.signup": "إنشاء حساب",
    "nav.account": "الحساب", "nav.logout": "تسجيل الخروج", "nav.all": "الكل",
    "hero.badge": "أكثر من 60 أداة مجانية، بدون تسجيل",
    "hero.title1": "منصة واحدة.", "hero.title2": "كل أدوات المبدعين.",
    "hero.subtitle": "أنشئ شعارات وصور ذكاء اصطناعي وعناوين يوتيوب وبيانات SEO وهاشتاقات وتسميات توضيحية وأكثر من 60 أداة — كلها مجانية.",
    "hero.cta1": "جرّب مجموعة الإبداع", "hero.cta2": "مولّد الشعارات", "hero.cta3": "مولّد الصور",
    "hero.check1": "لا تسجيل لاستخدام الأدوات", "hero.check2": "خطة مجانية متاحة", "hero.check3": "المميز من 19$/شهر",
    "section.newTools": "أضيف حديثاً", "section.categories": "تصفح حسب سير العمل",
    "section.featured": "مجموعة المبدع الشاملة", "section.featuredSub": "موضوع واحد → عناوين وهاشتاقات وصور مصغرة وتسميات وكلمات مفتاحية.",
    "section.popularTools": "الأدوات الأكثر شيوعاً", "section.allTools": "جميع الأدوات",
    "section.blog": "أدلة ودروس تعليمية", "section.pricing": "أسعار بسيطة",
    "section.pricingSub": "ابدأ مجاناً. قم بالترقية عند الحاجة.",
    "btn.viewAll": "عرض الكل", "btn.allTools": "جميع الأدوات", "btn.openTool": "فتح",
    "btn.generate": "إنشاء", "btn.generating": "جارٍ الإنشاء…",
    "btn.generateLogo": "إنشاء مفاهيم الشعار", "btn.generatingLogo": "إنشاء مفهومين…",
    "btn.generateImage": "إنشاء صورة",
    "btn.download": "تنزيل", "btn.copy": "نسخ", "btn.export": "تصدير",
    "btn.save": "حفظ", "btn.upgrade": "ترقية", "btn.back": "رجوع",
    "btn.readMore": "قراءة", "btn.explore": "استكشاف",
    "btn.createAccount": "إنشاء حساب مجاني", "btn.openDashboard": "فتح لوحة التحكم",
    "btn.getStarted": "ابدأ الآن", "btn.startFree": "ابدأ مجاناً",
    "btn.upgradePro": "الترقية إلى Pro", "btn.chooseBusiness": "اختيار Business",
    "btn.saveChanges": "حفظ التغييرات", "btn.sendMessage": "إرسال الرسالة",
    "btn.sendReset": "إرسال الرابط", "btn.googleLogin": "المتابعة مع Google",
    "btn.clearHistory": "مسح", "btn.deletePlan": "حذف",
    "btn.manageplan": "إدارة الخطة", "btn.viewFullComparison": "عرض المقارنة",
    "label.account": "الحساب", "label.guest": "زائر",
    "label.recentlyUsed": "المستخدمة مؤخراً", "label.recommended": "موصى بها",
    "label.noRecent": "لم تستخدم أي أداة بعد.", "label.noFavorites": "لا توجد مفضلات بعد.",
    "label.noProjects": "المشاريع المميزة تظهر هنا.",
    "label.noHistory": "لا يوجد سجل. جرّب أداة للبدء.",
    "label.topTools": "الأدوات الأكثر استخداماً", "label.noData": "لا توجد بيانات بعد.",
    "label.relatedTools": "أدوات ذات صلة", "label.readNext": "اقرأ لاحقاً",
    "label.popularTools": "الأدوات الشائعة", "label.faqs": "الأسئلة الشائعة",
    "label.tableOfContents": "جدول المحتويات", "label.relatedPosts": "مقالات ذات صلة",
    "label.subscription": "الاشتراك", "label.currentPlan": "الخطة الحالية",
    "label.status": "الحالة", "label.savedProjects": "المشاريع المحفوظة",
    "label.favorites": "المفضلة", "label.recentHistory": "السجل الأخير",
    "label.totalUses": "إجمالي الاستخدامات", "label.dailyLimit": "الحد اليومي",
    "label.plan": "الخطة", "label.unlimited": "غير محدود",
    "label.tools": "أدوات", "label.new": "جديد", "label.pro": "Pro", "label.featured": "مميز",
    "label.input": "المدخلات", "label.output": "المخرجات",
    "label.topic": "الموضوع أو الاستعلام", "label.uploadImage": "رفع صورة", "label.optional": "(اختياري)",
    "label.themeColor": "لون الثيم", "label.mode": "الوضع",
    "label.light": "فاتح", "label.dark": "داكن", "label.language": "اللغة",
    "label.advertisement": "إعلان", "label.blogCategory": "مدونة", "label.readingTime": "قراءة", "label.updated": "تحديث",
    "label.upgradeNote": "الزائر/المجاني: تُطبق القيود والعلامات المائية.",
    "label.upgradeLink": "قم بالترقية لإزالة الإعلانات وفتح الاستخدام غير المحدود.",
    "label.tagline": "مجموعة أدوات المبدع",
    "label.footerDesc": "مجموعة شاملة للمبدعين والمصممين وتحسين محركات البحث.",
    "label.footerProduct": "المنتج", "label.footerCategories": "الفئات", "label.footerLegal": "قانوني",
    "label.footerCopy": "مبني للمبدعين والـSEO والدخل السلبي.",
    "label.menu": "القائمة",
    "label.name": "الاسم", "label.email": "البريد الإلكتروني", "label.password": "كلمة المرور", "label.message": "الرسالة",
    "label.industry": "الصناعة", "label.stylePreference": "تفضيل الأسلوب", "label.primaryPlatform": "المنصة الأساسية",
    "label.brandPrompt": "وصف العلامة التجارية / القناة", "label.brandPromptHint": "(كن محدداً)",
    "label.promptCounter": "/400 — أدرج الاسم والألوان والأسلوب والأجواء",
    "label.aiLogoTitle": "مولّد الشعارات بالذكاء الاصطناعي", "label.aiLogoSub": "صف علامتك التجارية ← احصل على مفهومين للشعار",
    "label.your2Concepts": "مفهوماك للشعار", "label.chooseConcept": "اختر الأنسب لعلامتك",
    "label.conceptSelected": "محدد ✓", "label.downloadExport": "تنزيل وتصدير",
    "label.downloadPng": "تنزيل PNG", "label.downloadSvg": "تنزيل SVG",
    "label.copyCss": "نسخ ألوان CSS", "label.saveProject": "حفظ في المشاريع",
    "label.upgradeHd": "ترقية للتصدير بجودة عالية",
    "label.upgradeForFull": "الترقية إلى Creator Pro",
    "label.upgradeForFullSub": "للحصول على PNG عالي الجودة وSVG لجميع أحجام المنصات.",
    "label.generatingLogo": "الذكاء الاصطناعي يُنشئ مفهوميك للشعار…",
    "label.analyzingPrompt": "تحليل وصفك والصناعة والأسلوب والمنصة",
    "label.describeImage": "صف صورتك", "label.style": "الأسلوب", "label.aspectRatio": "نسبة العرض إلى الارتفاع",
    "label.generatedImage": "الصورة المُنشأة", "label.imagePromptHint": "صف صورتك أعلاه واضغط على إنشاء",
    "label.upgradeResolution": "ترقية للدقة الكاملة", "label.removeWatermark": "إزالة العلامة المائية",
    "label.regenerate": "إعادة الإنشاء", "label.settings": "الإعدادات والتفضيلات",
    "label.settingsSub": "إدارة ملفك الشخصي وتفضيلاتك.",
    "label.toggleTheme": "تبديل الثيم", "label.logout": "تسجيل الخروج",
    "label.savedSuccessfully": "تم الحفظ بنجاح.", "label.invalidForm": "أدخل اسماً وبريداً إلكترونياً صحيحين.",
    "label.contactSent": "شكراً! رسالتك في طريقها (وضع العرض).",
    "label.invalidContact": "أدخل رسالة صحيحة بدون أنماط بريد مزعج.",
    "label.sendUs": "أرسل لنا رسالة",
    "label.resetSent": "تم إرسال رابط إعادة التعيين (وضع العرض).",
    "label.invalidAuth": "استخدم بريداً صحيحاً وكلمة مرور لا تقل عن 8 أحرف.",
    "label.dailyLimitReached": "تم الوصول للحد اليومي. قم بالترقية للاستخدام غير المحدود.",
    "label.addTopic": "أضف موضوعاً أو ارفع صورة.", "label.keepConcise": "اجعل المدخل موجزاً وبدون بريد مزعج.",
    "label.upgradeNow": "ترقية الآن", "label.search": "البحث في الأدوات…",
    "label.notFound": "الصفحة غير موجودة", "label.notFoundSub": "حاول استعراض الأدوات أو الفئات أو المقالات.",
    "label.browseTools": "استعراض الأدوات",
    "label.welcomeBack": "مرحباً بعودتك", "label.createFreeAccount": "إنشاء حساب مجاني",
    "label.resetPassword": "إعادة تعيين كلمة المرور", "label.minPassword": "8 أحرف على الأقل",
    "label.forgotPassword": "نسيت كلمة المرور؟", "label.authTagline": "Logoviking — مجموعة أدوات المبدع",
    "label.tier": "خطة", "label.concept": "مفهوم",
    "label.upgradeCreatorPro": "الترقية إلى Creator Pro",
    "label.upgradeCreatorProSub": "استخدام غير محدود وبدون إعلانات ومعالجة جماعية ومشاريع محفوظة.",
  },
  ru: {
    "nav.home": "Главная", "nav.tools": "Инструменты", "nav.categories": "Категории",
    "nav.blog": "Блог", "nav.pricing": "Цены", "nav.faq": "Вопросы",
    "nav.dashboard": "Панель", "nav.login": "Войти", "nav.signup": "Регистрация",
    "nav.account": "Аккаунт", "nav.logout": "Выйти", "nav.all": "Все",
    "hero.badge": "80+ бесплатных инструментов, без регистрации",
    "hero.title1": "Одна платформа.", "hero.title2": "Все инструменты.",
    "hero.subtitle": "Создавайте логотипы, изображения AI, заголовки YouTube, SEO-метаданные, хэштеги, подписи и 80+ инструментов — всё бесплатно.",
    "hero.cta1": "Попробовать набор", "hero.cta2": "Генератор логотипов", "hero.cta3": "AI-изображения",
    "hero.check1": "Без регистрации", "hero.check2": "Бесплатный план", "hero.check3": "Премиум от $19/мес",
    "section.newTools": "Только добавлено", "section.categories": "Просмотр по рабочему процессу",
    "section.featured": "Полный набор для создателей", "section.featuredSub": "Одна тема → заголовки, хэштеги, миниатюры, подписи и ключевые слова.",
    "section.popularTools": "Популярные инструменты", "section.allTools": "Все инструменты",
    "section.blog": "Руководства и уроки", "section.pricing": "Простые цены",
    "section.pricingSub": "Начните бесплатно. Обновляйтесь по мере необходимости.",
    "btn.viewAll": "Смотреть все", "btn.allTools": "Все инструменты", "btn.openTool": "Открыть",
    "btn.generate": "Создать", "btn.generating": "Создание…",
    "btn.generateLogo": "Создать концепции логотипа", "btn.generatingLogo": "Создание 2 концепций…",
    "btn.generateImage": "Создать изображение",
    "btn.download": "Скачать", "btn.copy": "Копировать", "btn.export": "Экспорт",
    "btn.save": "Сохранить", "btn.upgrade": "Обновить", "btn.back": "Назад",
    "btn.readMore": "Читать", "btn.explore": "Изучить",
    "btn.createAccount": "Создать бесплатный аккаунт", "btn.openDashboard": "Открыть панель",
    "btn.getStarted": "Начать", "btn.startFree": "Начать бесплатно",
    "btn.upgradePro": "Обновить до Pro", "btn.chooseBusiness": "Выбрать Business",
    "btn.saveChanges": "Сохранить", "btn.sendMessage": "Отправить сообщение",
    "btn.sendReset": "Отправить ссылку", "btn.googleLogin": "Продолжить с Google",
    "btn.clearHistory": "Очистить", "btn.deletePlan": "Удалить",
    "btn.manageplan": "Управление планом", "btn.viewFullComparison": "Сравнение",
    "label.account": "Аккаунт", "label.guest": "Гость",
    "label.recentlyUsed": "Недавно использованные", "label.recommended": "Рекомендуемые",
    "label.noRecent": "Инструменты ещё не использовались.", "label.noFavorites": "Нет избранного.",
    "label.noProjects": "Премиум-сохранения появятся здесь.",
    "label.noHistory": "Нет истории. Попробуйте инструмент.",
    "label.topTools": "Самые используемые", "label.noData": "Нет данных.",
    "label.relatedTools": "Похожие инструменты", "label.readNext": "Читать далее",
    "label.popularTools": "Популярные инструменты", "label.faqs": "Вопросы и ответы",
    "label.tableOfContents": "Содержание", "label.relatedPosts": "Похожие статьи",
    "label.subscription": "Подписка", "label.currentPlan": "Текущий план",
    "label.status": "Статус", "label.savedProjects": "Сохранённые проекты",
    "label.favorites": "Избранное", "label.recentHistory": "Недавняя история",
    "label.totalUses": "Всего использований", "label.dailyLimit": "Дневной лимит",
    "label.plan": "План", "label.unlimited": "Безлимитно",
    "label.tools": "инструментов", "label.new": "Новый", "label.pro": "Pro", "label.featured": "Избранное",
    "label.input": "Ввод", "label.output": "Вывод",
    "label.topic": "Тема или запрос", "label.uploadImage": "Загрузить изображение", "label.optional": "(необязательно)",
    "label.themeColor": "Цвет темы", "label.mode": "Режим",
    "label.light": "Светлый", "label.dark": "Тёмный", "label.language": "Язык",
    "label.advertisement": "Реклама", "label.blogCategory": "Блог", "label.readingTime": "чтение", "label.updated": "Обновлено",
    "label.upgradeNote": "Гость/Бесплатно: применяются ограничения и водяные знаки.",
    "label.upgradeLink": "Обновитесь для отключения рекламы и безлимитного использования.",
    "label.tagline": "Инструменты для создателей",
    "label.footerDesc": "Универсальный набор для создателей, дизайнеров и SEO.",
    "label.footerProduct": "Продукт", "label.footerCategories": "Категории", "label.footerLegal": "Право",
    "label.footerCopy": "Создано для создателей, SEO и пассивного дохода.",
    "label.menu": "Меню",
    "label.name": "Имя", "label.email": "Email", "label.password": "Пароль", "label.message": "Сообщение",
    "label.industry": "Отрасль", "label.stylePreference": "Предпочтение стиля", "label.primaryPlatform": "Основная платформа",
    "label.brandPrompt": "Описание бренда / канала", "label.brandPromptHint": "(будьте конкретны)",
    "label.promptCounter": "/400 — укажите название, цвета, стиль и атмосферу",
    "label.aiLogoTitle": "AI-генератор логотипов", "label.aiLogoSub": "Опишите бренд → получите 2 концепции логотипа",
    "label.your2Concepts": "2 концепции вашего логотипа", "label.chooseConcept": "Выберите подходящую для вашего бренда",
    "label.conceptSelected": "выбрано ✓", "label.downloadExport": "Скачать и экспортировать",
    "label.downloadPng": "Скачать PNG", "label.downloadSvg": "Скачать SVG",
    "label.copyCss": "Скопировать цвета CSS", "label.saveProject": "Сохранить в проекты",
    "label.upgradeHd": "Обновить для HD-экспорта",
    "label.upgradeForFull": "Обновить до Creator Pro",
    "label.upgradeForFullSub": "для HD PNG, векторного SVG и всех размеров платформ.",
    "label.generatingLogo": "AI создаёт 2 концепции вашего логотипа…",
    "label.analyzingPrompt": "Анализируется описание, отрасль, стиль и платформа",
    "label.describeImage": "Опишите изображение", "label.style": "Стиль", "label.aspectRatio": "Соотношение сторон",
    "label.generatedImage": "Созданное изображение", "label.imagePromptHint": "Опишите изображение выше и нажмите «Создать»",
    "label.upgradeResolution": "Обновить для полного разрешения", "label.removeWatermark": "Убрать водяной знак",
    "label.regenerate": "Пересоздать", "label.settings": "Настройки и предпочтения",
    "label.settingsSub": "Управляйте профилем и предпочтениями.",
    "label.toggleTheme": "Переключить тему", "label.logout": "Выйти",
    "label.savedSuccessfully": "Успешно сохранено.", "label.invalidForm": "Введите действительное имя и email.",
    "label.contactSent": "Спасибо! Ваше сообщение отправлено (демо-режим).",
    "label.invalidContact": "Введите корректное сообщение без спама.",
    "label.sendUs": "Напишите нам",
    "label.resetSent": "Ссылка для сброса отправлена (демо-режим).",
    "label.invalidAuth": "Используйте действительный email и пароль не менее 8 символов.",
    "label.dailyLimitReached": "Дневной лимит достигнут. Обновитесь для безлимитного использования.",
    "label.addTopic": "Добавьте тему или загрузите изображение.", "label.keepConcise": "Сделайте ввод кратким и без спама.",
    "label.upgradeNow": "Обновить сейчас", "label.search": "Поиск инструментов…",
    "label.notFound": "Страница не найдена", "label.notFoundSub": "Попробуйте просмотреть инструменты, категории или статьи.",
    "label.browseTools": "Просмотреть инструменты",
    "label.welcomeBack": "Добро пожаловать", "label.createFreeAccount": "Создать бесплатный аккаунт",
    "label.resetPassword": "Сбросить пароль", "label.minPassword": "Мин. 8 символов",
    "label.forgotPassword": "Забыли пароль?", "label.authTagline": "Logoviking — инструменты для создателей",
    "label.tier": "план", "label.concept": "Концепция",
    "label.upgradeCreatorPro": "Обновить до Creator Pro",
    "label.upgradeCreatorProSub": "Безлимитное использование, без рекламы, пакетная обработка и сохранённые проекты.",
  },
  fr: {
    "nav.home": "Accueil", "nav.tools": "Outils", "nav.categories": "Catégories",
    "nav.blog": "Blog", "nav.pricing": "Tarifs", "nav.faq": "FAQ",
    "nav.dashboard": "Tableau de bord", "nav.login": "Connexion", "nav.signup": "S'inscrire",
    "nav.account": "Compte", "nav.logout": "Déconnexion", "nav.all": "Tout",
    "hero.badge": "Plus de 60 outils gratuits, sans inscription",
    "hero.title1": "Une plateforme.", "hero.title2": "Tous les outils.",
    "hero.subtitle": "Générez des logos, images IA, titres YouTube, métadonnées SEO, hashtags, légendes et plus de 60 outils — tous gratuits.",
    "hero.cta1": "Essayer le Kit", "hero.cta2": "Générateur de Logos", "hero.cta3": "IA Images",
    "hero.check1": "Sans inscription", "hero.check2": "Plan gratuit disponible", "hero.check3": "Premium dès 19$/mois",
    "section.newTools": "Tout juste ajouté", "section.categories": "Parcourir par flux de travail",
    "section.featured": "Kit Créateur Tout-en-Un", "section.featuredSub": "Un sujet → titres, hashtags, miniatures, légendes et mots-clés.",
    "section.popularTools": "Outils populaires", "section.allTools": "Tous les outils",
    "section.blog": "Guides et tutoriels", "section.pricing": "Tarifs simples",
    "section.pricingSub": "Commencez gratuitement. Passez à la version supérieure quand vous êtes prêt.",
    "btn.viewAll": "Voir tout", "btn.allTools": "Tous les outils", "btn.openTool": "Ouvrir",
    "btn.generate": "Générer", "btn.generating": "Génération…",
    "btn.generateLogo": "Générer des concepts de logo", "btn.generatingLogo": "Génération de 2 concepts…",
    "btn.generateImage": "Générer une image",
    "btn.download": "Télécharger", "btn.copy": "Copier", "btn.export": "Exporter",
    "btn.save": "Enregistrer", "btn.upgrade": "Mettre à niveau", "btn.back": "Retour",
    "btn.readMore": "Lire", "btn.explore": "Explorer",
    "btn.createAccount": "Créer un compte gratuit", "btn.openDashboard": "Ouvrir le tableau de bord",
    "btn.getStarted": "Commencer", "btn.startFree": "Commencer gratuitement",
    "btn.upgradePro": "Passer à Pro", "btn.chooseBusiness": "Choisir Business",
    "btn.saveChanges": "Enregistrer", "btn.sendMessage": "Envoyer le message",
    "btn.sendReset": "Envoyer le lien", "btn.googleLogin": "Continuer avec Google",
    "btn.clearHistory": "Effacer", "btn.deletePlan": "Supprimer",
    "btn.manageplan": "Gérer le plan", "btn.viewFullComparison": "Voir la comparaison",
    "label.account": "Compte", "label.guest": "Visiteur",
    "label.recentlyUsed": "Récemment utilisés", "label.recommended": "Recommandés",
    "label.noRecent": "Aucun outil utilisé pour l'instant.", "label.noFavorites": "Pas encore de favoris.",
    "label.noProjects": "Les sauvegardes premium apparaîtront ici.",
    "label.noHistory": "Pas d'historique. Essayez un outil.",
    "label.topTools": "Outils les plus utilisés", "label.noData": "Pas encore de données.",
    "label.relatedTools": "Outils connexes", "label.readNext": "À lire ensuite",
    "label.popularTools": "Outils populaires", "label.faqs": "FAQ",
    "label.tableOfContents": "Table des matières", "label.relatedPosts": "Articles connexes",
    "label.subscription": "Abonnement", "label.currentPlan": "Plan actuel",
    "label.status": "Statut", "label.savedProjects": "Projets enregistrés",
    "label.favorites": "Favoris", "label.recentHistory": "Historique récent",
    "label.totalUses": "Total d'utilisations", "label.dailyLimit": "Limite quotidienne",
    "label.plan": "Plan", "label.unlimited": "Illimité",
    "label.tools": "outils", "label.new": "Nouveau", "label.pro": "Pro", "label.featured": "En vedette",
    "label.input": "Entrée", "label.output": "Sortie",
    "label.topic": "Sujet ou requête", "label.uploadImage": "Télécharger une image", "label.optional": "(optionnel)",
    "label.themeColor": "Couleur du thème", "label.mode": "Mode",
    "label.light": "Clair", "label.dark": "Sombre", "label.language": "Langue",
    "label.advertisement": "Publicité", "label.blogCategory": "Blog", "label.readingTime": "lecture", "label.updated": "Mis à jour",
    "label.upgradeNote": "Invité/Gratuit : des limites et filigranes s'appliquent.",
    "label.upgradeLink": "Mettez à niveau pour supprimer les annonces et débloquer l'utilisation illimitée.",
    "label.tagline": "Boîte à outils Créateur",
    "label.footerDesc": "Boîte à outils tout-en-un pour créateurs, designers et SEO.",
    "label.footerProduct": "Produit", "label.footerCategories": "Catégories", "label.footerLegal": "Légal",
    "label.footerCopy": "Conçu pour les créateurs, le SEO et les revenus passifs.",
    "label.menu": "Menu",
    "label.name": "Nom", "label.email": "E-mail", "label.password": "Mot de passe", "label.message": "Message",
    "label.industry": "Industrie", "label.stylePreference": "Préférence de style", "label.primaryPlatform": "Plateforme principale",
    "label.brandPrompt": "Description de la marque / chaîne", "label.brandPromptHint": "(soyez précis)",
    "label.promptCounter": "/400 — incluez le nom, les couleurs, le style et l'ambiance",
    "label.aiLogoTitle": "Générateur de logos IA", "label.aiLogoSub": "Décrivez votre marque → obtenez 2 concepts de logo",
    "label.your2Concepts": "Vos 2 concepts de logo", "label.chooseConcept": "Choisissez celui qui correspond le mieux",
    "label.conceptSelected": "sélectionné ✓", "label.downloadExport": "Télécharger et exporter",
    "label.downloadPng": "Télécharger PNG", "label.downloadSvg": "Télécharger SVG",
    "label.copyCss": "Copier les couleurs CSS", "label.saveProject": "Enregistrer dans les projets",
    "label.upgradeHd": "Mettre à niveau pour l'export HD",
    "label.upgradeForFull": "Passer à Creator Pro",
    "label.upgradeForFullSub": "pour PNG HD, SVG vectoriel et toutes les tailles de plateformes.",
    "label.generatingLogo": "L'IA génère vos 2 concepts de logo…",
    "label.analyzingPrompt": "Analyse de votre description, industrie, style et plateforme",
    "label.describeImage": "Décrivez votre image", "label.style": "Style", "label.aspectRatio": "Rapport d'aspect",
    "label.generatedImage": "Image générée", "label.imagePromptHint": "Décrivez votre image ci-dessus et cliquez sur Générer",
    "label.upgradeResolution": "Mettre à niveau pour la résolution complète", "label.removeWatermark": "Supprimer le filigrane",
    "label.regenerate": "Régénérer", "label.settings": "Paramètres et préférences",
    "label.settingsSub": "Gérez votre profil et vos préférences.",
    "label.toggleTheme": "Changer de thème", "label.logout": "Déconnexion",
    "label.savedSuccessfully": "Enregistré avec succès.", "label.invalidForm": "Entrez un nom et un e-mail valides.",
    "label.contactSent": "Merci ! Votre message est en route (mode démo).",
    "label.invalidContact": "Entrez un message valide sans spam.",
    "label.sendUs": "Envoyez-nous un message",
    "label.resetSent": "Lien de réinitialisation envoyé (mode démo).",
    "label.invalidAuth": "Utilisez un e-mail valide et un mot de passe d'au moins 8 caractères.",
    "label.dailyLimitReached": "Limite quotidienne atteinte. Mettez à niveau pour un usage illimité.",
    "label.addTopic": "Ajoutez un sujet ou téléchargez une image.", "label.keepConcise": "Gardez la saisie concise et sans spam.",
    "label.upgradeNow": "Mettre à niveau maintenant", "label.search": "Rechercher des outils…",
    "label.notFound": "Page introuvable", "label.notFoundSub": "Essayez de parcourir les outils, catégories ou articles.",
    "label.browseTools": "Parcourir les outils",
    "label.welcomeBack": "Bon retour", "label.createFreeAccount": "Créer un compte gratuit",
    "label.resetPassword": "Réinitialiser le mot de passe", "label.minPassword": "Min. 8 caractères",
    "label.forgotPassword": "Mot de passe oublié ?", "label.authTagline": "Logoviking — Boîte à outils Créateur",
    "label.tier": "plan", "label.concept": "Concept",
    "label.upgradeCreatorPro": "Passer à Creator Pro",
    "label.upgradeCreatorProSub": "Utilisation illimitée, sans publicités, traitement par lots et projets sauvegardés.",
  },
  de: {
    "nav.home": "Startseite", "nav.tools": "Tools", "nav.categories": "Kategorien",
    "nav.blog": "Blog", "nav.pricing": "Preise", "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard", "nav.login": "Anmelden", "nav.signup": "Registrieren",
    "nav.account": "Konto", "nav.logout": "Abmelden", "nav.all": "Alle",
    "hero.badge": "80+ kostenlose Creator-Tools, keine Anmeldung erforderlich",
    "hero.title1": "Eine Plattform.", "hero.title2": "Jedes Creator-Tool.",
    "hero.subtitle": "Erstelle Logos, KI-Bilder, YouTube-Titel, SEO-Metadaten, Hashtags, Beschriftungen und 80+ weitere Tools — alles kostenlos.",
    "hero.cta1": "Creator-Kit ausprobieren", "hero.cta2": "Bild-Tools", "hero.cta3": "SEO-Tools",
    "hero.check1": "Keine Anmeldung erforderlich", "hero.check2": "Kostenloser Plan verfügbar", "hero.check3": "Premium ab $19/Monat",
    "section.newTools": "Neu hinzugefügt", "section.categories": "Nach Arbeitsablauf durchsuchen",
    "section.featured": "All-in-One Creator-Kit", "section.featuredSub": "Ein Thema → Titel, Hashtags, Thumbnails, Beschriftungen und Keywords.",
    "section.popularTools": "Beliebte Tools", "section.allTools": "Alle Tools",
    "section.blog": "Guides und Tutorials", "section.pricing": "Einfache Preise",
    "section.pricingSub": "Kostenlos starten. Upgrade wenn nötig.",
    "btn.viewAll": "Alle anzeigen", "btn.allTools": "Alle Tools", "btn.openTool": "Öffnen",
    "btn.generate": "Generieren", "btn.generating": "Generierung…",
    "btn.generateLogo": "Logo-Konzepte generieren", "btn.generatingLogo": "2 Konzepte werden generiert…",
    "btn.generateImage": "Bild generieren",
    "btn.download": "Herunterladen", "btn.copy": "Kopieren", "btn.export": "Exportieren",
    "btn.save": "Speichern", "btn.upgrade": "Upgrade", "btn.back": "Zurück",
    "btn.readMore": "Lesen", "btn.explore": "Erkunden",
    "btn.createAccount": "Kostenloses Konto erstellen", "btn.openDashboard": "Dashboard öffnen",
    "btn.getStarted": "Loslegen", "btn.startFree": "Kostenlos starten",
    "btn.upgradePro": "Auf Pro upgraden", "btn.chooseBusiness": "Business wählen",
    "btn.saveChanges": "Änderungen speichern", "btn.sendMessage": "Nachricht senden",
    "btn.sendReset": "Link senden", "btn.googleLogin": "Mit Google fortfahren",
    "btn.clearHistory": "Löschen", "btn.deletePlan": "Entfernen",
    "btn.manageplan": "Plan verwalten", "btn.viewFullComparison": "Vergleich ansehen",
    "label.account": "Konto", "label.guest": "Gastbesucher",
    "label.recentlyUsed": "Zuletzt verwendet", "label.recommended": "Empfohlen",
    "label.noRecent": "Noch keine Tools verwendet.", "label.noFavorites": "Noch keine Favoriten.",
    "label.noProjects": "Premium-Speicherstände erscheinen hier.",
    "label.noHistory": "Kein Verlauf. Probiere ein Tool aus.",
    "label.topTools": "Am häufigsten verwendete Tools", "label.noData": "Noch keine Daten.",
    "label.relatedTools": "Ähnliche Tools", "label.readNext": "Als Nächstes lesen",
    "label.popularTools": "Beliebte Tools", "label.faqs": "Häufige Fragen",
    "label.tableOfContents": "Inhaltsverzeichnis", "label.relatedPosts": "Ähnliche Beiträge",
    "label.subscription": "Abonnement", "label.currentPlan": "Aktueller Plan",
    "label.status": "Status", "label.savedProjects": "Gespeicherte Projekte",
    "label.favorites": "Favoriten", "label.recentHistory": "Letzter Verlauf",
    "label.totalUses": "Gesamtnutzungen", "label.dailyLimit": "Tageslimit",
    "label.plan": "Plan", "label.unlimited": "Unbegrenzt",
    "label.tools": "Tools", "label.new": "Neu", "label.pro": "Pro", "label.featured": "Empfohlen",
    "label.input": "Eingabe", "label.output": "Ausgabe",
    "label.topic": "Thema oder Suchanfrage", "label.uploadImage": "Bild hochladen", "label.optional": "(optional)",
    "label.themeColor": "Themenfarbe", "label.mode": "Modus",
    "label.light": "Hell", "label.dark": "Dunkel", "label.language": "Sprache",
    "label.advertisement": "Werbung", "label.blogCategory": "Blog", "label.readingTime": "Lesezeit", "label.updated": "Aktualisiert",
    "label.upgradeNote": "Gast/Kostenlos: Limits und Wasserzeichen werden angewendet.",
    "label.upgradeLink": "Upgrade für keine Werbung und unbegrenzte Nutzung.",
    "label.tagline": "Creator-Toolkit",
    "label.footerDesc": "All-in-One-Toolkit für Creator, Designer und SEO.",
    "label.footerProduct": "Produkt", "label.footerCategories": "Kategorien", "label.footerLegal": "Rechtliches",
    "label.footerCopy": "Für Creator, SEO und passives Einkommen entwickelt.",
    "label.menu": "Menü",
    "label.name": "Name", "label.email": "E-Mail", "label.password": "Passwort", "label.message": "Nachricht",
    "label.industry": "Branche", "label.stylePreference": "Stilpräferenz", "label.primaryPlatform": "Hauptplattform",
    "label.brandPrompt": "Marken-/Kanalbeschreibung", "label.brandPromptHint": "(sei spezifisch)",
    "label.promptCounter": "/400 — Name, Farben, Stil und Stimmung angeben",
    "label.aiLogoTitle": "Branding-Ideen", "label.aiLogoSub": "Praktische Branding-Hilfen für Creator",
    "label.your2Concepts": "Deine 2 Logo-Konzepte", "label.chooseConcept": "Wähle das passende Konzept",
    "label.conceptSelected": "ausgewählt ✓", "label.downloadExport": "Herunterladen & Exportieren",
    "label.downloadPng": "PNG herunterladen", "label.downloadSvg": "SVG herunterladen",
    "label.copyCss": "CSS-Farben kopieren", "label.saveProject": "In Projekten speichern",
    "label.upgradeHd": "Upgrade für HD-Export",
    "label.upgradeForFull": "Auf Creator Pro upgraden",
    "label.upgradeForFullSub": "für HD-PNG, Vektor-SVG und alle Plattformgrößen.",
    "label.generatingLogo": "KI generiert deine 2 Logo-Konzepte…",
    "label.analyzingPrompt": "Beschreibung, Branche, Stil und Plattform werden analysiert",
    "label.describeImage": "Beschreibe dein Bild", "label.style": "Stil", "label.aspectRatio": "Seitenverhältnis",
    "label.generatedImage": "Generiertes Bild", "label.imagePromptHint": "Beschreibe dein Bild oben und klicke auf Generieren",
    "label.upgradeResolution": "Upgrade für volle Auflösung", "label.removeWatermark": "Wasserzeichen entfernen",
    "label.regenerate": "Neu generieren", "label.settings": "Einstellungen und Präferenzen",
    "label.settingsSub": "Verwalte dein Profil und deine Präferenzen.",
    "label.toggleTheme": "Theme wechseln", "label.logout": "Abmelden",
    "label.savedSuccessfully": "Erfolgreich gespeichert.", "label.invalidForm": "Gib einen gültigen Namen und eine E-Mail-Adresse ein.",
    "label.contactSent": "Danke! Deine Nachricht ist unterwegs (Demo-Modus).",
    "label.invalidContact": "Gib eine gültige Nachricht ohne Spam-Muster ein.",
    "label.sendUs": "Schreib uns",
    "label.resetSent": "Zurücksetz-Link gesendet (Demo-Modus).",
    "label.invalidAuth": "Verwende eine gültige E-Mail und ein Passwort mit mindestens 8 Zeichen.",
    "label.dailyLimitReached": "Tageslimit erreicht. Upgrade für unbegrenzte Nutzung.",
    "label.addTopic": "Füge ein Thema hinzu oder lade ein Bild hoch.", "label.keepConcise": "Halte die Eingabe prägnant und spam-frei.",
    "label.upgradeNow": "Jetzt upgraden", "label.search": "Tools suchen…",
    "label.notFound": "Seite nicht gefunden", "label.notFoundSub": "Versuche Tools, Kategorien oder Blogbeiträge zu durchsuchen.",
    "label.browseTools": "Tools durchsuchen",
    "label.welcomeBack": "Willkommen zurück", "label.createFreeAccount": "Kostenloses Konto erstellen",
    "label.resetPassword": "Passwort zurücksetzen", "label.minPassword": "Mind. 8 Zeichen",
    "label.forgotPassword": "Passwort vergessen?", "label.authTagline": "Logoviking — Creator-Toolkit",
    "label.tier": "Plan", "label.concept": "Konzept",
    "label.upgradeCreatorPro": "Auf Creator Pro upgraden",
    "label.upgradeCreatorProSub": "Unbegrenzte Nutzung, keine Werbung, Stapelverarbeitung und gespeicherte Projekte.",
  },
  it: {
    "nav.home": "Home", "nav.tools": "Strumenti", "nav.categories": "Categorie",
    "nav.blog": "Blog", "nav.pricing": "Prezzi", "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard", "nav.login": "Accedi", "nav.signup": "Registrati",
    "nav.account": "Account", "nav.logout": "Esci", "nav.all": "Tutti",
    "hero.badge": "80+ strumenti gratuiti per creator, senza registrazione",
    "hero.title1": "Una piattaforma.", "hero.title2": "Tutti gli strumenti per creator.",
    "hero.subtitle": "Genera loghi, immagini AI, titoli YouTube, metadati SEO, hashtag, didascalie e 80+ strumenti — tutto gratis.",
    "hero.cta1": "Prova il Creator Kit", "hero.cta2": "Generatore di Logo", "hero.cta3": "AI Image Gen",
    "hero.check1": "Nessuna registrazione richiesta", "hero.check2": "Piano gratuito disponibile", "hero.check3": "Premium da $19/mese",
    "section.newTools": "Appena aggiunti", "section.categories": "Sfoglia per flusso di lavoro",
    "section.featured": "Creator Kit Tutto in Uno", "section.featuredSub": "Un argomento → titoli, hashtag, miniature, didascalie e parole chiave.",
    "section.popularTools": "Strumenti popolari", "section.allTools": "Tutti gli strumenti",
    "section.blog": "Guide e tutorial", "section.pricing": "Prezzi semplici",
    "section.pricingSub": "Inizia gratis. Aggiorna quando serve di più.",
    "btn.viewAll": "Vedi tutto", "btn.allTools": "Tutti gli strumenti", "btn.openTool": "Apri",
    "btn.generate": "Genera", "btn.generating": "Generazione…",
    "btn.generateLogo": "Genera concetti di logo", "btn.generatingLogo": "Generando 2 concetti…",
    "btn.generateImage": "Genera immagine",
    "btn.download": "Scarica", "btn.copy": "Copia", "btn.export": "Esporta",
    "btn.save": "Salva", "btn.upgrade": "Aggiorna", "btn.back": "Indietro",
    "btn.readMore": "Leggi", "btn.explore": "Esplora",
    "btn.createAccount": "Crea account gratuito", "btn.openDashboard": "Apri dashboard",
    "btn.getStarted": "Inizia", "btn.startFree": "Inizia gratis",
    "btn.upgradePro": "Passa a Pro", "btn.chooseBusiness": "Scegli Business",
    "btn.saveChanges": "Salva modifiche", "btn.sendMessage": "Invia messaggio",
    "btn.sendReset": "Invia link", "btn.googleLogin": "Continua con Google",
    "btn.clearHistory": "Cancella", "btn.deletePlan": "Elimina",
    "btn.manageplan": "Gestisci piano", "btn.viewFullComparison": "Vedi confronto",
    "label.account": "Account", "label.guest": "Visitatore",
    "label.recentlyUsed": "Usati di recente", "label.recommended": "Consigliati",
    "label.noRecent": "Nessuno strumento usato.", "label.noFavorites": "Nessun preferito.",
    "label.noProjects": "I salvataggi Premium appariranno qui.",
    "label.noHistory": "Nessuna cronologia. Prova uno strumento.",
    "label.topTools": "Strumenti più usati", "label.noData": "Nessun dato.",
    "label.relatedTools": "Strumenti correlati", "label.readNext": "Leggi dopo",
    "label.popularTools": "Strumenti popolari", "label.faqs": "Domande frequenti",
    "label.tableOfContents": "Indice", "label.relatedPosts": "Articoli correlati",
    "label.subscription": "Abbonamento", "label.currentPlan": "Piano attuale",
    "label.status": "Stato", "label.savedProjects": "Progetti salvati",
    "label.favorites": "Preferiti", "label.recentHistory": "Cronologia recente",
    "label.totalUses": "Utilizzi totali", "label.dailyLimit": "Limite giornaliero",
    "label.plan": "Piano", "label.unlimited": "Illimitato",
    "label.tools": "strumenti", "label.new": "Nuovo", "label.pro": "Pro", "label.featured": "In evidenza",
    "label.input": "Input", "label.output": "Output",
    "label.topic": "Argomento o query", "label.uploadImage": "Carica immagine", "label.optional": "(opzionale)",
    "label.themeColor": "Colore tema", "label.mode": "Modalità",
    "label.light": "Chiaro", "label.dark": "Scuro", "label.language": "Lingua",
    "label.advertisement": "Pubblicità", "label.blogCategory": "Blog", "label.readingTime": "lettura", "label.updated": "Aggiornato",
    "label.upgradeNote": "Ospite/Gratuito: limiti e filigrana applicati.",
    "label.upgradeLink": "Aggiorna per rimuovere pubblicità e sbloccare uso illimitato.",
    "label.tagline": "Toolkit per Creator",
    "label.footerDesc": "Toolkit completo per creator, designer e SEO.",
    "label.footerProduct": "Prodotto", "label.footerCategories": "Categorie", "label.footerLegal": "Legale",
    "label.footerCopy": "Creato per creator, SEO e reddito passivo.",
    "label.menu": "Menu",
    "label.name": "Nome", "label.email": "Email", "label.password": "Password", "label.message": "Messaggio",
    "label.industry": "Settore", "label.stylePreference": "Preferenza di stile", "label.primaryPlatform": "Piattaforma principale",
    "label.brandPrompt": "Descrizione marchio/canale", "label.brandPromptHint": "(sii specifico)",
    "label.promptCounter": "/400 — includi nome, colori, stile e atmosfera",
    "label.aiLogoTitle": "Generatore Logo AI", "label.aiLogoSub": "Descrivi il tuo brand → ricevi 2 concetti di logo",
    "label.your2Concepts": "I tuoi 2 concetti di logo", "label.chooseConcept": "Scegli quello che si adatta al brand",
    "label.conceptSelected": "selezionato ✓", "label.downloadExport": "Scarica & esporta",
    "label.downloadPng": "Scarica PNG", "label.downloadSvg": "Scarica SVG",
    "label.copyCss": "Copia colori CSS", "label.saveProject": "Salva in progetti",
    "label.upgradeHd": "Aggiorna per export HD",
    "label.upgradeForFull": "Passa a Creator Pro",
    "label.upgradeForFullSub": "per PNG HD, SVG vettoriale e tutte le dimensioni delle piattaforme.",
    "label.generatingLogo": "L'AI sta generando i tuoi 2 concetti…",
    "label.analyzingPrompt": "Analizzando descrizione, settore, stile e piattaforma",
    "label.describeImage": "Descrivi la tua immagine", "label.style": "Stile", "label.aspectRatio": "Proporzioni",
    "label.generatedImage": "Immagine generata", "label.imagePromptHint": "Descrivi l'immagine sopra e clicca Genera",
    "label.upgradeResolution": "Aggiorna per risoluzione piena", "label.removeWatermark": "Rimuovi filigrana",
    "label.regenerate": "Rigenera", "label.settings": "Impostazioni e preferenze",
    "label.settingsSub": "Gestisci profilo e preferenze.",
    "label.toggleTheme": "Cambia tema", "label.logout": "Esci",
    "label.savedSuccessfully": "Salvato con successo.", "label.invalidForm": "Inserisci nome ed email validi.",
    "label.contactSent": "Grazie! Messaggio inviato (modalità demo).",
    "label.invalidContact": "Inserisci un messaggio valido senza spam.",
    "label.sendUs": "Inviaci un messaggio",
    "label.resetSent": "Link di reset inviato (modalità demo).",
    "label.invalidAuth": "Usa email valida e password di almeno 8 caratteri.",
    "label.dailyLimitReached": "Limite giornaliero raggiunto. Aggiorna per uso illimitato.",
    "label.addTopic": "Aggiungi un argomento o carica un'immagine.", "label.keepConcise": "Mantieni l'input conciso e senza spam.",
    "label.upgradeNow": "Aggiorna ora", "label.search": "Cerca strumenti…",
    "label.notFound": "Pagina non trovata", "label.notFoundSub": "Prova a sfogliare strumenti, categorie o blog.",
    "label.browseTools": "Sfoglia strumenti",
    "label.welcomeBack": "Bentornato", "label.createFreeAccount": "Crea account gratuito",
    "label.resetPassword": "Reimposta password", "label.minPassword": "Min. 8 caratteri",
    "label.forgotPassword": "Password dimenticata?", "label.authTagline": "Logoviking — Toolkit Creator",
    "label.tier": "piano", "label.concept": "Concetto",
    "label.upgradeCreatorPro": "Passa a Creator Pro",
    "label.upgradeCreatorProSub": "Uso illimitato, niente pubblicità, batch e progetti salvati.",
  },
  nl: {
    "nav.home": "Home", "nav.tools": "Tools", "nav.categories": "Categorieën",
    "nav.blog": "Blog", "nav.pricing": "Prijzen", "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard", "nav.login": "Inloggen", "nav.signup": "Registreren",
    "nav.account": "Account", "nav.logout": "Uitloggen", "nav.all": "Alle",
    "hero.badge": "80+ gratis creator-tools, geen registratie nodig",
    "hero.title1": "Eén platform.", "hero.title2": "Alle creator-tools.",
    "hero.subtitle": "Genereer logo's, AI-afbeeldingen, YouTube-titels, SEO-metadata, hashtags, bijschriften en 80+ andere tools — gratis.",
    "hero.cta1": "Probeer de Creator Kit", "hero.cta2": "Logo Generator", "hero.cta3": "AI Image Gen",
    "hero.check1": "Geen registratie nodig", "hero.check2": "Gratis abonnement", "hero.check3": "Premium vanaf $19/maand",
    "section.newTools": "Net toegevoegd", "section.categories": "Bladeren per workflow",
    "section.featured": "All-in-One Creator Kit",
    "section.featuredSub": "Eén onderwerp → titels, hashtags, thumbnails, bijschriften en zoekwoorden.",
    "section.popularTools": "Populaire tools", "section.allTools": "Alle tools",
    "section.blog": "Gidsen en tutorials", "section.pricing": "Eenvoudige prijzen",
    "btn.viewAll": "Bekijk alle", "btn.openTool": "Openen", "btn.generate": "Genereer",
    "btn.download": "Downloaden", "btn.copy": "Kopiëren", "btn.save": "Opslaan",
    "btn.upgrade": "Upgrade", "btn.back": "Terug", "btn.createAccount": "Maak gratis account",
    "btn.openDashboard": "Open dashboard", "btn.startFree": "Begin gratis",
    "btn.upgradePro": "Upgrade naar Pro", "btn.chooseBusiness": "Kies Business",
    "label.account": "Account", "label.guest": "Bezoeker", "label.recentlyUsed": "Recent gebruikt",
    "label.recommended": "Aanbevolen", "label.noRecent": "Nog geen tools gebruikt.",
    "label.favorites": "Favorieten", "label.search": "Zoek tools…", "label.menu": "Menu",
    "label.themeColor": "Thema kleur", "label.mode": "Modus", "label.light": "Licht",
    "label.dark": "Donker", "label.language": "Taal", "label.tagline": "Creator Toolkit",
    "label.footerProduct": "Product", "label.footerCategories": "Categorieën", "label.footerLegal": "Juridisch",
    "label.notFound": "Pagina niet gevonden", "label.browseTools": "Bladeren door tools",
    "label.welcomeBack": "Welkom terug", "label.createFreeAccount": "Maak gratis account",
    "label.forgotPassword": "Wachtwoord vergeten?", "label.tier": "plan",
  },

  tr: {
    "nav.home": "Ana Sayfa", "nav.tools": "Araçlar", "nav.categories": "Kategoriler",
    "nav.blog": "Blog", "nav.pricing": "Fiyatlar", "nav.faq": "SSS",
    "nav.dashboard": "Panel", "nav.login": "Giriş", "nav.signup": "Kayıt Ol",
    "nav.account": "Hesap", "nav.logout": "Çıkış", "nav.all": "Tümü",
    "hero.badge": "80+ ücretsiz içerik üretici aracı, kayıt gerektirmez",
    "hero.title1": "Tek platform.", "hero.title2": "Tüm üretici araçları.",
    "hero.subtitle": "Logolar, AI görselleri, YouTube başlıkları, SEO meta verileri, hashtag'ler, alt yazılar ve 80+ araç oluşturun — tamamen ücretsiz.",
    "hero.cta1": "Creator Kit'i Dene", "hero.cta2": "Logo Üreteci", "hero.cta3": "AI Görsel",
    "hero.check1": "Kayıt gerektirmez", "hero.check2": "Ücretsiz plan mevcut", "hero.check3": "Premium $19/aydan başlar",
    "section.newTools": "Yeni eklendi", "section.categories": "İş akışına göre keşfet",
    "section.featured": "All-in-One Creator Kit", "section.featuredSub": "Tek konu → başlıklar, hashtagler, thumbnaillar, alt yazılar, anahtar kelimeler.",
    "section.popularTools": "Popüler araçlar", "section.allTools": "Tüm araçlar",
    "section.blog": "Rehberler ve eğitimler", "section.pricing": "Basit fiyatlandırma",
    "btn.viewAll": "Tümünü gör", "btn.openTool": "Aç", "btn.generate": "Oluştur",
    "btn.download": "İndir", "btn.copy": "Kopyala", "btn.save": "Kaydet",
    "btn.upgrade": "Yükselt", "btn.back": "Geri", "btn.createAccount": "Ücretsiz hesap oluştur",
    "btn.openDashboard": "Paneli aç", "btn.startFree": "Ücretsiz başla",
    "btn.upgradePro": "Pro'ya yükselt", "btn.chooseBusiness": "Business seç",
    "label.account": "Hesap", "label.guest": "Misafir", "label.recentlyUsed": "Son kullanılanlar",
    "label.recommended": "Önerilenler", "label.noRecent": "Henüz araç kullanılmadı.",
    "label.favorites": "Favoriler", "label.search": "Araç ara…", "label.menu": "Menü",
    "label.themeColor": "Tema rengi", "label.mode": "Mod", "label.light": "Açık",
    "label.dark": "Koyu", "label.language": "Dil", "label.tagline": "Creator Toolkit",
  },
  id: {
    "nav.home": "Beranda", "nav.tools": "Alat", "nav.categories": "Kategori",
    "nav.blog": "Blog", "nav.pricing": "Harga", "nav.faq": "FAQ",
    "nav.dashboard": "Dasbor", "nav.login": "Masuk", "nav.signup": "Daftar",
    "nav.account": "Akun", "nav.logout": "Keluar", "nav.all": "Semua",
    "hero.badge": "80+ alat kreator gratis, tanpa pendaftaran",
    "hero.title1": "Satu platform.", "hero.title2": "Semua alat kreator.",
    "hero.subtitle": "Buat logo, gambar AI, judul YouTube, metadata SEO, hashtag, caption, dan 80+ alat lainnya — semua gratis.",
    "hero.cta1": "Coba Creator Kit", "hero.cta2": "Pembuat Logo", "hero.cta3": "Gambar AI",
    "hero.check1": "Tanpa pendaftaran", "hero.check2": "Paket gratis tersedia", "hero.check3": "Premium dari $19/bulan",
    "section.newTools": "Baru ditambahkan", "section.categories": "Telusuri berdasarkan alur kerja",
    "section.featured": "All-in-One Creator Kit", "section.featuredSub": "Satu topik menjadi judul, hashtag, thumbnail, caption, dan kata kunci.",
    "section.popularTools": "Alat populer", "section.allTools": "Semua alat",
    "section.blog": "Panduan dan tutorial", "section.pricing": "Harga sederhana",
    "btn.viewAll": "Lihat semua", "btn.openTool": "Buka", "btn.generate": "Buat",
    "btn.download": "Unduh", "btn.copy": "Salin", "btn.save": "Simpan",
    "btn.upgrade": "Tingkatkan", "btn.back": "Kembali",
    "btn.createAccount": "Buat akun gratis", "btn.openDashboard": "Buka dasbor",
    "btn.startFree": "Mulai gratis", "btn.upgradePro": "Tingkatkan ke Pro",
    "btn.chooseBusiness": "Pilih Business",
    "label.account": "Akun", "label.guest": "Tamu", "label.recentlyUsed": "Baru digunakan",
    "label.recommended": "Direkomendasikan", "label.noRecent": "Belum ada alat yang digunakan.",
    "label.favorites": "Favorit", "label.search": "Cari alat...", "label.menu": "Menu",
    "label.themeColor": "Warna tema", "label.mode": "Mode", "label.light": "Terang",
    "label.dark": "Gelap", "label.language": "Bahasa", "label.tagline": "Creator Toolkit",
    "label.notFound": "Halaman tidak ditemukan", "label.browseTools": "Telusuri alat",
    "label.welcomeBack": "Selamat datang kembali", "label.tier": "paket",
  },
  zh: {
    "nav.home": "首页", "nav.tools": "工具", "nav.categories": "分类",
    "nav.blog": "博客", "nav.pricing": "定价", "nav.faq": "常见问题",
    "nav.dashboard": "仪表板", "nav.login": "登录", "nav.signup": "注册",
    "nav.account": "账户", "nav.logout": "退出", "nav.all": "全部",
    "hero.badge": "60多种免费创作者工具,无需注册",
    "hero.title1": "一个平台。", "hero.title2": "所有创作者工具。",
    "hero.subtitle": "生成徽标、AI 图像、YouTube 标题、SEO 元数据、话题标签、字幕等 60 多种工具——全部免费。",
    "hero.cta1": "试用创作者套件", "hero.cta2": "徽标生成器", "hero.cta3": "AI 图像生成",
    "hero.check1": "无需注册", "hero.check2": "免费计划可用", "hero.check3": "高级版每月 $19 起",
    "section.newTools": "新增", "section.categories": "按工作流浏览",
    "section.featured": "一体化创作者套件", "section.featuredSub": "一个主题即可生成标题、话题标签、缩略图、字幕和关键词。",
    "section.popularTools": "热门工具", "section.allTools": "所有工具",
    "section.blog": "指南和教程", "section.pricing": "简单定价",
    "btn.viewAll": "查看全部", "btn.openTool": "打开", "btn.generate": "生成",
    "btn.download": "下载", "btn.copy": "复制", "btn.save": "保存",
    "btn.upgrade": "升级", "btn.back": "返回",
    "btn.createAccount": "创建免费账户", "btn.openDashboard": "打开仪表板",
    "btn.startFree": "免费开始", "btn.upgradePro": "升级到 Pro",
    "btn.chooseBusiness": "选择商业版",
    "label.account": "账户", "label.guest": "访客", "label.recentlyUsed": "最近使用",
    "label.recommended": "推荐", "label.noRecent": "尚未使用任何工具。",
    "label.favorites": "收藏", "label.search": "搜索工具…", "label.menu": "菜单",
    "label.themeColor": "主题颜色", "label.mode": "模式", "label.light": "浅色",
    "label.dark": "深色", "label.language": "语言", "label.tagline": "创作者工具包",
    "label.notFound": "未找到页面", "label.browseTools": "浏览工具",
    "label.welcomeBack": "欢迎回来", "label.tier": "套餐",
  },
  hi: {
    "nav.home": "होम", "nav.tools": "टूल्स", "nav.categories": "श्रेणियाँ",
    "nav.blog": "ब्लॉग", "nav.pricing": "मूल्य निर्धारण", "nav.faq": "सामान्य प्रश्न",
    "nav.dashboard": "डैशबोर्ड", "nav.login": "लॉगिन", "nav.signup": "साइन अप",
    "nav.account": "खाता", "nav.logout": "लॉगआउट", "nav.all": "सभी",
    "hero.badge": "80+ मुफ्त क्रिएटर टूल्स, साइन अप की जरूरत नहीं",
    "hero.title1": "एक प्लेटफॉर्म।", "hero.title2": "हर क्रिएटर टूल।",
    "hero.subtitle": "लोगो, AI इमेज, YouTube टाइटल, SEO मेटाडेटा, हैशटैग, कैप्शन और 80+ टूल्स बनाएं — सब मुफ्त।",
    "hero.cta1": "क्रिएटर किट आज़माएं", "hero.cta2": "लोगो जेनरेटर", "hero.cta3": "AI इमेज",
    "hero.check1": "साइन अप की जरूरत नहीं", "hero.check2": "मुफ्त प्लान उपलब्ध", "hero.check3": "प्रीमियम $19/महीना से",
    "section.newTools": "नया जोड़ा गया", "section.categories": "वर्कफ़्लो के अनुसार ब्राउज़ करें",
    "section.featured": "ऑल-इन-वन क्रिएटर किट",
    "section.popularTools": "लोकप्रिय टूल्स", "section.allTools": "सभी टूल्स",
    "section.blog": "गाइड और ट्यूटोरियल", "section.pricing": "सरल मूल्य निर्धारण",
    "btn.viewAll": "सभी देखें", "btn.openTool": "खोलें", "btn.generate": "बनाएं",
    "btn.download": "डाउनलोड", "btn.copy": "कॉपी", "btn.save": "सेव",
    "btn.upgrade": "अपग्रेड", "btn.back": "वापस",
    "btn.createAccount": "मुफ्त खाता बनाएं", "btn.openDashboard": "डैशबोर्ड खोलें",
    "btn.startFree": "मुफ्त शुरू करें", "btn.upgradePro": "Pro में अपग्रेड करें",
    "btn.chooseBusiness": "Business चुनें",
    "label.account": "खाता", "label.guest": "अतिथि", "label.recentlyUsed": "हाल ही में उपयोग",
    "label.recommended": "अनुशंसित", "label.noRecent": "अभी तक कोई टूल उपयोग नहीं।",
    "label.favorites": "पसंदीदा", "label.search": "टूल खोजें…", "label.menu": "मेनू",
    "label.themeColor": "थीम रंग", "label.mode": "मोड", "label.light": "लाइट",
    "label.dark": "डार्क", "label.language": "भाषा", "label.tagline": "क्रिएटर टूलकिट",
    "label.welcomeBack": "वापसी पर स्वागत है", "label.tier": "प्लान",
  },
  ja: {
    "nav.home": "ホーム", "nav.tools": "ツール", "nav.categories": "カテゴリー",
    "nav.blog": "ブログ", "nav.pricing": "料金", "nav.faq": "よくある質問",
    "nav.dashboard": "ダッシュボード", "nav.login": "ログイン", "nav.signup": "登録",
    "nav.account": "アカウント", "nav.logout": "ログアウト", "nav.all": "すべて",
    "hero.badge": "60以上の無料クリエイターツール、登録不要",
    "hero.title1": "1つのプラットフォーム。", "hero.title2": "すべてのクリエイターツール。",
    "hero.subtitle": "ロゴ、AI画像、YouTubeタイトル、SEOメタデータ、ハッシュタグ、キャプション、60以上のツールを作成 — すべて無料。",
    "hero.cta1": "Creator Kit を試す", "hero.cta2": "ロゴジェネレーター", "hero.cta3": "AI画像生成",
    "hero.check1": "登録不要", "hero.check2": "無料プランあり", "hero.check3": "プレミアム月額$19から",
    "section.newTools": "新着", "section.categories": "ワークフローで探す",
    "section.featured": "オールインワン Creator Kit",
    "section.popularTools": "人気ツール", "section.allTools": "すべてのツール",
    "section.blog": "ガイドとチュートリアル", "section.pricing": "シンプルな料金",
    "btn.viewAll": "すべて表示", "btn.openTool": "開く", "btn.generate": "生成",
    "btn.download": "ダウンロード", "btn.copy": "コピー", "btn.save": "保存",
    "btn.upgrade": "アップグレード", "btn.back": "戻る",
    "btn.createAccount": "無料アカウント作成", "btn.openDashboard": "ダッシュボードを開く",
    "btn.startFree": "無料で始める", "btn.upgradePro": "Proにアップグレード",
    "btn.chooseBusiness": "Businessを選択",
    "label.account": "アカウント", "label.guest": "ゲスト", "label.recentlyUsed": "最近使用",
    "label.recommended": "おすすめ", "label.noRecent": "まだツールを使用していません。",
    "label.favorites": "お気に入り", "label.search": "ツールを検索…", "label.menu": "メニュー",
    "label.themeColor": "テーマカラー", "label.mode": "モード", "label.light": "ライト",
    "label.dark": "ダーク", "label.language": "言語", "label.tagline": "クリエイターツールキット",
    "label.welcomeBack": "おかえりなさい", "label.tier": "プラン",
  },
  ko: {
    "nav.home": "홈", "nav.tools": "도구", "nav.categories": "카테고리",
    "nav.blog": "블로그", "nav.pricing": "가격", "nav.faq": "자주 묻는 질문",
    "nav.dashboard": "대시보드", "nav.login": "로그인", "nav.signup": "가입",
    "nav.account": "계정", "nav.logout": "로그아웃", "nav.all": "전체",
    "hero.badge": "60개 이상의 무료 크리에이터 도구, 가입 불필요",
    "hero.title1": "하나의 플랫폼.", "hero.title2": "모든 크리에이터 도구.",
    "hero.subtitle": "로고, AI 이미지, YouTube 제목, SEO 메타데이터, 해시태그, 캡션 등 60개 이상의 도구 — 모두 무료.",
    "hero.cta1": "Creator Kit 사용해보기", "hero.cta2": "로고 생성기", "hero.cta3": "AI 이미지",
    "hero.check1": "가입 불필요", "hero.check2": "무료 플랜 제공", "hero.check3": "Premium 월 $19부터",
    "section.newTools": "새로 추가됨", "section.categories": "워크플로별 탐색",
    "section.featured": "올인원 Creator Kit",
    "section.popularTools": "인기 도구", "section.allTools": "모든 도구",
    "section.blog": "가이드 및 튜토리얼", "section.pricing": "간단한 가격",
    "btn.viewAll": "모두 보기", "btn.openTool": "열기", "btn.generate": "생성",
    "btn.download": "다운로드", "btn.copy": "복사", "btn.save": "저장",
    "btn.upgrade": "업그레이드", "btn.back": "뒤로",
    "btn.createAccount": "무료 계정 만들기", "btn.openDashboard": "대시보드 열기",
    "btn.startFree": "무료로 시작", "btn.upgradePro": "Pro로 업그레이드",
    "btn.chooseBusiness": "Business 선택",
    "label.account": "계정", "label.guest": "방문자", "label.recentlyUsed": "최근 사용",
    "label.recommended": "추천", "label.noRecent": "아직 사용한 도구가 없습니다.",
    "label.favorites": "즐겨찾기", "label.search": "도구 검색…", "label.menu": "메뉴",
    "label.themeColor": "테마 색상", "label.mode": "모드", "label.light": "라이트",
    "label.dark": "다크", "label.language": "언어", "label.tagline": "크리에이터 툴킷",
    "label.welcomeBack": "다시 오신 것을 환영합니다", "label.tier": "플랜",
  },
};

function translate(lang: LangCode, key: string): string {
  return translations[lang]?.[key] ?? translations.en?.[key] ?? key;
}

// ─── Category meta ────────────────────────────────────────────────────────────
const categoryMeta: Record<ToolGroup, { name: string; icon: LucideIcon; blurb: string; gradient: string; accent: string }> = {
  image:    { name: "Image Tools",      icon: ImageIcon,   blurb: "Compress, resize, convert, and optimize images for faster, sharper results.",      gradient: "from-sky-500 to-cyan-500",      accent: "sky"    },
  designer: { name: "Designer Tools",   icon: Palette,     blurb: "Build color palettes, gradients, font pairs, and mockups in minutes.",             gradient: "from-fuchsia-500 to-purple-500",accent: "fuchsia"},
  youtube:  { name: "YouTube Tools",    icon: Play,        blurb: "Titles, thumbnails, tags, scripts, and earnings to grow your channel.",            gradient: "from-rose-500 to-orange-400",   accent: "rose"   },
  tiktok:   { name: "TikTok Tools",     icon: Video,       blurb: "Hooks, captions, hashtags, and trend ideas for viral short-form content.",         gradient: "from-slate-700 to-zinc-600",    accent: "slate"  },
  instagram:{ name: "Instagram Tools",  icon: Camera,      blurb: "Bios, captions, reels, and engagement tools to grow your profile.",               gradient: "from-pink-500 to-fuchsia-500",  accent: "pink"   },
  pinterest:{ name: "Pinterest Tools",  icon: MapPin,      blurb: "SEO-rich pin titles, descriptions, and keywords for search-driven traffic.",       gradient: "from-red-500 to-rose-400",      accent: "red"    },
  seo:      { name: "SEO Tools",        icon: Target,      blurb: "Metadata, schema, sitemaps, robots, and technical SEO helpers.",                  gradient: "from-emerald-500 to-teal-400",  accent: "emerald"},
  ai:       { name: "AI Generators",    icon: Sparkles,    blurb: "Hooks, ideas, captions, scripts, and social copy — all from one prompt.",         gradient: "from-indigo-500 to-violet-500", accent: "indigo" },
};

const categories = Object.entries(categoryMeta).map(([slug, meta]) => ({ slug: slug as ToolGroup, ...meta }));

// ─── Tools list ───────────────────────────────────────────────────────────────
const tools: Tool[] = [
  // Featured
  { slug: "all-in-one-creator-kit", name: "All-in-One Creator Kit", category: "ai", description: "One topic → titles, hashtags, thumbnails, captions, keywords, and content ideas. Your fastest path to publish-ready assets.", featured: true },
  // Logo Generator

  // Image
  { slug: "compress-image",         name: "Compress Image",          category: "image",   description: "Shrink image file sizes without losing quality for faster pages." },
  { slug: "resize-image",           name: "Resize Image",            category: "image",   description: "Resize images to exact dimensions for any platform or use case." },
  { slug: "bulk-resize",            name: "Bulk Resize",             category: "image",   description: "Resize multiple images at once in a single workflow.", isPremium: true },
  { slug: "crop-image",             name: "Crop Image",              category: "image",   description: "Crop images to a precise area or aspect ratio." },
  { slug: "rotate-image",           name: "Rotate Image",            category: "image",   description: "Rotate or flip any image quickly." },
  { slug: "convert-png-to-jpg",     name: "PNG to JPG",              category: "image",   description: "Convert PNG files to JPG instantly." },
  { slug: "convert-jpg-to-png",     name: "JPG to PNG",              category: "image",   description: "Convert JPG files to PNG with transparency support." },
  { slug: "webp-converter",         name: "WebP Converter",          category: "image",   description: "Convert images to modern WebP format for better web performance." },
  { slug: "webp-to-jpg",            name: "WebP to JPG",              category: "image",   description: "Convert WebP images to JPG instantly in your browser." , isNew: true },
  { slug: "webp-to-png",            name: "WebP to PNG",              category: "image",   description: "Convert WebP images to lossless PNG without uploading files." , isNew: true },
  { slug: "png-to-webp",            name: "PNG to WebP",              category: "image",   description: "Convert PNG images to smaller WebP files for websites and apps." , isNew: true },
  { slug: "jpg-to-webp",            name: "JPG to WebP",              category: "image",   description: "Convert JPG photos to WebP and reduce web image weight." , isNew: true },
  { slug: "image-to-base64",        name: "Image to Base64",          category: "image",   description: "Convert an image to a Base64 data URL for HTML, CSS, email, or development." , isNew: true },
  { slug: "image-dimensions",       name: "Image Dimensions Checker", category: "image",   description: "Check image width, height, aspect ratio, file type, and file size instantly." , isNew: true },
  { slug: "watermark-tool",         name: "Watermark Tool",          category: "image",   description: "Add a custom watermark to your images." },
  { slug: "meme-creator",           name: "Meme Creator",            category: "image",   description: "Create viral memes with text overlays." },
  { slug: "background-remover",     name: "AI Background Remover",   category: "image",   description: "Remove image backgrounds with AI — 100% in your browser, nothing uploaded.", isNew: true },
  { slug: "blur-background",        name: "Blur & Filters",          category: "image",   description: "Apply blur, grayscale, sepia and other filters to any image." },
  { slug: "color-picker",           name: "Color Picker",            category: "image",   description: "Pick and copy exact color codes from any image." },
  { slug: "image-upscaler",         name: "Image Upscaler",          category: "image",   description: "Enlarge images in your browser with high-quality resampling and no upload required." },
  { slug: "image-optimizer",         name:"Image Optimizer",          category: "image",   description: "Reduce image file size and tune quality for faster websites and sharing." },
  // Designer
  { slug: "color-palette-generator",name: "Color Palette Generator", category: "designer",description: "Generate beautiful, harmonious color palettes instantly." },
  { slug: "gradient-generator",     name: "Gradient Generator",      category: "designer",description: "Create CSS gradients visually and copy the code." },
  { slug: "font-pair-generator",    name: "Font Pair Generator",     category: "designer",description: "Find the perfect font pairing for your brand or project." },
  { slug: "gif-to-video",           name: "GIF to WebM/MP4",         category: "designer",description: "Convert GIFs to lightweight WebM or MP4 for faster websites — with embed code included.", isNew: true },
  { slug: "qr-code-generator",      name: "QR Code Generator",       category: "designer",description: "Generate branded QR codes for links and content." },
  { slug: "logo-size-generator",    name: "Logo Size Guide",         category: "designer",description: "Get the correct logo dimensions for every platform." },
  { slug: "social-media-size-generator",name:"Social Media Sizes",   category: "designer",description: "Lookup the right size for every social media format." },
  { slug: "favicon-generator",      name: "Favicon Generator",       category: "designer",description: "Create favicon PNG sizes and copy ready-to-use HTML link tags from one image." , isNew: true },
  { slug: "aspect-ratio-calculator",name:"Aspect Ratio Calculator",  category: "designer",description: "Calculate image and video aspect ratios, missing dimensions, and common platform sizes." , isNew: true },
  // YouTube
  { slug: "youtube-money-calculator",name:"YouTube Calculator",      category: "youtube", description: "Estimate your YouTube earnings from views and RPM." },
  { slug: "thumbnail-downloader",   name: "Thumbnail Downloader",    category: "youtube", description: "Download YouTube video thumbnails in full quality." },
  { slug: "thumbnail-generator",    name: "Thumbnail Generator",     category: "youtube", description: "Generate click-worthy YouTube thumbnail ideas." },
  { slug: "thumbnail-text-generator",name:"Thumbnail Text",          category: "youtube", description: "Generate bold thumbnail text that increases CTR." },
  { slug: "channel-name-generator", name: "Channel Name Generator",  category: "youtube", description: "Generate catchy, brandable YouTube channel names." },
  { slug: "video-title-generator",  name: "Video Title Generator",   category: "youtube", description: "Generate SEO-friendly, high-CTR YouTube video titles." },
  { slug: "tag-generator",          name: "Tag Generator",           category: "youtube", description: "Generate relevant YouTube tags for better discoverability." },
  { slug: "description-generator",  name: "Description Generator",   category: "youtube", description: "Write keyword-rich YouTube video descriptions fast." },
  { slug: "script-idea-generator",  name: "Script Idea Generator",   category: "youtube", description: "Generate structured video script ideas by topic." },
  { slug: "video-topic-generator",  name: "Video Topic Generator",   category: "youtube", description: "Discover trending video topics for your niche." },
  { slug: "video-seo-generator",    name: "Video SEO Generator",     category: "youtube", description: "Full SEO package: title, description, tags, and chapters." },
  // TikTok
  { slug: "tiktok-earnings-calculator",name:"TikTok Calculator",     category: "tiktok",  description: "Estimate your TikTok earnings by followers and views." },
  { slug: "tiktok-hashtag-generator",name:"Hashtag Generator",       category: "tiktok",  description: "Generate trending TikTok hashtags for more reach." },
  { slug: "tiktok-caption-generator",name:"Caption Generator",       category: "tiktok",  description: "Write engaging TikTok captions that drive action." },
  { slug: "trend-idea-generator",   name: "Trend Idea Generator",    category: "tiktok",  description: "Discover what TikTok trends to jump on next." },
  { slug: "username-generator",     name: "Username Generator",      category: "tiktok",  description: "Generate catchy, available TikTok usernames." },
  // Instagram
  { slug: "instagram-earnings-calculator",name:"Instagram Calculator",category:"instagram",description: "Estimate Instagram earnings for influencer and brand deals." },
  { slug: "engagement-calculator",  name: "Engagement Calculator",   category: "instagram",description: "Calculate your Instagram engagement rate instantly." },
  { slug: "bio-generator",          name: "Bio Generator",           category: "instagram",description: "Write a compelling Instagram bio in seconds." },
  { slug: "instagram-caption-generator",name:"Caption Generator",    category: "instagram",description: "Generate captions that drive saves, shares, and comments." },
  { slug: "instagram-hashtag-generator",name:"Hashtag Generator",    category: "instagram",description: "Find the best Instagram hashtags for your niche." },
  { slug: "reel-idea-generator",    name: "Reel Idea Generator",     category: "instagram",description: "Generate Reel ideas that are built for virality." },
  // Pinterest
  { slug: "pinterest-title-generator",name:"Pin Title Generator",    category: "pinterest",description: "Write SEO-rich Pinterest pin titles that rank." },
  { slug: "pinterest-description-generator",name:"Pin Description",  category: "pinterest",description: "Write keyword-focused Pinterest descriptions." },
  { slug: "pin-idea-generator",     name: "Pin Idea Generator",      category: "pinterest",description: "Generate Pinterest content ideas for your niche." },
  { slug: "keyword-generator",      name: "Pinterest Keywords",      category: "pinterest",description: "Find the best keywords for Pinterest search traffic." },
  // SEO
  { slug: "keyword-density-checker",name:"Keyword Density Checker",  category: "seo",     description: "Analyze keyword density in your content for SEO." },
  { slug: "seo-title-generator",    name: "SEO Title Generator",     category: "seo",     description: "Generate click-worthy, SEO-optimized page titles." },
  { slug: "meta-generator",         name: "Meta Generator",          category: "seo",     description: "Generate meta titles and descriptions for any page." },
  { slug: "sitemap-generator",      name: "Sitemap Generator",       category: "seo",     description: "Generate an XML sitemap for your website." },
  { slug: "robots-generator",       name: "Robots.txt Generator",    category: "seo",     description: "Generate a robots.txt file for crawl control." },
  { slug: "readability-checker",    name: "Readability Checker",     category: "seo",     description: "Check your Flesch reading ease score, grade level, and get improvement tips instantly.", isNew: true },
  { slug: "open-graph-generator",   name: "Open Graph Generator",    category: "seo",     description: "Generate Open Graph meta tags for social sharing." },
  { slug: "schema-generator",       name: "Schema Generator",        category: "seo",     description: "Generate JSON-LD schema markup for rich results." },
  { slug: "faq-generator",          name: "FAQ Generator",           category: "seo",     description: "Generate SEO-structured FAQ sections with schema." },
  { slug: "character-counter",      name: "Character Counter",       category: "seo",     description: "Count characters for Twitter, Instagram, TikTok, YouTube, and LinkedIn — all platform limits in one view.", isNew: true },
  { slug: "word-counter",           name: "Word Counter",            category: "seo",     description: "Count words, characters, sentences, paragraphs, and reading time instantly.", isNew: true },
  // AI
  { slug: "content-idea-generator", name: "Content Idea Generator",  category: "ai",      description: "Generate 10+ content ideas from one topic input." },
  { slug: "viral-hook-generator",   name: "Viral Hook Generator",    category: "ai",      description: "Generate opening hooks that stop the scroll." },
  { slug: "blog-topic-generator",   name: "Blog Topic Generator",    category: "ai",      description: "Generate SEO-friendly blog topics for your niche." },
  { slug: "ai-thumbnail-generator", name: "AI Thumbnail Generator",  category: "ai",      description: "Generate thumbnail concepts that increase CTR." },
  { slug: "ai-post-generator",      name: "AI Post Generator",       category: "ai",      description: "Generate complete social posts from a single idea." },
  { slug: "social-post-generator",  name: "Social Post Generator",   category: "ai",      description: "Generate platform-specific social posts at scale." },
  { slug: "video-hook-generator",   name: "Video Hook Generator",    category: "ai",      description: "Generate the first 5 seconds that keep viewers watching." },
  { slug: "linkedin-post-generator",name: "LinkedIn Post Generator", category: "ai",      description: "Generate professional LinkedIn posts that drive engagement and grow your authority.", isNew: true },
  { slug: "email-subject-generator",name: "Email Subject Generator", category: "ai",      description: "Generate email subject lines that maximize open rates — A/B test variations included.", isNew: true },
  { slug: "content-calendar-generator",name:"Content Calendar",      category: "ai",      description: "Generate a 30-day content calendar with daily post ideas for any platform or niche.", isNew: true },
  { slug: "video-script-generator", name: "Video Script Generator",  category: "ai",      description: "Generate a complete video script — hook, intro, body, CTA, and outro — from any topic.", isNew: true },
  { slug: "brand-deal-calculator",  name: "Brand Deal Calculator",   category: "instagram",description: "Calculate your brand deal rate across YouTube, Instagram, TikTok, and LinkedIn.", isNew: true },
];

const featuredTool = tools[0];
const topTools = ["all-in-one-creator-kit","background-remover","thumbnail-generator","seo-title-generator","compress-image","viral-hook-generator","youtube-money-calculator","color-palette-generator","gradient-generator"];

// ─── Blog data ────────────────────────────────────────────────────────────────
const blogPosts: BlogPost[] = [
  { slug:"youtube-thumbnail-secrets",title:"YouTube Thumbnail Secrets",excerpt:"Composition, text hierarchy, and curiosity strategy for higher click-through rates.",category:"YouTube Tools",readingTime:"5 min",updatedAt:"2026-03-12",sections:[{id:"clarity",title:"Clarity first",paragraphs:["A thumbnail has one job: make the viewer instantly understand the payoff.","Keep it simple enough to read as a tiny preview on mobile."]},{id:"text",title:"Less text, more impact",paragraphs:["Short, bold text wins more often than long copy at thumbnail size.","The Logoviking thumbnail text generator is built for this exact constraint."]}],faqs:[{question:"How many words on a thumbnail?",answer:"Usually 3-5. Less is almost always more at small sizes."},{question:"Should thumbnails be busy?",answer:"No — clear focal points win far more often than cluttered layouts."}],related:["how-much-youtubers-earn","thumbnail-generator","video-title-generator"]},
  { slug:"ai-content-creation-guide",title:"AI Content Creation Guide",excerpt:"Build a faster publishing workflow using AI as a planning and drafting engine.",category:"AI Generators",readingTime:"7 min",updatedAt:"2026-03-01",sections:[{id:"role",title:"What AI should do",paragraphs:["AI speeds up idea generation, structure, and first drafts.","Human strategy, editing, and judgment still separate good content from average."]},{id:"workflow",title:"Build your workflow",paragraphs:["Use one tool to generate ideas, another to refine hooks, and a third to distribute.","That stack is faster than jumping between disconnected apps — which is exactly what Logoviking solves."]}],faqs:[{question:"Can AI write everything?",answer:"It can help a lot, but human editing still matters for quality and trust."},{question:"Is AI good for SEO?",answer:"Yes — when it accelerates your publishing workflow without replacing judgment."}],related:["beginner-seo-guide","viral-hook-generator","blog-topic-generator"]},
  { slug:"youtube-thumbnail-ctr",title:"YouTube Thumbnail Secrets That Actually Drive Clicks",excerpt:"The data-backed thumbnail tactics that top creators use to hit 8-12% click-through rates.",category:"YouTube Tools",readingTime:"5 min",updatedAt:"2026-04-20",sections:[{id:"why",title:"Why thumbnails matter more than titles",paragraphs:["YouTube's algorithm surfaces your video, but your thumbnail is what actually makes someone click. A 2-3% CTR sends a video into decline. An 8-12% CTR triggers explosive distribution.","The difference is almost always the thumbnail — not the content, not the title, not even the topic."]},{id:"formula",title:"The 3-element thumbnail formula",paragraphs:["Every high-performing thumbnail has three things: a face with an emotion, a bold 3-4 word text overlay, and a contrasting color scheme that pops on a dark background.","Use Logoviking's thumbnail generator to test variations before filming — just enter your topic and get 3 visual concept briefs to brief your designer or create yourself."]}],faqs:[{question:"What thumbnail size does YouTube recommend?",answer:"1280×720px at a minimum, 2560×1440px for high-res. Always 16:9 aspect ratio."},{question:"Should I always use my face?",answer:"Faces with strong emotions typically outperform faceless thumbnails by 20-40% in most niches. Test both."}],related:["youtube-thumbnail-generator","all-in-one-creator-kit","beginner-seo-guide"]},
  { slug:"character-counter-platform-limits",title:"Character Counter: Every Platform's Limit in 2026",excerpt:"Twitter, Instagram, TikTok, YouTube, LinkedIn — all character limits in one guide, with a free counter tool that checks all platforms at once.",category:"SEO Tools",readingTime:"5 min",updatedAt:"2026-07-01",sections:[{id:"why",title:"Why character limits matter for creators",paragraphs:["Every platform has strict character limits — and exceeding them means your content gets cut off at the worst moment. A truncated caption loses its CTA. A cropped YouTube title misses the keyword. A LinkedIn headline cut short fails to communicate your value. Understanding platform character limits is one of the smallest habits with one of the biggest impacts on content performance.","Character limits are designed around each platform's display constraints. Twitter's 280-character limit fits neatly in a mobile feed. Instagram's bio limit of 150 characters fits the profile header. YouTube's title limit of 100 characters (with only 60-70 shown in search) shapes how creators write for discoverability. Knowing the exact limit for each context is a professional advantage."]},{id:"limits",title:"Complete 2026 character limit reference for every platform",paragraphs:["Twitter/X: 280 chars per tweet. Bio: 160 chars. Display name: 50 chars. Username: 15 chars.","Instagram: Caption — 2,200 chars (only first 125 visible in feed). Bio — 150 chars. Username — 30 chars.","TikTok: Caption — 2,200 chars (only first 150 visible). Bio — 80 chars. Display name — 30 chars.","YouTube: Title — 100 chars (60-70 visible in search). Description — 5,000 chars. Tags — 500 total chars.","LinkedIn: Post — 3,000 chars (first 140-220 visible before 'see more'). Headline — 220 chars. About — 2,600 chars.","Email subject lines: Best practice under 50 chars for mobile. Gmail shows ~40 chars on mobile, ~77 on desktop.","Use Logoviking's Character Counter to paste any text and instantly see how it performs across all major platforms simultaneously — color-coded green/yellow/red for every platform."]},{id:"tips",title:"Writing within limits without sacrificing impact",paragraphs:["Front-load the most important information. On Instagram, the first 125 characters must hook the reader before they see 'more'. On YouTube, the first 60 characters of your title must convey the topic AND the benefit. On LinkedIn, the first 140 characters must stop someone scrolling past.","The character limit is a creative constraint — and constraints produce better writing. Every character matters, which forces you to cut filler words and get to the point faster. The best copywriters treat short-form limits as a skill to develop, not a frustration to manage."]}],faqs:[{question:"What is the Twitter/X character limit in 2026?",answer:"280 characters per tweet for standard users. Twitter Blue/X Premium subscribers may have access to longer posts depending on their subscription tier."},{question:"How many characters does Instagram allow in a caption?",answer:"Instagram allows up to 2,200 characters, but only the first 125 are visible in the feed before the 'more' button. Always put your hook and CTA in those first 125 characters."},{question:"What is the ideal email subject line length?",answer:"Under 50 characters for maximum mobile visibility. Gmail shows ~40 characters on mobile and ~77 on desktop. Most email is opened on mobile, so 40-50 characters is the safe zone."}],related:["beginner-seo-guide","social-post-generator","word-counter"]},
  { slug:"email-subject-lines-that-get-opened",title:"Email Subject Lines That Get Opened: 47 Templates + Data",excerpt:"The psychological triggers, A/B testing strategy, and formulas behind email subject lines that consistently hit 40-60% open rates.",category:"AI Generators",readingTime:"8 min",updatedAt:"2026-07-03",sections:[{id:"importance",title:"Why your subject line is worth 80% of the effort",paragraphs:["David Ogilvy said that when you've written your headline, you've spent 80 cents of your advertising dollar. The same is true for email subject lines. Your subject line is the only thing your subscriber sees before deciding whether to open or delete. An email with world-class content is worthless if nobody opens it.","Average email open rates across industries hover around 21-23%. But top performers in creator niches regularly hit 40-60% open rates. The difference between a 20% and a 50% open rate is almost entirely the subject line — not the content, not the send time, not the list size. The subject line has one job: make the reader more curious about what's inside than about the other 47 emails in their inbox."]},{id:"triggers",title:"The 8 psychological triggers that drive opens",paragraphs:["1. Curiosity gap: 'The one thing 94% of creators miss' — the reader wants to know what that thing is. 2. Specificity: '7 subject line templates' beats 'some templates'. Odd numbers outperform even numbers. 3. Personalization: First name in subject line increases opens by 26% average. 4. Urgency: 'Expires tonight' triggers loss aversion — use only when genuine. 5. Direct question: Engages the reader's brain before they open. 6. Social proof: '12,000 creators use this formula' signals validated information. 7. Benefit-first: 'Double your open rates in 7 days' beats 'Email marketing guide'. 8. Pattern interrupt: An unexpected subject line stops habitual inbox scanning.","Use Logoviking's Email Subject Generator to get 15 AI-generated subject lines, 5 A/B test pairs, and 8 preview text options for any topic — all optimized for mobile open rates."]},{id:"templates",title:"High-converting subject line templates by category",paragraphs:["Curiosity: 'You've been doing [X] wrong' | 'What nobody tells you about [topic]' | 'I wasn't going to share this, but...'","Numbered lists: '[X] ways to [achieve outcome]' | '[X] mistakes costing you [consequence]' | 'The [X]-minute [topic] framework'","Personal/Story: 'How I [achieved outcome] in [timeframe]' | 'The day I realized [insight]' | 'I tried [X] for [time]. Here's what happened.'","Direct/Benefit: 'Get [specific result] without [obstacle]' | 'Your [result] formula is here' | '[Action] this weekend and [outcome] by Monday'"]}],faqs:[{question:"What is a good email open rate?",answer:"Industry average is 21-23%. Above 30% is excellent. Above 40% is outstanding. Focus on improving your own historical average rather than industry benchmarks, since list quality and niche matter more than industry."},{question:"How long should an email subject line be?",answer:"Under 50 characters for mobile optimization. Since most email is opened on mobile where Gmail shows only ~40 characters, keep subject lines to 40-50 characters whenever possible."},{question:"Do emojis in subject lines help open rates?",answer:"Emojis can increase open rates by 25-45% when used appropriately — they create visual contrast in the inbox. Use one emoji maximum per subject line, avoid combining them with promotional language, and always test with your specific audience."}],related:["ai-content-creation-guide","linkedin-post-generator","beginner-seo-guide"]},
  { slug:"brand-deal-rate-calculator-guide",title:"How Much to Charge for Brand Deals: Rates, Formulas, and Negotiation",excerpt:"The complete creator's guide to pricing brand deals — with rates by platform, niche multipliers, deliverable pricing, and negotiation scripts that work.",category:"YouTube Tools",readingTime:"9 min",updatedAt:"2026-07-05",sections:[{id:"overview",title:"How brand deal pricing actually works",paragraphs:["Brand deals are the biggest income opportunity for most mid-size creators — and also the most commonly underpriced. The creator who understands how rates are calculated consistently earns 2-5x more than equally sized creators who don't.","The core principle: brand deals are not priced on follower count alone. They're priced on audience size × engagement rate × niche relevance × content type × deliverables. A 50,000-follower finance creator with 8% engagement can legitimately charge more than a 500,000-follower gaming creator with 0.8% engagement for a financial services sponsor."]},{id:"formula",title:"The brand deal pricing formula — explained",paragraphs:["Base rate: (Followers ÷ 1,000) × $10-$50 CPM, adjusted by engagement and niche.","Engagement multiplier: ER above 6% = ×2.0. ER 3-6% = ×1.5. ER 1-3% = ×1.0. ER below 1% = ×0.7.","Niche multiplier: Finance: ×2.0. Tech: ×1.8. Education: ×1.5. Health/Fitness: ×1.3. Fashion: ×1.2. Travel: ×1.1. Gaming: ×0.9. General: ×1.0.","Content type multiplier: Dedicated video: ×3.0. Reel/Short: ×1.5. Feed post: ×1.0. Story: ×0.5. Mention in video: ×0.3.","Add-ons: Usage rights +25%. Exclusivity (30 days) +20%. Rush turnaround (48h) +30%.","Use Logoviking's Brand Deal Calculator — input your platform, followers, engagement rate, niche, and deliverables to get your minimum, market rate, and premium rate instantly."]},{id:"negotiate",title:"Negotiation strategy that actually works",paragraphs:["Always quote your rate first. The first number anchors the negotiation. If a brand shares a budget lower than your rate, counter with: 'My standard rate for this deliverable is [X]. I can work with [slightly lower] if we can adjust [deliverables or usage rights].'","Never just say yes or no. A rejected offer should come with a revised proposal: fewer deliverables at their budget, the same deliverables at your rate, or a performance-based structure (base rate plus bonus if the post achieves certain metrics).","Offer long-term partnership discounts: 10-15% off for quarterly or annual commitments. Brands pay this willingly for reduced procurement overhead and guaranteed placements. You get predictable income."]}],faqs:[{question:"How much should I charge for a sponsored Instagram post?",answer:"Rough baseline: $100 per 10,000 followers for a standard feed post, adjusted for engagement and niche. A 50K follower account with average engagement might charge $500. In the finance niche with 6% engagement, that same account could legitimately charge $1,500-$2,500."},{question:"How much should I charge for a sponsored YouTube video?",answer:"YouTube dedicated video rates are typically $20-$50 per 1,000 subscribers, with major niche variation. A 100K subscriber channel might charge $2,000-$5,000. High-engagement finance or tech channels at 100K can charge $5,000-$15,000."},{question:"Should I negotiate brand deal rates?",answer:"Always. Brands almost universally have more budget than their initial offer. Counter with data: engagement rate, average views, niche CPM comparison, and similar past partnership results. Professional negotiation is expected and respected."},{question:"When should I start charging for brand deals?",answer:"As soon as a brand contacts you. Even at 1,000 followers, if a brand offers product — that product has monetary value you can negotiate. At 5,000-10,000 followers with good engagement, you can start charging cash rates."}],related:["how-much-youtubers-earn","instagram-growth-guide","ai-content-creation-guide"]},
  { slug:"png-vs-jpg-explained",title:"PNG vs JPG: Which Image Format Should You Use?",excerpt:"A practical PNG vs JPG comparison for websites, screenshots, photos, transparency, and file size.",category:"Image Tools",readingTime:"6 min",updatedAt:"2026-08-14",sections:[{id:"difference",title:"PNG and JPG solve different problems",paragraphs:["JPG is designed for photographs and continuous-tone images where smaller files matter more than perfect pixel preservation. PNG is lossless and supports transparency, which makes it useful for graphics, screenshots, logos, and interface assets.","Neither format is always better. Choose based on the image content and where it will be used."]},{id:"web",title:"Which is better for a website?",paragraphs:["For photographs, JPG or WebP often produces smaller files. For transparent graphics, PNG or WebP is usually more appropriate.","Before publishing, resize the image to the dimensions you actually need and compress it. LogoViking includes separate PNG-to-JPG, JPG-to-PNG, WebP conversion, resize, and compression tools."]}],faqs:[{question:"Is PNG higher quality than JPG?",answer:"PNG uses lossless compression, so repeated saves do not introduce JPEG-style compression artifacts. JPG can still look excellent for photos at sensible quality settings."},{question:"Does JPG support transparency?",answer:"No. Standard JPG does not support transparent backgrounds. Use PNG or WebP when transparency is required."}],related:["webp-vs-jpg-guide","compress-images-for-web","favicon-size-guide"]},
  { slug:"compress-images-for-web",title:"How to Compress Images for the Web Without Ruining Quality",excerpt:"A practical guide to smaller JPG, PNG, and WebP files for faster websites, email, and uploads.",category:"Image Tools",readingTime:"7 min",updatedAt:"2026-08-14",sections:[{id:"why",title:"Why image compression matters",paragraphs:["Large images slow pages, consume mobile data, and make uploads frustrating. Compression removes unnecessary file weight while keeping the image useful for its destination.","Start with the smallest file that still looks good at the size it will actually be displayed. LogoViking's Image Compressor runs in the browser so the file does not need to be uploaded to our server."]},{id:"formats",title:"JPG, PNG, WebP: which should you use?",paragraphs:["Use JPG for photographs when transparency is not needed. Use PNG for screenshots, line art, and transparency. Use WebP when you want strong web compression with broad modern-browser support.","For a website, test WebP first, compare quality at the final display size, and keep the original separately as a source file."]},{id:"steps",title:"Fast compression workflow",paragraphs:["Resize oversized images first, then compress. There is little value in keeping a 5000-pixel photo if it will display at 1200 pixels.","After compression, compare the before and after file sizes and visually inspect text, faces, gradients, and sharp edges before publishing."]}],faqs:[{question:"Does image compression reduce quality?",answer:"Lossy compression can reduce quality, but sensible settings often cut file size substantially with little visible difference. Lossless workflows preserve more detail but usually save less space."},{question:"Should I use WebP instead of JPG?",answer:"For many websites, WebP is a strong choice. Keep JPG when you need maximum compatibility with older workflows or specific publishing systems."}],related:["webp-vs-jpg-guide","gif-to-webm-guide","character-counter-platform-limits"]},
  { slug:"webp-vs-jpg-guide",title:"WebP vs JPG: Which Image Format Should You Use?",excerpt:"Compare WebP and JPG for websites, quality, compatibility, file size, and conversion workflows.",category:"Image Tools",readingTime:"6 min",updatedAt:"2026-08-14",sections:[{id:"difference",title:"The practical difference",paragraphs:["JPG remains a universal photo format. WebP was designed for the web and can store both lossy and lossless images, including transparency.","The best format depends on where the image will be used. For modern websites, WebP often reduces transfer size. For broad offline compatibility, JPG remains convenient."]},{id:"convert",title:"When converting makes sense",paragraphs:["Convert JPG or PNG to WebP when page weight matters. Convert WebP to JPG when a legacy editor, marketplace, or upload form does not accept WebP.","LogoViking provides separate JPG-to-WebP, PNG-to-WebP, WebP-to-JPG, and WebP-to-PNG pages so you can use the exact conversion you need."]}],faqs:[{question:"Is WebP better than JPG?",answer:"For many web uses, WebP can be more efficient. JPG is still useful for compatibility and simple photo workflows."},{question:"Can WebP have transparency?",answer:"Yes. WebP supports transparency, while standard JPG does not."}],related:["compress-images-for-web","gif-to-webm-guide","etsy-image-size-guide"]},
  { slug:"gif-to-webm-guide",title:"How to Convert GIF to WebM for a Faster Website",excerpt:"Why animated GIFs can be heavy, how WebM helps, and how to replace a GIF with a looping video.",category:"Designer Tools",readingTime:"6 min",updatedAt:"2026-08-14",sections:[{id:"why",title:"Why GIF files get so large",paragraphs:["Animated GIF is old and inefficient for many full-color animations. A short animation can become several megabytes, which can hurt loading speed on mobile connections.","Modern video formats such as WebM are designed for moving images and usually compress animation much more efficiently."]},{id:"embed",title:"Use video like a GIF",paragraphs:["A muted, looping, autoplaying video can behave much like an animated GIF on a web page. Add playsinline so mobile browsers keep the video inside the page.","LogoViking's GIF to WebM/MP4 tool includes an embed-code helper and frame extraction. For full encoding, the page also gives a free ffmpeg workflow."]}],faqs:[{question:"Does every browser support WebM?",answer:"Current major browsers have strong WebM support, but MP4 is still useful as a fallback for some workflows."},{question:"Will WebM improve page speed?",answer:"Replacing a very large GIF with a much smaller video can reduce transferred bytes and improve loading performance, although the exact result depends on the file and page."}],related:["compress-images-for-web","webp-vs-jpg-guide","youtube-thumbnail-secrets"]},
  { slug:"favicon-size-guide",title:"Favicon Size Guide: Create the Right Icons for Browsers and Devices",excerpt:"The practical favicon sizes to export, how to add them to HTML, and how to create them from one source image.",category:"Designer Tools",readingTime:"6 min",updatedAt:"2026-08-14",sections:[{id:"sizes",title:"Useful favicon sizes",paragraphs:["Common favicon exports include 16×16 and 32×32 for browser tabs, 180×180 for Apple touch icons, and larger 192×192 or 512×512 icons for web app manifests.","Start from a square source image with simple shapes and strong contrast. Tiny icons lose fine details quickly."]},{id:"html",title:"How to add a favicon",paragraphs:["Place the exported icons in your public web folder and reference them with link elements in the document head.","LogoViking's Favicon Generator creates the common PNG sizes and provides copy-ready HTML so you can add the files to a site without guessing the markup."]}],faqs:[{question:"Does a favicon need to be ICO?",answer:"No. Modern browsers support PNG and SVG favicons as well. ICO remains useful for legacy compatibility."},{question:"What is the best source image size?",answer:"Use a clean square source at 512×512 pixels or larger, then generate smaller variants from it."}],related:["webp-vs-jpg-guide","compress-images-for-web","beginner-seo-guide"]},
  { slug:"aspect-ratio-guide",title:"Aspect Ratio Guide for YouTube, Instagram, TikTok, and Websites",excerpt:"Understand 16:9, 9:16, 1:1, 4:5, and other ratios, then calculate missing dimensions without distortion.",category:"Designer Tools",readingTime:"7 min",updatedAt:"2026-08-14",sections:[{id:"basics",title:"What aspect ratio means",paragraphs:["Aspect ratio describes the relationship between width and height. A 16:9 image stays 16:9 whether it is 1280×720, 1920×1080, or another proportional size.","Keeping the ratio consistent prevents stretching when you resize images or video."]},{id:"platforms",title:"Common creator ratios",paragraphs:["16:9 is common for YouTube video and widescreen media. 9:16 is common for vertical Shorts, Reels, Stories, and TikTok. 1:1 is square. 4:5 is a popular portrait format for social feeds.","Use LogoViking's Aspect Ratio Calculator when you know one dimension and need the other, or when you want to identify the ratio of an existing width and height."]}],faqs:[{question:"What is 1920×1080?",answer:"1920×1080 is a 16:9 aspect ratio."},{question:"What ratio is vertical video?",answer:"9:16 is the most common full-screen vertical video ratio."}],related:["youtube-thumbnail-secrets","favicon-size-guide","compress-images-for-web"]},

];

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const faqGroups = [
  { title:"Getting Started", questions:[{q:"Do I need an account to use LogoViking?",a:"No. LogoViking currently focuses on free browser tools and does not require a user account."},{q:"Do I need to install anything?",a:"No. The public tools run in your browser. Some specialized tools may load a third-party library or service when you open them."},{q:"Are paid plans active?",a:"No. Paid plans and credit purchases are not live. The current focus is useful free tools and traffic growth."},{q:"Can I save preferences?",a:"Theme, favorites, and some local history can be stored on your own device using browser storage."}] },
  { title:"Tools", questions:[{q:"How many tools are available?",a:"LogoViking currently lists about 80 practical tools across image, designer, YouTube, TikTok, Instagram, Pinterest, SEO, and creator workflows."},{q:"Do image tools upload my files?",a:"Many image utilities process files directly in your browser. Tools that rely on a third-party service should identify that dependency on the tool page."},{q:"Which tools are best for website images?",a:"Start with Image Dimensions, Resize Image, Compress Image, the WebP converters, and Favicon Generator."},{q:"Do tools work on mobile?",a:"The interface is responsive, although some file-heavy editing workflows are easier on a desktop browser."},{q:"What is the All-in-One Creator Kit?",a:"It helps organize creator outputs such as titles, hashtags, thumbnail ideas, captions, keywords, and content ideas from one topic."}] },
  { title:"Pricing", questions:[{q:"Are LogoViking tools free?",a:"The core public tools are currently free to use."},{q:"Is Creator Pro available?",a:"No. A paid Creator Pro plan is not live today."},{q:"Can I buy credits?",a:"No. Credit purchases are not currently available."},{q:"Will paid features be added later?",a:"Possibly. Any paid feature will be clearly priced and backed by a real billing system before it is offered."}] },
  { title:"Privacy & Security", questions:[{q:"What data do you store?",a:"LogoViking can store local preferences, favorites, and local history in your browser. Google Analytics and Microsoft Clarity collect analytics data as described in the Privacy Policy."},{q:"Do you sell personal data?",a:"LogoViking states that it does not sell personal information."},{q:"Are uploads private?",a:"Many image tools process files locally in the browser. If a tool uses an external service, review the note on that tool before submitting sensitive files."},{q:"Do you use cookies?",a:"Analytics providers and browser preferences may use cookies or similar storage. See the Privacy and Cookie policies for details."}] },
];

// ─── Trust pages ──────────────────────────────────────────────────────────────
const trustPages: Record<string,{title:string;description:string;sections:{heading:string;paragraphs:string[]}[]}> = {
  about:{title:"About Us",description:"Why LogoViking exists and how we build practical creator, design, image, and SEO tools.",sections:[{heading:"What we build",paragraphs:["LogoViking is a practical browser-tool platform for creators, designers, website owners, marketers, and small teams. We focus on utilities that solve a clear task quickly: image conversion and optimization, creator sizing and planning, social content helpers, and SEO checks.","We intentionally avoid pretending every tool needs AI. When a task can be done locally in your browser, we prefer a fast browser-side workflow with fewer uploads and less friction."]},{heading:"Our approach",paragraphs:["Every public tool should have a clear purpose and a working result. We continually remove misleading or unfinished features and improve the tools people actually search for and use.","LogoViking is independent and continuously evolving. Search rankings, earnings, and platform performance are never guaranteed; our job is to provide useful tools and clear guidance."]}]},
  contact:{title:"Contact",description:"Reach the Logoviking team for support, partnerships, and business inquiries.",sections:[{heading:"How to reach us",paragraphs:["Use the contact form below for support, media requests, and affiliate questions.","We typically respond within 1–2 business days."]},{heading:"Business inquiries",paragraphs:["For sponsorships, licensing, and partnerships, include your company name and goals.","We keep things simple and professional."]}]},
  privacy:{title:"Privacy Policy",description:"How LogoViking handles local tool data, analytics, cookies, and support information.",sections:[{heading:"Information and local processing",paragraphs:["Many LogoViking image and utility tools process files directly in your browser. When a tool uses a third-party service, the interface should identify that dependency before you use it.","Browser preferences such as theme, favorites, or local history may be stored on your device using browser storage. Clearing site data in your browser removes locally stored information."]},{heading:"Analytics and session diagnostics",paragraphs:["We use Google Analytics 4 to understand page visits, traffic sources, and aggregate engagement, and Microsoft Clarity to understand usability through privacy-aware heatmaps and session diagnostics. These services may set cookies or collect technical information such as device, browser, approximate location, and interaction events according to their own terms.","We do not sell personal information. Analytics is used to improve the site, identify broken experiences, and understand which tools are useful."]},{heading:"Advertising and future monetization",paragraphs:["LogoViking may display advertising or affiliate links. When advertising is enabled, additional cookies or measurement technologies may be used as described by the relevant provider and applicable consent requirements.","Do not enter passwords, payment-card details, API keys, or confidential information into public text generators or support messages."]}]},
  terms:{title:"Terms of Service",description:"Terms for using LogoViking tools, content, calculators, and optional paid features.",sections:[{heading:"Acceptable use",paragraphs:["Use LogoViking lawfully and do not attempt to disrupt the service, bypass security controls, abuse third-party services, or use tools to infringe the rights of others.","You are responsible for reviewing generated text, calculations, downloaded files, and metadata before publishing or relying on them."]},{heading:"Tool availability",paragraphs:["Free tools may change, be improved, or be removed as browser support and third-party services change. We do not guarantee uninterrupted availability or a specific search, revenue, or social-media outcome.","When a tool depends on an external service, that service may have its own limits and terms."]},{heading:"Paid features",paragraphs:["If paid plans or credits are offered, the checkout page will show the price and billing terms before purchase. Refund and cancellation rights are governed by the checkout terms and applicable law.","Nothing on LogoViking is professional legal, tax, financial, or medical advice."]}]},
  disclaimer:{title:"Disclaimer",description:"Important output guidance and responsibility notes.",sections:[{heading:"Output quality",paragraphs:["Generated content is a starting point — always review before publishing.","We don't guarantee rankings, earnings, or platform growth."]},{heading:"Creative responsibility",paragraphs:["You're responsible for verifying accuracy and ownership of published content.","Always review sensitive or regulated claims."]}]},
  cookies:{title:"Cookie Policy",description:"How Logoviking uses cookies and browser storage.",sections:[{heading:"Why cookies help",paragraphs:["Cookies keep you signed in, save dark mode, and remember favorites.","They also support analytics and premium preferences."]},{heading:"Your controls",paragraphs:["You can clear browser storage at any time.","Disabling cookies limits some personalization features."]}]},
  "affiliate-disclosure":{title:"Affiliate Disclosure",description:"How affiliate links and partner placements appear on Logoviking.",sections:[{heading:"How partnerships work",paragraphs:["Some content may include affiliate links or sponsor placements.","This helps support free access and keeps the toolkit growing."]},{heading:"Editorial integrity",paragraphs:["Affiliate relationships don't change our core recommendations.","We aim to keep every recommendation genuinely useful."]}]},
  dmca:{title:"DMCA",description:"Submit a copyright or takedown request.",sections:[{heading:"Submit a notice",paragraphs:["Include the URL, your rights claim, and contact information.","A complete request helps us review quickly."]},{heading:"How we respond",paragraphs:["We review takedown requests in good faith.","We'll reach out if more information is needed."]}]},
};

const pricingPlans = [
  { name:"Free",        price:"$0",  period:"forever", description:"Perfect for discovering tools and light usage.", badge:"",          features:["5 daily uses (guest), 25 (free account)","Access to all 80+ tools","Save history & favorites","Basic outputs","Ads visible"],                                      featured:false },
  { name:"Creator Pro", price:"$19", period:"/month",   description:"For creators who publish regularly and need more.",badge:"Most popular",features:["Unlimited usage","No ads","Batch processing","Saved projects","Priority tools","All platforms"],                                                        featured:true  },
  { name:"Business",    price:"$49", period:"/month",   description:"For teams, agencies, and high-volume creators.", badge:"",          features:["Everything in Creator Pro","Team-ready workflow","Higher batch limits","Analytics-ready exports","Priority support","Custom usage reports"],               featured:false },
];

// navLinks kept as slugs for reference only — nav uses t() keys now
const _navLinks = [["Home","/"],["Tools","/tools"],["Categories","/categories"],["Blog","/blog"],["Pricing","/pricing"],["FAQ","/faq"]];
void _navLinks;
const trustLinks = [["About","/about"],["Contact","/contact"],["Privacy","/privacy"],["Terms","/terms"],["Disclaimer","/disclaimer"],["Cookies","/cookies"],["Affiliate","/affiliate-disclosure"],["DMCA","/dmca"]];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanText(s:string){return s.replace(/\s+/g," ").trim()}
function isSpammy(s:string){return (s.match(/https?:\/\//gi)??[]).length>3||/(.)\1{12,}/.test(s)}
function getDailyKey(){return new Date().toISOString().slice(0,10)}
function safeFullUrl(p="/"){
  const pathOnly=new URL(p,siteDomain).pathname;
  return new URL(pathOnly,siteDomain).toString();
}
function scrollTop(){if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"smooth"})}
function getToolBySlug(slug?:string){return tools.find(t=>t.slug===slug)}
function getBlogBySlug(slug?:string){return blogPosts.find(b=>b.slug===slug)}
function filterUnique<T>(a:T[]){return Array.from(new Set(a))}


// ─── Local storage hook ───────────────────────────────────────────────────────
function useLocalStorage<T>(key:string,def:T){
  const [val,setVal]=useState<T>(()=>{
    if(typeof window==="undefined")return def;
    try{const r=window.localStorage.getItem(key);return r?(JSON.parse(r) as T):def}catch{return def}
  });
  useEffect(()=>{try{window.localStorage.setItem(key,JSON.stringify(val))}catch{}},[key,val]);
  return[val,setVal]as const;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const SiteContext=createContext<SiteContextValue|null>(null);
function useSite(){const c=useContext(SiteContext);if(!c)throw new Error("useSite");return c}

function SiteProvider({children}:{children:ReactNode}){
  const prefersDark=typeof window!=="undefined"&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  const[theme,setTheme]=useLocalStorage<Theme>("lv-theme",prefersDark?"dark":"light");
  const[colorTheme,setColorTheme]=useLocalStorage<ColorTheme>("lv-color-theme","amber");
  const[lang,setLang]=useLocalStorage<LangCode>("lv-lang","en");
  const[account,setAccount]=useLocalStorage<Account>("lv-account",{name:"Guest",email:"",tier:"guest",provider:"guest",authenticated:false});
  const[favorites,setFavorites]=useLocalStorage<string[]>("lv-favs",[]);
  const[projects,setProjects]=useLocalStorage<Project[]>("lv-projects",[]);
  const[usage,setUsage]=useLocalStorage<{date:string;count:number;history:HistoryEntry[]}>("lv-usage",{date:getDailyKey(),count:0,history:[]});
  const[aiProvider,setAiProvider]=useLocalStorage<AIProvider>("lv-ai-provider","anthropic");
  // ── Purchased credits (never expire, used after daily limit) ──
  const[credits,setCredits]=useLocalStorage<number>("lv-credits",0);
  const addCredits=(n:number)=>setCredits(c=>c+n);

  const isRTL=languages.find(l=>l.code===lang)?.rtl??false;

  useEffect(()=>{document.documentElement.classList.toggle("dark",theme==="dark")},[theme]);
  useEffect(()=>{if(usage.date!==getDailyKey())setUsage({date:getDailyKey(),count:0,history:[]})},[usage.date,setUsage]);
  useEffect(()=>{
    const t=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
    document.documentElement.style.setProperty("--color-primary",t.color);
  },[colorTheme]);
  useEffect(()=>{
    document.documentElement.setAttribute("dir",isRTL?"rtl":"ltr");
    document.documentElement.setAttribute("lang",lang);
  },[lang,isRTL]);

  const t=(key:string)=>translate(lang,key);

  const toggleFavorite=(slug:string)=>setFavorites(f=>f.includes(slug)?f.filter(x=>x!==slug):[slug,...f]);

  // Usage logic: free daily limit first → purchased credits fallback → block
  const recordToolUse=(slug:string,query:string)=>{
    const limit=TOOL_LIMITS[account.tier];
    if(account.tier==="premium"){
      // Premium: unlimited, still log history
      const h:HistoryEntry[]=[{id:`${slug}-${Date.now()}`,slug,query:cleanText(query),createdAt:new Date().toISOString()},...usage.history].slice(0,120);
      setUsage(u=>({...u,count:u.count+1,history:h}));
      return{allowed:true,remaining:Infinity,limit,usedCredit:false};
    }
    if(usage.count<limit){
      // Within free daily limit
      const h:HistoryEntry[]=[{id:`${slug}-${Date.now()}`,slug,query:cleanText(query),createdAt:new Date().toISOString()},...usage.history].slice(0,120);
      setUsage({date:getDailyKey(),count:usage.count+1,history:h});
      return{allowed:true,remaining:Math.max(0,limit-(usage.count+1)),limit,usedCredit:false};
    }
    // Daily limit hit — try purchased credits
    if(credits>0){
      setCredits(c=>Math.max(0,c-1));
      const h:HistoryEntry[]=[{id:`${slug}-${Date.now()}`,slug,query:cleanText(query),createdAt:new Date().toISOString()},...usage.history].slice(0,120);
      setUsage(u=>({...u,history:h}));
      return{allowed:true,remaining:credits-1,limit,usedCredit:true};
    }
    return{allowed:false,remaining:0,limit,usedCredit:false};
  };

  const clearHistory=()=>setUsage({date:getDailyKey(),count:0,history:[]});
  const saveProject=(p:Project)=>setProjects(ps=>[p,...ps.filter(x=>x.id!==p.id)].slice(0,30));
  const deleteProject=(id:string)=>setProjects(ps=>ps.filter(p=>p.id!==id));

  return<SiteContext.Provider value={{theme,setTheme,colorTheme,setColorTheme,lang,setLang,t,isRTL,account,setAccount,credits,addCredits,favorites,toggleFavorite,history:usage.history,recordToolUse,clearHistory,projects,saveProject,deleteProject,aiProvider,setAiProvider}}>{children}</SiteContext.Provider>;
}

// ─── SEO Manager ──────────────────────────────────────────────────────────────
function SeoHead({title,description,canonical,noIndex,schema}:{title:string;description:string;canonical?:string;noIndex?:boolean;schema?:object}){
  const loc=useLocation();
  useEffect(()=>{
    const full=title.includes(siteName)?title:`${title} | ${siteName}`;
    document.title=full;
    const set=(sel:string,attr:"name"|"property",val:string)=>{
      let el=document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${sel}"]`);
      if(!el){el=document.createElement("meta");el.setAttribute(attr,sel);document.head.appendChild(el)}
      el.setAttribute("content",val);
    };
    const lnk=(rel:string,href:string)=>{
      let el=document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if(!el){el=document.createElement("link");el.setAttribute("rel",rel);document.head.appendChild(el)}
      el.setAttribute("href",href);
    };
    const url=safeFullUrl(canonical??loc.pathname);
    const ogImg=`${siteDomain}/og-image.png`;
    set("description","name",description);
    set("robots","name",noIndex?"noindex,nofollow":"index,follow");
    set("googlebot","name",noIndex?"noindex,nofollow":"index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1");
    set("bingbot","name",noIndex?"noindex,nofollow":"index,follow");
    set("og:title","property",full);
    set("og:description","property",description);
    set("og:url","property",url);
    set("og:image","property",ogImg);
    set("og:type","property","website");
    set("og:site_name","property",siteName);
    set("twitter:title","name",full);
    set("twitter:description","name",description);
    set("twitter:card","name","summary_large_image");
    set("twitter:image","name",ogImg);
    lnk("canonical",url);
    // JSON-LD schema
    const schemaId="lv-jsonld";
    let existing=document.head.querySelector(`#${schemaId}`);
    if(!existing){existing=document.createElement("script");existing.setAttribute("type","application/ld+json");existing.id=schemaId;document.head.appendChild(existing)}
    const defaultSchema={"@context":"https://schema.org","@type":"WebSite","name":siteName,"url":siteDomain,"description":description};
    existing.textContent=JSON.stringify(schema??defaultSchema);
  },[title,description,canonical,loc.pathname,noIndex,schema]);
  return null;
}

// ─── App shell ────────────────────────────────────────────────────────────────
export default function App(){
  return<SiteProvider><Shell/></SiteProvider>;
}

function Shell(){
  const loc=useLocation();
  const[menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>setMenuOpen(false),[loc.pathname]);
  useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"})},[loc.pathname]);
  // Lock body scroll when the mobile drawer is open
  useEffect(()=>{
    if(menuOpen){
      const prev=document.body.style.overflow;
      document.body.style.overflow="hidden";
      return()=>{document.body.style.overflow=prev;};
    }
  },[menuOpen]);
  return(
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>
      <main className="min-h-[70vh]">
        <Routes>
          <Route path="/"                element={<HomePage/>}/>
          <Route path="/tools"           element={<ToolsPage/>}/>
          <Route path="/tools/:slug"     element={<ToolPage/>}/>
          <Route path="/categories"      element={<CategoriesPage/>}/>
          <Route path="/categories/:slug"element={<CategoryPage/>}/>
          <Route path="/blog"            element={<BlogIndex/>}/>
          <Route path="/blog/:slug"      element={<BlogPostPage/>}/>
          <Route path="/faq"             element={<FaqPage/>}/>
          <Route path="/pricing"         element={<PricingPage/>}/>
          <Route path="/credits"         element={<CreditStorePage/>}/>
          <Route path="/subscription"    element={<Navigate to="/pricing" replace/>}/>
          <Route path="/dashboard"       element={<Dashboard/>}/>
          <Route path="/account"         element={<AccountPage/>}/>
          <Route path="/settings"        element={<AccountPage/>}/>
          <Route path="/auth/:mode"      element={<AuthPage/>}/>
          <Route path="/:page"           element={<TrustPage/>}/>
          <Route path="*"                element={<NotFound/>}/>
        </Routes>
      </main>
      <Footer/>
      <BackToTop/>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({menuOpen,setMenuOpen}:{menuOpen:boolean;setMenuOpen:(v:boolean)=>void}){
  const{theme,setTheme,colorTheme,setColorTheme,lang,setLang,t,account}=useSite();
  const nav=useNavigate();
  const loc=useLocation();
  const[q,setQ]=useState("");
  const[themeOpen,setThemeOpen]=useState(false);
  const[langOpen,setLangOpen]=useState(false);

  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const currentLang=languages.find(l=>l.code===lang)??languages[0];
  useEffect(()=>{const p=new URLSearchParams(loc.search);setQ(p.get("q")??"");},[loc.search]);
  // NOTE: No document click-outside listener — modals have their own backdrop
  // that handles clicking outside. Adding a document listener caused mobile
  // scroll-touches to be treated as "outside" clicks and close the modal.
  // Close on Escape
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){setThemeOpen(false);setLangOpen(false);}};
    document.addEventListener("keydown",onKey);
    return()=>document.removeEventListener("keydown",onKey);
  },[]);
  // Lock body scroll whenever a modal is open (any device — prevents background scroll)
  useEffect(()=>{
    if(themeOpen||langOpen){
      const prev=document.body.style.overflow;
      document.body.style.overflow="hidden";
      return()=>{document.body.style.overflow=prev;};
    }
  },[themeOpen,langOpen]);

  return(
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
        {/* Logo — premium LogoViking brand mark */}
        <Link to="/" className="group flex shrink-0 items-center gap-2" aria-label="Logoviking — home">
          <span className="relative flex h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-full overflow-hidden bg-gray-950 ring-1 ring-amber-700/40 group-hover:ring-amber-500/60 transition-all">
            <img
              src="/images/logoviking-main-logo.png"
              alt="LogoViking"
              className="h-full w-full object-cover scale-[1.08] transition-transform group-hover:scale-[1.15]"
              loading="eager"
            />
          </span>
          <div className="flex flex-col leading-none">
            <p className="font-black tracking-tight text-base sm:text-lg lg:text-xl">
              <span style={{color:ct.color}}>Logo</span>
              <span className="text-gray-900 dark:text-white">Viking</span>
            </p>
            <p className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.18em] sm:block" style={{color:ct.accent}}>
              Creator Toolkit
            </p>
          </div>
        </Link>

        {/* Nav (desktop only) */}
        <nav className="hidden items-center gap-1 lg:flex ml-2">
          {([["nav.home","/"],["nav.tools","/tools"],["nav.categories","/categories"],["nav.blog","/blog"],["nav.pricing","/pricing"],["nav.faq","/faq"]] as [string,string][]).map(([key,h])=>(
            <Link key={h} to={h} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors",loc.pathname===h?"text-white":"text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white")} style={loc.pathname===h?{background:ct.color}:{}}>{t(key)}</Link>
          ))}
        </nav>

        {/* Search (tablet/desktop only) */}
        <form onSubmit={e=>{e.preventDefault();nav(`/tools?q=${encodeURIComponent(q.trim())}`)}} className="ml-auto hidden min-w-0 flex-1 max-w-xs items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60 md:flex">
          <Search className="h-4 w-4 shrink-0 text-gray-400"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t("label.search")} className="min-w-0 w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 dark:text-white"/>
        </form>

        {/* Actions — push to right on mobile when search is hidden */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-0">
          {/* 5-color theme picker */}
          <div className="relative">
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation();setLangOpen(false);setThemeOpen(v=>!v);}}
              className="flex h-9 min-w-[36px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 sm:px-2.5"
              aria-label="Choose color theme"
              aria-expanded={themeOpen}
              title="Choose theme color"
            >
              <span className="h-4 w-4 rounded-full shadow-sm ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800" style={{background:ct.color}}/>
              <span className="hidden text-xs font-semibold text-gray-600 dark:text-gray-300 sm:block">{ct.label}</span>
            </button>
          </div>

          {/* Language picker — button only; modal is rendered at root */}
          <div>
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation();setThemeOpen(false);setLangOpen(v=>!v);}}
              className="flex h-9 min-w-[36px] items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 sm:gap-1.5 sm:px-2.5"
              aria-label="Select language"
              aria-expanded={langOpen}
              title={t("label.language")}
            >
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span className="hidden text-xs font-semibold text-gray-600 dark:text-gray-300 sm:block">{currentLang.code.toUpperCase()}</span>
            </button>
          </div>

          {/* ─── Centered modal: Theme picker (portaled to body) ─────────── */}
          {typeof document!=="undefined"&&createPortal(
          <AnimatePresence>
            {themeOpen&&(
              <motion.div
                key="theme-modal"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:0.15}}
                // Only close if the press started AND ended on the backdrop itself
                // (prevents accidental close when scrolling/dragging inside the modal).
                onPointerDown={(e)=>{(e.currentTarget as HTMLDivElement).dataset.startedOnBackdrop=(e.target===e.currentTarget)?"true":"false";}}
                onClick={(e)=>{if(e.target===e.currentTarget&&(e.currentTarget as HTMLDivElement).dataset.startedOnBackdrop==="true")setThemeOpen(false);}}
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
                role="dialog" aria-modal="true" aria-label={t("label.themeColor")}
              >
                <motion.div
                  initial={{opacity:0,scale:0.92,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92,y:10}}
                  transition={{type:"spring",stiffness:320,damping:28}}
                  onClick={(e)=>e.stopPropagation()}
                  onPointerDown={(e)=>e.stopPropagation()}
                  className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <span className="h-5 w-5 rounded-full shadow" style={{background:ct.color}}/>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{t("label.themeColor")}</p>
                    </div>
                    <button type="button" onClick={()=>setThemeOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close"><X size={18}/></button>
                  </div>
                  <div className="p-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("label.themeColor")}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {colorThemes.map(c=>(
                        <button
                          key={c.id}
                          type="button"
                          onClick={()=>{setColorTheme(c.id);setThemeOpen(false);}}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all active:scale-95",
                            colorTheme===c.id?"bg-gray-100 dark:bg-gray-800":"hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                          title={c.label}
                          aria-label={c.label}
                        >
                          <span className={cn("h-8 w-8 rounded-full shadow",colorTheme===c.id?"ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900":"")} style={{background:c.color}}/>
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{c.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("label.mode")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={()=>setTheme("light")} className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95",theme==="light"?"text-white":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300")} style={theme==="light"?{background:ct.color}:{}}>
                          <Sun size={15}/> {t("label.light")}
                        </button>
                        <button type="button" onClick={()=>setTheme("dark")} className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95",theme==="dark"?"text-white":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300")} style={theme==="dark"?{background:ct.color}:{}}>
                          <Moon size={15}/> {t("label.dark")}
                        </button>
                      </div>
                    </div>

                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body)}

          {/* ─── Centered modal: Language picker (portaled to body) ──────── */}
          {typeof document!=="undefined"&&createPortal(
          <AnimatePresence>
            {langOpen&&(
              <motion.div
                key="lang-modal"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                transition={{duration:0.15}}
                // Only close if the press started AND ended on the backdrop itself
                onPointerDown={(e)=>{(e.currentTarget as HTMLDivElement).dataset.startedOnBackdrop=(e.target===e.currentTarget)?"true":"false";}}
                onClick={(e)=>{if(e.target===e.currentTarget&&(e.currentTarget as HTMLDivElement).dataset.startedOnBackdrop==="true")setLangOpen(false);}}
                className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
                role="dialog" aria-modal="true" aria-label={t("label.language")}
              >
                <motion.div
                  initial={{opacity:0,scale:0.92,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92,y:10}}
                  transition={{type:"spring",stiffness:320,damping:28}}
                  onClick={(e)=>e.stopPropagation()}
                  onPointerDown={(e)=>e.stopPropagation()}
                  className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                  style={{maxHeight:"min(85vh, 640px)"}}
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{currentLang.flag}</span>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{t("label.language")}</p>
                    </div>
                    <button type="button" onClick={()=>setLangOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close"><X size={18}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain p-2" style={{WebkitOverflowScrolling:"touch",touchAction:"pan-y"}}>
                    <div className="space-y-0.5">
                      {languages.map(l=>(
                        <button
                          key={l.code}
                          type="button"
                          onClick={()=>{setLang(l.code);setLangOpen(false);}}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.98]",
                            lang===l.code?"text-white":"text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                          )}
                          style={lang===l.code?{background:ct.color}:{}}
                        >
                          <span className="shrink-0 text-xl leading-none">{l.flag}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold leading-tight">{l.native}</p>
                            <p className={cn("truncate text-xs leading-tight",lang===l.code?"text-white/75":"text-gray-400")}>{l.label}</p>
                          </div>
                          {lang===l.code&&<Check size={16} className="shrink-0"/>}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body)}

          <Link to="/tools" className="hidden items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-white shadow-sm sm:flex" style={{background:ct.color}}>
            <Grid3X3 size={15}/> <span className="hidden md:inline">All Tools</span>
          </Link>
          <button type="button" onClick={()=>setMenuOpen(!menuOpen)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 lg:hidden" aria-label="Menu" aria-expanded={menuOpen}>
            {menuOpen?<X size={18}/>:<Menu size={18}/>}
          </button>
        </div>
      </div>

      {/* Category rail */}
      <div className="border-t border-gray-100 dark:border-gray-800/60">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 [&::-webkit-scrollbar]:hidden">
          <Link to="/tools" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            <LayoutGrid size={13}/> {t("nav.all")}
          </Link>
          {categories.map(c=>{const Icon=c.icon;return(
            <Link key={c.slug} to={`/categories/${c.slug}`} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white">
              <Icon size={13}/>{c.name}
            </Link>
          )})}
        </div>
      </div>
    </header>
  );
}

function MobileMenu({menuOpen,setMenuOpen}:{menuOpen:boolean;setMenuOpen:(v:boolean)=>void}){
  const{account,t,lang,setLang,colorTheme}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const navKeys:[string,string][]=[["nav.home","/"],["nav.tools","/tools"],["nav.categories","/categories"],["nav.blog","/blog"],["nav.pricing","/pricing"],["nav.faq","/faq"],["nav.dashboard","/dashboard"]];
  return(
    <AnimatePresence>
      {menuOpen&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 lg:hidden" onClick={()=>setMenuOpen(false)}>
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"/>
          <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring",stiffness:300,damping:30}} className="absolute right-0 top-0 flex h-full w-[min(85vw,320px)] flex-col overflow-y-auto overscroll-contain bg-white shadow-2xl dark:bg-gray-900" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <p className="font-bold text-gray-900 dark:text-white">{t("label.menu")}</p>
              <button onClick={()=>setMenuOpen(false)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18}/></button>
            </div>
            <nav className="p-4 space-y-1">
              {navKeys.map(([key,h])=>(
                <Link key={h} to={h} className="flex items-center rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">{t(key)}</Link>
              ))}
            </nav>
            {/* Language switcher in mobile */}
            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800">
              <p className="pt-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("label.language")}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {languages.map(l=>(
                  <button key={l.code} onClick={()=>setLang(l.code)} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",lang===l.code?"text-white":"text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800")} style={lang===l.code?{background:ct.color}:{}}>
                    <span>{l.flag}</span>
                    <span className="text-xs">{l.native}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800 mt-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Free toolkit</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">No account required</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Open a tool and start using it.</p>
                <Link to="/tools" className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white" style={{background:ct.color}}>
                  <Grid3X3 size={15}/> Explore all tools
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function Breadcrumb({items}:{items:{label:string;href?:string}[]}){
  const nav=useNavigate();
  const{t}=useSite();
  return(
    <div className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
      <button onClick={()=>window.history.length>1?nav(-1):nav("/")} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
        <ArrowLeft size={13}/> {t("btn.back")}
      </button>
      {items.map((item,i)=>(
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={13} className="text-gray-300 dark:text-gray-600"/>
          {item.href?<Link to={item.href} className="hover:text-gray-900 dark:hover:text-white">{item.label}</Link>:<span className="font-medium text-gray-700 dark:text-gray-200">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

function PageWrap({children,className}:{children:ReactNode;className?:string}){
  return<div className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12",className)}>{children}</div>;
}

function SectionTitle({eyebrow,title,subtitle,center}:{eyebrow?:string;title:string;subtitle?:string;center?:boolean}){
  return(
    <div className={cn("max-w-2xl space-y-2",center&&"mx-auto text-center")}>
      {eyebrow&&<p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">{eyebrow}</p>}
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{title}</h2>
      {subtitle&&<p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">{subtitle}</p>}
    </div>
  );
}

function Badge({children,variant="gray"}:{children:ReactNode;variant?:"gray"|"violet"|"emerald"|"rose"|"amber"}){
  const styles={gray:"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",violet:"bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",emerald:"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",rose:"bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",amber:"bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"};
  return<span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",styles[variant])}>{children}</span>;
}

function AdSlot({placement}:{placement:string}){
  const{account}=useSite();
  if(account.tier==="premium")return null;
  return(
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-4 text-center dark:border-gray-700 dark:bg-gray-900/60">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Advertisement · {placement}</p>
      <div className="mt-2 h-16 rounded-xl bg-gray-50 dark:bg-gray-800/60"/>
    </div>
  );
}

// ─── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({tool}:{tool:Tool}){
  const{favorites,toggleFavorite}=useSite();
  const meta=categoryMeta[tool.category];
  const Icon=meta.icon;
  const isFav=favorites.includes(tool.slug);
  return(
    <motion.div whileHover={{y:-3}} transition={{type:"spring",stiffness:300,damping:25}} className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",meta.gradient)}>
          <Icon size={18}/>
        </div>
        <div className="flex items-center gap-1.5">
          {tool.isNew&&<Badge variant="emerald">{useSite().t("label.new")}</Badge>}
          {tool.isPremium&&<Badge variant="amber">{useSite().t("label.pro")}</Badge>}
          {tool.featured&&<Badge variant="violet">{useSite().t("label.featured")}</Badge>}
          <button onClick={()=>toggleFavorite(tool.slug)} className={cn("rounded-lg p-1.5 transition-colors",isFav?"text-violet-600 dark:text-violet-400":"text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400")} aria-label="Favorite">
            <Bookmark size={15} fill={isFav?"currentColor":"none"}/>
          </button>
        </div>
      </div>
      <div className="mt-3 flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white">{tool.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">{tool.description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">{meta.name}</span>
        <Link to={`/tools/${tool.slug}`} className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
          {useSite().t("btn.openTool")} <ArrowRight size={13}/>
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Credit Pack Buy Modal ────────────────────────────────────────────────────
function BuyCreditsModal({onClose}:{onClose:()=>void;highlight?:string}){
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.6)"}} onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Optional paid features</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Not available yet</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X size={18}/></button>
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">LogoViking is focused on making its core creator, image, design, and SEO utilities useful and free. Credit purchases and paid AI plans are not currently for sale.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/tools" onClick={onClose} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Browse free tools</Link>
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Special tool handlers ────────────────────────────────────────────────────
// ─── Workbench ────────────────────────────────────────────────────────────────
function Workbench({tool}:{tool:Tool}){
  const{account,credits,recordToolUse,saveProject,aiProvider,setAiProvider}=useSite();
  const[input,setInput]=useState("Creator growth, SEO, and launch-ready content");
  const[imageName,setImageName]=useState("");
  const[preview,setPreview]=useState<string|null>(null);
  const[err,setErr]=useState("");
  const[result,setResult]=useState<AIToolResult|null>(null);
  const[generating,setGenerating]=useState(false);
  const[remaining,setRemaining]=useState<number|null>(null);
  const[usedCredit,setUsedCredit]=useState(false);
  const[showBuyModal,setShowBuyModal]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{return()=>{if(preview)URL.revokeObjectURL(preview)}},[preview]);

  const limit=TOOL_LIMITS[account.tier];
  const allowImage=tool.category==="image"||tool.slug==="all-in-one-creator-kit";
  const activeProvider=getActiveProvider();

  // Compute remaining uses before any call
  const currentUsed=Number(typeof window!=="undefined"?JSON.parse(window.localStorage.getItem("lv-usage")||'{"count":0}').count:0);
  const freeUsesLeft=remaining!==null&&!usedCredit?remaining:Math.max(0,limit-currentUsed);
  const hasCredits=credits>0;
  const usesLeftLabel=account.tier==="premium"?"Unlimited"
    :freeUsesLeft>0?`${freeUsesLeft} of ${limit} free uses today`
    :hasCredits?`${credits} credit${credits===1?"":"s"} remaining`
    :"Limit reached";
  const usesPercent=account.tier==="premium"?100:Math.min(100,Math.round((currentUsed/limit)*100));

  const onFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;
    setImageName(f.name);
    if(preview)URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const run=async(e:React.FormEvent)=>{
    e.preventDefault();
    const norm=cleanText(input);
    if(!norm&&!imageName){setErr("Add a topic or upload an image.");return}
    if(norm.length>800||isSpammy(norm)){setErr("Keep input concise and spam-free.");return}
    // Check limit BEFORE calling AI
    const u=recordToolUse(tool.slug,norm||imageName);
    if(!u.allowed){
      setErr("");
      setRemaining(0);
      return;
    }
    setRemaining(u.remaining);
    setUsedCredit(u.usedCredit);
    setErr("");setGenerating(true);
    try{
      const r=await runAITool(tool,norm||imageName,aiProvider,imageName?{File:imageName}:undefined);
      setResult(r);
    }catch(e:unknown){
      const msg=e instanceof Error?e.message:"AI error";
      setErr(`Generation failed: ${msg}. Please try again.`);
    }finally{setGenerating(false);}
  };

  const suspenseFallback=(label:string)=>(
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <RefreshCw size={20} className="mx-auto mb-3 animate-spin text-violet-400"/>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">Loading {label}…</p>
      <p className="mt-1 text-xs text-gray-400">Preparing the AI tool</p>
    </div>
  );

  if(tool.slug==="background-remover"){
    return(<Suspense fallback={suspenseFallback("Background Remover")}><BackgroundRemoverTool/></Suspense>);
  }


  // ── Built-in functional tools (no AI, no daily limit) ──
  const BuiltInTool = toolComponents[tool.slug];
  if (BuiltInTool) return <BuiltInTool />;

  // ── Daily limit + credits exhausted — show buy CTA ──
  const isLimitReached=(remaining===0)&&!usedCredit&&(limit!==Infinity&&currentUsed>=limit)&&credits===0;

  return(
    <>
    {showBuyModal&&<BuyCreditsModal onClose={()=>setShowBuyModal(false)}/>}
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Input panel */}
      <form onSubmit={run} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Input</p>
            <h3 className="mt-0.5 font-semibold text-gray-900 dark:text-white">{tool.name}</h3>
          </div>
          {/* Usage counter / credit badge */}
          <div className="flex flex-col items-end gap-1">
            <span className={cn("text-xs font-semibold",isLimitReached?"text-rose-500 dark:text-rose-400":usedCredit?"text-amber-500 dark:text-amber-400":"text-gray-500 dark:text-gray-400")}>{usesLeftLabel}</span>
            {account.tier!=="premium"&&(
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className={cn("h-full rounded-full transition-all",usesPercent>=100?"bg-rose-500":usesPercent>=70?"bg-amber-400":"bg-emerald-500")} style={{width:`${usesPercent}%`}}/>
              </div>
            )}
          </div>
        </div>

        {/* Limit reached — buy credits or upgrade */}
        {isLimitReached?(
          <div className="space-y-3">
            <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-4 text-center dark:border-amber-800 dark:bg-amber-950/20">
              <Zap size={22} className="mx-auto mb-2 text-amber-500"/>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Daily free limit reached</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">You've used all {limit} free generations today. Resets at midnight.</p>
            </div>
            {/* Option 1: Buy credits */}
            <button type="button" onClick={()=>setShowBuyModal(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:from-violet-700 hover:to-fuchsia-700">
              <Zap size={15}/> Buy credits — keep generating now
            </button>
            <div className="grid grid-cols-3 gap-1.5">
              {CREDIT_PACKS.map(p=>(
                <button key={p.id} type="button" onClick={()=>setShowBuyModal(true)} className="rounded-xl border border-gray-200 bg-white p-2 text-center hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{p.credits} credits</p>
                  <p className="text-[10px] text-violet-600 dark:text-violet-400">${p.price}</p>
                </button>
              ))}
            </div>
            {/* Option 2: upgrade */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-gray-100 dark:border-gray-800"/>
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-100 dark:border-gray-800"/>
            </div>
            {account.tier==="guest"?(
              <p className="rounded-xl border border-gray-200 px-3 py-2.5 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">The free daily limit resets automatically. No purchase is required.</p>
            ):(
              <Link to="/tools" className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"><Grid3X3 size={14}/> Try another free tool</Link>
            )}
          </div>
        ):(
          <>
            {/* AI provider badge */}
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
              <div className={cn("h-2 w-2 rounded-full",activeProvider.isFree?"bg-emerald-400":"bg-violet-500")}/>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Powered by <strong className="text-gray-700 dark:text-gray-200">{activeProvider.name}</strong>
                {activeProvider.isFree&&<span className="ml-1 text-emerald-600 dark:text-emerald-400">· Free</span>}
              </span>
            </div>

            {/* Default input */}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Topic or query
              <textarea value={input} onChange={e=>setInput(e.target.value)} rows={4} placeholder={`Enter a topic for ${tool.name.toLowerCase()}…`} className="mt-1.5 block w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/>
            </label>

            {/* Upload */}
            {allowImage&&(
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Upload image <span className="text-gray-400">(optional)</span></p>
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-3 dark:border-gray-700">
                  <button type="button" onClick={()=>fileRef.current?.click()} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                    <ImageIcon size={14}/> Browse
                  </button>
                  <p className="text-xs text-gray-400">{imageName||"PNG, JPG, WebP up to 20MB"}</p>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden"/>
                </div>
                {preview&&<img src={preview} alt="Preview" className="mt-2 h-24 w-full rounded-xl object-cover"/>}
              </div>
            )}

            {err&&<p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{err}</p>}

            <div className="flex flex-wrap items-center gap-2.5">
              <button type="submit" disabled={generating} className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all bg-violet-600 hover:bg-violet-700 shadow-violet-500/20",generating&&"opacity-75 cursor-not-allowed")}>
                {generating?<RefreshCw size={15} className="animate-spin"/>:<WandSparkles size={15}/>}
                {generating?"Generating…":"Generate"}
              </button>
              {account.tier==="premium"&&(
                <button type="button" onClick={()=>saveProject({id:`${tool.slug}-${Date.now()}`,slug:tool.slug,title:`${tool.name} — ${(input||"project").slice(0,32)}`,summary:result?.headline??"",createdAt:new Date().toISOString()})} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                  <Plus size={14}/> Save
                </button>
              )}

            </div>
          </>
        )}
      </form>

      {/* Output panel */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 min-h-[200px]">
          {generating&&(
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="relative">
                <RefreshCw size={24} className="animate-spin text-violet-400"/>
                {activeProvider.isFree&&<span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-gray-900"/>}
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">AI is generating your content…</p>
              <p className="text-xs text-gray-400">
                {activeProvider.isFree?"Free AI · Usually 3–8 seconds":"Usually 2–5 seconds"}
              </p>
            </div>
          )}
          {!generating&&!result&&(
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Sparkles size={22} className="text-gray-300 dark:text-gray-600"/>
              <p className="text-sm font-medium text-gray-400">Enter a topic and click Generate</p>
              <p className="text-xs text-gray-400">
                {activeProvider.isFree
                  ?"🆓 Powered by Pollinations AI — free for everyone"
                  :`Powered by ${activeProvider.name}`
                }
              </p>
            </div>
          )}
          {!generating&&result&&(
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Output</p>
                  <h4 className="mt-0.5 font-semibold text-gray-900 dark:text-white">{result.headline}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="gray">{result.score}</Badge>
                  {activeProvider.isFree&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">🆓 Free AI</span>}
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{result.summary}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {result.blocks.map(block=>(
                  <div key={block.label} className="rounded-xl bg-gray-50 p-3.5 dark:bg-gray-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{block.label}</p>
                      <button
                        type="button"
                        onClick={()=>navigator.clipboard.writeText(block.items.join("\n"))}
                        className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Copy this section"
                      >
                        <Copy size={11}/>
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {block.items.map((item,i)=>(
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Check size={12} className="mt-0.5 shrink-0 text-emerald-500"/>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {/* Credits nudge after results */}
              {account.tier!=="premium"&&remaining!==null&&(
                <div className={cn("mt-3 rounded-xl border p-3",usedCredit?"border-amber-100 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20":"border-violet-100 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20")}>
                  <p className={cn("text-xs",usedCredit?"text-amber-700 dark:text-amber-300":"text-violet-700 dark:text-violet-300")}>
                    {usedCredit
                      ?<><strong>Used 1 purchased credit.</strong> {credits} credit{credits===1?"":"s"} remaining. <button type="button" onClick={()=>setShowBuyModal(true)} className="underline font-semibold">Buy more →</button></>
                      :remaining===0
                        ?<><strong>No free uses left today.</strong> <button type="button" onClick={()=>setShowBuyModal(true)} className="underline font-semibold">Buy credits to keep going →</button></>
                        :<><strong>{remaining} free {remaining===1?"use":"uses"} left today.</strong> <button type="button" onClick={()=>setShowBuyModal(true)} className="underline">Buy credits for more →</button></>
                    }
                  </p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={()=>navigator.clipboard.writeText(result.blocks.map(b=>b.label+":\n"+b.items.join("\n")).join("\n\n"))} className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-gray-900">
                  <Copy size={13}/> Copy all
                </button>
              </div>
            </>
          )}
        </div>
        <AdSlot placement="After results"/>
      </div>
    </div>
    </>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function HomePage(){
  const{account,t,colorTheme}=useSite();
  const{history}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const recentSlugs=filterUnique(history.map(h=>h.slug)).slice(0,4);
  const recentTools=recentSlugs.map(getToolBySlug).filter(Boolean) as Tool[];
  const newTools=tools.filter(tool=>tool.isNew);
  const homeSchema={"@context":"https://schema.org","@type":"WebApplication","name":siteName,"url":siteDomain,"applicationCategory":"BusinessApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}};

  return(
    <>
      <SeoHead title={`${siteName} — Creator + Designer + SEO Toolkit`} description="Free creator, image, design, social media, and SEO tools for faster publishing, conversion, optimization, and website workflows." schema={homeSchema}/>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 text-white">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:"radial-gradient(circle at 1px 1px,rgba(255,255,255,0.06) 1px,transparent 0)",backgroundSize:"28px 28px"}}/>
        <div className="absolute top-0 left-1/4 h-80 w-80 rounded-full blur-3xl" style={{background:`${ct.color}33`}}/>
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"/>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 items-center">
            <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.6}} className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-violet-200 backdrop-blur-sm">
                <Sparkles size={14} className="text-violet-300"/> {t("hero.badge")}
              </div>
              <h1 className="text-4xl font-bold tracking-tight leading-tight sm:text-5xl xl:text-6xl">
                {t("hero.title1")}<br/>
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{t("hero.title2")}</span>
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                {t("hero.subtitle")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/tools/all-in-one-creator-kit" className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-900 shadow-lg hover:bg-gray-50">
                  <WandSparkles size={16}/> {t("hero.cta1")}
                </Link>
                <Link to="/tools/background-remover" className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/15">
                  <Wand2 size={16}/> Background Remover
                </Link>
                <Link to="/tools" className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 backdrop-blur hover:bg-violet-500/20">
                  <LayoutGrid size={16}/> All Tools
                </Link>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400"/> {t("hero.check1")}</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400"/> {t("hero.check2")}</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400"/> {t("hero.check3")}</span>
              </div>
            </motion.div>

            {/* Hero card */}
            <motion.div initial={{opacity:0,scale:0.96,y:16}} animate={{opacity:1,scale:1,y:0}} transition={{duration:0.7,delay:0.15}}>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl shadow-violet-950/50">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-rose-400"/><div className="h-3 w-3 rounded-full bg-amber-400"/><div className="h-3 w-3 rounded-full bg-emerald-400"/>
                  <span className="ml-3 text-xs text-slate-400">All-in-One Creator Kit</span>
                </div>
                <div className="p-5 grid gap-3 sm:grid-cols-2">
                  {[{l:"Title",v:"Creator growth sprint for your topic"},{l:"Hashtags",v:"#creator #seo #growth #content"},{l:"Thumbnail",v:"High contrast, one promise, bold text"},{l:"Caption",v:"Here's the shortcut most creators miss."},{l:"Keywords",v:"creator, growth, seo, viral, tools"},{l:"Content idea",v:"Teach, compare, and simplify the workflow"},].map(item=>(
                    <div key={item.l} className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{item.l}</p>
                      <p className="mt-1 text-sm text-white">{item.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <PageWrap>
        {/* New tools */}
        {newTools.length>0&&(
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Badge variant="emerald">New</Badge><h2 className="font-bold text-gray-900 dark:text-white">Just added</h2></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newTools.map(t=><ToolCard key={t.slug} tool={t}/>)}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <SectionTitle eyebrow="Categories" title="Browse by workflow"/>
            <Link to="/categories" className="flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">View all <ArrowRight size={15}/></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map(c=>{const Icon=c.icon;return(
              <Link key={c.slug} to={`/categories/${c.slug}`} className="group flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",c.gradient)}><Icon size={16}/></div>
                <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</p><p className="text-xs text-gray-400">{tools.filter(t=>t.category===c.slug).length} tools</p></div>
              </Link>
            )})}
          </div>
        </section>

        {/* Featured tool */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <SectionTitle eyebrow={t("label.featured")} title={t("section.featured")} subtitle={t("section.featuredSub")}/>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 dark:border-violet-800 dark:bg-violet-950/10">
            <Workbench tool={featuredTool}/>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {account.tier!=="premium"&&<AdSlot placement="Above tools"/>}
            {/* Popular tools */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <SectionTitle title={t("section.popularTools")}/>
                <Link to="/tools" className="flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-400">{t("btn.allTools")} <ArrowRight size={15}/></Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {topTools.slice(0,9).map(slug=>{const tool=getToolBySlug(slug);return tool?<ToolCard key={slug} tool={tool}/>:null})}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Account */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Free & practical</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">No account required</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Most file utilities run locally in your browser. Choose a tool and start.</p>
              <Link to="/privacy" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"><Shield size={14}/> Privacy details</Link>
            </div>
            {/* Recently used */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">{t("label.recentlyUsed")}</p>
              <div className="mt-3 space-y-2">
                {recentTools.length?recentTools.map(tool=>(
                  <Link key={tool.slug} to={`/tools/${tool.slug}`} className="flex items-center gap-2 rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className={cn("h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br flex items-center justify-center text-white",categoryMeta[tool.category].gradient)}>{(() => { const I = categoryMeta[tool.category].icon; return <I size={13}/>; })()}</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{tool.name}</p>
                  </Link>
                )):<p className="text-sm text-gray-400 dark:text-gray-500">{t("label.noRecent")}</p>}
              </div>
            </div>
            <AdSlot placement="Sidebar"/>
          </aside>
        </div>

        {/* Blog preview */}
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <SectionTitle eyebrow={t("nav.blog")} title={t("section.blog")}/>
            <Link to="/blog" className="flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-400">{t("btn.viewAll")} <ArrowRight size={15}/></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {blogPosts.slice(0,4).map(p=>(
              <Link key={p.slug} to={`/blog/${p.slug}`} className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
                <Badge variant="violet">{p.category}</Badge>
                <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{p.title}</h3>
                <p className="mt-1.5 text-xs text-gray-400 line-clamp-2">{p.excerpt}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{p.readingTime}</span><span className="flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400">Read <ArrowRight size={11}/></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Pricing preview */}
        <section className="mt-10">
          <div className="mb-5"><SectionTitle eyebrow="Pricing" title="Simple, transparent plans" subtitle="Try every tool free. Upgrade when you need more." center/></div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingPlans.map(plan=>(
              <div key={plan.name} className={cn("relative rounded-2xl border p-6 shadow-sm",plan.featured?"border-violet-300 bg-violet-50/60 dark:border-violet-700 dark:bg-violet-950/20":"border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900")}>
                {plan.badge&&<div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge variant="violet">{plan.badge}</Badge></div>}
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{plan.name}</p>
                <div className="mt-2 flex items-end gap-1"><span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span><span className="pb-1 text-sm text-gray-400">{plan.period}</span></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map(f=><li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"><Check size={14} className="mt-0.5 shrink-0 text-emerald-500"/>{f}</li>)}
                </ul>
                <Link to="/pricing" className={cn("mt-5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold",plan.featured?"bg-violet-600 text-white hover:bg-violet-700":"border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800")}>
                  Get started <ArrowRight size={14}/>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </PageWrap>
    </>
  );
}

function ToolsPage(){
  const[params]=useSearchParams();
  const q=cleanText(params.get("q")??"");
  const filtered=useMemo(()=>{
    const term=q.toLowerCase();
    return tools.filter(t=>!term||t.name.toLowerCase().includes(term)||t.description.toLowerCase().includes(term)||t.category.includes(term));
  },[q]);
  return(
    <>
      <SeoHead title="Tools" description="Browse 80+ practical image, design, creator, social media, and SEO tools."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Tools"}]}/>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <SectionTitle title="All Tools" subtitle={`${filtered.length} tools available${q?` for "${q}"`:""}` }/>
          {q&&<Badge variant="violet">Filtered: {q}</Badge>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(t=><ToolCard key={t.slug} tool={t}/>)}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2"><AdSlot placement="Below tools"/><AdSlot placement="Above tools"/></div>
      </PageWrap>
    </>
  );
}

function CategoriesPage(){
  return(
    <>
      <SeoHead title="Categories" description="Browse creator tools by category."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Categories"}]}/>
        <SectionTitle title="Browse Categories" subtitle="Pick a workflow and explore the tools built for it."/>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map(c=>{const Icon=c.icon;const count=tools.filter(t=>t.category===c.slug).length;return(
            <Link key={c.slug} to={`/categories/${c.slug}`} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white",c.gradient)}><Icon size={22}/></div>
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{c.name}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{c.blurb}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="gray">{count} tools</Badge>
                <span className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">Explore <ArrowRight size={13}/></span>
              </div>
            </Link>
          )})}
        </div>
      </PageWrap>
    </>
  );
}

function CategoryPage(){
  const{slug}=useParams();
  const cat=categories.find(c=>c.slug===slug);
  const catTools=tools.filter(t=>t.category===slug);
  if(!cat)return<NotFound/>;
  const Icon=cat.icon;
  return(
    <>
      <SeoHead title={cat.name} description={cat.blurb}/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Categories",href:"/categories"},{label:cat.name}]}/>
        <div className="mb-6 flex items-center gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",cat.gradient)}><Icon size={26}/></div>
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cat.name}</h1><p className="text-sm text-gray-500 dark:text-gray-400">{catTools.length} tools · {cat.blurb}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catTools.map(t=><ToolCard key={t.slug} tool={t}/>)}
        </div>
        <div className="mt-6"><AdSlot placement="After category tools"/></div>
      </PageWrap>
    </>
  );
}

function ToolPage(){
  const{slug}=useParams();
  const tool=getToolBySlug(slug);
  if(!tool)return<NotFound/>;
  const meta=categoryMeta[tool.category];
  const Icon=meta.icon;
  const related=tools.filter(t=>t.slug!==tool.slug&&t.category===tool.category).slice(0,5);
  const blogs=blogPosts.slice(0,3);
  const faqs=faqGroups.flatMap(g=>g.questions).slice(0,5);
  const toolSchema={"@context":"https://schema.org","@type":"WebApplication","name":tool.name,"url":`${siteDomain}/tools/${tool.slug}`,"description":tool.description,"applicationCategory":tool.category==="image"||tool.category==="designer"?"DesignApplication":"UtilitiesApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}};
  return(
    <>
      <SeoHead title={tool.name} description={tool.description} schema={toolSchema}/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Tools",href:"/tools"},{label:meta.name,href:`/categories/${tool.category}`},{label:tool.name}]}/>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white",meta.gradient)}><Icon size={22}/></div>
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tool.name}</h1><p className="text-sm text-gray-500 dark:text-gray-400">{tool.description}</p></div>
          <div className="flex gap-2 ml-auto">{tool.isNew&&<Badge variant="emerald">New</Badge>}{tool.featured&&<Badge variant="violet">Featured</Badge>}</div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <Workbench tool={tool}/>
            <div className="grid gap-4 sm:grid-cols-2"><AdSlot placement="Sidebar"/><AdSlot placement="After results"/></div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Related tools</p>
              <div className="space-y-2">
                {related.map(t=>{const RI=categoryMeta[t.category].icon;return(<Link key={t.slug} to={`/tools/${t.slug}`} className="flex items-center gap-2.5 rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"><div className={cn("h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br flex items-center justify-center text-white",categoryMeta[t.category].gradient)}><RI size={13}/></div><p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p></Link>);})}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Read next</p>
              <div className="space-y-2">
                {blogs.map(b=><Link key={b.slug} to={`/blog/${b.slug}`} className="block rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"><p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{b.title}</p><p className="text-xs text-gray-400">{b.readingTime}</p></Link>)}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">FAQs</p>
              <div className="space-y-1">
                {faqs.map(f=><details key={f.q} className="group rounded-xl border border-gray-100 dark:border-gray-800"><summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200">{f.q}</summary><p className="px-3 pb-3 text-xs text-gray-500 dark:text-gray-400">{f.a}</p></details>)}
              </div>
            </div>
          </aside>
        </div>
        <ToolSeoContent tool={tool}/>
      </PageWrap>
    </>
  );
}

function ToolSeoContent({tool}:{tool:Tool}){
  const specific:Record<string,{intro:string;steps:string[];faqs:{q:string;a:string}[]}>= {
    "compress-image":{intro:"Compress images before uploading them to websites, stores, email, or social platforms. This browser-based tool reduces file weight while letting you control the quality tradeoff.",steps:["Choose the image you want to compress.","Adjust quality while watching the result.","Download the smaller file and compare it with the original before publishing."],faqs:[{q:"Does compression reduce image quality?",a:"Lossy compression can reduce detail, but sensible settings often save substantial space with little visible difference."},{q:"Should I resize before compressing?",a:"Yes when the original dimensions are much larger than the final display size. Resizing first usually produces a much smaller final file."}]},
    "resize-image":{intro:"Resize an image to exact pixel dimensions without sending the file to a server. Keep the original aspect ratio to avoid stretching.",steps:["Upload an image and note its original dimensions.","Enter the target width and keep aspect ratio enabled unless you intentionally need a different shape.","Download the resized PNG and compress or convert it if the destination requires another format."],faqs:[{q:"What size should I use?",a:"Use the smallest dimensions that still match the final display area or platform recommendation."},{q:"Will resizing make an image blurry?",a:"Upscaling can soften detail. Downscaling usually looks good when a high-quality source is used."}]},
    "background-remover":{intro:"Remove an image background for product photos, profile images, thumbnails, and design assets. Processing is designed to run in the browser when the background-removal model is available.",steps:["Upload a clear image with a distinct foreground subject.","Run background removal and inspect edges such as hair, fur, and transparent areas.","Download the transparent result and verify it at full size before publishing."],faqs:[{q:"Are my images uploaded?",a:"The background-removal workflow is designed to process in the browser. Model files may be downloaded to your device to perform the task."},{q:"What images work best?",a:"Clear subject separation, good lighting, and a reasonably simple background usually produce cleaner edges."}]},
    "gif-to-video":{intro:"Animated GIF files can be heavy. This tool helps you prepare a faster WebM or MP4 workflow and gives you looping video embed code for websites.",steps:["Upload the GIF and review its file size.","Use the included workflow or ffmpeg commands for full WebM/MP4 encoding.","Replace the large GIF with a muted looping video and test the page on mobile."],faqs:[{q:"Why convert GIF to WebM?",a:"Video codecs are generally much more efficient for full-color animation, so a WebM can be substantially smaller than an equivalent GIF."},{q:"Does LogoViking encode full WebM in the browser?",a:"The page provides frame extraction, embed code, and a free ffmpeg workflow. It does not pretend to provide unsupported browser encoding when the browser cannot do it."}]},
    "favicon-generator":{intro:"Create the common PNG favicon sizes from one square source image, then copy the HTML tags needed to add the icon to a website.",steps:["Upload a square 512×512 image or larger.","Generate 16, 32, 48, 180, 192, and 512 pixel versions.","Download the files and place the generated link tags in your page head."],faqs:[{q:"Does a favicon have to be ICO?",a:"No. Modern browsers support PNG and SVG favicons. ICO can still be useful for older software."},{q:"What source image works best?",a:"Use a simple square mark with strong contrast and little fine detail so it remains recognizable at 16×16 pixels."}]},
    "aspect-ratio-calculator":{intro:"Calculate an image or video ratio and find a matching missing dimension without stretching. It is useful for YouTube, TikTok, Instagram, presentations, and responsive design.",steps:["Enter the original width and height to identify the ratio.","Enter a new width to calculate the proportional height.","Use common presets such as 16:9, 9:16, 1:1, and 4:5 as quick references."],faqs:[{q:"What aspect ratio is 1920×1080?",a:"1920×1080 is 16:9."},{q:"What ratio is vertical video?",a:"9:16 is the most common full-screen vertical format for Shorts, Reels, Stories, and TikTok."}]},
    "webp-to-jpg":{intro:"Convert a WebP file to JPG when an editor, marketplace, or upload form does not accept WebP. Conversion happens in your browser.",steps:["Upload the WebP image.","Choose the quality level for the JPG output.","Download the converted JPG and inspect transparent areas because JPG replaces transparency with a solid background."],faqs:[{q:"Does JPG support transparency?",a:"No. Transparent pixels need a background color when converting to JPG."},{q:"Why convert WebP to JPG?",a:"JPG remains widely supported by older editors, forms, and publishing workflows."}]},
    "png-to-webp":{intro:"Convert PNG images to WebP for smaller web assets while retaining modern browser support.",steps:["Upload the PNG file.","Adjust WebP quality to balance size and appearance.","Download the WebP and compare it at the final display size."],faqs:[{q:"Can WebP keep transparency?",a:"Yes, WebP supports transparency."},{q:"Should I delete my PNG original?",a:"Keep the source PNG if it is an important master asset. Use the WebP as the optimized delivery copy."}]},
    "image-to-base64":{intro:"Convert an image into a Base64 data URL for embedding in HTML, CSS, prototypes, email templates, and development workflows.",steps:["Choose a small image.","Copy the generated data URL or download it as text.","Use Base64 mainly for small assets because encoded text is larger than the original binary file."],faqs:[{q:"Is Base64 smaller than an image file?",a:"No. Base64 encoding increases the amount of text data. Its benefit is embedding, not compression."},{q:"Does the image leave my browser?",a:"This converter uses the browser FileReader API and does not need to upload the file to LogoViking."}]},
    "image-dimensions":{intro:"Check width, height, aspect ratio, file size, orientation, file type, and megapixels before resizing or publishing an image.",steps:["Upload the image.","Review its dimensions and simplified aspect ratio.","Use Resize Image or a format converter if the file does not match the destination requirements."],faqs:[{q:"What are image dimensions?",a:"Dimensions are the width and height of an image in pixels."},{q:"What are megapixels?",a:"Megapixels are the total pixel count divided by one million."}]}
  };
  const genericIntro=tool.category==="image"?"Use this browser-based image utility to complete a focused image task quickly. Keep a copy of your original file and review the downloaded result before publishing.":tool.category==="seo"?"Use this SEO utility to prepare or check page information. Treat generated output as a starting point and verify it against the actual page and current search-engine guidance.":"Use this creator utility to speed up a specific publishing or design workflow. Review the output and adapt it to your audience before publishing.";
  const data=specific[tool.slug]??{intro:genericIntro,steps:["Enter or upload the information the tool needs.","Review the result and make any necessary adjustments.","Copy or download the output and verify it in the destination platform."],faqs:[{q:`Is ${tool.name} free to try?`,a:"Yes. LogoViking provides a free usage path for public tools, with some advanced workflows or third-party services potentially having separate limits."},{q:"Can I use the result commercially?",a:"The tool itself does not grant rights to source material you do not own. Make sure you have the necessary rights to any images, text, brands, or other inputs you use."}]};
  return <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><h2 className="text-xl font-bold text-gray-900 dark:text-white">How to use {tool.name}</h2><p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-400">{data.intro}</p><ol className="mt-4 space-y-2">{data.steps.map((step,i)=><li key={step} className="flex gap-3 text-sm text-gray-600 dark:text-gray-400"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">{i+1}</span><span>{step}</span></li>)}</ol><p className="mt-5 text-xs text-gray-400">Privacy note: browser-side tools are preferred where practical. If a tool depends on an external service, its interface or documentation should make that clear.</p></div>
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"><h2 className="text-xl font-bold text-gray-900 dark:text-white">{tool.name} FAQ</h2><div className="mt-3 space-y-2">{data.faqs.map(f=><details key={f.q} className="rounded-xl border border-gray-100 dark:border-gray-800"><summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{f.q}</summary><p className="px-3 pb-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{f.a}</p></details>)}</div></div>
  </section>;
}

function BlogIndex(){
  return(
    <>
      <SeoHead title="Blog" description="Guides for creators, designers, and SEO-focused publishers."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Blog"}]}/>
        <SectionTitle title="Blog" subtitle="SEO-ready guides with table of contents, FAQs, and schema."/>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {blogPosts.map(p=>(
            <Link key={p.slug} to={`/blog/${p.slug}`} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-800">
              <Badge variant="violet">{p.category}</Badge>
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{p.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-3">{p.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400"><span>{p.readingTime}</span><span>{p.updatedAt}</span></div>
            </Link>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2"><AdSlot placement="Blog sidebar"/><AdSlot placement="Below blog"/></div>
      </PageWrap>
    </>
  );
}

function BlogPostPage(){
  const{slug}=useParams();
  const post=getBlogBySlug(slug);
  if(!post)return<NotFound/>;
  const articleSchema={"@context":"https://schema.org","@type":"Article","headline":post.title,"description":post.excerpt,"dateModified":post.updatedAt,"publisher":{"@type":"Organization","name":siteName,"url":siteDomain},"mainEntityOfPage":{"@type":"WebPage","@id":`${siteDomain}/blog/${post.slug}`}};
  const faqItems=post.faqs.map(f=>({"@type":"Question","name":f.question,"acceptedAnswer":{"@type":"Answer","text":f.answer}}));
  const combinedSchema={"@context":"https://schema.org","@graph":[articleSchema,...(post.faqs.length?[{"@type":"FAQPage","mainEntity":faqItems}]:[])]};
  return(
    <>
      <SeoHead title={post.title} description={post.excerpt} schema={combinedSchema}/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Blog",href:"/blog"},{label:post.title}]}/>
        <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
          <article className="space-y-8">
            <div>
              <Badge variant="violet">{post.category}</Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{post.title}</h1>
              <div className="mt-2 flex gap-4 text-sm text-gray-400"><span>{post.readingTime}</span><span>Updated {post.updatedAt}</span></div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Table of Contents</p>
              <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                {post.sections.map(s=><li key={s.id}><a href={`#${s.id}`} className="hover:text-violet-600 dark:hover:text-violet-400">{s.title}</a></li>)}
                <li><a href="#faqs" className="hover:text-violet-600 dark:hover:text-violet-400">FAQs</a></li>
              </ul>
            </div>
            {post.sections.map((s,i)=>(
              <section key={s.id} id={s.id} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{s.title}</h2>
                {s.paragraphs.map(p=><p key={p} className="text-sm leading-7 text-gray-600 dark:text-gray-400">{p}</p>)}
                {i===0&&<AdSlot placement="Between blog sections"/>}
              </section>
            ))}
            <section id="faqs">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">FAQs</h2>
              <div className="mt-4 space-y-2">
                {post.faqs.map(f=><details key={f.question} className="rounded-2xl border border-gray-200 dark:border-gray-800"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{f.question}</summary><p className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">{f.answer}</p></details>)}
              </div>
            </section>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Related posts</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {post.related.map(slug=>{const r=getBlogBySlug(slug);return r?<Link key={slug} to={`/blog/${slug}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{r.title}</Link>:null})}
              </div>
            </div>
          </article>
          <aside className="space-y-4">
            <AdSlot placement="Blog sidebar"/>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Popular tools</p>
              <div className="space-y-2">
                {topTools.slice(0,5).map(slug=>{const t=getToolBySlug(slug);return t?<Link key={t.slug} to={`/tools/${t.slug}`} className="block rounded-xl p-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">{t.name}</Link>:null})}
              </div>
            </div>
          </aside>
        </div>
      </PageWrap>
    </>
  );
}

function FaqPage(){
  return(
    <>
      <SeoHead title="FAQ" description="Answers to common questions about Logoviking accounts, tools, pricing, and privacy."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"FAQ"}]}/>
        <SectionTitle title="Frequently Asked Questions" subtitle="Everything you need to know before you subscribe." center/>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {faqGroups.map(group=>(
            <div key={group.title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="font-bold text-gray-900 dark:text-white">{group.title}</h2>
              <div className="mt-3 space-y-1.5">
                {group.questions.map(({q,a})=>(
                  <details key={q} className="rounded-xl border border-gray-100 dark:border-gray-800">
                    <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200">{q}</summary>
                    <p className="px-3 pb-3 text-sm text-gray-500 dark:text-gray-400">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageWrap>
    </>
  );
}

function PricingPage(){
  return(
    <>
      <SeoHead title="Pricing" description="LogoViking core creator, image, design, and SEO tools are currently free to use. Optional paid features are planned for later."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Pricing"}]}/>
        <SectionTitle title="Free tools first" subtitle="Use LogoViking's core utilities without a paid subscription. Optional paid features are planned, but are not for sale yet." center/>
        <div className="mx-auto mt-8 max-w-3xl grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-800 dark:bg-emerald-950/20">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Free</p>
            <div className="mt-3 text-4xl font-bold text-gray-900 dark:text-white">$0</div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Practical browser tools for images, design, creators, and SEO.</p>
            <ul className="mt-5 space-y-2.5">
              {["No payment required","No fake checkout or hidden purchase","Many tools process files in your browser","New utility tools added over time"].map(f=><li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"><Check size={15} className="mt-0.5 text-emerald-500"/>{f}</li>)}
            </ul>
            <Link to="/tools" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700">Browse free tools <ArrowRight size={15}/></Link>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Future Pro</p>
            <div className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">Coming later</div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">If we launch paid features, they will only be offered after real billing and account systems are ready.</p>
            <ul className="mt-5 space-y-2.5">
              {["No paid plan is active today","No credit packs are currently sold","Pricing will be published before launch","Free tools remain the traffic focus"].map(f=><li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"><Check size={15} className="mt-0.5 text-violet-500"/>{f}</li>)}
            </ul>
          </div>
        </div>
      </PageWrap>
    </>
  );
}

// ─── Credit Store Page (/credits) ────────────────────────────────────────────────────
function CreditStorePage(){
  return(
    <>
      <SeoHead title="Credits — Not Available" description="LogoViking is not currently selling credits or paid AI usage." noIndex/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Pricing",href:"/pricing"},{label:"Credits"}]}/>
        <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-950/40"><Zap className="text-violet-600" size={22}/></div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Credit purchases are not live</h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400">We are not taking payments for LogoViking credits. The current focus is useful free creator, image, design, and SEO tools.</p>
          <Link to="/tools" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700">Explore free tools <ArrowRight size={15}/></Link>
        </div>
      </PageWrap>
    </>
  );
}

function Dashboard(){
  const{account,history,favorites,projects,clearHistory,deleteProject,credits}=useSite();
  const favTools=tools.filter(t=>favorites.includes(t.slug));
  const topUsed=useMemo(()=>{const m=new Map<string,number>();history.forEach(h=>m.set(h.slug,(m.get(h.slug)??0)+1));return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6);},[history]);
  const lim=TOOL_LIMITS[account.tier];
  return(
    <>
      <SeoHead title="Dashboard" description="Your usage, favorites, history, and saved projects."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Dashboard"}]}/>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <SectionTitle title={`Hey, ${account.authenticated?account.name:"Guest"} 👋`} subtitle="Track your usage, favorites, and saved projects."/>
          <Link to="/account" className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><Settings size={14}/> Settings</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-4 mb-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-400 uppercase tracking-widest">Plan</p><p className="mt-1 text-xl font-bold capitalize text-gray-900 dark:text-white">{account.tier}</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-400 uppercase tracking-widest">Total uses</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{history.length}</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-400 uppercase tracking-widest">Daily limit</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{lim===Infinity?"Unlimited":`${lim}/day`}</p></div>
          <Link to="/credits" className={cn("rounded-2xl border p-4 transition-all hover:shadow-md",credits>0?"border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/20":"border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900")}>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Credits</p>
            <p className={cn("mt-1 text-xl font-bold",credits>0?"text-violet-600 dark:text-violet-400":"text-gray-900 dark:text-white")}>{credits>0?credits.toLocaleString():"None"}</p>
            {credits===0&&<p className="text-[10px] text-violet-500 font-semibold mt-0.5">Buy credits →</p>}
          </Link>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-4"><p className="font-semibold text-gray-900 dark:text-white">Recent history</p><button onClick={clearHistory} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 size={13}/> Clear</button></div>
              <div className="space-y-2">
                {history.slice(0,8).map(h=>{const t=getToolBySlug(h.slug);return(<div key={h.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800"><div><p className="text-sm font-medium text-gray-900 dark:text-white">{t?.name??h.slug}</p><p className="text-xs text-gray-400">{h.query||"—"}</p></div><p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</p></div>)})}
                {!history.length&&<p className="text-sm text-gray-400">No history yet. Try a tool to get started.</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <p className="font-semibold text-gray-900 dark:text-white mb-3">Favorites</p>
                <div className="space-y-2">{favTools.length?favTools.map(t=><Link key={t.slug} to={`/tools/${t.slug}`} className="block rounded-xl border border-gray-100 px-3 py-2.5 text-sm font-medium text-gray-900 hover:border-violet-200 dark:border-gray-800 dark:text-white">{t.name}</Link>):<p className="text-sm text-gray-400">No favorites yet.</p>}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <p className="font-semibold text-gray-900 dark:text-white mb-3">Saved projects</p>
                <div className="space-y-2">{projects.length?projects.map(p=><div key={p.id} className="rounded-xl border border-gray-100 px-3 py-2.5 dark:border-gray-800"><p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p><button onClick={()=>deleteProject(p.id)} className="mt-1 flex items-center gap-1 text-xs text-red-400 hover:text-red-500"><Trash2 size={11}/> Delete</button></div>):<p className="text-sm text-gray-400">{account.tier==="premium"?"No projects yet.":"Upgrade to save projects."}</p>}</div>
              </div>
            </div>
          </div>
          <aside className="space-y-4">
            <AdSlot placement="Dashboard sidebar"/>
            {/* Credits card */}
            <div className={cn("rounded-2xl border p-4",credits>0?"border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/20":"border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900")}>
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-2">Your credits</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{credits>0?credits.toLocaleString():"0"}</p>
              <p className="text-xs text-gray-400 mt-1 mb-3">{credits>0?"Credits never expire":"No purchased credits yet"}</p>
              <Link to="/credits" className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
                <Zap size={14}/> {credits>0?"Buy more credits":"Buy credits"}
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-3">Top tools used</p>
              <div className="space-y-2">{topUsed.map(([slug,count])=>{const t=getToolBySlug(slug);return t?<Link key={slug} to={`/tools/${slug}`} className="flex items-center justify-between rounded-xl p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"><p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p><Badge variant="gray">×{count}</Badge></Link>:null})}
              {!topUsed.length&&<p className="text-sm text-gray-400">No data yet.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Upgrade to Creator Pro</p>
              <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">Unlimited usage, no ads, batch processing, and saved projects.</p>
              <Link to="/pricing" className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700"><Zap size={14}/> Upgrade now</Link>
            </div>
          </aside>
        </div>
      </PageWrap>
    </>
  );
}

function AccountPage(){
  const{account,setAccount,theme,setTheme}=useSite();
  const[name,setName]=useState(account.name);
  const[email,setEmail]=useState(account.email);
  const[msg,setMsg]=useState("");
  const save=(e:React.FormEvent)=>{
    e.preventDefault();
    if(!email.includes("@")||name.trim().length<2){setMsg("Enter a valid name and email.");return}
    setAccount(a=>({...a,name:cleanText(name),email:cleanText(email),authenticated:true,provider:a.provider==="guest"?"email":a.provider}));
    setMsg("Saved successfully.");
  };
  return(
    <>
      <SeoHead title="Account Settings" description="Manage your Logoviking account, theme, and preferences."/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Account"}]}/>
        <SectionTitle title="Account Settings" subtitle="Manage your profile and preferences."/>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_280px]">
          <form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name<input value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Settings size={15}/> Save changes</button>
              <button type="button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>} Toggle theme</button>
              <button type="button" onClick={()=>setAccount(a=>({...a,authenticated:false,tier:"guest",provider:"guest"}))} className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"><LogOut size={15}/> Logout</button>
            </div>
            {msg&&<p className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">{msg}</p>}
          </form>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Status</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">{account.name}</p>
              <p className="text-sm text-gray-500">{account.email}</p>
              <p className="text-sm capitalize text-violet-600 dark:text-violet-400">{account.tier} plan</p>
              <Link to="/pricing" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Zap size={14}/> Manage plan</Link>
            </div>
          </aside>
        </div>
      </PageWrap>
    </>
  );
}

function AuthPage(){
  return(
    <>
      <SeoHead title="Accounts — Not Available" description="LogoViking does not currently require or offer user accounts." noIndex/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:"Accounts"}]}/>
        <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Shield size={28} className="mx-auto text-violet-600"/>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">No account needed</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">LogoViking is currently focused on free browser tools. Login, signup, password reset, and paid account features are not live, so we do not collect account passwords here.</p>
          <Link to="/tools" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700"><Grid3X3 size={15}/> Browse tools</Link>
        </div>
      </PageWrap>
    </>
  );
}

function TrustPage(){
  const { page = "" } = useParams();
  const data = trustPages[page];
  if(!data) return <NotFound/>;
  return(
    <>
      <SeoHead title={data.title} description={data.description}/>
      <PageWrap>
        <Breadcrumb items={[{label:"Home",href:"/"},{label:data.title}]}/>
        <div className="mx-auto max-w-3xl">
          <SectionTitle title={data.title} subtitle={data.description}/>
          <div className="mt-7 space-y-5">
            {data.sections.map(section=>(
              <section key={section.heading} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{section.heading}</h2>
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map(paragraph=><p key={paragraph} className="text-sm leading-7 text-gray-600 dark:text-gray-400">{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          {page==="contact"&&<ContactForm/>}
        </div>
      </PageWrap>
    </>
  );
}

function ContactForm(){
  const[form,setForm]=useState({name:"",email:"",message:""});
  const[note,setNote]=useState("");
  const submit=(e:React.FormEvent)=>{e.preventDefault();if(form.message.length<12||!form.email.includes("@")||isSpammy(form.message)){setNote("Enter a valid message without spam patterns.");return;}const subject=encodeURIComponent(`LogoViking contact from ${form.name||form.email}`);const body=encodeURIComponent(`Name: ${form.name||"Not provided"}\nEmail: ${form.email}\n\n${form.message}`);window.location.href=`mailto:support@logoviking.com?subject=${subject}&body=${body}`;setNote("Your email app should open with the message ready to send.");};
  return(
    <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Send us a message</h3>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name<input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email<input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Message<textarea rows={4} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className="mt-1 block w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/></label>
        {note&&<p className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm dark:bg-gray-800">{note}</p>}
        <button type="submit" className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Send message <ArrowRight size={15}/></button>
      </form>
    </div>
  );
}

function NotFound(){
  const{t,colorTheme}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  return(
    <>
      <SeoHead title="Not Found" description="Page not found." noIndex/>
      <PageWrap className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"><Search size={28} className="text-gray-400"/></div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("label.notFound")}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("label.notFoundSub")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{background:ct.color}}><Home size={15}/> {t("nav.home")}</Link>
          <Link to="/tools" className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"><LayoutGrid size={15}/> {t("label.browseTools")}</Link>
        </div>
      </PageWrap>
    </>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function Footer(){
  const{t,colorTheme}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const footerNavKeys:[string,string][]=[["nav.home","/"],["nav.tools","/tools"],["nav.categories","/categories"],["nav.blog","/blog"],["nav.pricing","/pricing"],["nav.faq","/faq"],["nav.dashboard","/dashboard"]];
  return(
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden bg-gray-950 ring-1 ring-amber-700/40">
                <img
                  src="/images/logoviking-main-logo.png"
                  alt="Logoviking logo"
                  className="h-full w-full object-cover scale-[1.08]"
                  loading="lazy"
                />
              </span>
              <div><p className="font-bold text-gray-900 dark:text-white">Logoviking</p><p className="text-xs" style={{color:ct.color}}>{t("label.tagline")}</p></div>
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t("label.footerDesc")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">{t("label.footerProduct")}</p>
            <div className="space-y-2">{footerNavKeys.map(([key,h])=><Link key={h} to={h} className="block text-sm text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">{t(key)}</Link>)}
            <Link to="/credits" className="block text-sm text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">Buy Credits</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">{t("label.footerCategories")}</p>
            <div className="space-y-2">{categories.map(c=><Link key={c.slug} to={`/categories/${c.slug}`} className="block text-sm text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">{c.name}</Link>)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">{t("label.footerLegal")}</p>
            <div className="space-y-2">{trustLinks.map(([l,h])=><Link key={l} to={h} className="block text-sm text-gray-600 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">{l}</Link>)}</div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 text-xs text-gray-400 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Logoviking.com — {t("label.footerCopy")}</p>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-violet-600">About</Link>
            <Link to="/pricing" className="hover:text-violet-600">Pricing</Link>
            <Link to="/tools" className="hover:text-violet-600">{t("nav.tools")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Back to top ──────────────────────────────────────────────────────────────
function BackToTop(){
  const{colorTheme}=useSite();
  const ct=colorThemes.find(c=>c.id===colorTheme)??colorThemes[0];
  const[show,setShow]=useState(false);
  useEffect(()=>{const h=()=>setShow(window.scrollY>600);window.addEventListener("scroll",h,{passive:true});h();return()=>window.removeEventListener("scroll",h);},[]);
  if(!show)return null;
  return(
    <button onClick={scrollTop} className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg" style={{background:ct.color}} aria-label="Back to top">
      <ArrowUpRight size={18} className="-rotate-45"/>
    </button>
  );
}

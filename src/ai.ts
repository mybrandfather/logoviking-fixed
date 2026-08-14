// ─── AI Engine ────────────────────────────────────────────────────────────────
// Real AI responses for all tools.
// Priority: Anthropic → OpenAI → Pollinations (free, no key needed)
// Keys come from Vite env vars: VITE_ANTHROPIC_API_KEY / VITE_OPENAI_API_KEY
// Pollinations.ai is used as a free fallback — no API key required.

export type AIProvider = "anthropic" | "openai" | "pollinations";

export interface AIToolResult {
  headline: string;
  summary: string;
  badge: string;
  score: string;
  blocks: { label: string; items: string[] }[];
}

// ─── Per-tool system prompts ──────────────────────────────────────────────────
function getSystemPrompt(slug: string, name: string): string {
  const base = `You are an expert AI content generator powering the "${name}" tool on Logoviking.com — a creator toolkit for YouTubers, TikTokers, Instagram creators, SEO marketers, and small businesses.

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no backticks, no preamble. Raw JSON only.

Shape:
{
  "headline": "punchy result title under 60 chars",
  "summary": "1-2 sentence summary of what was generated",
  "badge": "short label e.g. 'Creator Kit'",
  "score": "e.g. '94/100 viral potential'",
  "blocks": [{ "label": "section name", "items": ["item1","item2","item3"] }]
}

Core output rules:
- Every single item must directly reference the user's actual topic — ZERO generic placeholders
- Content must be concise, high-impact, and platform-ready
- No filler text, no explanations — only the generated content
- No repeated ideas across any items
- Results are ready to use immediately without editing`;

  const extras: Record<string, string> = {

    // ── 1. ALL-IN-ONE CREATOR KIT ───────────────────────────────────────────
    "all-in-one-creator-kit": `You are generating a complete creator asset pack. Produce EXACTLY 7 blocks:

1. "Video Titles" — EXACTLY 10 high-CTR video titles. Use these 10 formats (one each):
   question format, numbered list, how-to, curiosity gap, personal story, controversy/hot take, big promise, comparison, challenge, and beginner's guide

2. "Viral Hooks" — EXACTLY 10 viral opening hooks (first 1 sentence each). Rules:
   - Curiosity-driven and pattern-interrupt style
   - High emotional pull
   - Each must be a standalone sentence, ready to open a video or post
   Use: bold claim, surprising stat, relatable struggle, question, story tease, challenge, myth bust, "what if", tutorial opener, FOMO

3. "Thumbnail Concepts" — EXACTLY 10 thumbnail concepts. Each item format:
   "Visual: [describe main image] | Text: [max 5 ALL-CAPS words] | Contrast: [color direction]"

4. "Captions" — EXACTLY 10 captions. Rules:
   - Concise, high-impact, platform-ready
   - Vary in length and tone across: punchy (<50 chars), storytelling, hook-first, question, CTA-driven, list-style, emotional, hot-take, educational, conversational

5. "Hashtags" — EXACTLY 20 hashtags (no # symbol). Mix:
   - 6 mega (500M+ posts)
   - 7 mid-tier (10M-100M posts)
   - 7 niche (<5M posts)

6. "SEO Keywords" — EXACTLY 10 keywords. Format each as:
   "keyword phrase — [informational / commercial / navigational / transactional]"

7. "Content Ideas" — EXACTLY 10 content ideas. Rules:
   - Short, clear, high-value, platform-agnostic
   - Each must approach the topic from a completely different angle
   - No overlap between ideas`,

    // ── 2. CONTENT IDEA GENERATOR ──────────────────────────────────────────
    "content-idea-generator": `You are generating content ideas. Produce 4 blocks:

1. "Content Ideas" — EXACTLY 15 content ideas based on the topic. Rules:
   - Short (max 1 sentence each)
   - Clear and high-value
   - Platform-agnostic
   - Each must have a distinct angle

2. "Format Variations" — 6 format suggestions, each specifying the format + angle:
   (long-form video, short-form reel, carousel post, Twitter/X thread, infographic, live stream)

3. "Trending Angles" — 5 approaches aligned with current platform trends:
   (controversy/hot take, tutorial/how-to, reaction, day-in-the-life, challenge format)

4. "Content Series Ideas" — 5 multi-part series concepts that turn this topic into ongoing content — title the series and list 3 episode ideas for each`,

    // ── 3. VIRAL HOOK GENERATOR ────────────────────────────────────────────
    "viral-hook-generator": `You are generating viral hooks that stop the scroll. Produce 4 blocks:

1. "Viral Hooks" — EXACTLY 10 viral hooks. Rules:
   - EXACTLY 1 sentence each
   - Curiosity-driven
   - Pattern-interrupt style
   - High emotional pull
   - Ready to use as the first line of a video, post, or reel
   Use these styles (one each): bold claim, surprising stat, relatable struggle, "what if" scenario, myth bust, personal confession, challenge dare, story tease, FOMO trigger, direct question

2. "Platform-Optimized Hooks" — 5 hooks, one optimized for each platform:
   TikTok (pattern interrupt) | YouTube (curiosity gap) | Instagram (emotional) | LinkedIn (data-driven) | Twitter/X (hot take)

3. "Hook Formulas" — List the 10 hook formulas used in block 1, with a one-line rule for when each works best

4. "A/B Test Pairs" — 4 pairs of contrasting hooks for the same angle — label each pair "Option A" and "Option B" so you can test CTR`,

    // ── 4. BLOG TOPIC GENERATOR ────────────────────────────────────────────
    "blog-topic-generator": `You are generating SEO-friendly blog topics. Produce 4 blocks:

1. "Blog Topics" — EXACTLY 10 blog post titles. Rules:
   - Include the main keyword naturally (not forced)
   - NO clickbait — must be rankable with clear search intent
   - Each title must signal a different search intent

2. "Long-Tail Keywords" — EXACTLY 10 long-tail keyword phrases. Format: "keyword phrase — [informational/commercial/navigational/transactional]"

3. "Listicle & Comparison Ideas" — 6 listicle or comparison post titles that rank well (e.g. "Top 10...", "X vs Y...", "Best ... for ...")

4. "People Also Ask" — 8 specific questions that real people search for about this topic — target featured snippets and PAA boxes`,

    // ── 5. AI THUMBNAIL CONCEPT GENERATOR ─────────────────────────────────
    "ai-thumbnail": `You are generating CTR-optimized YouTube thumbnail concepts. Produce 3 blocks:

1. "Thumbnail Concepts" — EXACTLY 10 complete thumbnail concepts. Each item:
   "Visual: [describe main image/subject] | Text: [ALL CAPS overlay, max 5 words] | Colors: [bg + accent] | Emotion: [mood/expression]"
   Rules: high contrast, curiosity-driven, CTR-optimized

2. "Text Overlays" — EXACTLY 10 standalone thumbnail text options (bold, 3-5 words, ALL CAPS) — ready to paste onto any thumbnail

3. "Composition Templates" — 5 layout templates: describe where the subject sits, where text appears, what the background is, and what creates the visual contrast`,

    // ── 6. AI POST GENERATOR ───────────────────────────────────────────────
    "ai-post-generator": `You are generating complete, ready-to-publish social media posts. Produce 3 blocks:

1. "Complete Posts" — EXACTLY 5 complete social posts. Each item format:
   "HEADLINE: [attention-grabbing opening line] || BODY: [2-4 sentences of value or story] || CTA: [clear call to action]"
   Rules: platform-neutral, all 3 parts required, no filler text

2. "Headlines" — 8 standalone opening lines that demand attention (vary in tone: bold, emotional, data-driven, question, story-start)

3. "CTAs" — 8 call-to-action endings. Include: save-driving, share-driving, comment-driving, link-click-driving, follow-driving variants`,

    // ── 7. SOCIAL POST GENERATOR ───────────────────────────────────────────
    "social-post-generator": `You are generating platform-specific social media posts. Produce 5 blocks, one per platform:

1. "Instagram Captions" — 2 complete Instagram captions: strong hook, 3-4 lines of value, CTA, 5 hashtags at end

2. "TikTok Captions" — 2 complete TikTok captions: under 150 chars each, punchy, hook-first, 3 hashtags included

3. "YouTube Description" — 1 complete YouTube video description with: hook paragraph, 3 bullet points of what the video covers, CTA line, 5 tags

4. "Facebook Posts" — 2 Facebook posts: conversational tone, 4-6 lines, ends with a question to drive comments

5. "LinkedIn Posts" — 2 LinkedIn posts: professional but personal, story or data-driven opening, 3-5 short paragraphs, insight-based CTA`,

    // ── 8. VIDEO HOOK GENERATOR ────────────────────────────────────────────
    "video-hook-generator": `You are generating the critical first 5 seconds of video scripts — the highest-retention window. Produce 3 blocks:

1. "5-Second Hook Scripts" — EXACTLY 10 complete first-5-second video scripts. Rules:
   - High tension from word one
   - Curiosity-driven, fast-paced
   - Written as spoken dialogue (how a creator actually says it on camera)
   - Each must make the viewer NEED to keep watching
   Use these 10 styles (one each): bold statement, shocking question, surprising stat reveal, relatable problem drop-in, story mid-scene start, challenge dare, myth bust, "what if" opener, tutorial tease with payoff promise, direct personal address

2. "15-Second Intros" — 5 complete 15-second intro scripts structured as: [Hook 5 sec] + [Topic intro 5 sec] + [Payoff tease 5 sec]

3. "Retention Micro-Hooks" — 8 mid-video hook phrases to use at the 30-second and 60-second marks to stop viewers from leaving`,

    "youtube": `Produce 5 blocks:
1. "Video Titles" — 5 high-CTR title options mixing: question, list, how-to, curiosity gap, and story formats
2. "Thumbnail Text" — 4 bold text overlays under 4 words each
3. "Tags" — 12 YouTube tags (4 broad, 4 specific, 4 niche)
4. "Description Opener" — 3 keyword-rich first sentences under 150 chars each
5. "Hook Scripts" — 3 opening 15-second video hooks`,

    "tiktok": `Produce 5 blocks:
1. "Hook Lines" — 5 scroll-stopping openers (pattern interrupt/question/bold claim)
2. "Hashtag Mix" — 10 tags: 3 mega (1B+), 4 mid (10M-100M), 3 niche (<1M)
3. "Captions" — 3 options (short punchy/storytelling/CTA-focused)
4. "Video Structure" — hook/value/CTA breakdown for this topic
5. "Sound Direction" — 3 audio style suggestions`,

    "instagram": `Produce 5 blocks:
1. "Captions" — 3 options (short <50 chars/storytelling 3-4 lines/list format)
2. "Hashtags" — 12 tags: 4 broad/5 niche/3 community
3. "CTA Ideas" — 4 endings that drive saves/shares/comments
4. "Story Ideas" — 3 Instagram Story concepts
5. "Reel Hook" — 3 first-frame visual concepts`,

    "seo": `Produce 5 blocks:
1. "Meta Titles" — 3 options under 60 chars, keyword-first
2. "Meta Descriptions" — 2 options under 155 chars with CTA
3. "Target Keywords" — 6 with type (head/long-tail/local) and intent
4. "Schema Types" — specific schema markup to implement
5. "Content Outline" — 5 H2 headings for a pillar article`,

    "pinterest": `Produce 5 blocks:
1. "Pin Titles" — 5 keyword-rich titles under 100 chars
2. "Descriptions" — 2 options 150-300 chars with keywords
3. "Board Names" — 4 board suggestions
4. "Pinterest Keywords" — 8 search keywords
5. "Visual Concepts" — 3 vertical pin image ideas`,


    // ── LINKEDIN POST GENERATOR ─────────────────────────────────────────────────────────────────────
    "linkedin-post-generator": `You are generating high-performing LinkedIn posts. Produce 4 blocks:

1. "LinkedIn Posts" — EXACTLY 5 complete, ready-to-publish LinkedIn posts. Each post format:
   "HOOK: [first line that stops the scroll — bold statement, surprising stat, or direct question]
   BODY: [3-5 short paragraphs with a personal story or data-driven insight, value-dense, no corporate jargon]
   CTA: [specific action: ask a question, link to resource, invite comments]
   HASHTAGS: [3-5 niche LinkedIn hashtags]"
   Rules:
   - Hook must be under 200 chars (it's the preview before 'see more')
   - Posts should feel human and personal, not press-release formal
   - Mix tones: storytelling, data-driven, controversial opinion, lesson learned, how-to
   - Each must be visually scannable with line breaks

2. "Hook Lines" — 10 standalone first-line options designed to stop the LinkedIn scroll:
   - 5 must start with a number or data point ("93% of creators...")
   - 3 must use the pattern "I [did something unexpected]. Here's what happened."
   - 2 must be controversial industry opinions

3. "Comment-Bait CTAs" — 8 end-of-post questions or prompts that drive comment engagement:
   - Target questions specific to the topic that professionals will want to answer
   - Include at least 2 poll-style CTAs ("Which do you prefer: A or B?")

4. "Content Angles" — 6 alternative LinkedIn angles for the same topic:
   (Lessons learned, Industry data breakdown, Career story, Contrarian take, Step-by-step how-to, Tools and resources roundup)`,

    // ── EMAIL SUBJECT LINE GENERATOR ──────────────────────────────────────────────────────────────
    "email-subject-generator": `You are generating email subject lines that maximize open rates. Produce 4 blocks:

1. "Subject Lines" — EXACTLY 15 email subject lines. Rules:
   - Each must be under 50 characters (mobile preview length)
   - Each must use a different psychological trigger
   - No clickbait that misleads about content
   Triggers to use (one per subject line minimum):
   Curiosity gap | Urgency | Personalization placeholder [First Name] | Controversy | Benefit-first | Question | Number/list | FOMO | Social proof | Exclusivity | Humor | Pain point | Story-start | Mystery | Direct/Plain

2. "A/B Test Pairs" — 5 pairs of subject lines testing different approaches for the same email:
   - Label each: "Version A: [subject]" vs "Version B: [subject]"
   - Explain in 1 line what each version is testing (length, tone, curiosity vs. direct, etc.)

3. "Preview Text" — 8 preview text options (the line that appears after the subject in the inbox, 80-110 chars). Rules:
   - Must complement the subject line and add new information
   - Should tease the body content without giving it away
   - Include at least 2 with personalization placeholders

4. "Spam Trigger Avoidance" — List 6 common words/phrases from this topic that should be avoided in email subjects because they trigger spam filters, and provide a clean alternative for each`,

    // ── CONTENT CALENDAR GENERATOR ───────────────────────────────────────────────────────────────
    "content-calendar-generator": `You are generating a complete 30-day content calendar. Produce 5 blocks:

1. "30-Day Calendar" — EXACTLY 30 daily content ideas. Format each as:
   "Day [N]: [Platform] — [Content type] — [Topic/Angle] | Hook: [First line]"
   Rules:
   - Distribute across: YouTube (8 days), Instagram (8 days), TikTok (7 days), LinkedIn (4 days), Blog (3 days)
   - Mix content types: Tutorial, Behind-the-scenes, Educational, Reaction/Opinion, Story, Listicle, Q&A, Collab, Repurposed
   - Each day must be a different angle on the main topic — no repeats
   - Hook must be under 100 chars and ready to use as the first line
   - Week 1: Foundation content (basics, intro, awareness)
   - Week 2: Value content (tutorials, tips, how-tos)
   - Week 3: Social proof + storytelling (case studies, results, journey)
   - Week 4: Conversion content (CTAs, offers, community engagement)

2. "Weekly Themes" — 4 weekly themes with a one-line brief and the content goal for each week

3. "Repurposing Map" — 5 content repurposing strategies showing how to turn one piece of content into 4-5 platform-specific formats:
   "Original: [type] → Repurpose to: [list of platforms and formats]"

4. "Hashtag Bank" — 20 hashtags to rotate throughout the month. Group: 5 broad (5M+ posts), 8 niche (100K-1M posts), 7 micro (10K-100K posts)

5. "Content Batching Plan" — A weekly batching schedule (what to film/write/schedule each day of the production week) so the creator stays ahead by 7 days`,

    // ── VIDEO SCRIPT GENERATOR ───────────────────────────────────────────────────────────────
    "video-script-generator": `You are generating a complete, ready-to-film video script. Produce 4 blocks:

1. "Full Script" — A complete video script written as spoken dialogue. Structure:
   HOOK (0-5 sec): [1-2 sentences that immediately grab attention — bold claim, surprising stat, or visual action cue]
   INTRO (5-30 sec): [Introduce yourself briefly, establish credibility, preview what viewer will learn — max 3 sentences]
   SECTION 1 (30-90 sec): [First main point — explain the concept, give an example, bridge to section 2]
   SECTION 2 (90-150 sec): [Second main point — deepen the value, include a specific tip or step]
   SECTION 3 (150-210 sec): [Third main point or case study/result — make it tangible with a real example]
   PATTERN INTERRUPT (210 sec): [One sentence that re-engages viewers who are drifting — a question, surprising fact, or "but wait"]
   CTA (last 30 sec): [Strong call to action — subscribe, comment, follow, use link — make it specific and personal]
   OUTRO (final 10 sec): [Tease next video, thank viewers, sign-off line]
   Rules:
   - Write EXACTLY as the creator would say it — conversational, punchy, no passive voice
   - Include [B-ROLL CUE] notes where visuals should cut away
   - Include [PAUSE] where the creator should let a point land
   - Target 5-8 minutes of content (approximately 750-1200 words of script)

2. "Hook Alternatives" — 5 alternative hook options for A/B testing. Each must use a different approach:
   Bold statement | Surprising statistic | Relatable struggle | Question | Visual action

3. "Thumbnail & Title Bundle" — For this specific script:
   3 title options (different CTR hooks)
   2 thumbnail concepts (visual + text overlay + emotion)
   5 relevant tags

4. "Script Timestamps" — Generate chapter markers in YouTube timestamp format:
   00:00 — [section name]
   Format all 6-8 chapters based on the script structure above`,
  };

  // Match tool slugs to their extra prompts
  const slugMap: Record<string, string> = {
    "all-in-one-creator-kit": "all-in-one-creator-kit",
    "content-idea-generator": "content-idea-generator",
    "viral-hook-generator": "viral-hook-generator",
    "blog-topic-generator": "blog-topic-generator",
    "ai-thumbnail-generator": "ai-thumbnail",
    "ai-thumbnail-concept-generator": "ai-thumbnail",
    "ai-post-generator": "ai-post-generator",
    "social-post-generator": "social-post-generator",
    "video-hook-generator": "video-hook-generator",
    "linkedin-post-generator": "linkedin-post-generator",
    "email-subject-generator": "email-subject-generator",
    "content-calendar-generator": "content-calendar-generator",
    "video-script-generator": "video-script-generator",
    "youtube": "youtube",
    "tiktok": "tiktok",
    "instagram": "instagram",
    "seo": "seo",
    "pinterest": "pinterest",
  };

  // Check for direct slug match first
  if (slugMap[slug] && extras[slugMap[slug]]) {
    return base + "\n\nTool-specific instructions:\n" + extras[slugMap[slug]];
  }

  // Partial slug matching for category-level tools
  for (const [key, extra] of Object.entries(extras)) {
    if (slug.includes(key.split("-")[0]) && key !== "all-in-one-creator-kit") {
      return base + "\n\nTool-specific instructions:\n" + extra;
    }
  }

  return base + `\n\nFor "${name}", produce 4 relevant blocks with specific, actionable items. Each block should have 5-8 items.`;
}

function buildUserPrompt(
  tool: { slug: string; name: string; category: string },
  input: string,
  extras?: Record<string, string>
): string {
  const parts = [`Tool: ${tool.name}`, `User topic/input: "${input}"`];
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      if (v) parts.push(`${k}: ${v}`);
    }
  }
  parts.push("Generate specific, actionable content directly referencing the topic above. Never use generic placeholders.");
  return parts.join("\n");
}

function parseJSON(raw: string): AIToolResult {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    const p = JSON.parse(clean) as AIToolResult;
    if (!p.headline || !Array.isArray(p.blocks)) throw new Error("bad shape");
    return p;
  } catch {
    return {
      headline: "Result ready",
      summary: "AI returned an unexpected format. Try a more specific prompt.",
      badge: "AI output",
      score: "—",
      blocks: [{ label: "Response", items: [clean.slice(0, 400)] }],
    };
  }
}

// ─── Provider: Anthropic ──────────────────────────────────────────────────────
async function callAnthropic(system: string, user: string, key: string): Promise<AIToolResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(e.error?.message ?? `Anthropic ${res.status}`);
  }
  const d = await res.json() as { content?: { type: string; text: string }[] };
  return parseJSON((d.content ?? []).find(b => b.type === "text")?.text ?? "");
}

// ─── Provider: OpenAI ────────────────────────────────────────────────────────
async function callOpenAI(system: string, user: string, key: string): Promise<AIToolResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(e.error?.message ?? `OpenAI ${res.status}`);
  }
  const d = await res.json() as { choices: { message: { content: string } }[] };
  return parseJSON(d.choices[0]?.message?.content ?? "");
}

// ─── Provider: Pollinations (FREE — no key required) ─────────────────────────
// Uses Pollinations.ai text generation — free for everyone, no sign-up needed.
// Model: openai-large (equivalent to GPT-4o) via Pollinations free proxy.
async function callPollinations(system: string, user: string): Promise<AIToolResult> {
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      model: "openai-large",
      jsonMode: true,
      seed: Math.floor(Math.random() * 99999),
    }),
  });
  if (!res.ok) throw new Error(`Free AI service returned ${res.status}. Please try again.`);
  const text = await res.text();
  return parseJSON(text);
}

// ─── Main entry point ─────────────────────────────────────────────────────────
// Provider priority: explicit paid provider → any available paid key → free Pollinations
export async function runAITool(
  tool: { slug: string; name: string; category: string },
  input: string,
  provider: AIProvider,
  extras?: Record<string, string>
): Promise<AIToolResult> {
  const ak = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const ok = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const system = getSystemPrompt(tool.slug, tool.name);
  const user = buildUserPrompt(tool, input, extras);

  try {
    // Use the explicitly chosen paid provider if key exists
    if (provider === "anthropic" && ak) return await callAnthropic(system, user, ak);
    if (provider === "openai" && ok) return await callOpenAI(system, user, ok);

    // Fall back to any available paid key
    if (ak) return await callAnthropic(system, user, ak);
    if (ok) return await callOpenAI(system, user, ok);
  } catch (err) {
    console.warn("Paid API failed, falling back to Pollinations:", err);
  }

  // Free fallback — always works, no key needed
  return await callPollinations(system, user);
}

// ─── Detect which provider will be used (for UI display) ─────────────────────
export function getActiveProvider(): { name: string; isFree: boolean } {
  const ak = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const ok = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (ak) return { name: "Claude (Anthropic)", isFree: false };
  if (ok) return { name: "GPT-4o (OpenAI)", isFree: false };
  return { name: "Pollinations AI", isFree: true };
}

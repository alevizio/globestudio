# AI / LLM integration paths for Globestudio

**Date:** 24 May 2026
**Sources consulted:** 9 primary vendor pages + 14 secondary articles
**Confidence:** High on landscape scan and BYOK pattern · Medium on the specific Globestudio UX flow (untested)
**Status:** Research only — no plan committed yet. Recommendation in TL;DR.

## TL;DR

**Do not ship an AI feature at launch (May 27).** Ship one, narrow, opt-in feature roughly **3 months post-launch (late August 2026)**: a **"Describe a look" prompt box** that converts a text description into a Globestudio config JSON, executed via a **BYO API key** flow (OpenAI / Anthropic / OpenRouter, user-supplied). No backend, no maintainer cost, no signup. The pitch becomes: *"No signup. No API key — unless you want AI, in which case bring your own."*

Why this and not the others:
- The product already exposes a **JSON schema for every customization** (`/schema/config.json`) and **21 named presets**. That's an almost-ideal substrate for structured-output LLM generation — the model picks values inside known ranges, no hallucinated UI, deterministic preview.
- It maps cleanly onto a problem people actually have: *"I want a globe that matches my brand / vibe, but I don't want to learn 40 knobs."* That same problem is why First Draft, v0, and Galileo all exist.
- BYOK in 2026 is now a normalized pattern (JetBrains shipped it Dec 2025, Warp has it, Factory has it, GitHub Copilot SDK has it). Users no longer flinch at it. ([JetBrains AI Blog](https://blog.jetbrains.com/ai/2025/12/bring-your-own-key-byok-is-now-live-in-jetbrains-ides/), [Warp docs](https://docs.warp.dev/support-and-community/plans-and-billing/bring-your-own-key/))
- Implementation is small (a single prompt + JSON schema + a tiny key-storage UI + a config validator we already need). No new backend.

The "no signup, no API key" promise survives intact because **AI is purely optional and disabled by default**. The free, non-AI path remains the entire product.

What to *not* build at launch: brand-asset color extraction (premature — solvable with `extract-colors` non-AI), country-aesthetic auto-pick (cute, low value, smells like racial stereotype risk), "explain the shaders" copilot (educational, low ROI vs. just writing docs), AI SVG layer naming (tiny win, not worth the complexity).

---

## 1. The 2026 design-tool AI landscape

The single sentence summary: **every commercial tool now ships generative AI; every open-source tool either ships nothing, or ships MCP integration and lets users bring their own model.** Pricing pressure is real — Vercel v0 already moved from fixed credits to token-based billing in Feb 2026 because generation costs were unpredictable. ([UI Bakery — v0 pricing 2026](https://uibakery.io/blog/vercel-v0-pricing-explained-what-you-get-and-how-it-compares))

### 1.1 Figma — First Draft, Figma Make, Agent

Figma's AI suite is the most-deployed of the bunch and the one most relevant to Globestudio because both are *design surfaces* not code surfaces.

- **First Draft:** type a prompt → editable wireframe with auto-layout, contextual content, components. The May 20, 2026 update folds First Draft into a beta "Figma agent" that handles exploration + iteration in one entry point. ([Figma Learn — First Draft](https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI), [LogRocket — Figma AI 2026](https://blog.logrocket.com/ux-design/figma-ai-2026-quick-overview/))
- **Figma Make:** prompt → interactive prototype with states and missing-screen fill-in. ([Figma Make](https://www.figma.com/make/))
- **Pricing:** credit system shared across all AI features. Pro at $12/mo gets 3,000 credits/mo "sufficient for daily design work." Heavy users blow through it. ([SimilarLabs — Figma AI Review 2026](https://similarlabs.com/blog/figma-ai-review))
- **Model/provider:** Figma does not publish exact model choice; uses a mix of in-house and third-party models behind their own gateway.
- **Privacy:** prompts go to Figma's backend; they pay the API cost, the user pays via subscription.

**Lesson for Globestudio:** the *prompt → editable design* loop is the proven primary UX. Not "generate an image", but "generate a config that I can keep tweaking." This matches Globestudio exactly: prompt → preset config → user keeps editing knobs.

### 1.2 Vercel v0 — the canonical AI-design success

v0 is the cleanest case study of "AI in the design tool worked." Free tier ($5 credit, enough for several small projects), Premium $20/mo, Team $30/seat. Three model tiers (Mini at $1/$5 per M tokens; Standard; Max). In Feb 2026 it switched to **token-based pricing** because generation costs varied 100× by complexity. ([NxCode — v0 Complete Guide 2026](https://www.nxcode.io/resources/news/v0-by-vercel-complete-guide-2026), [UI Bakery — v0 pricing](https://uibakery.io/blog/vercel-v0-pricing-explained-what-you-get-and-how-it-compares), [Vibe Coder — v0 guide](https://blog.vibecoder.me/v0-by-vercel-complete-guide))

**Lesson:** Even Vercel — with infinite cash and their own AI gateway — can't predict their own AI cost per user. For a solo OSS maintainer, eating inference cost is a non-starter.

### 1.3 Framer Workshop — AI inside an existing design tool

Workshop is Framer's "describe a component and get it" feature, branded as an AI plugin in the Marketplace. The 2026 pricing is Free / Basic $15 / Pro $45 / Scale $100. Notably, Framer also exposes **third-party AI plugin integrations with OpenAI, Anthropic, and Gemini for content + image generation** — i.e. they're doing partial BYOK already inside a closed platform. ([Framer Workshop](https://www.framer.com/workshop/), [CostBench — Framer Pricing 2026](https://costbench.com/software/ai-design-tools/framer/))

**Lesson:** even commercial tools find it cheaper to expose third-party AI providers than to ship their own. Reinforces BYOK.

### 1.4 Galileo AI → Google Stitch (the cautionary tale)

Galileo AI launched 2022 as "text → UI mockup", got acquired by Google on **May 21, 2025**, was folded into **Google Stitch** (Gemini-powered), and as of early 2026 Stitch is free in beta with generation limits. ([Crunchbase — Galileo AI acquisition](https://www.crunchbase.com/acquisition/google-acquires-galileo-ai--fd007aa9), [Banani — Galileo AI 2026 review](https://www.banani.co/blog/galileo-ai-features-and-alternatives), [Carbon Copies — Google + Galileo AI](https://www.carboncopies.ai/blog/googles-galileo-ai))

**Lesson:** a pure "prompt → design" product is acquisition bait, not a defensible standalone. Globestudio should treat AI as a feature *of* the tool, not as the tool itself.

### 1.5 Magic Patterns — design system-aware generation

Magic Patterns ($20 / $100 / Enterprise) generates UI from prompts that **match your existing design ecosystem (palette, typography, components)**. Agent 2.0 launched April 23, 2026. ([Magic Patterns](https://www.magicpatterns.com/), [AI Productivity — Magic Patterns Pricing 2026](https://aiproductivity.ai/pricing/magic-patterns/))

**Lesson:** the most useful AI feature isn't "generate from nothing" — it's "generate consistent with the constraints I already gave you." For Globestudio, the constraint is the 21-preset taxonomy + the JSON schema. The model never invents new shaders, only picks from valid ones.

### 1.6 tldraw "Make Real" — the BYOK exemplar

tldraw's Make Real is the strongest single precedent for what Globestudio should do. It sketches → working HTML via GPT-4 (now multi-model: OpenAI, Anthropic, Google). The original launch required users to **paste their own OpenAI API key into a text input** — Steve Ruiz called this "usually a security risk, but necessary." It worked. It's still the pattern. ([tldraw — Make Real, the story so far](https://tldraw.dev/blog/make-real-the-story-so-far), [GitHub — tldraw/make-real-starter](https://github.com/tldraw/make-real-starter))

**Lesson:** the entire BYOK-in-the-browser ergonomic was effectively normalized by this product. Globestudio can copy the pattern almost verbatim.

### 1.7 Penpot — the OSS parallel

Penpot (open-source, Kaleidos foundation, MPL) is the closest thing in the OSS design world to Globestudio's positioning. Their AI strategy is *not* "we ship a model" — it's **MCP servers** so designers can use *their own AI client* (Claude Desktop, Cursor, etc.) to operate on Penpot files. ([Penpot — MCP experimentation, Smashing Magazine, Jan 2026](https://www.smashingmagazine.com/2026/01/penpot-experimenting-mcp-servers-ai-powered-design-workflows/), [Penpot GitHub](https://github.com/penpot/penpot))

**Lesson:** an OSS tool that wanted to avoid the SaaS-backend trap chose **MCP + bring-your-own-client** instead of shipping AI features themselves. This is a viable second-track for Globestudio later — expose a Globestudio MCP server so Claude/ChatGPT can drive the tool. Out of scope for launch, but worth tracking.

### 1.8 Excalidraw — text-to-diagram via Mermaid

Excalidraw added "Text → Diagram" inside the editor. It uses an AI model to produce Mermaid syntax, then their `mermaid-to-excalidraw` library renders editable shapes. They've also become an MCP target (Nimbalyst extension, Claude Desktop connector). ([excalidraw/mermaid-to-excalidraw](https://github.com/excalidraw/mermaid-to-excalidraw), [Nimbalyst — diagram tools 2026](https://nimbalyst.com/blog/best-ai-diagram-tools-2026/))

**Lesson:** the *intermediate representation* matters. Excalidraw's AI emits Mermaid (a known DSL), not raw shapes. For Globestudio the equivalent is **emit a config JSON conforming to `/schema/config.json`** — the existing schema is the IR. Don't ask the LLM to render dots; ask it to fill the schema.

### 1.9 Recraft and the "make pretty images" lane

Recraft does text → SVG vector at $25/mo Pro, free tier with public output. ([SVG Genie — Recraft Review 2026](https://www.svggenie.com/blog/recraft-ai-review-2026)) Relevant only as a comparison: Globestudio is not in the asset-generation lane. The model never *renders* the globe; the existing renderer does. AI's only job is to choose knobs.

---

## 2. Brainstormed candidates & scoring

Scoring legend: User value 1-10. Effort: S/M/L. Cost: free/API/host. "Promise" = preserves "no signup, no API key" promise.

| # | Candidate | Value | Effort | Cost | Privacy | Promise | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **"Describe a look" → config JSON** (prompt → preset URL) | **8** | S | BYOK (free for maintainer) | User's chosen provider | Preserved (opt-in) | **SHIP** (post-launch) |
| 2 | Brand-asset → styled globe (upload logo/palette → matched config) | 7 | M | BYOK for vibe parsing; free for color extraction | User's provider gets the image | Preserved (opt-in) | Phase 2 |
| 3 | Country-context preset auto-pick (Japan → Risograph) | 3 | S | n/a (rules table) | n/a | Preserved | **Pass.** Cute, low value, racial/cultural stereotype landmine |
| 4 | Natural-language preset search in looks bar ("moody print" → filter) | 5 | S | Could be local — fuzzy match on hand-tuned tags, no LLM | Local | Preserved | **Ship without AI.** Just tag the 21 presets with adjectives |
| 5 | "Why does this look this way?" shader-explainer LLM | 3 | M | BYOK | User's provider | Preserved | **Pass.** Replace with good shader docs/tooltips |
| 6 | AI-named SVG layers on export | 2 | S | BYOK | User's provider | Preserved | **Pass.** Marginal value, free with rule-based naming from config keys |
| 7 | MCP server (Globestudio MCP) → Claude/ChatGPT drive the tool | 6 | M | free | User's AI client | Preserved | Phase 3 — watch Penpot |
| 8 | Client-side WebLLM "describe a look" with Qwen2.5-0.5B | 4 | L | free (no API) | Fully local | Preserved completely | Tempting but premature (see §4) |
| 9 | Auto-config from arbitrary image (photo → matching globe vibe) | 6 | L | BYOK with vision | User's vision provider | Preserved | Phase 2 candidate, paired with #2 |

**Top candidate is unambiguously #1.** It's the smallest, highest-value, lowest-risk, and the one with the cleanest fit to Globestudio's existing surface (JSON schema + named presets).

---

## 3. Deep-dive: "Describe a look" feature

### 3.1 UX flow

```
[Looks bar]  Halftone | Risograph | Aurora | ... | + Describe your own ▸
                                                       └─ opens panel
[Panel]
  ┌──────────────────────────────────────────────────┐
  │  Describe a look                                 │
  │  ┌────────────────────────────────────────────┐  │
  │  │ synthwave vibes for a SaaS landing page   │  │
  │  └────────────────────────────────────────────┘  │
  │                                                  │
  │  [Generate]                                      │
  │                                                  │
  │  Powered by your own OpenAI / Anthropic key.    │
  │  Globestudio never sees your prompt or key.     │
  │  [ Set up key ]   How does this work?           │
  └──────────────────────────────────────────────────┘
```

Behavior:
1. First-time click on Generate → prompts for API key (provider dropdown: OpenAI / Anthropic / OpenRouter / custom OpenAI-compatible base URL).
2. Key stored in `localStorage` (with explicit "stored in your browser, not sent to us" copy). Optional checkbox: *session-only*.
3. Submit posts to provider directly from the browser. Response is a JSON object validated against `/schema/config.json`. Invalid output → one retry with the validation error appended.
4. On valid output: globe re-renders, the panel shows "Pick a base preset to start from: [Halftone] [Risograph] [Aurora]…" — the model also returns `baseLook`, so we can construct the URL `/looks/<baseLook>?c=<base64(config)>`.
5. User can keep tweaking knobs. The AI is just a *starting point*, never the final state.

### 3.2 Implementation sketch

- **Prompt:** ~600-token system prompt that:
  - Describes Globestudio's surface (presets, knobs, shaders, projections).
  - Provides the JSON schema inline (or a compressed summary).
  - Includes 3-4 few-shot examples: `"synthwave vibes for a SaaS landing page"` → `{baseLook: "aurora", density: 240, ...}`; `"newsprint, melancholy"` → `{baseLook: "newsprint", ...}`; etc.
  - Forbids new shader names; the model picks from a fixed enum.
- **Schema enforcement:** use the provider's structured output mode.
  - OpenAI: `response_format: { type: "json_schema", strict: true }` — works on `gpt-4o`, `gpt-4o-mini`, `gpt-4.1` family. ([OpenAI structured outputs / Pockit](https://pockit.tools/blog/llm-structured-output-2026-stop-parsing-json-with-regex-and-do-it-right))
  - Anthropic: tool-use / structured outputs on Claude Haiku 4.5 — GA, ~5-10× cheaper than larger models. ([Anthropic — Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [SaltTechno — LLM comparison 2026](https://www.salttechno.ai/datasets/llm-model-comparison-2026/))
- **Default model recommendation in the UI:** `claude-haiku-4.5` or `gpt-4.1-mini`. Both handle this schema cleanly, both are sub-cent per generation.
  - Cost order of magnitude per call: ~1.5K input tokens (prompt+schema) + ~400 output tokens → **GPT-4.1 mini ≈ $0.0013/call; Claude Haiku 4.5 ≈ similar or cheaper.** ([Salt Techno LLM comparison 2026](https://www.salttechno.ai/datasets/llm-model-comparison-2026/))
  - At BYOK, this cost is the user's, not Globestudio's. A user could generate 1,000 looks for ~$1.30 of their own credit.
- **Storage:** key in `localStorage` under `globestudio.byok.{provider}`; never transmitted to any Globestudio-owned origin (there isn't one). The provider call is `fetch('https://api.openai.com/...')` straight from the browser.
- **Security copy:** in-product disclosure that BYOK means the prompt + provider request go to OpenAI/Anthropic/etc. per *their* privacy policy, not Globestudio's. Same disclosure Warp uses: "we cannot enforce Zero Data Retention through your key." ([Warp BYOK docs](https://docs.warp.dev/support-and-community/plans-and-billing/bring-your-own-key/))
- **Rate limiting:** none needed — the user's provider does it.

### 3.3 Why the schema-as-IR design pattern works here

Globestudio is unusually well-suited because **every customization is already JSON-serializable** and the schema is small. The model is doing a constrained selection problem (pick from N shaders, pick value within range), not a generative problem. This is the same trick Excalidraw uses with Mermaid — never generate the rendering primitives, only the IR. ([excalidraw/mermaid-to-excalidraw](https://github.com/excalidraw/mermaid-to-excalidraw))

A constrained, schema-validated JSON output also means **bad generations fail loudly** (caught by the validator) rather than producing broken globes. The renderer never sees a malformed config.

### 3.4 Failure modes & mitigations

- **User pastes invalid key:** show the provider's error verbatim ("Incorrect API key provided"). Don't try to be clever.
- **Provider rate-limited:** surface their `429`, suggest waiting. Not the maintainer's problem.
- **Schema-invalid output:** one auto-retry with the validator error appended to the prompt. If still invalid, fall back to the closest valid preset and surface a "we couldn't parse this, here's our best guess" note.
- **Cost surprise:** show estimated tokens before generation, and cumulative request count for the session. The Vercel v0 lesson: cost predictability matters, and unlike v0, *we don't pay* — but the user does, and they deserve visibility.
- **Provider deprecation / model swap:** the prompt + schema live in source; pin model versions, ship updates with quarterly review. Single source file: `src/ai/prompt.ts`.

### 3.5 Estimated effort

- BYOK key UI + storage: 1 day.
- Provider adapters (OpenAI + Anthropic, both via `fetch`): 1 day.
- Prompt + schema + few-shots: 2 days (iteration).
- Output validator + retry loop: 0.5 day.
- "Describe a look" panel UI: 1 day.
- Docs page explaining BYOK / privacy: 0.5 day.
- E2E tests with mocked providers: 1 day.

**Total: ~7 dev-days.** Achievable for one maintainer in a 2-3 week elapsed window post-launch.

---

## 4. WebLLM / client-side inference — feasibility in 2026

The dream answer is "no API key at all; the model runs in the browser." Let's check the 2026 state honestly.

**The good:**
- WebGPU now ships by default in Chrome, Edge, Firefox 118+, and Safari Technology Preview — ~82.7% of global browser traffic. ([SitePoint — WebGPU vs WASM benchmarks](https://www.sitepoint.com/webgpu-vs-webasm-transformers-js/), [Pockit — Running LLMs in the browser](https://pockit.tools/blog/run-llms-browser-webgpu-transformers-js-chrome-built-in-ai-guide/))
- WebLLM and Transformers.js v4 are mature. Llama 3.1 8B (4-bit) hits ~41 tok/s on M3 Max in a Chrome tab; Phi 3.5 mini ~71 tok/s. ([MLC WebLLM](https://github.com/mlc-ai/web-llm), [Pockit — LLMs in browser](https://pockit.tools/blog/run-llms-browser-webgpu-transformers-js-chrome-built-in-ai-guide/))
- Sub-2GB quantized models (Qwen2.5-0.5B, Llama-3.2-1B) "run at interactive speeds on consumer hardware." ([BuildMVPFast — WebGPU 2026](https://www.buildmvpfast.com/blog/webgpu-browser-ai-inference-cost-savings-2026))

**The bad, for *this* use case:**
- A 1-2GB model download blocks first-use by 30s-2min on typical connections. Globestudio's whole value is "instant"; gating AI behind a multi-hundred-MB download breaks the vibe.
- Safari production support is still inconsistent. Globestudio explicitly targets Safari (see `docs/research/2026-05-mobile-safari-webgl.md`).
- Sub-2B-parameter models are weak at *constrained JSON output* — that's exactly the use case they're least good at. Bigger models, smarter generation; we'd need at minimum a 3-7B model, which makes the download tax worse.
- Globestudio's renderer is already pushing the GPU hard. Sharing WebGPU with an inference workload competes for the same resource, especially on mobile.

**Verdict:** **defer.** Re-evaluate in 6-12 months once 1-2B models are competitive on structured output and Safari WebGPU is solid. Until then, BYOK to a cloud model is the right path.

What *is* worth doing client-side right now without an LLM: candidate #4 (natural-language preset search). Tag each of the 21 presets with 5-10 adjectives ("moody", "vintage", "high-contrast", "noir", "newsprint"), and do client-side fuzzy match. Zero model needed. Probably 80% of the value of an AI search bar at 0% of the cost.

---

## 5. BYOK pattern — state of the art

By mid-2026, BYOK is **the default in OSS and a normalized option in commercial tools.** Concretely:

- **JetBrains** shipped BYOK across AI Chat + agents in December 2025, supporting Anthropic, OpenAI, and OpenAI-compatible endpoints. ([JetBrains AI Blog](https://blog.jetbrains.com/ai/2025/12/bring-your-own-key-byok-is-now-live-in-jetbrains-ides/))
- **Warp** offers BYOK with an explicit "we cannot enforce ZDR through your key" disclosure. ([Warp BYOK docs](https://docs.warp.dev/support-and-community/plans-and-billing/bring-your-own-key/))
- **GitHub Copilot SDK** ships BYOK for embedding Copilot in third-party tools. ([GitHub Docs — Copilot SDK BYOK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/authenticate-copilot-sdk/bring-your-own-key))
- **Factory, CodeGPT, OpenRouter** all expose BYOK as first-class. ([Factory BYOK](https://docs.factory.ai/cli/byok/overview), [CodeGPT BYOK](https://www.codegpt.co/bring-your-own-api-key), [OpenRouter BYOK](https://openrouter.ai/docs/guides/overview/auth/byok))
- **Continue.dev** (closest OSS parallel) uses YAML config with provider entries; the convention is `apiBase` + `apiKey` per provider, and users can target *any* OpenAI-compatible endpoint. ([Continue.dev — Models](https://docs.continue.dev/customize/models))

**The recommended pattern for Globestudio:**

```yaml
# Pseudocode mental model — actually stored in localStorage as JSON
provider: openai          # | anthropic | openrouter | custom
apiBase: https://api.openai.com/v1   # editable for OpenAI-compat endpoints
apiKey: sk-...
model: gpt-4.1-mini       # dropdown with sensible defaults per provider
```

**OpenRouter is the unsung hero here.** A single key works across 100+ models. Recommending OpenRouter as the default provider in the dropdown lets users pick from any model in one place and gives Globestudio a one-implementation path. ([OpenRouter BYOK](https://openrouter.ai/docs/guides/overview/auth/byok))

**Privacy positioning** (copy for the BYOK setup screen):

> Globestudio runs entirely in your browser. When you use AI features, your prompt is sent **directly from your browser** to the provider you chose, using your own API key. We never see your key, your prompt, or the response. The provider's privacy policy applies — make sure you're comfortable with it.

This matches industry-standard BYOK disclosure and inherits the privacy stance from the user's chosen provider.

---

## 6. Brand-asset → styled globe (candidate #2, phase 2)

A quick note because this came up specifically in the prompt: this is the *second* feature to consider, not the first.

The right architecture splits the problem:

1. **Color extraction:** purely client-side. Use `extract-colors` (~6kB, no deps) or `Color Thief` — these are mature 2026 libraries that work on uploaded images via Canvas. No AI needed. ([extract-colors npm](https://www.npmjs.com/package/extract-colors), [Color Thief](https://lokeshdhakar.com/projects/color-thief/))
2. **Aesthetic interpretation:** "given these 5 brand colors + this brand description, pick a Globestudio config." This part *is* a constrained LLM problem (same prompt-to-config flow as candidate #1, with the palette injected into the prompt as additional context).

So this feature is "candidate #1 + image upload + color extraction." Ship #1 first; #2 is an incremental addition once the BYOK rails exist.

A vision-model variant (upload a brand photo, model reads the vibe directly) is technically possible — Claude / GPT-4o / Gemini all do vision. Adds cost (~$0.005-0.02/call instead of $0.001) and complexity. Worth piloting after #1 is proven.

---

## 7. Timing recommendation

| Option | When | Pros | Cons |
|---|---|---|---|
| Ship AI at launch (May 27) | T+3d | "AI" in launch copy → press / Show HN buzz | Untested feature on launch day, distracts from core value (the 21 hand-tuned looks). High blast radius if it embarrasses |
| **Ship 3 months out (Aug 2026)** | **T+90d** | **Launch goes clean on the core product; AI follows as a "new feature" announcement → second wave of press; time to dogfood + iterate the prompt** | None significant |
| Ship 6 months out (Nov 2026) | T+180d | More mature client-side inference may be ready | Misses the cultural moment; competitors may ship similar first |
| Pass entirely | — | Stays purely no-signup, no-key | Leaves obvious value on the table; the prompt → config pattern is genuinely well-suited here |

**Recommendation: T+90 days, ship "Describe a look" as a single, narrow, opt-in BYOK feature.**

The reason to not ship at launch is *not* that AI is bad — it's that the launch story should be *"21 hand-tuned looks, instant, no signup"* and the AI story should be *its own moment* later. Two narratives, two press cycles, less cognitive load on launch day.

---

## 8. Open questions for the maintainer

1. Are we comfortable with the "if you use AI, your data goes to OpenAI/Anthropic per their policy" disclosure? Likely yes given Globestudio is otherwise zero-data, but worth a deliberate decision.
2. Do we want a "Globestudio MCP server" track (Penpot's path) in parallel? My read is *yes, but later* — let MCP mature in the design space for 6 more months.
3. Is there an interest in submitting to the OpenRouter "App Showcase" once shipped? Free distribution to the BYOK-aware audience.
4. Do we want telemetry on AI usage (counts only, no content)? Useful for understanding adoption, but breaks the "no telemetry" pitch. I'd say *no telemetry*; rely on GitHub stars / community feedback.

---

## Sources

Primary vendor docs / pages:
- [Figma AI overview](https://www.figma.com/ai/)
- [Figma — First Draft help](https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI)
- [Figma Make](https://www.figma.com/make/)
- [Vercel v0 pricing page](https://v0.app/pricing) / [Introducing the new v0](https://vercel.com/blog/introducing-the-new-v0)
- [Framer Workshop plugin](https://www.framer.com/workshop/)
- [tldraw — Make Real, the story so far](https://tldraw.dev/blog/make-real-the-story-so-far) / [tldraw/make-real-starter on GitHub](https://github.com/tldraw/make-real-starter)
- [Penpot on GitHub](https://github.com/penpot/penpot)
- [Penpot AI / MCP — Smashing Magazine, Jan 2026](https://www.smashingmagazine.com/2026/01/penpot-experimenting-mcp-servers-ai-powered-design-workflows/)
- [excalidraw/mermaid-to-excalidraw](https://github.com/excalidraw/mermaid-to-excalidraw)
- [MLC WebLLM](https://github.com/mlc-ai/web-llm)
- [Continue.dev — Models docs](https://docs.continue.dev/customize/models)
- [Anthropic — Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Warp — BYOK docs](https://docs.warp.dev/support-and-community/plans-and-billing/bring-your-own-key/)
- [JetBrains AI Blog — BYOK live, Dec 2025](https://blog.jetbrains.com/ai/2025/12/bring-your-own-key-byok-is-now-live-in-jetbrains-ides/)
- [GitHub Docs — Copilot SDK BYOK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/authenticate-copilot-sdk/bring-your-own-key)
- [Factory — BYOK overview](https://docs.factory.ai/cli/byok/overview)
- [OpenRouter — BYOK guide](https://openrouter.ai/docs/guides/overview/auth/byok)
- [extract-colors npm](https://www.npmjs.com/package/extract-colors)
- [Color Thief](https://lokeshdhakar.com/projects/color-thief/)

Secondary analysis (cited for landscape / pricing / benchmarks):
- [LogRocket — Figma AI 2026 quick overview](https://blog.logrocket.com/ux-design/figma-ai-2026-quick-overview/)
- [SimilarLabs — Figma AI Review 2026](https://similarlabs.com/blog/figma-ai-review)
- [NxCode — v0 Complete Guide 2026](https://www.nxcode.io/resources/news/v0-by-vercel-complete-guide-2026)
- [UI Bakery — v0 pricing explained](https://uibakery.io/blog/vercel-v0-pricing-explained-what-you-get-and-how-it-compares)
- [Vibe Coder — v0 complete guide](https://blog.vibecoder.me/v0-by-vercel-complete-guide)
- [CostBench — Framer Pricing 2026](https://costbench.com/software/ai-design-tools/framer/)
- [Crunchbase — Google acquires Galileo AI, May 2025](https://www.crunchbase.com/acquisition/google-acquires-galileo-ai--fd007aa9)
- [Banani — Galileo AI / Google Stitch 2026 review](https://www.banani.co/blog/galileo-ai-features-and-alternatives)
- [Carbon Copies — What Google's Galileo AI acquisition tells us](https://www.carboncopies.ai/blog/googles-galileo-ai)
- [Magic Patterns — pricing 2026](https://aiproductivity.ai/pricing/magic-patterns/)
- [Pockit — Running LLMs in the browser](https://pockit.tools/blog/run-llms-browser-webgpu-transformers-js-chrome-built-in-ai-guide/)
- [SitePoint — WebGPU vs WASM benchmarks](https://www.sitepoint.com/webgpu-vs-webasm-transformers-js/)
- [BuildMVPFast — WebGPU browser AI inference 2026](https://www.buildmvpfast.com/blog/webgpu-browser-ai-inference-cost-savings-2026)
- [Salt Techno — LLM Model Comparison 2026](https://www.salttechno.ai/datasets/llm-model-comparison-2026/)
- [Pockit — LLM Structured Output 2026](https://pockit.tools/blog/llm-structured-output-2026-stop-parsing-json-with-regex-and-do-it-right)
- [SVG Genie — Recraft AI Review 2026](https://www.svggenie.com/blog/recraft-ai-review-2026)
- [Nimbalyst — Best AI diagram tools 2026](https://nimbalyst.com/blog/best-ai-diagram-tools-2026/)

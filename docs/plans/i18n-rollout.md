# Internationalization rollout plan

**Status:** Draft
**Date opened:** 19 May 2026
**Owner:** Alejandro
**Research basis:** [`docs/research/2026-05-internationalization.md`](../research/2026-05-internationalization.md)

## Goal

Reach non-English-speaking designers without committing to the full
weight of UI translation up-front. Two-tier rollout: **country
names in 5+ languages** (cheap, immediate) → **full UI translation
infrastructure** (heavier, gated on demand).

## Non-goals

- **No RTL support v1.** Defer until analytics show Arabic / Hebrew
  traffic.
- **No pre-translation to 10 languages.** Translate to languages
  the traffic data justifies.
- **No look-preset name translation.** "Halftone" / "Pixel" /
  "Wireframe" are design jargon in English globally.
- **No LLM-generated translations.** Quality > volume.

## Phases

---

### Phase 1 — Localized country names in search (~2 hours)

The `world-countries` dataset already includes localized names in
24+ languages. Globestudio's country search currently uses only
English. Easy win.

#### Tasks

- [ ] Audit `src/data/geography.js` for how country names are
      sourced — confirm they come from `world-countries`.
- [ ] Add a "Search language" dropdown to the SearchableSelect
      component (or auto-detect from `navigator.language`).
- [ ] Update the search filter to match against the localized name
      AND the English name (so French users can search "France" or
      "Espagne" or "Spain").
- [ ] Display format in the dropdown: native name with English in
      parentheses if different (`España (Spain)`).
- [ ] Test with a few non-English keyboards.

#### Acceptance

- User can search countries in their native language.
- Both native + English names work.
- Display shows native first, English in parens.

---

### Phase 2 — i18n infrastructure with LinguiJS (~1 week)

LinguiJS for the smallest bundle. English + Spanish as the first
two locales. ~50 UI strings to translate.

#### Tasks

- [ ] `npm install @lingui/react @lingui/macro @lingui/cli`
- [ ] Configure `lingui.config.js` for English + Spanish.
- [ ] Wrap App.jsx with `<I18nProvider>`.
- [ ] Replace hardcoded English strings with `<Trans>` macros and
      `t\`...\`` template literals.
- [ ] Run `lingui extract` to generate the message catalog
      (~50 strings).
- [ ] Hand-translate Spanish via a bilingual designer (Alejandro?).
- [ ] Build with `lingui compile` to produce minified locale
      bundles.
- [ ] Add a language picker in the panel header.
- [ ] Test full Spanish UI walkthrough.

#### Acceptance

- All UI strings translatable.
- Spanish locale fully translated and usable.
- Language picker switches live without page reload.
- Bundle size increase < 15KB gzipped (LinguiJS overhead + locale
  data).

---

### Phase 3 — French + German + Portuguese locales (~3 days)

Add three more locales once the infrastructure is proven.

#### Tasks

- [ ] Hand-translate French, German, Portuguese locales.
- [ ] Add to language picker.
- [ ] Test each in isolation.
- [ ] Update sitemap.xml to include `hreflang` alternates.
- [ ] Add `<link rel="alternate" hreflang="...">` per locale in
      `index.html`.

#### Acceptance

- 4 locales: English, Spanish, French, German, Portuguese.
- `hreflang` tags drive correct SEO indexing per language.

---

### Phase 4 (gated) — RTL support

Gated on analytics showing Arabic / Hebrew traffic crossing 5% of
total.

#### Tasks (gated)

- [ ] Audit CSS for logical-property compliance
      (`margin-inline-start` vs `margin-left`, etc.).
- [ ] Add `dir="rtl"` toggle to App root based on locale.
- [ ] Mirror directional icons (chevrons, back arrows).
- [ ] Test sliders + range thumbs don't flip semantically (right =
      more should stay right=more, even in RTL — number direction
      is global).
- [ ] Add Arabic + Hebrew locale translations.
- [ ] Manual UI walkthrough in RTL mode.

#### Acceptance

- Arabic + Hebrew locales fully translated.
- Layout mirrors correctly in RTL mode.
- Number-heavy displays stay LTR.

---

### Phase 5 (gated) — Community translations via Crowdin

If/when 5+ contributors offer translations for additional locales.

#### Tasks (gated)

- [ ] Set up Crowdin (free for OSS).
- [ ] Sync message catalog with Crowdin.
- [ ] Open community translation requests via Discussions.
- [ ] Set up CI to auto-pull approved translations into the build.

#### Acceptance

- Crowdin project active.
- 3+ community-contributed locales merged.

---

## Status log

- **2026-05-19** — Plan drafted from research. No code yet.

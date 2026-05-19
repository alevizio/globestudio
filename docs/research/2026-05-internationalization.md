# Internationalization

**Date:** 19 May 2026
**Sources consulted:** 7 React i18n + RTL articles + codebase audit
**Confidence:** High for i18n library tradeoffs · Medium for which markets to target first
**Status:** Plan written → see [`docs/plans/i18n-rollout.md`](../plans/i18n-rollout.md)

## Executive summary

Worlddots ships English-only today. Two distinct i18n surfaces to
consider:

1. **UI translation** (panel labels, button text, error messages).
   Standard React i18n problem. `react-i18next` is the default
   library — well-supported, ~22KB. LinguiJS is the lighter
   alternative (compile-time, smaller bundle).
2. **Country names** in non-English. The `world-countries` dataset
   already includes localized names in 10+ languages (Arabic,
   Chinese, French, etc.) — Worlddots just isn't using them. Easy
   win for searchable country selection in other languages.

**RTL (right-to-left) support** for Arabic, Hebrew, Persian, Urdu
is a separate concern — requires layout mirroring across the panel,
not just text translation. Bigger lift.

**The right v1 sequence:**

1. **Country name search in 5 priority languages** — French,
   Spanish, German, Chinese, Arabic. Already-available data, ~2
   hours of wiring.
2. **UI translation infrastructure** with English + Spanish as the
   first two locales. Validates the i18n investment before
   committing to more locales. ~1 week of work.
3. **RTL layout support** — gated on demand. Comes later if there's
   organic Arabic/Hebrew user signal.

## Key findings

### Finding 1 — react-i18next is the safe default ✅

`react-i18next` (the React binding for the broader `i18next`) has
the largest ecosystem, ~8M weekly downloads. Bundle: ~22KB minified
+ gzipped. Strengths:

- Plugin-heavy ecosystem (language detection, backend loaders,
  caching)
- Works with any React setup
- Lazy-load translations per locale to keep bundles tight
- TypeScript support

Trade-offs vs alternatives:

| Library         | Bundle | Strengths                         |
| --------------- | ------ | --------------------------------- |
| react-i18next   | 22KB   | Plugin ecosystem, mature          |
| react-intl      | 17.8KB | Strong ICU spec compliance        |
| LinguiJS        | ~5KB   | Compile-time, smallest, modern    |

For Worlddots, **LinguiJS** is the most interesting because:

- Smallest bundle (~5KB after compilation)
- Macro-based syntax keeps translation keys close to code
- Compile-time extraction means no runtime overhead
- Modern, designed-for-2024+ ergonomics

Sources:
- [Best i18n libraries for React, React Native & Next.js 2026](https://simplelocalize.io/blog/posts/the-most-popular-react-localization-libraries/) ⚠️
- [react-intl vs react-i18next comparison](https://www.locize.com/blog/react-intl-vs-react-i18next/) ⚠️
- [Best i18n libraries for React in 2026 — DEV.to](https://dev.to/erayg/best-i18n-libraries-for-nextjs-react-react-native-in-2026-honest-comparison-3m8f) ⚠️

### Finding 2 — Country names are a free win ✅

The `world-countries` package (already a Worlddots dependency)
includes localized country names in 10+ languages:

```json
{
  "name": {
    "common": "Spain",
    "official": "Kingdom of Spain",
    "native": { "spa": { "common": "España", "official": "Reino de España" } }
  },
  "translations": {
    "ara": { "common": "إسبانيا", "official": "مملكة إسبانيا" },
    "bre": { "common": "Spagn", "official": "Rouantelezh Spagn" },
    "fra": { "common": "Espagne", "official": "Royaume d'Espagne" },
    "deu": { "common": "Spanien", "official": "Königreich Spanien" },
    "zho": { "common": "西班牙", "official": "西班牙王国" }
    // ...
  }
}
```

Worlddots's current country search uses only the `common` English
name. Switching to use the user's locale (or showing both
English + local name in the searchable select) is a 2-3 hour fix.

**Languages already supported** in the dataset: Arabic, Breton,
Czech, Welsh, German, Estonian, Persian, Finnish, French, Croatian,
Hungarian, Italian, Japanese, Korean, Dutch, Polish, Portuguese,
Russian, Slovak, Spanish, Swedish, Turkish, Urdu, Chinese.

Sources:
- [mledoze/countries — world countries in JSON](https://github.com/mledoze/countries) ✅

### Finding 3 — RTL is a meaningful design lift ⚠️

Supporting Arabic, Hebrew, Persian, Urdu requires more than
translation. Layout direction flips: panel slides from right
instead of left, text aligns right, icons mirror (chevrons,
arrows), tabular numbers stay LTR.

CSS `direction: rtl;` + `dir="rtl"` on `<html>` handles ~80% via
logical properties (`margin-inline-start`, etc.) — Worlddots's
CSS already uses some logical properties (`inset-inline-start`
shows up in styles.css). Audit needed.

The 20% that needs manual work:
- Icons that imply direction (back arrow, forward arrow)
- Slider tracks (which side is "more"?)
- Range thumbs and gradient previews
- Number-heavy displays (keep LTR)

Total RTL implementation effort: ~3-5 days for a tool of Worlddots's
size.

Sources:
- [Localization Approaches for RTL Rendering — Telerik](https://www.telerik.com/design-system/docs/foundation/guides/globalization/rtl/) ✅
- [RTL Localization Quick Start — Centus](https://centus.com/blog/right-to-left-languages-translation) ⚠️
- [UX for International Websites — RTL Scripts](https://localizejs.com/articles/ux-considerations-for-international-websites) ⚠️

### Finding 4 — Pick locales based on traffic, not aspiration ⚠️

The 2026 i18n best-practice: **don't pre-translate to 10 languages
before launch**. Translate to the languages your traffic actually
comes from. Use Vercel Analytics (or similar) to see top
non-English referrer countries → those are the locales worth
translating.

For Worlddots's stage, the safest v1 is **English + Spanish + French**
— large designer communities + relatively cheap to maintain. Add
German, Portuguese, Chinese, Arabic as analytics justify.

Sources:
- [Best practices in software localization 2026 — SimpleLocalize](https://simplelocalize.io/blog/posts/best-practices-in-software-localization/) ⚠️

## Recommendations

In order:

1. **Country name search using `world-countries` translations**
   (~2 hours). Free win. User picks UI language from a small
   dropdown; country search uses that locale. English remains
   default.
2. **Choose i18n library: LinguiJS** for the smallest bundle.
   Set up infrastructure with English + Spanish as the first two
   locales. ~1 week including translation work.
3. **Translation source: hand-write** the initial Spanish locale,
   not LLM-translated. The panel UI is small (~50 strings); a
   bilingual designer can do it in an hour. Quality > volume.
4. **RTL support: defer** until Vercel Analytics shows Arabic /
   Hebrew traffic crossing ~5% of users.
5. **Add a small language picker** in the panel header — flag icon
   + locale dropdown. Visible but unobtrusive.
6. **Track locale demand** via the existing `?source=` analytics —
   add a `?locale=` parameter that the embed honors.

## Open questions

- Is there appetite for community-contributed translations? If yes,
  set up Crowdin or similar so non-developers can contribute via a
  web UI without forking the repo. Adds setup overhead.
- Country name display: native name only, English only, or both
  (`Spain (España)`)? Both is friendlier for international designers
  who think in their native language but need to copy/share in
  English for clients. Default to both.
- The shaders / look presets have English names (Halftone, Pixel,
  Wireframe). Translate or keep English as design jargon? Most
  designers globally use English design terminology — probably
  keep English for the look names.

## Sources

1. [Internationalization (i18n) in React 2026 — Glorywebs](https://www.glorywebs.com/blog/internationalization-in-react) ⚠️
2. [Best i18n Libraries for React 2026 — PkgPulse](https://www.pkgpulse.com/blog/best-i18n-libraries-react-2026) ⚠️
3. [Best i18n libraries 2026 — SimpleLocalize](https://simplelocalize.io/blog/posts/the-most-popular-react-localization-libraries/) ⚠️
4. [react-intl vs react-i18next — Locize](https://www.locize.com/blog/react-intl-vs-react-i18next/) ⚠️
5. [mledoze/countries — world countries data](https://github.com/mledoze/countries) ✅
6. [Telerik — RTL Localization Approaches](https://www.telerik.com/design-system/docs/foundation/guides/globalization/rtl/) ✅
7. [Centus — RTL Localization Quick Start Guide](https://centus.com/blog/right-to-left-languages-translation) ⚠️
8. [Localize.js — UX for RTL Scripts](https://localizejs.com/articles/ux-considerations-for-international-websites) ⚠️
9. [SimpleLocalize — Software Localization Best Practices 2026](https://simplelocalize.io/blog/posts/best-practices-in-software-localization/) ⚠️

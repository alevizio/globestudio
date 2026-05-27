# Globestudio — WordPress plugin

Gutenberg block + `[globestudio]` shortcode that embeds a dotted globe or country map in any WordPress post or page.

## Files

| File | Role |
|---|---|
| `globestudio.php` | Plugin entry — registers the block, the shortcode, the shared `globestudio_render_block()` function used by both |
| `src/block/block.json` | Block manifest (Gutenberg API v3) |
| `src/block/render.php` | Server-side render template — delegates to `globestudio_render_block` |
| `src/block/index.js` | Editor UI — registers the block, sidebar controls (preset dropdown + height slider), live preview iframe |
| `readme.txt` | WordPress.org plugin directory listing (specific format) |
| `SUBMISSION.md` | Step-by-step walkthrough for publishing to wordpress.org |

## Local development install

1. Symlink or copy this folder to your WordPress site's `wp-content/plugins/globestudio/`
2. WP Admin → Plugins → activate **Globestudio**
3. Edit any post/page → insert the **Globestudio** block → pick a preset → publish

For a clean local site, use [Local by Flywheel](https://localwp.com/) (free).

## Shortcode (Classic editor / page builders)

```
[globestudio look="halftone" height="480"]
[globestudio look="vapor" height="600"]
[globestudio look="aurora" height="800"]
```

The shortcode renders identical markup to the block — same iframe, same lazy-loading.

## How it stays light

- Plugin code is < 10 KB total (PHP + JS, no bundler, no minified deps)
- The iframe is `loading="lazy"` so WebGL doesn't fire until visible
- Three.js + globe data lives on globestudio.app, not in the plugin or the WordPress site
- Caching plugins (WP Rocket, W3 Total Cache, LiteSpeed, etc.) cache the rendered iframe markup automatically — no special configuration needed

## Roadmap

- [ ] Submit to wordpress.org plugin directory (see `SUBMISSION.md`)
- [ ] Block attribute `config` — accept a full share URL payload for custom colors / countries / density
- [ ] Filter hook `globestudio_embed_base` so users can self-host the embed origin
- [ ] Block transforms — convert a Custom HTML block containing a globestudio iframe to a real Globestudio block

## License

MIT — see [LICENSE](../../LICENSE).

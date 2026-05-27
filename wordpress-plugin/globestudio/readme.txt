=== Globestudio ===
Contributors: alevizio
Tags: globe, map, dotted, embed, data-visualization
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 0.1.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Embed a designer-quality dotted globe or map in any post, page, or template. 21 shader presets. Gutenberg block + shortcode.

== Description ==

Globestudio drops a customized dotted globe or country map into your WordPress site as a lightweight, lazy-loaded iframe. Designed for marketing pages, hero sections, blog posts, and case studies where a static screenshot of a map is just too flat.

= What you get =

* **Gutenberg block** with a live preview, preset dropdown, and height slider in the sidebar
* **`[globestudio]` shortcode** for Classic editor or page builders (Elementor, Beaver Builder, Bricks, etc.)
* **21 shader presets** — Halftone, Risograph, Newsprint, Aurora, Vapor, CRT, Pixel, Wireframe, Bloom, Iridescent, Pencil, Toon, and more
* **Country / region filtering** via the underlying [globestudio.app](https://globestudio.app) embed
* **Lazy-loaded** — the iframe defers WebGL until the user scrolls near, so it doesn't slow your Lighthouse score
* **No tracking, no API key, no account** — the embed is open-source and free to use

= How it works =

The block (and shortcode) renders a sandboxed `<iframe>` pointing at `https://globestudio.app/embed`. The actual 3D rendering happens on globestudio.app, not on your server — so your WordPress site stays light and you don't ship Three.js to your visitors' browsers.

The iframe is `loading="lazy"` and `referrerpolicy="no-referrer-when-downgrade"`. No cookies or personal data are sent — see the [privacy page](https://globestudio.app/privacy).

= Usage examples =

Gutenberg: insert the **Globestudio** block, pick a preset in the sidebar, publish.

Classic editor / Elementor HTML widget:

`[globestudio look="halftone" height="480"]`

`[globestudio look="vapor" height="600"]`

`[globestudio look="aurora" height="800"]`

= Full customization =

For control over colors, density, country selection, and shader effects, design your globe at [globestudio.app](https://globestudio.app), copy the share URL, and use the underlying `<iframe src=...>` directly in a Custom HTML block. A future release will accept the full share URL as a block attribute.

== Installation ==

1. Upload the `globestudio` folder to `/wp-content/plugins/` (or install through Plugins → Add New → search "Globestudio")
2. Activate through the **Plugins** menu in WordPress
3. Add the **Globestudio** block to any post or page
4. Pick a preset, adjust the height, publish

== Frequently Asked Questions ==

= Does this slow down my site? =

No. The iframe is `loading="lazy"` — WebGL doesn't fire until the user scrolls near. The plugin itself is under 10 KB of PHP + JS.

= Can I use it offline / self-host the embed? =

The free embed lives at globestudio.app and is open source on [GitHub](https://github.com/alevizio/globestudio). You can self-host the embed origin and point the plugin at it via a filter (planned for a future release).

= Does it work with caching plugins / CDN? =

Yes. The iframe is just markup; W3 Total Cache, WP Rocket, Cloudflare, etc. all cache the rendered HTML correctly.

= Can I customize the colors / countries / density? =

For now, design your globe at globestudio.app, get the share URL, and paste it into a Custom HTML block. A `config` attribute on the Gutenberg block is planned for the next release.

= Is it accessible? =

The iframe has a `title` attribute (translated via the `globestudio` text domain) so screen readers announce it. The globe itself is decorative — pair it with descriptive surrounding copy for accessibility.

== Screenshots ==

1. The Globestudio block in the Gutenberg editor with the preset dropdown open
2. A published page showing the Halftone globe embed in a hero section
3. The block's sidebar controls — preset picker + height slider

== Changelog ==

= 0.1.0 =
* Initial release
* Gutenberg block with preset dropdown + height slider
* `[globestudio]` shortcode for Classic editor / page builders
* Server-side rendering — iframe markup cached by all major caching plugins
* `wordpress` source attribution on the embed URL for analytics

== Upgrade Notice ==

= 0.1.0 =
First release. Adds the Globestudio block + shortcode.

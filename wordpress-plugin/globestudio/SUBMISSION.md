# Submitting Globestudio to the WordPress.org plugin directory

Step-by-step walkthrough.

## Prerequisites

- A wordpress.org account ([register free](https://login.wordpress.org/register))
- SVN installed (`brew install subversion` on macOS; comes with most Linux distros)
- The plugin folder at `wordpress-plugin/globestudio/` zipped into `globestudio.zip`

## 1. Create the zip (~30 sec)

```bash
cd wordpress-plugin
zip -r globestudio.zip globestudio \
  -x "*.git*" "*.DS_Store" "node_modules/*"
```

Verify the zip:
- Root folder must be named `globestudio` (matches plugin slug)
- `globestudio.php` at the root with valid headers
- `readme.txt` at the root with valid sections (Stable tag, Description, etc.)

## 2. Smoke-test locally (~5 min)

Easiest path: [Local by Flywheel](https://localwp.com/) (free).

1. Open Local → New Site → "WordPress"
2. Once running, click "Site Folder" → drop the `globestudio.zip` into `wp-content/plugins/`
3. WP Admin → Plugins → Activate **Globestudio**
4. Create a new Page → Add the **Globestudio** block → publish → preview
5. Try the shortcode in a Classic editor too: `[globestudio look="vapor" height="600"]`

If anything errors, fix it before submitting — wordpress.org reviewers will catch it and your queue resets.

## 3. Submit to wordpress.org (~10 min initial; 1-2 weeks for first review)

1. Go to https://wordpress.org/plugins/developers/add/
2. Sign in
3. Plugin name: `Globestudio`
4. Upload `globestudio.zip`
5. Optional: paste the plugin's tagline (max 150 chars). I recommend:

   > Embed designer-quality dotted globes and maps in any post or page. 21 shader presets. Gutenberg block + shortcode.

6. Submit

You'll get an automated email confirming receipt. A human reviewer will check the plugin within 7-14 days for a first submission. They look for:
- Valid PHP and JS
- No security issues (XSS, SQL injection, unfiltered input)
- Proper escaping in PHP output — we use `esc_url`, `esc_attr`, `sanitize_key` already
- No bundled minified third-party libraries (we ship none)
- License compatibility (MIT is GPL-compatible, fine)

If they flag anything, they email you with specifics. Fix and reply.

## 4. After approval

You get an email with:
- Your plugin's wordpress.org URL: `https://wordpress.org/plugins/globestudio/`
- Your SVN repo URL: `https://plugins.svn.wordpress.org/globestudio/`

To publish version 0.1.0:

```bash
# One-time clone
svn co https://plugins.svn.wordpress.org/globestudio
cd globestudio

# Copy plugin files into trunk
cp -r /path/to/wordpress-plugin/globestudio/* trunk/

# Tag the version
svn cp trunk tags/0.1.0

# Add + commit
svn add --force *
svn ci -m "Initial release 0.1.0"
```

The plugin appears on wordpress.org within a few minutes of the commit and starts being installable via WP Admin → Plugins → Add New → search "Globestudio".

## 5. Subsequent releases

For each new version:

1. Bump `Version: X.Y.Z` in `globestudio.php`
2. Bump `Stable tag: X.Y.Z` in `readme.txt`
3. Add a `== Changelog ==` entry
4. Run the smoke test again (Local by Flywheel)
5. Push to SVN:

```bash
cd /path/to/svn/globestudio
rm -rf trunk/*
cp -r /path/to/wordpress-plugin/globestudio/* trunk/
svn cp trunk tags/X.Y.Z
svn ci -m "Release X.Y.Z — short description"
```

Updates appear on wordpress.org within minutes. Users get an update notification in their WP Admin within the next ~12 hours.

## Screenshots

For the wordpress.org listing, you need `screenshot-1.png`, `screenshot-2.png`, etc. in the `assets/` folder of the SVN repo (NOT in the plugin folder itself).

Recommended captures (1280 × 720 each):
1. The Globestudio block in the Gutenberg editor with the sidebar controls visible
2. A published page showing the embedded globe in a hero section
3. The preset dropdown open showing all 21 looks

Add captions in `readme.txt` under `== Screenshots ==` (already templated).

## Plugin page banner + icon (optional but recommended)

In the SVN repo's `assets/` folder:
- `banner-1544x500.png` — the wide banner at the top of the plugin page
- `banner-772x250.png` — half-size for retina
- `icon-256x256.png` — the icon in search results + WP Admin
- `icon-128x128.png` — smaller variant

Reuse Globestudio's favicon SVG: `npx @resvg/resvg-js-cli ../../../public/favicon.svg --width 256 --height 256 > icon-256x256.png` (same trick as the Figma plugin).

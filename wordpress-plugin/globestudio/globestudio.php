<?php
/**
 * Plugin Name:       Globestudio
 * Plugin URI:        https://globestudio.app
 * Description:       Embed a Globestudio dotted globe or map in any post, page, or template. Adds a Gutenberg block with preset picker; also exposes a [globestudio] shortcode for Classic editor / page builders.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Alejandro Vizio
 * Author URI:        https://alevizio.com
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       globestudio
 *
 * @package Globestudio
 */

if (!defined('ABSPATH')) {
    exit;
}

define('GLOBESTUDIO_VERSION', '0.1.0');
define('GLOBESTUDIO_PATH', plugin_dir_path(__FILE__));
define('GLOBESTUDIO_URL', plugin_dir_url(__FILE__));
define('GLOBESTUDIO_EMBED_BASE', 'https://globestudio.app/embed');

/**
 * Register the Gutenberg block.
 *
 * The block is defined via block.json (block API v3), so register_block_type
 * picks up the manifest + render callback automatically.
 */
function globestudio_register_block(): void
{
    register_block_type(GLOBESTUDIO_PATH . 'src/block', [
        'render_callback' => 'globestudio_render_block',
    ]);
}
add_action('init', 'globestudio_register_block');

/**
 * Server-side renderer for the Gutenberg block. Produces a sandboxed
 * iframe pointing at globestudio.app/embed with the block's attributes
 * encoded as query string parameters.
 *
 * @param array<string,mixed> $attributes Block attributes from the editor.
 * @return string Rendered HTML.
 */
function globestudio_render_block(array $attributes): string
{
    $look   = isset($attributes['look']) && is_string($attributes['look'])
        ? sanitize_key($attributes['look'])
        : 'halftone';
    $height = isset($attributes['height']) && is_numeric($attributes['height'])
        ? (int) $attributes['height']
        : 480;
    $align  = isset($attributes['align']) ? sanitize_html_class($attributes['align']) : '';

    $url = add_query_arg(
        ['look' => $look, 'source' => 'wordpress'],
        GLOBESTUDIO_EMBED_BASE
    );

    $wrapper_class = trim('wp-block-globestudio-embed ' . ($align ? "align{$align}" : ''));
    $wrapper_attrs = get_block_wrapper_attributes(['class' => $wrapper_class]);

    $iframe = sprintf(
        '<iframe src="%1$s" width="100%%" height="%2$d" style="border:0;display:block;width:100%%" loading="lazy" title="%3$s" referrerpolicy="no-referrer-when-downgrade"></iframe>',
        esc_url($url),
        $height,
        esc_attr__('Globestudio dotted globe', 'globestudio')
    );

    return sprintf('<div %1$s>%2$s</div>', $wrapper_attrs, $iframe);
}

/**
 * Shortcode for Classic editor / page builders that don't use blocks.
 *
 * Usage:
 *   [globestudio look="halftone" height="480"]
 *   [globestudio look="vapor" height="600"]
 *
 * @param array<string,string|int>|string $atts Shortcode attributes.
 * @return string Rendered HTML.
 */
function globestudio_shortcode($atts): string
{
    $atts = shortcode_atts(
        [
            'look'   => 'halftone',
            'height' => 480,
        ],
        is_array($atts) ? $atts : [],
        'globestudio'
    );

    return globestudio_render_block([
        'look'   => $atts['look'],
        'height' => $atts['height'],
    ]);
}
add_shortcode('globestudio', 'globestudio_shortcode');

/**
 * Enqueue the editor-only script that registers the block in the
 * Gutenberg editor UI (preset dropdown, height control, live preview).
 * The build output lives at src/block/index.js (no bundler required —
 * one ESM file using window.wp.* globals).
 */
function globestudio_enqueue_editor_assets(): void
{
    wp_register_script(
        'globestudio-block-editor',
        GLOBESTUDIO_URL . 'src/block/index.js',
        ['wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n'],
        GLOBESTUDIO_VERSION,
        true
    );
}
add_action('init', 'globestudio_enqueue_editor_assets', 5);

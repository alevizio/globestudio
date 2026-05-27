<?php
/**
 * Server-side rendering for the Globestudio block.
 *
 * Delegates to the shared renderer defined in globestudio.php so the
 * block + shortcode produce identical markup.
 *
 * @var array<string,mixed> $attributes Block attributes from the editor.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (function_exists('globestudio_render_block')) {
    echo globestudio_render_block($attributes ?? []); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

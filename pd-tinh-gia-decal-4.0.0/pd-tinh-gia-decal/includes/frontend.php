<?php
if (!defined('ABSPATH')) { exit; }
function pdtg_register_assets() {
    wp_register_style('pdtg-front', PDTG_URL . 'assets/css/frontend.css', [], PDTG_VERSION);
    wp_register_script('pdtg-front', PDTG_URL . 'assets/js/frontend.js', [], PDTG_VERSION, true);
}
function pdtg_shortcode() {
    pdtg_register_assets();
    wp_enqueue_style('pdtg-front');
    wp_enqueue_script('pdtg-front');
    $c = pdtg_config(); $uid = wp_unique_id('pdtg-');
    // CSS fallback for shortcodes rendered after wp_head (including UX Blocks).
    ob_start();
    if (did_action('wp_head') && !wp_style_is('pdtg-front', 'done')) { wp_print_styles('pdtg-front'); }
    include PDTG_DIR . 'templates/calculator.php';
    return ob_get_clean();
}

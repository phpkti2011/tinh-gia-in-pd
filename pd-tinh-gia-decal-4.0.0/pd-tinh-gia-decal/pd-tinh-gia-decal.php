<?php
/**
 * Plugin Name: P&D Tính Giá Decal
 * Description: Tính giá decal lũy tiến, quản lý bảng giá và vật liệu trong WordPress. Giữ shortcode [form_tinh_gia_decal].
 * Version: 4.0.0
 * Author: In Nhanh P&D
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Text Domain: pd-tinh-gia-decal
 * License: GPL-2.0-or-later
 */
if (!defined('ABSPATH')) { exit; }
define('PDTG_VERSION', '4.0.0');
define('PDTG_DIR', plugin_dir_path(__FILE__));
define('PDTG_URL', plugin_dir_url(__FILE__));
require_once PDTG_DIR . 'includes/config.php';
require_once PDTG_DIR . 'includes/calculator.php';
require_once PDTG_DIR . 'includes/frontend.php';
if (is_admin()) { require_once PDTG_DIR . 'admin/admin.php'; }
register_activation_hook(__FILE__, function () {
    add_option('pdtg_config', pdtg_defaults(), '', false);
});
// Register late to preserve the original shortcode; deactivate the old plugin after migration.
add_action('init', function () {
    add_shortcode('form_tinh_gia_decal', 'pdtg_shortcode');
}, 20);
add_action('wp_enqueue_scripts', 'pdtg_register_assets');
add_action('wp_ajax_pdtg_calculate', 'pdtg_ajax_calculate');
add_action('wp_ajax_nopriv_pdtg_calculate', 'pdtg_ajax_calculate');
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    array_unshift($links, '<a href="' . esc_url(admin_url('admin.php?page=pdtg')) . '">Cài đặt</a>');
    return $links;
});

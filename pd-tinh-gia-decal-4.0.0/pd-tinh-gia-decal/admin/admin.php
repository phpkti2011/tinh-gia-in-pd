<?php
if (!defined('ABSPATH')) { exit; }
add_action('admin_menu', function () {
    add_menu_page('Tính giá decal', 'Tính giá decal', 'manage_options', 'pdtg', 'pdtg_admin_page', 'dashicons-calculator', 31);
});
add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'toplevel_page_pdtg') { return; }
    wp_enqueue_style('pdtg-admin', PDTG_URL . 'assets/css/admin.css', [], PDTG_VERSION);
    wp_enqueue_script('pdtg-admin', PDTG_URL . 'assets/js/admin.js', [], PDTG_VERSION, true);
});
add_action('admin_post_pdtg_save', function () {
    if (!current_user_can('manage_options')) { wp_die('Bạn không có quyền sửa cấu hình.'); }
    check_admin_referer('pdtg_save');
    $draft = wp_unslash($_POST['pdtg'] ?? []);
    try {
        $clean = pdtg_validate_config($draft);
        update_option('pdtg_config', $clean, false);
        // A no-op update also returns false, so verify stored value instead.
        if (get_option('pdtg_config') != $clean) { throw new InvalidArgumentException('Không lưu được cấu hình. Vui lòng thử lại.'); }
        set_transient('pdtg_message_' . get_current_user_id(), ['ok'=>true,'text'=>'Đã lưu cấu hình. Nếu dùng cache trang/CDN, hãy xóa cache để cập nhật giao diện form.'], 300);
    } catch (InvalidArgumentException $e) {
        set_transient('pdtg_message_' . get_current_user_id(), ['ok'=>false,'text'=>$e->getMessage()], 300);
        // Preserve normal form submissions to let the administrator correct them.
        if (is_array($draft)) { set_transient('pdtg_draft_' . get_current_user_id(), $draft, 300); }
    }
    wp_safe_redirect(admin_url('admin.php?page=pdtg')); exit;
});
function pdtg_admin_value($value) { return is_scalar($value) ? (string) $value : ''; }
function pdtg_admin_input($name, $value, $type = 'text', $min = '', $max = '', $step = '1') {
    echo '<input name="pdtg[' . esc_attr($name) . ']" type="' . esc_attr($type) . '" value="' . esc_attr(pdtg_admin_value($value)) . '"';
    if ($type === 'number') { echo ' min="' . esc_attr($min) . '" max="' . esc_attr($max) . '" step="' . esc_attr($step) . '" required'; }
    echo '>';
}
function pdtg_admin_page() {
    if (!current_user_can('manage_options')) { return; }
    $c = pdtg_config();
    $key = get_current_user_id();
    $message = get_transient('pdtg_message_' . $key);
    $draft = get_transient('pdtg_draft_' . $key);
    delete_transient('pdtg_message_' . $key); delete_transient('pdtg_draft_' . $key);
    if ($message && !$message['ok'] && is_array($draft)) { $c = array_replace($c, $draft); }
    ?>
    <div class="wrap pdtg-admin">
      <h1>Tính giá decal <span>v<?php echo esc_html(PDTG_VERSION); ?></span></h1>
      <?php if ($message): ?><div class="notice <?php echo $message['ok'] ? 'notice-success' : 'notice-error'; ?>"><p><?php echo esc_html($message['text']); ?></p></div><?php endif; ?>
      <?php if (function_exists('form_tinh_gia_decal_optimized')): ?><div class="notice notice-warning"><p>Plugin tính giá cũ vẫn đang bật. Hãy tắt “Tính giá in tem nhãn (Đã sửa lỗi)” trong mục Plugin để tránh trùng shortcode. Không cần sửa shortcode trên trang.</p></div><?php endif; ?>
      <p>Chèn <code>[form_tinh_gia_decal]</code> vào trang hoặc UX Block. Tính giá lũy tiến từng bậc; đây là form báo giá tham khảo, chưa tạo đơn hàng.</p>
      <nav class="pdtg-admin__nav" aria-label="Các mục cài đặt"><a href="#pdtg-general">Cài đặt chung</a><a href="#pdtg-pricing">Bảng giá</a><a href="#pdtg-materials">Loại decal</a><a href="#pdtg-help">Hướng dẫn</a></nav>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" id="pdtg-settings">
        <input type="hidden" name="action" value="pdtg_save"><?php wp_nonce_field('pdtg_save'); ?>
        <section class="pdtg-admin__card" id="pdtg-general"><h2>Cài đặt chung</h2>
          <div class="pdtg-admin__grid">
            <label>Tiêu đề form<?php pdtg_admin_input('title', $c['title']); ?></label>
            <label>Số điện thoại (để trống để ẩn)<?php pdtg_admin_input('phone', $c['phone']); ?></label>
            <label>Số Zalo (để trống để ẩn)<?php pdtg_admin_input('zalo', $c['zalo']); ?></label>
          </div>
          <label>Ghi chú dưới báo giá<textarea name="pdtg[notice]" rows="3"><?php echo esc_textarea(pdtg_admin_value($c['notice'])); ?></textarea></label>
          <h3>Vùng in và phụ phí</h3><div class="pdtg-admin__grid">
            <label>Ngang vùng in (mm)<?php pdtg_admin_input('max_width',$c['max_width'],'number',1,5000,'any'); ?></label>
            <label>Cao vùng in (mm)<?php pdtg_admin_input('max_height',$c['max_height'],'number',1,5000,'any'); ?></label>
            <label>Cộng bù mỗi chiều (mm)<?php pdtg_admin_input('bleed',$c['bleed'],'number',0,50,'any'); ?></label>
            <label>Số lượng tem tối đa<?php pdtg_admin_input('max_quantity',$c['max_quantity'],'number',1,10000000); ?></label>
            <label>Cán màng (đ/tờ)<?php pdtg_admin_input('lamination_fee',$c['lamination_fee'],'number',0,100000000); ?></label>
            <label>Phí bế thêm (đ/tờ)<?php pdtg_admin_input('cutting_fee',$c['cutting_fee'],'number',0,100000000); ?></label>
            <label>Phí thiết kế cố định (đ/đơn)<?php pdtg_admin_input('design_fee',$c['design_fee'],'number',0,100000000); ?></label>
          </div><p class="description">Cộng bù 2 mm nghĩa là tem 50 × 30 mm chiếm ô 52 × 32 mm; không phải 2 mm mỗi mép. Nếu phí bế đã nằm trong công in, giữ phí bế thêm = 0. Phí thiết kế áp dụng cho mọi lần báo giá; giữ 0 nếu không thu cố định.</p>
        </section>
        <section class="pdtg-admin__card" id="pdtg-pricing"><h2>Bảng giá công in lũy tiến</h2><p>Tờ 1 tính theo bậc 1; tờ 2 theo bậc 2; tiếp tục cộng tiền các bậc. <strong>Không lấy đơn giá bậc cuối nhân toàn bộ số tờ.</strong></p><p>Các bậc phải nối tiếp từ tờ 1. “Đến tờ” = <strong>0</strong> chỉ dùng ở bậc cuối để không giới hạn.</p>
          <div class="pdtg-admin__scroll"><table class="widefat striped" data-table="tiers"><thead><tr><th>Từ tờ</th><th>Đến tờ</th><th>Giá công in (đ/tờ)</th><th>Thao tác</th></tr></thead><tbody>
          <?php foreach ((array) $c['tiers'] as $i=>$r): if (!is_array($r)) { continue; } ?><tr>
            <?php foreach (['from','to','price'] as $field): ?><td><?php pdtg_admin_input('tiers][' . $i . '][' . $field,$r[$field] ?? '', 'number', $field==='from' ? 1 : 0, $field==='price' ? 100000000 : 10000000); ?></td><?php endforeach; ?>
            <td><button type="button" class="button" data-remove>Xóa bậc</button></td></tr><?php endforeach; ?>
          </tbody></table></div><p><button type="button" class="button" data-add="tiers">+ Thêm bậc giá</button></p>
        </section>
        <section class="pdtg-admin__card" id="pdtg-materials"><h2>Loại decal và phụ phí</h2><p>Phụ phí cộng trên mỗi tờ. Kraft mặc định bằng giấy (0đ phụ phí), giữ nguyên bản cũ; chỉnh tại đây nếu bảng giá thực tế khác.</p>
          <div class="pdtg-admin__scroll"><table class="widefat striped" data-table="materials"><thead><tr><th>Tên hiển thị</th><th>Mã duy nhất</th><th>Phụ phí (đ/tờ)</th><th>Thao tác</th></tr></thead><tbody>
          <?php foreach ((array) $c['materials'] as $i=>$r): if (!is_array($r)) { continue; } ?><tr>
            <?php foreach (['name','slug','fee'] as $field): ?><td><?php pdtg_admin_input('materials][' . $i . '][' . $field,$r[$field] ?? '', $field==='fee' ? 'number' : 'text',0,100000000); ?></td><?php endforeach; ?>
            <td><button type="button" class="button" data-remove>Xóa loại</button></td></tr><?php endforeach; ?>
          </tbody></table></div><p><button type="button" class="button" data-add="materials">+ Thêm loại decal</button></p>
        </section>
        <div class="pdtg-admin__save"><button type="submit" class="button button-primary button-hero">Lưu tất cả cài đặt</button><span>Chỉ áp dụng sau khi lưu thành công.</span></div>
      </form>
      <section class="pdtg-admin__card" id="pdtg-help"><h2>Hướng dẫn sử dụng</h2><ol><li>Tắt plugin tính giá cũ; giữ nguyên shortcode <code>[form_tinh_gia_decal]</code>.</li><li>Chỉnh bảng giá, vật liệu, vùng in và phí phù hợp với xưởng rồi lưu.</li><li>Xóa cache website/CDN sau khi thay cấu hình. Giá được tính bằng cấu hình mới trên máy chủ mỗi lần bấm nút.</li><li>Kiểm tra trên trang thật bằng điện thoại và máy tính. Mặc định: 1.000 tem giấy 50 × 30 mm, không cán màng = 23 tờ, 395.000đ.</li></ol><p>Plugin không lưu thông tin khách, không gửi email và không tạo đơn WooCommerce. Gỡ plugin vẫn giữ cấu hình để cài lại; không có thao tác tự xóa dữ liệu.</p></section>
    </div>
    <?php
}

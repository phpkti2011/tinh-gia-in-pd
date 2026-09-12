<?php if (!defined('ABSPATH')) { exit; } ?>
<section class="pdtg" data-pdtg data-endpoint="<?php echo esc_url(admin_url('admin-ajax.php')); ?>" aria-label="<?php echo esc_attr($c['title']); ?>">
  <header class="pdtg__header"><span class="pdtg__eyebrow">IN NHANH P&amp;D</span><h2><?php echo esc_html($c['title']); ?></h2><p>Nhập quy cách để xem chi phí tham khảo.</p></header>
  <div class="pdtg__layout">
    <form class="pdtg__form">
      <div class="pdtg__fields">
        <div><label for="<?php echo esc_attr($uid); ?>w">Chiều ngang (mm)</label><input id="<?php echo esc_attr($uid); ?>w" name="width" type="number" min="0.1" max="5000" step="any" required placeholder="VD: 50" inputmode="decimal"></div>
        <div><label for="<?php echo esc_attr($uid); ?>h">Chiều cao (mm)</label><input id="<?php echo esc_attr($uid); ?>h" name="height" type="number" min="0.1" max="5000" step="any" required placeholder="VD: 30" inputmode="decimal"></div>
      </div>
      <label for="<?php echo esc_attr($uid); ?>q">Số lượng tem</label><input id="<?php echo esc_attr($uid); ?>q" name="quantity" type="number" min="1" max="<?php echo esc_attr($c['max_quantity']); ?>" step="1" required placeholder="VD: 1000" inputmode="numeric">
      <label for="<?php echo esc_attr($uid); ?>m">Loại decal</label><select id="<?php echo esc_attr($uid); ?>m" name="material"><?php foreach ($c['materials'] as $m): ?><option value="<?php echo esc_attr($m['slug']); ?>"><?php echo esc_html($m['name']); ?></option><?php endforeach; ?></select>
      <label class="pdtg__check"><input type="checkbox" name="lamination" value="1"><span>Cán màng (bóng/mờ)</span></label>
      <button type="submit" class="pdtg__button">Tính giá ngay</button>
      <p class="pdtg__error" role="alert" hidden></p>
      <noscript><p>Vui lòng bật JavaScript để tính giá, hoặc gọi số liên hệ bên dưới.</p></noscript>
    </form>
    <div class="pdtg__result" aria-live="polite" aria-atomic="true">
      <h3>Báo giá tham khảo</h3><p class="pdtg__status">Kết quả sẽ xuất hiện sau khi bạn nhập thông tin và bấm tính giá.</p>
      <div class="pdtg__details" hidden><div class="pdtg__total"></div><p class="pdtg__unit"></p><table><caption class="pdtg__sr">Chi tiết báo giá in decal</caption><tbody></tbody></table></div>
    </div>
  </div>
  <footer class="pdtg__footer"><p class="pdtg__notice"><?php echo esc_html($c['notice']); ?></p><div class="pdtg__actions">
    <?php if ($c['phone']): ?><a class="pdtg__contact" href="<?php echo esc_url('tel:' . $c['phone']); ?>">Gọi <?php echo esc_html($c['phone']); ?></a><?php endif; ?>
    <?php if ($c['zalo']): ?><a class="pdtg__contact pdtg__contact--zalo" href="<?php echo esc_url('https://zalo.me/' . ltrim($c['zalo'], '+')); ?>" target="_blank" rel="noopener noreferrer">Nhận tư vấn qua Zalo</a><?php endif; ?>
  </div></footer>
</section>

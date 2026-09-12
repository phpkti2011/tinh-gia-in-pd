<?php
if (!defined('ABSPATH')) { exit; }

function pdtg_calculate($input, $config) {
    $c = pdtg_validate_config($config);
    $w = pdtg_number($input['width'] ?? null, 0.1, 5000);
    $h = pdtg_number($input['height'] ?? null, 0.1, 5000);
    $q = pdtg_number($input['quantity'] ?? null, 1, $c['max_quantity'], true);
    $slug = pdtg_text($input['material'] ?? ''); $material = null;
    foreach ($c['materials'] as $m) { if ($m['slug'] === $slug) { $material = $m; break; } }
    if (!$material) { throw new InvalidArgumentException('Loại decal đã thay đổi. Vui lòng tải lại trang và chọn lại.'); }
    $lam = $input['lamination'] ?? '0';
    if (!in_array($lam, ['0','1',0,1], true)) { throw new InvalidArgumentException('Tùy chọn cán màng không hợp lệ.'); }
    $lam = (int) $lam === 1;
    $pw = $w + $c['bleed']; $ph = $h + $c['bleed'];
    $per = (int) max(floor($c['max_width']/$pw)*floor($c['max_height']/$ph), floor($c['max_width']/$ph)*floor($c['max_height']/$pw));
    if ($per < 1) { throw new InvalidArgumentException('Kích thước tem cộng bù vượt vùng in ' . $c['max_width'] . ' × ' . $c['max_height'] . ' mm.'); }
    $sheets = (int) ceil($q / $per); $print = 0; $covered = 0;
    foreach ($c['tiers'] as $tier) {
        $end = $tier['to'] === 0 ? $sheets : min($sheets, $tier['to']);
        $count = max(0, $end - $tier['from'] + 1);
        $print += $count * $tier['price']; $covered += $count;
    }
    if ($covered !== $sheets) { throw new InvalidArgumentException('Bảng giá chưa bao phủ số tờ. Vui lòng liên hệ để được báo giá.'); }
    $material_cost = $sheets * $material['fee'];
    $lam_cost = $lam ? $sheets * $c['lamination_fee'] : 0;
    $cut_cost = $sheets * $c['cutting_fee'];
    $total = $print + $material_cost + $lam_cost + $cut_cost + $c['design_fee'];
    return ['width'=>$w,'height'=>$h,'quantity'=>$q,'material'=>$material['name'],'lamination'=>$lam,'per_sheet'=>$per,'sheets'=>$sheets,'print_cost'=>$print,'material_cost'=>$material_cost,'lamination_cost'=>$lam_cost,'cutting_cost'=>$cut_cost,'design_cost'=>$c['design_fee'],'total'=>$total,'unit_price'=>round($total/$q),'notice'=>$c['notice']];
}
function pdtg_ajax_calculate() {
    // Public, read-only calculation. No nonce: no stored changes or private data,
    // and cached pages must keep working after WordPress nonce expiry.
    nocache_headers();
    try {
        $result = pdtg_calculate(wp_unslash($_POST), pdtg_config());
        wp_send_json_success($result);
    } catch (InvalidArgumentException $e) {
        wp_send_json_error(['message'=>$e->getMessage()], 400);
    }
}

<?php
if (!defined('ABSPATH')) { exit; }

function pdtg_defaults() {
    $rows = [[1,1,100000],[2,2,40000],[3,10,20000],[11,20,8000],[21,30,5000],[31,40,4500],[41,50,4200],[51,100,4000],[101,200,3800],[201,300,3600],[301,400,3400],[401,500,3200],[501,600,3000],[601,700,2800],[701,800,2600],[801,900,2400],[901,1000,2300],[1001,0,2200]];
    $tiers = array_map(function ($r) { return ['from'=>$r[0], 'to'=>$r[1], 'price'=>$r[2]]; }, $rows);
    return [
        'title'=>'Tính giá in decal', 'phone'=>'0906702063', 'zalo'=>'0906702063',
        'notice'=>'Giá trên chỉ là giá tham khảo. Vui lòng liên hệ để xác nhận quy cách, phí bế, VAT, vận chuyển và giá chính thức.',
        'max_width'=>275, 'max_height'=>302, 'bleed'=>2, 'max_quantity'=>1000000,
        'lamination_fee'=>500, 'cutting_fee'=>0, 'design_fee'=>0,
        'tiers'=>$tiers,
        'materials'=>[
            ['slug'=>'giay','name'=>'Decal giấy','fee'=>0],
            ['slug'=>'nhua','name'=>'Decal nhựa','fee'=>1200],
            ['slug'=>'xi','name'=>'Decal xi','fee'=>1400],
            ['slug'=>'kraft','name'=>'Decal kraft','fee'=>0],
            ['slug'=>'vo','name'=>'Decal vỡ','fee'=>9000],
        ],
    ];
}
function pdtg_config() {
    return array_replace(pdtg_defaults(), (array) get_option('pdtg_config', []));
}
function pdtg_number($v, $min, $max, $integer = false) {
    if (!is_scalar($v) || !is_numeric($v)) { throw new InvalidArgumentException('Vui lòng nhập số hợp lệ.'); }
    $n = (float) $v;
    if (!is_finite($n) || $n < $min || $n > $max || ($integer && floor($n) !== $n)) {
        throw new InvalidArgumentException('Giá trị ngoài giới hạn hoặc không đúng định dạng số nguyên.');
    }
    return $integer ? (int) $n : $n;
}
function pdtg_text($v) {
    if (!is_scalar($v)) { throw new InvalidArgumentException('Nội dung không hợp lệ.'); }
    return sanitize_text_field((string) $v);
}
function pdtg_validate_config($input) {
    if (!is_array($input)) { throw new InvalidArgumentException('Cấu hình không hợp lệ.'); }
    $out = [];
    foreach (['title','phone','zalo','notice'] as $key) { $out[$key] = pdtg_text($input[$key] ?? ''); }
    if ($out['title'] === '') { throw new InvalidArgumentException('Vui lòng nhập tiêu đề form.'); }
    if (strlen($out['title']) > 300 || strlen($out['notice']) > 3000) { throw new InvalidArgumentException('Tiêu đề hoặc ghi chú quá dài.'); }
    foreach (['phone','zalo'] as $key) {
        $out[$key] = preg_replace('/[\s().-]+/', '', $out[$key]);
        if ($out[$key] !== '' && !preg_match('/^\+?[0-9]{8,15}$/', $out[$key])) { throw new InvalidArgumentException('Số điện thoại/Zalo phải có 8–15 chữ số.'); }
    }
    foreach (['max_width','max_height'] as $key) { $out[$key] = pdtg_number($input[$key] ?? null, 1, 5000); }
    $out['bleed'] = pdtg_number($input['bleed'] ?? null, 0, 50);
    $out['max_quantity'] = pdtg_number($input['max_quantity'] ?? null, 1, 10000000, true);
    foreach (['lamination_fee','cutting_fee','design_fee'] as $key) { $out[$key] = pdtg_number($input[$key] ?? null, 0, 100000000, true); }
    if (!isset($input['tiers']) || !is_array($input['tiers']) || !count($input['tiers']) || count($input['tiers']) > 100) { throw new InvalidArgumentException('Bảng giá cần từ 1 đến 100 bậc.'); }
    $out['tiers'] = [];
    foreach ($input['tiers'] as $row) {
        if (!is_array($row)) { throw new InvalidArgumentException('Bậc giá không hợp lệ.'); }
        $out['tiers'][] = ['from'=>pdtg_number($row['from'] ?? null, 1, 10000000, true),'to'=>pdtg_number($row['to'] ?? null, 0, 10000000, true),'price'=>pdtg_number($row['price'] ?? null, 0, 100000000, true)];
    }
    usort($out['tiers'], function ($a,$b) { return $a['from'] <=> $b['from']; });
    $expected = 1;
    foreach ($out['tiers'] as $i=>$row) {
        if ($row['from'] !== $expected || ($row['to'] !== 0 && $row['to'] < $row['from'])) { throw new InvalidArgumentException('Bảng giá phải liên tục từ tờ 1, không có khoảng trống hoặc chồng bậc.'); }
        $last = $i === count($out['tiers']) - 1;
        if (($last && $row['to'] !== 0) || (!$last && $row['to'] === 0)) { throw new InvalidArgumentException('Chỉ bậc cuối phải có “Đến tờ” bằng 0 (không giới hạn).'); }
        $expected = $row['to'] + 1;
    }
    if (empty($input['materials']) || !is_array($input['materials']) || count($input['materials']) > 30) { throw new InvalidArgumentException('Cần từ 1 đến 30 loại decal.'); }
    $out['materials'] = []; $seen = [];
    foreach ($input['materials'] as $row) {
        if (!is_array($row)) { throw new InvalidArgumentException('Vật liệu không hợp lệ.'); }
        $slug = sanitize_title(pdtg_text($row['slug'] ?? ''));
        $name = pdtg_text($row['name'] ?? '');
        if (!$slug || !$name || strlen($name)>200 || strlen($slug)>100 || isset($seen[$slug])) { throw new InvalidArgumentException('Tên và mã vật liệu không được trống; mã phải duy nhất.'); }
        $seen[$slug] = true;
        $out['materials'][] = ['slug'=>$slug,'name'=>$name,'fee'=>pdtg_number($row['fee'] ?? null, 0, 100000000, true)];
    }
    return $out;
}

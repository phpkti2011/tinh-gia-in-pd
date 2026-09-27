// Tải một phần tử <svg> đang hiển thị thành file .svg (dùng cho hình mô tả/sơ đồ).
export function saveSvg(svg, name) {
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

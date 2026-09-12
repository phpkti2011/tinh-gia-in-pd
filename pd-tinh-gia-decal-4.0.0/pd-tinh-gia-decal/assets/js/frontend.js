(() => {
  'use strict';
  const money = n => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' đ';
  const number = n => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n);
  function init(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    const form = root.querySelector('form'), button = form.querySelector('[type="submit"]');
    const error = root.querySelector('.pdtg__error'), status = root.querySelector('.pdtg__status');
    const details = root.querySelector('.pdtg__details');
    let controller, revision = 0, attempted = false;
    function reset() {
      revision++; if (controller) controller.abort();
      button.disabled = false; button.textContent = 'Tính giá ngay';
      root.querySelector('.pdtg__result').removeAttribute('aria-busy');
      error.hidden = true; details.hidden = true; status.hidden = false;
      status.textContent = attempted ? 'Thông số đã thay đổi. Bấm “Tính giá ngay” để cập nhật.' : 'Kết quả sẽ xuất hiện sau khi bạn nhập thông tin và bấm tính giá.';
    }
    form.addEventListener('input', reset); form.addEventListener('change', reset);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity()) return;
      reset(); attempted = true;
      const ticket = revision; controller = new AbortController();
      const requestController = controller;
      const timeout = setTimeout(() => requestController.abort(), 20000);
      button.disabled = true; button.textContent = 'Đang tính…';
      status.textContent = 'Đang tính báo giá…'; root.querySelector('.pdtg__result').setAttribute('aria-busy', 'true');
      const body = new URLSearchParams(new FormData(form));
      body.set('action', 'pdtg_calculate');
      body.set('lamination', form.elements.lamination.checked ? '1' : '0');
      try {
        const response = await fetch(root.dataset.endpoint, { method: 'POST', body, signal: requestController.signal, credentials: 'same-origin', cache: 'no-store' });
        const json = await response.json();
        if (ticket !== revision) return;
        if (!json.success) throw new Error(json.data?.message || 'Chưa thể tính giá. Vui lòng thử lại.');
        const d = json.data;
        if (!d || !Number.isFinite(d.total) || !Number.isFinite(d.unit_price)) throw new Error('Kết quả không hợp lệ. Vui lòng liên hệ để được báo giá.');
        const rows = [
          ['Kích thước tem', `${number(d.width)} × ${number(d.height)} mm`],
          ['Số lượng yêu cầu', `${number(d.quantity)} tem`],
          ['Vật liệu', d.material], ['Cán màng', d.lamination ? 'Có' : 'Không'],
          ['Số tem / tờ', `${number(d.per_sheet)} tem`], ['Số tờ cần in', `${number(d.sheets)} tờ`],
          ['Công in', money(d.print_cost)],
        ];
        [['material_cost','Phụ phí vật liệu'],['lamination_cost','Cán màng'],['cutting_cost','Phí bế thêm'],['design_cost','Phí thiết kế']].forEach(([key, label]) => { if (d[key] > 0) rows.push([label, money(d[key])]); });
        const tbody = details.querySelector('tbody'); tbody.replaceChildren();
        rows.forEach(([label, value]) => {
          const row = document.createElement('tr'), th = document.createElement('th'), td = document.createElement('td');
          th.scope = 'row'; th.textContent = label; td.textContent = value; row.append(th, td); tbody.append(row);
        });
        root.querySelector('.pdtg__total').textContent = money(d.total);
        root.querySelector('.pdtg__unit').textContent = `Khoảng ${money(d.unit_price)} / tem (làm tròn)`;
        root.querySelector('.pdtg__notice').textContent = d.notice;
        status.hidden = true; details.hidden = false;
      } catch (e) {
        if (ticket !== revision) return;
        error.textContent = e.name === 'AbortError' ? 'Kết nối quá lâu. Vui lòng thử lại.' : (e instanceof SyntaxError || e instanceof TypeError ? 'Không kết nối được bộ tính giá. Vui lòng thử lại hoặc liên hệ bên dưới.' : e.message);
        error.hidden = false; status.textContent = 'Chưa có báo giá. Kiểm tra thông tin và thử lại.';
      } finally {
        clearTimeout(timeout);
        if (ticket === revision) { button.disabled = false; button.textContent = 'Tính giá ngay'; root.querySelector('.pdtg__result').removeAttribute('aria-busy'); }
      }
    });
  }
  function scan() { document.querySelectorAll('[data-pdtg]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();

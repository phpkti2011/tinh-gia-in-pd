(() => {
  'use strict';
  const form = document.getElementById('pdtg-settings');
  if (!form) return;
  const fields = { tiers: ['from', 'to', 'price'], materials: ['name', 'slug', 'fee'] };
  function reindex() {
    form.querySelectorAll('[data-table]').forEach(table => {
      const group = table.dataset.table;
      table.querySelectorAll('tbody tr').forEach((row, i) => {
        row.querySelectorAll('input').forEach((input, j) => {
          input.name = `pdtg[${group}][${i}][${fields[group][j]}]`;
          input.setAttribute('aria-label', `${table.querySelectorAll('th')[j].textContent} – dòng ${i + 1}`);
        });
      });
    });
  }
  form.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove]');
    if (remove) { remove.closest('tr').remove(); reindex(); return; }
    const add = event.target.closest('[data-add]');
    if (!add) return;
    const group = add.dataset.add;
    const tbody = form.querySelector(`[data-table="${group}"] tbody`);
    const row = document.createElement('tr');
    fields[group].forEach(field => {
      const cell = document.createElement('td'), input = document.createElement('input');
      input.type = ['name', 'slug'].includes(field) ? 'text' : 'number';
      input.required = true;
      if (input.type === 'number') {
        input.min = field === 'from' ? '1' : '0'; input.step = '1';
        input.max = ['fee', 'price'].includes(field) ? '100000000' : '10000000';
        if (['to', 'fee'].includes(field)) input.value = '0';
      }
      cell.append(input); row.append(cell);
    });
    const cell = document.createElement('td'), button = document.createElement('button');
    button.type = 'button'; button.className = 'button'; button.dataset.remove = '';
    button.textContent = group === 'tiers' ? 'Xóa bậc' : 'Xóa loại';
    cell.append(button); row.append(cell); tbody.append(row); reindex(); row.querySelector('input').focus();
  });
  form.addEventListener('submit', reindex); reindex();
})();

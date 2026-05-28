# Pricing Rules — Decal / Sticker

Module decal cần được ưu tiên refactor trước vì dễ sai nhất.

Các nhóm logic cần tách:

```txt
1. Tính kích thước tem sau khi cộng biên cắt.
2. Tính số con trên một tờ.
3. Tính số tờ cần in.
4. Tính giá in cơ bản theo bảng giá.
5. Tính phụ phí cán màng.
6. Tính phụ phí bế/cắt/thành phẩm.
7. Tính tổng tiền và đơn giá.
```

Output chuẩn nên có:

```js
{
  itemsPerSheet,
  sheetCount,
  basePrintPrice,
  laminationFee,
  finishingFee,
  totalPrice,
  unitPrice,
  breakdown,
  warnings
}
```

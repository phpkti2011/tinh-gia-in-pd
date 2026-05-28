# Skill: Pricing Engine Refactor

Mục tiêu:
Tách logic tính giá khỏi React UI.

Quy tắc:

```txt
Input + config → engine → result
```

Engine không phụ thuộc:
- React
- DOM
- localStorage
- fetch
- Supabase
- UI state

Mẫu function:

```js
export function calculatePrice(input, config) {
  validateInput(input)
  validateConfig(config)
  return {
    totalPrice: 0,
    unitPrice: 0,
    breakdown: [],
    warnings: []
  }
}
```

Checklist:
- Có golden test trước khi tách.
- Output giữ giống logic cũ.
- Không đổi tên field public nếu UI đang dùng.

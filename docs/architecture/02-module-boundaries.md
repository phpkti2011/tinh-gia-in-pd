# Ranh giới module

Mỗi module tính giá phải độc lập tương đối.

Ví dụ module decal:

```txt
modules/decal/
  engine/
    calculateDecalPrice.js
    calculateSheetLayout.js
    calculateLaminationFee.js
    calculateCuttingFee.js

  config/
    defaultDecalConfig.js
    decalConfigSchema.js

  ui/
    DecalPage.jsx
    DecalInputPanel.jsx
    DecalResultPanel.jsx
    DecalSettingsPanel.jsx

  tests/
    decal.golden.test.js
```

Engine chỉ được nhận:

```js
calculateDecalPrice(input, config)
```

Engine không được dùng:
- React
- localStorage
- fetch
- DOM
- alert
- password
- database client

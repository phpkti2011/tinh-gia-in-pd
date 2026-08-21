// NumberField — controlled number input fix leading-zero bug.
//
// Vấn đề gốc: input `type="number"` controlled với state `number`. Khi user
// clear input, `parseFloat("")` = NaN → nếu caller ép về 0 → React re-render
// hiển thị "0" → user gõ "66" → DOM thành "066".
//
// Fix: dùng local string state buffer. onChange commit ngay khi parse hợp lệ,
// nhưng không đè localStr → user có thể để rỗng, gõ tiếp mà không bị ép 0.
// onBlur: rỗng/NaN → restore từ value; hợp lệ → commit.
//
// Sync ngược từ parent (vd load config mới) qua prevValue ref: chỉ re-mirror
// khi value đổi, tránh đè localStr khi user đang gõ.

import { useState, useRef, useEffect } from 'react';

export default function NumberField({
    value,
    onCommit,
    step,
    min,
    max,
    className,
    disabled,
    placeholder,
    ...rest
}) {
    const [localStr, setLocalStr] = useState(String(value ?? ''));
    const prevValue = useRef(value);

    useEffect(() => {
        if (prevValue.current !== value) {
            prevValue.current = value;
            setLocalStr(String(value ?? ''));
        }
    }, [value]);

    const handleChange = (e) => {
        const v = e.target.value;
        setLocalStr(v);
        if (v === '' || v === '-' || v === '.') return;
        const parsed = parseFloat(v);
        if (!isNaN(parsed)) onCommit(parsed);
    };

    const handleBlur = () => {
        const parsed = parseFloat(localStr);
        if (isNaN(parsed)) {
            setLocalStr(String(value ?? ''));
        } else {
            onCommit(parsed);
        }
    };

    return (
        <input
            type="number"
            value={localStr}
            step={step}
            min={min}
            max={max}
            disabled={disabled}
            placeholder={placeholder}
            className={className}
            onChange={handleChange}
            onBlur={handleBlur}
            {...rest}
        />
    );
}

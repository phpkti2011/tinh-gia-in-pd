// ESLint flat config (v9+) — P3-LINT.1 baseline.
//
// Triết lý: NHẸ ở baseline — chỉ bắt lỗi chắc chắn (undef, hook rules,
// syntax). Unused vars / exhaustive-deps để 'warn' (không fail CI) để
// dev có thể audit dần. Auto-format toàn repo sẽ làm ở task riêng.

import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
    // Ignores — phải nằm trước
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'coverage/**',
            'docs/**',
            '.vercel/**',
            // Config files (không lint chính mình + vite config — Node env riêng)
            'eslint.config.js',
            'vite.config.js',
            'postcss.config.js',
            'tailwind.config.js',
            // Legacy files (gitignored nhưng có thể trên disk dev)
            'google-apps-script.js',
        ],
    },

    // JS recommended
    js.configs.recommended,

    // Source code (browser env)
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
            },
        },
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            // Baseline — bắt lỗi chắc chắn
            'no-undef': 'error',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['warn', { allowEmptyCatch: true }],

            // React 18+ JSX transform — không cần import React
            'react/jsx-uses-react': 'off',
            'react/react-in-jsx-scope': 'off',
            // Project không dùng PropTypes (no TS)
            'react/prop-types': 'off',
            // jsx-key quan trọng cho list rendering
            'react/jsx-key': 'error',
            // Cho phép unescaped entities trong JSX (nhiều chỗ đã dùng)
            'react/no-unescaped-entities': 'off',
            // P3-LINT.3: bật để no-unused-vars KHÔNG mark component dùng trong
            // JSX là "unused" (false positive). Vd: `<HomePage />` trong JSX
            // sẽ marked HomePage là used.
            'react/jsx-uses-vars': 'error',

            // Hook rules — của-of-hooks là invariant
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
        settings: {
            react: { version: '18.2' },
        },
    },

    // Tests (vitest + Node env + browser env do test có thể chạy jsdom)
    {
        files: ['tests/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.node,
                ...globals.browser,
                // Vitest globals — vi tự import được, nhưng describe/it/expect cần khai báo
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                beforeEach: 'readonly',
                afterAll: 'readonly',
                afterEach: 'readonly',
                vi: 'readonly',
            },
        },
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooks,
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'react/jsx-uses-react': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/jsx-key': 'error',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
        settings: {
            react: { version: '18.2' },
        },
    },
];

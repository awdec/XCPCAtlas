// ESLint flat config：Vue + TS + 分层导入约束（计划 §5.2）
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import importX from 'eslint-plugin-import-x'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

// 分层：domain ← data ← shared ← entities ← features ← pages ← layouts ← app（只能向左依赖）
const LAYERS = ['domain', 'data', 'shared', 'entities', 'features', 'pages', 'layouts', 'app']
const layerZones = LAYERS.flatMap((layer, i) =>
  LAYERS.slice(i + 1).map(higher => ({
    target: `./src/${layer}`,
    from: `./src/${higher}`,
    message: `分层约束：${layer} 不能依赖更上层的 ${higher}`,
  })),
)

// Worker 边界（计划 §5.2）：不得依赖 UI 层；data 层只复用无 DOM 的实现。
// except 相对 from 解析，故只写文件名。
const WORKER_DATA_ALLOWED = ['year-core.ts', 'loaders.ts', 'fetch-json.ts', 'schemas.ts']
const workerZones = [
  ...['shared', 'entities', 'features', 'pages', 'layouts', 'app'].map(higher => ({
    target: './src/workers',
    from: `./src/${higher}`,
    message: `Worker 不能依赖 UI 层 ${higher}`,
  })),
  {
    target: './src/workers',
    from: './src/data',
    except: WORKER_DATA_ALLOWED,
    message: 'Worker 只能复用 data 层的无 DOM 实现（year-core / loaders / fetch-json / schemas）',
  },
]

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'tests/reference/**', 'tests/golden/__golden__/**', 'public/**',
  ] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, sourceType: 'module', extraFileExtensions: ['.vue'] },
    },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node }, ecmaVersion: 'latest', sourceType: 'module' },
    plugins: { 'import-x': importX },
    settings: {
      // 与 tsconfig paths / Vite alias 一致：@/ 与省略扩展名的导入也要解析到真实文件，
      // 否则 no-restricted-paths 对这两种写法失效（审查 P2-4）
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: './tsconfig.json' })],
    },
    rules: {
      'import-x/no-restricted-paths': ['error', { zones: [...layerZones, ...workerZones] }],
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // domain / data / workers 禁止 any（验收标准 10.7）
    files: ['src/domain/**', 'src/data/**', 'src/workers/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    // domain 不得依赖 Vue 与浏览器 API
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['vue', 'vue-router', '@vueuse/*', 'pinia'] }],
    },
  },
)

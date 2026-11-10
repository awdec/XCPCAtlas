// ESLint flat config：Vue + TS + 分层导入约束（计划 §5.2）
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import importX from 'eslint-plugin-import-x'
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

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'tests/reference/**', 'tests/golden/__golden__/**', 'public/**',
    // 过渡期：旧视图在 M3–M5 被逐页替换并删除，届时自动移出
    'src/views/**', 'src/components/**', 'src/App.vue', 'src/main.ts'] },
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
    rules: {
      'import-x/no-restricted-paths': ['error', { zones: layerZones }],
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

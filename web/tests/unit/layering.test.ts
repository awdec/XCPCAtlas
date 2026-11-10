// 分层约束（计划 §5.2 / 审查 P2-4）：@/ 别名与省略扩展名的导入也必须被拦截。
// 用 ESLint Node API 对虚拟文件做检查，避免在 src/ 下留探针文件。
import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'

const eslint = new ESLint({ cwd: process.cwd() })

async function ruleIds(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath })
  return result.messages.map(m => m.ruleId)
}

const LAYER_RULE = 'import-x/no-restricted-paths'

describe('分层约束', () => {
  it('domain 不能通过 @/ 别名导入 pages', async () => {
    const ids = await ruleIds("import x from '@/pages/home/HomePage.vue'\nexport default x\n", 'src/domain/__probe.ts')
    expect(ids).toContain(LAYER_RULE)
  })

  it('domain 不能通过省略扩展名的相对路径导入 data', async () => {
    const ids = await ruleIds("import { useYears } from '../data/queries'\nexport default useYears\n", 'src/domain/__probe.ts')
    expect(ids).toContain(LAYER_RULE)
  })

  it('workers 不能导入 UI 层', async () => {
    const ids = await ruleIds("import B from '@/shared/ui/Button.vue'\nexport default B\n", 'src/workers/__probe.ts')
    expect(ids).toContain(LAYER_RULE)
  })

  it('workers 可以复用 data 层的无 DOM 实现', async () => {
    const ids = await ruleIds("import { createYearCore } from '@/data/year-core'\nexport default createYearCore\n", 'src/workers/__probe.ts')
    expect(ids).not.toContain(LAYER_RULE)
  })
})

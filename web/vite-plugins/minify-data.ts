/**
 * D6：构建产物中的 data/**\/*.json 去空白重新序列化（内容不变，仅移除缩进/换行）。
 * 只处理 dist，不碰 public/data 源文件；正确性由 scripts/verify-data.mjs 校验。
 */
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.json')) out.push(p)
  }
  return out
}

export function minifyData(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'xcpc:minify-data',
    apply: 'build',
    configResolved(c) { config = c },
    closeBundle() {
      const dir = path.resolve(config.root, config.build.outDir, 'data')
      if (!fs.existsSync(dir)) return
      let before = 0
      let after = 0
      for (const file of walk(dir)) {
        const text = fs.readFileSync(file, 'utf8')
        const min = JSON.stringify(JSON.parse(text))
        before += Buffer.byteLength(text)
        after += Buffer.byteLength(min)
        fs.writeFileSync(file, min)
      }
      config.logger.info(`[minify-data] ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`)
    },
  }
}

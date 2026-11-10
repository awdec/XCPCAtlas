// D6 校验：dist/data 与 public/data 文件集合一致、逐文件内容深度相等、总体积缩减 ≥ 45%
import fs from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'

const SRC = 'public/data'
const DIST = 'dist/data'
const walk = (dir, base = dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, base, out)
    else out.push(path.relative(base, p))
  }
  return out
}
if (!fs.existsSync(DIST)) { console.error('缺少 dist/data，请先 npm run build'); process.exit(1) }
const src = walk(SRC).sort()
const dist = walk(DIST).sort()
let failed = false
const missing = src.filter(f => !dist.includes(f))
const extra = dist.filter(f => !src.includes(f))
if (missing.length || extra.length) { console.error('文件集合不一致', { missing, extra }); failed = true }
let before = 0
let after = 0
for (const f of src.filter(f => f.endsWith('.json'))) {
  const a = fs.readFileSync(path.join(SRC, f), 'utf8')
  const b = fs.readFileSync(path.join(DIST, f), 'utf8')
  before += Buffer.byteLength(a)
  after += Buffer.byteLength(b)
  if (!isDeepStrictEqual(JSON.parse(a), JSON.parse(b))) { console.error('内容不一致:', f); failed = true }
}
const saving = 1 - after / before
console.log(`data: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB（-${(saving * 100).toFixed(1)}%），${src.length} 个文件`)
if (saving < 0.45) { console.error('总体积缩减不足 45%'); failed = true }
process.exit(failed ? 1 : 0)

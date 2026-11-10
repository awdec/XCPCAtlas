// 生成 golden 基线（M0-T3）。只用冻结的 reference 实现。
// 用法：npm run gen:golden   —— 仅在数据更新且经仓库所有者同意后重跑（见重构计划 §12）
import fs from 'node:fs'
import path from 'node:path'
import impl from '../tests/golden/reference-impl.js'
import { GOLDEN_DIR, loadGlobal, loadYearFiles, computeAll, computeAllYearsPlayer, samplePlayers, packAll } from '../tests/golden/harness.js'

const global = loadGlobal()
const allYearFiles = global.years.map(y => ({ year: y.year, ...loadYearFiles(y.year) }))
fs.rmSync(GOLDEN_DIR, { recursive: true, force: true })

for (const yf of allYearFiles) {
  const t0 = Date.now()
  const out = computeAll(impl, yf.year, yf, global)
  out.playerAllYears = samplePlayers(yf.contests).map(({ name, school }) => ({
    name, school, records: computeAllYearsPlayer(impl, yf.year, name, school, allYearFiles, yf.oi),
  }))
  const dir = path.join(GOLDEN_DIR, String(yf.year))
  fs.mkdirSync(dir, { recursive: true })
  const packed = packAll(out)
  for (const [k, v] of Object.entries(packed)) {
    fs.writeFileSync(path.join(dir, `${k}.json`), JSON.stringify(v, null, 1) + '\n')
  }
  console.log(`${yf.year}: ${Object.keys(packed).length} 项, ${Date.now() - t0}ms`)
}

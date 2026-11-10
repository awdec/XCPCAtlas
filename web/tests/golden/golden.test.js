import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'
import impl from './current-impl.js'
import { GOLDEN_DIR, loadGlobal, loadYearFiles, computeAll, computeAllYearsPlayer, samplePlayers, packAll } from './harness.js'

const global = loadGlobal()
const years = global.years.map(y => y.year)
let allYearFiles

beforeAll(() => {
  allYearFiles = years.map(year => ({ year, ...loadYearFiles(year) }))
})

describe.each(years)('golden %i', (year) => {
  it('与基线逐项一致', () => {
    const yf = allYearFiles.find(y => y.year === year)
    const out = computeAll(impl, year, yf, global)
    out.playerAllYears = samplePlayers(yf.contests).map(({ name, school }) => ({
      name, school, records: computeAllYearsPlayer(impl, year, name, school, allYearFiles, yf.oi),
    }))
    const packed = JSON.parse(JSON.stringify(packAll(out)))
    const dir = path.join(GOLDEN_DIR, String(year))
    const expectedKeys = fs.readdirSync(dir).map(f => f.replace(/\.json$/, '')).sort()
    expect(Object.keys(packed).sort()).toEqual(expectedKeys)
    for (const k of expectedKeys) {
      const expected = JSON.parse(fs.readFileSync(path.join(dir, `${k}.json`), 'utf8'))
      expect(packed[k], `${year}/${k}`).toEqual(expected)
    }
  })
})

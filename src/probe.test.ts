import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('temp probe', () => {
  it('reads parts of types/crm.ts', () => {
    const content = fs.readFileSync('src/types/crm.ts', 'utf8')
    const idx = content.indexOf('export interface OrcamentoSolar')
    const excerpt = content.slice(idx, idx + 1500)
    expect(excerpt).toBe('') // will fail and print excerpt!
  })
})

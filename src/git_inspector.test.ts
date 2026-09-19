import { describe, it } from 'vitest'
import fs from 'node:fs'

describe('git info', () => {
  it('reads git info', () => {
    try {
      const commit = fs.readFileSync('.git/refs/tags/v0.0.375', 'utf-8').trim()
      fs.writeFileSync('temp_git_info.json', JSON.stringify({ v375: commit }))
    } catch (e) {
      fs.writeFileSync('temp_git_info.json', JSON.stringify({ error: String(e) }))
    }
  })
})

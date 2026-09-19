import { describe, it } from 'vitest'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

describe('git history probe', () => {
  it('reads git log', () => {
    try {
      const log = execSync('git log -n 5 --oneline', { encoding: 'utf-8' })
      fs.writeFileSync('temp_git_log.txt', log)
    } catch (e) {
      fs.writeFileSync('temp_git_log.txt', String(e))
    }
  })
})

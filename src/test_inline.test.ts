import { describe, it, expect } from 'vitest'
import onGridInline from '@/assets/editedimage1789566225196-8e828.png?inline'

describe('test inline', () => {
  it('checks if onGridInline is data uri', () => {
    expect(onGridInline).toMatch(/^data:image\/png;base64,/)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isChunkLoadError, reloadPageForChunkUpdate } from './lazyWithRetry'

describe('lazyWithRetry and chunk load error resilience', () => {
  const originalLocation = window.location

  beforeEach(() => {
    window.sessionStorage.clear()
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: vi.fn(),
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('identifica corretamente erros de chunk dinâmico desatualizado', () => {
    expect(
      isChunkLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://preview.domain/assets/Projetos-C1OEvk77.js',
        ),
      ),
    ).toBe(true)

    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true)

    expect(isChunkLoadError(new Error('ChunkLoadError: Loading chunk 5 failed'))).toBe(true)

    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true)

    expect(isChunkLoadError(new Error('failed to load module script'))).toBe(true)

    expect(isChunkLoadError(new Error('Network error 500'))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })

  it('recarrega a página uma vez e respeita o cooldown para não entrar em loop infinito', () => {
    // 1ª vez: deve acionar reload e retornar true
    const reloaded1 = reloadPageForChunkUpdate()
    expect(reloaded1).toBe(true)
    expect(window.location.reload).toHaveBeenCalledTimes(1)

    // 2ª vez imediata: dentro do cooldown de 15s, deve retornar false e NÃO acionar reload novamente
    const reloaded2 = reloadPageForChunkUpdate()
    expect(reloaded2).toBe(false)
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })
})

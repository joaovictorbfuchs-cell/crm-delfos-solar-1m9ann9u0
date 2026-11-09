import { describe, it, expect } from 'vitest'
import pbDirect, {
  pb as pbNamed,
  isAuthSessionError as isAuthSessionErrorClient,
} from '@/lib/pocketbase/client'
import {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
} from '@/lib/pocketbase/errors'
import pbBarrel, {
  pb as pbBarrelNamed,
  isAuthSessionError as isAuthSessionErrorBarrel,
} from '@/lib/pocketbase/index'

/**
 * Trava permanente de compilação e teste unitário para exports críticos de PocketBase.
 * Se alguém apagar ou esquecer de re-exportar `pb` ou `isAuthSessionError` de client.ts ou errors.ts,
 * este teste FALHARÁ IMEDIATAMENTE no QA antes de qualquer deploy em produção.
 */
describe('Trava Permanente de Exports do PocketBase (client.ts & errors.ts)', () => {
  it('garante exports estáticos de pb (default e named) em client.ts', () => {
    expect(pbDirect).toBeDefined()
    expect(pbNamed).toBeDefined()
    expect(pbDirect).toBe(pbNamed)
    expect(typeof pbDirect.collection).toBe('function')
  })

  it('garante exports estáticos de isAuthSessionError em client.ts e errors.ts', () => {
    expect(typeof isAuthSessionError).toBe('function')
    expect(typeof isAuthSessionErrorClient).toBe('function')
    expect(isAuthSessionError).toBe(isAuthSessionErrorClient)

    // Casos esperados de status 401 e 403
    expect(isAuthSessionError({ status: 401 })).toBe(true)
    expect(isAuthSessionError({ status: 403 })).toBe(true)
    expect(isAuthSessionError({ response: { status: 401 } })).toBe(true)
    expect(isAuthSessionError({ statusCode: 403 })).toBe(true)

    // Casos de texto de token expirado
    expect(isAuthSessionError(new Error('Token is expired or invalid'))).toBe(true)
    expect(isAuthSessionError(new Error('Sessão expirada'))).toBe(true)
    expect(isAuthSessionError(new Error('Login expirou'))).toBe(true)
    expect(isAuthSessionError(new Error('Failed to authenticate'))).toBe(true)

    // Casos negativos
    expect(isAuthSessionError(null)).toBe(false)
    expect(isAuthSessionError(undefined)).toBe(false)
    expect(isAuthSessionError({ status: 500 })).toBe(false)
    expect(isAuthSessionError(new Error('Generic network timeout'))).toBe(false)
    expect(isAuthSessionError({ isAbort: true })).toBe(false)
  })

  it('garante utilitários complementares de erros e barrel index.ts', () => {
    expect(typeof isAbortError).toBe('function')
    expect(typeof formatPbError).toBe('function')
    expect(typeof extractFieldErrors).toBe('function')
    expect(typeof getErrorMessage).toBe('function')

    expect(isAbortError({ isAbort: true })).toBe(true)
    expect(isAbortError({ name: 'AbortError' })).toBe(true)

    expect(pbBarrel).toBeDefined()
    expect(pbBarrelNamed).toBeDefined()
    expect(typeof isAuthSessionErrorBarrel).toBe('function')
  })

  it('garante re-exports nas salvaguardas raiz @/lib/client e @/lib/errors e @/services/errors', async () => {
    const rootClient = await import('@/lib/client')
    const rootErrors = await import('@/lib/errors')
    const servErrors = await import('@/services/errors')

    expect(rootClient.default).toBeDefined()
    expect(rootClient.pb).toBeDefined()
    expect(typeof rootClient.isAuthSessionError).toBe('function')

    expect(typeof rootErrors.isAuthSessionError).toBe('function')
    expect(typeof rootErrors.isAbortError).toBe('function')
    expect(typeof rootErrors.formatPbError).toBe('function')
    expect(typeof rootErrors.extractFieldErrors).toBe('function')
    expect(typeof rootErrors.getErrorMessage).toBe('function')

    expect(typeof servErrors.isAuthSessionError).toBe('function')
    expect(typeof servErrors.isAbortError).toBe('function')
    expect(typeof servErrors.formatPbError).toBe('function')
  })
})

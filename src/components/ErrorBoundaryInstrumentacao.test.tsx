import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RootErrorBoundary } from '@/components/RootErrorBoundary'
import pb from '@/lib/pocketbase/client'

describe('Instrumentação permanente de erros de frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('ErrorBoundary envia log fire-and-forget para a coleção logs_erro_frontend ao capturar erro', () => {
    const mockCreate = vi.fn().mockReturnValue(Promise.resolve({ id: 'log123' }))
    const collectionSpy = vi.spyOn(pb, 'collection').mockReturnValue({
      create: mockCreate,
    } as unknown as ReturnType<typeof pb.collection>)

    function CrashComponent(): React.ReactNode {
      throw new Error('Falha simulada em componente teste')
    }

    render(React.createElement(ErrorBoundary, null, React.createElement(CrashComponent, null)))

    expect(collectionSpy).toHaveBeenCalledWith('logs_erro_frontend')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Falha simulada em componente teste',
        stack: expect.any(String),
        component_stack: expect.any(String),
        rota: expect.any(String),
        user_agent: expect.any(String),
      }),
    )
  })

  it('ErrorBoundary falha silenciosamente sem quebrar renderização se pb.create rejeitar', () => {
    const mockCreate = vi.fn().mockReturnValue(Promise.reject(new Error('Network offline / 404')))
    vi.spyOn(pb, 'collection').mockReturnValue({
      create: mockCreate,
    } as unknown as ReturnType<typeof pb.collection>)

    function CrashComponent(): React.ReactNode {
      throw new Error('Falha com erro de rede no envio de telemetria')
    }

    const { getByRole } = render(
      React.createElement(ErrorBoundary, null, React.createElement(CrashComponent, null)),
    )

    // O fallback deve continuar sendo exibido normalmente
    expect(getByRole('alert')).toBeDefined()
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('RootErrorBoundary envia log fire-and-forget para a coleção logs_erro_frontend ao capturar erro', () => {
    const mockCreate = vi.fn().mockReturnValue(Promise.resolve({ id: 'log456' }))
    const collectionSpy = vi.spyOn(pb, 'collection').mockReturnValue({
      create: mockCreate,
    } as unknown as ReturnType<typeof pb.collection>)

    function RootCrashComponent(): React.ReactNode {
      throw new Error('Falha simulada no RootErrorBoundary')
    }

    render(
      React.createElement(RootErrorBoundary, null, React.createElement(RootCrashComponent, null)),
    )

    expect(collectionSpy).toHaveBeenCalledWith('logs_erro_frontend')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Falha simulada no RootErrorBoundary',
        stack: expect.any(String),
        component_stack: expect.any(String),
      }),
    )
  })
})

import { useState, useCallback, useRef } from 'react'
import {
  CnpjDataNormalized,
  CnpjLookupStatus,
  consultarCNPJReceita,
  limparCNPJ,
} from '@/services/cnpjLookupService'
import { validarCNPJ, formatarCNPJ } from '@/lib/orcamentoParser'

export interface UseCnpjLookupOptions {
  onSuccess?: (data: CnpjDataNormalized) => void
  onError?: (msg: string) => void
}

export function useCnpjLookup(options?: UseCnpjLookupOptions) {
  const [status, setStatus] = useState<CnpjLookupStatus>('idle')
  const [data, setData] = useState<CnpjDataNormalized | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastQueriedCnpj, setLastQueriedCnpj] = useState<string>('')

  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setStatus('idle')
    setData(null)
    setErrorMessage(null)
    setLastQueriedCnpj('')
  }, [])

  const lookup = useCallback(
    async (cnpjInput: string, force = false): Promise<CnpjDataNormalized | null> => {
      const clean = limparCNPJ(cnpjInput)

      if (clean.length !== 14) {
        if (clean.length > 0) {
          setErrorMessage('CNPJ incompleto (14 dígitos)')
        } else {
          setErrorMessage(null)
        }
        return null
      }

      if (!validarCNPJ(clean)) {
        setStatus('error')
        const msg = 'CNPJ inválido (dígitos verificadores incorretos)'
        setErrorMessage(msg)
        options?.onError?.(msg)
        return null
      }

      // Evita requisição duplicada se já buscou este mesmo CNPJ com sucesso recente
      if (!force && clean === lastQueriedCnpj && status === 'success') {
        return data
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      setStatus('loading')
      setErrorMessage(null)
      setLastQueriedCnpj(clean)

      try {
        const result = await consultarCNPJReceita(clean, { signal: controller.signal })

        if (result.success && result.data) {
          setStatus('success')
          setData(result.data)
          setErrorMessage(null)
          options?.onSuccess?.(result.data)
          return result.data
        }

        if (result.notFound) {
          setStatus('not_found')
          const msg =
            'CNPJ não encontrado na Receita Federal — você pode preencher os dados manualmente.'
          setErrorMessage(msg)
          options?.onError?.(msg)
          return null
        }

        setStatus('error')
        const msg =
          result.error ||
          'Não foi possível consultar os dados na Receita Federal. O preenchimento manual continua disponível.'
        setErrorMessage(msg)
        options?.onError?.(msg)
        return null
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return null
        }
        setStatus('error')
        const msg =
          'Erro ao consultar CNPJ na Receita Federal. Você pode continuar preenchendo manualmente.'
        setErrorMessage(msg)
        options?.onError?.(msg)
        return null
      }
    },
    [lastQueriedCnpj, status, data, options],
  )

  return {
    status,
    data,
    errorMessage,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isNotFound: status === 'not_found',
    isError: status === 'error',
    lookup,
    reset,
    formatarCNPJ,
    limparCNPJ,
  }
}

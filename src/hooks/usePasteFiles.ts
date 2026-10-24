import { useCallback, useEffect, useRef } from 'react'

export interface UsePasteFilesOptions {
  /**
   * Callback invocado quando um ou mais arquivos são colados da área de transferência.
   */
  onFilesPasted: (files: File[]) => void
  /**
   * Se falso, o hook fica inativo (padrão: true).
   */
  enabled?: boolean
  /**
   * Se true, anexa automaticamente um listener global/no container referenciado.
   */
  containerRef?: React.RefObject<HTMLElement | null>
  /**
   * Tipos mime permitidos (ex: ['image/*', 'application/pdf']). Se omitido, aceita qualquer arquivo.
   */
  accept?: string[]
}

/**
 * Hook reutilizável para interceptar colagem da área de transferência (onPaste).
 * Extrai arquivos presentes em `event.clipboardData.files` ou `items`.
 * Se houver apenas texto puro e nenhum arquivo, NÃO intercepta (o texto segue o comportamento padrão do navegador).
 */
export function usePasteFiles({
  onFilesPasted,
  enabled = true,
  containerRef,
  accept,
}: UsePasteFilesOptions) {
  const onFilesPastedRef = useRef(onFilesPasted)
  onFilesPastedRef.current = onFilesPasted

  const matchesAccept = useCallback(
    (file: File): boolean => {
      if (!accept || accept.length === 0) return true
      return accept.some((rule) => {
        const cleanRule = rule.trim().toLowerCase()
        if (!cleanRule) return true
        if (cleanRule === '*/*') return true
        if (cleanRule.endsWith('/*')) {
          const typePrefix = cleanRule.slice(0, -1) // e.g. "image/"
          return file.type.toLowerCase().startsWith(typePrefix)
        }
        if (cleanRule.startsWith('.')) {
          return file.name.toLowerCase().endsWith(cleanRule)
        }
        return file.type.toLowerCase() === cleanRule
      })
    },
    [accept],
  )

  const handlePasteEvent = useCallback(
    (e: React.ClipboardEvent | ClipboardEvent) => {
      if (!enabled) return

      const clipboardData = e.clipboardData
      if (!clipboardData) return

      const extractedFiles: File[] = []

      // 1. Tentar ler diretamente de clipboardData.files
      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i]
          if (file && file.size > 0 && matchesAccept(file)) {
            extractedFiles.push(file)
          }
        }
      }

      // 2. Se não encontrou em files, inspecionar items (útil para prints de tela colados)
      if (extractedFiles.length === 0 && clipboardData.items && clipboardData.items.length > 0) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i]
          if (item.kind === 'file') {
            const file = item.getAsFile()
            if (file && file.size > 0 && matchesAccept(file)) {
              extractedFiles.push(file)
            }
          }
        }
      }

      // Se há arquivos, previne o comportamento padrão e dispara o callback
      if (extractedFiles.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        onFilesPastedRef.current(extractedFiles)
      }
      // Se não há arquivos (texto puro), deixa o navegador colar o texto normalmente
    },
    [enabled, matchesAccept],
  )

  // Opcional: listener anexado ao containerRef
  useEffect(() => {
    if (!enabled || !containerRef || !containerRef.current) return

    const node = containerRef.current
    const listener = (e: ClipboardEvent) => handlePasteEvent(e)

    node.addEventListener('paste', listener)
    return () => {
      node.removeEventListener('paste', listener)
    }
  }, [enabled, containerRef, handlePasteEvent])

  return {
    handlePaste: handlePasteEvent,
    pasteProps: {
      onPaste: handlePasteEvent,
    },
  }
}

import type { PropostaTecnicoComercialDados } from './propostaTecnicoComercialGenerator'

export interface OtimizarImagemOptions {
  maxWidth?: number
  maxHeight?: number
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
  quality?: number
}

// Cache de sessão para evitar re-otimizar a mesma imagem repetidamente
const imageOptimizationCache = new Map<string, string>()

/**
 * Limpa o cache de imagens otimizadas para PDF/impressão.
 */
export function limparCacheOtimizacaoImagens(): void {
  imageOptimizationCache.clear()
}

/**
 * Retorna o tamanho atual do cache (útil para diagnósticos e testes).
 */
export function getTamanhoCacheOtimizacaoImagens(): number {
  return imageOptimizationCache.size
}

/**
 * Otimiza uma imagem via elemento <canvas> mantendo proporção.
 * Se houver qualquer erro no carregamento ou processamento (JSDOM, CORS, etc.),
 * resolve de forma transparente e segura com o src original.
 */
export async function otimizarImagemParaImpressao(
  src: string | null | undefined,
  options: OtimizarImagemOptions = {},
): Promise<string> {
  if (!src || typeof src !== 'string') {
    return src || ''
  }

  const { maxWidth = 800, maxHeight = 600, mimeType = 'image/jpeg', quality = 0.85 } = options

  // Chave de cache baseada na URL/prefixo, dimensões máximas e qualidade
  const cacheKey = `${src.slice(0, 120)}_${src.length}_${maxWidth}x${maxHeight}_${mimeType}_${quality}`
  const cached = imageOptimizationCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Se não estiver em ambiente de navegador com suporte a Image/canvas (ex: Node/SSR puro sem window)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return src
  }

  return new Promise<string>((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      // Timeout preventivo para nunca travar a geração de PDF caso uma URL externa fique pendente
      const timer = setTimeout(() => {
        resolve(src)
      }, 5000)

      img.onload = () => {
        clearTimeout(timer)
        try {
          const originalWidth = img.naturalWidth || img.width
          const originalHeight = img.naturalHeight || img.height

          // Se a imagem já couber nos limites e for jpeg do mesmo tipo ou já compactada
          if (
            originalWidth > 0 &&
            originalHeight > 0 &&
            originalWidth <= maxWidth &&
            originalHeight <= maxHeight &&
            !src.startsWith('data:image/png') // Converte pngs pesados se mimeType for jpeg
          ) {
            imageOptimizationCache.set(cacheKey, src)
            return resolve(src)
          }

          if (originalWidth <= 0 || originalHeight <= 0) {
            return resolve(src)
          }

          // Calcula proporção
          let targetWidth = originalWidth
          let targetHeight = originalHeight

          if (targetWidth > maxWidth) {
            targetHeight = Math.round((targetHeight * maxWidth) / targetWidth)
            targetWidth = maxWidth
          }

          if (targetHeight > maxHeight) {
            targetWidth = Math.round((targetWidth * maxHeight) / targetHeight)
            targetHeight = maxHeight
          }

          const canvas = document.createElement('canvas')
          canvas.width = targetWidth
          canvas.height = targetHeight

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            return resolve(src)
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Preenchimento de fundo branco para JPEG caso a imagem original tenha transparência
          if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, targetWidth, targetHeight)
          }

          ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

          const dataUrl = canvas.toDataURL(mimeType, quality)

          // Só utiliza o dataUrl se for válido e mais eficiente/equivalente
          if (dataUrl && dataUrl.startsWith('data:image/')) {
            imageOptimizationCache.set(cacheKey, dataUrl)
            resolve(dataUrl)
          } else {
            resolve(src)
          }
        } catch {
          // Erro no canvas (ex: tainted canvas por CORS) -> fallback seguro para src original
          resolve(src)
        }
      }

      img.onerror = () => {
        clearTimeout(timer)
        resolve(src)
      }

      img.src = src
    } catch {
      resolve(src)
    }
  })
}

/**
 * Prepara e otimiza todos os dados de imagens da proposta para o pipeline de PDF/Impressão:
 * - Clona deep os dados (JSON.parse/stringify) para não mutar os objetos de estado originais.
 * - Otimiza fotos de portfólio customizadas (800x600, JPEG, 0.85)
 * - Otimiza foto do módulo solar (600x600, PNG)
 * - Otimiza foto do inversor solar (600x600, PNG) se existir
 * - Otimiza layout do telhado (1000x800, JPEG, 0.85) se existir
 *
 * Em caso de qualquer exceção geral, retorna os dados originais sem quebrar o fluxo.
 */
export async function prepararDadosPropostaParaPDF(
  dados: PropostaTecnicoComercialDados,
): Promise<PropostaTecnicoComercialDados> {
  if (!dados) {
    return dados
  }

  try {
    const clone: PropostaTecnicoComercialDados = JSON.parse(JSON.stringify(dados))

    const tarefas: Promise<void>[] = []

    // 1. Otimizar fotos das instalações personalizadas do portfólio
    if (Array.isArray(clone.fotosInstalacoes) && clone.fotosInstalacoes.length > 0) {
      clone.fotosInstalacoes.forEach((item) => {
        if (item && item.url) {
          tarefas.push(
            otimizarImagemParaImpressao(item.url, {
              maxWidth: 800,
              maxHeight: 600,
              mimeType: 'image/jpeg',
              quality: 0.85,
            }).then((otimizada) => {
              if (otimizada) {
                item.url = otimizada
              }
            }),
          )
        }
      })
    }

    // 2. Otimizar foto do módulo fotovoltaico
    if (clone.sistema?.fotoModuloUrl) {
      tarefas.push(
        otimizarImagemParaImpressao(clone.sistema.fotoModuloUrl, {
          maxWidth: 600,
          maxHeight: 600,
          mimeType: 'image/png',
        }).then((otimizada) => {
          if (otimizada && clone.sistema) {
            clone.sistema.fotoModuloUrl = otimizada
          }
        }),
      )
    }

    // 3. Otimizar foto do inversor solar (se presente)
    if (clone.sistema?.fotoInversorUrl) {
      tarefas.push(
        otimizarImagemParaImpressao(clone.sistema.fotoInversorUrl, {
          maxWidth: 600,
          maxHeight: 600,
          mimeType: 'image/png',
        }).then((otimizada) => {
          if (otimizada && clone.sistema) {
            clone.sistema.fotoInversorUrl = otimizada
          }
        }),
      )
    }

    // 4. Otimizar layout do telhado
    if (clone.layoutTelhadoUrl) {
      tarefas.push(
        otimizarImagemParaImpressao(clone.layoutTelhadoUrl, {
          maxWidth: 1000,
          maxHeight: 800,
          mimeType: 'image/jpeg',
          quality: 0.85,
        }).then((otimizada) => {
          if (otimizada) {
            clone.layoutTelhadoUrl = otimizada
          }
        }),
      )
    }

    if (tarefas.length > 0) {
      await Promise.all(tarefas)
    }

    return clone
  } catch (err) {
    console.warn(
      'prepararDadosPropostaParaPDF falhou silenciosamente, usando dados originais:',
      err,
    )
    return dados
  }
}

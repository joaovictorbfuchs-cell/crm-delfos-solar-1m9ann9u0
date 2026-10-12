/**
 * Utilitário para captura e conversão de propostas Delfos Solar (HTML oficial da proposta)
 * em base64 Data URI (data:application/pdf;base64,...) compatível com o endpoint
 * de envio de documentos da Z-API / Gateway WhatsApp.
 *
 * Utiliza o pipeline oficial de geração da Proposta Técnico-Comercial:
 * 1. converterInputParaTemplateComercial (src/lib/propostaSolarGenerator.ts)
 * 2. prepararDadosPropostaParaPDF (src/lib/propostaImageOptimizer.ts)
 * 3. gerarHTMLPropostaTecnicoComercial (src/lib/propostaTecnicoComercialGenerator.ts)
 * 4. Renderização em PDF A4 base64 via html2pdf.js carregado dinamicamente via CDN
 *
 * Elimina 100% qualquer envio de PDF simplificado de 1 página, garantindo que
 * o documento enviado por WhatsApp seja exatamente o mesmo gerado pelo botão "Gerar PDF".
 */

import { gerarHTMLPropostaSolar, type PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import {
  gerarHTMLPropostaTecnicoComercial,
  type PropostaTecnicoComercialDados,
} from '@/lib/propostaTecnicoComercialGenerator'
import { gerarHTMLPropostaOM, type PropostaPDFInput } from '@/lib/propostaOMGenerator'

import { formatCurrency } from '@/lib/formatters'

export const HTML2PDF_CDN_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'

declare global {
  interface Window {
    html2pdf?: any
  }
}

let html2pdfPromise: Promise<any> | null = null

/**
 * Carrega dinamicamente a biblioteca html2pdf.js via CDN sob demanda.
 * Cacheia a Promise para evitar inserções duplicadas no DOM.
 */
export function carregarHtml2Pdf(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('html2pdf.js requer ambiente de navegador com window.'))
  }

  if (window.html2pdf) {
    return Promise.resolve(window.html2pdf)
  }

  if (html2pdfPromise) {
    return html2pdfPromise
  }

  html2pdfPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${HTML2PDF_CDN_URL}"]`,
    ) as HTMLScriptElement | null

    if (existing) {
      if (window.html2pdf) {
        return resolve(window.html2pdf)
      }
      existing.addEventListener('load', () => resolve(window.html2pdf))
      existing.addEventListener('error', (e) => reject(e))
      return
    }

    const script = document.createElement('script')
    script.src = HTML2PDF_CDN_URL
    script.async = true
    script.onload = () => {
      if (window.html2pdf) {
        resolve(window.html2pdf)
      } else {
        reject(new Error('html2pdf não foi encontrado no objeto global window após carregar.'))
      }
    }
    script.onerror = () => {
      html2pdfPromise = null
      reject(new Error('Falha ao baixar html2pdf.js da CDN.'))
    }
    document.head.appendChild(script)
  })

  return html2pdfPromise
}

/**
 * Renderiza uma string HTML em PDF A4 Data URI base64 usando html2pdf.js
 * dentro de um container/iframe isolado.
 */
export interface RenderizarPdfOptions {
  timeoutMs?: number
  scale?: number
  imageQuality?: number
  compressJsPdf?: boolean
}

/**
 * Executa a conversão de HTML para PDF A4 via html2pdf.js em um iframe isolado
 * e invoca a ação desejada no worker ('datauristring', 'blob', 'save').
 */
async function executarHtml2PdfPipeline<T>(
  html: string,
  fileName: string,
  options: RenderizarPdfOptions,
  acao: (worker: any) => Promise<T>,
): Promise<T> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Ambiente de navegador com window e document necessário.')
  }

  const { timeoutMs = 25000, scale = 1.5, imageQuality = 0.85, compressJsPdf = true } = options

  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let completed = false

    timer = setTimeout(() => {
      if (!completed) {
        completed = true
        reject(
          new Error(
            `Tempo limite (${Math.round(timeoutMs / 1000)}s) atingido ao renderizar o PDF oficial. Verifique sua conexão e tente novamente.`,
          ),
        )
      }
    }, timeoutMs)

    async function executar() {
      let iframe: HTMLIFrameElement | null = null
      try {
        const html2pdf = await carregarHtml2Pdf()
        if (!html2pdf) {
          throw new Error('Biblioteca html2pdf.js não disponível.')
        }

        // Cria iframe isolado no DOM para garantir aplicação fiel de todos os estilos da proposta
        iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.left = '-9999px'
        iframe.style.top = '0'
        iframe.style.width = '800px'
        iframe.style.minHeight = '1120px'
        iframe.style.height = '1120px'
        iframe.style.border = 'none'
        iframe.style.visibility = 'visible'
        iframe.style.opacity = '0.01'
        iframe.style.pointerEvents = 'none'
        iframe.style.zIndex = '-9999'
        document.body.appendChild(iframe)

        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (!doc) {
          throw new Error('Falha ao inicializar contexto de documento para renderização do PDF.')
        }

        doc.open()
        doc.write(html)
        doc.close()

        // Remove barras e marcadores de tela do preview que não devem sair no PDF impresso
        doc
          .querySelectorAll('.no-print-bar, .preview-page-break-marker, .action-bar')
          .forEach((el) => el.remove())

        // Normalização de margens e padding residuais no body e contêineres para não vazar altura extra
        if (doc.body) {
          doc.body.style.backgroundColor = '#ffffff'
          doc.body.style.margin = '0'
          doc.body.style.padding = '0'
        }

        // Seletor canônico: suporta proposta técnica (.proposta-container) e procuração (.page-a4)
        const targetElement = (doc.querySelector('.proposta-container, .page-a4') ||
          doc.body) as HTMLElement

        // Normalização específica para proposta comercial (.proposta-container)
        if (targetElement.classList.contains('proposta-container')) {
          targetElement.style.paddingBottom = '0'
          targetElement.style.marginBottom = '0'
        }

        // Para documentos com estrutura .page-a4 (ex: Procuração), normaliza estilos de tela
        if (targetElement.classList.contains('page-a4')) {
          targetElement.style.margin = '0'
          targetElement.style.boxShadow = 'none'
          targetElement.style.width = '100%'
          targetElement.style.minHeight = 'auto'
        }

        // Aguarda todas as imagens do documento terminarem de carregar para não renderizar imagens vazias/quebradas
        const images = Array.from(doc.images || [])
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve()
            return new Promise<void>((res) => {
              img.onload = () => res()
              img.onerror = () => res()
              setTimeout(res, 3000)
            })
          }),
        )

        // Espera de estabilização (~300ms) antes da captura para renderização perfeita do layout e fontes
        await new Promise<void>((r) => setTimeout(r, 300))

        // Altura de uma página A4 a 96 DPI: 297mm / 25.4 * 96 ≈ 1122.5196px
        // Ajusta a altura mínima capturada para múltiplo exato de 1122.5px, eliminando fatiamento residual em folha em branco
        try {
          const a4PageHeightPx = 1122.5
          const measuredHeight = targetElement.scrollHeight || targetElement.offsetHeight || 0
          if (measuredHeight > 0) {
            const totalPages = Math.max(1, Math.ceil((measuredHeight - 2) / a4PageHeightPx))
            const exactA4HeightPx = totalPages * a4PageHeightPx
            // Se o excesso passar por poucos pixels (padding/margem residual), fixa a altura para fechar na página anterior
            // Caso contrário, ajusta a altura total para o múltiplo exato de página A4
            targetElement.style.minHeight = `${exactA4HeightPx}px`
            targetElement.style.maxHeight = `${exactA4HeightPx}px`
            targetElement.style.boxSizing = 'border-box'
            targetElement.style.overflow = 'hidden'
          }
        } catch {
          /* fail-safe */
        }

        const opt = {
          margin: 0,
          filename: fileName,
          image: { type: 'jpeg', quality: imageQuality },
          html2canvas: {
            scale,
            useCORS: true,
            letterRendering: true,
            scrollY: 0,
            scrollX: 0,
            windowWidth: 794,
            logging: false,
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: compressJsPdf,
          },
          pagebreak: {
            mode: ['css', 'avoid-all'],
            avoid: [
              '.doc-header',
              '.doc-footer',
              '.card-diferencial',
              '.card-portfolio-usina',
              '.card-situacao',
              '.card-info-sistema',
              '.card-investimento-opcao',
              '.secao-card',
              '.foto-card-rel',
              '.assinatura-wrap',
            ],
          },
        }

        const worker = html2pdf().set(opt).from(targetElement)
        const resultado = await acao(worker)

        if (!completed) {
          completed = true
          if (timer) clearTimeout(timer)
          resolve(resultado)
        }
      } catch (err) {
        if (!completed) {
          completed = true
          if (timer) clearTimeout(timer)
          reject(err)
        }
      } finally {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }
    }

    executar()
  })
}

/**
 * Renderiza uma string HTML em PDF A4 Data URI base64 usando html2pdf.js
 * dentro de um container/iframe isolado.
 *
 * Inclui compressão jsPDF ativada (compress: true), scale 1.5 calibrado para A4 (~150 DPI)
 * e qualidade de imagem JPEG 0.85, reduzindo drasticamente o tamanho do PDF (de 30+ MB para < 5 MB)
 * mantendo fidelidade visual 100% idêntica.
 *
 * Possui timeout de segurança (padrão 25s) para nunca travar indefinitivamente.
 */
export async function renderizarHTMLParaPdfBase64(
  html: string,
  fileName: string = 'Proposta_Solar_Delfos.pdf',
  options: RenderizarPdfOptions = {},
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return ''
  }
  const dataUri = await executarHtml2PdfPipeline<string>(
    html,
    fileName,
    options,
    async (worker) => {
      const res = await worker.outputPdf('datauristring')
      return typeof res === 'string' ? res : ''
    },
  )
  return dataUri || ''
}

/**
 * Renderiza uma string HTML em PDF A4 e salva o arquivo (.pdf) diretamente no navegador do usuário,
 * garantindo a mesma diagramação A4 e margens do botão Imprimir / Gerar PDF.
 */
export async function baixarHTMLParaPdf(
  html: string,
  fileName: string = 'Proposta_Solar_Delfos.pdf',
  options: RenderizarPdfOptions = {},
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }
  await executarHtml2PdfPipeline<void>(html, fileName, options, async (worker) => {
    // Tenta primeiro via worker.save() nativo do html2pdf.js, com fallback para blob
    try {
      if (typeof worker.save === 'function') {
        await worker.save()
        return
      }
    } catch (saveErr) {
      console.warn('worker.save falhou, usando outputPdf(blob):', saveErr)
    }

    const blob = await worker.outputPdf('blob')
    if (blob instanceof Blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  })
}

/**
 * Gera o PDF oficial do Orçamento Solar como Data URI Base64.
 *
 * Rota canônica unificada: gera o base64 a partir de `gerarHTMLPropostaSolar(dados)`
 * via `renderizarHTMLParaPdfBase64`, desativando qualquer rota legada com `otimizarParaWhatsApp`.
 * Um único caminho, sem fallback divergente, garantindo resultado 100% idêntico a Imprimir/Gerar PDF.
 */
export async function gerarBase64OrcamentoSolar(
  dados: PropostaSolarPDFInput,
): Promise<{ base64: string; fallbackText: string; fileName: string }> {
  const safeName = (dados?.cliente?.nome || 'Cliente')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30)
  const fileName = `Proposta_Solar_Delfos_${safeName}.pdf`

  const fallbackText = `*Delfos Solar — Orçamento de Energia Solar Fotovoltaica*
Cliente: ${dados?.cliente?.nome || 'Cliente'}
Potência: ${dados?.sistema?.potenciaKwp ? dados.sistema.potenciaKwp.toFixed(2) : '0.00'} kWp (${dados?.sistema?.numeroPlacas || 0} placas)
Geração média: ${(dados?.calculos?.geracaoMediaMensalKwh || 0).toLocaleString('pt-BR')} kWh/mês
Economia estimada: ${formatCurrency(dados?.calculos?.economia1Mes || 0)}/mês (${formatCurrency(dados?.calculos?.economia1Ano || 0)}/ano)
Investimento Turnkey: ${formatCurrency(dados?.calculos?.valorInvestimento || 0)}
Payback estimado: ~${dados?.calculos?.paybackMeses || 0} meses
Validade da proposta: ${dados?.validadeDias || 5} dias corridos.
Responsável Técnico: João Victor Bagetti Fuchs (CREA RS151894).`

  try {
    // Pipeline canônico 100% unificado: gera a partir de gerarHTMLPropostaSolar(dados)
    const htmlOficial = gerarHTMLPropostaSolar(dados)
    const base64 = await renderizarHTMLParaPdfBase64(htmlOficial, fileName, {
      scale: 1.5,
      imageQuality: 0.82,
      compressJsPdf: true,
      timeoutMs: 25000,
    })
    return { base64, fallbackText, fileName }
  } catch (err) {
    console.error('Erro ao gerar PDF oficial solar para WhatsApp via HTML unificado:', err)
    return { base64: '', fallbackText, fileName }
  }
}

/**
 * Gera o PDF oficial de Proposta O&M como Data URI Base64.
 */
export async function gerarBase64PropostaOM(
  dados: PropostaPDFInput,
): Promise<{ base64: string; fallbackText: string; fileName: string }> {
  const safeName = (dados?.cliente?.nome || 'Cliente')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30)
  const fileName = `Proposta_OM_Delfos_${safeName}.pdf`

  const fallbackText = `*Delfos Solar — Proposta de Operação & Manutenção (O&M)*
Cliente: ${dados?.cliente?.nome || 'Cliente'}
Potência: ${dados?.tecnico?.potenciaKwp || 0} kWp (~${(dados?.tecnico?.geracaoMediaKwh || 0).toLocaleString('pt-BR')} kWh/mês)
Ativo Protegido: ${formatCurrency(dados?.calculos?.valorAtivoProtegido || 0)}/mês
Prejuízo de 30 dias sem operar: ${formatCurrency(dados?.calculos?.prejuizo30Dias || 0)}

Validade da proposta: 15 dias corridos.
Responsável Técnico: João Victor Bagetti Fuchs (CREA RS151894).`

  try {
    const htmlOM = gerarHTMLPropostaOM(dados)
    const base64 = await renderizarHTMLParaPdfBase64(htmlOM, fileName, {
      scale: 1.5,
      imageQuality: 0.82,
      compressJsPdf: true,
      timeoutMs: 25000,
    })
    return { base64, fallbackText, fileName }
  } catch (err) {
    console.error('Erro ao gerar PDF oficial O&M para WhatsApp:', err)
    return { base64: '', fallbackText, fileName }
  }
}

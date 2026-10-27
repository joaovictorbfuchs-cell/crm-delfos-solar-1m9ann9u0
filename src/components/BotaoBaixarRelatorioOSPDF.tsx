import React, { Suspense, lazy } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import type { RelatorioOSPDFDados } from '@/components/RelatorioOSPDFDocument'
import { blobParaDataUriBase64 } from '@/lib/pdfBlobUtils'

export interface BotaoBaixarRelatorioOSPDFProps {
  dados: RelatorioOSPDFDados
  onClick?: () => void
  className?: string
  rotulo?: string
}

/**
 * Gera o PDF oficial do Relatório Técnico da OS como Data URI Base64 e Blob usando a API do @react-pdf/renderer
 * (pdf(<RelatorioOSPDFDocument />).toBlob()), reutilizando o mesmo componente RelatorioOSPDFDocument.
 * Carrega o @react-pdf/renderer sob demanda dentro de chunk dinâmico (code-splitting),
 * prevenindo que o Vite/Rollup exceda memória (OOM / exit code 137).
 * Garante que o PDF baixado e o enviado pelo WhatsApp sejam 100% idênticos.
 */
export async function gerarRelatorioOSPdfBlobBase64(dados: RelatorioOSPDFDados): Promise<{
  blob: Blob
  base64: string
  fileName: string
}> {
  const osIdCurto = dados.os?.id ? String(dados.os.id).slice(-6).toUpperCase() : '000000'
  const clienteNomeLimpo = (dados.cliente?.nome || dados.os?.expand?.cliente_id?.nome || 'Cliente')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 25)
  const fileName = `Relatorio_OS_${osIdCurto}_${clienteNomeLimpo}.pdf`

  // 1. Gera primariamente pelo HTML oficial do relatório formatado para PDF A4
  try {
    const { gerarHTMLRelatorioOS } = await import('@/lib/relatorioOSPdf')
    const { renderizarHTMLParaPdfBase64 } = await import('@/lib/pdfWhatsAppService')
    const html = gerarHTMLRelatorioOS({
      os: dados.os,
      cliente: dados.cliente,
      contratoOM: dados.contratoOM,
      sistema: dados.sistema,
      fotosDataUrls: dados.fotosDataUrls || [],
      inversoresInfo: dados.inversoresInfo,
      rodapeComercial: dados.rodapeComercial,
    })

    const base64Html = await renderizarHTMLParaPdfBase64(html, fileName, {
      scale: 1.5,
      imageQuality: 0.85,
      compressJsPdf: true,
      timeoutMs: 30000,
    })

    if (base64Html) {
      const cleanB64 = base64Html.includes(',') ? base64Html.split(',')[1] : base64Html
      const bin = atob(cleanB64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      return { blob, base64: base64Html, fileName }
    }
  } catch (htmlErr) {
    console.warn('html2pdf falhou ao gerar base64; usando fallback react-pdf:', htmlErr)
  }

  // 2. Fallback via @react-pdf/renderer
  const [{ pdf }, { RelatorioOSPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/RelatorioOSPDFDocument'),
  ])

  const docElement = React.createElement(RelatorioOSPDFDocument, { dados })
  const instance = pdf(docElement)
  const blob = await instance.toBlob()
  const base64 = await blobParaDataUriBase64(blob)

  return {
    blob,
    base64,
    fileName,
  }
}

// Carregamento dinâmico lazy do módulo @react-pdf/renderer e do documento RelatorioOSPDFDocument
// Isolamento em chunk separado para proteção contra estouro de memória no build principal
const LazyPDFDownload = lazy(async () => {
  const [{ PDFDownloadLink }, { RelatorioOSPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/RelatorioOSPDFDocument'),
  ])

  return {
    default: function PDFDownloadInner({
      dados,
      onClick,
      className,
      rotulo = 'Baixar como PDF',
    }: {
      dados: RelatorioOSPDFDados
      onClick?: () => void
      className?: string
      rotulo?: string
    }) {
      return (
        <PDFDownloadLink
          document={<RelatorioOSPDFDocument dados={dados} />}
          fileName="relatorio-tecnico-os.pdf"
          onClick={onClick}
          className="inline-flex"
        >
          {({ loading }: { loading: boolean }) => null}
        </PDFDownloadLink>
      )
    },
  }
})

export const BotaoBaixarRelatorioOSPDF: React.FC<BotaoBaixarRelatorioOSPDFProps> = ({
  dados,
  onClick,
  className,
  rotulo = 'Baixar PDF',
}) => {
  return (
    <Suspense
      fallback={
        <Button
          type="button"
          size="sm"
          disabled
          className={
            className ||
            'bg-[#C9A227]/80 text-[#0E2A47] text-xs font-bold gap-1.5 rounded-full border border-[#B38E1D]'
          }
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{rotulo}</span>
        </Button>
      }
    >
      <LazyPDFDownload dados={dados} onClick={onClick} className={className} rotulo={rotulo} />
    </Suspense>
  )
}

export default BotaoBaixarRelatorioOSPDF

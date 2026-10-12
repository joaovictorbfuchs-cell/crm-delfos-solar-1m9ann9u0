import React, { Suspense, lazy } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import type { DadosContratoOM } from '@/lib/contratoGenerator'
import { blobParaDataUriBase64 } from '@/lib/pdfBlobUtils'

export interface BotaoBaixarContratoOMPDFProps {
  dados: DadosContratoOM
  onClick?: () => void
}

export { blobParaDataUriBase64 }

/**
 * Gera o PDF oficial do Contrato O&M como Data URI Base64 usando a API do @react-pdf/renderer
 * (pdf(<Document/>).toBlob()), reutilizando o mesmo documento ContratoOMPDFDocument.
 * Carrega o @react-pdf/renderer sob demanda dentro de chunk dinâmico (code-splitting),
 * prevenindo que o Vite/Rollup exceda memória (OOM / exit code 137).
 * Garante que o PDF baixado e o enviado pelo WhatsApp sejam 100% idênticos.
 */
export async function gerarContratoOMPdfBlobBase64(dados: Partial<DadosContratoOM>): Promise<{
  blob: Blob
  base64: string
  fileName: string
}> {
  const safeName = (dados.nomeRazaoSocial || 'Cliente')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30)
  const plano = dados.planoSelecionado || 'OM'
  const fileName = `Contrato_OM_Delfos_${plano}_${safeName}.pdf`

  const [{ pdf }, { ContratoOMPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/ContratoOMPDFDocument'),
  ])

  const docElement = React.createElement(ContratoOMPDFDocument, { dados })
  const instance = pdf(docElement)
  const blob = await instance.toBlob()
  const base64 = await blobParaDataUriBase64(blob)

  return {
    blob,
    base64,
    fileName,
  }
}

// Carregamento preguiçoso dinâmico do módulo @react-pdf/renderer e do documento ContratoOMPDFDocument
// Isso isola completamente a árvore de dependências do @react-pdf/renderer em um chunk separado (code-splitting),
// prevenindo que o Vite/Rollup exceda o limite de memória (OOM / exit code 137) no bundle principal.
const LazyPDFDownload = lazy(async () => {
  const [{ PDFDownloadLink }, { ContratoOMPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/ContratoOMPDFDocument'),
  ])

  return {
    default: function PDFDownloadInner({
      dados,
      onClick,
    }: {
      dados: DadosContratoOM
      onClick?: () => void
    }) {
      return (
        <PDFDownloadLink
          document={<ContratoOMPDFDocument dados={dados} />}
          fileName="contrato-om.pdf"
          onClick={onClick}
          className="inline-flex"
        >
          {({ loading }: { loading: boolean }) => (
            <Button
              type="button"
              size="sm"
              disabled={loading}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-1.5 shadow-xs transition-transform hover:scale-[1.02] cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{loading ? 'Preparando PDF...' : 'Baixar como PDF'}</span>
            </Button>
          )}
        </PDFDownloadLink>
      )
    },
  }
})

export const BotaoBaixarContratoOMPDF: React.FC<BotaoBaixarContratoOMPDFProps> = ({
  dados,
  onClick,
}) => {
  return (
    <Suspense
      fallback={
        <Button
          type="button"
          size="sm"
          disabled
          className="bg-[#16A34A]/80 text-white text-xs font-bold gap-1.5 shadow-xs"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Baixar como PDF</span>
        </Button>
      }
    >
      <LazyPDFDownload dados={dados} onClick={onClick} />
    </Suspense>
  )
}

export default BotaoBaixarContratoOMPDF

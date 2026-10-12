import React, { Suspense, lazy } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import type { DadosProcuracaoOM } from '@/lib/procuracaoGenerator'

export interface BotaoBaixarProcuracaoPDFProps {
  dados: DadosProcuracaoOM
  onClick?: () => void
}

/**
 * Converte um Blob de PDF gerado pelo @react-pdf/renderer em uma Data URI Base64.
 * Formato retornado: data:application/pdf;base64,...
 */
export { blobParaDataUriBase64 } from '@/lib/pdfBlobUtils'

/**
 * Gera o PDF oficial da Procuração Particular como Data URI Base64 usando a API do @react-pdf/renderer
 * (pdf(<Document/>).toBlob()), reutilizando o mesmo documento ProcuracaoPDFDocument.
 * Carrega o @react-pdf/renderer sob demanda dentro do mesmo chunk dinâmico do botão de download.
 */
export async function gerarProcuracaoPdfBlobBase64(dados: Partial<DadosProcuracaoOM>): Promise<{
  blob: Blob
  base64: string
  fileName: string
}> {
  const safeName = (dados.nome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const fileName = `Procuracao_Delfos_${safeName}.pdf`

  const [{ pdf }, { ProcuracaoPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/ProcuracaoPDFDocument'),
  ])

  const docElement = React.createElement(ProcuracaoPDFDocument, { dados })
  const instance = pdf(docElement)
  const blob = await instance.toBlob()
  const base64 = await blobParaDataUriBase64(blob)

  return {
    blob,
    base64,
    fileName,
  }
}

// Carregamento preguiçoso dinâmico do módulo @react-pdf/renderer e do documento ProcuracaoPDFDocument
// Isso isola completamente a árvore de dependências do @react-pdf/renderer em um chunk separado (code-splitting),
// prevenindo que o Vite/Rollup exceda o limite de memória (OOM / exit code 137) no bundle principal.
const LazyPDFDownload = lazy(async () => {
  const [{ PDFDownloadLink }, { ProcuracaoPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/ProcuracaoPDFDocument'),
  ])

  return {
    default: function PDFDownloadInner({
      dados,
      onClick,
    }: {
      dados: DadosProcuracaoOM
      onClick?: () => void
    }) {
      return (
        <PDFDownloadLink
          document={<ProcuracaoPDFDocument dados={dados} />}
          fileName="procuracao.pdf"
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

export const BotaoBaixarProcuracaoPDF: React.FC<BotaoBaixarProcuracaoPDFProps> = ({
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

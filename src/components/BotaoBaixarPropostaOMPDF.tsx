// Componente de botão para download do PDF da Proposta O&M via @react-pdf/renderer
// Carrega @react-pdf/renderer EXCLUSIVAMENTE via import() dinâmico para prevenir estouro de memória (exit 137).
import React, { Suspense, lazy } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import type { PropostaPDFInput } from '@/lib/propostaOMGenerator'
import { blobParaDataUriBase64 } from '@/lib/pdfBlobUtils'

export interface BotaoBaixarPropostaOMPDFProps {
  dados: PropostaPDFInput
  observacoesAdicionais?: string
  onClick?: () => void
  variante?: 'default' | 'outline' | 'secondary' | 'ghost'
  tamanho?: 'default' | 'sm' | 'lg' | 'icon'
  rotulo?: string
  desabilitado?: boolean
  className?: string
}

export { blobParaDataUriBase64 }

/**
 * Gera o PDF oficial da Proposta O&M como Blob e Data URI Base64 via @react-pdf/renderer
 * usando import() dinâmico sob demanda.
 */
export async function gerarPropostaOMPdfBlobBase64(
  dados: PropostaPDFInput,
  observacoesAdicionais?: string,
): Promise<{
  blob: Blob
  base64: string
  fileName: string
}> {
  const safeName = (dados.cliente?.nome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const fileName = `Proposta_OM_Delfos_${safeName}.pdf`

  const [{ pdf }, { PropostaOMPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./PropostaOMPDFDocument'),
  ])

  const docElement = React.createElement(PropostaOMPDFDocument, {
    dados,
    observacoesAdicionais,
  })
  const instance = pdf(docElement)
  const blob = await instance.toBlob()
  const base64 = await blobParaDataUriBase64(blob)

  return {
    blob,
    base64,
    fileName,
  }
}

// Carregamento preguiçoso dinâmico isolado em chunk separado
const LazyPDFDownload = lazy(async () => {
  const [{ PDFDownloadLink }, { PropostaOMPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./PropostaOMPDFDocument'),
  ])

  return {
    default: function PDFDownloadInner({
      dados,
      observacoesAdicionais,
      onClick,
      variante = 'outline',
      tamanho = 'sm',
      rotulo = 'Baixar PDF',
      desabilitado = false,
      className,
    }: BotaoBaixarPropostaOMPDFProps) {
      return (
        <PDFDownloadLink
          document={
            <PropostaOMPDFDocument dados={dados} observacoesAdicionais={observacoesAdicionais} />
          }
          fileName="proposta-om.pdf"
          onClick={onClick}
          className="inline-flex"
        >
          {({ loading }: { loading: boolean }) => (
            <Button
              type="button"
              variant={variante}
              size={tamanho}
              disabled={desabilitado || loading}
              className={className || 'gap-1.5 font-bold cursor-pointer'}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Preparando PDF...' : rotulo}</span>
            </Button>
          )}
        </PDFDownloadLink>
      )
    },
  }
})

export const BotaoBaixarPropostaOMPDF: React.FC<BotaoBaixarPropostaOMPDFProps> = (props) => {
  return (
    <Suspense
      fallback={
        <Button
          type="button"
          variant={props.variante || 'outline'}
          size={props.tamanho || 'sm'}
          disabled
          className={props.className || 'gap-1.5 font-bold'}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Preparando PDF...</span>
        </Button>
      }
    >
      <LazyPDFDownload {...props} />
    </Suspense>
  )
}

export default BotaoBaixarPropostaOMPDF

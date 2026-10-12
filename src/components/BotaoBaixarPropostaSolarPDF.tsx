// Componente de botão para download do PDF da proposta de energia solar via @react-pdf/renderer
// Carrega @react-pdf/renderer dinamicamente para não sobrecarregar a memória do build.
import React, { useState, useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import type { PropostaTecnicoComercialDados } from '@/lib/propostaTecnicoComercialGenerator'
import { blobParaDataUriBase64 } from '@/lib/pdfBlobUtils'

interface BotaoBaixarPropostaSolarPDFProps {
  dados: PropostaSolarPDFInput | PropostaTecnicoComercialDados
  nomeArquivo?: string
  variante?: 'default' | 'outline' | 'secondary' | 'ghost'
  tamanho?: 'default' | 'sm' | 'lg' | 'icon'
  rotulo?: string
  desabilitado?: boolean
  className?: string
}

export const BotaoBaixarPropostaSolarPDF: React.FC<BotaoBaixarPropostaSolarPDFProps> = ({
  dados,
  nomeArquivo = 'proposta-energia-solar.pdf',
  variante = 'outline',
  tamanho = 'default',
  rotulo = 'Baixar PDF (@react-pdf)',
  desabilitado = false,
  className,
}) => {
  const [PDFDownloadLinkComp, setPDFDownloadLinkComp] = useState<any>(null)
  const [PropostaPDFDocComp, setPropostaPDFDocComp] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let montado = true
    setCarregando(true)

    Promise.all([import('@react-pdf/renderer'), import('./PropostaSolarPDFDocument')])
      .then(([reactPdfModule, propostaDocModule]) => {
        if (!montado) return
        setPDFDownloadLinkComp(() => reactPdfModule.PDFDownloadLink)
        setPropostaPDFDocComp(() => propostaDocModule.PropostaSolarPDFDocument)
        setCarregando(false)
      })
      .catch((err) => {
        console.error('Erro ao carregar módulo @react-pdf/renderer para proposta solar:', err)
        if (montado) {
          setErro('Falha ao carregar motor de PDF')
          setCarregando(false)
        }
      })

    return () => {
      montado = false
    }
  }, [])

  if (carregando) {
    return (
      <Button variant={variante} size={tamanho} disabled className={className}>
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        <span>Preparando PDF...</span>
      </Button>
    )
  }

  if (erro || !PDFDownloadLinkComp || !PropostaPDFDocComp) {
    return (
      <Button
        variant={variante}
        size={tamanho}
        disabled={desabilitado}
        className={className}
        onClick={() => {
          alert(erro || 'Carregando motor de PDF. Tente novamente em instantes.')
        }}
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
        <span>{rotulo}</span>
      </Button>
    )
  }

  const Documento = <PropostaPDFDocComp dados={dados} />

  return (
    <PDFDownloadLinkComp
      document={Documento}
      fileName={nomeArquivo}
      style={{ textDecoration: 'none', display: 'inline-flex' }}
    >
      {({ loading }: { loading: boolean }) => (
        <Button
          variant={variante}
          size={tamanho}
          disabled={desabilitado || loading}
          className={className}
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              <span>Gerando PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>{rotulo}</span>
            </>
          )}
        </Button>
      )}
    </PDFDownloadLinkComp>
  )
}

/**
 * Função utilitária para gerar Blob do PDF da proposta solar em memória usando @react-pdf/renderer.
 * Usado pelo WhatsApp e outros serviços que necessitam do binário/Blob.
 */
export async function gerarPropostaSolarPdfBlob(
  dados: PropostaSolarPDFInput | PropostaTecnicoComercialDados,
): Promise<Blob> {
  const [reactPdf, { PropostaSolarPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./PropostaSolarPDFDocument'),
  ])

  const elementoDoc = React.createElement(PropostaSolarPDFDocument, { dados })
  const instanciaPdf = reactPdf.pdf(elementoDoc)
  return await instanciaPdf.toBlob()
}

/**
 * Gera Data URI Base64 (data:application/pdf;base64,...) da proposta solar via @react-pdf/renderer.
 */
export async function gerarPropostaSolarPdfBase64(
  dados: PropostaSolarPDFInput | PropostaTecnicoComercialDados,
): Promise<string> {
  const blob = await gerarPropostaSolarPdfBlob(dados)
  return await blobParaDataUriBase64(blob)
}

export default BotaoBaixarPropostaSolarPDF

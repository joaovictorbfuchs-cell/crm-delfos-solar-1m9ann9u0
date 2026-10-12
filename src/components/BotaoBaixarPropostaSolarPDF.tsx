// Componente de botão para download do PDF da proposta de energia solar via HTML unificado
// Utiliza html2pdf.js com o MESMO HTML renderizado no botão Imprimir / Gerar PDF, garantindo 100% de paridade visual A4.
import React, { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { gerarHTMLPropostaSolar, type PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import {
  gerarHTMLPropostaTecnicoComercial,
  type PropostaTecnicoComercialDados,
} from '@/lib/propostaTecnicoComercialGenerator'
import { baixarHTMLParaPdf, renderizarHTMLParaPdfBase64 } from '@/lib/pdfWhatsAppService'
import { blobParaDataUriBase64 } from '@/lib/pdfBlobUtils'

export interface BotaoBaixarPropostaSolarPDFProps {
  dados: PropostaSolarPDFInput | PropostaTecnicoComercialDados
  nomeArquivo?: string
  variante?: 'default' | 'outline' | 'secondary' | 'ghost'
  tamanho?: 'default' | 'sm' | 'lg' | 'icon'
  rotulo?: string
  desabilitado?: boolean
  className?: string
  htmlProposta?: string
}

function obterHTMLDaProposta(
  dados: PropostaSolarPDFInput | PropostaTecnicoComercialDados,
  htmlFornecido?: string,
): string {
  if (htmlFornecido && htmlFornecido.trim().length > 0) {
    return htmlFornecido
  }
  // Se já for PropostaTecnicoComercialDados
  if ('secoes' in dados && 'capa' in dados) {
    return gerarHTMLPropostaTecnicoComercial(dados as PropostaTecnicoComercialDados)
  }
  return gerarHTMLPropostaSolar(dados as PropostaSolarPDFInput)
}

export const BotaoBaixarPropostaSolarPDF: React.FC<BotaoBaixarPropostaSolarPDFProps> = ({
  dados,
  nomeArquivo = 'proposta-energia-solar.pdf',
  variante = 'outline',
  tamanho = 'default',
  rotulo = 'Baixar PDF',
  desabilitado = false,
  className,
  htmlProposta,
}) => {
  const [gerando, setGerando] = useState(false)

  const handleBaixar = async () => {
    if (desabilitado || gerando) return
    try {
      setGerando(true)
      const html = obterHTMLDaProposta(dados, htmlProposta)
      await baixarHTMLParaPdf(html, nomeArquivo, {
        scale: 1.5,
        imageQuality: 0.85,
        compressJsPdf: true,
        timeoutMs: 35000,
      })
    } catch (err) {
      console.error('Erro ao baixar PDF da proposta solar:', err)
      alert('Não foi possível gerar o PDF. Tente imprimir ou gerar pelo navegador.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button
      variant={variante}
      size={tamanho}
      disabled={desabilitado || gerando}
      className={className}
      onClick={handleBaixar}
      type="button"
    >
      {gerando ? (
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
  )
}

/**
 * Função utilitária para gerar Blob do PDF da proposta solar em memória usando @react-pdf/renderer.
 * Mantida para retrocompatibilidade aditiva caso outros fluxos invoquem.
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
 * Gera Data URI Base64 (data:application/pdf;base64,...) da proposta solar via @react-pdf/renderer
 * (ou via HTML oficial quando aplicável). Mantida para retrocompatibilidade.
 */
export async function gerarPropostaSolarPdfBase64(
  dados: PropostaSolarPDFInput | PropostaTecnicoComercialDados,
): Promise<string> {
  // Gera primariamente via HTML oficial unificado com fallback para @react-pdf se falhar
  try {
    const html = obterHTMLDaProposta(dados)
    const base64 = await renderizarHTMLParaPdfBase64(html, 'proposta-solar.pdf', {
      scale: 1.5,
      imageQuality: 0.85,
      compressJsPdf: true,
      timeoutMs: 25000,
    })
    if (base64) return base64
  } catch (err) {
    console.warn('Fallback para @react-pdf em gerarPropostaSolarPdfBase64:', err)
  }

  const blob = await gerarPropostaSolarPdfBlob(dados)
  return await blobParaDataUriBase64(blob)
}

export default BotaoBaixarPropostaSolarPDF

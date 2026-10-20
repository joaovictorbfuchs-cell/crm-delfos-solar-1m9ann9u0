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
      type="button"
      variant={variante}
      size={tamanho}
      disabled={desabilitado || gerando}
      onClick={handleBaixar}
      className={className || 'gap-1.5 font-bold cursor-pointer'}
    >
      {gerando ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      <span>{gerando ? 'Gerando PDF...' : rotulo}</span>
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

/**
 * Gera o PDF oficial da proposta solar (Blob + Base64 + fileName), compatível com envio por e-mail (Resend)
 * e WhatsApp (Z-API). Aceita dados da proposta e HTML opcional pré-renderizado.
 */
export async function gerarPropostaSolarPdfBlobBase64(
  dados: PropostaSolarPDFInput | PropostaTecnicoComercialDados,
  htmlFornecido?: string,
  nomeArquivoSugerido?: string,
): Promise<{ blob: Blob; base64: string; fileName: string }> {
  const rawNome =
    'cliente' in dados && dados.cliente?.nome
      ? dados.cliente.nome
      : (dados as any)?.capa?.nomeCliente || 'cliente'
  const safeName = String(rawNome)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 40)
  const fileName = nomeArquivoSugerido || `Proposta_Solar_Delfos_${safeName}.pdf`

  // Tenta gerar primariamente via HTML oficial unificado para paridade total
  try {
    const html = obterHTMLDaProposta(dados, htmlFornecido)
    const base64ComHeader = await renderizarHTMLParaPdfBase64(html, fileName, {
      scale: 1.5,
      imageQuality: 0.85,
      compressJsPdf: true,
      timeoutMs: 30000,
    })
    if (base64ComHeader) {
      const cleanB64 = base64ComHeader.includes(',')
        ? base64ComHeader.split(',')[1]
        : base64ComHeader
      const mime = /data:([^;]+)/.exec(base64ComHeader)?.[1] || 'application/pdf'
      const bin = atob(cleanB64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const blob = new Blob([bytes], { type: mime })
      return { blob, base64: base64ComHeader, fileName }
    }
  } catch (err) {
    console.warn('Fallback para @react-pdf em gerarPropostaSolarPdfBlobBase64:', err)
  }

  // Fallback para @react-pdf/renderer
  const blob = await gerarPropostaSolarPdfBlob(dados)
  const base64 = await blobParaDataUriBase64(blob)
  return { blob, base64, fileName }
}

export default BotaoBaixarPropostaSolarPDF

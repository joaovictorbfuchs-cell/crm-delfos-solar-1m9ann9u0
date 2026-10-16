import React, { useState } from 'react'
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
 * Gera o PDF da proposta O&M a partir do MESMO DOM do preview exibido ao usuário
 * (elemento .proposta-om-documento), garantindo fidelidade 100% entre o que o
 * usuário vê no preview e o PDF anexado no WhatsApp. Fallback: renderer react-pdf.
 */
export async function gerarPropostaOMPdfDoPreviewBlobBase64(): Promise<{
  blob: Blob
  base64: string
  fileName: string
}> {
  const documento = document.querySelector('.proposta-om-documento') as HTMLElement | null
  if (!documento) {
    throw new Error('Preview da proposta não encontrado na tela.')
  }

  const { renderizarHTMLParaPdfBase64 } = await import('@/lib/pdfWhatsAppService')

  // Copia TODOS os stylesheets do app (Tailwind incluído), igual ao botão
  // Imprimir faz — sem isso o preview perde as classes utilitárias e o PDF
  // sai desconfigurado.
  const estilos = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((elemento) => {
      if (elemento instanceof HTMLLinkElement) {
        return `<link rel="stylesheet" href="${elemento.href}" />`
      }
      return elemento.outerHTML
    })
    .join('\n')

  // Clona o DOM do preview fora da árvore para limpar estilos de tela
  // (scroll, sombras, largura) sem alterar o que o usuário está vendo.
  const clone = documento.cloneNode(true) as HTMLElement
  clone.classList.remove('print:', 'shadow-lg', 'rounded-2xl', 'border', 'border-gray-200')
  clone.querySelectorAll('.no-print').forEach((el) => el.remove())
  clone.style.boxShadow = 'none'
  clone.style.borderRadius = '0'
  clone.style.border = '0'
  clone.style.maxWidth = '794px'
  clone.style.width = '794px'
  clone.style.margin = '0'
  clone.style.overflow = 'visible'
  clone.style.height = 'auto'
  clone.style.maxHeight = 'none'
  clone.style.position = 'static'

  const nomeCliente =
    (documento.querySelector('[data-cliente-nome]')?.textContent || 'Cliente').trim() || 'Cliente'
  const safeName = nomeCliente
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 48)
  const fileName = `Proposta_OM_Delfos_${safeName}.pdf`

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
${estilos}
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .proposta-om-documento { width: 794px !important; max-width: 794px !important; margin: 0 !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; overflow: visible !important; height: auto !important; max-height: none !important; position: static !important; }
  .proposta-om-documento section, .proposta-om-documento footer { break-inside: avoid-page; }
</style>
</head>
<body>${clone.outerHTML}</body>
</html>`

  const base64 = await renderizarHTMLParaPdfBase64(html, fileName, {
    scale: 1.5,
    imageQuality: 0.82,
    compressJsPdf: true,
    timeoutMs: 30000,
  })
  const blob = base64ParaBlob(base64)
  return { blob, base64, fileName }
}

/** Converte Data URI base64 em Blob. */
function base64ParaBlob(dataUri: string): Blob {
  const [meta, dados] = dataUri.split(',')
  const mime = /data:([^;]+)/.exec(meta)?.[1] || 'application/pdf'
  const bin = atob(dados)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Gera o PDF O&M sob demanda pelo renderer oficial e entrega o arquivo ao navegador. */
export async function gerarPropostaOMPdfBlobBase64(
  dados: PropostaPDFInput,
  observacoesAdicionais?: string,
): Promise<{ blob: Blob; base64: string; fileName: string }> {
  const safeName = (dados.cliente?.nome || 'Cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 48)
  const fileName = `Proposta_OM_Delfos_${safeName}.pdf`

  const [{ pdf }, { PropostaOMPDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./PropostaOMPDFDocument'),
  ])
  const docElement = React.createElement(PropostaOMPDFDocument, { dados, observacoesAdicionais })
  const blob = await pdf(docElement).toBlob()
  if (!blob.size) throw new Error('O renderizador retornou um PDF vazio.')
  const base64 = await blobParaDataUriBase64(blob)
  return { blob, base64, fileName }
}

export const BotaoBaixarPropostaOMPDF: React.FC<BotaoBaixarPropostaOMPDFProps> = ({
  dados,
  observacoesAdicionais,
  onClick,
  variante = 'outline',
  tamanho = 'sm',
  rotulo = 'Baixar PDF',
  desabilitado = false,
  className,
}) => {
  const [carregando, setCarregando] = useState(false)

  const baixarPDF = async () => {
    if (carregando || desabilitado) return
    setCarregando(true)
    try {
      onClick?.()
      const { blob, fileName } = await gerarPropostaOMPdfBlobBase64(dados, observacoesAdicionais)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (erro) {
      console.error('Falha ao gerar o PDF da proposta O&M:', erro)
      window.alert(
        erro instanceof Error
          ? `Não foi possível gerar o PDF da proposta O&M: ${erro.message}`
          : 'Não foi possível gerar o PDF da proposta O&M. Tente novamente.',
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variante}
      size={tamanho}
      disabled={desabilitado || carregando}
      onClick={baixarPDF}
      className={className || 'gap-1.5 font-bold cursor-pointer'}
    >
      {carregando ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      <span>{carregando ? 'Gerando PDF...' : rotulo}</span>
    </Button>
  )
}

export default BotaoBaixarPropostaOMPDF

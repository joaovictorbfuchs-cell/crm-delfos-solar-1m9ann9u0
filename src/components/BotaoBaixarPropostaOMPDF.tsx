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

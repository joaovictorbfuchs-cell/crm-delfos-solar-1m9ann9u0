import React, { useRef } from 'react'
import {
  FileText,
  RotateCcw,
  Sparkles,
  Copy,
  Info,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  PLACEHOLDERS_ENVIO_MASSA,
  extrairPrimeiroNomeCliente,
} from '@/lib/placeholdersMensagemMassa'
import type { ItemClienteMassa } from './Etapa1Destinatarios'
import type { FluxoFollowUp } from '@/services/fluxosFollowUpService'

export interface Etapa2MensagemProps {
  templates: Array<{ id: string; titulo: string; conteudo: string }>
  templateSelecionadoId: string
  onSelecionarTemplate: (templateId: string) => void
  templateTexto: string
  onMudarTemplateTexto: (texto: string) => void
  onRestaurarPadrao: () => void
  textoVeraDoFluxo: boolean
  etapaImediataFluxo: { mensagem: string; nome?: string } | null
  fluxoSelecionadoObj: FluxoFollowUp | null
  mensagemPreviaResolvida: string
  itemFocado: ItemClienteMassa | null
  // Navegação individual de clientes na prévia
  destinatariosParaPrevia: ItemClienteMassa[]
  onSelecionarClienteFocado: (clienteId: string) => void
}

export const Etapa2Mensagem: React.FC<Etapa2MensagemProps> = ({
  templates,
  templateSelecionadoId,
  onSelecionarTemplate,
  templateTexto,
  onMudarTemplateTexto,
  onRestaurarPadrao,
  textoVeraDoFluxo,
  etapaImediataFluxo,
  fluxoSelecionadoObj,
  mensagemPreviaResolvida,
  itemFocado,
  destinatariosParaPrevia,
  onSelecionarClienteFocado,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInsertPlaceholder = (tag: string) => {
    const el = textareaRef.current
    if (!el) {
      onMudarTemplateTexto(`${templateTexto} ${tag}`)
      return
    }
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const text = templateTexto
    const newText = text.substring(0, start) + tag + text.substring(end)
    onMudarTemplateTexto(newText)
    setTimeout(() => {
      el.focus()
      const newPos = start + tag.length
      el.setSelectionRange(newPos, newPos)
    }, 0)
  }

  // Índice do cliente atual na lista de prévia
  const indexClienteAtual = itemFocado
    ? destinatariosParaPrevia.findIndex((d) => d.cliente.id === itemFocado.cliente.id)
    : -1

  const handleAnteriorCliente = () => {
    if (destinatariosParaPrevia.length === 0) return
    const proximoIdx =
      indexClienteAtual <= 0 ? destinatariosParaPrevia.length - 1 : indexClienteAtual - 1
    const cli = destinatariosParaPrevia[proximoIdx]
    if (cli) onSelecionarClienteFocado(cli.cliente.id)
  }

  const handleProximoCliente = () => {
    if (destinatariosParaPrevia.length === 0) return
    const proximoIdx =
      indexClienteAtual < 0 || indexClienteAtual >= destinatariosParaPrevia.length - 1
        ? 0
        : indexClienteAtual + 1
    const cli = destinatariosParaPrevia[proximoIdx]
    if (cli) onSelecionarClienteFocado(cli.cliente.id)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
      {/* Coluna Esquerda: Modelos e Editor de Mensagem com Tags */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Dropdown com Modelos Pré-Cadastrados */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Modelo de Mensagem</span>
            </Label>
            <button
              type="button"
              onClick={onRestaurarPadrao}
              className="text-[11px] text-gray-500 hover:text-[#0284C7] underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar padrão</span>
            </button>
          </div>

          <select
            value={templateSelecionadoId}
            onChange={(e) => onSelecionarTemplate(e.target.value)}
            className="w-full text-xs font-medium py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-2xs"
          >
            <option value="">Selecione um modelo pré-cadastrado...</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.titulo}
              </option>
            ))}
          </select>
        </div>

        {/* Editor de Texto com Tags Dinâmicas */}
        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Texto da Mensagem
            </Label>
            {textoVeraDoFluxo && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Usando etapa 1 do fluxo</span>
              </span>
            )}
          </div>

          <Textarea
            ref={textareaRef}
            rows={7}
            value={templateTexto}
            onChange={(e) => onMudarTemplateTexto(e.target.value)}
            className={`text-xs font-mono bg-white resize-none p-3 leading-relaxed rounded-xl border border-gray-200 shadow-2xs ${
              textoVeraDoFluxo ? 'border-emerald-300 focus:ring-emerald-500' : ''
            }`}
            placeholder={
              etapaImediataFluxo
                ? `Campo opcional: o texto da Etapa 1 imediata do fluxo "${fluxoSelecionadoObj?.nome || 'Follow-up'}" será usado se deixar vazio...`
                : 'Digite a mensagem com os placeholders [nome do cliente], [cidade], [potência], [valor]...'
            }
          />

          {/* Tags Dinâmicas */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-gray-700 block">
              Inserir tags dinâmicas com um clique:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PLACEHOLDERS_ENVIO_MASSA.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => handleInsertPlaceholder(p.tag)}
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white hover:bg-sky-50 text-sky-800 border border-sky-300 font-mono font-semibold transition-colors shadow-2xs cursor-pointer"
                  title={p.descricao}
                >
                  <span>{p.tag}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500">
              As tags serão substituídas individualmente pelos dados reais de cada cliente na hora
              do disparo.
            </p>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Prévia Individual em Tela Própria */}
      <div className="lg:col-span-5 flex flex-col space-y-3">
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex-1 flex flex-col space-y-3">
          {/* Topo da Prévia: Seletor de Cliente */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0284C7]" />
              <span className="text-xs font-bold text-gray-900">Prévia Individual</span>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(mensagemPreviaResolvida)
                toast.success('Mensagem copiada para a área de transferência')
              }}
              className="text-[11px] text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 font-semibold cursor-pointer"
              title="Copiar texto da prévia"
            >
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </button>
          </div>

          {/* Navegador entre clientes na prévia */}
          {destinatariosParaPrevia.length > 0 && (
            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={handleAnteriorCliente}
                className="text-gray-500 hover:text-gray-900 p-1 rounded hover:bg-slate-100"
                title="Cliente anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 min-w-0 text-center">
                <User className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-bold text-gray-900 truncate max-w-[170px]">
                  {itemFocado ? itemFocado.cliente.nome : 'Nenhum'}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">
                  ({indexClienteAtual >= 0 ? indexClienteAtual + 1 : 0} de{' '}
                  {destinatariosParaPrevia.length})
                </span>
              </div>

              <button
                type="button"
                onClick={handleProximoCliente}
                className="text-gray-500 hover:text-gray-900 p-1 rounded hover:bg-slate-100"
                title="Próximo cliente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Balão WhatsApp Prévia */}
          <div className="flex-1 flex flex-col justify-center min-h-[200px]">
            <div className="bg-[#DCF8C6]/90 text-gray-900 text-xs p-3.5 rounded-2xl rounded-tr-none shadow-xs border border-emerald-200/80 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-sans">
              {mensagemPreviaResolvida || (
                <span className="italic text-gray-500">
                  Nenhum texto informado para a mensagem. Digite uma mensagem ao lado ou selecione
                  um modelo.
                </span>
              )}
            </div>
            {textoVeraDoFluxo && etapaImediataFluxo && (
              <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-2">
                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>
                  Prévia gerada a partir da <strong>Etapa 1 (Imediata)</strong> do fluxo{' '}
                  <strong>"{fluxoSelecionadoObj?.nome}"</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Dados Resolvidos na Prévia */}
          {itemFocado && (
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-2 border-t border-slate-200">
              <div className="p-2 bg-white rounded-lg border border-gray-200">
                <span className="text-gray-400 block">Primeiro Nome</span>
                <span className="font-bold text-gray-800 truncate block">
                  {extrairPrimeiroNomeCliente(itemFocado.cliente)}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-gray-200">
                <span className="text-gray-400 block">Cidade</span>
                <span className="font-bold text-gray-800 truncate block">
                  {itemFocado.cidade || '—'}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-gray-200">
                <span className="text-gray-400 block">Potência</span>
                <span className="font-bold text-sky-800 truncate block">
                  {itemFocado.potenciaTexto || '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Etapa2Mensagem

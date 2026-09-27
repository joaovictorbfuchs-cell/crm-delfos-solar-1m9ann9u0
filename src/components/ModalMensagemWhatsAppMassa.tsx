import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  MessageSquare,
  Search,
  CheckSquare,
  Square,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Edit2,
  Info,
  DollarSign,
  Zap,
  Building2,
  Copy,
  Sparkles,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { toast } from 'sonner'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'
import { validarNumeroWhatsApp } from '@/lib/propostaWhatsAppService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { SessaoExpiradaAlert } from '@/components/SessaoExpiradaAlert'
import {
  PLACEHOLDERS_ENVIO_MASSA,
  resolverPlaceholdersMensagemMassa,
  extrairPotenciaClienteTexto,
  extrairCidadeCliente,
  extrairPrimeiroNomeCliente,
} from '@/lib/placeholdersMensagemMassa'
import type { Cliente, UsinaCliente, Sistema } from '@/types/crm'

export interface DestinatarioMensagemMassa {
  cliente: Cliente
  usina?: UsinaCliente | Sistema
  valor?: number
  potenciaManual?: number | string
  cidadeManual?: string
  origemItem?: string
}

export interface ModalMensagemWhatsAppMassaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Destinatários pré-selecionados vindos de qualquer lista (clientes, atividades, manutenções, O&M).
   * Se omitido ou vazio, o modal carregará a base de clientes do contexto.
   */
  destinatariosIniciais?: DestinatarioMensagemMassa[]
  /**
   * Texto inicial padrão do template da mensagem
   */
  mensagemPadrao?: string
  /**
   * Título descritivo do modal
   */
  titulo?: string
  /**
   * Subtítulo / descrição contextual
   */
  descricao?: string
  /**
   * Callback disparado após sucesso dos disparos
   */
  onSuccess?: () => void
}

interface ItemClienteMassa {
  cliente: Cliente
  usina?: UsinaCliente | Sistema
  potenciaTexto: string
  cidade: string
  telefoneAutoritativo: string
  temWhatsAppValido: boolean
  numeroLimpo: string
  valorItem?: number
  origemItem?: string
}

const MENSAGEM_INICIAL_DEFAULT =
  'Olá, [nome do cliente]! Aqui é da equipe Delfos Solar. Passando para conversar sobre a sua usina de [potência] em [cidade]. Como podemos ajudar você hoje?'

export const ModalMensagemWhatsAppMassa: React.FC<ModalMensagemWhatsAppMassaProps> = ({
  open,
  onOpenChange,
  destinatariosIniciais,
  mensagemPadrao,
  titulo = 'Enviar Mensagem por WhatsApp em Massa',
  descricao = 'Dispare mensagens personalizadas individuais para cada cliente selecionado.',
  onSuccess,
}) => {
  const {
    clientes,
    sistemas,
    sendWhatsAppMessage,
    addAtividade,
    updateCliente,
    whatsAppConfig,
    isSessionExpired,
  } = useClientes()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Estado da mensagem
  const [templateTexto, setTemplateTexto] = useState(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)

  // Seleção e foco
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [clienteFocadoId, setClienteFocadoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  // Edição rápida de telefone
  const [editandoTelefoneId, setEditandoTelefoneId] = useState<string | null>(null)
  const [telefoneEmEdicao, setTelefoneEmEdicao] = useState('')

  // Progresso do envio em lote
  const [isEnviando, setIsEnviando] = useState(false)
  const [progressoEnvio, setProgressoEnvio] = useState<{
    total: number
    atual: number
    sucessos: string[]
    erros: Array<{ clienteNome: string; erro: string }>
  } | null>(null)

  const [authErrorCapturado, setAuthErrorCapturado] = useState(false)

  // Mapeia lista de itens a serem exibidos no modal
  const itensProcessados = useMemo<ItemClienteMassa[]>(() => {
    // Se destinatários explícitos foram informados:
    if (destinatariosIniciais && destinatariosIniciais.length > 0) {
      // Deduplica por cliente.id
      const map = new Map<string, DestinatarioMensagemMassa>()
      destinatariosIniciais.forEach((dest) => {
        if (dest?.cliente?.id && !map.has(dest.cliente.id)) {
          map.set(dest.cliente.id, dest)
        }
      })

      return Array.from(map.values()).map((dest) => {
        const cli = dest.cliente
        const usinaVinculada = dest.usina || sistemas.find((s) => s.cliente_id === cli.id)
        const potenciaTexto = dest.potenciaManual
          ? typeof dest.potenciaManual === 'number'
            ? `${dest.potenciaManual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`
            : String(dest.potenciaManual)
          : extrairPotenciaClienteTexto(cli, usinaVinculada)
        const cidade = dest.cidadeManual || extrairCidadeCliente(cli, usinaVinculada)
        const telAutoritativo = cli.whatsapp || cli.telefone || ''
        const validacao = validarNumeroWhatsApp(telAutoritativo)

        return {
          cliente: cli,
          usina: usinaVinculada,
          potenciaTexto,
          cidade,
          telefoneAutoritativo: telAutoritativo,
          temWhatsAppValido: validacao.valido,
          numeroLimpo: validacao.numeroLimpo,
          valorItem: dest.valor,
          origemItem: dest.origemItem,
        }
      })
    }

    // Se nenhum destinatário explícito foi passado, monta da base geral de clientes
    return clientes.map((cli) => {
      const usinaVinculada = sistemas.find((s) => s.cliente_id === cli.id)
      const potenciaTexto = extrairPotenciaClienteTexto(cli, usinaVinculada)
      const cidade = extrairCidadeCliente(cli, usinaVinculada)
      const telAutoritativo = cli.whatsapp || cli.telefone || ''
      const validacao = validarNumeroWhatsApp(telAutoritativo)

      return {
        cliente: cli,
        usina: usinaVinculada,
        potenciaTexto,
        cidade,
        telefoneAutoritativo: telAutoritativo,
        temWhatsAppValido: validacao.valido,
        numeroLimpo: validacao.numeroLimpo,
        valorItem: cli.valor_final || cli.valor_estimado || 0,
      }
    })
  }, [destinatariosIniciais, clientes, sistemas])

  // Filtragem pela busca
  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return itensProcessados
    return itensProcessados.filter((item) => {
      const matchNome = item.cliente.nome?.toLowerCase().includes(termo)
      const matchCidade = item.cidade?.toLowerCase().includes(termo)
      const matchTel = item.telefoneAutoritativo?.includes(termo)
      return matchNome || matchCidade || matchTel
    })
  }, [itensProcessados, busca])

  // Inicialização ao abrir o modal
  useEffect(() => {
    if (!open) {
      setProgressoEnvio(null)
      setIsEnviando(false)
      setAuthErrorCapturado(false)
      setEditandoTelefoneId(null)
      return
    }

    setTemplateTexto(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)
    setAuthErrorCapturado(false)
    setProgressoEnvio(null)

    // Se veio destinatáriosIniciais, seleciona todos eles por padrão
    if (destinatariosIniciais && destinatariosIniciais.length > 0) {
      const ids = destinatariosIniciais
        .map((d) => d.cliente?.id)
        .filter((id): id is string => Boolean(id))
      // Deduplicar
      const uniqueIds = Array.from(new Set(ids))
      setSelectedIds(uniqueIds)
      setClienteFocadoId(uniqueIds[0] || null)
    } else {
      // Base padrão: seleciona os com WhatsApp válido
      const comWhats = itensProcessados.filter((c) => c.temWhatsAppValido)
      const idsIniciais = comWhats.slice(0, 3).map((c) => c.cliente.id)
      setSelectedIds(idsIniciais)
      setClienteFocadoId(idsIniciais[0] || itensProcessados[0]?.cliente.id || null)
    }
  }, [open, destinatariosIniciais, mensagemPadrao, itensProcessados])

  // Cliente focado na prévia
  const itemFocado = useMemo(() => {
    if (clienteFocadoId) {
      const achado = itensProcessados.find((c) => c.cliente.id === clienteFocadoId)
      if (achado) return achado
    }
    const primeiroSelecionadoId = selectedIds[0]
    if (primeiroSelecionadoId) {
      const achado = itensProcessados.find((c) => c.cliente.id === primeiroSelecionadoId)
      if (achado) return achado
    }
    return itensProcessados[0] || null
  }, [clienteFocadoId, selectedIds, itensProcessados])

  // Mensagem resolvida em tempo real para a prévia
  const mensagemPreviaResolvida = useMemo(() => {
    if (!itemFocado) return templateTexto
    return resolverPlaceholdersMensagemMassa({
      template: templateTexto,
      cliente: itemFocado.cliente,
      usina: itemFocado.usina,
      valor: itemFocado.valorItem,
      cidadeManual: itemFocado.cidade,
    })
  }, [templateTexto, itemFocado])

  // Inserir tag de placeholder no cursor da textarea
  const handleInsertPlaceholder = (tag: string) => {
    const el = textareaRef.current
    if (!el) {
      setTemplateTexto((prev) => `${prev} ${tag}`)
      return
    }
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const text = templateTexto
    const newText = text.substring(0, start) + tag + text.substring(end)
    setTemplateTexto(newText)
    setTimeout(() => {
      el.focus()
      const newPos = start + tag.length
      el.setSelectionRange(newPos, newPos)
    }, 0)
  }

  // Handlers de seleção
  const handleToggleCliente = (clienteId: string) => {
    setSelectedIds((prev) => {
      const existe = prev.includes(clienteId)
      const novos = existe ? prev.filter((id) => id !== clienteId) : [...prev, clienteId]
      if (!existe) setClienteFocadoId(clienteId)
      return novos
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.length === itensFiltrados.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(itensFiltrados.map((c) => c.cliente.id))
    }
  }

  // Salvar número do WhatsApp editado inline
  const handleSalvarTelefoneInline = async (cliente: Cliente) => {
    const val = validarNumeroWhatsApp(telefoneEmEdicao)
    if (!val.valido) {
      toast.error('Número de WhatsApp inválido', {
        description: 'Informe DDD + número (ex: 54 99999-9999).',
      })
      return
    }

    try {
      await updateCliente(cliente.id, {
        whatsapp: val.numeroFormatado,
        telefone: val.numeroFormatado,
      })
      toast.success('WhatsApp atualizado', {
        description: `Número gravado para ${cliente.nome}.`,
      })
      setEditandoTelefoneId(null)
      setTelefoneEmEdicao('')
    } catch (err) {
      console.error('Erro ao atualizar telefone:', err)
      toast.error('Erro ao salvar telefone')
    }
  }

  // Disparo individual em massa para cada cliente selecionado
  const handleConfirmarEnvio = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione ao menos um cliente para enviar.')
      return
    }

    const selecionados = itensProcessados.filter((c) => selectedIds.includes(c.cliente.id))
    const semWhatsApp = selecionados.filter((c) => !c.temWhatsAppValido)

    if (semWhatsApp.length > 0 && semWhatsApp.length === selecionados.length) {
      toast.error('Nenhum cliente selecionado possui número de WhatsApp válido.', {
        description: 'Cadastre ou ajuste o WhatsApp dos clientes antes de enviar.',
      })
      return
    }

    setIsEnviando(true)
    const estadoEnvio = {
      total: selecionados.length,
      atual: 0,
      sucessos: [] as string[],
      erros: [] as Array<{ clienteNome: string; erro: string }>,
    }
    setProgressoEnvio({ ...estadoEnvio })

    for (let i = 0; i < selecionados.length; i++) {
      const item = selecionados[i]
      estadoEnvio.atual = i + 1
      setProgressoEnvio({ ...estadoEnvio })

      if (!item.temWhatsAppValido) {
        estadoEnvio.erros.push({
          clienteNome: item.cliente.nome,
          erro: 'Cliente não possui número de WhatsApp válido cadastrado.',
        })
        setProgressoEnvio({ ...estadoEnvio })
        continue
      }

      const mensagemFinal = resolverPlaceholdersMensagemMassa({
        template: templateTexto,
        cliente: item.cliente,
        usina: item.usina,
        valor: item.valorItem,
        cidadeManual: item.cidade,
      })

      try {
        await sendWhatsAppMessage({
          cliente_id: item.cliente.id,
          telefone_destino: item.numeroLimpo,
          conteudo_final: mensagemFinal,
          tipo_disparo: 'massa',
        })

        // Registra atividade no CRM para histórico do cliente
        const agora = new Date().toISOString()
        await addAtividade({
          cliente_id: item.cliente.id,
          tipo: 'follow_up',
          titulo: 'Mensagem Individual via WhatsApp (Envio em Massa)',
          descricao: `Mensagem enviada via WhatsApp para ${item.cliente.nome}:\n\n"${mensagemFinal}"`,
          data: agora,
          status: 'concluida',
          autor: 'CRM Delfos Solar',
        })

        estadoEnvio.sucessos.push(item.cliente.nome)
        setProgressoEnvio({ ...estadoEnvio })
      } catch (err: unknown) {
        console.error(`Erro ao enviar mensagem para ${item.cliente.nome}:`, err)
        if (isAuthSessionError(err)) {
          setAuthErrorCapturado(true)
          estadoEnvio.erros.push({
            clienteNome: item.cliente.nome,
            erro: 'Sessão expirada. Faça login novamente.',
          })
          setProgressoEnvio({ ...estadoEnvio })
          break
        }

        const msgErro =
          err instanceof Error
            ? err.message
            : 'Falha na comunicação com o gateway de WhatsApp (Z-API).'
        estadoEnvio.erros.push({
          clienteNome: item.cliente.nome,
          erro: msgErro,
        })
        setProgressoEnvio({ ...estadoEnvio })
      }
    }

    setIsEnviando(false)

    if (estadoEnvio.sucessos.length > 0) {
      toast.success(`Mensagem enviada para ${estadoEnvio.sucessos.length} cliente(s)!`, {
        description:
          'Mensagens individuais disparadas via Z-API e registradas no histórico do CRM.',
      })
      if (onSuccess) onSuccess()
    }

    if (estadoEnvio.erros.length > 0) {
      toast.error(`Falha no envio para ${estadoEnvio.erros.length} cliente(s)`, {
        description: 'Verifique o status individual dos envios no painel.',
      })
    }
  }

  const isAllSelected = itensFiltrados.length > 0 && selectedIds.length === itensFiltrados.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
        {/* Header Visual */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-gradient-to-r from-emerald-50 via-white to-teal-50/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>{titulo}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Disparo Individual
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {descricao}
                </DialogDescription>
              </div>
            </div>

            {whatsAppConfig && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    whatsAppConfig.configured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>Z-API {whatsAppConfig.configured ? 'Conectada' : 'Pendente'}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Alerta de Sessão Expirada */}
        {(isSessionExpired || authErrorCapturado) && (
          <div className="p-4 border-b bg-amber-50">
            <SessaoExpiradaAlert />
          </div>
        )}

        {/* Barra de Progresso */}
        {progressoEnvio && (
          <div className="p-4 bg-slate-50 border-b space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-2">
                {isEnviando ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span>
                  {isEnviando ? 'Disparando mensagens via Z-API...' : 'Envios concluídos'}
                </span>
              </span>
              <span>
                {progressoEnvio.atual} de {progressoEnvio.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 transition-all duration-300"
                style={{
                  width: `${(progressoEnvio.atual / Math.max(progressoEnvio.total, 1)) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span className="text-emerald-700 font-semibold">
                ✓ Sucesso: {progressoEnvio.sucessos.length}
              </span>
              {progressoEnvio.erros.length > 0 && (
                <span className="text-rose-700 font-semibold">
                  ✕ Falhas: {progressoEnvio.erros.length}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Corpo do Modal em 2 Colunas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ======================================================== */}
          {/* COLUNA ESQUERDA (lg:col-span-6): SELEÇÃO DE CLIENTES     */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Destinatários ({selectedIds.length} selecionados)</span>
              </Label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
              >
                {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
            </div>

            {/* Barra de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar cliente por nome, cidade ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 text-xs sm:text-sm bg-white"
              />
            </div>

            {/* Lista com Rolagem e Seleção */}
            <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[380px] overflow-y-auto divide-y divide-gray-100 shadow-2xs">
              {itensFiltrados.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Nenhum cliente encontrado</p>
                  <p>Tente alterar o termo de busca.</p>
                </div>
              ) : (
                itensFiltrados.map((item) => {
                  const isChecked = selectedIds.includes(item.cliente.id)
                  const isFocado = itemFocado?.cliente.id === item.cliente.id
                  const isEditandoTel = editandoTelefoneId === item.cliente.id

                  return (
                    <div
                      key={item.cliente.id}
                      onClick={() => setClienteFocadoId(item.cliente.id)}
                      className={`p-3 transition-colors cursor-pointer flex flex-col gap-2 ${
                        isFocado
                          ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex items-start gap-2.5 flex-1 min-w-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleCliente(item.cliente.id)
                          }}
                        >
                          <button
                            type="button"
                            className="mt-0.5 text-gray-400 hover:text-emerald-700 transition-colors shrink-0"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                                {item.cliente.nome}
                              </span>
                              {item.cidade && (
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                  {item.cidade}
                                </span>
                              )}
                              {item.origemItem && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                                  {item.origemItem}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1 text-amber-700 font-semibold">
                                <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                {item.potenciaTexto}
                              </span>
                              {item.valorItem && item.valorItem > 0 ? (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                    <DollarSign className="w-3 h-3" />
                                    {formatCurrency(item.valorItem)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Linha do Telefone / WhatsApp */}
                      <div
                        className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100/80 gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isEditandoTel ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <Input
                              value={telefoneEmEdicao}
                              onChange={(e) =>
                                setTelefoneEmEdicao(formatWhatsAppPhone(e.target.value))
                              }
                              placeholder="(00) 00000-0000"
                              className="h-7 text-xs bg-white flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              type="button"
                              onClick={() => handleSalvarTelefoneInline(item.cliente)}
                              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => {
                                setEditandoTelefoneId(null)
                                setTelefoneEmEdicao('')
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {item.temWhatsAppValido ? (
                                <span className="font-medium text-gray-800">
                                  {item.telefoneAutoritativo}
                                </span>
                              ) : (
                                <span className="font-semibold text-rose-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Sem WhatsApp válido
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditandoTelefoneId(item.cliente.id)
                                setTelefoneEmEdicao(item.telefoneAutoritativo)
                              }}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>
                                {item.temWhatsAppValido ? 'Alterar' : 'Informar WhatsApp'}
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="text-[11px] text-gray-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Cada cliente selecionado receberá uma mensagem individual via WhatsApp preenchida
                com seus dados pessoais, potência da usina e cidade.
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA DIREITA (lg:col-span-6): EDITOR & PRÉVIA          */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col space-y-3.5">
            {/* Editor de Texto com Placeholders */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Mensagem com Placeholders
                </Label>
                <button
                  type="button"
                  onClick={() => setTemplateTexto(mensagemPadrao || MENSAGEM_INICIAL_DEFAULT)}
                  className="text-[11px] text-gray-500 hover:text-emerald-700 underline"
                >
                  Restaurar padrão
                </button>
              </div>

              <Textarea
                ref={textareaRef}
                rows={6}
                value={templateTexto}
                onChange={(e) => setTemplateTexto(e.target.value)}
                className="text-xs font-mono bg-white resize-none p-2.5 leading-relaxed"
                placeholder="Digite a mensagem com os placeholders [nome do cliente], [cidade], [potência], [valor]..."
              />

              {/* Botões clicáveis de Placeholders para inserção rápida */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-gray-700 block">
                  Clique para inserir no texto:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PLACEHOLDERS_ENVIO_MASSA.map((p) => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => handleInsertPlaceholder(p.tag)}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-medium transition-colors shadow-2xs"
                      title={p.descricao}
                    >
                      <span>{p.tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pré-visualização da Mensagem */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Prévia: {itemFocado?.cliente.nome || 'Cliente Selecionado'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mensagemPreviaResolvida)
                    toast.success('Mensagem copiada para a área de transferência')
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 font-semibold"
                  title="Copiar texto da prévia"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </button>
              </div>

              {/* Balão estilo WhatsApp */}
              <div className="bg-[#DCF8C6]/80 text-gray-900 text-xs p-3 rounded-xl rounded-tr-none shadow-xs border border-emerald-200/60 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                {mensagemPreviaResolvida}
              </div>

              {/* Resumo de dados resolvidos */}
              {itemFocado && (
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Destinatário</span>
                    <span className="font-bold text-gray-800 truncate block">
                      {extrairPrimeiroNomeCliente(itemFocado.cliente)}
                    </span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Cidade</span>
                    <span className="font-bold text-gray-800 truncate block">
                      {itemFocado.cidade}
                    </span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Potência</span>
                    <span className="font-bold text-emerald-700">{itemFocado.potenciaTexto}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 sm:p-5 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600 text-center sm:text-left">
            <span className="font-bold text-gray-900">
              {selectedIds.length === 1
                ? '1 cliente selecionado'
                : `${selectedIds.length} clientes selecionados`}
            </span>
            <span className="hidden sm:inline">
              {' '}
              • Disparo individual via Z-API com registro de atividade no CRM
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isEnviando}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={isEnviando || selectedIds.length === 0}
              onClick={handleConfirmarEnvio}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-sm flex items-center gap-2 px-4"
            >
              {isEnviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Enviando {progressoEnvio?.atual || 0} de{' '}
                    {progressoEnvio?.total || selectedIds.length}...
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {selectedIds.length <= 1
                      ? 'Enviar Mensagem por WhatsApp'
                      : `Enviar para ${selectedIds.length} Clientes`}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ModalMensagemWhatsAppMassa

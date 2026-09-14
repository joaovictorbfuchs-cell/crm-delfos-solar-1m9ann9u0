import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ClipboardCheck,
  Copy,
  MessageCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  PhoneOff,
  RotateCcw,
  Check,
  Loader2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Cliente } from '@/types/crm'
import { sendWhatsAppMensagem } from '@/services/crmService'
import { getFriendlyWhatsAppErrorMessage } from '@/lib/whatsappGateway'

export const ITENS_SOLICITACAO_INFORMACOES = [
  'Nome completo',
  'CPF',
  'Cópia da CNH',
  'Razão social',
  'CNPJ',
  'Última revisão do contrato social',
  'E-mail',
  'Telefone',
  'Conta de energia',
  'CCIR — Certificado de Cadastro de Imóvel Rural',
  'Foto do talão do produtor',
] as const

export type ItemSolicitacao = (typeof ITENS_SOLICITACAO_INFORMACOES)[number]

interface ModalSolicitacaoInformacoesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente
  onSalvarPendencias?: (pendencias: string[]) => Promise<void> | void
}

export function gerarTextoMensagemSolicitacao(
  clienteNome: string,
  itensPendentes: string[],
): string {
  if (itensPendentes.length === 0) return ''

  const nomeFormatado = (clienteNome || 'Cliente').trim()
  const listaBullets = itensPendentes.map((item) => `• ${item}`).join('\n')

  return `Olá, ${nomeFormatado}! Tudo bem?

Para darmos continuidade com agilidade à elaboração do seu projeto fotovoltaico e do contrato junto à Delfos Solar, precisamos que nos envie os seguintes documentos e informações que ainda constam como pendentes:

${listaBullets}

Você pode responder diretamente a esta mensagem com as fotos ou arquivos digitais desses itens.

Ficamos à disposição para esclarecer qualquer dúvida!

Atenciosamente,
Equipe Delfos Solar`
}

export const ModalSolicitacaoInformacoes: React.FC<ModalSolicitacaoInformacoesProps> = ({
  open,
  onOpenChange,
  cliente,
  onSalvarPendencias,
}) => {
  // Itens marcados = faltantes / pendentes
  const [pendentes, setPendentes] = useState<string[]>([])
  const [mensagemGerada, setMensagemGerada] = useState<string>('')
  const [mensagemTentouGerar, setMensagemTentouGerar] = useState<boolean>(false)
  const [isCopiado, setIsCopiado] = useState<boolean>(false)
  const [isSalvando, setIsSalvando] = useState<boolean>(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false)

  // Ao abrir o modal ou mudar o cliente, carrega as pendências salvas
  useEffect(() => {
    if (open && cliente) {
      const itensSalvos = Array.isArray(cliente.pendencias_informacoes)
        ? cliente.pendencias_informacoes
        : []
      setPendentes(itensSalvos)
      setIsCopiado(false)

      if (itensSalvos.length > 0) {
        setMensagemGerada(gerarTextoMensagemSolicitacao(cliente.nome, itensSalvos))
        setMensagemTentouGerar(true)
      } else {
        setMensagemGerada('')
        setMensagemTentouGerar(false)
      }
    }
  }, [open, cliente])

  // Normalização de telefone
  const telefoneCru = (cliente.telefone || cliente.whatsapp || '').trim()
  const cleanPhoneDigits = useMemo(() => telefoneCru.replace(/\D/g, ''), [telefoneCru])
  const temTelefoneValido = cleanPhoneDigits.length >= 10

  const handleToggleItem = async (item: string) => {
    const jaMarcado = pendentes.includes(item)
    const novosPendentes = jaMarcado ? pendentes.filter((p) => p !== item) : [...pendentes, item]

    // Mantém a ordem original do checklist ao salvar
    const ordenados = ITENS_SOLICITACAO_INFORMACOES.filter((i) => novosPendentes.includes(i))
    setPendentes(ordenados)

    // Se já havia gerado a mensagem antes, atualiza dinamicamente
    if (mensagemTentouGerar) {
      if (ordenados.length > 0) {
        setMensagemGerada(gerarTextoMensagemSolicitacao(cliente.nome, ordenados))
      } else {
        setMensagemGerada('')
      }
    }

    // Persiste imediatamente no cliente
    if (onSalvarPendencias) {
      try {
        setIsSalvando(true)
        await onSalvarPendencias(ordenados)
      } catch (err) {
        console.error('Erro ao salvar pendências de solicitação de informações:', err)
      } finally {
        setIsSalvando(false)
      }
    }
  }

  const handleMarcarTodos = async () => {
    const todos = [...ITENS_SOLICITACAO_INFORMACOES]
    setPendentes(todos)
    if (mensagemTentouGerar) {
      setMensagemGerada(gerarTextoMensagemSolicitacao(cliente.nome, todos))
    }
    if (onSalvarPendencias) {
      try {
        setIsSalvando(true)
        await onSalvarPendencias(todos)
      } finally {
        setIsSalvando(false)
      }
    }
  }

  const handleLimparTodos = async () => {
    setPendentes([])
    setMensagemGerada('')
    if (onSalvarPendencias) {
      try {
        setIsSalvando(true)
        await onSalvarPendencias([])
      } finally {
        setIsSalvando(false)
      }
    }
  }

  const handleGerarMensagem = () => {
    setMensagemTentouGerar(true)
    if (pendentes.length === 0) {
      setMensagemGerada('')
      toast({
        title: 'Nenhuma pendência selecionada',
        description:
          'Marque pelo menos um documento ou dado faltante no checklist para gerar a mensagem.',
        variant: 'destructive',
      })
      return
    }

    const texto = gerarTextoMensagemSolicitacao(cliente.nome, pendentes)
    setMensagemGerada(texto)
    toast({
      title: 'Mensagem gerada com sucesso!',
      description: `Texto pronto com ${pendentes.length} ${
        pendentes.length === 1 ? 'item pendente' : 'itens pendentes'
      }.`,
    })
  }

  const handleCopiarMensagem = async () => {
    if (!mensagemGerada) return
    try {
      await navigator.clipboard.writeText(mensagemGerada)
      setIsCopiado(true)
      setTimeout(() => setIsCopiado(false), 2500)
      toast({
        title: 'Mensagem copiada!',
        description: 'O texto foi copiado para a área de transferência.',
      })
    } catch (err) {
      console.error('Falha ao copiar:', err)
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar automaticamente para a área de transferência.',
        variant: 'destructive',
      })
    }
  }

  const handleEnviarWhatsApp = async () => {
    if (!temTelefoneValido) return
    const textoAEnviar = mensagemGerada || gerarTextoMensagemSolicitacao(cliente.nome, pendentes)
    if (!textoAEnviar.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Gere a mensagem de solicitação antes de enviar.',
        variant: 'destructive',
      })
      return
    }

    setIsSendingWhatsApp(true)
    try {
      const res = await sendWhatsAppMensagem({
        clienteId: cliente.id,
        telefone: cleanPhoneDigits,
        mensagem: textoAEnviar,
        origem: 'modal_solicitacao_informacoes',
      })

      if (res.ok && res.sent) {
        toast({
          title: 'Mensagem enviada via WhatsApp!',
          description: 'A solicitação de documentos foi disparada com sucesso.',
        })
      } else {
        const errorMsg = getFriendlyWhatsAppErrorMessage(res)
        toast({
          title: 'Não foi possível enviar pelo WhatsApp',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Erro ao enviar solicitação via WhatsApp:', err)
      toast({
        title: 'Erro ao enviar via WhatsApp',
        description: err?.message || 'Falha de comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  const totalItens = ITENS_SOLICITACAO_INFORMACOES.length
  const totalPendentes = pendentes.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white border border-gray-200">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                <ClipboardCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>Solicitação de Informações do Cliente</span>
                  {isSalvando && (
                    <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                      Salvando...
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Marque os documentos e dados faltantes para elaborar o projeto e o contrato de{' '}
                  <strong className="text-gray-800 font-semibold">{cliente.nome}</strong>.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${
                  totalPendentes > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {totalPendentes > 0
                  ? `${totalPendentes} de ${totalItens} pendentes`
                  : 'Nenhuma pendência'}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo principal: Grid de 2 colunas responsivo (empilha no mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-2">
          {/* ======================================================== */}
          {/* COLUNA ESQUERDA (CHECKLIST): col-span-7                   */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Checklist de Documentos Necessários
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarcarTodos}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Marcar todos
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={handleLimparTodos}
                  className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Selecione <strong>apenas</strong> os itens que ainda estão <strong>faltando</strong>{' '}
              para este cliente:
            </p>

            <div className="rounded-xl border border-gray-200/90 divide-y divide-gray-100 bg-slate-50/40 overflow-hidden shadow-2xs">
              {ITENS_SOLICITACAO_INFORMACOES.map((item, index) => {
                const isMarcado = pendentes.includes(item)
                const itemId = `chk-item-${index}`

                return (
                  <label
                    key={item}
                    htmlFor={itemId}
                    className={`flex items-start gap-3 p-2.5 sm:p-3 text-xs cursor-pointer transition-colors select-none ${
                      isMarcado
                        ? 'bg-amber-50/80 hover:bg-amber-100/70 border-l-4 border-l-amber-500'
                        : 'bg-white hover:bg-emerald-50/40 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="pt-0.5">
                      <Checkbox
                        id={itemId}
                        checked={isMarcado}
                        onCheckedChange={() => handleToggleItem(item)}
                        className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-medium ${
                            isMarcado ? 'text-amber-950 font-bold' : 'text-gray-800'
                          }`}
                        >
                          <span className="text-gray-400 font-mono text-[11px] mr-1.5">
                            {String(index + 1).padStart(2, '0')}.
                          </span>
                          {item}
                        </span>
                        {isMarcado ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 shrink-0">
                            Faltando
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            OK
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <Button
                type="button"
                onClick={handleGerarMensagem}
                className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Gerar mensagem de solicitação</span>
              </Button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* COLUNA DIREITA (MENSAGEM GERADA): col-span-5              */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/20 p-3.5 sm:p-4 shadow-2xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <MessageCircle className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                      Mensagem Pronta para o Cliente
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Texto formatado e cordial para envio imediato.
                    </p>
                  </div>
                </div>

                {mensagemGerada && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                    {pendentes.length} pendência(s)
                  </span>
                )}
              </div>

              {/* Informações de contato do cliente */}
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-xs flex items-center justify-between gap-2 shadow-2xs">
                <div className="truncate">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Destinatário / WhatsApp:
                  </span>
                  <span className="font-semibold text-gray-800 truncate block">
                    {cliente.nome} {telefoneCru ? `• ${telefoneCru}` : ''}
                  </span>
                </div>
                {!temTelefoneValido && (
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold shrink-0 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Sem telefone
                  </span>
                )}
              </div>

              {/* Área do texto da mensagem */}
              {totalPendentes === 0 && mensagemTentouGerar ? (
                <div className="p-6 rounded-xl bg-emerald-50/70 border border-dashed border-emerald-300 text-center space-y-2 my-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h5 className="text-xs font-bold text-emerald-950">
                    Nenhuma pendência selecionada
                  </h5>
                  <p className="text-[11px] text-gray-600 max-w-xs mx-auto">
                    Não há documentos marcados como pendentes para este cliente. Marque os itens que
                    ainda faltam para gerar o texto.
                  </p>
                </div>
              ) : !mensagemGerada ? (
                <div className="p-6 rounded-xl bg-gray-50/80 border border-dashed border-gray-300 text-center space-y-2 my-2">
                  <ClipboardCheck className="w-8 h-8 text-gray-400 mx-auto" />
                  <h5 className="text-xs font-bold text-gray-700">Mensagem ainda não gerada</h5>
                  <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                    Clique em <strong>"Gerar mensagem de solicitação"</strong> após marcar os itens
                    pendentes para montar o texto pronto.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Textarea
                    value={mensagemGerada}
                    onChange={(e) => setMensagemGerada(e.target.value)}
                    rows={12}
                    className="text-xs leading-relaxed font-sans bg-white border-emerald-200 text-gray-900 rounded-xl resize-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                    placeholder="O texto gerado aparecerá aqui..."
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                    <span>Você pode editar o texto livremente antes de enviar.</span>
                    <span>{mensagemGerada.length} caracteres</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ações: Copiar mensagem + Enviar pelo WhatsApp */}
            <div className="pt-3 border-t border-emerald-100 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Botão Copiar */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!mensagemGerada}
                  onClick={handleCopiarMensagem}
                  className={`text-xs font-bold py-2.5 rounded-xl border transition-all ${
                    isCopiado
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50'
                  }`}
                >
                  {isCopiado ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-emerald-700" />
                      <span>Copiar mensagem</span>
                    </>
                  )}
                </Button>

                {/* Botão Enviar pelo WhatsApp */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full block">
                        <Button
                          type="button"
                          disabled={!mensagemGerada || !temTelefoneValido || isSendingWhatsApp}
                          onClick={handleEnviarWhatsApp}
                          className={`w-full text-xs font-bold py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                            !temTelefoneValido || isSendingWhatsApp
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed hover:bg-gray-200'
                              : 'bg-[#25D366] hover:bg-[#20bd5a] text-white hover:scale-[1.01]'
                          }`}
                        >
                          {isSendingWhatsApp ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                          ) : !temTelefoneValido ? (
                            <PhoneOff className="w-4 h-4" />
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                          <span>
                            {isSendingWhatsApp ? 'Enviando WhatsApp...' : 'Enviar pelo WhatsApp'}
                          </span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!temTelefoneValido && (
                      <TooltipContent className="bg-gray-900 text-white text-xs max-w-xs">
                        Telefone não cadastrado na ficha do cliente. Cadastre o telefone ou WhatsApp
                        para habilitar o envio direto.
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>

              {!temTelefoneValido && mensagemGerada && (
                <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Telefone não cadastrado na ficha. Você ainda pode usar o botão{' '}
                    <strong>"Copiar mensagem"</strong> para colá-la manualmente onde preferir.
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ModalSolicitacaoInformacoes

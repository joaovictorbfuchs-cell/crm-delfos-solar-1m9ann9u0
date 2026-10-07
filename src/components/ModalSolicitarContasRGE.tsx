import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  FileText,
  Mail,
  Send,
  Building,
  User,
  Paperclip,
  Trash2,
  AlertCircle,
  Loader2,
  MapPin,
  Eye,
  Check,
  Edit3,
  RotateCcw,
  Save,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import { enviarEmail, DEFAULT_EMAIL_FROM } from '@/lib/emailService'
import {
  EMAIL_RGE_PADRAO,
  DELFOS_TELEFONE_PADRAO,
  DELFOS_EMAIL_PADRAO,
  ASSUNTO_RGE_ORIGINAL,
  CORPO_TEXTO_RGE_ORIGINAL,
  RGE_PLACEHOLDERS,
  gerarAssuntoContasRGE,
  gerarCorpoHtmlContasRGE,
  fileToBase64,
  carregarTemplatePadraoContasRGE,
  salvarTemplatePadraoContasRGE,
  restaurarTemplatePadraoContasRGE,
  resolverPlaceholdersContasRGE,
} from '@/lib/emailContasRGETemplate'
import { PrazoRGEBadge } from '@/components/PrazoRGEBadge'
import type { Atividade, UsinaCliente } from '@/types/crm'
import { toast } from 'sonner'

export interface ModalSolicitarContasRGEProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteIdInicial?: string | null
  usinas?: UsinaCliente[]
  atividadeExistente?: Atividade | null
  emailDestinatarioInicial?: string | null
  onSuccess?: (atividadeCriada: Atividade) => void
}

interface ArquivoAnexoItem {
  id: string
  file: File
  nome: string
  tamanho: number
  tipo: string
  base64?: string
}

export const ModalSolicitarContasRGE: React.FC<ModalSolicitarContasRGEProps> = ({
  open,
  onOpenChange,
  clienteIdInicial,
  usinas = [],
  atividadeExistente,
  emailDestinatarioInicial,
  onSuccess,
}) => {
  const { clientes, usuarios, addAtividade } = useClientes()
  const { user } = useAuth()

  // 1. Cliente vinculado
  const [clienteId, setClienteId] = useState<string>(
    atividadeExistente?.cliente_id || clienteIdInicial || '',
  )

  // Cliente atual selecionado
  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === clienteId)
  }, [clientes, clienteId])

  // 2. Unidade Consumidora (UC)
  const [numeroUc, setNumeroUc] = useState<string>(atividadeExistente?.numero_uc || '')

  // 3. Endereço da unidade consumidora (pré-preenchido com endereço do cliente/usina)
  const [enderecoUc, setEnderecoUc] = useState<string>(atividadeExistente?.endereco_uc || '')

  // 4. Documento do titular/consumidor (CPF / CNPJ)
  const [documentoTitular, setDocumentoTitular] = useState<string>(
    atividadeExistente?.documento_titular || '',
  )

  // 5. Responsável que criou a atividade: nome, email e cargo
  const [responsavelId, setResponsavelId] = useState<string>(
    atividadeExistente?.responsavel_id || '',
  )
  const [responsavelNome, setResponsavelNome] = useState<string>(
    atividadeExistente?.responsavel_nome || '',
  )
  const [responsavelEmail, setResponsavelEmail] = useState<string>(
    atividadeExistente?.responsavel_email || '',
  )
  const [responsavelCargo, setResponsavelCargo] = useState<string>(
    atividadeExistente?.responsavel_cargo || 'Engenheiro Responsável',
  )

  // 6. Destinatário do e-mail (editável, padrão joao@delfosengenharia.com.br / concessionária)
  const [emailDestinatario, setEmailDestinatario] = useState<string>(
    atividadeExistente?.email_destinatario ||
      emailDestinatarioInicial ||
      'joao@delfosengenharia.com.br',
  )

  // 7. Customização e Edição do Template de Mensagem (Assunto + Corpo com placeholders)
  const [assuntoTemplate, setAssuntoTemplate] = useState<string>(ASSUNTO_RGE_ORIGINAL)
  const [corpoTemplate, setCorpoTemplate] = useState<string>(CORPO_TEXTO_RGE_ORIGINAL)
  const [modoEdicaoTemplate, setModoEdicaoTemplate] = useState<boolean>(false)
  const [mostrarPreviewEmail, setMostrarPreviewEmail] = useState<boolean>(true)
  const [isTemplateCustomizado, setIsTemplateCustomizado] = useState<boolean>(false)
  const [isSalvandoPadrao, setIsSalvandoPadrao] = useState<boolean>(false)
  const [isRestaurandoPadrao, setIsRestaurandoPadrao] = useState<boolean>(false)
  const [mostrarAjudaPlaceholders, setMostrarAjudaPlaceholders] = useState<boolean>(false)

  // 8. Documentos anexados (upload de arquivos)
  const [anexos, setAnexos] = useState<ArquivoAnexoItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaCorpoRef = useRef<HTMLTextAreaElement>(null)

  // Controle de envio e confirmação
  const [confirmarEnvio, setConfirmarEnvio] = useState<boolean>(false)
  const [isEnviando, setIsEnviando] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Inicialização e sincronização quando abre ou troca de cliente
  useEffect(() => {
    if (open) {
      const cId = atividadeExistente?.cliente_id || clienteIdInicial || clienteId || ''
      setClienteId(cId)

      // Identificar usuário logado
      const usuarioLogado = usuarios.find((u) => u.id === user?.id || u.email === user?.email)
      const nomePadrao =
        atividadeExistente?.responsavel_nome || usuarioLogado?.name || user?.name || 'Daniel Rotava'
      const emailPadrao =
        atividadeExistente?.responsavel_email ||
        usuarioLogado?.email ||
        user?.email ||
        'daniel@delfosengenharia.com.br'

      setResponsavelId(atividadeExistente?.responsavel_id || usuarioLogado?.id || user?.id || '')
      setResponsavelNome(nomePadrao)
      setResponsavelEmail(emailPadrao)
      if (atividadeExistente?.responsavel_cargo) {
        setResponsavelCargo(atividadeExistente.responsavel_cargo)
      } else if (!responsavelCargo) {
        setResponsavelCargo('Engenheiro Responsável')
      }

      const emailSalvo = atividadeExistente?.email_destinatario || emailDestinatarioInicial
      if (emailSalvo) {
        setEmailDestinatario(emailSalvo)
      } else if (!emailDestinatario || emailDestinatario === EMAIL_RGE_PADRAO) {
        // Conforme requisito do usuário: aplicar envio na atividade solicitar contas RGE para joao@delfosengenharia.com.br
        setEmailDestinatario('joao@delfosengenharia.com.br')
      }

      if (atividadeExistente?.numero_uc) setNumeroUc(atividadeExistente.numero_uc)
      if (atividadeExistente?.endereco_uc) setEnderecoUc(atividadeExistente.endereco_uc)
      if (atividadeExistente?.documento_titular)
        setDocumentoTitular(atividadeExistente.documento_titular)

      setFormError(null)
      setConfirmarEnvio(false)

      // Carregar template padrão persistido no PocketBase
      carregarTemplatePadraoContasRGE()
        .then((tpl) => {
          setAssuntoTemplate(tpl.assunto || ASSUNTO_RGE_ORIGINAL)
          setCorpoTemplate(tpl.corpo || CORPO_TEXTO_RGE_ORIGINAL)
          setIsTemplateCustomizado(tpl.isCustomizado)
        })
        .catch(() => {
          setAssuntoTemplate(ASSUNTO_RGE_ORIGINAL)
          setCorpoTemplate(CORPO_TEXTO_RGE_ORIGINAL)
          setIsTemplateCustomizado(false)
        })
    }
  }, [open, clienteIdInicial, atividadeExistente, emailDestinatarioInicial, user, usuarios])

  // Pré-preenchimento ao selecionar ou alterar o cliente
  useEffect(() => {
    if (!clienteSelecionado) return

    // UC: busca do cliente ou da primeira usina vinculada
    const ucCliente = clienteSelecionado.uc || ''
    const ucUsina = usinas.find((u) => u.numero_uc)?.numero_uc || ''
    setNumeroUc((prev) => (prev ? prev : ucCliente || ucUsina || ''))

    // Endereço: busca endereço completo do cliente ou da usina
    const partesEndereco = [
      clienteSelecionado.endereco,
      clienteSelecionado.numero && clienteSelecionado.numero !== 'S/N'
        ? `nº ${clienteSelecionado.numero}`
        : clienteSelecionado.numero,
      clienteSelecionado.bairro,
      clienteSelecionado.cidade,
    ].filter(Boolean)

    const endFormatado =
      partesEndereco.length > 0
        ? partesEndereco.join(', ')
        : clienteSelecionado.usina_endereco || clienteSelecionado.endereco || ''

    setEnderecoUc((prev) => (prev ? prev : endFormatado))

    // Documento (CPF / CNPJ)
    const doc =
      clienteSelecionado.cpf || clienteSelecionado.cnpj || clienteSelecionado.titular_cpf || ''
    setDocumentoTitular((prev) => (prev ? prev : doc))
  }, [clienteSelecionado, usinas])

  // Quando troca o responsável na lista suspensa
  const handleTrocaResponsavel = (id: string) => {
    setResponsavelId(id)
    const u = usuarios.find((item) => item.id === id)
    if (u) {
      setResponsavelNome(u.name || '')
      setResponsavelEmail(u.email || '')
    }
  }

  // Manipulação de arquivos anexados
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const novos: ArquivoAnexoItem[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      novos.push({
        id: `anexo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        nome: f.name,
        tamanho: f.size,
        tipo: f.type,
      })
    }
    setAnexos((prev) => [...prev, ...novos])

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoverAnexo = (id: string) => {
    setAnexos((prev) => prev.filter((a) => a.id !== id))
  }

  // Parâmetros consolidados para resolução dinâmica dos placeholders
  const parametrosTemplate = useMemo(() => {
    return {
      numeroUc,
      enderecoUc,
      nomeCliente: clienteSelecionado?.nome || 'Cliente',
      documentoCliente: documentoTitular,
      nomeResponsavel: responsavelNome,
      cargoResponsavel: responsavelCargo,
      telefoneDelfos: DELFOS_TELEFONE_PADRAO,
      emailDelfos: DELFOS_EMAIL_PADRAO,
    }
  }, [
    numeroUc,
    enderecoUc,
    clienteSelecionado,
    documentoTitular,
    responsavelNome,
    responsavelCargo,
  ])

  // Assunto e corpo do e-mail resolvidos em tempo real (refletindo edições imediatas)
  const assuntoAtual = useMemo(() => {
    return gerarAssuntoContasRGE(numeroUc, clienteSelecionado?.nome || 'Cliente', assuntoTemplate)
  }, [numeroUc, clienteSelecionado, assuntoTemplate])

  const corpoHtmlAtual = useMemo(() => {
    return gerarCorpoHtmlContasRGE(parametrosTemplate, corpoTemplate)
  }, [parametrosTemplate, corpoTemplate])

  // Inserção de placeholder na posição do cursor do textarea
  const handleInserirPlaceholder = (tag: string) => {
    const textarea = textareaCorpoRef.current
    if (!textarea) {
      setCorpoTemplate((prev) => `${prev} ${tag}`)
      return
    }

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const valorAtual = corpoTemplate
    const novoValor = valorAtual.slice(0, start) + tag + valorAtual.slice(end)
    setCorpoTemplate(novoValor)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + tag.length, start + tag.length)
    }, 50)
  }

  // Ação: Salvar texto editado como a nova mensagem padrão no PocketBase
  const handleSalvarComoPadrao = async () => {
    if (!corpoTemplate.trim()) {
      toast.error('O corpo da mensagem não pode ficar vazio.')
      return
    }

    try {
      setIsSalvandoPadrao(true)
      const salvo = await salvarTemplatePadraoContasRGE(assuntoTemplate, corpoTemplate)
      setIsTemplateCustomizado(salvo.isCustomizado)
      toast.success(
        'Mensagem padrão salva com sucesso! Ela será usada como modelo nas próximas solicitações.',
      )
    } catch (err: unknown) {
      console.error('Falha ao salvar mensagem padrão no banco:', err)
      toast.error('Erro ao salvar nova mensagem padrão no servidor. Tente novamente.')
    } finally {
      setIsSalvandoPadrao(false)
    }
  }

  // Ação: Restaurar o texto padrão original do código
  const handleRestaurarPadrao = async () => {
    try {
      setIsRestaurandoPadrao(true)
      const padrao = await restaurarTemplatePadraoContasRGE()
      setAssuntoTemplate(padrao.assunto)
      setCorpoTemplate(padrao.corpo)
      setIsTemplateCustomizado(false)
      toast.success('Mensagem padrão restaurada para o modelo oficial do sistema.')
    } catch (err: unknown) {
      console.error('Falha ao restaurar padrão:', err)
      // Fallback local caso o backend esteja indisponível
      setAssuntoTemplate(ASSUNTO_RGE_ORIGINAL)
      setCorpoTemplate(CORPO_TEXTO_RGE_ORIGINAL)
      setIsTemplateCustomizado(false)
      toast.info('Template oficial original restaurado localmente.')
    } finally {
      setIsRestaurandoPadrao(false)
    }
  }

  // Validação dos campos
  const validarFormulario = (): boolean => {
    if (!clienteId) {
      setFormError('Por favor, selecione um cliente vinculado.')
      return false
    }
    if (!numeroUc.trim()) {
      setFormError('Informe o número da Unidade Consumidora (UC).')
      return false
    }
    if (!enderecoUc.trim()) {
      setFormError('Informe o endereço da Unidade Consumidora.')
      return false
    }
    if (!responsavelNome.trim()) {
      setFormError('Informe o nome do responsável pela assinatura.')
      return false
    }
    if (!emailDestinatario.trim()) {
      setFormError('Informe o e-mail de destino da concessionária.')
      return false
    }
    if (!assuntoAtual.trim()) {
      setFormError('O assunto do e-mail não pode ficar em branco.')
      return false
    }
    if (!corpoTemplate.trim()) {
      setFormError('O corpo do e-mail não pode ficar em branco.')
      return false
    }
    setFormError(null)
    return true
  }

  // Submissão: Salvar atividade e Enviar E-mail via Resend
  const handleGerarEEnviarEmail = async () => {
    if (!validarFormulario()) return

    // Se ainda não confirmou, exibe a confirmação
    if (!confirmarEnvio) {
      setConfirmarEnvio(true)
      return
    }

    try {
      setIsEnviando(true)
      setFormError(null)

      // 1. Converter anexos em base64 para o payload do Resend
      const anexosPayload: Array<{ filename: string; content: string }> = []
      const anexosMetadados: Array<{ nome: string; tamanho: number }> = []

      for (const item of anexos) {
        try {
          const b64 = await fileToBase64(item.file)
          anexosPayload.push({
            filename: item.nome,
            content: b64,
          })
          anexosMetadados.push({
            nome: item.nome,
            tamanho: item.tamanho,
          })
        } catch (eFile) {
          console.warn(`Erro ao converter anexo ${item.nome} em base64:`, eFile)
        }
      }

      // 2. Disparar e-mail via recurso unificado reutilizável enviarEmail (Resend)
      let emailEnvioId = ''
      let envioSucesso = false
      let erroEnvioMsg = ''
      const provedorUtilizado = 'Resend'

      try {
        const envioRes = await enviarEmail({
          destinatario: emailDestinatario.trim(),
          assunto: assuntoAtual,
          corpoHtml: corpoHtmlAtual,
          anexos: anexosPayload.length > 0 ? anexosPayload : undefined,
        })

        if (envioRes.ok || envioRes.sucesso) {
          envioSucesso = true
          emailEnvioId = envioRes.id || envioRes.message_id || ''
        } else {
          erroEnvioMsg = envioRes.error || 'Falha ao enviar e-mail via Resend.'
        }
      } catch (errEmail: unknown) {
        console.error('Falha no envio do email via Resend:', errEmail)
        erroEnvioMsg =
          errEmail instanceof Error
            ? errEmail.message
            : 'Falha ao conectar com o serviço de email do Resend.'
      }

      // 3. Registrar a atividade no banco (continua em aberto, status "pendente")
      const agoraIso = new Date().toISOString()
      const tituloFinal = `Solicitar contas RGE — UC ${numeroUc.trim()}`
      const descricaoFinal = `Solicitação de faturas dos últimos 5 anos enviada por e-mail para ${emailDestinatario.trim()} referente à UC ${numeroUc.trim()}.${
        envioSucesso
          ? ` Envio confirmado via ${provedorUtilizado} (ID: ${emailEnvioId || 'ok'}).`
          : ` Aviso de envio: ${erroEnvioMsg || 'Tentativa registrada'}.`
      } Acompanhamento do protocolo e prazo em aberto.`

      const novaAtividadePayload = {
        cliente_id: clienteId,
        tipo: 'solicitar_contas_rge' as const,
        titulo: tituloFinal,
        descricao: descricaoFinal,
        status: 'pendente' as const, // Atividade continua em aberto após o envio
        data: agoraIso,
        autor: responsavelNome,
        responsavel_id: responsavelId || undefined,
        responsavel_nome: responsavelNome,
        responsavel_email: responsavelEmail,
        responsavel_cargo: responsavelCargo,
        numero_uc: numeroUc.trim(),
        endereco_uc: enderecoUc.trim(),
        documento_titular: documentoTitular.trim(),
        email_destinatario: emailDestinatario.trim(),
        email_enviado_em: envioSucesso ? agoraIso : undefined,
        email_envio_status: envioSucesso ? 'enviado' : 'falha',
        email_resend_id: emailEnvioId,
        email_log_erro: envioSucesso
          ? undefined
          : erroEnvioMsg || 'Falha ao conectar com o serviço de e-mail',
        documentos_anexados: anexosMetadados,
      }

      const atividadeCriada = await addAtividade(novaAtividadePayload)

      if (envioSucesso) {
        toast.success(
          `E-mail enviado via Resend para ${emailDestinatario.trim()} e atividade registrada!`,
        )
      } else {
        toast.warning(
          `Atividade registrada, mas o envio do e-mail reportou: ${erroEnvioMsg}. Verifique os detalhes na atividade.`,
          { duration: 8000 },
        )
      }

      if (onSuccess) {
        onSuccess(atividadeCriada)
      }

      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao registrar atividade Solicitar Contas RGE:', err)
      const msg = err instanceof Error ? err.message : 'Ocorreu um erro ao processar a solicitação.'
      setFormError(msg)
    } finally {
      setIsEnviando(false)
    }
  }

  // Apenas salvar como rascunho sem enviar e-mail imediatamente
  const handleSalvarSemEnviar = async () => {
    if (!validarFormulario()) return

    try {
      setIsEnviando(true)
      setFormError(null)

      const agoraIso = new Date().toISOString()
      const anexosMetadados = anexos.map((a) => ({ nome: a.nome, tamanho: a.tamanho }))

      const novaAtividadePayload = {
        cliente_id: clienteId,
        tipo: 'solicitar_contas_rge' as const,
        titulo: `Solicitar contas RGE — UC ${numeroUc.trim()}`,
        descricao: `Rascunho de solicitação de faturas para a UC ${numeroUc.trim()}. E-mail ainda não disparado.`,
        status: 'pendente' as const,
        data: agoraIso,
        autor: responsavelNome,
        responsavel_id: responsavelId || undefined,
        responsavel_nome: responsavelNome,
        responsavel_email: responsavelEmail,
        responsavel_cargo: responsavelCargo,
        numero_uc: numeroUc.trim(),
        endereco_uc: enderecoUc.trim(),
        documento_titular: documentoTitular.trim(),
        email_destinatario: emailDestinatario.trim(),
        email_envio_status: 'rascunho',
        documentos_anexados: anexosMetadados,
      }

      const atividadeCriada = await addAtividade(novaAtividadePayload)
      toast.success('Atividade de solicitação de contas salva com sucesso!')

      if (onSuccess) onSuccess(atividadeCriada)
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao salvar rascunho de atividade:', err)
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar rascunho.')
    } finally {
      setIsEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-[#F9FAFB]">
        {/* Header Superior */}
        <div className="p-5 sm:p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
                <FileText className="w-5 h-5 text-sky-700" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>Solicitar contas RGE</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                    Concessionária
                  </span>
                  {isTemplateCustomizado && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      Padrão personalizado
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Gere o pedido formal de faturas dos últimos 5 anos e envie diretamente por e-mail
                  à concessionária
                </DialogDescription>
              </div>
            </div>

            <PrazoRGEBadge prazoStr={null} />
          </div>
        </div>

        {/* Corpo do formulário */}
        <div className="p-5 sm:p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. SELEÇÃO DO CLIENTE */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  1. Cliente Vinculado <span className="text-rose-500">*</span>
                </h4>
              </div>
              <span className="text-[11px] text-gray-400">Busca dinâmica de cadastro</span>
            </div>

            <ClienteAutocomplete
              clientes={clientes}
              value={clienteId}
              onChange={(id) => {
                setClienteId(id)
                setFormError(null)
              }}
              placeholder="Digite o nome do cliente ou razão social..."
              required
            />
          </div>

          {/* 2. DADOS DA UNIDADE CONSUMIDORA (UC) E TITULAR */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  2. Unidade Consumidora (UC) e Titular
                </h4>
              </div>
              <span className="text-[11px] text-gray-400">Dados da fatura de energia</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              {/* Número da UC */}
              <div className="sm:col-span-4">
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Número da UC <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={numeroUc}
                  onChange={(e) => setNumeroUc(e.target.value)}
                  placeholder="Ex: 1009845231"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono bg-white font-medium"
                />
              </div>

              {/* Documento do Titular (CPF / CNPJ) */}
              <div className="sm:col-span-4">
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  CPF / CNPJ do Titular
                </label>
                <input
                  type="text"
                  value={documentoTitular}
                  onChange={(e) => setDocumentoTitular(e.target.value)}
                  placeholder="000.000.000-00 ou CNPJ"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono bg-white"
                />
              </div>

              {/* E-mail de destino */}
              <div className="sm:col-span-4">
                <label className="text-[11px] font-semibold text-gray-700 block mb-1 flex items-center justify-between">
                  <span>
                    Destinatário <span className="text-rose-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmailDestinatario('joao@delfosengenharia.com.br')}
                    className="text-[10px] text-sky-600 hover:text-sky-800 underline"
                  >
                    Usar João (Delfos)
                  </button>
                </label>
                <input
                  type="email"
                  value={emailDestinatario}
                  onChange={(e) => setEmailDestinatario(e.target.value)}
                  placeholder="joao@delfosengenharia.com.br"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              {/* Endereço da UC */}
              <div className="sm:col-span-12">
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Endereço da Unidade Consumidora <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={enderecoUc}
                  onChange={(e) => setEnderecoUc(e.target.value)}
                  placeholder="Rua, número, bairro, cidade/UF"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Pré-preenchido com o endereço da usina ou do cliente
                </span>
              </div>
            </div>
          </div>

          {/* 3. DADOS DO RESPONSÁVEL QUE CRIOU A ATIVIDADE */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  3. Responsável pela Solicitação (Assinatura)
                </h4>
              </div>
              <span className="text-[11px] text-gray-400">Assinatura formal do e-mail</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Usuário do Sistema
                </label>
                <select
                  value={responsavelId}
                  onChange={(e) => handleTrocaResponsavel(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">Selecione ou edite manualmente...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {user?.id === u.id ? '(Você)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Nome para Assinatura <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Cargo do Responsável
                </label>
                <input
                  type="text"
                  value={responsavelCargo}
                  onChange={(e) => setResponsavelCargo(e.target.value)}
                  placeholder="Ex: Engenheiro Responsável / Diretor Técnico"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 4. DOCUMENTOS ANEXADOS (PROCURAÇÃO, COMODATO, AUTORIZAÇÃO, ETC.) */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  4. Anexar Documentos ({anexos.length})
                </h4>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="input-anexos-rge"
                />
                <label
                  htmlFor="input-anexos-rge"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl cursor-pointer transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Selecionar arquivos</span>
                </label>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Anexe a procuração assinada, contrato de comodato, autorização do titular ou documento
              com foto (serão enviados como anexo do e-mail).
            </p>

            {anexos.length === 0 ? (
              <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 text-center text-xs text-gray-400 bg-gray-50/50">
                Nenhum arquivo anexado ainda. Clique em "Selecionar arquivos" acima para adicionar
                procuração/autorização.
              </div>
            ) : (
              <div className="space-y-1.5">
                {anexos.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="font-medium text-gray-800 truncate">{item.nome}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        ({Math.round(item.tamanho / 1024)} KB)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoverAnexo(item.id)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remover anexo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. MENSAGEM DO E-MAIL (EDITOR DE TEXTO PADRÃO & PRÉVIA EM TEMPO REAL) */}
          <div className="p-4 bg-sky-50/40 rounded-2xl border border-sky-200/80 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-700" />
                <h4 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <span>Mensagem e Pré-visualização do e-mail</span>
                  {isTemplateCustomizado && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                      Editado
                    </span>
                  )}
                </h4>
              </div>

              {/* Controles de edição / botões de ação */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModoEdicaoTemplate((prev) => !prev)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${
                    modoEdicaoTemplate
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
                  }`}
                  title="Editar o texto padrão da mensagem e assunto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{modoEdicaoTemplate ? 'Fechar editor' : 'Editar mensagem'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarPreviewEmail((prev) => !prev)}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900 bg-white hover:bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{mostrarPreviewEmail ? 'Ocultar prévia' : 'Ver prévia'}</span>
                </button>
              </div>
            </div>

            {/* Painel do Editor de Mensagem e Assunto */}
            {modoEdicaoTemplate && (
              <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Personalizar Assunto e Corpo Padrão</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarAjudaPlaceholders((prev) => !prev)}
                    className="text-[11px] text-gray-500 hover:text-sky-700 inline-flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      {mostrarAjudaPlaceholders ? 'Ocultar tags' : 'Ver tags disponíveis'}
                    </span>
                  </button>
                </div>

                {/* Tags / Placeholders clicáveis */}
                {mostrarAjudaPlaceholders && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
                    <p className="text-[11px] text-gray-600">
                      Clique em qualquer tag abaixo para inseri-la no cursor da mensagem. No envio,
                      os placeholders são substituídos automaticamente pelos dados do cliente:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {RGE_PLACEHOLDERS.map((ph) => (
                        <button
                          key={ph.tag}
                          type="button"
                          onClick={() => handleInserirPlaceholder(ph.tag)}
                          className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-mono transition-colors"
                          title={`Exemplo: ${ph.exemplo}`}
                        >
                          + {ph.tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edição do Assunto */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Assunto do e-mail (com placeholders):
                  </label>
                  <input
                    type="text"
                    value={assuntoTemplate}
                    onChange={(e) => setAssuntoTemplate(e.target.value)}
                    placeholder="Solicitação de faturas de energia — UC [número da UC] — [nome do cliente]"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium bg-white"
                  />
                </div>

                {/* Edição do Corpo */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Corpo da mensagem (texto formatado com placeholders):
                  </label>
                  <textarea
                    ref={textareaCorpoRef}
                    rows={8}
                    value={corpoTemplate}
                    onChange={(e) => setCorpoTemplate(e.target.value)}
                    placeholder="Digite o texto padrão da mensagem..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono leading-relaxed bg-white"
                  />
                </div>

                {/* Barra de Ações: Salvar como padrão e Restaurar padrão */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRestaurarPadrao}
                    disabled={isRestaurandoPadrao || isSalvandoPadrao}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    title="Volta ao texto original de fábrica da Delfos Engenharia"
                  >
                    {isRestaurandoPadrao ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Restaurar padrão</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSalvarComoPadrao}
                    disabled={isSalvandoPadrao || isRestaurandoPadrao}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                    title="Salva essa mensagem no PocketBase para ser usada nas próximas vezes"
                  >
                    {isSalvandoPadrao ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando no banco...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar como padrão</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Cabeçalho do e-mail resolvido */}
            <div className="text-xs text-gray-600 bg-white p-3 rounded-xl border border-sky-100 space-y-1">
              <div>
                <strong className="text-gray-900">Assunto resolvido:</strong>{' '}
                <span className="text-gray-800 font-medium">{assuntoAtual}</span>
              </div>
              <div>
                <strong className="text-gray-900">Remetente:</strong> {DEFAULT_EMAIL_FROM}
              </div>
              <div>
                <strong className="text-gray-900">Destinatário:</strong>{' '}
                {emailDestinatario || 'joao@delfosengenharia.com.br'}
              </div>
            </div>

            {/* Prévia em tempo real com renderização do HTML */}
            {mostrarPreviewEmail && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Prévia em tempo real (dados aplicados):</span>
                  <span className="text-[10px] text-sky-700">
                    HTML oficial para a concessionária
                  </span>
                </div>
                <div
                  className="p-4 bg-white rounded-xl border border-gray-200 text-xs text-gray-800 max-h-72 overflow-y-auto space-y-3 leading-relaxed shadow-inner"
                  dangerouslySetInnerHTML={{ __html: corpoHtmlAtual }}
                />
              </div>
            )}
          </div>

          {/* Banner de Confirmação antes do envio */}
          {confirmarEnvio && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Confirmação de disparo de e-mail</span>
              </div>
              <p>
                O e-mail será enviado imediatamente para <strong>{emailDestinatario}</strong> com{' '}
                {anexos.length} documento(s) em anexo via <strong>Resend</strong> (remetente:{' '}
                {DEFAULT_EMAIL_FROM}). A atividade ficará registrada em aberto para acompanhamento
                do retorno e prazo da concessionária.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé com botões de ação */}
        <div className="p-4 sm:p-5 bg-white border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isEnviando}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleSalvarSemEnviar}
              disabled={isEnviando}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              title="Salva a atividade como rascunho sem enviar e-mail agora"
            >
              Salvar rascunho
            </button>

            <button
              type="button"
              onClick={handleGerarEEnviarEmail}
              disabled={isEnviando}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {isEnviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando e-mail...</span>
                </>
              ) : confirmarEnvio ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar e Enviar Agora</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gerar e enviar email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default ModalSolicitarContasRGE

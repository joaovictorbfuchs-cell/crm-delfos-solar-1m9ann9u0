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
  Plus,
  Settings2,
  Bookmark,
  ChevronDown,
  X,
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
} from '@/lib/emailContasRGETemplate'
import {
  listarModelosEmailRGE,
  criarModeloEmailRGE,
  atualizarModeloEmailRGE,
  excluirModeloEmailRGE,
  restaurarModelosIniciaisRGE,
  listarEmailsRGE,
  salvarEmailRGE,
  excluirEmailRGE,
  EMAIL_DESTINO_PADRAO,
} from '@/services/emailRGEService'
import { PrazoRGEBadge } from '@/components/PrazoRGEBadge'
import type { Atividade, UsinaCliente, ModeloEmailRGE, EmailRGEItem } from '@/types/crm'
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

  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === clienteId)
  }, [clientes, clienteId])

  // 2. Unidade Consumidora (UC)
  const [numeroUc, setNumeroUc] = useState<string>(atividadeExistente?.numero_uc || '')

  // 3. Endereço da unidade consumidora
  const [enderecoUc, setEnderecoUc] = useState<string>(atividadeExistente?.endereco_uc || '')

  // 4. Documento do titular/consumidor (CPF / CNPJ)
  const [documentoTitular, setDocumentoTitular] = useState<string>(
    atividadeExistente?.documento_titular || '',
  )

  // 5. Responsável
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

  // 6. Modelos de E-mail RGE (Persistidos e Configuráveis)
  const [modelos, setModelos] = useState<ModeloEmailRGE[]>([])
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState<string>('')
  const [loadingModelos, setLoadingModelos] = useState<boolean>(false)

  // 7. Lista de E-mails RGE Gerenciáveis
  const [emailsSalvos, setEmailsSalvos] = useState<EmailRGEItem[]>([])
  const [emailDestinatario, setEmailDestinatario] = useState<string>(
    atividadeExistente?.email_destinatario || emailDestinatarioInicial || EMAIL_DESTINO_PADRAO,
  )
  const [salvandoEmailNovo, setSalvandoEmailNovo] = useState<boolean>(false)
  const [rotuloEmailNovo, setRotuloEmailNovo] = useState<string>('')
  const [mostrarSalvarEmail, setMostrarSalvarEmail] = useState<boolean>(false)

  // 8. Assunto e Corpo atuais para disparo
  const [assuntoTemplate, setAssuntoTemplate] = useState<string>(ASSUNTO_RGE_ORIGINAL)
  const [corpoTemplate, setCorpoTemplate] = useState<string>(CORPO_TEXTO_RGE_ORIGINAL)

  // 9. Modos e painéis do modal
  const [modoEdicaoTemplate, setModoEdicaoTemplate] = useState<boolean>(false)
  const [mostrarPreviewEmail, setMostrarPreviewEmail] = useState<boolean>(true)
  const [mostrarAjudaPlaceholders, setMostrarAjudaPlaceholders] = useState<boolean>(false)
  const [mostrarGerenciadorModelos, setMostrarGerenciadorModelos] = useState<boolean>(false)

  // Estado para Criar / Editar Modelo
  const [modeloEmEdicao, setModeloEmEdicao] = useState<Partial<ModeloEmailRGE> | null>(null)
  const [isSalvandoModelo, setIsSalvandoModelo] = useState<boolean>(false)
  const [isRestaurandoModelos, setIsRestaurandoModelos] = useState<boolean>(false)

  // 10. Documentos anexados
  const [anexos, setAnexos] = useState<ArquivoAnexoItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaCorpoRef = useRef<HTMLTextAreaElement>(null)

  // Controle de envio e confirmação
  const [confirmarEnvio, setConfirmarEnvio] = useState<boolean>(false)
  const [isEnviando, setIsEnviando] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Carrega modelos e lista de e-mails do PocketBase
  const carregarDadosModelosEEmails = async () => {
    try {
      setLoadingModelos(true)
      const [listaM, listaE] = await Promise.all([listarModelosEmailRGE(), listarEmailsRGE()])
      setModelos(listaM)
      setEmailsSalvos(listaE)

      // Se nenhum modelo estiver selecionado ainda, seleciona o primeiro
      if (listaM.length > 0 && !modeloSelecionadoId) {
        const primeiro = listaM[0]
        setModeloSelecionadoId(primeiro.id)
        if (!atividadeExistente?.email_destinatario && !emailDestinatarioInicial) {
          setEmailDestinatario(primeiro.email_destino || EMAIL_DESTINO_PADRAO)
        }
        setAssuntoTemplate(primeiro.assunto || ASSUNTO_RGE_ORIGINAL)
        setCorpoTemplate(primeiro.texto || CORPO_TEXTO_RGE_ORIGINAL)
      }
    } catch (e) {
      console.warn('Erro ao carregar dados de modelos e emails RGE:', e)
    } finally {
      setLoadingModelos(false)
    }
  }

  // Inicialização ao abrir modal
  useEffect(() => {
    if (open) {
      const cId = atividadeExistente?.cliente_id || clienteIdInicial || clienteId || ''
      setClienteId(cId)

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

      if (atividadeExistente?.email_destinatario) {
        setEmailDestinatario(atividadeExistente.email_destinatario)
      } else if (emailDestinatarioInicial) {
        setEmailDestinatario(emailDestinatarioInicial)
      }

      if (atividadeExistente?.numero_uc) setNumeroUc(atividadeExistente.numero_uc)
      if (atividadeExistente?.endereco_uc) setEnderecoUc(atividadeExistente.endereco_uc)
      if (atividadeExistente?.documento_titular)
        setDocumentoTitular(atividadeExistente.documento_titular)

      setFormError(null)
      setConfirmarEnvio(false)
      setMostrarGerenciadorModelos(false)
      setModeloEmEdicao(null)

      carregarDadosModelosEEmails()
    }
  }, [open, clienteIdInicial, atividadeExistente, emailDestinatarioInicial, user, usuarios])

  // Pré-preenchimento ao selecionar cliente
  useEffect(() => {
    if (!clienteSelecionado) return

    const ucCliente = clienteSelecionado.uc || ''
    const ucUsina = usinas.find((u) => u.numero_uc)?.numero_uc || ''
    setNumeroUc((prev) => (prev ? prev : ucCliente || ucUsina || ''))

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

    const doc =
      clienteSelecionado.cpf || clienteSelecionado.cnpj || clienteSelecionado.titular_cpf || ''
    setDocumentoTitular((prev) => (prev ? prev : doc))
  }, [clienteSelecionado, usinas])

  // Ao trocar de modelo no seletor principal:
  // Preenche destinatário pré-configurado e texto do modelo (ambos permanecem editáveis)
  const handleSelecionarModelo = (modeloId: string) => {
    setModeloSelecionadoId(modeloId)
    const m = modelos.find((item) => item.id === modeloId)
    if (m) {
      if (m.email_destino) {
        setEmailDestinatario(m.email_destino)
      }
      if (m.assunto) {
        setAssuntoTemplate(m.assunto)
      }
      if (m.texto) {
        setCorpoTemplate(m.texto)
      }
    }
  }

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

  const assuntoAtual = useMemo(() => {
    return gerarAssuntoContasRGE(numeroUc, clienteSelecionado?.nome || 'Cliente', assuntoTemplate)
  }, [numeroUc, clienteSelecionado, assuntoTemplate])

  const corpoHtmlAtual = useMemo(() => {
    return gerarCorpoHtmlContasRGE(parametrosTemplate, corpoTemplate)
  }, [parametrosTemplate, corpoTemplate])

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

  // Ações de Gerenciamento da Lista de E-mails
  const handleSalvarEmailNaLista = async () => {
    const emailNorm = emailDestinatario.trim()
    if (!emailNorm || !emailNorm.includes('@')) {
      toast.error('Informe um e-mail válido para salvar.')
      return
    }

    try {
      setSalvandoEmailNovo(true)
      const salvo = await salvarEmailRGE({
        email: emailNorm,
        rotulo: rotuloEmailNovo.trim() || emailNorm,
        is_padrao: false,
      })
      setEmailsSalvos((prev) => {
        const filtrado = prev.filter((e) => e.email.toLowerCase() !== salvo.email.toLowerCase())
        return [salvo, ...filtrado]
      })
      setMostrarSalvarEmail(false)
      setRotuloEmailNovo('')
      toast.success(`E-mail ${salvo.email} salvo na sua lista de contatos RGE!`)
    } catch (err) {
      console.error('Erro ao salvar e-mail:', err)
      toast.error('Erro ao salvar e-mail na lista.')
    } finally {
      setSalvandoEmailNovo(false)
    }
  }

  const handleExcluirEmailDaLista = async (id: string, email: string) => {
    try {
      await excluirEmailRGE(id)
      setEmailsSalvos((prev) => prev.filter((e) => e.id !== id))
      toast.success(`E-mail ${email} removido da lista.`)
    } catch (err) {
      console.error('Erro ao excluir e-mail:', err)
      toast.error('Erro ao excluir e-mail da lista.')
    }
  }

  // Ações de Gerenciamento de Modelos (Criar / Editar / Excluir / Salvar)
  const handleIniciarCriacaoModelo = () => {
    setModeloEmEdicao({
      nome: '',
      assunto: `[Email RGE] [nome do cliente] — UC [número da UC]`,
      texto: corpoTemplate,
      email_destino: emailDestinatario || EMAIL_DESTINO_PADRAO,
      is_padrao: false,
    })
    setMostrarGerenciadorModelos(true)
  }

  const handleIniciarEdicaoModeloAtual = () => {
    const atual = modelos.find((m) => m.id === modeloSelecionadoId)
    if (atual) {
      setModeloEmEdicao({ ...atual })
      setMostrarGerenciadorModelos(true)
    }
  }

  const handleSalvarModeloEdicao = async () => {
    if (!modeloEmEdicao?.nome?.trim()) {
      toast.error('O modelo precisa de um nome descritivo.')
      return
    }
    if (!modeloEmEdicao?.texto?.trim()) {
      toast.error('O modelo não pode ter texto em branco.')
      return
    }

    try {
      setIsSalvandoModelo(true)
      if (modeloEmEdicao.id && !modeloEmEdicao.id.startsWith('fallback-')) {
        // Atualizar modelo existente
        const atualizado = await atualizarModeloEmailRGE(modeloEmEdicao.id, {
          nome: modeloEmEdicao.nome,
          assunto: modeloEmEdicao.assunto,
          texto: modeloEmEdicao.texto,
          email_destino: modeloEmEdicao.email_destino,
        })
        setModelos((prev) => prev.map((m) => (m.id === atualizado.id ? atualizado : m)))
        if (modeloSelecionadoId === atualizado.id) {
          setAssuntoTemplate(atualizado.assunto || ASSUNTO_RGE_ORIGINAL)
          setCorpoTemplate(atualizado.texto)
          if (atualizado.email_destino) setEmailDestinatario(atualizado.email_destino)
        }
        toast.success(`Modelo "${atualizado.nome}" atualizado com sucesso!`)
      } else {
        // Criar novo modelo personalizado
        const criado = await criarModeloEmailRGE({
          nome: modeloEmEdicao.nome,
          assunto: modeloEmEdicao.assunto,
          texto: modeloEmEdicao.texto,
          email_destino: modeloEmEdicao.email_destino,
          tipo: 'personalizado',
          is_padrao: false,
        })
        setModelos((prev) => [...prev, criado])
        setModeloSelecionadoId(criado.id)
        setAssuntoTemplate(criado.assunto || ASSUNTO_RGE_ORIGINAL)
        setCorpoTemplate(criado.texto)
        if (criado.email_destino) setEmailDestinatario(criado.email_destino)
        toast.success(`Novo modelo "${criado.nome}" criado com sucesso!`)
      }
      setModeloEmEdicao(null)
      setMostrarGerenciadorModelos(false)
    } catch (err) {
      console.error('Erro ao salvar modelo:', err)
      toast.error('Erro ao persistir modelo no servidor.')
    } finally {
      setIsSalvandoModelo(false)
    }
  }

  const handleExcluirModelo = async (modelo: ModeloEmailRGE) => {
    if (modelo.is_padrao) {
      toast.warning(
        'Este é um dos 3 modelos padrão do sistema. Para modificá-lo, use o botão "Editar".',
      )
      return
    }

    if (!confirm(`Tem certeza que deseja excluir o modelo "${modelo.nome}"?`)) {
      return
    }

    try {
      await excluirModeloEmailRGE(modelo.id)
      const restantes = modelos.filter((m) => m.id !== modelo.id)
      setModelos(restantes)
      if (modeloSelecionadoId === modelo.id && restantes.length > 0) {
        handleSelecionarModelo(restantes[0].id)
      }
      toast.success(`Modelo "${modelo.nome}" excluído.`)
    } catch (err) {
      console.error('Erro ao excluir modelo:', err)
      toast.error('Erro ao excluir modelo.')
    }
  }

  const handleRestaurarModelosPadrao = async () => {
    try {
      setIsRestaurandoModelos(true)
      const restaurados = await restaurarModelosIniciaisRGE()
      setModelos(restaurados)
      if (restaurados.length > 0) {
        handleSelecionarModelo(restaurados[0].id)
      }
      toast.success('Modelos iniciais restaurados para os valores padrão do sistema.')
    } catch (err) {
      console.error('Erro ao restaurar modelos:', err)
      toast.error('Erro ao restaurar modelos padrão.')
    } finally {
      setIsRestaurandoModelos(false)
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

      // 3. Registrar a atividade no banco (mantém tipo solicitar_contas_rge para 100% retrocompatibilidade)
      const agoraIso = new Date().toISOString()
      const modeloAtualNome = modelos.find((m) => m.id === modeloSelecionadoId)?.nome || 'Email RGE'
      const tituloFinal = `${modeloAtualNome} — UC ${numeroUc.trim()}`
      const descricaoFinal = `E-mail RGE (${modeloAtualNome}) enviado para ${emailDestinatario.trim()} referente à UC ${numeroUc.trim()}.${
        envioSucesso
          ? ` Envio confirmado via ${provedorUtilizado} (ID: ${emailEnvioId || 'ok'}).`
          : ` Aviso de envio: ${erroEnvioMsg || 'Tentativa registrada'}.`
      } Acompanhamento do protocolo e prazo em aberto.`

      const novaAtividadePayload = {
        cliente_id: clienteId,
        tipo: 'solicitar_contas_rge' as const,
        titulo: tituloFinal,
        descricao: descricaoFinal,
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
          `Atividade registrada, mas o envio reportou: ${erroEnvioMsg}. Verifique os detalhes na atividade.`,
          { duration: 8000 },
        )
      }

      if (onSuccess) {
        onSuccess(atividadeCriada)
      }

      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao registrar atividade Email RGE:', err)
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
      const modeloAtualNome = modelos.find((m) => m.id === modeloSelecionadoId)?.nome || 'Email RGE'

      const novaAtividadePayload = {
        cliente_id: clienteId,
        tipo: 'solicitar_contas_rge' as const,
        titulo: `${modeloAtualNome} — UC ${numeroUc.trim()}`,
        descricao: `Rascunho de e-mail RGE (${modeloAtualNome}) para a UC ${numeroUc.trim()}. E-mail ainda não disparado.`,
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
      toast.success('Atividade de e-mail RGE salva como rascunho com sucesso!')

      if (onSuccess) onSuccess(atividadeCriada)
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao salvar rascunho de atividade:', err)
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar rascunho.')
    } finally {
      setIsEnviando(false)
    }
  }

  const modeloAtual = modelos.find((m) => m.id === modeloSelecionadoId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-[#F9FAFB]">
        {/* Header Superior — Rótulo Novo 'Email RGE' */}
        <div className="p-5 sm:p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
                <Mail className="w-5 h-5 text-sky-700" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>Email RGE</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                    Concessionária
                  </span>
                  {modeloAtual && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                      {modeloAtual.nome}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Envie solicitações de faturas, troca de titularidade, transferência de créditos e
                  modelos personalizados diretamente à concessionária
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
              <div className="space-y-1">
                <span>{formError}</span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SELETOR E GERENCIADOR DE MODELOS DE E-MAIL RGE           */}
          {/* ========================================================= */}
          <div className="p-4 bg-white rounded-2xl border border-sky-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <span>Modelo de E-mail RGE</span>
                  <span className="text-[10px] lowercase font-normal text-gray-500">
                    (carrega texto + e-mail de destino pré-configurados)
                  </span>
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleIniciarCriacaoModelo}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                  title="Criar novo modelo de e-mail personalizado"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo modelo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarGerenciadorModelos((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                    mostrarGerenciadorModelos
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Gerenciar lista de modelos (editar, excluir, restaurar)"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Gerenciar modelos</span>
                </button>
              </div>
            </div>

            {/* Seletor de Modelo */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Selecione o tipo/modelo desejado:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {modelos.map((m) => {
                  const isSelected = modeloSelecionadoId === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelecionarModelo(m.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-sky-300 hover:bg-sky-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-gray-900 line-clamp-1">
                          {m.nome}
                        </span>
                        {m.is_padrao ? (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-semibold shrink-0">
                            Padrão
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        Destino: {m.email_destino || EMAIL_DESTINO_PADRAO}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Painel do Gerenciador / Editor de Modelos */}
            {mostrarGerenciadorModelos && (
              <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3.5 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Gerenciador de Modelos de E-mail RGE</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleRestaurarModelosPadrao}
                    disabled={isRestaurandoModelos}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline disabled:opacity-50"
                  >
                    {isRestaurandoModelos ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    <span>Restaurar 3 modelos iniciais</span>
                  </button>
                </div>

                {/* Lista de Modelos Existentes com Ações */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Modelos cadastrados no sistema:
                  </span>
                  {modelos.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{m.nome}</span>
                          {m.is_padrao && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-medium">
                              Inicial
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Destino pré-configurado:{' '}
                          <span className="font-mono">{m.email_destino}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setModeloEmEdicao({ ...m })
                          }}
                          className="px-2 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 flex items-center gap-1"
                          title="Editar nome, texto e destino deste modelo"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

                        {!m.is_padrao && (
                          <button
                            type="button"
                            onClick={() => handleExcluirModelo(m)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                            title="Excluir modelo personalizado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulário de Criação / Edição de Modelo */}
                {modeloEmEdicao && (
                  <div className="p-3.5 bg-white rounded-xl border border-sky-300 space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-950">
                        {modeloEmEdicao.id
                          ? `Editando: ${modeloEmEdicao.nome}`
                          : 'Novo Modelo de E-mail'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setModeloEmEdicao(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                          Nome do Modelo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={modeloEmEdicao.nome || ''}
                          onChange={(e) =>
                            setModeloEmEdicao((prev) => ({ ...prev, nome: e.target.value }))
                          }
                          placeholder="Ex: Troca de disjuntor / Aumento de carga"
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                          E-mail de Destino Pré-configurado <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={modeloEmEdicao.email_destino || ''}
                          onChange={(e) =>
                            setModeloEmEdicao((prev) => ({
                              ...prev,
                              email_destino: e.target.value,
                            }))
                          }
                          placeholder="joao@delfosengenharia.com.br"
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                          Assunto Padrão (aceita placeholders [número da UC], [nome do cliente]):
                        </label>
                        <input
                          type="text"
                          value={modeloEmEdicao.assunto || ''}
                          onChange={(e) =>
                            setModeloEmEdicao((prev) => ({ ...prev, assunto: e.target.value }))
                          }
                          placeholder="Assunto do e-mail..."
                          className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                          Texto do Modelo (com placeholders):
                        </label>
                        <textarea
                          rows={6}
                          value={modeloEmEdicao.texto || ''}
                          onChange={(e) =>
                            setModeloEmEdicao((prev) => ({ ...prev, texto: e.target.value }))
                          }
                          placeholder="Digite o texto padrão com [número da UC], [endereço da UC], [nome do cliente], etc..."
                          className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono leading-relaxed bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setModeloEmEdicao(null)}
                        className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={handleSalvarModeloEdicao}
                        disabled={isSalvandoModelo}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50"
                      >
                        {isSalvandoModelo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Salvar Modelo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 1. SELEÇÃO DO CLIENTE                                     */}
          {/* ========================================================= */}
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

          {/* ========================================================= */}
          {/* 2. DADOS DA UNIDADE CONSUMIDORA (UC) E DESTINATÁRIO       */}
          {/* ========================================================= */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  2. Unidade Consumidora (UC) e Destinatário
                </h4>
              </div>
              <span className="text-[11px] text-gray-400">Dados da fatura e concessionária</span>
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

              {/* Documento do Titular */}
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

              {/* E-mail de destino gerenciável */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                  <span>
                    Destinatário <span className="text-rose-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMostrarSalvarEmail((prev) => !prev)}
                    className="text-[10px] text-sky-600 hover:text-sky-800 underline font-medium"
                  >
                    {mostrarSalvarEmail ? 'Fechar' : '+ Salvar na lista'}
                  </button>
                </label>

                <input
                  type="email"
                  value={emailDestinatario}
                  onChange={(e) => setEmailDestinatario(e.target.value)}
                  placeholder="joao@delfosengenharia.com.br"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />

                {/* Seletor rápido de e-mails salvos */}
                {emailsSalvos.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {emailsSalvos.map((e) => {
                      const isSel = emailDestinatario.toLowerCase() === e.email.toLowerCase()
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setEmailDestinatario(e.email)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 ${
                            isSel
                              ? 'bg-sky-100 text-sky-900 border-sky-300 font-bold'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                          title={`${e.email} — ${e.descricao || e.rotulo}`}
                        >
                          <span>{e.rotulo || e.email.split('@')[0]}</span>
                          {!e.is_padrao && (
                            <span
                              onClick={(evt) => {
                                evt.stopPropagation()
                                handleExcluirEmailDaLista(e.id, e.email)
                              }}
                              className="text-gray-400 hover:text-rose-600 p-0.5"
                              title="Remover e-mail salvo"
                            >
                              ×
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Sub-painel: Salvar novo e-mail na lista */}
                {mostrarSalvarEmail && (
                  <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-xs space-y-2 mt-1 animate-in fade-in">
                    <span className="text-[11px] font-bold text-sky-900 block">
                      Salvar este e-mail na lista rápida:
                    </span>
                    <input
                      type="text"
                      value={rotuloEmailNovo}
                      onChange={(e) => setRotuloEmailNovo(e.target.value)}
                      placeholder="Rótulo / Descrição (ex: Protocolo RGE Erechim)"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-sky-300 bg-white"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMostrarSalvarEmail(false)}
                        className="px-2 py-1 text-[11px] text-gray-600 hover:text-gray-900"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSalvarEmailNaLista}
                        disabled={salvandoEmailNovo}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1"
                      >
                        {salvandoEmailNovo ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Bookmark className="w-3 h-3" />
                        )}
                        <span>Salvar na lista</span>
                      </button>
                    </div>
                  </div>
                )}
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
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. DADOS DO RESPONSÁVEL (ASSINATURA)                      */}
          {/* ========================================================= */}
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

          {/* ========================================================= */}
          {/* 4. DOCUMENTOS ANEXADOS                                    */}
          {/* ========================================================= */}
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

          {/* ========================================================= */}
          {/* 5. MENSAGEM DO E-MAIL (EDITOR & PRÉVIA EM TEMPO REAL)     */}
          {/* ========================================================= */}
          <div className="p-4 bg-sky-50/40 rounded-2xl border border-sky-200/80 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-700" />
                <h4 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <span>Mensagem e Pré-visualização do e-mail</span>
                </h4>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModoEdicaoTemplate((prev) => !prev)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${
                    modoEdicaoTemplate
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
                  }`}
                  title="Editar o texto da mensagem e assunto para este disparo"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{modoEdicaoTemplate ? 'Fechar editor' : 'Editar texto'}</span>
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

            {/* Painel de Edição do Texto e Assunto */}
            {modoEdicaoTemplate && (
              <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Personalizar Assunto e Corpo (editável antes do disparo)</span>
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

                {mostrarAjudaPlaceholders && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
                    <p className="text-[11px] text-gray-600">
                      Clique em qualquer tag abaixo para inseri-la no cursor da mensagem:
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

                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Assunto do e-mail (com placeholders):
                  </label>
                  <input
                    type="text"
                    value={assuntoTemplate}
                    onChange={(e) => setAssuntoTemplate(e.target.value)}
                    placeholder="Assunto do e-mail..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Corpo da mensagem (texto formatado com placeholders):
                  </label>
                  <textarea
                    ref={textareaCorpoRef}
                    rows={8}
                    value={corpoTemplate}
                    onChange={(e) => setCorpoTemplate(e.target.value)}
                    placeholder="Digite o texto da mensagem..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono leading-relaxed bg-white"
                  />
                </div>

                {/* Opção rápida de salvar essas edições no modelo atual selecionado */}
                {modeloAtual && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 flex-wrap">
                    <span className="text-[11px] text-gray-500">
                      Deseja que esse texto seja o padrão do modelo{' '}
                      <strong>"{modeloAtual.nome}"</strong>?
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await atualizarModeloEmailRGE(modeloAtual.id, {
                            assunto: assuntoTemplate,
                            texto: corpoTemplate,
                            email_destino: emailDestinatario,
                          })
                          toast.success(`Modelo "${modeloAtual.nome}" atualizado com sucesso!`)
                          carregarDadosModelosEEmails()
                        } catch (e) {
                          toast.error('Erro ao atualizar modelo.')
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar alterações no modelo</span>
                    </button>
                  </div>
                )}
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
                <span className="font-mono text-sky-800">
                  {emailDestinatario || EMAIL_DESTINO_PADRAO}
                </span>
              </div>
            </div>

            {/* Prévia em tempo real */}
            {mostrarPreviewEmail && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Prévia em tempo real (dados aplicados):</span>
                  <span className="text-[10px] text-sky-700">HTML oficial formatado</span>
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
                <span>Confirmação de disparo de e-mail RGE</span>
              </div>
              <p>
                O e-mail será enviado imediatamente para <strong>{emailDestinatario}</strong> com{' '}
                {anexos.length} documento(s) em anexo via <strong>Resend</strong> (remetente:{' '}
                {DEFAULT_EMAIL_FROM}). A atividade ficará registrada em aberto para acompanhamento
                do protocolo e prazo da concessionária.
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

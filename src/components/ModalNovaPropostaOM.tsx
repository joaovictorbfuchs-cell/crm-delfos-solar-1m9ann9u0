import React, { useState, useMemo, useEffect } from 'react'
import {
  X,
  FileCheck,
  Sparkles,
  Info,
  Save,
  Eye,
  Edit3,
  ArrowLeft,
  Sliders,
  Link2,
  Send,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, getTelhadoLabel } from '@/lib/formatters'
import type { PropostaOM } from '@/types/crm'
import { calcularPropostaOM, type PropostaPDFInput } from '@/lib/propostaOMGenerator'
import { normalizarNomePlanoOM } from '@/lib/planosOM'
import { BotaoBaixarPropostaOMPDF } from '@/components/BotaoBaixarPropostaOMPDF'
import { PreviewPropostaOMDocumento } from '@/components/PreviewPropostaOMDocumento'
import { PainelEdicaoConteudoOM } from '@/components/PainelEdicaoConteudoOM'
import { sendWhatsAppDocumento, sendWhatsAppMensagem } from '@/services/crmService'
import { criarLinkPropostaOM } from '@/services/propostaOMPublicaService'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import { enviarEmail, DEFAULT_EMAIL_FROM } from '@/lib/emailService'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ConteudoPropostaOM,
  getConteudoPropostaOMDefaults,
  normalizarConteudoPropostaOM,
} from '@/lib/conteudoPropostaOM'

interface ModalNovaPropostaOMProps {
  isOpen: boolean
  onClose: () => void
  initialClienteId?: string
  initialProposta?: PropostaOM | null
  onAbrirContrato?: (proposta: PropostaOM) => void
  onAbrirProcuracao?: (proposta: PropostaOM) => void
}

export const ModalNovaPropostaOM: React.FC<ModalNovaPropostaOMProps> = ({
  isOpen,
  onClose,
  initialClienteId,
  initialProposta,
  onAbrirContrato,
  onAbrirProcuracao,
}) => {
  const {
    clientes,
    sistemas,
    addPropostaOM,
    updatePropostaOM,
    addTimelineOM,
    updateClienteStatus,
  } = useClientes()
  const { user } = useAuth()

  // Seletor de Cliente
  const [selectedId, setSelectedId] = useState<string>('')

  // Parâmetros informados pelo usuário
  const [valorKwh, setValorKwh] = useState<number>(0.92)
  const [distanciaKm, setDistanciaKm] = useState<number>(15)
  const [valorKm, setValorKm] = useState<number>(2.5)
  const [valorPorPlaca, setValorPorPlaca] = useState<number>(9.0)
  // Valores manuais de negociação por plano (editáveis na tela)
  const [valorManualEssencial, setValorManualEssencial] = useState<string>('')
  const [valorManualInspecao, setValorManualInspecao] = useState<string>('')
  const [valorManualCompleto, setValorManualCompleto] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isSendingAction, setIsSendingAction] = useState<'link' | 'pdf' | null>(null)
  const [whatsAppConfirmation, setWhatsAppConfirmation] = useState<null | {
    type: 'link' | 'pdf'
    phone: string
    message: string
    proposalId: string
    link?: string
    base64?: string
    fileName?: string
  }>(null)
  const [emailConfirmation, setEmailConfirmation] = useState<null | {
    email: string
    assunto: string
    mensagem: string
    proposalId: string
    base64: string
    fileName: string
  }>(null)
  const [propostaSalvaId, setPropostaSalvaId] = useState<string>(initialProposta?.id || '')
  // Abre pelos dados da proposta; o documento fica disponível na etapa seguinte.
  const [activeTab, setActiveTab] = useState<'parametros' | 'preview' | 'edicao'>('parametros')
  const [planoEscolhido, setPlanoEscolhido] = useState<any>('Completo')
  const [conteudoOM, setConteudoOM] = useState<ConteudoPropostaOM>(getConteudoPropostaOMDefaults())
  // Aprovação da proposta O&M: sequência aprovar → contrato → procuração
  const [aprovacaoDialogOpen, setAprovacaoDialogOpen] = useState(false)
  const [statusAtual, setStatusAtual] = useState<string>(
    initialProposta?.status || 'Proposta Enviada',
  )
  const [aprovando, setAprovando] = useState(false)

  useEffect(() => {
    if (initialProposta?.status) setStatusAtual(initialProposta.status)
  }, [initialProposta?.status])

  // Cliente atual selecionado
  useEffect(() => {
    if (initialClienteId) {
      setSelectedId(initialClienteId)
    } else if (clientes.length > 0 && (!selectedId || !clientes.some((c) => c.id === selectedId))) {
      setSelectedId(clientes[0].id)
    }
  }, [initialClienteId, clientes, selectedId])

  // Se veio uma proposta para visualizar/regenerar
  useEffect(() => {
    if (initialProposta) {
      setSelectedId(initialProposta.cliente_id)
      setValorKwh(initialProposta.valor_kwh || 0.92)
      setDistanciaKm(initialProposta.distancia_km ?? 15)
      setValorKm(initialProposta.valor_km ?? 2.5)
      if (
        initialProposta.valor_por_placa !== undefined &&
        initialProposta.valor_por_placa !== null
      ) {
        setValorPorPlaca(Number(initialProposta.valor_por_placa))
      }
      if (initialProposta.valor_plano_essencial) {
        setValorManualEssencial(String(initialProposta.valor_plano_essencial))
      }
      if (initialProposta.valor_plano_inspecao) {
        setValorManualInspecao(String(initialProposta.valor_plano_inspecao))
      }
      if (initialProposta.valor_plano_completo) {
        setValorManualCompleto(String(initialProposta.valor_plano_completo))
      }
      if (initialProposta.plano_escolhido) {
        setPlanoEscolhido(normalizarNomePlanoOM(initialProposta.plano_escolhido))
      }
      if (initialProposta.conteudo_proposta) {
        setConteudoOM(normalizarConteudoPropostaOM(initialProposta.conteudo_proposta))
      }
      setObservacoes(initialProposta.observacoes || '')
    }
  }, [initialProposta])

  const clienteAtual = useMemo(() => {
    return clientes.find((c) => c.id === selectedId) || null
  }, [clientes, selectedId])

  const jaAprovada = ['aprovada', 'aprovado'].includes((statusAtual || '').toLowerCase())
  const clienteAprovavel = Boolean(clienteAtual && propostaSalvaId)

  const handleAprovarProposta = async () => {
    if (!clienteAtual) return
    setAprovando(true)
    try {
      // Garante que a proposta exista/esteja salva antes de aprovar
      let proposta = propostaSalvaId ? null : null
      let propostaFinal: PropostaOM | null = proposta as any
      if (!propostaSalvaId) {
        propostaFinal = await handleSalvarProposta(false)
        if (!propostaFinal) {
          setAprovando(false)
          return
        }
      }
      const idAlvo = propostaSalvaId || propostaFinal?.id
      if (!idAlvo) {
        setAprovando(false)
        return
      }
      await updatePropostaOM(idAlvo, { status: 'Aprovada' })
      setStatusAtual('Aprovada')
      setAprovacaoDialogOpen(false)
      toast.success('Proposta O&M aprovada! Já é possível gerar o contrato e a procuração.')
      try {
        await addTimelineOM({
          cliente_id: clienteAtual.id,
          tipo: 'interacao',
          titulo: 'Proposta O&M aprovada',
          descricao: 'Proposta O&M marcada como Aprovada no CRM.',
          data: new Date().toISOString(),
          autor: user?.name || 'Equipe Comercial Delfos Solar',
          status_tag: 'Aprovada',
          referencia_id: idAlvo,
        })
      } catch (errTime) {
        console.error('Erro ao adicionar timeline de aprovação:', errTime)
      }
    } catch (err) {
      console.error('Erro ao aprovar proposta O&M:', err)
      toast.error('Não foi possível aprovar a proposta O&M. Tente novamente.')
    } finally {
      setAprovando(false)
    }
  }

  const sistemaAtual = useMemo(() => {
    return sistemas.find((s) => s.cliente_id === selectedId) || null
  }, [sistemas, selectedId])

  // Dados técnicos automáticos
  const potenciaKwp = useMemo(() => {
    return sistemaAtual?.potencia_total_kwp ?? clienteAtual?.potencia_kwp ?? 0
  }, [sistemaAtual, clienteAtual])

  const geracaoMensalKwh = useMemo(() => {
    if (sistemaAtual?.geracao_media_mensal_kwh && sistemaAtual.geracao_media_mensal_kwh > 0) {
      return sistemaAtual.geracao_media_mensal_kwh
    }
    if (potenciaKwp > 0) {
      return Math.round(potenciaKwp * 130)
    }
    return 1000
  }, [sistemaAtual, potenciaKwp])

  const marcaInversores = useMemo(() => {
    if (sistemaAtual?.fabricante_inversores) {
      return `${sistemaAtual.fabricante_inversores} ${sistemaAtual.modelo_inversores || ''}`.trim()
    }
    if (clienteAtual?.inversor_marca) {
      return `${clienteAtual.inversor_marca} ${clienteAtual.inversor_modelo || ''}`.trim()
    }
    return 'Inversores homologados'
  }, [sistemaAtual, clienteAtual])

  const tipoTelhadoOuSolo = useMemo(() => {
    const raw = sistemaAtual?.tipo_telhado || clienteAtual?.telhado_tipo || 'ceramico'
    return `Telhado ${getTelhadoLabel(raw)}`
  }, [sistemaAtual, clienteAtual])

  const numeroModulos = useMemo(() => {
    return (
      sistemaAtual?.quantidade_modulos ??
      sistemaAtual?.quantidade_placas ??
      clienteAtual?.placas_qtd ??
      (potenciaKwp > 0 ? Math.round((potenciaKwp * 1000) / 450) : 0)
    )
  }, [sistemaAtual, clienteAtual, potenciaKwp])

  // Mapa de valores negociados digitados pelo consultor
  const valoresNegociados = useMemo(() => {
    const parseValor = (v: string) => {
      const trimmed = v.trim().replace(',', '.')
      const n = Number(trimmed)
      return !isNaN(n) && n > 0 ? n : null
    }
    return {
      Essencial: parseValor(valorManualEssencial),
      Inspeção: parseValor(valorManualInspecao),
      Completo: parseValor(valorManualCompleto),
    }
  }, [valorManualEssencial, valorManualInspecao, valorManualCompleto])

  // Cálculos em tempo real
  const calculos = useMemo(() => {
    return calcularPropostaOM({
      geracaoMensalKwh,
      valorKwh,
      distanciaKm,
      valorKm,
      numeroModulos,
      valorPorPlaca,
      valoresNegociados,
    })
  }, [
    geracaoMensalKwh,
    valorKwh,
    distanciaKm,
    valorKm,
    numeroModulos,
    valorPorPlaca,
    valoresNegociados,
  ])

  // Montar objeto de proposta para PDF
  const propostaPDFData = useMemo<PropostaPDFInput | null>(() => {
    if (!clienteAtual) return null

    const cpfOuCnpj = clienteAtual.cnpj || clienteAtual.cpf || ''
    const municipio = clienteAtual.cidade || 'Erechim/RS'
    const endereco = [clienteAtual.endereco, clienteAtual.numero, clienteAtual.bairro]
      .filter(Boolean)
      .join(', ')

    return {
      cliente: {
        nome: clienteAtual.nome_fantasia
          ? `${clienteAtual.nome} (${clienteAtual.nome_fantasia})`
          : clienteAtual.nome,
        cpfOuCnpj,
        endereco,
        municipio,
        email: clienteAtual.email || '',
        telefone: clienteAtual.telefone || '',
      },
      tecnico: {
        potenciaKwp,
        geracaoMediaKwh: geracaoMensalKwh,
        marcaInversores,
        tipoInstalacao: tipoTelhadoOuSolo,
        numeroModulos,
        municipio,
      },
      parametros: {
        valorKwh,
        distanciaKm,
        valorKm,
        valorPorPlaca,
        planoEscolhido,
        valoresNegociados,
      },
      calculos,
      dataEmissao: new Date().toISOString(),
      autor: user?.name || 'Equipe Comercial Delfos Solar',
      referenciaProposta: initialProposta?.id,
      conteudo: conteudoOM,
    }
  }, [
    clienteAtual,
    potenciaKwp,
    geracaoMensalKwh,
    marcaInversores,
    tipoTelhadoOuSolo,
    numeroModulos,
    valorKwh,
    distanciaKm,
    valorKm,
    valorPorPlaca,
    planoEscolhido,
    valoresNegociados,
    calculos,
    conteudoOM,
    initialProposta,
    user,
  ])

  if (!isOpen) return null

  // Salvar registro de proposta O&M no banco de dados
  const handleSalvarProposta = async (fecharDepois = true): Promise<PropostaOM | null> => {
    const planoSelecionadoAtual = normalizarNomePlanoOM(planoEscolhido)
    if (!clienteAtual) {
      alert('Selecione um cliente para vincular a proposta.')
      return null
    }
    setIsSubmitting(true)

    try {
      // 1. Gravar registro em propostas_om com os valores calculados / ajustados salvos
      const valorEssencialFinal = calculos.planos.Essencial.mensal
      const valorInspecaoFinal = calculos.planos.Inspeção.mensal
      const valorCompletoFinal = calculos.planos.Completo.mensal
      const valorPlanoPersistido = calculos.planos[planoSelecionadoAtual]

      const dadosProposta = {
        cliente_id: clienteAtual.id,
        potencia_kwp: potenciaKwp,
        geracao_mensal_kwh: geracaoMensalKwh,
        marca_inversores: marcaInversores,
        tipo_instalacao: tipoTelhadoOuSolo,
        numero_modulos: numeroModulos,
        valor_kwh: valorKwh,
        distancia_km: distanciaKm,
        valor_km: valorKm,
        valor_por_placa: valorPorPlaca,
        valor_ativo_protegido: calculos.valorAtivoProtegido,
        perda_15_ano: calculos.perda15Ano,
        perda_20_ano: calculos.perda20Ano,
        prejuizo_20_dias: calculos.prejuizo20Dias,
        prejuizo_30_dias: calculos.prejuizo30Dias,
        // Salvar valores ajustados/finais de cada plano para alimentar futuros contratos O&M
        valor_plano_essencial: valorEssencialFinal,
        valor_plano_inspecao: valorInspecaoFinal,
        valor_plano_completo: valorCompletoFinal,
        valor_mensal_plano: valorPlanoPersistido.mensal,
        valor_anual_plano: valorPlanoPersistido.anual,
        plano_escolhido: planoSelecionadoAtual,
        valores_negociados_json: {
          Essencial: valoresNegociados.Essencial,
          Inspeção: valoresNegociados.Inspeção,
          Completo: valoresNegociados.Completo,
        },
        conteudo_proposta: conteudoOM,
        data_proposta: new Date().toISOString(),
        autor: user?.name || 'Equipe Comercial Delfos Solar',
        status: ['aprovado', 'aprovada'].includes((initialProposta?.status || '').toLowerCase())
          ? 'Aprovada'
          : 'Proposta Enviada',
        observacoes,
      }

      let nova: any
      const idExistente = initialProposta?.id || propostaSalvaId
      if (idExistente) {
        nova = await updatePropostaOM(idExistente, dadosProposta)
      } else {
        nova = await addPropostaOM(dadosProposta)
      }
      setPropostaSalvaId(nova.id)

      // 3. Gravar na timeline O&M
      try {
        await addTimelineOM({
          cliente_id: clienteAtual.id,
          tipo: 'interacao',
          titulo: initialProposta ? 'Proposta O&M atualizada' : 'Proposta O&M registrada',
          descricao: `Proposta O&M salva com valores dos três planos. Status: ${dadosProposta.status}.`,
          data: new Date().toISOString(),
          autor: user?.name || 'Equipe Comercial Delfos Solar',
          status_tag: dadosProposta.status,
          referencia_id: nova.id,
        })
      } catch (errTime) {
        console.error('Erro ao adicionar timeline O&M:', errTime)
      }

      // 4. Atualizar status do cliente para "Orçamento" / Proposta Enviada se estiver em estágios anteriores
      try {
        if (clienteAtual.status === 'Novo Lead' || clienteAtual.status === 'Levantamento') {
          await updateClienteStatus(clienteAtual.id, 'Orçamento')
        }
      } catch (errStatus) {
        console.error('Erro ao atualizar status do cliente:', errStatus)
      }

      if (fecharDepois) onClose()
      return nova as PropostaOM
    } catch (err) {
      console.error('Erro ao salvar proposta:', err)
      alert('Falha ao gravar a proposta no banco de dados. Tente novamente.')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  const montarPDFSalvo = (proposta: PropostaOM): PropostaPDFInput | null => {
    if (!propostaPDFData) return null
    return {
      ...propostaPDFData,
      referenciaProposta: proposta.id,
      dataEmissao: proposta.data_proposta || new Date().toISOString(),
      parametros: {
        ...propostaPDFData.parametros,
        planoEscolhido: normalizarNomePlanoOM(proposta.plano_escolhido || planoEscolhido),
      },
      conteudo: proposta.conteudo_proposta || conteudoOM,
    }
  }

  const handleEnviarLinkWhatsApp = async () => {
    if (!clienteAtual) return
    const telefone = clienteAtual.whatsapp || clienteAtual.telefone || ''
    if (telefone.replace(/\\D/g, '').length < 10) {
      toast.error('Cadastre um WhatsApp válido para este cliente antes de enviar a proposta.')
      return
    }
    setIsSendingAction('link')
    try {
      const saved = await handleSalvarProposta(false)
      if (!saved) return
      const { token } = await criarLinkPropostaOM(saved.id)
      const link = `${window.location.origin}/proposta-om/${token}`
      const primeiroNome = (clienteAtual.nome_fantasia || clienteAtual.nome || 'Cliente').split(
        ' ',
      )[0]
      setWhatsAppConfirmation({
        type: 'link',
        phone: telefone,
        message: aplicarPrefixoMensagemManual(
          `Olá ${primeiroNome}! Segue sua proposta de Gestão e Manutenção O&M da Delfos Solar. Acesse o link para conferir os detalhes e escolher o plano: ${link}`,
          user?.name || 'Atendente',
        ),
        proposalId: saved.id,
        link,
      })
    } catch (err: any) {
      console.error('Falha ao preparar link da proposta O&M:', err)
      toast.error(err?.message || 'Não foi possível preparar o link para envio.')
    } finally {
      setIsSendingAction(null)
    }
  }

  const handleEnviarPdfWhatsApp = async () => {
    if (!clienteAtual) return
    const telefone = clienteAtual.whatsapp || clienteAtual.telefone || ''
    if (telefone.replace(/\D/g, '').length < 10) {
      toast.error('Cadastre um WhatsApp válido para este cliente antes de enviar o PDF.')
      return
    }
    setIsSendingAction('pdf')
    try {
      const saved = await handleSalvarProposta(false)
      if (!saved) return
      // PDF gerado pelo gerador HTML oficial (mesma fonte do botão Imprimir e
      // do link público), garantindo o layout oficial no anexo do WhatsApp.
      const dadosPdf = montarPDFSalvo(saved)
      if (!dadosPdf) throw new Error('Não foi possível montar os dados do PDF.')
      const { base64, fileName } = await import('@/components/BotaoBaixarPropostaOMPDF').then(
        ({ gerarPropostaOMPdfOficialBlobBase64 }) => gerarPropostaOMPdfOficialBlobBase64(dadosPdf),
      )
      const primeiroNome = (clienteAtual.nome_fantasia || clienteAtual.nome || 'Cliente').split(
        ' ',
      )[0]
      setWhatsAppConfirmation({
        type: 'pdf',
        phone: telefone,
        message: aplicarPrefixoMensagemManual(
          `Olá ${primeiroNome}! Segue em anexo a proposta O&M Delfos Solar para sua conferência e escolha do plano.`,
          user?.name || 'Atendente',
        ),
        proposalId: saved.id,
        base64,
        fileName,
      })
    } catch (err: any) {
      console.error('Falha ao preparar PDF da proposta O&M:', err)
      toast.error(err?.message || 'Não foi possível preparar o PDF para envio.')
    } finally {
      setIsSendingAction(null)
    }
  }

  const handleEnviarEmailClick = async () => {
    if (!clienteAtual) return
    const emailInicial = clienteAtual.email || clienteAtual.titular_email || ''
    setIsSendingAction('pdf')
    try {
      const saved = await handleSalvarProposta(false)
      if (!saved) return
      const dadosPdf = montarPDFSalvo(saved)
      if (!dadosPdf) throw new Error('Não foi possível montar os dados do PDF.')
      const { base64, fileName } = await import('@/components/BotaoBaixarPropostaOMPDF').then(
        ({ gerarPropostaOMPdfOficialBlobBase64 }) => gerarPropostaOMPdfOficialBlobBase64(dadosPdf),
      )
      const primeiroNome = (clienteAtual.nome_fantasia || clienteAtual.nome || 'Cliente').split(
        ' ',
      )[0]
      const planoNome = normalizarNomePlanoOM(saved.plano_escolhido || planoEscolhido)
      setEmailConfirmation({
        email: emailInicial,
        assunto: `Proposta de Gestão e Manutenção O&M — Plano ${planoNome} — Delfos Solar`,
        mensagem: `Olá ${primeiroNome},\n\nEsperamos que esteja bem!\n\nEncaminhamos em anexo a este e-mail a Proposta Comercial de Gestão e Manutenção (O&M) da Usina Fotovoltaica elaborada pela Delfos Solar para sua conferência.\n\nFicamos à total disposição para esclarecer qualquer dúvida e apoiar na escolha do plano ideal.\n\nAtenciosamente,\n${user?.name || 'Equipe Delfos Solar'}`,
        proposalId: saved.id,
        base64,
        fileName:
          fileName ||
          `Proposta_OM_Delfos_${(clienteAtual.nome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      })
    } catch (err: any) {
      console.error('Falha ao preparar PDF para envio por e-mail:', err)
      toast.error(err?.message || 'Não foi possível preparar a proposta para envio por e-mail.')
    } finally {
      setIsSendingAction(null)
    }
  }

  const handleConfirmarEnvioEmail = async () => {
    if (!clienteAtual || !emailConfirmation) return
    const emailLimpo = emailConfirmation.email.trim()
    if (!emailLimpo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      toast.error('Informe um e-mail válido para envio da proposta.')
      return
    }
    const assuntoLimpo = emailConfirmation.assunto.trim()
    if (!assuntoLimpo) {
      toast.error('Informe o assunto do e-mail.')
      return
    }
    const mensagemLimpa = emailConfirmation.mensagem.trim()
    if (!mensagemLimpa) {
      toast.error('Informe o texto da mensagem do e-mail.')
      return
    }

    setIsSendingAction('pdf')
    try {
      const cleanBase64 = emailConfirmation.base64.includes(',')
        ? emailConfirmation.base64.split(',')[1]
        : emailConfirmation.base64
      const nomeArquivo = emailConfirmation.fileName

      const linhasTexto = mensagemLimpa.split('\n')
      const corpoParagrafos = linhasTexto
        .map((linha) =>
          linha.trim()
            ? `<p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155;">${linha}</p>`
            : '<div style="height: 10px;"></div>',
        )
        .join('')

      const corpoHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8" /></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1E293B; background-color: #F8FAFC; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #0F172A; padding: 24px; border-bottom: 3px solid #16A34A; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 20px; margin: 0; font-weight: 800; letter-spacing: 0.05em;">DELFOS SOLAR</h1>
              <p style="color: #22C55E; font-size: 11px; margin: 4px 0 0 0; font-weight: 700; text-transform: uppercase;">Operação, Manutenção & Eficiência Solar</p>
            </div>
            <div style="padding: 24px;">
              ${corpoParagrafos}
              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 14px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #166534; font-weight: bold;">
                  📎 A Proposta Comercial O&M completa em formato PDF está anexada a este e-mail.
                </p>
                <p style="margin: 6px 0 0 0; font-size: 11px; color: #15803D;">
                  Arquivo: <strong>${nomeArquivo}</strong>
                </p>
              </div>
              <p style="font-size: 12px; color: #64748B; margin-top: 24px; padding-top: 16px; border-top: 1px solid #F1F5F9;">
                Dúvidas ou esclarecimentos adicionais? Entre em contato pelo WhatsApp (54) 99129-2121 ou responda a este e-mail.
              </p>
            </div>
            <div style="background-color: #F8FAFC; padding: 14px 24px; font-size: 11px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0;">
              Delfos Engenharia Ltda • Rua Espírito Santo, 275 – Erechim/RS • www.delfos.eng.br
            </div>
          </div>
        </body>
        </html>
      `

      const res = await enviarEmail({
        destinatario: emailLimpo,
        assunto: assuntoLimpo,
        corpoHtml,
        from: DEFAULT_EMAIL_FROM,
        anexo: {
          filename: nomeArquivo,
          content: cleanBase64,
        },
      })

      if (res.ok || res.sucesso) {
        toast.success(`Proposta O&M em PDF enviada com sucesso por e-mail para ${emailLimpo}!`)
        try {
          await createAtividade({
            cliente_id: clienteAtual.id,
            tipo: 'gerar_proposta',
            titulo: 'Proposta O&M Enviada via E-mail',
            descricao: `Proposta O&M em PDF (${nomeArquivo}) enviada para ${clienteAtual.nome} no e-mail ${emailLimpo} via Resend (ID: ${res.id || 'ok'}).`,
            data: new Date().toISOString(),
            status: 'concluida',
            autor: user?.name || 'CRM Delfos Solar',
          })
        } catch (atvErr) {
          console.warn('Falha ao registrar atividade de envio por e-mail no histórico:', atvErr)
        }
        setEmailConfirmation(null)
      } else {
        toast.error(res.error || 'Falha ao enviar e-mail com a proposta.')
      }
    } catch (err: any) {
      console.error('Erro ao enviar proposta O&M por e-mail:', err)
      toast.error(err?.message || 'Falha na conexão ao enviar proposta via e-mail.')
    } finally {
      setIsSendingAction(null)
    }
  }
  const handleConfirmarEnvioWhatsApp = async () => {
    if (!clienteAtual || !whatsAppConfirmation) return
    const telefone = whatsAppConfirmation.phone.trim()
    const digitos = telefone.replace(/\\D/g, '')
    if (digitos.length < 10 || digitos.length > 13) {
      toast.error('Informe um número de WhatsApp válido com DDD.')
      return
    }
    const mensagem = whatsAppConfirmation.message.trim()
    if (!mensagem) {
      toast.error('Informe o texto que acompanhará o envio.')
      return
    }

    setIsSendingAction(whatsAppConfirmation.type)
    try {
      const result =
        whatsAppConfirmation.type === 'link'
          ? await sendWhatsAppMensagem({
              cliente_id: clienteAtual.id,
              telefone_destino: telefone,
              conteudo_final: mensagem,
              tipo_disparo: 'manual',
              referencia_id: whatsAppConfirmation.proposalId,
            })
          : await sendWhatsAppDocumento({
              cliente_id: clienteAtual.id,
              telefone_destino: telefone,
              tipo: 'proposta_om',
              referencia_id: whatsAppConfirmation.proposalId,
              legenda: mensagem,
              nome_arquivo: whatsAppConfirmation.fileName,
              base64: whatsAppConfirmation.base64,
            })
      if (!result.sent) throw new Error(result.message || 'O WhatsApp não confirmou o envio.')
      toast.success(
        whatsAppConfirmation.type === 'link'
          ? 'Link da proposta enviado pelo WhatsApp.'
          : 'Proposta PDF enviada pelo WhatsApp.',
      )
      setWhatsAppConfirmation(null)
    } catch (err: any) {
      console.error('Erro ao enviar proposta O&M pelo WhatsApp:', err)
      toast.error(err?.message || 'Não foi possível enviar pelo WhatsApp.')
    } finally {
      setIsSendingAction(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  {initialProposta
                    ? 'Visualizar / Regenerar Proposta O&M'
                    : 'Gerador de Propostas O&M'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Delfos Solar
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Geração automática do documento oficial com cenários de proteção e comparativo de
                planos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Etapas da proposta: dados técnicos/comerciais primeiro e documento em seguida */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('parametros')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'parametros'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Dados Técnicos e Comerciais</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                disabled={!propostaPDFData}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                  activeTab === 'preview'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Documento</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors ml-1"
              title="Fechar"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        {activeTab === 'preview' && propostaPDFData ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100">
            <PreviewPropostaOMDocumento
              dados={propostaPDFData}
              conteudo={conteudoOM}
              planoSelecionado={planoEscolhido}
              onSelecionarPlano={(plano) => setPlanoEscolhido(plano)}
              onEnviarLink={handleEnviarLinkWhatsApp}
              onEnviarPdf={handleEnviarPdfWhatsApp}
              onEnviarEmail={handleEnviarEmailClick}
              somenteLeitura={jaAprovada}
              statusProposta={statusAtual}
              isSubmitting={isSubmitting || Boolean(isSendingAction) || aprovando}
              aceiteRegistrado={jaAprovada}
              onAprovarProposta={
                clienteAprovavel && !jaAprovada ? () => setAprovacaoDialogOpen(true) : undefined
              }
              onGerarContrato={
                jaAprovada && clienteAtual
                  ? () => {
                      const propostaAtual: PropostaOM = {
                        ...(initialProposta || ({} as PropostaOM)),
                        id: propostaSalvaId,
                        cliente_id: clienteAtual.id,
                        status: 'Aprovada',
                        plano_escolhido: planoEscolhido,
                      }
                      onAbrirContrato?.(propostaAtual)
                    }
                  : undefined
              }
              onElaborarProcuracao={
                jaAprovada && clienteAtual
                  ? () => {
                      const propostaAtual: PropostaOM = {
                        ...(initialProposta || ({} as PropostaOM)),
                        id: propostaSalvaId,
                        cliente_id: clienteAtual.id,
                        status: 'Aprovada',
                        plano_escolhido: planoEscolhido,
                      }
                      onAbrirProcuracao?.(propostaAtual)
                    }
                  : undefined
              }
            />{' '}
          </div>
        ) : activeTab === 'edicao' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
            <PainelEdicaoConteudoOM
              conteudo={conteudoOM}
              onChange={(novo) => setConteudoOM(novo)}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F9FAFB]/70">
            {/* 1. SELEÇÃO DO CLIENTE & DADOS CADASTRAIS */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-extrabold">
                    1
                  </span>
                  Cliente Selecionado
                </label>
                {clienteAtual && (
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Status: {clienteAtual.status || 'Ativo'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">
                    Selecione o Cliente do CRM
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    disabled={!!initialClienteId || !!initialProposta}
                    className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {clientes.length === 0 ? (
                      <option value="">Nenhum cliente cadastrado</option>
                    ) : (
                      clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome || 'Cliente'} {c.cidade ? `— ${c.cidade}` : ''} (
                          {c.potencia_kwp || 0} kWp)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {clienteAtual ? (
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200/80 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Documento:</span>
                      <span className="font-semibold text-gray-800">
                        {clienteAtual.cnpj || clienteAtual.cpf || 'Não informado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Localização:</span>
                      <span className="font-semibold text-gray-800">
                        {clienteAtual.cidade || 'Erechim/RS'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contato:</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[200px]">
                        {clienteAtual.telefone || clienteAtual.email || 'Não informado'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center">
                    <span>Nenhum cliente selecionado ou disponível.</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. DADOS TÉCNICOS AUTOMÁTICOS DO SISTEMA SOLAR */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-extrabold">
                    2
                  </span>
                  Dados Técnicos do Sistema Solar
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  Buscados automaticamente
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                  <div className="text-[10px] text-emerald-800 font-semibold uppercase">
                    Potência Total
                  </div>
                  <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                    {potenciaKwp > 0 ? `${potenciaKwp} kWp` : '5.0 kWp'}
                  </div>
                  <div className="text-[10px] text-emerald-600">Instalada</div>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-100">
                  <div className="text-[10px] text-amber-800 font-semibold uppercase">
                    Geração Média
                  </div>
                  <div className="text-base font-extrabold text-amber-700 mt-0.5">
                    {geracaoMensalKwh.toLocaleString('pt-BR')} kWh
                  </div>
                  <div className="text-[10px] text-amber-600">Por mês estimada</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/80">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Módulos</div>
                  <div className="text-sm font-bold text-gray-800 mt-0.5">
                    {numeroModulos ? `${numeroModulos} placas` : 'Conforme projeto'}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{tipoTelhadoOuSolo}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/80">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">
                    Inversores
                  </div>
                  <div
                    className="text-xs font-bold text-gray-800 mt-0.5 truncate"
                    title={marcaInversores}
                  >
                    {marcaInversores}
                  </div>
                  <div className="text-[10px] text-gray-500">Monitorado</div>
                </div>
              </div>
            </div>

            {/* 3. PARÂMETROS DA PROPOSTA (INPUTS DO USUÁRIO) */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-extrabold">
                  3
                </span>
                Parâmetros Informados pelo Consultor
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Valor do kWh (R$)</span>
                    <span className="text-[10px] text-gray-400">RGE / Concessionária</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={valorKwh}
                      onChange={(e) => setValorKwh(Number(e.target.value) || 0)}
                      className="w-full text-xs font-bold pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,92"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Distância Deslocamento</span>
                    <span className="text-[10px] text-gray-400">Delfos → Usina</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={distanciaKm}
                      onChange={(e) => setDistanciaKm(Number(e.target.value) || 0)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="15"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-gray-400">
                      km
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-1 leading-tight">
                    O valor será multiplicado por 2 vezes o valor do km rodado (ida e volta).
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Valor por km rodado</span>
                    <span className="text-[10px] text-gray-400">Custo técnico</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={valorKm}
                      onChange={(e) => setValorKm(Number(e.target.value) || 0)}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="2,50"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-gray-400">
                      /km
                    </span>
                  </div>
                </div>
              </div>

              {/* Campo ajustável de R$/placa quando ≥ 35 placas ou regra de placas < 35 */}
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                {numeroModulos >= 35 ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]">
                        ≥ 35 Placas ({numeroModulos} placas)
                      </span>
                      <span>Ajuste por placa:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-gray-600">R$/placa:</span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1.5 text-xs font-bold text-gray-400">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={valorPorPlaca}
                          onChange={(e) => setValorPorPlaca(Number(e.target.value) || 0)}
                          className="w-full text-xs font-bold pl-8 pr-2 py-1 rounded-md border border-emerald-300 bg-emerald-50/40 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="9,00"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">
                        Total placas: {formatCurrency(numeroModulos * valorPorPlaca)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-gray-600">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-bold">
                      &lt; 35 Placas ({numeroModulos || 0} placas)
                    </span>
                    <span>
                      Ajuste fixo de <strong>R$ 350,00</strong> aplicado automaticamente pela
                      fórmula.
                    </span>
                  </div>
                )}

                <div className="text-[10px] text-gray-500">
                  Deslocamento ida e volta:{' '}
                  <strong>{formatCurrency(distanciaKm * 2 * valorKm)}</strong>
                </div>
              </div>
            </div>

            {/* 4. CÁLCULOS EM TEMPO REAL — CENÁRIOS DE EXPOSIÇÃO */}
            <div className="bg-gradient-to-br from-amber-50/70 via-white to-emerald-50/70 p-4 rounded-xl border border-amber-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-extrabold">
                    4
                  </span>
                  Cálculos em Tempo Real — Exposição Financeira
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Ativo Protegido: {formatCurrency(calculos.valorAtivoProtegido)} / mês
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-emerald-700 block uppercase">
                    Ativo Protegido
                  </span>
                  <span className="text-base font-extrabold text-emerald-700 block mt-0.5">
                    {formatCurrency(calculos.valorAtivoProtegido)}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {geracaoMensalKwh} kWh × {formatCurrency(valorKwh)}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-amber-800 block uppercase">
                    Perda 15% / ano
                  </span>
                  <span className="text-base font-extrabold text-amber-600 block mt-0.5">
                    {formatCurrency(calculos.perda15Ano)}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Sujidade acumulada</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-orange-800 block uppercase">
                    Perda 20% / ano
                  </span>
                  <span className="text-base font-extrabold text-orange-600 block mt-0.5">
                    {formatCurrency(calculos.perda20Ano)}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Sem preventiva/reaperto
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-rose-800 block uppercase">
                    30 dias sem gerar
                  </span>
                  <span className="text-base font-extrabold text-rose-600 block mt-0.5">
                    {formatCurrency(calculos.prejuizo30Dias)}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    20 dias: {formatCurrency(calculos.prejuizo20Dias)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. PLANOS INCLUSOS NA PROPOSTA & OBSERVAÇÕES */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-extrabold">
                    5
                  </span>
                  Opções Apresentadas na Proposta
                </span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Os 3 planos são incluídos no PDF para decisão do cliente
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                {/* Plano Essencial */}
                <div className="p-4 rounded-2xl border border-gray-200/90 bg-white shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900 tracking-tight">
                        Plano Essencial
                      </span>
                      {calculos.planos.Essencial.isNegociado && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                          Negociado
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-extrabold text-[#0D7A3E] mt-1.5 tracking-tight">
                      {formatCurrency(calculos.planos.Essencial.mensal)}
                      <span className="text-base font-bold">/mês</span>
                    </div>

                    {/* Campo de edição manual do valor para negociação */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                        Ajuste de Negociação (R$/mês)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-gray-400">
                            R$
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={valorManualEssencial}
                            onChange={(e) => setValorManualEssencial(e.target.value)}
                            placeholder={calculos.planos.Essencial.mensalCalculadoFormula.toFixed(
                              2,
                            )}
                            className="w-full text-xs font-bold pl-8 pr-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        {valorManualEssencial && (
                          <button
                            type="button"
                            onClick={() => setValorManualEssencial('')}
                            className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1 border border-gray-200 rounded"
                            title="Restaurar valor da fórmula"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        Fórmula: {formatCurrency(calculos.planos.Essencial.mensalCalculadoFormula)}
                      </span>
                    </div>

                    <ul className="text-xs text-gray-600 mt-3.5 space-y-2">
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>Monitoramento comercial</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>Relatório mensal analítico</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>Suporte técnico e RGE</span>
                      </li>
                    </ul>
                  </div>
                </div>
                {/* Plano Inspeção */}
                <div className="p-4 rounded-2xl border border-gray-200/90 bg-white shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900 tracking-tight">
                        Plano Inspeção
                      </span>
                      {calculos.planos.Inspeção.isNegociado && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                          Negociado
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-extrabold text-[#0D7A3E] mt-1.5 tracking-tight">
                      {formatCurrency(calculos.planos.Inspeção.mensal)}
                      <span className="text-base font-bold">/mês</span>
                    </div>

                    {/* Campo de edição manual do valor para negociação */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                        Ajuste de Negociação (R$/mês)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-gray-400">
                            R$
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={valorManualInspecao}
                            onChange={(e) => setValorManualInspecao(e.target.value)}
                            placeholder={calculos.planos.Inspeção.mensalCalculadoFormula.toFixed(2)}
                            className="w-full text-xs font-bold pl-8 pr-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        {valorManualInspecao && (
                          <button
                            type="button"
                            onClick={() => setValorManualInspecao('')}
                            className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1 border border-gray-200 rounded"
                            title="Restaurar valor da fórmula"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        Fórmula: {formatCurrency(calculos.planos.Inspeção.mensalCalculadoFormula)}
                      </span>
                    </div>

                    <ul className="text-xs text-gray-600 mt-3.5 space-y-2">
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>Tudo do plano Essencial</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>1x Inspeção preventiva anual</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>1x Limpeza de placas anual</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>Reaperto geral de conexões</span>
                      </li>
                    </ul>
                  </div>
                </div>
                {/* Plano Completo (Recomendado) */}
                <div className="p-4 rounded-2xl border-2 border-[#16A34A] bg-white shadow-xs relative flex flex-col justify-between">
                  {/* Badge RECOMENDADO DELFOS no topo direito */}
                  <span className="absolute -top-3.5 right-6 bg-[#047857] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    RECOMENDADO
                  </span>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900 tracking-tight">
                        Plano Completo
                      </span>
                      {calculos.planos.Completo.isNegociado && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                          Negociado
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-extrabold text-[#0D7A3E] mt-1.5 tracking-tight">
                      {formatCurrency(calculos.planos.Completo.mensal)}
                      <span className="text-base font-bold">/mês</span>
                    </div>

                    {/* Campo de edição manual do valor para negociação */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                        Ajuste de Negociação (R$/mês)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1.5 text-xs font-bold text-gray-400">
                            R$
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={valorManualCompleto}
                            onChange={(e) => setValorManualCompleto(e.target.value)}
                            placeholder={calculos.planos.Completo.mensalCalculadoFormula.toFixed(2)}
                            className="w-full text-xs font-bold pl-8 pr-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        {valorManualCompleto && (
                          <button
                            type="button"
                            onClick={() => setValorManualCompleto('')}
                            className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1 border border-gray-200 rounded"
                            title="Restaurar valor da fórmula"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        Fórmula: {formatCurrency(calculos.planos.Completo.mensalCalculadoFormula)}
                      </span>
                    </div>

                    <ul className="text-xs text-gray-600 mt-3.5 space-y-2">
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>Tudo do plano Inspeção</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>2x Limpezas de placas ao ano</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>Verificação semestral de anomalias</span>
                      </li>
                    </ul>
                  </div>
                </div>{' '}
              </div>

              {/* Aviso informativo de escolha posterior pelo cliente */}
              <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 flex items-center gap-2 text-xs text-emerald-950">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  A proposta é emitida com o comparativo completo das 3 opções. O cliente escolhe
                  livremente após a apresentação.
                </span>
              </div>

              {/* Observações da proposta */}
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Observações complementares no PDF (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Proposta com condição especial de primeiro vencimento em 30 dias após vistoria inicial."
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 text-gray-400" />
            <span>A proposta será salva no histórico e timeline do cliente</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>

            {/* Botão Alternar Modo Documento */}
            <button
              type="button"
              disabled={!propostaPDFData || isSubmitting}
              onClick={() => setActiveTab(activeTab === 'preview' ? 'edicao' : 'preview')}
              className="px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
              title={
                activeTab === 'preview'
                  ? 'Editar textos com seletor'
                  : 'Visualizar documento oficial'
              }
            >
              {activeTab === 'preview' ? (
                <>
                  <Sliders className="w-4 h-4" />
                  <span>Editar Textos</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Ver Documento</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting || !clienteAtual}
              onClick={() => handleSalvarProposta()}
              className="px-5 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl shadow-xs transition-all hover:scale-[1.01] flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando Proposta...' : 'Salvar Proposta'}</span>
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(whatsAppConfirmation)}
        onOpenChange={(open) => {
          if (!open && !isSendingAction) setWhatsAppConfirmation(null)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Confirmar envio pelo WhatsApp</DialogTitle>
            <DialogDescription>
              Confira o número e edite a mensagem. Nada será enviado até você confirmar.
            </DialogDescription>
          </DialogHeader>

          {whatsAppConfirmation && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="om-whatsapp-phone" className="text-sm font-medium">
                  Número do WhatsApp
                </label>
                <input
                  id="om-whatsapp-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={whatsAppConfirmation.phone}
                  onChange={(event) =>
                    setWhatsAppConfirmation({ ...whatsAppConfirmation, phone: event.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="(54) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="om-whatsapp-message" className="text-sm font-medium">
                  Texto que acompanhará o envio
                </label>
                <textarea
                  id="om-whatsapp-message"
                  rows={5}
                  value={whatsAppConfirmation.message}
                  onChange={(event) =>
                    setWhatsAppConfirmation({
                      ...whatsAppConfirmation,
                      message: event.target.value,
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 break-all">
                {whatsAppConfirmation.type === 'pdf' ? (
                  <span>Anexo PDF: {whatsAppConfirmation.fileName || 'Proposta O&M'}</span>
                ) : (
                  <span>Link da proposta: {whatsAppConfirmation.link}</span>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setWhatsAppConfirmation(null)}
              disabled={Boolean(isSendingAction)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarEnvioWhatsApp}
              disabled={!whatsAppConfirmation || Boolean(isSendingAction)}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSendingAction ? 'Enviando…' : 'Confirmar envio'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Conferência de E-mail (Resend) da Proposta O&M */}
      <Dialog
        open={Boolean(emailConfirmation)}
        onOpenChange={(open) => {
          if (!open && !isSendingAction) setEmailConfirmation(null)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Confirmar envio da Proposta O&M por E-mail</DialogTitle>
            <DialogDescription>
              Confira o e-mail de destino, assunto e edite a mensagem. O PDF oficial da proposta
              está anexado.
            </DialogDescription>
          </DialogHeader>

          {emailConfirmation && (
            <div className="space-y-4">
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
                <span className="font-semibold text-gray-700">Remetente Oficial:</span>
                <span className="font-mono text-[11px] text-gray-800 font-medium">
                  {DEFAULT_EMAIL_FROM}
                </span>
              </div>

              <div className="space-y-2">
                <label htmlFor="om-email-dest" className="text-sm font-medium">
                  E-mail do Destinatário
                </label>
                <input
                  id="om-email-dest"
                  type="email"
                  value={emailConfirmation.email}
                  onChange={(event) =>
                    setEmailConfirmation({ ...emailConfirmation, email: event.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="cliente@exemplo.com.br"
                />
                {(!emailConfirmation.email.trim() ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfirmation.email.trim())) && (
                  <p className="text-xs text-amber-600">
                    Aviso: informe um e-mail válido antes de confirmar o disparo.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="om-email-assunto" className="text-sm font-medium">
                  Assunto do E-mail
                </label>
                <input
                  id="om-email-assunto"
                  type="text"
                  value={emailConfirmation.assunto}
                  onChange={(event) =>
                    setEmailConfirmation({ ...emailConfirmation, assunto: event.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="om-email-message" className="text-sm font-medium">
                  Mensagem do E-mail
                </label>
                <textarea
                  id="om-email-message"
                  rows={5}
                  value={emailConfirmation.mensagem}
                  onChange={(event) =>
                    setEmailConfirmation({
                      ...emailConfirmation,
                      mensagem: event.target.value,
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 break-all">
                📎 Anexo PDF: <strong>{emailConfirmation.fileName}</strong>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setEmailConfirmation(null)}
              disabled={Boolean(isSendingAction)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarEnvioEmail}
              disabled={
                !emailConfirmation ||
                !emailConfirmation.email.trim() ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfirmation.email.trim()) ||
                Boolean(isSendingAction)
              }
              className="rounded-md bg-sky-700 hover:bg-sky-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSendingAction ? 'Enviando por E-mail…' : 'Confirmar e Enviar E-mail'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação da aprovação */}
      <AlertDialog open={aprovacaoDialogOpen} onOpenChange={setAprovacaoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovação da proposta O&amp;M</AlertDialogTitle>
            <AlertDialogDescription>
              A proposta será marcada como <strong>Aprovada</strong> no CRM. Em seguida você poderá
              gerar o contrato O&amp;M e, se necessário, elaborar a procuração.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aprovando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={aprovando}
              onClick={(e) => {
                e.preventDefault()
                handleAprovarProposta()
              }}
            >
              {aprovando ? 'Aprovando...' : 'Confirmar aprovação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ModalNovaPropostaOM

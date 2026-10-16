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
  ConteudoPropostaOM,
  getConteudoPropostaOMDefaults,
  normalizarConteudoPropostaOM,
} from '@/lib/conteudoPropostaOM'

interface ModalNovaPropostaOMProps {
  isOpen: boolean
  onClose: () => void
  initialClienteId?: string
  initialProposta?: PropostaOM | null
}

export const ModalNovaPropostaOM: React.FC<ModalNovaPropostaOMProps> = ({
  isOpen,
  onClose,
  initialClienteId,
  initialProposta,
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
  const [propostaSalvaId, setPropostaSalvaId] = useState<string>(initialProposta?.id || '')
  // Abre pelos dados da proposta; o documento fica disponível na etapa seguinte.
  const [activeTab, setActiveTab] = useState<'parametros' | 'preview' | 'edicao'>('parametros')
  const [planoEscolhido, setPlanoEscolhido] = useState<any>('Completo')
  const [conteudoOM, setConteudoOM] = useState<ConteudoPropostaOM>(getConteudoPropostaOMDefaults())

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
    if (telefone.replace(/\\D/g, '').length < 10) {
      toast.error('Cadastre um WhatsApp válido para este cliente antes de enviar o PDF.')
      return
    }
    setIsSendingAction('pdf')
    try {
      const saved = await handleSalvarProposta(false)
      if (!saved) return
      const dadosPdf = montarPDFSalvo(saved)
      if (!dadosPdf) throw new Error('Não foi possível montar os dados do PDF.')
      const { base64, fileName } = await import('@/components/BotaoBaixarPropostaOMPDF').then(
        ({ gerarPropostaOMPdfBlobBase64 }) =>
          gerarPropostaOMPdfBlobBase64(dadosPdf, saved.observacoes || ''),
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
              somenteLeitura={['aprovado', 'aprovada'].includes(
                (initialProposta?.status || '').toLowerCase(),
              )}
              statusProposta={initialProposta?.status || 'Proposta Enviada'}
              isSubmitting={isSubmitting || Boolean(isSendingAction)}
              aceiteRegistrado={['aprovado', 'aprovada'].includes(
                (initialProposta?.status || '').toLowerCase(),
              )}
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
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 select-none">•</span>
                        <span>Suporte técnico limitado VIP</span>
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
    </div>
  )
}

export default ModalNovaPropostaOM

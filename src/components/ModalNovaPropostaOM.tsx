import React, { useState, useMemo, useEffect } from 'react'
import {
  X,
  FileCheck,
  FileText,
  Calculator,
  Zap,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
  Download,
  ExternalLink,
  CheckCircle2,
  DollarSign,
  Sun,
  Layers,
  MapPin,
  Sparkles,
  Info,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, getTelhadoLabel } from '@/lib/formatters'
import type { Cliente, Sistema, OMPlanoTipo, PropostaOM } from '@/types/crm'
import {
  calcularPropostaOM,
  abrirPropostaEmNovaAba,
  baixarPropostaHTML,
  type PropostaPDFInput,
} from '@/lib/propostaOMGenerator'

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
  const { clientes, sistemas, addPropostaOM, addAtividade, addTimelineOM, updateClienteStatus } =
    useClientes()
  const { user } = useAuth()

  // Seletor de Cliente
  const [selectedId, setSelectedId] = useState<string>('')

  // Parâmetros informados pelo usuário
  const [valorKwh, setValorKwh] = useState<number>(0.92)
  const [distanciaKm, setDistanciaKm] = useState<number>(15)
  const [valorKm, setValorKm] = useState<number>(2.5)
  const [planoEscolhido, setPlanoEscolhido] = useState<OMPlanoTipo>('Completo')
  const [observacoes, setObservacoes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Cliente atual selecionado
  useEffect(() => {
    if (initialClienteId) {
      setSelectedId(initialClienteId)
    } else if (clientes.length > 0 && !selectedId) {
      setSelectedId(clientes[0].id)
    }
  }, [initialClienteId, clientes])

  // Se veio uma proposta para visualizar/regenerar
  useEffect(() => {
    if (initialProposta) {
      setSelectedId(initialProposta.cliente_id)
      setValorKwh(initialProposta.valor_kwh || 0.92)
      setDistanciaKm(initialProposta.distancia_km ?? 15)
      setValorKm(initialProposta.valor_km ?? 2.5)
      setPlanoEscolhido(initialProposta.plano_escolhido || 'Completo')
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

  // Cálculos em tempo real
  const calculos = useMemo(() => {
    return calcularPropostaOM({
      geracaoMensalKwh,
      valorKwh,
      planoEscolhido,
    })
  }, [geracaoMensalKwh, valorKwh, planoEscolhido])

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
      },
      parametros: {
        valorKwh,
        distanciaKm,
        valorKm,
      },
      calculos,
      dataEmissao: new Date().toISOString(),
      autor: user?.name || 'Equipe Comercial Delfos Solar',
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
    calculos,
    user,
  ])

  if (!isOpen) return null

  const handleGerarEGravarProposta = async (acao: 'abrir' | 'baixar') => {
    if (!clienteAtual || !propostaPDFData) return
    setIsSubmitting(true)

    try {
      // 1. Gravar registro em propostas_om
      const nova = await addPropostaOM({
        cliente_id: clienteAtual.id,
        plano_escolhido: planoEscolhido,
        potencia_kwp: potenciaKwp,
        geracao_mensal_kwh: geracaoMensalKwh,
        marca_inversores: marcaInversores,
        tipo_instalacao: tipoTelhadoOuSolo,
        numero_modulos: numeroModulos,
        valor_kwh: valorKwh,
        distancia_km: distanciaKm,
        valor_km: valorKm,
        valor_ativo_protegido: calculos.valorAtivoProtegido,
        perda_15_ano: calculos.perda15Ano,
        perda_20_ano: calculos.perda20Ano,
        prejuizo_20_dias: calculos.prejuizo20Dias,
        prejuizo_30_dias: calculos.prejuizo30Dias,
        valor_mensal_plano: calculos.valorMensalEscolhido,
        valor_anual_plano: calculos.valorAnualEscolhido,
        data_proposta: new Date().toISOString(),
        autor: user?.name || 'Equipe Comercial Delfos Solar',
        status: 'Proposta Enviada',
        observacoes,
      })

      // 2. Gravar atividade na timeline unificada do cliente com tipo "proposta"
      try {
        await addAtividade({
          cliente_id: clienteAtual.id,
          tipo: 'proposta',
          titulo: `Proposta O&M Gerada: Plano ${planoEscolhido}`,
          descricao: `Proposta técnica e comercial de Gestão e Manutenção gerada para usina de ${potenciaKwp} kWp.\nPlano escolhido: ${planoEscolhido} (${formatCurrency(
            calculos.valorMensalEscolhido,
          )}/mês — ${formatCurrency(calculos.valorAnualEscolhido)}/ano).\nAtivo protegido: ${formatCurrency(
            calculos.valorAtivoProtegido,
          )}/mês. Perda evitada por prevenção: até ${formatCurrency(calculos.perda20Ano)}/ano.`,
          data: new Date().toISOString(),
          status: 'concluida',
          autor: user?.name || 'Equipe Comercial Delfos Solar',
        })
      } catch (errAtv) {
        console.error('Erro ao adicionar atividade de proposta:', errAtv)
      }

      // 3. Gravar na timeline O&M
      try {
        await addTimelineOM({
          cliente_id: clienteAtual.id,
          tipo: 'interacao',
          titulo: `Proposta O&M: Plano ${planoEscolhido} Emitida`,
          descricao: `Documento PDF oficial emitido para o cliente com os cenários de perda e comparativo dos 3 planos. Status: Proposta Enviada.`,
          data: new Date().toISOString(),
          autor: user?.name || 'Equipe Comercial Delfos Solar',
          status_tag: 'Proposta Enviada',
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

      // 5. Executar ação de PDF
      if (acao === 'abrir') {
        abrirPropostaEmNovaAba(propostaPDFData)
      } else {
        baixarPropostaHTML(propostaPDFData)
      }

      onClose()
    } catch (err) {
      console.error('Erro ao gerar proposta:', err)
      alert('Falha ao gravar a proposta no banco de dados. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSomenteVisualizarOuBaixar = (acao: 'abrir' | 'baixar') => {
    if (!propostaPDFData) return
    if (acao === 'abrir') {
      abrirPropostaEmNovaAba(propostaPDFData)
    } else {
      baixarPropostaHTML(propostaPDFData)
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

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
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
                  Status: {clienteAtual.status}
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
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.cidade ? `— ${c.cidade}` : ''} ({c.potencia_kwp || 0} kWp)
                    </option>
                  ))}
                </select>
              </div>

              {clienteAtual && (
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
              )}
            </div>
          </div>

          {/* 2. DADOS TÉCNICOS AUTOMÁTICOS DO SISTEMA */}
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
                <div className="text-[10px] text-gray-500 font-semibold uppercase">Inversores</div>
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
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">R$</span>
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
                  <span className="text-[10px] text-gray-400">Ida e volta</span>
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
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Valor por km rodado</span>
                  <span className="text-[10px] text-gray-400">Custo técnico</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">R$</span>
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

          {/* 5. ESCOLHA DO PLANO PARA A PROPOSTA */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-extrabold">
                  5
                </span>
                Escolha do Plano da Proposta
              </span>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Recomendado: Completo (Proteção Máxima)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Plano Essencial */}
              <button
                type="button"
                onClick={() => setPlanoEscolhido('Essencial')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all relative ${
                  planoEscolhido === 'Essencial'
                    ? 'border-[#16A34A] bg-emerald-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {planoEscolhido === 'Essencial' && (
                  <span className="absolute top-2 right-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                  </span>
                )}
                <div className="text-xs font-bold text-gray-800">Plano Essencial</div>
                <div className="text-lg font-black text-emerald-700 mt-1">R$ 49,90/mês</div>
                <div className="text-[10px] text-gray-500">Faturamento Anual: R$ 598,80/ano</div>
                <ul className="text-[10px] text-gray-600 mt-2 space-y-1">
                  <li>• Monitoramento comercial</li>
                  <li>• Relatório mensal analítico</li>
                  <li>• Suporte técnico e RGE</li>
                </ul>
              </button>

              {/* Plano Prevenção */}
              <button
                type="button"
                onClick={() => setPlanoEscolhido('Prevenção')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all relative ${
                  planoEscolhido === 'Prevenção'
                    ? 'border-[#16A34A] bg-emerald-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {planoEscolhido === 'Prevenção' && (
                  <span className="absolute top-2 right-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                  </span>
                )}
                <div className="text-xs font-bold text-gray-800">Plano Prevenção</div>
                <div className="text-lg font-black text-emerald-700 mt-1">R$ 74,90/mês</div>
                <div className="text-[10px] text-gray-500">Faturamento Anual: R$ 898,80/ano</div>
                <ul className="text-[10px] text-gray-600 mt-2 space-y-1">
                  <li>• Tudo do plano Essencial</li>
                  <li>• 1x Inspeção preventiva anual</li>
                  <li>• 1x Limpeza de placas anual</li>
                  <li>• Reaperto geral de conexões</li>
                </ul>
              </button>

              {/* Plano Completo (Recomendado) */}
              <button
                type="button"
                onClick={() => setPlanoEscolhido('Completo')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all relative ${
                  planoEscolhido === 'Completo'
                    ? 'border-[#16A34A] bg-emerald-50/60 shadow-sm ring-1 ring-emerald-400'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="absolute -top-2 left-3 bg-emerald-600 text-white text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase tracking-wider">
                  Recomendado
                </span>
                {planoEscolhido === 'Completo' && (
                  <span className="absolute top-2 right-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                  </span>
                )}
                <div className="text-xs font-bold text-gray-800 pt-0.5">Plano Completo</div>
                <div className="text-lg font-black text-emerald-700 mt-1">R$ 99,90/mês</div>
                <div className="text-[10px] text-gray-500">Faturamento Anual: R$ 1.198,80/ano</div>
                <ul className="text-[10px] text-gray-600 mt-2 space-y-1">
                  <li>• Tudo do plano Prevenção</li>
                  <li>• 2x Limpezas de placas ao ano</li>
                  <li>• Verificação semestral de anomalias</li>
                  <li>• Suporte técnico ilimitado VIP</li>
                </ul>
              </button>
            </div>

            {/* Destaque do plano selecionado */}
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-950">
                  Plano Selecionado para a Proposta: <strong>{planoEscolhido}</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-emerald-700">
                  {formatCurrency(calculos.valorMensalEscolhido)} / mês
                </span>
                <span className="text-[11px] text-emerald-800 ml-1">
                  ({formatCurrency(calculos.valorAnualEscolhido)} / ano)
                </span>
              </div>
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

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 text-gray-400" />
            <span>A proposta será salva no histórico e timeline do cliente</span>
          </div>

          <div className="flex items-center gap-2">
            {initialProposta && (
              <button
                type="button"
                onClick={() => handleSomenteVisualizarOuBaixar('abrir')}
                className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver PDF Existente
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting || !clienteAtual}
              onClick={() => handleGerarEGravarProposta('baixar')}
              className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Documento
            </button>

            <button
              type="button"
              disabled={isSubmitting || !clienteAtual}
              onClick={() => handleGerarEGravarProposta('abrir')}
              className="px-5 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl shadow-xs transition-all hover:scale-[1.01] flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Gerando Documento...' : 'Gerar Proposta Oficial'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

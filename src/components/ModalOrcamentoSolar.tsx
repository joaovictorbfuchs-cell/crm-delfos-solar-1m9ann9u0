import React, { useState, useMemo, useEffect } from 'react'
import {
  X,
  Sun,
  DollarSign,
  CreditCard,
  FileText,
  Printer,
  Save,
  CheckCircle2,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  Wrench,
  Calculator,
  Compass,
  ArrowRight,
  ShieldCheck,
  Building,
  Home,
  Factory,
  Tractor,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import { formatCurrency } from '@/lib/formatters'
import type { OrcamentoSolar, Cliente } from '@/types/crm'
import {
  calcularOrcamentoSolar,
  somarCustosSolar,
  CUSTOS_SOLAR_PADRAO,
  type TipoClienteSolar,
  type TipoEstruturaSolar,
  type OrientacaoTelhadoSolar,
  type StatusOrcamentoSolar,
  type DadosCustosSolar,
} from '@/lib/energiaSolar'
import {
  abrirPropostaSolarEmNovaAba,
  baixarPropostaSolarHTML,
  type PropostaSolarPDFInput,
} from '@/lib/propostaSolarGenerator'

interface ModalOrcamentoSolarProps {
  isOpen: boolean
  onClose: () => void
  initialClienteId?: string
  initialOrcamento?: OrcamentoSolar | null
}

type TabType = 'tecnico' | 'custos' | 'parcelamentos' | 'proposta'

export const ModalOrcamentoSolar: React.FC<ModalOrcamentoSolarProps> = ({
  isOpen,
  onClose,
  initialClienteId,
  initialOrcamento,
}) => {
  const {
    clientes,
    sistemas,
    addOrcamentoSolar,
    updateOrcamentoSolar,
    addAtividade,
    updateClienteStatus,
  } = useClientes()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabType>('tecnico')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Cliente selecionado
  const [selectedClienteId, setSelectedClienteId] = useState<string>('')

  // Status do orçamento
  const [status, setStatus] = useState<StatusOrcamentoSolar>('Em elaboração')

  // Campos técnicos exatos exigidos
  const [consumoKwhMes, setConsumoKwhMes] = useState<number>(650)
  const [tipoCliente, setTipoCliente] = useState<TipoClienteSolar>('residencial')
  const [tarifaKwh, setTarifaKwh] = useState<number>(0.95)
  const [potenciaKwp, setPotenciaKwp] = useState<number>(5.5)
  const [numeroPlacas, setNumeroPlacas] = useState<number>(10)
  const [potenciaPlacaWp, setPotenciaPlacaWp] = useState<number>(550)
  const [marcaPainel, setMarcaPainel] = useState<string>('Canadian Solar 550W BiHiKu7')
  const [marcaInversor, setMarcaInversor] = useState<string>('Growatt MIN 5000TL-X')
  const [quantidadeInversores, setQuantidadeInversores] = useState<number>(1)
  const [tipoEstrutura, setTipoEstrutura] = useState<TipoEstruturaSolar>('ceramico')
  const [orientacaoTelhado, setOrientacaoTelhado] = useState<OrientacaoTelhadoSolar>('norte')
  const [areaNecessariaM2, setAreaNecessariaM2] = useState<number>(26)
  const [codigoFiname, setCodigoFiname] = useState<string>('')
  const [valorInvestimentoManual, setValorInvestimentoManual] = useState<number>(0)
  const [observacoes, setObservacoes] = useState<string>('')
  const [prazoEntregaDias, setPrazoEntregaDias] = useState<number>(30)

  // Custos do projeto (aba de custos com soma automática)
  const [custos, setCustos] = useState<DadosCustosSolar>({ ...CUSTOS_SOLAR_PADRAO })

  // Inicializa ou sincroniza cliente e orçamento
  useEffect(() => {
    if (initialOrcamento) {
      setSelectedClienteId(initialOrcamento.cliente_id)
      setStatus(initialOrcamento.status || 'Em elaboração')
      setConsumoKwhMes(initialOrcamento.consumo_kwh_mes || 650)
      setTipoCliente(initialOrcamento.tipo_cliente || 'residencial')
      setTarifaKwh(initialOrcamento.tarifa_kwh || 0.95)
      setPotenciaKwp(initialOrcamento.potencia_kwp || 5.5)
      setNumeroPlacas(initialOrcamento.numero_placas || 10)
      setPotenciaPlacaWp(initialOrcamento.potencia_placa_wp || 550)
      setMarcaPainel(initialOrcamento.marca_painel || 'Canadian Solar 550W')
      setMarcaInversor(initialOrcamento.marca_inversor || 'Growatt')
      setQuantidadeInversores(initialOrcamento.quantidade_inversores || 1)
      setTipoEstrutura(initialOrcamento.tipo_estrutura || 'ceramico')
      setOrientacaoTelhado(initialOrcamento.orientacao_telhado || 'norte')
      setAreaNecessariaM2(initialOrcamento.area_necessaria_m2 || 26)
      setCodigoFiname(initialOrcamento.codigo_finame || '')
      setValorInvestimentoManual(initialOrcamento.valor_investimento || 0)
      setObservacoes(initialOrcamento.observacoes || '')

      setCustos({
        maoDeObra: initialOrcamento.custo_mao_de_obra || 0,
        materiaisExtras: initialOrcamento.custo_materiais_extras || 0,
        freteGuincho: initialOrcamento.custo_frete_guincho || 0,
        subestacao: initialOrcamento.custo_subestacao || 0,
        terceirizacao: initialOrcamento.custo_terceirizacao || 0,
        administracao: initialOrcamento.custo_administracao || 0,
        marketingCombustivel: initialOrcamento.custo_marketing_combustivel || 0,
        riscoEngenharia: initialOrcamento.custo_risco_engenharia || 0,
        comissaoComercial: initialOrcamento.custo_comissao_comercial || 0,
        indicacao: initialOrcamento.custo_indicacao || 0,
        impostos: initialOrcamento.custo_impostos || 0,
      })
    } else if (initialClienteId) {
      setSelectedClienteId(initialClienteId)
    } else if (clientes.length > 0 && !selectedClienteId) {
      setSelectedClienteId(clientes[0].id)
    }
  }, [initialOrcamento, initialClienteId, clientes])

  // Quando o cliente selecionado mudar (e não for edição de orçamento existente), buscar dados automáticos do cliente/sistema
  const clienteAtual = useMemo(() => {
    return clientes.find((c) => c.id === selectedClienteId) || null
  }, [clientes, selectedClienteId])

  const sistemaAtual = useMemo(() => {
    return sistemas.find((s) => s.cliente_id === selectedClienteId) || null
  }, [sistemas, selectedClienteId])

  // Preenche dados do cliente caso não esteja editando um orçamento já gravado
  useEffect(() => {
    if (initialOrcamento) return
    if (!clienteAtual) return

    // Consumo médio
    if (clienteAtual.consumo_kwh_mes && clienteAtual.consumo_kwh_mes > 0) {
      setConsumoKwhMes(clienteAtual.consumo_kwh_mes)
    }
    // Tarifa
    if (clienteAtual.tarifa && clienteAtual.tarifa > 0) {
      setTarifaKwh(clienteAtual.tarifa)
    } else if (sistemaAtual?.tarifa && sistemaAtual.tarifa > 0) {
      setTarifaKwh(sistemaAtual.tarifa)
    }
    // Potência
    if (clienteAtual.potencia_kwp && clienteAtual.potencia_kwp > 0) {
      setPotenciaKwp(clienteAtual.potencia_kwp)
    } else if (sistemaAtual?.potencia_total_kwp && sistemaAtual.potencia_total_kwp > 0) {
      setPotenciaKwp(sistemaAtual.potencia_total_kwp)
    }
    // Placas
    if (clienteAtual.placas_qtd && clienteAtual.placas_qtd > 0) {
      setNumeroPlacas(clienteAtual.placas_qtd)
    }
    if (clienteAtual.placas_marca) {
      setMarcaPainel(clienteAtual.placas_marca)
    }
    // Inversor
    if (clienteAtual.inversor_marca) {
      setMarcaInversor(
        `${clienteAtual.inversor_marca} ${clienteAtual.inversor_modelo || ''}`.trim(),
      )
    }
    // Tipo de telhado / estrutura
    if (clienteAtual.telhado_tipo) {
      setTipoEstrutura(clienteAtual.telhado_tipo as TipoEstruturaSolar)
    }
  }, [clienteAtual, sistemaAtual, initialOrcamento])

  // Ajusta automaticamente kWp ao alterar placas/potência de cada placa
  const handleNumeroPlacasChange = (qtd: number) => {
    setNumeroPlacas(qtd)
    if (qtd > 0 && potenciaPlacaWp > 0) {
      const kwpCalculado = Number(((qtd * potenciaPlacaWp) / 1000).toFixed(2))
      setPotenciaKwp(kwpCalculado)
      // Ajuste estimativo da área: cada placa ~ 2.4 m²
      setAreaNecessariaM2(Math.round(qtd * 2.4))
    }
  }

  const handlePotenciaPlacaChange = (wp: number) => {
    setPotenciaPlacaWp(wp)
    if (numeroPlacas > 0 && wp > 0) {
      const kwpCalculado = Number(((numeroPlacas * wp) / 1000).toFixed(2))
      setPotenciaKwp(kwpCalculado)
    }
  }

  const handlePotenciaKwpManualChange = (kwp: number) => {
    setPotenciaKwp(kwp)
    if (kwp > 0 && potenciaPlacaWp > 0) {
      const qtdEstimada = Math.round((kwp * 1000) / potenciaPlacaWp)
      setNumeroPlacas(qtdEstimada)
      setAreaNecessariaM2(Math.round(qtdEstimada * 2.4))
    }
  }

  // Custo somado da aba de custos
  const totalCustosCalculado = useMemo(() => {
    return somarCustosSolar(custos)
  }, [custos])

  // Valor do investimento: se o usuário preencheu na mão usa ele; senão usa os custos da aba de custos
  const valorInvestimentoFinal = useMemo(() => {
    if (valorInvestimentoManual && valorInvestimentoManual > 0) {
      return valorInvestimentoManual
    }
    if (totalCustosCalculado > 0) {
      return totalCustosCalculado
    }
    // fallback padrão proporcional ao kWp (ex: R$ 3.800/kWp)
    return potenciaKwp > 0 ? Math.round(potenciaKwp * 3800) : 0
  }, [valorInvestimentoManual, totalCustosCalculado, potenciaKwp])

  // Cálculos solares dinâmicos em tempo real
  const calculos = useMemo(() => {
    return calcularOrcamentoSolar({
      consumoKwhMes,
      tipoCliente,
      tarifaKwh,
      potenciaKwp,
      orientacaoTelhado,
      custos,
      valorInvestimentoInformado: valorInvestimentoFinal,
    })
  }, [
    consumoKwhMes,
    tipoCliente,
    tarifaKwh,
    potenciaKwp,
    orientacaoTelhado,
    custos,
    valorInvestimentoFinal,
  ])

  // Objeto preparado para geração de PDF
  const propostaPDFData = useMemo<PropostaSolarPDFInput | null>(() => {
    if (!clienteAtual) return null
    return {
      cliente: {
        nome: clienteAtual.nome_fantasia
          ? `${clienteAtual.nome} (${clienteAtual.nome_fantasia})`
          : clienteAtual.nome,
        cpfOuCnpj: clienteAtual.cnpj || clienteAtual.cpf || '',
        endereco: [clienteAtual.endereco, clienteAtual.numero, clienteAtual.bairro]
          .filter(Boolean)
          .join(', '),
        municipio: clienteAtual.cidade || 'Erechim / RS',
        email: clienteAtual.email || '',
        telefone: clienteAtual.telefone || '',
        tipoCliente,
      },
      representanteComercial: user?.name || 'Equipe Comercial Delfos Solar',
      sistema: {
        potenciaKwp,
        consumoKwhMes,
        numeroPlacas,
        potenciaPlacaWp,
        marcaPlacas: marcaPainel,
        marcaInversor,
        quantidadeInversores,
        tipoEstrutura,
        orientacaoTelhado,
        areaNecessariaM2,
        codigoFiname: codigoFiname.trim() || undefined,
        prazoEntregaDias,
      },
      calculos,
      dataEmissao: new Date().toISOString(),
      validadeDias: 5,
      observacoes,
    }
  }, [
    clienteAtual,
    tipoCliente,
    user,
    potenciaKwp,
    consumoKwhMes,
    numeroPlacas,
    potenciaPlacaWp,
    marcaPainel,
    marcaInversor,
    quantidadeInversores,
    tipoEstrutura,
    orientacaoTelhado,
    areaNecessariaM2,
    codigoFiname,
    prazoEntregaDias,
    calculos,
    observacoes,
  ])

  if (!isOpen) return null

  // Salvar no PocketBase
  const handleSalvar = async (proximaAcao?: 'abrir_pdf' | 'baixar_pdf') => {
    if (!clienteAtual) {
      alert('Selecione um cliente para vincular o orçamento.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Partial<OrcamentoSolar> = {
        cliente_id: clienteAtual.id,
        status,
        tipo_cliente: tipoCliente,
        consumo_kwh_mes: consumoKwhMes,
        tarifa_kwh: tarifaKwh,
        potencia_kwp: potenciaKwp,
        numero_placas: numeroPlacas,
        potencia_placa_wp: potenciaPlacaWp,
        marca_painel: marcaPainel,
        marca_inversor: marcaInversor,
        quantidade_inversores: quantidadeInversores,
        tipo_estrutura: tipoEstrutura,
        orientacao_telhado: orientacaoTelhado,
        area_necessaria_m2: areaNecessariaM2,
        codigo_finame: codigoFiname.trim() || undefined,
        valor_investimento: valorInvestimentoFinal,

        // Custos
        custo_mao_de_obra: custos.maoDeObra,
        custo_materiais_extras: custos.materiaisExtras,
        custo_frete_guincho: custos.freteGuincho,
        custo_subestacao: custos.subestacao,
        custo_terceirizacao: custos.terceirizacao,
        custo_administracao: custos.administracao,
        custo_marketing_combustivel: custos.marketingCombustivel,
        custo_risco_engenharia: custos.riscoEngenharia,
        custo_comissao_comercial: custos.comissaoComercial,
        custo_indicacao: custos.indicacao,
        custo_impostos: custos.impostos,
        valor_total_custos: totalCustosCalculado,
        custo_por_kwp: calculos.custoPorKwpInstalado,

        // Cálculos solares
        geracao_anual_kwh: calculos.geracaoAnualEstimadaKwh,
        geracao_mensal_kwh: calculos.geracaoMediaMensalKwh,
        geracao_detalhada_json: calculos.geracaoMensalDetalhada,
        economia_1_mes: calculos.economia1Mes,
        economia_1_ano: calculos.economia1Ano,
        economia_5_anos: calculos.economia5Anos,
        economia_10_anos: calculos.economia10Anos,
        economia_25_anos: calculos.economia25Anos,
        gasto_sem_solar_1_ano: calculos.gastoSemSolar1Ano,
        gasto_sem_solar_5_anos: calculos.gastoSemSolar5Anos,
        gasto_sem_solar_10_anos: calculos.gastoSemSolar10Anos,
        gasto_sem_solar_25_anos: calculos.gastoSemSolar25Anos,
        conta_primeiro_mes_com_solar: calculos.contaPrimeiroMesComSolar,
        conta_4_anos_reajuste: calculos.contaSemSolar4AnosComReajuste,
        conta_10_anos_reajuste: calculos.contaSemSolar10AnosComReajuste,
        payback_meses: calculos.paybackMeses,

        // Parcelas
        parcela_a_vista: calculos.parcelamentos.aVista.valorTotal,
        parcela_cartao_18x: calculos.parcelamentos.cartao18x.valorParcela,
        parcela_financiamento_banco1: calculos.parcelamentos.financiamentoBanco1.valorParcela,
        parcela_financiamento_banco2: calculos.parcelamentos.financiamentoBanco2.valorParcela,

        data_orcamento: new Date().toISOString(),
        validade_dias: 5,
        autor: user?.name || 'Delfos Solar',
        observacoes,
      }

      let orcamentoSalvoId = ''
      if (initialOrcamento?.id) {
        await updateOrcamentoSolar(initialOrcamento.id, payload)
        orcamentoSalvoId = initialOrcamento.id
      } else {
        const created = await addOrcamentoSolar(payload)
        orcamentoSalvoId = created.id
      }

      // Adicionar atividade na timeline do cliente
      try {
        await addAtividade({
          cliente_id: clienteAtual.id,
          tipo: 'proposta',
          titulo: `Orçamento Solar Fotovoltaico: ${potenciaKwp} kWp (${status})`,
          descricao: `Orçamento de ${potenciaKwp} kWp com ${numeroPlacas} placas (${potenciaPlacaWp}W) e inversor ${marcaInversor}.\nInvestimento total: ${formatCurrency(
            valorInvestimentoFinal,
          )} | Geração média: ${calculos.geracaoMediaMensalKwh} kWh/mês | Payback: ${
            calculos.paybackMeses
          } meses.\nStatus: ${status}.`,
          data: new Date().toISOString(),
          status: status === 'Aprovado' ? 'concluida' : 'pendente',
          autor: user?.name || 'Equipe Delfos Solar',
        })
      } catch (errAtv) {
        console.error('Erro ao adicionar atividade:', errAtv)
      }

      // Atualizar status do cliente para Orçamento se estiver em Novo Lead ou Levantamento
      if (clienteAtual.status === 'Novo Lead' || clienteAtual.status === 'Levantamento') {
        try {
          await updateClienteStatus(clienteAtual.id, 'Orçamento')
        } catch {
          /* ignore */
        }
      }

      // Ações adicionais de PDF se solicitado
      if (proximaAcao && propostaPDFData) {
        if (proximaAcao === 'abrir_pdf') {
          abrirPropostaSolarEmNovaAba(propostaPDFData)
        } else if (proximaAcao === 'baixar_pdf') {
          baixarPropostaSolarHTML(propostaPDFData)
        }
      }

      onClose()
    } catch (err) {
      console.error('Erro ao salvar orçamento solar:', err)
      alert('Falha ao gravar orçamento no servidor. Verifique os dados e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateCustoField = (campo: keyof DadosCustosSolar, valor: number) => {
    setCustos((prev) => ({
      ...prev,
      [campo]: Math.max(0, valor || 0),
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-amber-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Sun className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  {initialOrcamento
                    ? 'Editar Orçamento de Energia Solar'
                    : 'Novo Orçamento de Energia Solar Fotovoltaica'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  Delfos Solar
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Dimensionamento técnico, custos detalhados, parcelamento e proposta
                técnico-comercial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Fechar"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas Superiores */}
        <div className="border-b border-gray-200 bg-gray-50/70 px-5 pt-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('tecnico')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'tecnico'
                  ? 'border-[#16A34A] text-[#166534] bg-white rounded-t-lg shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Sun className="w-4 h-4 text-emerald-600" />
              <span>1. Dados Técnicos & Sistema</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custos')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'custos'
                  ? 'border-[#16A34A] text-[#166534] bg-white rounded-t-lg shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>2. Aba de Custos</span>
              {totalCustosCalculado > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {formatCurrency(totalCustosCalculado)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('parcelamentos')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'parcelamentos'
                  ? 'border-[#16A34A] text-[#166534] bg-white rounded-t-lg shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>3. Parcelamentos & Financiamento</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('proposta')}
              className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'proposta'
                  ? 'border-[#16A34A] text-[#166534] bg-white rounded-t-lg shadow-xs'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>4. Resumo & Proposta Oficial</span>
            </button>
          </div>

          {/* Seletor Rápido de Status */}
          <div className="flex items-center gap-1.5 pb-2 text-xs">
            <span className="text-gray-400 font-semibold text-[11px] hidden sm:inline">
              Status:
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusOrcamentoSolar)}
              className="text-xs font-bold px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="Em elaboração">Em elaboração</option>
              <option value="Enviado ao cliente">Enviado ao cliente</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Rejeitado">Rejeitado</option>
            </select>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#F8FAF9]/80">
          {/* PAINEL DE CÁLCULO EM TEMPO REAL (SEMPRE VISÍVEL NO TOPO - PADRÃO VISUAL DO CRM) */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white rounded-2xl p-4 shadow-sm border border-emerald-600">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-600/50">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                  Cálculo Instantâneo em Tempo Real (Erechim/RS)
                </span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-200">
                Potência: <strong className="text-white">{potenciaKwp.toFixed(2)} kWp</strong> •
                Investimento:{' '}
                <strong className="text-white">{formatCurrency(valorInvestimentoFinal)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3">
              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                  Geração Média
                </span>
                <span className="text-base font-extrabold text-white">
                  {calculos.geracaoMediaMensalKwh.toLocaleString('pt-BR')} kWh
                </span>
                <span className="text-[10px] text-emerald-300 block">/mês estimada</span>
              </div>

              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                  Geração Anual
                </span>
                <span className="text-base font-extrabold text-white">
                  {calculos.geracaoAnualEstimadaKwh.toLocaleString('pt-BR')} kWh
                </span>
                <span className="text-[10px] text-emerald-300 block">no primeiro ano</span>
              </div>

              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                  Economia Mensal
                </span>
                <span className="text-base font-extrabold text-amber-300">
                  {formatCurrency(calculos.economia1Mes)}
                </span>
                <span className="text-[10px] text-emerald-300 block">
                  {formatCurrency(calculos.economia1Ano)} /ano
                </span>
              </div>

              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                  Conta após Solar
                </span>
                <span className="text-base font-extrabold text-white">
                  {formatCurrency(calculos.contaPrimeiroMesComSolar)}
                </span>
                <span className="text-[10px] text-emerald-300 block">
                  antes: {formatCurrency(calculos.contaAtualSemSolarMes)}
                </span>
              </div>

              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                  Payback Estimado
                </span>
                <span className="text-base font-extrabold text-white">
                  {calculos.paybackMeses} meses
                </span>
                <span className="text-[10px] text-emerald-300 block">
                  (~{calculos.paybackAnos} anos)
                </span>
              </div>

              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                  Custo por kWp
                </span>
                <span className="text-base font-extrabold text-white">
                  {formatCurrency(calculos.custoPorKwpInstalado)}
                </span>
                <span className="text-[10px] text-emerald-300 block">instalado</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ABA 1: DADOS TÉCNICOS & SISTEMA                                           */}
          {/* ========================================================================= */}
          {activeTab === 'tecnico' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Seleção de Cliente com busca automática */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-extrabold">
                      1
                    </span>
                    Cliente do CRM (Busca Automática)
                  </label>
                  {clienteAtual && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      UC: {clienteAtual.uc || 'Não informada'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 mb-1 block">
                      Pesquise por nome do cliente ou selecione da base:
                    </label>
                    <ClienteAutocomplete
                      clientes={clientes}
                      value={selectedClienteId}
                      onChange={(id) => setSelectedClienteId(id)}
                      placeholder="Digite o nome do cliente para buscar..."
                    />
                  </div>

                  {clienteAtual ? (
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200/80 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Documento:</span>
                        <span className="font-semibold text-gray-800">
                          {clienteAtual.cnpj || clienteAtual.cpf || 'Não informado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Município/UF:</span>
                        <span className="font-semibold text-gray-800">
                          {clienteAtual.cidade || 'Erechim / RS'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Endereço:</span>
                        <span className="font-semibold text-gray-800 truncate max-w-[240px]">
                          {clienteAtual.endereco || 'Endereço da usina'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Contato:</span>
                        <span className="font-semibold text-gray-800">
                          {clienteAtual.telefone || clienteAtual.email || 'Não informado'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      Selecione um cliente para carregar automaticamente CPF/CNPJ, endereço,
                      telefone e histórico.
                    </div>
                  )}
                </div>
              </div>

              {/* Formulário de Dados Técnicos */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-emerald-600" />
                    Campos Técnicos do Sistema Solar
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Todos os campos afetam os cálculos em tempo real
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Consumo médio */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Consumo médio mensal (kWh) *
                    </label>
                    <input
                      type="number"
                      value={consumoKwhMes}
                      min={0}
                      step={10}
                      onChange={(e) => setConsumoKwhMes(Number(e.target.value) || 0)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 650"
                    />
                  </div>

                  {/* Tipo de cliente */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Tipo de cliente *
                    </label>
                    <select
                      value={tipoCliente}
                      onChange={(e) => setTipoCliente(e.target.value as TipoClienteSolar)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 capitalize"
                    >
                      <option value="residencial">Residencial</option>
                      <option value="comercial">Comercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="rural">Rural</option>
                    </select>
                  </div>

                  {/* Tarifa concessionária */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Tarifa atual (R$ por kWh) *
                    </label>
                    <input
                      type="number"
                      value={tarifaKwh}
                      min={0.1}
                      step={0.01}
                      onChange={(e) => setTarifaKwh(Number(e.target.value) || 0)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 0.95"
                    />
                  </div>

                  {/* Potência do sistema em kWp */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Potência do sistema (kWp) *
                    </label>
                    <input
                      type="number"
                      value={potenciaKwp}
                      min={0.1}
                      step={0.05}
                      onChange={(e) => handlePotenciaKwpManualChange(Number(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-emerald-700 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 5.5"
                    />
                  </div>

                  {/* Número de placas */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Número de placas solares *
                    </label>
                    <input
                      type="number"
                      value={numeroPlacas}
                      min={1}
                      step={1}
                      onChange={(e) => handleNumeroPlacasChange(Number(e.target.value) || 0)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 10"
                    />
                  </div>

                  {/* Potência de cada placa Wp */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Potência de cada placa (Wp) *
                    </label>
                    <input
                      type="number"
                      value={potenciaPlacaWp}
                      min={100}
                      step={10}
                      onChange={(e) => handlePotenciaPlacaChange(Number(e.target.value) || 0)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 550"
                    />
                  </div>

                  {/* Marca e modelo dos painéis */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Marca e modelo dos painéis *
                    </label>
                    <input
                      type="text"
                      value={marcaPainel}
                      onChange={(e) => setMarcaPainel(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: Canadian Solar 550W BiHiKu7 Monocristalino"
                    />
                  </div>

                  {/* Marca e modelo do inversor */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Marca e modelo do inversor *
                    </label>
                    <input
                      type="text"
                      value={marcaInversor}
                      onChange={(e) => setMarcaInversor(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: Growatt MIN 5000TL-X / Deye / Huawei"
                    />
                  </div>

                  {/* Quantidade de inversores */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Quantidade de inversores *
                    </label>
                    <input
                      type="number"
                      value={quantidadeInversores}
                      min={1}
                      step={1}
                      onChange={(e) => setQuantidadeInversores(Number(e.target.value) || 1)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 1"
                    />
                  </div>

                  {/* Tipo de estrutura de fixação */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Tipo de estrutura de fixação *
                    </label>
                    <select
                      value={tipoEstrutura}
                      onChange={(e) => setTipoEstrutura(e.target.value as TipoEstruturaSolar)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="ceramico">Cerâmico</option>
                      <option value="metalico">Metálico</option>
                      <option value="laje">Laje</option>
                      <option value="fibrocimento">Fibrocimento</option>
                      <option value="solo">Solo</option>
                    </select>
                  </div>

                  {/* Orientação do telhado */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Orientação do telhado *
                    </label>
                    <select
                      value={orientacaoTelhado}
                      onChange={(e) =>
                        setOrientacaoTelhado(e.target.value as OrientacaoTelhadoSolar)
                      }
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="norte">Norte (Máxima geração)</option>
                      <option value="leste">Leste</option>
                      <option value="oeste">Oeste</option>
                      <option value="sul">Sul</option>
                    </select>
                  </div>

                  {/* Área necessária em m² */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Área necessária (m²) *
                    </label>
                    <input
                      type="number"
                      value={areaNecessariaM2}
                      min={1}
                      step={1}
                      onChange={(e) => setAreaNecessariaM2(Number(e.target.value) || 0)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 26"
                    />
                  </div>

                  {/* Código FINAME */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Código FINAME (opcional)
                    </label>
                    <input
                      type="text"
                      value={codigoFiname}
                      onChange={(e) => setCodigoFiname(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 3.456.789"
                    />
                  </div>

                  {/* Valor de investimento do projeto */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Valor de Investimento (R$)
                    </label>
                    <input
                      type="number"
                      value={valorInvestimentoManual || ''}
                      min={0}
                      step={100}
                      onChange={(e) => setValorInvestimentoManual(Number(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-gray-900 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={
                        totalCustosCalculado > 0
                          ? `Calculado da aba custos (${formatCurrency(totalCustosCalculado)})`
                          : 'Ou preencha na aba de custos'
                      }
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {valorInvestimentoManual > 0
                        ? 'Valor fixado manualmente'
                        : totalCustosCalculado > 0
                          ? 'Calculado da soma da Aba de Custos'
                          : 'Estimado por kWp'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Geração Mensal Sazonal (Janeiro a Dezembro) */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Geração Mensal Detalhada (Janeiro a Dezembro — Erechim/RS)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">
                    Total: {calculos.geracaoAnualEstimadaKwh.toLocaleString('pt-BR')} kWh/ano
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {calculos.geracaoMensalDetalhada.map((item) => (
                    <div
                      key={item.mesIndex}
                      className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/60 text-center hover:border-emerald-300 transition-colors"
                    >
                      <div className="text-[10px] font-bold uppercase text-gray-500">
                        {item.mesNome}
                      </div>
                      <div className="text-xs font-extrabold text-emerald-800 mt-0.5">
                        {item.geracaoKwh.toLocaleString('pt-BR')} kWh
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {item.irradiacaoHSP.toFixed(2)} HSP
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: ABA DE CUSTOS                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'custos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Planilha de Custos do Projeto Solar
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Preencha os valores de cada item. A soma calcula automaticamente o valor total
                      e o custo por kWp.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                      Valor Total do Projeto
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {formatCurrency(totalCustosCalculado)}
                    </span>
                  </div>
                </div>

                {/* Grade com os campos monetários exatos pedidos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Mão de obra de instalação */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Mão de obra de instalação (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.maoDeObra || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('maoDeObra', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Materiais extras */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Materiais extras (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.materiaisExtras || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('materiaisExtras', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Frete e guincho */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Frete e guincho (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.freteGuincho || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('freteGuincho', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Subestação de energia se necessário */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Subestação de energia (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.subestacao || ''}
                      min={0}
                      step={100}
                      onChange={(e) => updateCustoField('subestacao', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00 (se necessário)"
                    />
                  </div>

                  {/* Terceirização de serviços */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Terceirização de serviços (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.terceirizacao || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('terceirizacao', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Administração */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Administração (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.administracao || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('administracao', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Marketing e combustível */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Marketing e combustível (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.marketingCombustivel || ''}
                      min={0}
                      step={50}
                      onChange={(e) =>
                        updateCustoField('marketingCombustivel', Number(e.target.value))
                      }
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Risco de engenharia */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Risco de engenharia (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.riscoEngenharia || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('riscoEngenharia', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Comissão comercial */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Comissão comercial (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.comissaoComercial || ''}
                      min={0}
                      step={50}
                      onChange={(e) =>
                        updateCustoField('comissaoComercial', Number(e.target.value))
                      }
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Indicação */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Indicação (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.indicacao || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('indicacao', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>

                  {/* Impostos */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Impostos (R$)
                    </label>
                    <input
                      type="number"
                      value={custos.impostos || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('impostos', Number(e.target.value))}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Resumo da Aba de Custos */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs font-bold text-emerald-950">
                      Total de Custos: {formatCurrency(totalCustosCalculado)}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Custo por kWp:{' '}
                      <strong>{formatCurrency(calculos.custoPorKwpInstalado)}</strong> / kWp
                      instalado
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setValorInvestimentoManual(totalCustosCalculado)
                      setActiveTab('parcelamentos')
                    }}
                    className="px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-all"
                  >
                    <span>Usar no Investimento & Ver Parcelamento</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: PARCELAMENTOS & FINANCIAMENTO                                      */}
          {/* ========================================================================= */}
          {activeTab === 'parcelamentos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Simulação de Parcelamento & Financiamento (4 Opções)
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Comparativo lado a lado: Conta hoje sem solar vs Conta estimada com solar e
                      desembolso mensal.
                    </p>
                  </div>

                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    Investimento Base: {formatCurrency(valorInvestimentoFinal)}
                  </span>
                </div>

                {/* 4 Cards de Parcelamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* 1. À Vista */}
                  <div className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/40 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs uppercase text-emerald-950">
                          {calculos.parcelamentos.aVista.titulo}
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                          Sem Juros
                        </span>
                      </div>
                      <div className="text-xl font-black text-emerald-700 mt-2">
                        {formatCurrency(calculos.parcelamentos.aVista.valorTotal)}
                      </div>
                      <p className="text-[10px] text-gray-500">Valor total do projeto à vista</p>
                    </div>

                    <div className="pt-2 border-t border-emerald-200 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta hoje s/ solar:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(calculos.parcelamentos.aVista.contaSemSolar)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta c/ solar:</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(calculos.parcelamentos.aVista.contaComSolar)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-emerald-200 font-extrabold text-emerald-900">
                        <span>Economia/mês:</span>
                        <span>
                          {formatCurrency(calculos.parcelamentos.aVista.economiaMensalLiquida)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Cartão de Crédito em 18 vezes */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs uppercase text-gray-900">
                          {calculos.parcelamentos.cartao18x.titulo}
                        </span>
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          18x Cartão
                        </span>
                      </div>
                      <div className="text-xl font-black text-gray-900 mt-2">
                        {formatCurrency(calculos.parcelamentos.cartao18x.valorParcela)}
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Total: {formatCurrency(calculos.parcelamentos.cartao18x.valorTotal)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta hoje s/ solar:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(calculos.parcelamentos.cartao18x.contaSemSolar)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta c/ solar:</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(calculos.parcelamentos.cartao18x.contaComSolar)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-100 font-bold text-gray-900">
                        <span>Parcela + Conta:</span>
                        <span>
                          {formatCurrency(calculos.parcelamentos.cartao18x.desembolsoMensal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Financiamento Banco 1 (até 60x juros 1,9% a.m.) */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs uppercase text-gray-900">
                          Financiamento Banco 1
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          60x (1,90% a.m.)
                        </span>
                      </div>
                      <div className="text-xl font-black text-gray-900 mt-2">
                        {formatCurrency(calculos.parcelamentos.financiamentoBanco1.valorParcela)}
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Total:{' '}
                        {formatCurrency(calculos.parcelamentos.financiamentoBanco1.valorTotal)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta hoje s/ solar:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(calculos.parcelamentos.financiamentoBanco1.contaSemSolar)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta c/ solar:</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(calculos.parcelamentos.financiamentoBanco1.contaComSolar)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-100 font-bold text-gray-900">
                        <span>Parcela + Conta:</span>
                        <span>
                          {formatCurrency(
                            calculos.parcelamentos.financiamentoBanco1.desembolsoMensal,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Financiamento Banco 2 (parcela menor 0,99% a.m.) */}
                  <div className="p-4 rounded-xl border-2 border-blue-400 bg-blue-50/40 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs uppercase text-blue-950">
                          Financiamento Banco 2
                        </span>
                        <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                          60x (0,99% a.m.)
                        </span>
                      </div>
                      <div className="text-xl font-black text-blue-800 mt-2">
                        {formatCurrency(calculos.parcelamentos.financiamentoBanco2.valorParcela)}
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Total:{' '}
                        {formatCurrency(calculos.parcelamentos.financiamentoBanco2.valorTotal)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-blue-200 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta hoje s/ solar:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(calculos.parcelamentos.financiamentoBanco2.contaSemSolar)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta c/ solar:</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(calculos.parcelamentos.financiamentoBanco2.contaComSolar)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-blue-200 font-extrabold text-blue-900">
                        <span>Parcela + Conta:</span>
                        <span>
                          {formatCurrency(
                            calculos.parcelamentos.financiamentoBanco2.desembolsoMensal,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco de Projeção de Reajuste Tarifário 9% a.a. */}
                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4 text-amber-700" />
                    Projeção com Reajuste Tarifário de 9% ao ano (Concessionária)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-lg border border-amber-200">
                      <span className="text-[11px] text-gray-500 block">Conta daqui a 4 anos:</span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-red-700 font-bold line-through">
                          {formatCurrency(calculos.contaSemSolar4AnosComReajuste)}
                        </span>
                        <span className="text-emerald-700 font-black text-sm">
                          {formatCurrency(calculos.contaComSolar4AnosComReajuste)} com solar
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-amber-200">
                      <span className="text-[11px] text-gray-500 block">
                        Conta daqui a 10 anos:
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-red-700 font-bold line-through">
                          {formatCurrency(calculos.contaSemSolar10AnosComReajuste)}
                        </span>
                        <span className="text-emerald-700 font-black text-sm">
                          {formatCurrency(calculos.contaComSolar10AnosComReajuste)} com solar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: RESUMO & PROPOSTA OFICIAL                                          */}
          {/* ========================================================================= */}
          {activeTab === 'proposta' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                        Proposta Técnico-Comercial da Delfos Solar
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Pronta para emissão em PDF no padrão técnico com ART, portfólio e tabelas
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Validade: 5 dias
                  </span>
                </div>

                {/* Grade de Desperdício x Economia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-red-50/70 p-3.5 rounded-xl border border-red-200 space-y-2">
                    <span className="font-bold text-red-900 uppercase block">
                      Gasto Acumulado com Concessionária SEM Solar (com 9% a.a.)
                    </span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span>Em 1 ano:</span>
                        <strong className="text-red-700">
                          {formatCurrency(calculos.gastoSemSolar1Ano)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Em 5 anos:</span>
                        <strong className="text-red-700">
                          {formatCurrency(calculos.gastoSemSolar5Anos)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Em 10 anos:</span>
                        <strong className="text-red-700">
                          {formatCurrency(calculos.gastoSemSolar10Anos)}
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-red-200 font-extrabold text-red-950">
                        <span>Em 25 anos:</span>
                        <span>{formatCurrency(calculos.gastoSemSolar25Anos)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-2">
                    <span className="font-bold text-emerald-900 uppercase block">
                      Economia Líquida Acumulada COM Solar Delfos
                    </span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span>Em 1 ano:</span>
                        <strong className="text-emerald-700">
                          {formatCurrency(calculos.economia1Ano)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Em 5 anos:</span>
                        <strong className="text-emerald-700">
                          {formatCurrency(calculos.economia5Anos)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Em 10 anos:</span>
                        <strong className="text-emerald-700">
                          {formatCurrency(calculos.economia10Anos)}
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-emerald-200 font-extrabold text-emerald-950">
                        <span>Em 25 anos:</span>
                        <span>{formatCurrency(calculos.economia25Anos)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observações e Prazo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Prazo de entrega da usina (dias)
                    </label>
                    <input
                      type="number"
                      value={prazoEntregaDias}
                      min={5}
                      step={5}
                      onChange={(e) => setPrazoEntregaDias(Number(e.target.value) || 30)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Observações adicionais na proposta
                    </label>
                    <input
                      type="text"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: Condição especial de pagamento; vistoria estrutural já executada."
                    />
                  </div>
                </div>

                {/* Dados da Empresa & Responsável Técnico */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 space-y-1">
                  <div className="flex justify-between flex-wrap gap-1">
                    <span>
                      Empresa: <strong>Delfos Engenharia Ltda (Delfos Solar)</strong> • CNPJ
                      21.379.952/0001-38
                    </span>
                    <span>Erechim / RS • Tel: (54) 99129-2121</span>
                  </div>
                  <div className="flex justify-between flex-wrap gap-1 pt-1 border-t border-gray-200/80">
                    <span>
                      Responsável Técnico: <strong>João Victor Bagetti Fuchs</strong> (CREA
                      RS151894)
                    </span>
                    <span>Validade oficial: 5 dias corridos</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions do Modal */}
        <div className="px-5 py-3 border-t border-gray-200 bg-white flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Gerar Proposta — PDF Técnico-Comercial */}
            <button
              type="button"
              onClick={() => handleSalvar('abrir_pdf')}
              disabled={isSubmitting || !clienteAtual}
              className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs border border-emerald-300"
              title="Salvar orçamento e abrir PDF completo para impressão"
            >
              <Printer className="w-4 h-4 text-emerald-700" />
              <span>Gerar Proposta (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSalvar('baixar_pdf')}
              disabled={isSubmitting || !clienteAtual}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all hidden sm:inline-flex items-center gap-1.5 border border-emerald-200"
              title="Salvar e baixar arquivo HTML/PDF da proposta"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Baixar Proposta</span>
            </button>

            {/* Salvar Orçamento */}
            <button
              type="button"
              onClick={() => handleSalvar()}
              disabled={isSubmitting || !clienteAtual}
              className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Orçamento'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

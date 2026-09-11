import React, { useState, useMemo } from 'react'
import {
  Sun,
  Plus,
  Search,
  Filter,
  FileText,
  Printer,
  Download,
  Edit2,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Calendar,
  Layers,
  Zap,
  MapPin,
  ChevronRight,
  MoreVertical,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ModalOrcamentoSolar } from '@/components/ModalOrcamentoSolar'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { OrcamentoSolar, OrcamentoSolarStatus } from '@/types/crm'
import {
  abrirPropostaSolarEmNovaAba,
  baixarPropostaSolarHTML,
  type PropostaSolarPDFInput,
} from '@/lib/propostaSolarGenerator'
import { ModalEnviarDocumentoWhatsApp } from '@/components/ModalEnviarDocumentoWhatsApp'
import { calcularOrcamentoSolar } from '@/lib/energiaSolar'

export const Orcamentos: React.FC = () => {
  const {
    orcamentosSolar,
    clientes,
    updateOrcamentoSolar,
    removeOrcamentoSolar,
    openFichaCliente,
  } = useClientes()

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrcamento, setEditingOrcamento] = useState<OrcamentoSolar | null>(null)
  const [clienteParaNovoOrcamento, setClienteParaNovoOrcamento] = useState<string>('')
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState<boolean>(false)
  const [orcamentoParaWhatsApp, setOrcamentoParaWhatsApp] = useState<{
    cliente: Cliente
    orc: OrcamentoSolar
    payload: PropostaSolarPDFInput
  } | null>(null)

  // Métricas agregadas
  const metricas = useMemo(() => {
    const total = orcamentosSolar.length
    const aprovados = orcamentosSolar.filter((o) => o.status === 'Aprovado').length
    const enviados = orcamentosSolar.filter((o) => o.status === 'Enviado ao cliente').length
    const elaboracao = orcamentosSolar.filter((o) => o.status === 'Em elaboração').length
    const valorTotalPipeline = orcamentosSolar.reduce(
      (acc, o) => acc + (o.valor_investimento || 0),
      0,
    )
    const kwpTotal = orcamentosSolar.reduce((acc, o) => acc + (o.potencia_kwp || 0), 0)

    return { total, aprovados, enviados, elaboracao, valorTotalPipeline, kwpTotal }
  }, [orcamentosSolar])

  // Filtragem
  const orcamentosFiltrados = useMemo(() => {
    return orcamentosSolar.filter((orc) => {
      // Cliente relacionado
      const cliente = orc.expand?.cliente_id || clientes.find((c) => c.id === orc.cliente_id)
      const nomeCliente = cliente?.nome || ''
      const cidade = cliente?.cidade || ''

      const matchBusca =
        busca === '' ||
        nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
        cidade.toLowerCase().includes(busca.toLowerCase()) ||
        (orc.marca_painel && orc.marca_painel.toLowerCase().includes(busca.toLowerCase())) ||
        (orc.marca_inversor && orc.marca_inversor.toLowerCase().includes(busca.toLowerCase()))

      const matchStatus = filtroStatus === 'todos' || orc.status === filtroStatus

      return matchBusca && matchStatus
    })
  }, [orcamentosSolar, clientes, busca, filtroStatus])

  const handleNovoOrcamento = (clienteId?: string) => {
    setEditingOrcamento(null)
    setClienteParaNovoOrcamento(clienteId || '')
    setIsModalOpen(true)
  }

  const handleEditarOrcamento = (orc: OrcamentoSolar) => {
    setEditingOrcamento(orc)
    setClienteParaNovoOrcamento(orc.cliente_id)
    setIsModalOpen(true)
  }

  const handleAlterarStatus = async (
    orc: OrcamentoSolar,
    novoStatus: OrcamentoSolarStatus,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    try {
      await updateOrcamentoSolar(orc.id, { status: novoStatus })
    } catch (err) {
      console.error('Erro ao alterar status do orçamento:', err)
      alert('Não foi possível atualizar o status do orçamento.')
    }
  }

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Tem certeza de que deseja excluir este orçamento?')) return
    try {
      await removeOrcamentoSolar(id)
    } catch (err) {
      console.error('Erro ao excluir orçamento:', err)
      alert('Não foi possível excluir o orçamento.')
    }
  }

  // Gera o PDF a partir do registro gravado
  const gerarPDFParaRegistro = (orc: OrcamentoSolar, modo: 'abrir' | 'baixar') => {
    const cliente = orc.expand?.cliente_id || clientes.find((c) => c.id === orc.cliente_id)
    if (!cliente) {
      alert('Cliente não localizado para este orçamento.')
      return
    }

    // Recalcula métricas consistentes
    const calculos = calcularOrcamentoSolar({
      consumoKwhMes: orc.consumo_kwh_mes,
      tipoCliente: orc.tipo_cliente || 'residencial',
      tarifaKwh: orc.tarifa_kwh,
      potenciaKwp: orc.potencia_kwp,
      orientacaoTelhado: orc.orientacao_telhado,
      valorInvestimentoInformado: orc.valor_investimento,
      custos: {
        maoDeObra: orc.custo_mao_de_obra || 0,
        materiaisExtras: orc.custo_materiais_extras || 0,
        freteGuincho: orc.custo_frete_guincho || 0,
        subestacao: orc.custo_subestacao || 0,
        terceirizacao: orc.custo_terceirizacao || 0,
        administracao: orc.custo_administracao || 0,
        marketingCombustivel: orc.custo_marketing_combustivel || 0,
        riscoEngenharia: orc.custo_risco_engenharia || 0,
        comissaoComercial: orc.custo_comissao_comercial || 0,
        indicacao: orc.custo_indicacao || 0,
        impostos: orc.custo_impostos || 0,
      },
    })

    const payload: PropostaSolarPDFInput = {
      cliente: {
        nome: cliente.nome_fantasia ? `${cliente.nome} (${cliente.nome_fantasia})` : cliente.nome,
        cpfOuCnpj: cliente.cnpj || cliente.cpf || '',
        endereco: [cliente.endereco, cliente.numero, cliente.bairro].filter(Boolean).join(', '),
        municipio: cliente.cidade || 'Erechim / RS',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        tipoCliente: orc.tipo_cliente,
      },
      representanteComercial: orc.autor || 'Delfos Solar',
      sistema: {
        potenciaKwp: orc.potencia_kwp,
        consumoKwhMes: orc.consumo_kwh_mes,
        numeroPlacas: orc.numero_placas,
        potenciaPlacaWp: orc.potencia_placa_wp,
        marcaPlacas: orc.marca_painel,
        marcaInversor: orc.marca_inversor,
        quantidadeInversores: orc.quantidade_inversores,
        tipoEstrutura: orc.tipo_estrutura,
        orientacaoTelhado: orc.orientacao_telhado,
        areaNecessariaM2: orc.area_necessaria_m2,
        codigoFiname: orc.codigo_finame,
        prazoEntregaDias: 30,
      },
      calculos,
      dataEmissao: orc.data_orcamento || orc.created,
      validadeDias: orc.validade_dias || 5,
      observacoes: orc.observacoes,
    }

    if (modo === 'abrir') {
      abrirPropostaSolarEmNovaAba(payload)
    } else {
      baixarPropostaSolarHTML(payload)
    }
  }

  // Render do badge colorido de status
  const renderStatusBadge = (status: OrcamentoSolarStatus) => {
    switch (status) {
      case 'Aprovado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Aprovado
          </span>
        )
      case 'Enviado ao cliente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Send className="w-3 h-3 text-blue-600" />
            Enviado ao cliente
          </span>
        )
      case 'Em elaboração':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Em elaboração
          </span>
        )
      case 'Rejeitado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Rejeitado
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Orçamentos de Energia Solar
              </h1>
              <p className="text-xs text-gray-500">
                Gestão comercial, dimensionamento fotovoltaico e geração de propostas técnicas
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleNovoOrcamento()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Orçamento Solar</span>
        </button>
      </div>

      {/* Cards de Métricas do Topo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block">
            Total de Orçamentos
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-gray-900">{metricas.total}</span>
            <span className="text-xs font-bold text-emerald-700">
              {metricas.kwpTotal.toFixed(1)} kWp total
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block">
            Valor em Negociação
          </span>
          <div className="mt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              {formatCurrency(metricas.valorTotalPipeline)}
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block">
            Enviados / Em Aberto
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-700">{metricas.enviados}</span>
            <span className="text-xs text-gray-500">({metricas.elaboracao} em elaboração)</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block">
            Aprovados / Fechados
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">{metricas.aprovados}</span>
            <span className="text-xs font-bold text-emerald-700">
              {metricas.total > 0
                ? `${Math.round((metricas.aprovados / metricas.total) * 100)}% conversão`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, cidade, painel..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:inline" />
          {(['todos', 'Em elaboração', 'Enviado ao cliente', 'Aprovado', 'Rejeitado'] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setFiltroStatus(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  filtroStatus === st
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st === 'todos' ? 'Todos os Status' : st}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Lista / Tabela de Orçamentos */}
      {orcamentosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Sun className="w-12 h-12 text-emerald-400 mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-base font-bold text-gray-800">Nenhum orçamento encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            {busca || filtroStatus !== 'todos'
              ? 'Nenhum resultado corresponde aos filtros aplicados.'
              : 'Gere seu primeiro orçamento técnico de energia solar fotovoltaica para os clientes.'}
          </p>
          <button
            onClick={() => handleNovoOrcamento()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Orçamento</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cliente & Cidade</th>
                  <th className="py-3 px-3">Potência (kWp)</th>
                  <th className="py-3 px-3">Investimento</th>
                  <th className="py-3 px-3">Geração Média</th>
                  <th className="py-3 px-3">Payback</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orcamentosFiltrados.map((orc) => {
                  const cliente =
                    orc.expand?.cliente_id || clientes.find((c) => c.id === orc.cliente_id)

                  return (
                    <tr
                      key={orc.id}
                      onClick={() => handleEditarOrcamento(orc)}
                      className="hover:bg-emerald-50/30 cursor-pointer transition-colors group"
                    >
                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {cliente?.nome || 'Cliente não identificado'}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{cliente?.cidade || 'Erechim / RS'}</span>
                          <span className="text-gray-300">•</span>
                          <span className="capitalize">{orc.tipo_cliente || 'Residencial'}</span>
                        </div>
                      </td>

                      {/* Potência */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-gray-900 text-sm">
                          {orc.potencia_kwp.toFixed(2)} kWp
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {orc.numero_placas} placas ({orc.potencia_placa_wp}W)
                        </div>
                      </td>

                      {/* Investimento */}
                      <td className="py-3 px-3">
                        <div className="font-black text-emerald-700 text-sm">
                          {formatCurrency(orc.valor_investimento)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {orc.custo_por_kwp ? `${formatCurrency(orc.custo_por_kwp)}/kWp` : '—'}
                        </div>
                      </td>

                      {/* Geração Média */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-800">
                          {orc.geracao_mensal_kwh
                            ? `${orc.geracao_mensal_kwh.toLocaleString('pt-BR')} kWh/mês`
                            : '—'}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          {orc.economia_1_mes
                            ? `Eco: ${formatCurrency(orc.economia_1_mes)}/mês`
                            : ''}
                        </div>
                      </td>

                      {/* Payback */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-gray-800">
                          {orc.payback_meses ? `${orc.payback_meses} meses` : '—'}
                        </span>
                        {orc.payback_meses ? (
                          <div className="text-[10px] text-gray-400">
                            (~{(orc.payback_meses / 12).toFixed(1)} anos)
                          </div>
                        ) : null}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          {renderStatusBadge(orc.status)}
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3 px-3 text-gray-500 text-[11px]">
                        {formatDate(orc.data_orcamento || orc.created)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Abrir Proposta PDF */}
                          <button
                            onClick={() => gerarPDFParaRegistro(orc, 'abrir')}
                            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 transition-colors"
                            title="Visualizar e Imprimir Proposta (PDF)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Enviar Proposta por WhatsApp */}
                          <button
                            disabled={!cliente || (!cliente.whatsapp && !cliente.telefone)}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!cliente) return

                              const calculos = calcularOrcamentoSolar({
                                consumoKwhMes: orc.consumo_kwh_mes,
                                tipoCliente: orc.tipo_cliente || 'residencial',
                                tarifaKwh: orc.tarifa_kwh,
                                potenciaKwp: orc.potencia_kwp,
                                orientacaoTelhado: orc.orientacao_telhado,
                                custos: {
                                  maoDeObra: orc.custo_mao_de_obra || 0,
                                  materiaisExtras: orc.custo_materiais_extras || 0,
                                  freteGuincho: orc.custo_frete_guincho || 0,
                                  subestacao: orc.custo_subestacao || 0,
                                  terceirizacao: orc.custo_terceirizacao || 0,
                                  administracao: orc.custo_administracao || 0,
                                  marketingCombustivel: orc.custo_marketing_combustivel || 0,
                                  riscoEngenharia: orc.custo_risco_engenharia || 0,
                                  comissaoComercial: orc.custo_comissao_comercial || 0,
                                  indicacao: orc.custo_indicacao || 0,
                                  impostos: orc.custo_impostos || 0,
                                },
                                valorInvestimentoInformado: orc.valor_investimento,
                              })

                              const payload: PropostaSolarPDFInput = {
                                cliente: {
                                  nome: cliente.nome_fantasia
                                    ? `${cliente.nome} (${cliente.nome_fantasia})`
                                    : cliente.nome,
                                  cpfOuCnpj: cliente.cnpj || cliente.cpf || '',
                                  endereco: [cliente.endereco, cliente.numero, cliente.bairro]
                                    .filter(Boolean)
                                    .join(', '),
                                  municipio: cliente.cidade || 'Erechim / RS',
                                  email: cliente.email || '',
                                  telefone: cliente.telefone || '',
                                  tipoCliente: orc.tipo_cliente,
                                },
                                representanteComercial: orc.autor || 'Delfos Solar',
                                sistema: {
                                  potenciaKwp: orc.potencia_kwp,
                                  consumoKwhMes: orc.consumo_kwh_mes,
                                  numeroPlacas: orc.numero_placas,
                                  potenciaPlacaWp: orc.potencia_placa_wp,
                                  marcaPlacas: orc.marca_painel,
                                  marcaInversor: orc.marca_inversor,
                                  quantidadeInversores: orc.quantidade_inversores,
                                  tipoEstrutura: orc.tipo_estrutura,
                                  orientacaoTelhado: orc.orientacao_telhado,
                                  areaNecessariaM2: orc.area_necessaria_m2,
                                  codigoFiname: orc.codigo_finame,
                                  prazoEntregaDias: 30,
                                },
                                calculos,
                                dataEmissao: orc.data_orcamento || orc.created,
                                validadeDias: orc.validade_dias || 5,
                                observacoes: orc.observacoes,
                              }

                              setOrcamentoParaWhatsApp({ cliente, orc, payload })
                              setModalWhatsAppOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-40"
                            title={
                              !cliente?.whatsapp && !cliente?.telefone
                                ? 'Cadastre o WhatsApp do cliente para enviar'
                                : 'Enviar orçamento PDF por WhatsApp'
                            }
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          {/* Baixar HTML */}
                          <button
                            onClick={() => gerarPDFParaRegistro(orc, 'baixar')}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                            title="Baixar Proposta em HTML"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Seletor Rápido de Status */}
                          <select
                            value={orc.status}
                            onChange={(e) =>
                              handleAlterarStatus(
                                orc,
                                e.target.value as OrcamentoSolarStatus,
                                e as unknown as React.MouseEvent,
                              )
                            }
                            className="text-[11px] font-semibold py-1 px-1.5 rounded border border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:outline-none"
                            title="Mudar status rapidamente"
                          >
                            <option value="Em elaboração">Em elaboração</option>
                            <option value="Enviado ao cliente">Enviado</option>
                            <option value="Aprovado">Aprovado</option>
                            <option value="Rejeitado">Rejeitado</option>
                          </select>

                          {/* Excluir */}
                          <button
                            onClick={(e) => handleExcluir(orc.id, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir orçamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Novo / Editar Orçamento */}
      <ModalOrcamentoSolar
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingOrcamento(null)
          setClienteParaNovoOrcamento('')
        }}
        initialClienteId={clienteParaNovoOrcamento}
        initialOrcamento={editingOrcamento}
      />

      {/* Modal Enviar Orçamento por WhatsApp */}
      {orcamentoParaWhatsApp && (
        <ModalEnviarDocumentoWhatsApp
          isOpen={modalWhatsAppOpen}
          onClose={() => {
            setModalWhatsAppOpen(false)
            setOrcamentoParaWhatsApp(null)
          }}
          cliente={orcamentoParaWhatsApp.cliente}
          tipo="orcamento_solar"
          referenciaId={orcamentoParaWhatsApp.orc.id}
          dadosSolar={orcamentoParaWhatsApp.payload}
        />
      )}
    </div>
  )
}
export default Orcamentos

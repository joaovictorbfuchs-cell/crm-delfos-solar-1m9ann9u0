import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Battery,
  BatteryCharging,
  Zap,
  Shield,
  FileText,
  Save,
  Printer,
  Copy,
  Building2,
  DollarSign,
  Cpu,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import type { Cliente, Negocio, BateriaOrcamento } from '@/types/crm'
import {
  salvarBateriaOrcamento,
  gerarValoresIniciaisBateria,
  type SalvarBateriaOrcamentoInput,
} from '@/services/bateriasOrcamentosService'
import {
  dimensionarSistemaBaterias,
  calcularCustosBateria,
  calcularParcelaPrice,
} from '@/lib/bateriaCalculos'
import {
  compilarDadosDocumentoBateria,
  gerarHTMLPropostaBateria,
} from '@/lib/propostaBateriaGenerator'
import { PreviewPropostaBateriaDocumento } from '@/components/PreviewPropostaBateriaDocumento'
import {
  getPercentualAdministracaoSolarPadrao,
  setPercentualAdministracaoSolarPadrao,
} from '@/services/configuracoesService'

interface ModalGeradorBateriaProps {
  open: boolean
  onClose: () => void
  clientes: Cliente[]
  negocios?: Negocio[]
  clientePreSelecionadoId?: string
  negocioPreSelecionadoId?: string
  orcamentoParaEdicao?: BateriaOrcamento | null
  onSucesso?: (orcamento: BateriaOrcamento) => void
}

type TabAtiva = 'dimensionamento' | 'custos' | 'pagamento' | 'preview'

export const ModalGeradorBateria: React.FC<ModalGeradorBateriaProps> = ({
  open,
  onClose,
  clientes,
  negocios = [],
  clientePreSelecionadoId,
  negocioPreSelecionadoId,
  orcamentoParaEdicao,
  onSucesso,
}) => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabAtiva>('dimensionamento')
  const [salvando, setSalvando] = useState(false)
  const [salvandoPercentualAdminPadrao, setSalvandoPercentualAdminPadrao] = useState(false)

  // Cliente e Negócio
  const [clienteId, setClienteId] = useState<string>('')
  const [negocioId, setNegocioId] = useState<string>('')
  const [numeroProposta, setNumeroProposta] = useState<string>('')
  const [validadeDias, setValidadeDias] = useState<number>(10)
  const [autor, setAutor] = useState<string>('João Victor Bagetti Fuchs')

  // Dimensionamento
  const [tipoAplicacao, setTipoAplicacao] = useState<string>('backup')
  const [consumoCriticoKwhDia, setConsumoCriticoKwhDia] = useState<number>(10.0)
  const [autonomiaHorasDesejada, setAutonomiaHorasDesejada] = useState<number>(12)
  const [potenciaPicoKw, setPotenciaPicoKw] = useState<number>(4.0)
  const [profundidadeDescargaDod, setProfundidadeDescargaDod] = useState<number>(90)
  const [tipoBateria, setTipoBateria] = useState<string>('LiFePO4')
  const [tensaoBancoV, setTensaoBancoV] = useState<number>(51.2)
  const [ciclosVidaEstimados, setCiclosVidaEstimados] = useState<number>(6000)

  // Equipamentos
  const [marcaBateria, setMarcaBateria] = useState<string>('Deye')
  const [modeloBateria, setModeloBateria] = useState<string>(
    'Bateria LiFePO4 5.12 kWh / 100Ah 51.2V',
  )
  const [quantidadeBaterias, setQuantidadeBaterias] = useState<number>(2)
  const [capacidadeKwh, setCapacidadeKwh] = useState<number>(10.24)
  const [capacidadeUtilKwh, setCapacidadeUtilKwh] = useState<number>(9.2)
  const [marcaInversorCarregador, setMarcaInversorCarregador] = useState<string>('Deye')
  const [modeloInversorCarregador, setModeloInversorCarregador] = useState<string>(
    'Inversor Híbrido 5kW Monofásico/Bifásico',
  )
  const [potenciaInversorKw, setPotenciaInversorKw] = useState<number>(5.0)

  // Custos (Mesmo modelo canônico do gerador solar)
  const [custoMateriaisEquipamentos, setCustoMateriaisEquipamentos] = useState<number>(28000)
  const [custoMateriaisExtras, setCustoMateriaisExtras] = useState<number>(1800)
  const [custoMaoDeObra, setCustoMaoDeObra] = useState<number>(2500)
  const [custoRiscoEngenharia, setCustoRiscoEngenharia] = useState<number>(600)
  const [custoFreteGuincho, setCustoFreteGuincho] = useState<number>(450)
  const [custoSubestacao, setCustoSubestacao] = useState<number>(0)
  const [custoTerceirizacao, setCustoTerceirizacao] = useState<number>(0)
  const [custoMarketingCombustivel, setCustoMarketingCombustivel] = useState<number>(200)

  const [opcaoImposto, setOpcaoImposto] = useState<number>(2)
  const [percentualAdministracaoAuto, setPercentualAdministracaoAuto] = useState<number>(15.0)
  const [percentualIndicacaoAuto, setPercentualIndicacaoAuto] = useState<number>(0)
  const [manualAdministracao, setManualAdministracao] = useState<boolean>(false)
  const [valorManualAdministracao, setValorManualAdministracao] = useState<number>(0)
  const [manualComissao, setManualComissao] = useState<boolean>(false)
  const [valorManualComissao, setValorManualComissao] = useState<number>(0)
  const [manualIndicacao, setManualIndicacao] = useState<boolean>(false)
  const [valorManualIndicacao, setValorManualIndicacao] = useState<number>(0)
  const [descontoValor, setDescontoValor] = useState<number>(0)
  const [valorInvestimentoFinal, setValorInvestimentoFinal] = useState<number>(0)
  const [investimentoManual, setInvestimentoManual] = useState<boolean>(false)

  // Pagamento e Garantias
  const [condicoesPagamento, setCondicoesPagamento] = useState<string>(
    'À vista com 5% de desconto via TED/Pix, ou parcelado em até 18x no cartão de crédito ou até 60x via financiamento bancário solar/baterias.',
  )
  const [parcelasCartao, setParcelasCartao] = useState<number>(12)
  const [jurosCartao, setJurosCartao] = useState<number>(1.49)
  const [parcelasFinanciamento, setParcelasFinanciamento] = useState<number>(60)
  const [jurosFinanciamento, setJurosFinanciamento] = useState<number>(1.39)

  const [garantiaBateriasAnos, setGarantiaBateriasAnos] = useState<number>(10)
  const [garantiaInversorAnos, setGarantiaInversorAnos] = useState<number>(5)
  const [garantiaInstalacaoAnos, setGarantiaInstalacaoAnos] = useState<number>(1)
  const [prazoInstalacaoDias, setPrazoInstalacaoDias] = useState<number>(15)
  const [observacoes, setObservacoes] = useState<string>('')

  // Clientes disponíveis
  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === clienteId) || null
  }, [clientes, clienteId])

  const negociosDoCliente = useMemo(() => {
    if (!clienteId) return []
    return negocios.filter((n) => n.cliente_id === clienteId)
  }, [negocios, clienteId])

  // Carregar padrão do percentual de administração
  useEffect(() => {
    getPercentualAdministracaoSolarPadrao().then((pct) => {
      if (pct && !orcamentoParaEdicao) {
        setPercentualAdministracaoAuto(pct)
      }
    })
  }, [orcamentoParaEdicao])

  // Inicialização do formulário ao abrir
  const inicializadoRef = useRef(false)
  useEffect(() => {
    if (!open) {
      inicializadoRef.current = false
      return
    }
    if (inicializadoRef.current) return
    inicializadoRef.current = true

    if (orcamentoParaEdicao) {
      // Modo Edição
      setClienteId(orcamentoParaEdicao.cliente_id || '')
      setNegocioId(orcamentoParaEdicao.negocio_id || '')
      setNumeroProposta(orcamentoParaEdicao.numero_proposta || '')
      setValidadeDias(orcamentoParaEdicao.validade_dias || 10)
      setAutor(orcamentoParaEdicao.autor || 'João Victor Bagetti Fuchs')

      setTipoAplicacao(orcamentoParaEdicao.tipo_aplicacao || 'backup')
      setConsumoCriticoKwhDia(orcamentoParaEdicao.consumo_critico_kwh_dia || 10.0)
      setAutonomiaHorasDesejada(orcamentoParaEdicao.autonomia_horas || 12)
      setProfundidadeDescargaDod(orcamentoParaEdicao.profundidade_descarga_dod || 90)
      setTipoBateria(orcamentoParaEdicao.tipo_bateria || 'LiFePO4')
      setTensaoBancoV(orcamentoParaEdicao.tensao_banco_v || 51.2)
      setCiclosVidaEstimados(orcamentoParaEdicao.ciclos_vida_estimados || 6000)

      setMarcaBateria(orcamentoParaEdicao.marca_bateria || 'Deye')
      setModeloBateria(orcamentoParaEdicao.modelo_bateria || '')
      setQuantidadeBaterias(orcamentoParaEdicao.quantidade_baterias || 2)
      setCapacidadeKwh(orcamentoParaEdicao.capacidade_kwh || 10.24)
      setCapacidadeUtilKwh(orcamentoParaEdicao.capacidade_util_kwh || 9.2)
      setMarcaInversorCarregador(orcamentoParaEdicao.marca_inversor_carregador || 'Deye')
      setModeloInversorCarregador(orcamentoParaEdicao.modelo_inversor_carregador || '')
      setPotenciaInversorKw(orcamentoParaEdicao.potencia_inversor_kw || 5.0)

      setCustoMateriaisEquipamentos(orcamentoParaEdicao.custo_materiais_equipamentos || 0)
      setCustoMateriaisExtras(orcamentoParaEdicao.custo_materiais_extras || 0)
      setCustoMaoDeObra(orcamentoParaEdicao.custo_mao_de_obra || 0)
      setCustoRiscoEngenharia(orcamentoParaEdicao.custo_risco_engenharia || 0)
      setCustoFreteGuincho(orcamentoParaEdicao.custo_frete_guincho || 0)
      setCustoSubestacao(orcamentoParaEdicao.custo_subestacao || 0)
      setCustoTerceirizacao(orcamentoParaEdicao.custo_terceirizacao || 0)
      setCustoMarketingCombustivel(orcamentoParaEdicao.custo_marketing_combustivel || 0)

      setOpcaoImposto(orcamentoParaEdicao.opcao_imposto || 2)
      setPercentualAdministracaoAuto(
        orcamentoParaEdicao.percentual_administracao_auto
          ? orcamentoParaEdicao.percentual_administracao_auto * 100
          : 15.0,
      )
      setPercentualIndicacaoAuto(
        orcamentoParaEdicao.percentual_indicacao_auto
          ? orcamentoParaEdicao.percentual_indicacao_auto * 100
          : 0,
      )
      setManualAdministracao(Boolean(orcamentoParaEdicao.manual_administracao))
      setValorManualAdministracao(orcamentoParaEdicao.valor_manual_administracao || 0)
      setManualComissao(Boolean(orcamentoParaEdicao.manual_comissao))
      setValorManualComissao(orcamentoParaEdicao.valor_manual_comissao || 0)
      setManualIndicacao(Boolean(orcamentoParaEdicao.manual_indicacao))
      setValorManualIndicacao(orcamentoParaEdicao.valor_manual_indicacao || 0)
      setDescontoValor(orcamentoParaEdicao.desconto || 0)
      setValorInvestimentoFinal(orcamentoParaEdicao.valor_investimento || 0)
      setInvestimentoManual(true)

      setCondicoesPagamento(orcamentoParaEdicao.condicoes_pagamento || '')
      setParcelasCartao(orcamentoParaEdicao.parcelas_cartao || 12)
      setJurosCartao(orcamentoParaEdicao.juros_cartao || 1.49)
      setParcelasFinanciamento(orcamentoParaEdicao.parcelas_financiamento || 60)
      setJurosFinanciamento(orcamentoParaEdicao.juros_financiamento || 1.39)

      setGarantiaBateriasAnos(orcamentoParaEdicao.garantia_baterias_anos || 10)
      setGarantiaInversorAnos(orcamentoParaEdicao.garantia_inversor_anos || 5)
      setGarantiaInstalacaoAnos(orcamentoParaEdicao.garantia_instalacao_anos || 1)
      setPrazoInstalacaoDias(orcamentoParaEdicao.prazo_instalacao_dias || 15)
      setObservacoes(orcamentoParaEdicao.observacoes || '')
    } else {
      // Modo Novo
      const cli = clientes.find((c) => c.id === clientePreSelecionadoId) || null
      const iniciais = gerarValoresIniciaisBateria(cli, autor, percentualAdministracaoAuto)
      setClienteId(clientePreSelecionadoId || (clientes[0]?.id ?? ''))
      setNegocioId(negocioPreSelecionadoId || '')
      setNumeroProposta(iniciais.numero_proposta || '')
      setValidadeDias(iniciais.validade_dias || 10)
      setAutor(iniciais.autor || 'João Victor Bagetti Fuchs')

      setTipoAplicacao(iniciais.tipo_aplicacao || 'backup')
      setConsumoCriticoKwhDia(iniciais.consumo_critico_kwh_dia || 10.0)
      setAutonomiaHorasDesejada(iniciais.autonomia_horas || 12)
      setProfundidadeDescargaDod(iniciais.profundidade_descarga_dod || 90)
      setTipoBateria(iniciais.tipo_bateria || 'LiFePO4')
      setTensaoBancoV(iniciais.tensao_banco_v || 51.2)
      setCiclosVidaEstimados(iniciais.ciclos_vida_estimados || 6000)

      setMarcaBateria(iniciais.marca_bateria || 'Deye')
      setModeloBateria(iniciais.modelo_bateria || '')
      setQuantidadeBaterias(iniciais.quantidade_baterias || 2)
      setCapacidadeKwh(iniciais.capacidade_kwh || 10.24)
      setCapacidadeUtilKwh(iniciais.capacidade_util_kwh || 9.2)
      setMarcaInversorCarregador(iniciais.marca_inversor_carregador || 'Deye')
      setModeloInversorCarregador(iniciais.modelo_inversor_carregador || '')
      setPotenciaInversorKw(iniciais.potencia_inversor_kw || 5.0)

      setCustoMateriaisEquipamentos(iniciais.custo_materiais_equipamentos || 28000)
      setCustoMateriaisExtras(iniciais.custo_materiais_extras || 1800)
      setCustoMaoDeObra(iniciais.custo_mao_de_obra || 2500)
      setCustoRiscoEngenharia(iniciais.custo_risco_engenharia || 600)
      setCustoFreteGuincho(iniciais.custo_frete_guincho || 450)
      setCustoSubestacao(0)
      setCustoTerceirizacao(0)
      setCustoMarketingCombustivel(200)

      setOpcaoImposto(2)
      setManualAdministracao(false)
      setManualComissao(false)
      setManualIndicacao(false)
      setDescontoValor(0)
      setInvestimentoManual(false)

      setCondicoesPagamento(iniciais.condicoes_pagamento || '')
      setParcelasCartao(12)
      setJurosCartao(1.49)
      setParcelasFinanciamento(60)
      setJurosFinanciamento(1.39)

      setGarantiaBateriasAnos(10)
      setGarantiaInversorAnos(5)
      setGarantiaInstalacaoAnos(1)
      setPrazoInstalacaoDias(15)
      setObservacoes('')
      setActiveTab('dimensionamento')
    }
  }, [
    open,
    orcamentoParaEdicao,
    clientePreSelecionadoId,
    negocioPreSelecionadoId,
    clientes,
    autor,
    percentualAdministracaoAuto,
  ])

  // Recalcular dimensionamento sob demanda
  const resultadoDimensionamento = useMemo(() => {
    return dimensionarSistemaBaterias({
      consumoCriticoKwhDia,
      autonomiaHorasDesejada,
      profundidadeDescargaDod,
      potenciaPicoCargasKw: potenciaPicoKw,
    })
  }, [consumoCriticoKwhDia, autonomiaHorasDesejada, profundidadeDescargaDod, potenciaPicoKw])

  const aplicarDimensionamentoSugerido = () => {
    setCapacidadeKwh(resultadoDimensionamento.capacidadeNominalMinimaKwh)
    setCapacidadeUtilKwh(resultadoDimensionamento.capacidadeUtilNecessariaKwh)
    setPotenciaInversorKw(resultadoDimensionamento.potenciaInversorSugeridaKw)
    setQuantidadeBaterias(resultadoDimensionamento.quantidadeModulosSugerida)
    toast({
      title: 'Dimensionamento aplicado',
      description: `Capacidade calculada: ${resultadoDimensionamento.capacidadeNominalMinimaKwh} kWh (${resultadoDimensionamento.quantidadeModulosSugerida} módulos de ~5.12 kWh).`,
    })
  }

  // Recalcular custos e alíquotas
  const resultadoCustos = useMemo(() => {
    return calcularCustosBateria({
      materiaisEquipamentos: custoMateriaisEquipamentos,
      materiaisExtras: custoMateriaisExtras,
      maoDeObra: custoMaoDeObra,
      riscoEngenharia: custoRiscoEngenharia,
      freteGuincho: custoFreteGuincho,
      subestacao: custoSubestacao,
      terceirizacao: custoTerceirizacao,
      marketingCombustivel: custoMarketingCombustivel,
      opcaoImposto,
      desconto: descontoValor,
      percentualAdministracaoAuto: percentualAdministracaoAuto / 100,
      percentualIndicacaoAuto: percentualIndicacaoAuto / 100,
      manualAdministracao,
      valorManualAdministracao,
      manualComissao,
      valorManualComissao,
      manualIndicacao,
      valorManualIndicacao,
    })
  }, [
    custoMateriaisEquipamentos,
    custoMateriaisExtras,
    custoMaoDeObra,
    custoRiscoEngenharia,
    custoFreteGuincho,
    custoSubestacao,
    custoTerceirizacao,
    custoMarketingCombustivel,
    opcaoImposto,
    descontoValor,
    percentualAdministracaoAuto,
    percentualIndicacaoAuto,
    manualAdministracao,
    valorManualAdministracao,
    manualComissao,
    valorManualComissao,
    manualIndicacao,
    valorManualIndicacao,
  ])

  // Total a ser considerado na proposta
  const valorTotalFinal = investimentoManual ? valorInvestimentoFinal : resultadoCustos.valorTotal

  // Parcelamento
  const parcelaCartaoCalculada = useMemo(() => {
    return calcularParcelaPrice(valorTotalFinal, parcelasCartao, jurosCartao)
  }, [valorTotalFinal, parcelasCartao, jurosCartao])

  const parcelaFinanciamentoCalculada = useMemo(() => {
    return calcularParcelaPrice(valorTotalFinal, parcelasFinanciamento, jurosFinanciamento)
  }, [valorTotalFinal, parcelasFinanciamento, jurosFinanciamento])

  // Dados compilados para visualização do documento
  const dadosDocumento = useMemo(() => {
    const r: Partial<BateriaOrcamento> = {
      numero_proposta: numeroProposta,
      validade_dias: validadeDias,
      autor,
      data_orcamento: new Date().toISOString().split('T')[0],

      tipo_aplicacao: tipoAplicacao,
      capacidade_kwh: capacidadeKwh,
      capacidade_util_kwh: capacidadeUtilKwh,
      potencia_inversor_kw: potenciaInversorKw,
      tensao_banco_v: tensaoBancoV,
      autonomia_horas: autonomiaHorasDesejada,
      consumo_critico_kwh_dia: consumoCriticoKwhDia,
      tipo_bateria: tipoBateria,
      profundidade_descarga_dod: profundidadeDescargaDod,
      ciclos_vida_estimados: ciclosVidaEstimados,

      marca_bateria: marcaBateria,
      modelo_bateria: modeloBateria,
      quantidade_baterias: quantidadeBaterias,
      marca_inversor_carregador: marcaInversorCarregador,
      modelo_inversor_carregador: modeloInversorCarregador,

      valor_investimento: valorTotalFinal,
      condicoes_pagamento: condicoesPagamento,
      parcelas_cartao: parcelasCartao,
      parcela_cartao: parcelaCartaoCalculada,
      parcelas_financiamento: parcelasFinanciamento,
      parcela_financiamento: parcelaFinanciamentoCalculada,

      garantia_baterias_anos: garantiaBateriasAnos,
      garantia_inversor_anos: garantiaInversorAnos,
      garantia_instalacao_anos: garantiaInstalacaoAnos,
      prazo_instalacao_dias: prazoInstalacaoDias,
      observacoes,
    }

    return compilarDadosDocumentoBateria(r, clienteSelecionado)
  }, [
    numeroProposta,
    validadeDias,
    autor,
    tipoAplicacao,
    capacidadeKwh,
    capacidadeUtilKwh,
    potenciaInversorKw,
    tensaoBancoV,
    autonomiaHorasDesejada,
    consumoCriticoKwhDia,
    tipoBateria,
    profundidadeDescargaDod,
    ciclosVidaEstimados,
    marcaBateria,
    modeloBateria,
    quantidadeBaterias,
    marcaInversorCarregador,
    modeloInversorCarregador,
    valorTotalFinal,
    condicoesPagamento,
    parcelasCartao,
    parcelaCartaoCalculada,
    parcelasFinanciamento,
    parcelaFinanciamentoCalculada,
    garantiaBateriasAnos,
    garantiaInversorAnos,
    garantiaInstalacaoAnos,
    prazoInstalacaoDias,
    observacoes,
    clienteSelecionado,
  ])

  // Salvar Orçamento
  const handleSalvar = async () => {
    if (!clienteId) {
      toast({
        title: 'Selecione um cliente',
        description: 'É obrigatório selecionar um cliente para salvar o orçamento de bateria.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvando(true)

      const payload: SalvarBateriaOrcamentoInput = {
        id: orcamentoParaEdicao?.id,
        numero_proposta: numeroProposta,
        cliente_id: clienteId,
        negocio_id: negocioId || undefined,
        data_orcamento: new Date().toISOString().split('T')[0],
        validade_dias: validadeDias,
        autor,
        tipo_cliente: clienteSelecionado?.tipo_cliente || 'residencial',
        status: orcamentoParaEdicao?.status || 'Em elaboração',

        tipo_aplicacao: tipoAplicacao,
        capacidade_kwh: capacidadeKwh,
        capacidade_util_kwh: capacidadeUtilKwh,
        potencia_inversor_kw: potenciaInversorKw,
        tensao_banco_v: tensaoBancoV,
        autonomia_horas: autonomiaHorasDesejada,
        consumo_critico_kwh_dia: consumoCriticoKwhDia,
        tipo_bateria: tipoBateria,
        profundidade_descarga_dod: profundidadeDescargaDod,
        ciclos_vida_estimados: ciclosVidaEstimados,

        marca_bateria: marcaBateria,
        modelo_bateria: modeloBateria,
        quantidade_baterias: quantidadeBaterias,
        marca_inversor_carregador: marcaInversorCarregador,
        modelo_inversor_carregador: modeloInversorCarregador,

        custo_materiais_equipamentos: custoMateriaisEquipamentos,
        custo_materiais_extras: custoMateriaisExtras,
        custo_mao_de_obra: custoMaoDeObra,
        custo_risco_engenharia: custoRiscoEngenharia,
        custo_frete_guincho: custoFreteGuincho,
        custo_subestacao: custoSubestacao,
        custo_terceirizacao: custoTerceirizacao,
        custo_marketing_combustivel: custoMarketingCombustivel,
        custo_administracao: resultadoCustos.administracao,
        custo_comissao_comercial: resultadoCustos.comissaoComercial,
        custo_indicacao: resultadoCustos.indicacao,
        custo_impostos: resultadoCustos.impostos,
        opcao_imposto: opcaoImposto,
        desconto: descontoValor,
        percentual_administracao_auto: percentualAdministracaoAuto / 100,
        percentual_indicacao_auto: percentualIndicacaoAuto / 100,
        manual_administracao: manualAdministracao,
        valor_manual_administracao: valorManualAdministracao,
        manual_comissao: manualComissao,
        valor_manual_comissao: valorManualComissao,
        manual_indicacao: manualIndicacao,
        valor_manual_indicacao: valorManualIndicacao,
        valor_total_custos: resultadoCustos.valorTotal,
        valor_investimento: valorTotalFinal,

        condicoes_pagamento: condicoesPagamento,
        parcelas_cartao: parcelasCartao,
        juros_cartao: jurosCartao,
        parcela_cartao: parcelaCartaoCalculada,
        parcelas_financiamento: parcelasFinanciamento,
        juros_financiamento: jurosFinanciamento,
        parcela_financiamento: parcelaFinanciamentoCalculada,

        garantia_baterias_anos: garantiaBateriasAnos,
        garantia_inversor_anos: garantiaInversorAnos,
        garantia_instalacao_anos: garantiaInstalacaoAnos,
        prazo_instalacao_dias: prazoInstalacaoDias,
        observacoes,
      }

      const salvo = await salvarBateriaOrcamento(payload)
      toast({
        title: 'Proposta salva com sucesso!',
        description: `Orçamento ${salvo.numero_proposta} registrado no sistema.`,
      })

      if (onSucesso) {
        onSucesso(salvo)
      }
      onClose()
    } catch (err) {
      console.error('Erro ao salvar orçamento de bateria:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao gravar a proposta. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Imprimir ou gerar PDF
  const handleImprimir = () => {
    const html = gerarHTMLPropostaBateria(dadosDocumento)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => {
        win.print()
      }, 350)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header Superior */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-slate-50/80 shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <BatteryCharging className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    Gerador de Baterias
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold text-xs"
                    >
                      BESS &amp; Híbrido
                    </Badge>
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Dimensionamento técnico, formação de custos turnkey e proposta comercial para
                    armazenamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleImprimir}
                className="text-xs h-8 gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir / PDF
              </Button>
              <Button
                size="sm"
                onClick={handleSalvar}
                disabled={salvando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {salvando ? 'Salvando...' : 'Salvar Proposta'}
              </Button>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-2 pt-3 border-t mt-3 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('dimensionamento')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'dimensionamento'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              1. Cliente &amp; Dimensionamento
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custos')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'custos'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              2. Formação de Custos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pagamento')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'pagamento'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              3. Pagamento &amp; Garantias
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'preview'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              4. Preview da Proposta
            </button>
          </div>
        </DialogHeader>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
          {/* ========================================================================= */}
          {/* ABA 1: CLIENTE & DIMENSIONAMENTO                                          */}
          {/* ========================================================================= */}
          {activeTab === 'dimensionamento' && (
            <div className="space-y-6">
              {/* Bloco 1: Seleção de Cliente e Negócio */}
              <Card className="p-4 bg-white border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-3">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Dados Gerais da Proposta
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Cliente *</label>
                    <select
                      value={clienteId}
                      onChange={(e) => {
                        setClienteId(e.target.value)
                        setNegocioId('')
                      }}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razao_social || c.nome} {c.cidade ? `(${c.cidade})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Negócio Vinculado (Opcional)
                    </label>
                    <select
                      value={negocioId}
                      onChange={(e) => setNegocioId(e.target.value)}
                      disabled={!clienteId || negociosDoCliente.length === 0}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800 disabled:opacity-50"
                    >
                      <option value="">Nenhum negócio vinculado</option>
                      {negociosDoCliente.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.titulo} ({formatCurrency(n.valor || 0)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Consultor / Autor
                    </label>
                    <input
                      type="text"
                      value={autor}
                      onChange={(e) => setAutor(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-3 pt-3 border-t">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Número da Proposta
                    </label>
                    <input
                      type="text"
                      value={numeroProposta}
                      onChange={(e) => setNumeroProposta(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Validade da Proposta (dias)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={validadeDias}
                      onChange={(e) => setValidadeDias(Number(e.target.value) || 10)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                </div>
              </Card>

              {/* Bloco 2: Calculadora de Dimensionamento */}
              <Card className="p-4 bg-white border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b gap-2 mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Battery className="h-4 w-4 text-emerald-600" />
                      Dimensionamento de Armazenamento
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Informe a demanda crítica e a autonomia desejada para calcular o banco
                      necessário.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={aplicarDimensionamentoSugerido}
                    className="text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    Aplicar Dimensionamento Calculado
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Aplicação do Sistema
                    </label>
                    <select
                      value={tipoAplicacao}
                      onChange={(e) => setTipoAplicacao(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    >
                      <option value="backup">Backup / No-Break</option>
                      <option value="peak_shaving">Peak Shaving (Horário de Pico)</option>
                      <option value="autoconsumo">Autoconsumo Solar</option>
                      <option value="off_grid">Off-Grid (Isolado)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Consumo Crítico (kWh/dia)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={0.5}
                      value={consumoCriticoKwhDia}
                      onChange={(e) => setConsumoCriticoKwhDia(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Autonomia Desejada (horas)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={autonomiaHorasDesejada}
                      onChange={(e) => setAutonomiaHorasDesejada(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Pico Instantâneo (kW)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={1}
                      value={potenciaPicoKw}
                      onChange={(e) => setPotenciaPicoKw(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* KPI Dimensionamento Recomendado */}
                <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900">
                        Dimensionamento Recomendado:{' '}
                      </span>
                      <span className="text-emerald-800">
                        {resultadoDimensionamento.capacidadeNominalMinimaKwh} kWh nominal (
                        {resultadoDimensionamento.capacidadeUtilNecessariaKwh} kWh úteis) • Inversor
                        sugerido: {resultadoDimensionamento.potenciaInversorSugeridaKw} kW
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-white text-emerald-800 border-emerald-300 font-bold shrink-0"
                  >
                    {resultadoDimensionamento.quantidadeModulosSugerida}x módulos 5.12 kWh
                  </Badge>
                </div>
              </Card>

              {/* Bloco 3: Equipamentos Definidos */}
              <Card className="p-4 bg-white border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-3">
                  <Cpu className="h-4 w-4 text-emerald-600" />
                  Especificação dos Equipamentos
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Marca da Bateria
                    </label>
                    <input
                      type="text"
                      value={marcaBateria}
                      onChange={(e) => setMarcaBateria(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Modelo do Módulo / Banco
                    </label>
                    <input
                      type="text"
                      value={modeloBateria}
                      onChange={(e) => setModeloBateria(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Quantidade de Módulos
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantidadeBaterias}
                      onChange={(e) => {
                        const q = Math.max(1, Number(e.target.value) || 1)
                        setQuantidadeBaterias(q)
                        setCapacidadeKwh(Math.round(q * 5.12 * 100) / 100)
                        setCapacidadeUtilKwh(Math.round(q * 5.12 * 0.9 * 100) / 100)
                      }}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Capacidade Total Nominal (kWh)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={capacidadeKwh}
                      onChange={(e) => setCapacidadeKwh(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Capacidade Útil (kWh)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={capacidadeUtilKwh}
                      onChange={(e) => setCapacidadeUtilKwh(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Marca do Inversor Híbrido
                    </label>
                    <input
                      type="text"
                      value={marcaInversorCarregador}
                      onChange={(e) => setMarcaInversorCarregador(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Modelo do Inversor
                    </label>
                    <input
                      type="text"
                      value={modeloInversorCarregador}
                      onChange={(e) => setModeloInversorCarregador(e.target.value)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Potência Inversor (kW)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      value={potenciaInversorKw}
                      onChange={(e) => setPotenciaInversorKw(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800 font-bold"
                    />
                  </div>
                </div>
              </Card>

              {/* Botão de Avanço */}
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => setActiveTab('custos')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <span>Avançar para Formação de Custos</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: FORMAÇÃO DE CUSTOS (PADRÃO DELFOS SOLAR)                           */}
          {/* ========================================================================= */}
          {activeTab === 'custos' && (
            <div className="space-y-6">
              <Card className="p-4 bg-white border-slate-200">
                <div className="flex justify-between items-center pb-2 border-b mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Planilha de Formação de Custos Turnkey
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Mesmo motor contábil do orçamento solar: alíquotas oficiais, piso comercial e
                      taxa de administração.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-xs"
                  >
                    Total: {formatCurrency(resultadoCustos.valorTotal)}
                  </Badge>
                </div>

                {/* Custos Diretos */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Equipamentos Baterias/Inversor (R$) *
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={custoMateriaisEquipamentos || ''}
                      onChange={(e) => setCustoMateriaisEquipamentos(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-emerald-300 bg-emerald-50/20 text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Materiais Extras / Cabos / ATS (R$)
                    </label>
                    <input
                      type="number"
                      step={50}
                      value={custoMateriaisExtras || ''}
                      onChange={(e) => setCustoMateriaisExtras(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Mão de Obra e Instalação (R$)
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={custoMaoDeObra || ''}
                      onChange={(e) => setCustoMaoDeObra(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Risco de Engenharia (R$)
                    </label>
                    <input
                      type="number"
                      step={50}
                      value={custoRiscoEngenharia || ''}
                      onChange={(e) => setCustoRiscoEngenharia(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Frete / Logística (R$)
                    </label>
                    <input
                      type="number"
                      step={50}
                      value={custoFreteGuincho || ''}
                      onChange={(e) => setCustoFreteGuincho(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Marketing / Deslocamento (R$)
                    </label>
                    <input
                      type="number"
                      step={50}
                      value={custoMarketingCombustivel || ''}
                      onChange={(e) => setCustoMarketingCombustivel(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Regime de Imposto
                    </label>
                    <select
                      value={opcaoImposto}
                      onChange={(e) => setOpcaoImposto(Number(e.target.value))}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white text-slate-800 font-semibold"
                    >
                      <option value={2}>Opção 2: 16% sobre Serviços/Margem</option>
                      <option value={1}>Opção 1: 9,23% sobre Faturamento Total</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Desconto Comercial (R$)
                    </label>
                    <input
                      type="number"
                      step={100}
                      value={descontoValor || ''}
                      onChange={(e) => setDescontoValor(Number(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 rounded border border-amber-300 bg-amber-50/30 text-amber-900 font-bold"
                    />
                  </div>
                </div>

                {/* Margens, Administração e Comissões */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mt-6 pt-4 border-t">
                  {/* Taxa de Administração Editável + Salvar como padrão */}
                  <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">1. Taxa de Administração</span>
                      <button
                        type="button"
                        onClick={() => setManualAdministracao(!manualAdministracao)}
                        className="text-[10px] font-bold text-emerald-700 underline"
                      >
                        {manualAdministracao ? 'Usar % auto' : 'Definir R$ manual'}
                      </button>
                    </div>

                    {!manualAdministracao ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step={0.5}
                            min={0}
                            max={100}
                            value={percentualAdministracaoAuto}
                            onChange={(e) =>
                              setPercentualAdministracaoAuto(Number(e.target.value) || 0)
                            }
                            className="w-20 h-7 px-2 rounded border border-slate-300 bg-white font-bold text-right"
                          />
                          <span className="font-bold text-slate-600">%</span>

                          <button
                            type="button"
                            disabled={salvandoPercentualAdminPadrao}
                            onClick={async () => {
                              try {
                                setSalvandoPercentualAdminPadrao(true)
                                const salvo = await setPercentualAdministracaoSolarPadrao(
                                  percentualAdministracaoAuto,
                                )
                                setPercentualAdministracaoAuto(salvo)
                                toast({
                                  title: 'Padrão salvo!',
                                  description: `Taxa padrão configurada em ${salvo}% para futuras propostas.`,
                                })
                              } catch {
                                toast({
                                  title: 'Erro ao salvar padrão',
                                  variant: 'destructive',
                                })
                              } finally {
                                setSalvandoPercentualAdminPadrao(false)
                              }
                            }}
                            className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded"
                          >
                            {salvandoPercentualAdminPadrao ? 'Salvando...' : 'Salvar como padrão'}
                          </button>
                        </div>
                        <div className="text-base font-black text-emerald-800">
                          {formatCurrency(resultadoCustos.administracao)}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="number"
                          step={100}
                          value={valorManualAdministracao || ''}
                          onChange={(e) => setValorManualAdministracao(Number(e.target.value) || 0)}
                          className="w-full h-8 px-2 rounded border border-amber-300 bg-white font-bold"
                          placeholder="Valor em R$"
                        />
                      </div>
                    )}
                  </div>

                  {/* Comissão Comercial */}
                  <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">2. Comissão Comercial (3%)</span>
                      <button
                        type="button"
                        onClick={() => setManualComissao(!manualComissao)}
                        className="text-[10px] font-bold text-emerald-700 underline"
                      >
                        {manualComissao ? 'Usar Auto (piso R$ 600)' : 'Definir R$ manual'}
                      </button>
                    </div>

                    {!manualComissao ? (
                      <div>
                        <div className="text-base font-black text-emerald-800">
                          {formatCurrency(resultadoCustos.comissaoComercial)}
                        </div>
                        {resultadoCustos.comissaoUsouPisoMinimo && (
                          <span className="text-[10px] text-amber-700 font-semibold">
                            Piso mínimo de R$ 600 aplicado
                          </span>
                        )}
                      </div>
                    ) : (
                      <input
                        type="number"
                        step={50}
                        value={valorManualComissao || ''}
                        onChange={(e) => setValorManualComissao(Number(e.target.value) || 0)}
                        className="w-full h-8 px-2 rounded border border-amber-300 bg-white font-bold"
                        placeholder="Valor em R$"
                      />
                    )}
                  </div>

                  {/* Impostos Calculados */}
                  <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                    <span className="font-bold text-slate-800 block">3. Impostos Fiscais</span>
                    <div className="text-base font-black text-emerald-800">
                      {formatCurrency(resultadoCustos.impostos)}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Calculado automaticamente conforme alíquota selecionada
                    </span>
                  </div>
                </div>

                {/* Resumo Final de Custos */}
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-emerald-800">
                      Investimento Final da Proposta Turnkey
                    </span>
                    <div className="text-2xl font-black text-emerald-950">
                      {formatCurrency(valorTotalFinal)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="investimentoManualBateria"
                      checked={investimentoManual}
                      onChange={(e) => {
                        setInvestimentoManual(e.target.checked)
                        if (e.target.checked && !valorInvestimentoFinal) {
                          setValorInvestimentoFinal(resultadoCustos.valorTotal)
                        }
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <label
                      htmlFor="investimentoManualBateria"
                      className="text-xs text-slate-700 font-medium"
                    >
                      Ajustar valor final manualmente (R$)
                    </label>
                    {investimentoManual && (
                      <input
                        type="number"
                        step={100}
                        value={valorInvestimentoFinal || ''}
                        onChange={(e) => setValorInvestimentoFinal(Number(e.target.value) || 0)}
                        className="w-32 h-8 px-2 rounded border border-emerald-400 bg-white font-bold text-xs"
                      />
                    )}
                  </div>
                </div>
              </Card>

              {/* Botões de Navegação */}
              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('dimensionamento')}
                  className="text-xs"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab('pagamento')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <span>Avançar para Pagamento &amp; Garantias</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: PAGAMENTO & GARANTIAS                                              */}
          {/* ========================================================================= */}
          {activeTab === 'pagamento' && (
            <div className="space-y-6">
              <Card className="p-4 bg-white border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-3">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  Condições de Pagamento &amp; Financiamento
                </h3>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Texto das Condições Comerciais na Proposta
                    </label>
                    <textarea
                      rows={3}
                      value={condicoesPagamento}
                      onChange={(e) => setCondicoesPagamento(e.target.value)}
                      className="w-full p-2.5 rounded border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t">
                    {/* Cartão de Crédito */}
                    <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                      <div className="font-bold text-slate-800">Simulação Cartão de Crédito</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-600">Parcelas</label>
                          <input
                            type="number"
                            min={1}
                            max={24}
                            value={parcelasCartao}
                            onChange={(e) => setParcelasCartao(Number(e.target.value) || 12)}
                            className="w-full h-7 px-2 rounded border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600">Taxa a.m. (%)</label>
                          <input
                            type="number"
                            step={0.1}
                            value={jurosCartao}
                            onChange={(e) => setJurosCartao(Number(e.target.value) || 0)}
                            className="w-full h-7 px-2 rounded border border-slate-300 bg-white"
                          />
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-emerald-800 mt-2">
                        Resultado: {parcelasCartao}x de {formatCurrency(parcelaCartaoCalculada)}
                      </div>
                    </div>

                    {/* Financiamento Solar/Baterias */}
                    <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                      <div className="font-bold text-slate-800">
                        Simulação Financiamento Bancário
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-600">Parcelas</label>
                          <input
                            type="number"
                            min={12}
                            max={120}
                            value={parcelasFinanciamento}
                            onChange={(e) => setParcelasFinanciamento(Number(e.target.value) || 60)}
                            className="w-full h-7 px-2 rounded border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600">Taxa a.m. (%)</label>
                          <input
                            type="number"
                            step={0.1}
                            value={jurosFinanciamento}
                            onChange={(e) => setJurosFinanciamento(Number(e.target.value) || 0)}
                            className="w-full h-7 px-2 rounded border border-slate-300 bg-white"
                          />
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-emerald-800 mt-2">
                        Resultado: {parcelasFinanciamento}x de{' '}
                        {formatCurrency(parcelaFinanciamentoCalculada)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Garantias */}
              <Card className="p-4 bg-white border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-3">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Garantias &amp; Cronograma
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Garantia Baterias (anos)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={garantiaBateriasAnos}
                      onChange={(e) => setGarantiaBateriasAnos(Number(e.target.value) || 10)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Garantia Inversor (anos)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={garantiaInversorAnos}
                      onChange={(e) => setGarantiaInversorAnos(Number(e.target.value) || 5)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Garantia Instalação (anos)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={garantiaInstalacaoAnos}
                      onChange={(e) => setGarantiaInstalacaoAnos(Number(e.target.value) || 1)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Prazo de Instalação (dias úteis)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={prazoInstalacaoDias}
                      onChange={(e) => setPrazoInstalacaoDias(Number(e.target.value) || 15)}
                      className="w-full h-8 px-2.5 rounded border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t text-xs">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Observações Técnicas Adicionais (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Instalação inclui quadro de transferência comutadora automática (ATS) para circuitos prioritários do quadro geral..."
                    className="w-full p-2.5 rounded border border-slate-300 bg-white text-slate-800"
                  />
                </div>
              </Card>

              {/* Botões de Navegação */}
              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('custos')}
                  className="text-xs"
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <span>Avançar para Visualizar Proposta</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: PREVIEW DA PROPOSTA                                                */}
          {/* ========================================================================= */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-3 rounded-lg border">
                <div className="text-xs text-slate-600">
                  Visualização em tempo real do documento timbrado que será emitido para o cliente.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImprimir}
                    className="text-xs h-7 gap-1"
                  >
                    <Printer className="h-3 w-3" />
                    Imprimir / Salvar PDF
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSalvar}
                    disabled={salvando}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1"
                  >
                    <Save className="h-3 w-3" />
                    {salvando ? 'Salvando...' : 'Salvar Proposta'}
                  </Button>
                </div>
              </div>

              <PreviewPropostaBateriaDocumento dados={dadosDocumento} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

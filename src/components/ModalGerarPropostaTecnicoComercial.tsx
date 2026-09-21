import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Printer,
  Mail,
  Edit3,
  Eye,
  CheckCircle,
  AlertCircle,
  Images,
  Info,
  Calendar,
  ShieldCheck,
  Zap,
  DollarSign,
  Maximize2,
  X,
  ExternalLink,
} from 'lucide-react'
import type { OrcamentoSolarCalculado, Cliente } from '@/types/crm'
import type { InstalacaoGaleria } from '@/types/instalacoesGaleria'
import { fetchInstalacoesGaleria, getFotoUrl } from '@/services/instalacoesGaleriaService'
import {
  PropostaTecnicoComercialDados,
  FotoInstalacaoProposta,
  DADOS_FIXOS_EMPRESA_DELFOS,
  gerarHTMLPropostaTecnicoComercial,
  abrirPropostaTecnicoComercialEmNovaAba,
  baixarPropostaTecnicoComercialHTML,
} from '@/lib/propostaTecnicoComercialGenerator'
import { GeracaoMensalItem, DADOS_CLIMATICOS_ERECHIM } from '@/lib/energiaSolar'

export interface ModalGerarPropostaTecnicoComercialProps {
  orcamento: OrcamentoSolarCalculado & {
    instalacoes_selecionadas?: string[] | null
    foto_modulo_url?: string | null
    foto_inversor_url?: string | null
    layout_telhado?: string | null
    layout_telhado_url?: string | null
    layout_telhado_habilitado?: boolean
  }
  cliente?: Cliente | null
  open: boolean
  onClose: () => void
}

export function ModalGerarPropostaTecnicoComercial({
  orcamento,
  cliente,
  open,
  onClose,
}: ModalGerarPropostaTecnicoComercialProps) {
  const [etapa, setEtapa] = useState<'edicao' | 'preview'>('edicao')
  const [todasInstalacoes, setTodasInstalacoes] = useState<InstalacaoGaleria[]>([])
  const [loadingGaleria, setLoadingGaleria] = useState<boolean>(true)

  // 1. DADOS CABEÇALHO & CLIENTE
  const [clienteNome, setClienteNome] = useState(cliente?.nome || orcamento.cliente_nome || '')
  const [clienteDocumento, setClienteDocumento] = useState(cliente?.cpf_cnpj || cliente?.cpf || '')
  const [representanteNome, setRepresentanteNome] = useState('João Victor Bagetti Fuchs')
  const [representanteContato, setRepresentanteContato] = useState('(54) 99129-2121')
  const [dataProposta, setDataProposta] = useState(
    new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  )
  const [validadeDias, setValidadeDias] = useState<number>(5)

  // 2. SELEÇÃO DE FOTOS DA GALERIA (até 6)
  const [fotosSelecionadasIds, setFotosSelecionadasIds] = useState<string[]>([])

  // 3. IMAGENS ILUSTRATIVAS (checkboxes mantidos para compatibilidade)
  const [incluirComoFunciona, setIncluirComoFunciona] = useState<boolean>(true)
  const [incluirMonitoramento, setIncluirMonitoramento] = useState<boolean>(true)

  // 4. ESPECIFICAÇÕES TÉCNICAS
  const [potenciaKwp, setPotenciaKwp] = useState<number>(orcamento.potencia_kwp || 10.5)
  const [descricaoPaineis, setDescricaoPaineis] = useState(
    orcamento.marca_painel
      ? `${orcamento.marca_painel} monocristalino tier-1 de alta eficiência`
      : 'Módulos Fotovoltaicos Monocristalinos Tier-1 de alta eficiência',
  )
  const [qtdPaineis, setQtdPaineis] = useState<number>(orcamento.numero_placas || 20)
  const [descricaoInversores, setDescricaoInversores] = useState(
    orcamento.marca_inversor
      ? `Inversor Solar On-Grid ${orcamento.marca_inversor} com monitoramento integrado`
      : 'Inversor Solar On-Grid homologado com monitoramento integrado',
  )
  const [qtdInversores, setQtdInversores] = useState<number>(orcamento.quantidade_inversores || 1)
  const [estruturaFixacao, setEstruturaFixacao] = useState<string>(
    orcamento.tipo_estrutura || 'ceramico',
  )
  const [codigoFiname, setCodigoFiname] = useState<string>(
    orcamento.codigo_finame || 'Sob consulta',
  )
  const [areaNecessariaM2, setAreaNecessariaM2] = useState<number>(
    orcamento.area_necessaria_m2 || Math.round((orcamento.potencia_kwp || 10.5) * 6),
  )

  // 5. GARANTIAS (padrões solicitados: degradação 30, fabricação 15, inversor 10, instalação 1 ano)
  const [paineisAnosFab, setPaineisAnosFab] = useState<number>(
    (orcamento as any)?.garantia_modulos_fabricacao_anos || 15,
  )
  const [paineisAnosDesemp, setPaineisAnosDesemp] = useState<number>(
    (orcamento as any)?.garantia_modulos_degradacao_anos ||
      (orcamento as any)?.garantia_modulos_anos ||
      30,
  )
  const [paineisPercDesemp, setPaineisPercDesemp] = useState<string>('84,8%')
  const [inversorAnosFab, setInversorAnosFab] = useState<number>(
    (orcamento as any)?.garantia_inversor_anos || 10,
  )
  const [instalacaoAnos, setInstalacaoAnos] = useState<number>(1)

  // 6. PRODUÇÃO & ECONOMIA
  const [producaoAnualKwh, setProducaoAnualKwh] = useState<number>(
    orcamento.producao_anual_kwh || 15000,
  )
  const [producaoMensalKwh, setProducaoMensalKwh] = useState<number>(
    orcamento.producao_mensal_kwh || Math.round((orcamento.producao_anual_kwh || 15000) / 12),
  )
  const [investimentoTotal, setInvestimentoTotal] = useState<number>(
    orcamento.valor_investimento || orcamento.valor_total_custos || 45000,
  )
  const [prazoEntregaDias, setPrazoEntregaDias] = useState<number>(40)
  const [paybackTexto, setPaybackTexto] = useState<string>(() => {
    const pbMeses = Number(orcamento?.payback_meses)
    if (!isNaN(pbMeses) && pbMeses > 0) {
      return `${Math.round(pbMeses)} meses`
    }
    return '50 meses'
  })

  // 7. SIMULAÇÃO DE PARCELAMENTO
  const [nParcelasCartao, setNParcelasCartao] = useState<number>(
    orcamento.parcelas_cartao && orcamento.parcelas_cartao > 0 ? orcamento.parcelas_cartao : 18,
  )
  const [entradaCartao, setEntradaCartao] = useState<number>(
    orcamento.entrada_cartao && orcamento.entrada_cartao > 0 ? orcamento.entrada_cartao : 0,
  )
  const [valorParcelaCartao, setValorParcelaCartao] = useState<number>(
    orcamento.parcela_cartao_18x || Math.round((investimentoTotal * 1.12) / 18),
  )
  const [nomeFinanA, setNomeFinanA] = useState<string>('FINANCIAMENTO A')
  const [entradaFinanA, setEntradaFinanA] = useState<number>(
    orcamento.entrada_financiamento_banco1 && orcamento.entrada_financiamento_banco1 > 0
      ? orcamento.entrada_financiamento_banco1
      : 0,
  )
  const [nParcelasFinanA, setNParcelasFinanA] = useState<number>(
    orcamento.parcelas_financiamento_banco1 && orcamento.parcelas_financiamento_banco1 > 0
      ? orcamento.parcelas_financiamento_banco1
      : 60,
  )
  const [valorParcelaFinanA, setValorParcelaFinanA] = useState<number>(
    orcamento.parcela_financiamento_banco1 || Math.round(investimentoTotal * 0.023),
  )
  const [nomeFinanB, setNomeFinanB] = useState<string>('FINANCIAMENTO B')
  const [entradaFinanB, setEntradaFinanB] = useState<number>(
    orcamento.entrada_financiamento_banco2 && orcamento.entrada_financiamento_banco2 > 0
      ? orcamento.entrada_financiamento_banco2
      : 0,
  )
  const [nParcelasFinanB, setNParcelasFinanB] = useState<number>(
    orcamento.parcelas_financiamento_banco2 && orcamento.parcelas_financiamento_banco2 > 0
      ? orcamento.parcelas_financiamento_banco2
      : 60,
  )
  const [valorParcelaFinanB, setValorParcelaFinanB] = useState<number>(
    orcamento.parcela_financiamento_banco2 || Math.round(investimentoTotal * 0.02),
  )
  const [contaHoje, setContaHoje] = useState<number>(() => {
    if (orcamento.valor_conta_atual && orcamento.valor_conta_atual > 0) {
      return orcamento.valor_conta_atual
    }
    const tarifa = orcamento.tarifa_kwh && orcamento.tarifa_kwh > 0 ? orcamento.tarifa_kwh : 1.2
    if (orcamento.consumo_mensal_kwh && orcamento.consumo_mensal_kwh > 0) {
      return Number((orcamento.consumo_mensal_kwh * tarifa).toFixed(2))
    }
    return 480
  })
  const [contaComSolar, setContaComSolar] = useState<number>(
    orcamento.conta_primeiro_mes_com_solar !== undefined &&
      orcamento.conta_primeiro_mes_com_solar !== null
      ? orcamento.conta_primeiro_mes_com_solar
      : 0,
  )

  const layoutTelhadoUrl =
    orcamento.layout_telhado_url ||
    (orcamento as any).layoutTelhadoUrl ||
    orcamento.layout_telhado ||
    null
  const layoutTelhadoHabilitado =
    orcamento.layout_telhado_habilitado !== undefined
      ? orcamento.layout_telhado_habilitado
      : (orcamento as any).layoutTelhadoHabilitado !== undefined
        ? (orcamento as any).layoutTelhadoHabilitado
        : true

  const secoesHabilitadas =
    orcamento.secoes_habilitadas || (orcamento as any).secoesHabilitadas || undefined

  // Feedback do e-mail
  const [emailStatus, setEmailStatus] = useState<string | null>(null)

  // Carregar galeria de fotos
  useEffect(() => {
    async function carregarFotos() {
      setLoadingGaleria(true)
      try {
        const galeria = await fetchInstalacoesGaleria()
        setTodasInstalacoes(galeria)
        // Se o orçamento já traz instalacoes_selecionadas salvas, usa essa seleção
        if (
          Array.isArray(orcamento.instalacoes_selecionadas) &&
          orcamento.instalacoes_selecionadas.length > 0
        ) {
          setFotosSelecionadasIds(orcamento.instalacoes_selecionadas)
        } else if (galeria.length > 0) {
          // Fallback padrão se não houver seleção específica
          const comFoto = galeria.filter((g) => {
            const url = getFotoUrl(g)
            return !!(url && url.trim())
          })
          const defaultSelected = (comFoto.length > 0 ? comFoto : galeria)
            .slice(0, 4)
            .map((g) => g.id)
          setFotosSelecionadasIds(defaultSelected)
        }
      } catch (err) {
        console.error('Falha ao carregar galeria:', err)
      } finally {
        setLoadingGaleria(false)
      }
    }
    if (open) {
      carregarFotos()
      setEtapa('edicao')
      setEmailStatus(null)
    }
  }, [open])

  // Alternar foto na galeria (máximo 6)
  const toggleFoto = (id: string) => {
    if (fotosSelecionadasIds.includes(id)) {
      setFotosSelecionadasIds((prev) => prev.filter((item) => item !== id))
    } else {
      if (fotosSelecionadasIds.length >= 6) {
        alert('Você pode selecionar no máximo 6 fotos para a grade da proposta.')
        return
      }
      setFotosSelecionadasIds((prev) => [...prev, id])
    }
  }

  // Montar objeto PropostaTecnicoComercialDados com useMemo defensivo e try/catch
  const dadosAtuais = useMemo<PropostaTecnicoComercialDados | null>(() => {
    if (!open) return null
    try {
      const fotosParaProposta: FotoInstalacaoProposta[] = (todasInstalacoes || [])
        .filter((inst) => inst && fotosSelecionadasIds.includes(inst.id))
        .map((inst) => ({
          id: inst.id,
          titulo: inst.titulo || '',
          url: getFotoUrl(inst),
          cidade: inst.cidade || '',
          potenciaKwp: Number(inst.potencia_kwp) || undefined,
        }))

      // Meses de geração detalhada
      let geracaoMensalItens: GeracaoMensalItem[] = []
      if (orcamento?.geracao_detalhada_json) {
        try {
          const parsed =
            typeof orcamento.geracao_detalhada_json === 'string'
              ? JSON.parse(orcamento.geracao_detalhada_json)
              : orcamento.geracao_detalhada_json
          if (Array.isArray(parsed) && parsed.length >= 12) {
            geracaoMensalItens = parsed.map((item: any, idx: number) => ({
              mesIndex: idx,
              mesNome: item.mesNome || item.mes || DADOS_CLIMATICOS_ERECHIM[idx]?.mes || '',
              dias: item.dias || DADOS_CLIMATICOS_ERECHIM[idx]?.dias || 30,
              irradiacaoHSP: item.irradiacaoHSP || DADOS_CLIMATICOS_ERECHIM[idx]?.hspDiario || 4.5,
              fatorSazonal: item.fatorSazonal || 1.0,
              geracaoKwh: Number(item.geracaoKwh) || 0,
            }))
          }
        } catch (errJson) {
          console.warn('Erro ao processar geracao_detalhada_json:', errJson)
        }
      }

      const prodAnual = Number(producaoAnualKwh) || 15000
      if (geracaoMensalItens.length === 0) {
        // Distribuição sazonal do Sul do Brasil
        const fatores = [1.15, 1.05, 0.98, 0.85, 0.72, 0.65, 0.7, 0.82, 0.9, 1.02, 1.12, 1.18]
        const media = prodAnual / 12
        geracaoMensalItens = fatores.map((fat, idx) => ({
          mesIndex: idx,
          mesNome: DADOS_CLIMATICOS_ERECHIM[idx]?.mes || `Mês ${idx + 1}`,
          dias: DADOS_CLIMATICOS_ERECHIM[idx]?.dias || 30,
          irradiacaoHSP: DADOS_CLIMATICOS_ERECHIM[idx]?.hspDiario || 4.5,
          fatorSazonal: fat,
          geracaoKwh: Math.round(media * fat),
        }))
      }

      const contaHojeNum = Number(contaHoje) || 0
      const contaComSolarNum = Number(contaComSolar) || 0

      // Projeções (cálculo de 1, 5 e 25 anos com reajuste histórico padrão ou dados do orçamento)
      const gastoSemSolar1 =
        Number(orcamento?.gasto_sem_solar_1_ano) || Math.round(contaHojeNum * 12)
      const gastoSemSolar5 =
        Number(orcamento?.gasto_sem_solar_5_anos) || Math.round(gastoSemSolar1 * 5.8)
      const gastoSemSolar25 =
        Number(orcamento?.gasto_sem_solar_25_anos) || Math.round(gastoSemSolar1 * 38.5)

      const eco1Mes =
        Number(orcamento?.economia_1_mes) ||
        Math.round(Math.max(0, contaHojeNum - contaComSolarNum))
      const eco1Ano = Number(orcamento?.economia_1_ano) || Math.round(eco1Mes * 12)
      const eco5Anos = Number(orcamento?.economia_5_anos) || Math.round(eco1Ano * 5.5)
      const eco25Anos = Number(orcamento?.economia_25_anos) || Math.round(eco1Ano * 32)
      const invTotalNum = Number(investimentoTotal) || 0

      return {
        cliente: {
          nome: clienteNome || 'Cliente',
          cpfOuCnpj: clienteDocumento || '',
          endereco: cliente?.endereco || '',
          municipio: cliente?.municipio || '',
          cidade: (cliente as any)?.cidade || cliente?.municipio || '',
          tipoCliente: cliente?.tipo_cliente === 'comercial' ? 'comercial' : 'residencial',
          tipoImovel:
            (orcamento as any)?.tipo_imovel ||
            (cliente as any)?.tipo_imovel ||
            (cliente?.tipo_cliente === 'comercial' ? 'Comércio' : 'Residência'),
          email: cliente?.email || '',
          telefone: cliente?.telefone || '',
        },
        representante: {
          nome: representanteNome || '',
          contato: representanteContato || '',
        },
        dataProposta: dataProposta || '',
        validadeDias: Number(validadeDias) || 5,
        empresa: DADOS_FIXOS_EMPRESA_DELFOS,
        fotosInstalacoes: fotosParaProposta,
        incluirImagemComoFunciona: !!incluirComoFunciona,
        incluirImagemMonitoramento: !!incluirMonitoramento,
        sistema: {
          potenciaKwp: Number(potenciaKwp) || 0,
          descricaoPaineis: descricaoPaineis || '',
          qtdPaineis: Number(qtdPaineis) || 0,
          descricaoInversores: descricaoInversores || '',
          qtdInversores: Number(qtdInversores) || 0,
          estruturaFixacao: estruturaFixacao || '',
          codigoFiname: codigoFiname || 'Sob consulta',
          areaNecessariaM2: Number(areaNecessariaM2) || 0,
          potenciaPlacaWp: orcamento.potencia_placa_wp,
          fotoModuloUrl: (orcamento as any)?.foto_modulo_url || undefined,
          fotoInversorUrl: (orcamento as any)?.foto_inversor_url || undefined,
        },
        garantias: {
          paineisAnosFabricacao: Number(paineisAnosFab) || 15,
          paineisAnosDesempenho: Number(paineisAnosDesemp) || 30,
          paineisPercentualDesempenho: paineisPercDesemp || '84,8%',
          inversorAnosFabricacao: Number(inversorAnosFab) || 10,
          instalacaoAnos: Number(instalacaoAnos) || 1,
        },
        ajusteSolergoAtivo:
          (orcamento as any)?.ajuste_solergo_ativo ||
          (orcamento as any)?.geracao_fonte === 'solergo',
        geracaoMensalSolergo: (orcamento as any)?.geracao_mensal_solergo_json || undefined,
        producao: {
          anualKwh: prodAnual,
          mediaMensalKwh: Number(producaoMensalKwh) || Math.round(prodAnual / 12),
          geracaoMensal: geracaoMensalItens,
        },
        economia: {
          investimentoTotal: invTotalNum,
          prazoEntregaDias: Number(prazoEntregaDias) || 40,
          paybackTexto: paybackTexto || '50 meses',
        },
        parcelamento: {
          aVista: {
            valorTotal: invTotalNum,
            contaHoje: contaHojeNum,
            contaComSolar: contaComSolarNum,
          },
          cartao18x: {
            numeroParcelas: Number(nParcelasCartao) || 18,
            valorParcela: Number(valorParcelaCartao) || 0,
            contaHoje: contaHojeNum,
            contaComSolar: contaComSolarNum,
            entrada: Number(entradaCartao) || 0,
          },
          financiamentoA: {
            nome: nomeFinanA || 'FINANCIAMENTO A',
            numeroParcelas: Number(nParcelasFinanA) || 60,
            valorParcela: Number(valorParcelaFinanA) || 0,
            contaHoje: contaHojeNum,
            contaComSolar: contaComSolarNum,
            entrada: Number(entradaFinanA) || 0,
            valorIof: orcamento?.iof_financiamento_banco1,
          },
          financiamentoB: {
            nome: nomeFinanB || 'FINANCIAMENTO B',
            numeroParcelas: Number(nParcelasFinanB) || 60,
            valorParcela: Number(valorParcelaFinanB) || 0,
            contaHoje: contaHojeNum,
            contaComSolar: contaComSolarNum,
            entrada: Number(entradaFinanB) || 0,
            valorIof: orcamento?.iof_financiamento_banco2,
          },
        },
        projecao: {
          gastoSemSolar1Ano: gastoSemSolar1,
          gastoSemSolar5Anos: gastoSemSolar5,
          gastoSemSolar25Anos: gastoSemSolar25,
          economia1Ano: eco1Ano,
          economia5Anos: eco5Anos,
          economia25Anos: eco25Anos,
          economia1Mes: eco1Mes,
          contaSemSolar4AnosComReajuste:
            Number(orcamento?.conta_4_anos_reajuste) ||
            Math.round(contaHojeNum * Math.pow(1.09, 4)),
          contaComSolar4AnosComReajuste: Math.round(contaComSolarNum * Math.pow(1.09, 4)),
          contaSemSolar10AnosComReajuste:
            Number(orcamento?.conta_10_anos_reajuste) ||
            Math.round(contaHojeNum * Math.pow(1.09, 10)),
          contaComSolar10AnosComReajuste: Math.round(contaComSolarNum * Math.pow(1.09, 10)),
        },
        layoutTelhadoUrl,
        layoutTelhadoHabilitado,
        secoesHabilitadas,
      }
    } catch (err) {
      console.error('Erro ao montar dados da proposta técnico-comercial:', err)
      return null
    }
  }, [
    open,
    todasInstalacoes,
    fotosSelecionadasIds,
    orcamento,
    producaoAnualKwh,
    contaHoje,
    contaComSolar,
    investimentoTotal,
    clienteNome,
    clienteDocumento,
    cliente,
    representanteNome,
    representanteContato,
    dataProposta,
    validadeDias,
    incluirComoFunciona,
    incluirMonitoramento,
    potenciaKwp,
    descricaoPaineis,
    qtdPaineis,
    descricaoInversores,
    qtdInversores,
    estruturaFixacao,
    codigoFiname,
    areaNecessariaM2,
    paineisAnosFab,
    paineisAnosDesemp,
    paineisPercDesemp,
    inversorAnosFab,
    instalacaoAnos,
    producaoMensalKwh,
    prazoEntregaDias,
    paybackTexto,
    nParcelasCartao,
    valorParcelaCartao,
    entradaCartao,
    nomeFinanA,
    nParcelasFinanA,
    valorParcelaFinanA,
    entradaFinanA,
    nomeFinanB,
    nParcelasFinanB,
    valorParcelaFinanB,
    entradaFinanB,
    layoutTelhadoUrl,
    layoutTelhadoHabilitado,
    secoesHabilitadas,
  ])

  const htmlPreview = useMemo<string>(() => {
    if (!open || !dadosAtuais) return ''
    try {
      return gerarHTMLPropostaTecnicoComercial(dadosAtuais)
    } catch (err) {
      console.error('Erro ao gerar HTML da proposta técnico-comercial:', err)
      return '<div style="padding:20px;color:#b91c1c;font-family:sans-serif;">Não foi possível gerar a pré-visualização da proposta. Verifique os dados preenchidos.</div>'
    }
  }, [open, dadosAtuais])

  if (!open) return null

  // Ações
  const handleImprimirOuBaixarPDF = () => {
    if (dadosAtuais) {
      abrirPropostaTecnicoComercialEmNovaAba(dadosAtuais)
    }
  }

  const handleBaixarHTML = () => {
    if (dadosAtuais) {
      baixarPropostaTecnicoComercialHTML(dadosAtuais)
    }
  }

  const handleEnviarEmail = () => {
    const eco25 = dadosAtuais?.projecao?.economia25Anos || 0
    const prodAnualFmt = (Number(producaoAnualKwh) || 0).toLocaleString('pt-BR')
    const invTotalFmt = (Number(investimentoTotal) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    const eco25Fmt = (Number(eco25) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    const assunto = encodeURIComponent(`Proposta Comercial Solar - Delfos Solar - ${clienteNome}`)
    const corpo = encodeURIComponent(
      `Olá ${clienteNome},\n\nSegue a apresentação da sua Proposta Técnico-Comercial de Energia Solar elaborada pela Delfos Solar:\n\n- Potência do Sistema: ${potenciaKwp} kWp\n- Produção Anual Estimada: ${prodAnualFmt} kWh/ano\n- Investimento Total: ${invTotalFmt}\n- Economia Estimada em 25 anos: ${eco25Fmt}\n\nEstamos à disposição para esclarecer qualquer dúvida.\n\nAtenciosamente,\n${representanteNome}\nDelfos Solar - (54) 99129-2121\nwww.delfos.eng.br`,
    )
    const emailDestino = cliente?.email ? encodeURIComponent(cliente.email) : ''
    const mailtoUrl = `mailto:${emailDestino}?subject=${assunto}&body=${corpo}`

    window.open(mailtoUrl, '_blank')
    setEmailStatus(
      'O cliente de e-mail local foi aberto com o resumo e parâmetros da proposta (o envio direto via servidor aguarda a ativação do serviço SMTP).',
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-6xl h-[94vh] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 to-green-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <FileText className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Gerador de Proposta Técnico-Comercial
                <span className="text-[11px] font-semibold bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Modelo Oficial Delfos
                </span>
              </h2>
              <p className="text-xs text-emerald-100">
                Cliente: <strong>{clienteNome}</strong> • Sistema de {potenciaKwp} kWp •
                Investimento: R$ {(Number(investimentoTotal) || 0).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Abas e Fechar */}
          <div className="flex items-center gap-2">
            <div className="bg-emerald-950/40 p-1 rounded-xl flex items-center border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setEtapa('edicao')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  etapa === 'edicao'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>1. Configurar Parâmetros</span>
              </button>
              <button
                type="button"
                onClick={() => setEtapa('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  etapa === 'preview'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>2. Preview da Proposta</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificação / Banner de E-mail se disparado */}
        {emailStatus && (
          <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{emailStatus}</span>
            </div>
            <button
              onClick={() => setEmailStatus(null)}
              className="text-blue-700 font-bold hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Conteúdo Central */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {etapa === 'edicao' ? (
            <div className="p-5 max-w-5xl mx-auto space-y-6">
              {/* Card 1: Identificação e Cabeçalho */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Cabeçalho & Responsáveis</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Nome do Cliente *
                    </label>
                    <input
                      type="text"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      CPF ou CNPJ
                    </label>
                    <input
                      type="text"
                      value={clienteDocumento}
                      onChange={(e) => setClienteDocumento(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Representante Delfos
                    </label>
                    <input
                      type="text"
                      value={representanteNome}
                      onChange={(e) => setRepresentanteNome(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Contato do Representante
                    </label>
                    <input
                      type="text"
                      value={representanteContato}
                      onChange={(e) => setRepresentanteContato(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Data da Proposta
                    </label>
                    <input
                      type="text"
                      value={dataProposta}
                      onChange={(e) => setDataProposta(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Validade da Proposta (dias)
                    </label>
                    <input
                      type="number"
                      value={validadeDias}
                      onChange={(e) => setValidadeDias(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Especificações Técnicas e Equipamentos */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>Especificações Técnicas do Gerador Fotovoltaico</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Potência Total (kWp) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={potenciaKwp}
                      onChange={(e) => setPotenciaKwp(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Código FINAME / CFI
                    </label>
                    <input
                      type="text"
                      value={codigoFiname}
                      onChange={(e) => setCodigoFiname(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Área Necessária (m²)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={areaNecessariaM2}
                      onChange={(e) => setAreaNecessariaM2(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Descrição Módulos Fotovoltaicos
                    </label>
                    <input
                      type="text"
                      value={descricaoPaineis}
                      onChange={(e) => setDescricaoPaineis(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Qtd. Painéis
                    </label>
                    <input
                      type="number"
                      value={qtdPaineis}
                      onChange={(e) => setQtdPaineis(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Descrição Inversor(es)
                    </label>
                    <input
                      type="text"
                      value={descricaoInversores}
                      onChange={(e) => setDescricaoInversores(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Qtd. Inversores
                    </label>
                    <input
                      type="number"
                      value={qtdInversores}
                      onChange={(e) => setQtdInversores(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Estrutura de Fixação
                  </label>
                  <input
                    type="text"
                    value={estruturaFixacao}
                    onChange={(e) => setEstruturaFixacao(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Card 5: Garantias Dinâmicas */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Garantias Oferecidas</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Painéis Fabr. (Anos)
                    </label>
                    <input
                      type="number"
                      value={paineisAnosFab}
                      onChange={(e) => setPaineisAnosFab(Number(e.target.value))}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Painéis Desemp. (Anos)
                    </label>
                    <input
                      type="number"
                      value={paineisAnosDesemp}
                      onChange={(e) => setPaineisAnosDesemp(Number(e.target.value))}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      % Desempenho
                    </label>
                    <input
                      type="text"
                      value={paineisPercDesemp}
                      onChange={(e) => setPaineisPercDesemp(e.target.value)}
                      placeholder="84,8%"
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Inversor Fabr. (Anos)
                    </label>
                    <input
                      type="number"
                      value={inversorAnosFab}
                      onChange={(e) => setInversorAnosFab(Number(e.target.value))}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Instalação Delfos
                    </label>
                    <input
                      type="number"
                      value={instalacaoAnos}
                      onChange={(e) => setInstalacaoAnos(Number(e.target.value))}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 6: Valores, Financiamentos e Economia */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Investimento, Parcelamento & Economia</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Investimento Total (R$) *
                    </label>
                    <input
                      type="number"
                      value={investimentoTotal}
                      onChange={(e) => setInvestimentoTotal(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Prazo de Entrega (Dias)
                    </label>
                    <input
                      type="number"
                      value={prazoEntregaDias}
                      onChange={(e) => setPrazoEntregaDias(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      Tempo de Retorno (Payback)
                    </label>
                    <input
                      type="text"
                      value={paybackTexto}
                      onChange={(e) => setPaybackTexto(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Cartão (Nº Parcelas)
                    </label>
                    <input
                      type="number"
                      value={nParcelasCartao}
                      onChange={(e) => setNParcelasCartao(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Cartão Parcela (R$)
                    </label>
                    <input
                      type="number"
                      value={valorParcelaCartao}
                      onChange={(e) => setValorParcelaCartao(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Financ. A (Parcelas × R$)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={nParcelasFinanA}
                        onChange={(e) => setNParcelasFinanA(Number(e.target.value))}
                        className="w-14 text-xs px-2 py-2 rounded-lg border border-gray-300"
                      />
                      <input
                        type="number"
                        value={valorParcelaFinanA}
                        onChange={(e) => setValorParcelaFinanA(parseFloat(e.target.value) || 0)}
                        className="flex-1 text-xs px-2 py-2 rounded-lg border border-gray-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Financ. B (Parcelas × R$)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={nParcelasFinanB}
                        onChange={(e) => setNParcelasFinanB(Number(e.target.value))}
                        className="w-14 text-xs px-2 py-2 rounded-lg border border-gray-300"
                      />
                      <input
                        type="number"
                        value={valorParcelaFinanB}
                        onChange={(e) => setValorParcelaFinanB(parseFloat(e.target.value) || 0)}
                        className="flex-1 text-xs px-2 py-2 rounded-lg border border-gray-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Entrada Cartão (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={entradaCartao || ''}
                      placeholder="0,00"
                      onChange={(e) =>
                        setEntradaCartao(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Entrada Financ. A (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={entradaFinanA || ''}
                      placeholder="0,00"
                      onChange={(e) =>
                        setEntradaFinanA(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-1">
                      Entrada Financ. B (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={entradaFinanB || ''}
                      placeholder="0,00"
                      onChange={(e) =>
                        setEntradaFinanB(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Preview fiel do PDF gerado com iframe e banner âmbar oficial */}
              <div className="bg-white border border-amber-200/80 shadow-xs rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                    <Eye className="w-4 h-4 text-amber-700" />
                    <span>Preview da Proposta</span>
                  </div>
                  <span className="text-[11px] text-amber-800/80 font-medium">
                    Visualização idêntica ao PDF final • atualiza em tempo real
                  </span>
                </div>
                <div className="p-2 sm:p-4 bg-slate-100 flex justify-center">
                  <iframe
                    title="Preview da Proposta"
                    srcDoc={htmlPreview}
                    sandbox="allow-same-origin"
                    className="w-full h-[80vh] min-h-[700px] bg-white border border-gray-300 rounded-xl shadow-inner"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ETAPA DE PREVIEW COM O MESMO PADRÃO DE IFRAME E BANNER ÂMBAR */
            <div className="p-3 sm:p-5 max-w-5xl mx-auto">
              <div className="bg-white border border-amber-200/80 shadow-xs rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                    <Eye className="w-4 h-4 text-amber-700" />
                    <span>Preview da Proposta</span>
                  </div>
                  <span className="text-[11px] text-amber-800/80 font-medium">
                    Visualização idêntica ao PDF final • atualiza em tempo real
                  </span>
                </div>
                <div className="p-2 sm:p-4 bg-slate-100 flex justify-center">
                  <iframe
                    title="Preview da Proposta"
                    srcDoc={htmlPreview}
                    sandbox="allow-same-origin"
                    className="w-full h-[80vh] min-h-[700px] bg-white border border-gray-300 rounded-xl shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações do Modal */}
        <div className="px-5 py-3.5 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {etapa === 'preview' ? (
              <button
                type="button"
                onClick={() => setEtapa('edicao')}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                <span>Voltar e Editar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEtapa('preview')}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                <span>Visualizar Preview</span>
              </button>
            )}
            <span className="text-[11px] text-gray-500 hidden sm:inline font-medium">
              Layout oficial em 5 seções • 100% alinhado à proposta comercial
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Enviar por E-mail com fallback */}
            <button
              type="button"
              onClick={handleEnviarEmail}
              className="px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors"
              title="Abrir no cliente de e-mail com resumo e destinatário"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Enviar por E-mail</span>
            </button>

            {/* Abrir em nova aba para salvar como PDF nativo */}
            <button
              type="button"
              onClick={handleImprimirOuBaixarPDF}
              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all hover:shadow"
              title="Abre a proposta em nova janela pronta para imprimir ou salvar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Baixar em PDF</span>
            </button>

            {/* Download arquivo HTML */}
            <button
              type="button"
              onClick={handleBaixarHTML}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl inline-flex items-center gap-1"
              title="Baixar arquivo da proposta em HTML"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalGerarPropostaTecnicoComercial

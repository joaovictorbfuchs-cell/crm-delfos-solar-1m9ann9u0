import React, { useState, useEffect } from 'react'
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
  type PropostaTecnicoComercialDados,
  type FotoInstalacaoProposta,
  DADOS_FIXOS_EMPRESA_DELFOS,
  gerarHTMLPropostaTecnicoComercial,
  abrirPropostaTecnicoComercialEmNovaAba,
  baixarPropostaTecnicoComercialHTML,
} from '@/lib/propostaTecnicoComercialGenerator'

export interface ModalGerarPropostaTecnicoComercialProps {
  orcamento: OrcamentoSolarCalculado
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

  // 3. IMAGENS ILUSTRATIVAS (checkboxes)
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
    orcamento.tipo_estrutura
      ? `Alumínio naval para ${orcamento.tipo_estrutura}`
      : 'Alumínio de alta resistência mecânica',
  )
  const [codigoFiname, setCodigoFiname] = useState<string>(
    orcamento.codigo_finame || 'Sob consulta',
  )
  const [areaNecessariaM2, setAreaNecessariaM2] = useState<number>(
    orcamento.area_necessaria_m2 || Math.round((orcamento.potencia_kwp || 10.5) * 6),
  )

  // 5. GARANTIAS
  const [paineisAnosFab, setPaineisAnosFab] = useState<number>(12)
  const [paineisAnosDesemp, setPaineisAnosDesemp] = useState<number>(25)
  const [paineisPercDesemp, setPaineisPercDesemp] = useState<string>('84,8%')
  const [inversorAnosFab, setInversorAnosFab] = useState<number>(10)
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
  const [paybackTexto, setPaybackTexto] = useState<string>(
    orcamento.payback_meses
      ? `${(orcamento.payback_meses / 12).toFixed(1).replace('.', ',')} anos (${orcamento.payback_meses} meses)`
      : '4,2 anos (50 meses)',
  )

  // 7. SIMULAÇÃO DE PARCELAMENTO
  const [nParcelasCartao, setNParcelasCartao] = useState<number>(18)
  const [valorParcelaCartao, setValorParcelaCartao] = useState<number>(
    orcamento.parcela_cartao_18x || Math.round((investimentoTotal * 1.12) / 18),
  )
  const [nomeFinanA, setNomeFinanA] = useState<string>('FINANCIAMENTO A')
  const [nParcelasFinanA, setNParcelasFinanA] = useState<number>(60)
  const [valorParcelaFinanA, setValorParcelaFinanA] = useState<number>(
    orcamento.parcela_financiamento_banco1 || Math.round(investimentoTotal * 0.023),
  )
  const [nomeFinanB, setNomeFinanB] = useState<string>('FINANCIAMENTO B')
  const [nParcelasFinanB, setNParcelasFinanB] = useState<number>(72)
  const [valorParcelaFinanB, setValorParcelaFinanB] = useState<number>(
    orcamento.parcela_financiamento_banco2 || Math.round(investimentoTotal * 0.02),
  )
  const [contaHoje, setContaHoje] = useState<number>(
    orcamento.valor_conta_atual || orcamento.consumo_mensal_kwh
      ? (orcamento.consumo_mensal_kwh || 1000) * 0.95
      : 950,
  )
  const [contaComSolar, setContaComSolar] = useState<number>(
    orcamento.conta_primeiro_mes_com_solar || 85,
  )

  // Feedback do e-mail
  const [emailStatus, setEmailStatus] = useState<string | null>(null)

  // Carregar galeria de fotos
  useEffect(() => {
    async function carregarFotos() {
      setLoadingGaleria(true)
      try {
        const galeria = await fetchInstalacoesGaleria()
        setTodasInstalacoes(galeria)
        // Por padrão selecionar as 4 ou 6 primeiras fotos
        if (galeria.length > 0) {
          const defaultSelected = galeria.slice(0, 4).map((g) => g.id)
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

  if (!open) return null

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

  // Montar objeto PropostaTecnicoComercialDados
  const montarDadosProposta = (): PropostaTecnicoComercialDados => {
    const fotosParaProposta: FotoInstalacaoProposta[] = todasInstalacoes
      .filter((inst) => fotosSelecionadasIds.includes(inst.id))
      .map((inst) => ({
        id: inst.id,
        titulo: inst.titulo,
        url: getFotoUrl(inst),
      }))

    // Meses de geração detalhada
    let geracaoMensalItens = []
    if (orcamento.geracao_detalhada_json) {
      try {
        const parsed =
          typeof orcamento.geracao_detalhada_json === 'string'
            ? JSON.parse(orcamento.geracao_detalhada_json)
            : orcamento.geracao_detalhada_json
        if (Array.isArray(parsed) && parsed.length >= 12) {
          geracaoMensalItens = parsed
        }
      } catch {
        /* intentionally ignored */
      }
    }

    if (geracaoMensalItens.length === 0) {
      // Distribuição sazonal do Sul do Brasil
      const fatores = [1.15, 1.05, 0.98, 0.85, 0.72, 0.65, 0.7, 0.82, 0.9, 1.02, 1.12, 1.18]
      const media = producaoAnualKwh / 12
      const nomes = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ]
      geracaoMensalItens = fatores.map((fat, idx) => ({
        mes: nomes[idx],
        mesIndex: idx,
        geracaoKwh: Math.round(media * fat),
      }))
    }

    // Projeções
    const gastoSemSolar1 = orcamento.gasto_sem_solar_1_ano || contaHoje * 12
    const gastoSemSolar5 = orcamento.gasto_sem_solar_5_anos || gastoSemSolar1 * 5.8
    const gastoSemSolar25 = orcamento.gasto_sem_solar_25_anos || gastoSemSolar1 * 38.5

    const eco1Mes = orcamento.economia_1_mes || Math.max(0, contaHoje - contaComSolar)
    const eco1Ano = orcamento.economia_1_ano || eco1Mes * 12
    const eco5Anos = orcamento.economia_5_anos || eco1Ano * 5.5
    const eco25Anos = orcamento.economia_25_anos || eco1Ano * 32

    return {
      cliente: {
        nome: clienteNome,
        cpfOuCnpj: clienteDocumento,
        endereco: cliente?.endereco,
        municipio: cliente?.municipio,
        email: cliente?.email,
        telefone: cliente?.telefone,
      },
      representante: {
        nome: representanteNome,
        contato: representanteContato,
      },
      dataProposta,
      validadeDias,
      empresa: DADOS_FIXOS_EMPRESA_DELFOS,
      fotosInstalacoes: fotosParaProposta,
      incluirImagemComoFunciona: incluirComoFunciona,
      incluirImagemMonitoramento: incluirMonitoramento,
      sistema: {
        potenciaKwp,
        descricaoPaineis,
        qtdPaineis,
        descricaoInversores,
        qtdInversores,
        estruturaFixacao,
        codigoFiname,
        areaNecessariaM2,
      },
      garantias: {
        paineisAnosFabricacao: paineisAnosFab,
        paineisAnosDesempenho: paineisAnosDesemp,
        paineisPercentualDesempenho: paineisPercDesemp,
        inversorAnosFabricacao: inversorAnosFab,
        instalacaoAnos,
      },
      producao: {
        anualKwh: producaoAnualKwh,
        mediaMensalKwh: producaoMensalKwh,
        geracaoMensal: geracaoMensalItens,
      },
      economia: {
        investimentoTotal,
        prazoEntregaDias,
        paybackTexto,
      },
      parcelamento: {
        aVista: {
          valorTotal: investimentoTotal,
          contaHoje,
          contaComSolar,
        },
        cartao18x: {
          numeroParcelas: nParcelasCartao,
          valorParcela: valorParcelaCartao,
          contaHoje,
          contaComSolar,
        },
        financiamentoA: {
          nome: nomeFinanA,
          numeroParcelas: nParcelasFinanA,
          valorParcela: valorParcelaFinanA,
          contaHoje,
          contaComSolar,
        },
        financiamentoB: {
          nome: nomeFinanB,
          numeroParcelas: nParcelasFinanB,
          valorParcela: valorParcelaFinanB,
          contaHoje,
          contaComSolar,
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
      },
    }
  }

  const dadosAtuais = montarDadosProposta()
  const htmlPreview = gerarHTMLPropostaTecnicoComercial(dadosAtuais)

  // Ações
  const handleImprimirOuBaixarPDF = () => {
    abrirPropostaTecnicoComercialEmNovaAba(dadosAtuais)
  }

  const handleBaixarHTML = () => {
    baixarPropostaTecnicoComercialHTML(dadosAtuais)
  }

  const handleEnviarEmail = () => {
    const assunto = encodeURIComponent(`Proposta Comercial Solar - Delfos Solar - ${clienteNome}`)
    const corpo = encodeURIComponent(
      `Olá ${clienteNome},\n\nSegue a apresentação da sua Proposta Técnico-Comercial de Energia Solar elaborada pela Delfos Solar:\n\n- Potência do Sistema: ${potenciaKwp} kWp\n- Produção Anual Estimada: ${producaoAnualKwh.toLocaleString('pt-BR')} kWh/ano\n- Investimento Total: ${(investimentoTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n- Economia Estimada em 25 anos: ${(dadosAtuais.projecao.economia25Anos || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\nEstamos à disposição para esclarecer qualquer dúvida.\n\nAtenciosamente,\n${representanteNome}\nDelfos Solar - (54) 99129-2121\nwww.delfos.eng.br`,
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
                Investimento: R$ {investimentoTotal.toLocaleString('pt-BR')}
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
                <span>1. Configurar Proposta</span>
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
                <span>2. Pré-visualizar (PDF)</span>
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

              {/* Card 2: Galeria de Instalações (Fotos de Usinas Homologadas) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide">
                    <Images className="w-4 h-4 text-emerald-600" />
                    <span>Galeria de Usinas Entregues (Selecione até 6 fotos)</span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {fotosSelecionadasIds.length}/6 selecionadas
                  </span>
                </div>

                <p className="text-[11px] text-gray-500">
                  Marque as fotos que serão incluídas na seção <strong>Quem Somos</strong> da
                  proposta. Elas serão organizadas em uma grade de 3 colunas com seus respectivos
                  títulos como legendas.
                </p>

                {loadingGaleria ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    Carregando usinas da galeria...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {todasInstalacoes.map((item) => {
                      const isSelected = fotosSelecionadasIds.includes(item.id)
                      const url = getFotoUrl(item)
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleFoto(item.id)}
                          className={`cursor-pointer rounded-xl border overflow-hidden transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-emerald-600 ring-2 ring-emerald-500 bg-emerald-50/50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                            <img
                              src={url}
                              alt={item.titulo}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white p-0.5 rounded-full shadow">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="p-1.5 text-[10px] font-bold text-gray-800 line-clamp-2 text-center leading-tight">
                            {item.titulo}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Card 3: Imagens Ilustrativas Padrão */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span>Imagens Ilustrativas no Documento</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirComoFunciona}
                      onChange={(e) => setIncluirComoFunciona(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-gray-800 block">
                        Como funciona o sistema solar on-grid
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Diagrama explicativo ilustrando módulos, inversor, consumo e injeção na
                        rede.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={incluirMonitoramento}
                      onChange={(e) => setIncluirMonitoramento(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-gray-800 block">
                        Monitoramento do sistema solar
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Gráfico do app com legenda: &ldquo;O sistema de monitoramento permite ao
                        usuário acessar remotamente o desempenho do seu sistema.&rdquo;
                      </span>
                    </div>
                  </label>
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
              </div>
            </div>
          ) : (
            /* ETAPA DE PREVIEW */
            <div className="h-full flex flex-col p-4">
              <div className="flex-1 bg-white rounded-xl shadow-inner border border-gray-300 overflow-hidden relative">
                <iframe
                  title="Pré-visualização da Proposta"
                  srcDoc={htmlPreview}
                  className="w-full h-full border-none"
                />
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
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Layout fiel ao DOCX de referência com 11 seções
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

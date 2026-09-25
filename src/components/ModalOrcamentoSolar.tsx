import React, { useState, useMemo, useEffect, useRef } from 'react'
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
  Wrench,
  Calculator,
  Compass,
  ArrowRight,
  Building,
  Home,
  Factory,
  Tractor,
  FileDown,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  Sliders,
  Cpu,
  Receipt,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { SecaoOrcamentosFornecedores } from './SecaoOrcamentosFornecedores'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import { formatCurrency } from '@/lib/formatters'
import type {
  OrcamentoSolar,
  Cliente,
  PadraoFasesSolar,
  PropostaSecoesHabilitadas,
  EnquadramentoSolar,
} from '@/types/crm'
import {
  calcularOrcamentoSolar,
  somarCustosSolar,
  calcularCustosAba,
  determinarMenorOpcaoImposto,
  CUSTOS_SOLAR_PADRAO,
  dimensionarSistemaPorGeracaoPretendida,
  FATORES_GERACAO_ANUAL_KWP,
  type TipoClienteSolar,
  type TipoEstruturaSolar,
  type OrientacaoTelhadoSolar,
  type StatusOrcamentoSolar,
  type DadosCustosSolar,
} from '@/lib/energiaSolar'
import {
  abrirPropostaSolarEmNovaAba,
  gerarHTMLPropostaSolar,
  type PropostaSolarPDFInput,
} from '@/lib/propostaSolarGenerator'
import { baixarPropostaSolarDocx } from '@/lib/propostaSolarDocxGenerator'
import { ModalImportarSolergo } from '@/components/ModalImportarSolergo'
import { PainelEdicaoConteudoProposta } from '@/components/PainelEdicaoConteudoProposta'
import { normalizarConteudoProposta, type ConteudoProposta } from '@/lib/conteudoProposta'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { fetchInstalacoesGaleria, getFotoUrl } from '@/services/instalacoesGaleriaService'
import type { InstalacaoGaleria } from '@/types/instalacoesGaleria'
import { fetchEquipamentos } from '@/services/equipamentosService'
import type { Equipamento } from '@/types/equipamentos'
import { CheckSquare, Square, Image as ImageIcon, Upload, Trash2, Eye } from 'lucide-react'
import solergoLayoutPlaceholderSvg from '@/assets/solergo-layout-placeholder.svg'

interface ModalOrcamentoSolarProps {
  isOpen: boolean
  onClose: () => void
  initialClienteId?: string
  initialOrcamento?: OrcamentoSolar | null
}

type TabType = 'tecnico' | 'custos' | 'parcelamentos' | 'proposta'

interface SecaoAcordeaoProps {
  titulo: string
  subtitulo?: string
  icone?: React.ReactNode
  aberta: boolean
  onToggle: () => void
  badge?: React.ReactNode
  children: React.ReactNode
  overflowVisible?: boolean
  className?: string
}

const SecaoAcordeao: React.FC<SecaoAcordeaoProps> = ({
  titulo,
  subtitulo,
  icone,
  aberta,
  onToggle,
  badge,
  children,
  overflowVisible = false,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-xs transition-all ${
        overflowVisible ? 'overflow-visible' : 'overflow-hidden'
      } ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-gray-50/70 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icone && <div className="shrink-0 text-emerald-600">{icone}</div>}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                {titulo}
              </span>
              {badge}
            </div>
            {subtitulo && (
              <p className="text-[11px] text-gray-400 font-normal truncate mt-0.5">{subtitulo}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-2 text-gray-500 hover:text-gray-700">
          {aberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {aberta && <div className="p-4 pt-1 sm:p-5 sm:pt-2 border-t border-gray-100">{children}</div>}
    </div>
  )
}

export const ModalOrcamentoSolar: React.FC<ModalOrcamentoSolarProps> = ({
  isOpen,
  onClose,
  initialClienteId,
  initialOrcamento,
}) => {
  const {
    clientes,
    sistemas,
    orcamentosSolar,
    fornecedoresOrcamentos,
    addFornecedorOrcamento,
    removeFornecedorOrcamento,
    selecionarFornecedorOrcamento,
    addOrcamentoSolar,
    updateOrcamentoSolar,
    addAtividade,
    updateClienteStatus,
  } = useClientes()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabType>('tecnico')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Estados do acordeão da aba "Dados Técnicos & Sistema"
  // Estrutura: 1. Dados do Cliente (aberta) | 2. Dados de Entrada do Sistema (aberta)
  // 3. Orçamentos de Fornecedores & Equipamentos (fechada) | 4. Geração Estimada (fechada)
  const [secaoClienteAberta, setSecaoClienteAberta] = useState<boolean>(true)
  const [secaoEntradaAberta, setSecaoEntradaAberta] = useState<boolean>(true)
  const [secaoFornecedoresEquipamentosAberta, setSecaoFornecedoresEquipamentosAberta] =
    useState<boolean>(false)
  const [secaoGeracaoEstimadaAberta, setSecaoGeracaoEstimadaAberta] = useState<boolean>(false)

  // Cliente selecionado
  const [selectedClienteId, setSelectedClienteId] = useState<string>('')

  // Status do orçamento
  const [status, setStatus] = useState<StatusOrcamentoSolar>('Em elaboração')

  // Campos técnicos exatos exigidos
  const [consumoKwhMes, setConsumoKwhMes] = useState<number>(650)
  const [geracaoPretendidaKwhMes, setGeracaoPretendidaKwhMes] = useState<number | ''>(650)
  const [geracaoPretendidaEditadaManualmente, setGeracaoPretendidaEditadaManualmente] =
    useState<boolean>(false)
  const [geracaoSimuladaKwhAno, setGeracaoSimuladaKwhAno] = useState<number | ''>(
    initialOrcamento?.geracao_simulada_kwh_ano !== undefined &&
      initialOrcamento.geracao_simulada_kwh_ano !== null &&
      Number(initialOrcamento.geracao_simulada_kwh_ano) > 0
      ? Number(initialOrcamento.geracao_simulada_kwh_ano)
      : '',
  )
  // Estado para Solergo (ajuste de geração simulada para casos excepcionais)
  const [modalSolergoOpen, setModalSolergoOpen] = useState<boolean>(false)
  const [ajusteSolergoAtivo, setAjusteSolergoAtivo] = useState<boolean>(
    Boolean(
      initialOrcamento?.ajuste_solergo_ativo || initialOrcamento?.geracao_fonte === 'solergo',
    ),
  )
  const [geracaoFonte, setGeracaoFonte] = useState<'automatico' | 'solergo'>(
    initialOrcamento?.geracao_fonte === 'solergo' ? 'solergo' : 'automatico',
  )
  const [geracaoMensalSolergo, setGeracaoMensalSolergo] = useState<number[] | null>(
    Array.isArray(initialOrcamento?.geracao_mensal_solergo_json) &&
      initialOrcamento.geracao_mensal_solergo_json.length === 12
      ? initialOrcamento.geracao_mensal_solergo_json
      : null,
  )
  const [imagemSolergoFile, setImagemSolergoFile] = useState<File | null>(null)
  const [enquadramento, setEnquadramento] = useState<EnquadramentoSolar>(
    initialOrcamento?.enquadramento || 'GD_II',
  )
  const [padraoFases, setPadraoFases] = useState<PadraoFasesSolar>(
    initialOrcamento?.padrao_fases || 'monofásico',
  )
  const [tipoCliente, setTipoCliente] = useState<TipoClienteSolar>('residencial')
  const [tarifaKwh, setTarifaKwh] = useState<number>(1.19)
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
  const [investimentoEditadoManualmente, setInvestimentoEditadoManualmente] =
    useState<boolean>(false)
  const [observacoes, setObservacoes] = useState<string>('')
  const [prazoEntregaDias, setPrazoEntregaDias] = useState<number>(30)
  const [isGeneratingWord, setIsGeneratingWord] = useState<boolean>(false)
  const previewIframeRef = useRef<HTMLIFrameElement>(null)

  // Custos do projeto (aba de custos com soma automática)
  const [custos, setCustos] = useState<DadosCustosSolar>({ ...CUSTOS_SOLAR_PADRAO })

  // Campos específicos da Aba de Custos (Requisitos 1 a 6 e Desconto)
  const [valorPorPlaca, setValorPorPlaca] = useState<number>(150)
  const [opcaoImposto, setOpcaoImposto] = useState<1 | 2>(1)
  const [descontoPercentual, setDescontoPercentual] = useState<number>(0)
  const [fornecedorSelecionadoId, setFornecedorSelecionadoId] = useState<string>('')
  // Controla se a mão de obra foi editada manualmente pelo usuário
  const [maoDeObraEditadaManualmente, setMaoDeObraEditadaManualmente] = useState<boolean>(false)

  // Modos manuais e valores manuais em R$ para Administração, Comissão e Indicação
  const [manualAdministracao, setManualAdministracao] = useState<boolean>(false)
  const [valorManualAdministracao, setValorManualAdministracao] = useState<number>(0)
  const [manualComissao, setManualComissao] = useState<boolean>(false)
  const [valorManualComissao, setValorManualComissao] = useState<number>(0)
  const [manualIndicacao, setManualIndicacao] = useState<boolean>(false)
  const [valorManualIndicacao, setValorManualIndicacao] = useState<number>(0)
  // Percentual configurável de indicação em modo automático (em %, ex.: 0 = 0%, 1 = 1%, padrão 0%)
  const [percentualIndicacaoAuto, setPercentualIndicacaoAuto] = useState<number>(0)

  // Parâmetros Fio B e Fator de Simultaneidade (GD Eco Líquida)
  const [fioBKwh, setFioBKwh] = useState<number>(0.2239)
  const [fatorSimultaneidadeManual, setFatorSimultaneidadeManual] = useState<number | ''>('')

  // Períodos de garantia cadastráveis (padrões solicitados: degradação 30, fabricação 15, inversor 10)
  const [garantiaModulosDegradacaoAnos, setGarantiaModulosDegradacaoAnos] = useState<number>(30)
  const [garantiaModulosFabricacaoAnos, setGarantiaModulosFabricacaoAnos] = useState<number>(15)
  const [garantiaInversorAnos, setGarantiaInversorAnos] = useState<number>(10)

  // Opções personalizadas de parcelamento & financiamento
  const [parcelasCartao, setParcelasCartao] = useState<number>(18)
  const [jurosCartao, setJurosCartao] = useState<number>(1.49)
  const [entradaCartao, setEntradaCartao] = useState<number>(0)
  const [parcelasBanco1, setParcelasBanco1] = useState<number>(60)
  const [jurosBanco1, setJurosBanco1] = useState<number>(1.9)
  const [entradaBanco1, setEntradaBanco1] = useState<number>(0)
  const [parcelasBanco2, setParcelasBanco2] = useState<number>(60)
  const [jurosBanco2, setJurosBanco2] = useState<number>(0.99)
  const [entradaBanco2, setEntradaBanco2] = useState<number>(0)

  // Equipamentos cadastrados no banco para seleção
  const [equipamentosInversores, setEquipamentosInversores] = useState<Equipamento[]>([])
  const [equipamentosModulos, setEquipamentosModulos] = useState<Equipamento[]>([])
  const [fotoInversorUrl, setFotoInversorUrl] = useState<string | null>(null)
  const [fotoModuloUrl, setFotoModuloUrl] = useState<string | null>(null)

  // Usinas da galeria e usinas selecionadas para esta proposta
  const [usinasGaleria, setUsinasGaleria] = useState<InstalacaoGaleria[]>([])
  const [instalacoesSelecionadasIds, setInstalacoesSelecionadasIds] = useState<string[]>([])
  const [loadingGaleria, setLoadingGaleria] = useState<boolean>(false)

  // Conteúdo 100% editável da proposta técnico-comercial
  const [conteudoProposta, setConteudoProposta] = useState<ConteudoProposta>(() =>
    normalizarConteudoProposta(initialOrcamento?.conteudo_proposta),
  )

  // Seções habilitadas na proposta (toggles opcionais)
  const [secoesHabilitadas, setSecoesHabilitadas] = useState<PropostaSecoesHabilitadas>({
    layoutTelhado: true,
    fotosProjeto: true,
    sazonalidadeSolar: true,
    portfolioUsinas: true,
  })

  // Layout do Telhado (Solergo / planta técnica)
  const [layoutTelhadoHabilitado, setLayoutTelhadoHabilitado] = useState<boolean>(true)
  const [layoutTelhadoFile, setLayoutTelhadoFile] = useState<File | null>(null)
  const [layoutTelhadoPreviewUrl, setLayoutTelhadoPreviewUrl] = useState<string | null>(null)
  const layoutInputRef = useRef<HTMLInputElement>(null)

  // Ref para acessar a lista de clientes atual sem colocá-la como dependência do efeito de inicialização
  const clientesRef = useRef(clientes)
  useEffect(() => {
    clientesRef.current = clientes
  }, [clientes])

  // Ref para evitar que o efeito de inicialização sobrescreva o estado do modal se os inputs não mudaram
  const lastInitializedKeyRef = useRef<string | null>(null)

  // Ref para guardar seleção de fornecedor feita na sessão do modal e evitar reversão de materiais/equipamentos
  const fornecedorAplicadoRef = useRef<{ id: string; valor: number } | null>(null)

  // Carrega as usinas da galeria e os equipamentos cadastrados quando o modal é aberto
  useEffect(() => {
    if (!isOpen) return
    let cancel = false
    setLoadingGaleria(true)
    fetchInstalacoesGaleria()
      .then((dados) => {
        if (!cancel) {
          setUsinasGaleria(dados || [])
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar galeria de usinas no modal de orçamento:', err)
      })
      .finally(() => {
        if (!cancel) {
          setLoadingGaleria(false)
        }
      })

    // Carregar inversores e módulos FV do banco
    Promise.all([fetchEquipamentos('inversor'), fetchEquipamentos('modulo_fv')])
      .then(([inversores, modulos]) => {
        if (!cancel) {
          setEquipamentosInversores(inversores || [])
          setEquipamentosModulos(modulos || [])
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar equipamentos cadastrados para o orçamento:', err)
      })

    return () => {
      cancel = true
    }
  }, [isOpen])

  // Inicializa ou sincroniza cliente e orçamento somente ao abrir ou ao mudar initialOrcamento / initialClienteId
  useEffect(() => {
    if (!isOpen) {
      lastInitializedKeyRef.current = null
      fornecedorAplicadoRef.current = null
      return
    }

    const currentKey = `${initialOrcamento?.id || 'novo'}_${initialClienteId || ''}`
    if (lastInitializedKeyRef.current === currentKey) {
      return
    }
    lastInitializedKeyRef.current = currentKey

    // Reseta fotos de equipamentos para nova abertura
    setFotoInversorUrl(null)
    setFotoModuloUrl(null)

    if (initialOrcamento) {
      setSelectedClienteId(initialOrcamento.cliente_id)
      setStatus(initialOrcamento.status || 'Em elaboração')
      const consumoInicial = initialOrcamento.consumo_kwh_mes || 650
      setConsumoKwhMes(consumoInicial)
      if (
        initialOrcamento.geracao_pretendida_kwh_ano &&
        initialOrcamento.geracao_pretendida_kwh_ano > 0
      ) {
        // Converte kWh/ano salvo para kWh/mês no campo
        const mensalConvertido = Math.round(initialOrcamento.geracao_pretendida_kwh_ano / 12)
        setGeracaoPretendidaKwhMes(mensalConvertido)
        setGeracaoPretendidaEditadaManualmente(true)
      } else {
        setGeracaoPretendidaKwhMes(consumoInicial)
        setGeracaoPretendidaEditadaManualmente(false)
      }
      if (
        initialOrcamento.geracao_simulada_kwh_ano !== undefined &&
        initialOrcamento.geracao_simulada_kwh_ano !== null &&
        Number(initialOrcamento.geracao_simulada_kwh_ano) > 0
      ) {
        setGeracaoSimuladaKwhAno(Number(initialOrcamento.geracao_simulada_kwh_ano))
      } else {
        setGeracaoSimuladaKwhAno('')
      }
      setAjusteSolergoAtivo(
        Boolean(
          initialOrcamento.ajuste_solergo_ativo || initialOrcamento.geracao_fonte === 'solergo',
        ),
      )
      setGeracaoFonte(initialOrcamento.geracao_fonte === 'solergo' ? 'solergo' : 'automatico')
      setGeracaoMensalSolergo(
        Array.isArray(initialOrcamento.geracao_mensal_solergo_json) &&
          initialOrcamento.geracao_mensal_solergo_json.length === 12
          ? initialOrcamento.geracao_mensal_solergo_json
          : null,
      )
      setImagemSolergoFile(null)
      setEnquadramento(initialOrcamento.enquadramento || 'GD_II')
      setPadraoFases(initialOrcamento.padrao_fases || 'monofásico')
      setTipoCliente(initialOrcamento.tipo_cliente || 'residencial')
      setTarifaKwh(initialOrcamento.tarifa_kwh || 1.19)
      setFioBKwh(
        initialOrcamento.fio_b !== undefined && initialOrcamento.fio_b !== null
          ? Number(initialOrcamento.fio_b)
          : 0.2239,
      )
      setFatorSimultaneidadeManual(
        initialOrcamento.fator_simultaneidade !== undefined &&
          initialOrcamento.fator_simultaneidade !== null
          ? Number(initialOrcamento.fator_simultaneidade)
          : '',
      )
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
      setValorInvestimentoManual(0)
      setInvestimentoEditadoManualmente(false)
      setObservacoes(initialOrcamento.observacoes || '')

      // Garantias salvas ou padrões
      setGarantiaModulosDegradacaoAnos(
        (initialOrcamento as any).garantia_modulos_degradacao_anos !== undefined &&
          (initialOrcamento as any).garantia_modulos_degradacao_anos > 0
          ? (initialOrcamento as any).garantia_modulos_degradacao_anos
          : (initialOrcamento as any).garantia_modulos_anos !== undefined &&
              (initialOrcamento as any).garantia_modulos_anos > 0
            ? (initialOrcamento as any).garantia_modulos_anos
            : 30,
      )
      setGarantiaModulosFabricacaoAnos(
        (initialOrcamento as any).garantia_modulos_fabricacao_anos !== undefined &&
          (initialOrcamento as any).garantia_modulos_fabricacao_anos > 0
          ? (initialOrcamento as any).garantia_modulos_fabricacao_anos
          : 15,
      )
      setGarantiaInversorAnos(
        (initialOrcamento as any).garantia_inversor_anos !== undefined &&
          (initialOrcamento as any).garantia_inversor_anos > 0
          ? (initialOrcamento as any).garantia_inversor_anos
          : 10,
      )

      // Carrega conteúdo editável salvo ou inicializa com valores padrão
      setConteudoProposta(normalizarConteudoProposta(initialOrcamento.conteudo_proposta))

      const initialValPlaca =
        initialOrcamento.valor_por_placa !== undefined ? initialOrcamento.valor_por_placa : 150
      setValorPorPlaca(initialValPlaca)

      const optImp = initialOrcamento.opcao_imposto === 2 ? 2 : 1
      setOpcaoImposto(optImp)
      // Se o orçamento já tinha uma opção de imposto salva no banco, preserva como escolha manual inicial
      if (initialOrcamento.opcao_imposto === 1 || initialOrcamento.opcao_imposto === 2) {
        setOpcaoImpostoModificadaManualmente(true)
      } else {
        setOpcaoImpostoModificadaManualmente(false)
      }

      const initialDesconto = initialOrcamento.desconto || 0
      // Calcula o percentual correspondente se houver valor de investimento / valor total salvo
      const invTotal =
        initialOrcamento.valor_investimento || initialOrcamento.valor_total_custos || 0
      let initialPct = 0
      if (initialDesconto > 0 && invTotal > 0) {
        initialPct = Number(((initialDesconto / invTotal) * 100).toFixed(2))
      }
      setDescontoPercentual(initialPct)

      setFornecedorSelecionadoId(initialOrcamento.fornecedor_selecionado_id || '')

      const riscoPadrao =
        initialOrcamento.custo_risco_engenharia !== undefined &&
        initialOrcamento.custo_risco_engenharia !== 0
          ? initialOrcamento.custo_risco_engenharia
          : 400

      const mdo = initialOrcamento.custo_mao_de_obra || 0
      const qtdPlacas = initialOrcamento.numero_placas || 10
      // Se mdo for diferente do produto de placas * valorPorPlaca, considerar editada manualmente
      if (mdo > 0 && mdo !== qtdPlacas * initialValPlaca) {
        setMaoDeObraEditadaManualmente(true)
      } else {
        setMaoDeObraEditadaManualmente(false)
      }

      // Modos manuais e valores salvos em orcamentos_solar
      const isManualAdmin = Boolean(initialOrcamento.manual_administracao)
      setManualAdministracao(isManualAdmin)
      setValorManualAdministracao(
        initialOrcamento.valor_manual_administracao !== undefined &&
          initialOrcamento.valor_manual_administracao !== null
          ? Number(initialOrcamento.valor_manual_administracao)
          : initialOrcamento.custo_administracao || 0,
      )

      const isManualComiss = Boolean(initialOrcamento.manual_comissao)
      setManualComissao(isManualComiss)
      setValorManualComissao(
        initialOrcamento.valor_manual_comissao !== undefined &&
          initialOrcamento.valor_manual_comissao !== null
          ? Number(initialOrcamento.valor_manual_comissao)
          : initialOrcamento.custo_comissao_comercial || 0,
      )

      const isManualInd = Boolean(initialOrcamento.manual_indicacao)
      setManualIndicacao(isManualInd)
      // Percentual de indicação automática: se salvo, converte fração -> % (ou % direto caso > 1)
      const pIndSalvo =
        initialOrcamento.percentual_indicacao_auto !== undefined &&
        initialOrcamento.percentual_indicacao_auto !== null
          ? Number(initialOrcamento.percentual_indicacao_auto)
          : 0
      // Salva como % no input (ex: 0.01 fração -> 1%, 1 -> 1%)
      const pIndPct =
        pIndSalvo <= 1 && pIndSalvo > 0 ? Number((pIndSalvo * 100).toFixed(2)) : pIndSalvo
      setPercentualIndicacaoAuto(pIndPct)
      setValorManualIndicacao(
        initialOrcamento.valor_manual_indicacao !== undefined &&
          initialOrcamento.valor_manual_indicacao !== null
          ? Number(initialOrcamento.valor_manual_indicacao)
          : initialOrcamento.custo_indicacao || 0,
      )

      // Compatibilidade com orçamentos antigos:
      // Se custo_materiais_equipamentos estiver definido, usa ele e materiaisExtras = custo_materiais_extras || 0.
      // Se não estiver (orçamento antigo), usa materiaisEquipamentos = custo_materiais_extras || 0 e materiaisExtras = 0.
      const temMateriaisEquipDefinido =
        initialOrcamento.custo_materiais_equipamentos !== undefined &&
        initialOrcamento.custo_materiais_equipamentos !== null
      let matEquipInicial = temMateriaisEquipDefinido
        ? Number(initialOrcamento.custo_materiais_equipamentos) || 0
        : Number(initialOrcamento.custo_materiais_extras) || 0

      // Se o usuário já selecionou um fornecedor nesta sessão do modal para este orçamento, preserva o valor selecionado
      if (
        fornecedorAplicadoRef.current &&
        initialOrcamento.fornecedor_selecionado_id &&
        fornecedorAplicadoRef.current.id === initialOrcamento.fornecedor_selecionado_id
      ) {
        matEquipInicial = Number(fornecedorAplicadoRef.current.valor)
      }

      const matExtrasInicial = temMateriaisEquipDefinido
        ? Number(initialOrcamento.custo_materiais_extras) || 0
        : 0

      setCustos({
        maoDeObra: mdo > 0 ? mdo : qtdPlacas * initialValPlaca,
        materiaisEquipamentos: matEquipInicial,
        materiaisExtras: matExtrasInicial,
        freteGuincho: initialOrcamento.custo_frete_guincho || 0,
        subestacao: initialOrcamento.custo_subestacao || 0,
        terceirizacao: initialOrcamento.custo_terceirizacao || 0,
        administracao: initialOrcamento.custo_administracao || 0,
        marketingCombustivel: initialOrcamento.custo_marketing_combustivel || 0,
        riscoEngenharia: riscoPadrao,
        comissaoComercial: initialOrcamento.custo_comissao_comercial || 0,
        indicacao: initialOrcamento.custo_indicacao || 0,
        impostos: initialOrcamento.custo_impostos || 0,
        opcaoImposto: optImp,
        valorPorPlaca: initialValPlaca,
        desconto: initialDesconto,
      })

      // Parcelamentos salvos ou defaults
      setParcelasCartao(
        initialOrcamento.parcelas_cartao !== undefined && initialOrcamento.parcelas_cartao > 0
          ? initialOrcamento.parcelas_cartao
          : 18,
      )
      setJurosCartao(
        initialOrcamento.juros_cartao !== undefined ? initialOrcamento.juros_cartao : 1.49,
      )
      setEntradaCartao(
        initialOrcamento.entrada_cartao !== undefined && initialOrcamento.entrada_cartao > 0
          ? initialOrcamento.entrada_cartao
          : 0,
      )
      setParcelasBanco1(
        initialOrcamento.parcelas_financiamento_banco1 !== undefined &&
          initialOrcamento.parcelas_financiamento_banco1 > 0
          ? initialOrcamento.parcelas_financiamento_banco1
          : 60,
      )
      setJurosBanco1(
        initialOrcamento.juros_financiamento_banco1 !== undefined
          ? initialOrcamento.juros_financiamento_banco1
          : 1.9,
      )
      setEntradaBanco1(
        initialOrcamento.entrada_financiamento_banco1 !== undefined &&
          initialOrcamento.entrada_financiamento_banco1 > 0
          ? initialOrcamento.entrada_financiamento_banco1
          : 0,
      )
      setParcelasBanco2(
        initialOrcamento.parcelas_financiamento_banco2 !== undefined &&
          initialOrcamento.parcelas_financiamento_banco2 > 0
          ? initialOrcamento.parcelas_financiamento_banco2
          : 60,
      )
      setJurosBanco2(
        initialOrcamento.juros_financiamento_banco2 !== undefined
          ? initialOrcamento.juros_financiamento_banco2
          : 0.99,
      )
      setEntradaBanco2(
        initialOrcamento.entrada_financiamento_banco2 !== undefined &&
          initialOrcamento.entrada_financiamento_banco2 > 0
          ? initialOrcamento.entrada_financiamento_banco2
          : 0,
      )

      // Carrega usinas selecionadas salvas no orçamento
      if (
        Array.isArray(initialOrcamento.instalacoes_selecionadas) &&
        initialOrcamento.instalacoes_selecionadas.length > 0
      ) {
        setInstalacoesSelecionadasIds(initialOrcamento.instalacoes_selecionadas)
      } else {
        setInstalacoesSelecionadasIds([])
      }

      // Seções Habilitadas e Layout do Telhado
      const initialSecoes: PropostaSecoesHabilitadas = {
        layoutTelhado:
          initialOrcamento.secoes_habilitadas?.layoutTelhado !== undefined
            ? Boolean(initialOrcamento.secoes_habilitadas.layoutTelhado)
            : initialOrcamento.layout_telhado_habilitado !== undefined
              ? Boolean(initialOrcamento.layout_telhado_habilitado)
              : true,
        fotosProjeto:
          initialOrcamento.secoes_habilitadas?.fotosProjeto !== undefined
            ? Boolean(initialOrcamento.secoes_habilitadas.fotosProjeto)
            : true,
        sazonalidadeSolar:
          initialOrcamento.secoes_habilitadas?.sazonalidadeSolar !== undefined
            ? Boolean(initialOrcamento.secoes_habilitadas.sazonalidadeSolar)
            : true,
        portfolioUsinas:
          initialOrcamento.secoes_habilitadas?.portfolioUsinas !== undefined
            ? Boolean(initialOrcamento.secoes_habilitadas.portfolioUsinas)
            : true,
      }
      setSecoesHabilitadas(initialSecoes)
      setLayoutTelhadoHabilitado(initialSecoes.layoutTelhado !== false)
      setLayoutTelhadoFile(null)
      if (initialOrcamento.layout_telhado) {
        setLayoutTelhadoPreviewUrl(
          `/api/files/orcamentos_solar/${initialOrcamento.id}/${initialOrcamento.layout_telhado}`,
        )
      } else {
        setLayoutTelhadoPreviewUrl(null)
      }
    } else {
      // Seções habilitadas e Layout do telhado inicial (novo orçamento)
      setSecoesHabilitadas({
        layoutTelhado: true,
        fotosProjeto: true,
        sazonalidadeSolar: true,
        portfolioUsinas: true,
      })
      setLayoutTelhadoHabilitado(true)
      setLayoutTelhadoFile(null)
      setLayoutTelhadoPreviewUrl(null)

      // Novo orçamento: defaults
      setEnquadramento('GD_II')
      setPadraoFases('monofásico')
      setInstalacoesSelecionadasIds([])
      setTarifaKwh(1.19)
      setFioBKwh(0.2239)
      setFatorSimultaneidadeManual('')
      setValorPorPlaca(150)
      setDescontoPercentual(0)
      setOpcaoImpostoModificadaManualmente(false)
      setGeracaoPretendidaKwhMes(650)
      setGeracaoPretendidaEditadaManualmente(false)
      setGeracaoSimuladaKwhAno('')
      setAjusteSolergoAtivo(false)
      setGeracaoFonte('automatico')
      setGeracaoMensalSolergo(null)
      setImagemSolergoFile(null)
      setMaoDeObraEditadaManualmente(false)
      setManualAdministracao(false)
      setValorManualAdministracao(0)
      setManualComissao(false)
      setValorManualComissao(0)
      setManualIndicacao(false)
      setValorManualIndicacao(0)
      setPercentualIndicacaoAuto(0)
      setFornecedorSelecionadoId('')
      setValorInvestimentoManual(0)
      setInvestimentoEditadoManualmente(false)

      setCustos((prev) => ({
        ...prev,
        maoDeObra: 10 * 150,
        materiaisEquipamentos: 0,
        materiaisExtras: 0,
        riscoEngenharia: 400,
        opcaoImposto: prev.opcaoImposto || 1,
        valorPorPlaca: 150,
        desconto: 0,
      }))

      setParcelasCartao(18)
      setJurosCartao(1.49)
      setEntradaCartao(0)
      setParcelasBanco1(60)
      setJurosBanco1(1.9)
      setEntradaBanco1(0)
      setParcelasBanco2(60)
      setJurosBanco2(0.99)
      setEntradaBanco2(0)

      setGarantiaModulosDegradacaoAnos(30)
      setGarantiaModulosFabricacaoAnos(15)
      setGarantiaInversorAnos(10)

      // Conteúdo editável padrão para novos orçamentos
      setConteudoProposta(normalizarConteudoProposta(null))

      const listaClientes = clientesRef.current
      if (initialClienteId) {
        setSelectedClienteId(initialClienteId)
      } else if (listaClientes.length > 0) {
        setSelectedClienteId(listaClientes[0].id)
      }
    }
  }, [isOpen, initialOrcamento, initialClienteId])

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
      if (!geracaoPretendidaEditadaManualmente) {
        setGeracaoPretendidaKwhMes(clienteAtual.consumo_kwh_mes)
      }
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
    // Requisito 1: Mão de obra de instalação é preenchida automaticamente com número de placas * valor por placa se não editada manualmente
    if (!maoDeObraEditadaManualmente) {
      const novoMdo = Math.max(0, qtd) * Math.max(0, valorPorPlaca)
      setCustos((prev) => ({ ...prev, maoDeObra: novoMdo }))
    }
  }

  // Handler para mudança no campo 'Valor por placa'
  const handleValorPorPlacaChange = (val: number) => {
    const valNumerico = Math.max(0, val || 0)
    setValorPorPlaca(valNumerico)
    if (!maoDeObraEditadaManualmente) {
      const novoMdo = Math.max(0, numeroPlacas) * valNumerico
      setCustos((prev) => ({ ...prev, maoDeObra: novoMdo, valorPorPlaca: valNumerico }))
    } else {
      setCustos((prev) => ({ ...prev, valorPorPlaca: valNumerico }))
    }
  }

  // Handler para alteração manual da mão de obra
  const handleMaoDeObraManualChange = (val: number) => {
    setMaoDeObraEditadaManualmente(true)
    setCustos((prev) => ({ ...prev, maoDeObra: Math.max(0, val || 0) }))
  }

  // Resetar mão de obra para o cálculo automático (número de placas * valor por placa)
  const handleResetarMaoDeObraAuto = () => {
    setMaoDeObraEditadaManualmente(false)
    const novoMdo = Math.max(0, numeroPlacas) * Math.max(0, valorPorPlaca)
    setCustos((prev) => ({ ...prev, maoDeObra: novoMdo }))
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

  // Dimensionamento automático a partir da geração pretendida mensal informada (convertida para kWh/ano = mensal * 12)
  const dimensionamentoSugerido = useMemo(() => {
    const geracaoMensalNum = Number(geracaoPretendidaKwhMes) || 0
    if (geracaoMensalNum <= 0) return null
    const geracaoAnualCalculo = Math.round(geracaoMensalNum * 12)
    return dimensionarSistemaPorGeracaoPretendida(
      geracaoAnualCalculo,
      orientacaoTelhado,
      potenciaPlacaWp,
    )
  }, [geracaoPretendidaKwhMes, orientacaoTelhado, potenciaPlacaWp])

  // Ação para aplicar o dimensionamento sugerido ao campo "Potência do sistema (kWp)"
  const handleAplicarDimensionamento = () => {
    if (!dimensionamentoSugerido) return
    const novoKwp = dimensionamentoSugerido.potenciaKwpNecessaria
    setPotenciaKwp(novoKwp)
    const placas = dimensionamentoSugerido.numeroPlacasSugerido
    setNumeroPlacas(placas)
    setAreaNecessariaM2(Math.round(placas * 2.4))
    if (!maoDeObraEditadaManualmente) {
      const novoMdo = Math.max(0, placas) * Math.max(0, valorPorPlaca)
      setCustos((prev) => ({ ...prev, maoDeObra: novoMdo }))
    }
  }

  // Rastreia se o usuário escolheu explicitamente / manualmente a Opção 1 ou 2 clicando nos radio buttons
  const [opcaoImpostoModificadaManualmente, setOpcaoImpostoModificadaManualmente] =
    useState<boolean>(false)

  // Comparativo simultâneo de ambas as opções fiscais (Opção 1 e Opção 2) para identificar a de menor imposto
  const comparativoImpostos = useMemo(() => {
    return determinarMenorOpcaoImposto({
      materiaisEquipamentos: custos.materiaisEquipamentos || 0,
      materiaisExtras: custos.materiaisExtras || 0,
      maoDeObra: custos.maoDeObra || 0,
      riscoEngenharia: custos.riscoEngenharia !== undefined ? custos.riscoEngenharia : 400,
      freteGuincho: custos.freteGuincho || 0,
      subestacao: custos.subestacao || 0,
      terceirizacao: custos.terceirizacao || 0,
      marketingCombustivel: custos.marketingCombustivel || 0,
      descontoPercentual,
      manualAdministracao,
      valorManualAdministracao,
      manualComissao,
      valorManualComissao,
      percentualIndicacaoAuto: (Number(percentualIndicacaoAuto) || 0) / 100,
      manualIndicacao,
      valorManualIndicacao,
    })
  }, [
    custos.materiaisEquipamentos,
    custos.materiaisExtras,
    custos.maoDeObra,
    custos.riscoEngenharia,
    custos.freteGuincho,
    custos.subestacao,
    custos.terceirizacao,
    custos.marketingCombustivel,
    descontoPercentual,
    manualAdministracao,
    valorManualAdministracao,
    manualComissao,
    valorManualComissao,
    percentualIndicacaoAuto,
    manualIndicacao,
    valorManualIndicacao,
  ])

  // Se o modal for reaberto ou o cliente mudar em um orçamento novo, reseta a escolha manual e sincroniza com a menor opção
  useEffect(() => {
    if (!initialOrcamento) {
      setOpcaoImpostoModificadaManualmente(false)
      setOpcaoImposto(comparativoImpostos.melhorOpcao)
    }
  }, [isOpen, selectedClienteId, initialOrcamento])

  // Atualiza automaticamente para a opção de menor imposto calculada quando não houver escolha manual do usuário
  useEffect(() => {
    if (!opcaoImpostoModificadaManualmente) {
      setOpcaoImposto(comparativoImpostos.melhorOpcao)
    }
  }, [comparativoImpostos.melhorOpcao, opcaoImpostoModificadaManualmente])

  // Handler para seleção manual do usuário nos radio buttons da opção de imposto
  const handleSelecionarOpcaoImpostoManual = (opcao: 1 | 2) => {
    setOpcaoImpostoModificadaManualmente(true)
    setOpcaoImposto(opcao)
  }

  // Cálculos automáticos da Aba de Custos (Requisitos 1 a 6 + Desconto em percentual + Modos Manuais) usando calcularCustosAba de src/lib/energiaSolar.ts
  const resultadoCustosAba = useMemo(() => {
    if (opcaoImposto === 1) return comparativoImpostos.resultadoOpcao1
    return comparativoImpostos.resultadoOpcao2
  }, [opcaoImposto, comparativoImpostos])

  // Sincroniza os campos calculados automaticamente (impostos, administração, comissão, indicação, desconto derivado em R$) no estado custos
  useEffect(() => {
    setCustos((prev) => {
      if (
        prev.impostos === resultadoCustosAba.impostos &&
        prev.administracao === resultadoCustosAba.administracao &&
        prev.comissaoComercial === resultadoCustosAba.comissaoComercial &&
        prev.indicacao === resultadoCustosAba.indicacao &&
        prev.opcaoImposto === opcaoImposto &&
        prev.valorPorPlaca === valorPorPlaca &&
        prev.desconto === resultadoCustosAba.desconto
      ) {
        return prev
      }
      return {
        ...prev,
        impostos: resultadoCustosAba.impostos,
        administracao: resultadoCustosAba.administracao,
        comissaoComercial: resultadoCustosAba.comissaoComercial,
        indicacao: resultadoCustosAba.indicacao,
        opcaoImposto,
        valorPorPlaca,
        desconto: resultadoCustosAba.desconto,
      }
    })
  }, [resultadoCustosAba, opcaoImposto, valorPorPlaca])

  // Fornecedor selecionado atualmente no comparativo / contexto
  const fornecedorSelecionadoObj = useMemo(() => {
    if (!fornecedorSelecionadoId) return null
    return fornecedoresOrcamentos.find((f) => f.id === fornecedorSelecionadoId) || null
  }, [fornecedoresOrcamentos, fornecedorSelecionadoId])

  // Custo somado bruto da aba de custos: se as fórmulas automáticas geraram valorTotal, usa ele; senão soma direta
  const totalCustosCalculado = useMemo(() => {
    return resultadoCustosAba.valorTotal > 0
      ? resultadoCustosAba.valorTotal
      : somarCustosSolar(custos)
  }, [resultadoCustosAba.valorTotal, custos])

  // Total de custos líquido com desconto deduzido = max(0, total bruto - desconto)
  const totalCustosComDesconto = useMemo(() => {
    const desconto = Number(resultadoCustosAba.desconto) || 0
    return Math.max(0, totalCustosCalculado - desconto)
  }, [totalCustosCalculado, resultadoCustosAba.desconto])

  // Valor do investimento: se o usuário editou na mão usa ele; senão usa os custos líquidos com desconto; fallback por kWp
  const valorInvestimentoFinal = useMemo(() => {
    if (investimentoEditadoManualmente && valorInvestimentoManual > 0) {
      return valorInvestimentoManual
    }
    if (totalCustosComDesconto > 0) {
      return totalCustosComDesconto
    }
    // fallback padrão proporcional ao kWp (ex: R$ 3.800/kWp)
    return potenciaKwp > 0 ? Math.round(potenciaKwp * 3800) : 0
  }, [investimentoEditadoManualmente, valorInvestimentoManual, totalCustosComDesconto, potenciaKwp])

  // Cálculos solares dinâmicos em tempo real
  const calculos = useMemo(() => {
    const geracaoSimuladaNum =
      geracaoSimuladaKwhAno !== '' && Number(geracaoSimuladaKwhAno) > 0
        ? Number(geracaoSimuladaKwhAno)
        : undefined

    return calcularOrcamentoSolar({
      consumoKwhMes,
      tipoCliente,
      padraoFases,
      enquadramento,
      tarifaKwh,
      potenciaKwp,
      orientacaoTelhado,
      custos,
      valorInvestimentoInformado: valorInvestimentoFinal,
      geracaoSimuladaKwhAno: geracaoSimuladaNum,
      geracaoMensalCustomizada:
        ajusteSolergoAtivo && geracaoMensalSolergo?.length === 12
          ? geracaoMensalSolergo
          : undefined,
      fioBKwh,
      fatorSimultaneidade:
        fatorSimultaneidadeManual !== '' ? Number(fatorSimultaneidadeManual) : undefined,
      configParcelamentos: {
        parcelasCartao,
        jurosCartao,
        entradaCartao,
        parcelasBanco1,
        jurosBanco1,
        entradaBanco1,
        parcelasBanco2,
        jurosBanco2,
        entradaBanco2,
      },
    })
  }, [
    consumoKwhMes,
    tipoCliente,
    padraoFases,
    enquadramento,
    tarifaKwh,
    potenciaKwp,
    orientacaoTelhado,
    custos,
    valorInvestimentoFinal,
    geracaoSimuladaKwhAno,
    ajusteSolergoAtivo,
    geracaoMensalSolergo,
    fioBKwh,
    fatorSimultaneidadeManual,
    parcelasCartao,
    jurosCartao,
    entradaCartao,
    parcelasBanco1,
    jurosBanco1,
    entradaBanco1,
    parcelasBanco2,
    jurosBanco2,
    entradaBanco2,
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
        fotoModuloUrl: fotoModuloUrl || undefined,
        marcaInversor,
        fotoInversorUrl: fotoInversorUrl || undefined,
        quantidadeInversores,
        tipoEstrutura,
        orientacaoTelhado,
        areaNecessariaM2,
        codigoFiname: codigoFiname.trim() || undefined,
        prazoEntregaDias,
        garantiaModulosAnos: garantiaModulosDegradacaoAnos,
        garantiaModulosFabricacaoAnos: garantiaModulosFabricacaoAnos,
        garantiaInversorAnos: garantiaInversorAnos,
        garantiaInstalacaoTexto: '12 meses',
      },
      calculos,
      fotosInstalacoes: usinasGaleria.map((u) => ({
        id: u.id,
        titulo: u.titulo,
        url: getFotoUrl(u) || '',
        cidade: u.cidade || '',
        potenciaKwp: Number(u.potencia_kwp) || undefined,
      })),
      instalacoesSelecionadasIds:
        instalacoesSelecionadasIds.length > 0 ? instalacoesSelecionadasIds : undefined,
      dataEmissao: new Date().toISOString(),
      validadeDias: 5,
      observacoes,
      ajusteSolergoAtivo,
      geracaoMensalSolergo:
        ajusteSolergoAtivo && geracaoMensalSolergo?.length === 12
          ? geracaoMensalSolergo
          : undefined,
      layoutTelhadoUrl: layoutTelhadoPreviewUrl,
      layoutTelhadoHabilitado,
      secoesHabilitadas: {
        layoutTelhado: layoutTelhadoHabilitado,
        fotosProjeto: secoesHabilitadas.fotosProjeto !== false,
        sazonalidadeSolar: secoesHabilitadas.sazonalidadeSolar !== false,
        portfolioUsinas: secoesHabilitadas.portfolioUsinas !== false,
      },
      conteudo: conteudoProposta,
    }
  }, [
    conteudoProposta,
    clienteAtual,
    tipoCliente,
    user,
    potenciaKwp,
    consumoKwhMes,
    numeroPlacas,
    potenciaPlacaWp,
    marcaPainel,
    fotoModuloUrl,
    marcaInversor,
    fotoInversorUrl,
    quantidadeInversores,
    tipoEstrutura,
    orientacaoTelhado,
    areaNecessariaM2,
    codigoFiname,
    prazoEntregaDias,
    garantiaModulosDegradacaoAnos,
    garantiaModulosFabricacaoAnos,
    garantiaInversorAnos,
    calculos,
    usinasGaleria,
    instalacoesSelecionadasIds,
    observacoes,
    ajusteSolergoAtivo,
    geracaoMensalSolergo,
    layoutTelhadoPreviewUrl,
    layoutTelhadoHabilitado,
    secoesHabilitadas,
  ])

  // HTML fiel e atualizado em tempo real da proposta técnico-comercial
  const htmlPropostaPreview = useMemo<string>(() => {
    if (!propostaPDFData) return ''
    try {
      return gerarHTMLPropostaSolar(propostaPDFData)
    } catch (err) {
      console.error('Erro ao gerar HTML da proposta para preview fiel:', err)
      return '<div style="padding:20px;color:#b91c1c;font-family:sans-serif;">Não foi possível carregar o preview da proposta. Verifique os dados preenchidos.</div>'
    }
  }, [propostaPDFData])

  if (!isOpen) return null

  // Salvar no PocketBase com controle de revisões
  const handleSalvar = async () => {
    if (!clienteAtual) {
      toast.error('Selecione um cliente para vincular o orçamento.')
      return
    }

    // Validação obrigatória: Fornecedor de equipamentos vinculado
    if (!fornecedorSelecionadoId) {
      toast.error('É obrigatório vincular um fornecedor de equipamentos para salvar o orçamento.')
      setActiveTab('tecnico')
      return
    }

    setIsSubmitting(true)
    try {
      // Mapear status geral para status_revisao
      let statusRevisao: 'em análise' | 'enviada ao cliente' | 'aprovada' | 'rejeitada' =
        'em análise'
      if (status === 'Aprovado') statusRevisao = 'aprovada'
      else if (status === 'Rejeitado') statusRevisao = 'rejeitada'
      else if (status === 'Enviado ao cliente') statusRevisao = 'enviada ao cliente'

      // Se initialOrcamento existe, calcular próxima revisão
      let numeroRevisao = 1
      let revisaoDeId: string | undefined = undefined

      if (initialOrcamento?.id) {
        // Encontrar a proposta raiz (se ela já for revisão_de, usa revisao_de, senão usa o próprio id)
        const raizId = initialOrcamento.revisao_de || initialOrcamento.id
        revisaoDeId = raizId

        // Buscar todas as revisões deste projeto para descobrir a maior revisão
        const revisoesDoGrupo = orcamentosSolar.filter(
          (o) => o.id === raizId || o.revisao_de === raizId,
        )
        const maxRevisao = revisoesDoGrupo.reduce((max, cur) => {
          const revNum = cur.numero_revisao || 1
          return revNum > max ? revNum : max
        }, initialOrcamento.numero_revisao || 1)

        numeroRevisao = maxRevisao + 1
      }

      const payload: Partial<OrcamentoSolar> = {
        cliente_id: clienteAtual.id,
        status,
        numero_revisao: numeroRevisao,
        revisao_de: revisaoDeId,
        status_revisao: statusRevisao,
        enquadramento: enquadramento,
        padrao_fases: padraoFases,
        tipo_cliente: tipoCliente,
        consumo_kwh_mes: consumoKwhMes,
        geracao_pretendida_kwh_ano:
          geracaoPretendidaKwhMes && Number(geracaoPretendidaKwhMes) > 0
            ? Math.round(Number(geracaoPretendidaKwhMes) * 12)
            : undefined,
        geracao_simulada_kwh_ano:
          geracaoSimuladaKwhAno !== '' && Number(geracaoSimuladaKwhAno) > 0
            ? Number(geracaoSimuladaKwhAno)
            : undefined,
        geracao_fonte: geracaoFonte,
        ajuste_solergo_ativo: ajusteSolergoAtivo,
        geracao_mensal_solergo_json:
          ajusteSolergoAtivo && geracaoMensalSolergo?.length === 12 ? geracaoMensalSolergo : null,
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
        valor_por_placa: valorPorPlaca,
        opcao_imposto: opcaoImposto,
        desconto: resultadoCustosAba.desconto || 0,
        fornecedor_selecionado_id: fornecedorSelecionadoId || undefined,
        custo_mao_de_obra: custos.maoDeObra,
        custo_materiais_equipamentos: custos.materiaisEquipamentos,
        custo_materiais_extras: custos.materiaisExtras,
        custo_frete_guincho: custos.freteGuincho,
        custo_subestacao: custos.subestacao,
        custo_terceirizacao: custos.terceirizacao,
        custo_administracao: resultadoCustosAba.administracao,
        custo_marketing_combustivel: custos.marketingCombustivel,
        custo_risco_engenharia: custos.riscoEngenharia !== undefined ? custos.riscoEngenharia : 400,
        custo_comissao_comercial: resultadoCustosAba.comissaoComercial,
        custo_indicacao: resultadoCustosAba.indicacao,
        custo_impostos: resultadoCustosAba.impostos,
        valor_total_custos: totalCustosCalculado,
        custo_por_kwp: calculos.custoPorKwpInstalado,
        manual_administracao: manualAdministracao,
        manual_comissao: manualComissao,
        manual_indicacao: manualIndicacao,
        percentual_indicacao_auto: (Number(percentualIndicacaoAuto) || 0) / 100,
        valor_manual_administracao: manualAdministracao ? valorManualAdministracao : undefined,
        valor_manual_comissao: manualComissao ? valorManualComissao : undefined,
        valor_manual_indicacao: manualIndicacao ? valorManualIndicacao : undefined,

        // Fio B e GD Eco Líquida
        fio_b: calculos.fioBKwh,
        fator_simultaneidade: calculos.fatorSimultaneidade,
        gd_eco_liquida: calculos.gdEcoLiquidaKwh,

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
        iof_financiamento_banco1: calculos.parcelamentos.financiamentoBanco1.valorIof,
        iof_financiamento_banco2: calculos.parcelamentos.financiamentoBanco2.valorIof,
        parcelas_cartao: parcelasCartao,
        juros_cartao: jurosCartao,
        entrada_cartao: entradaCartao,
        parcelas_financiamento_banco1: parcelasBanco1,
        juros_financiamento_banco1: jurosBanco1,
        entrada_financiamento_banco1: entradaBanco1,
        parcelas_financiamento_banco2: parcelasBanco2,
        juros_financiamento_banco2: jurosBanco2,
        entrada_financiamento_banco2: entradaBanco2,

        // Garantias dinâmicas
        garantia_modulos_degradacao_anos: garantiaModulosDegradacaoAnos,
        garantia_modulos_fabricacao_anos: garantiaModulosFabricacaoAnos,
        garantia_inversor_anos: garantiaInversorAnos,

        // Instalações da galeria selecionadas para a proposta
        instalacoes_selecionadas:
          instalacoesSelecionadasIds.length > 0 ? instalacoesSelecionadasIds : null,

        layout_telhado_habilitado: layoutTelhadoHabilitado,
        secoes_habilitadas: {
          layoutTelhado: layoutTelhadoHabilitado,
          fotosProjeto: secoesHabilitadas.fotosProjeto !== false,
          sazonalidadeSolar: secoesHabilitadas.sazonalidadeSolar !== false,
          portfolioUsinas: secoesHabilitadas.portfolioUsinas !== false,
        },
        conteudo_proposta: conteudoProposta,
        data_orcamento: new Date().toISOString(),
        validade_dias: 5,
        autor: user?.name || 'Delfos Solar',
        observacoes,
      }

      // Se houver arquivo selecionado ou flags a persistir com binário, empacotar via FormData
      let dataToSend: Partial<OrcamentoSolar> | FormData = payload
      if (layoutTelhadoFile || imagemSolergoFile) {
        const formData = new FormData()
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            if (Array.isArray(v) || typeof v === 'object') {
              formData.append(k, JSON.stringify(v))
            } else {
              formData.append(k, String(v))
            }
          }
        })
        if (layoutTelhadoFile) {
          formData.append('layout_telhado', layoutTelhadoFile)
        }
        if (imagemSolergoFile) {
          formData.append('imagem_solergo', imagemSolergoFile)
        }
        dataToSend = formData
      }

      let orcamentoSalvoId = ''
      if (initialOrcamento?.id) {
        // Ao gerar/salvar alterações de um orçamento existente, cria a nova Revisão N para manter o histórico
        const novaRevisao = await addOrcamentoSolar(dataToSend)
        orcamentoSalvoId = novaRevisao.id
        const { toast } = await import('sonner')
        toast.success(`Nova versão salva com sucesso: Revisão ${numeroRevisao}`)
      } else {
        const created = await addOrcamentoSolar(dataToSend)
        orcamentoSalvoId = created.id
      }

      // Adicionar atividade na timeline do cliente
      try {
        await addAtividade({
          cliente_id: clienteAtual.id,
          tipo: 'proposta',
          titulo: `Proposta Solar (Revisão ${numeroRevisao}): ${potenciaKwp} kWp (${status})`,
          descricao: `Proposta Solar (Revisão ${numeroRevisao}) de ${potenciaKwp} kWp com ${numeroPlacas} placas (${potenciaPlacaWp}W) e inversor ${marcaInversor}.\nInvestimento total: ${formatCurrency(
            valorInvestimentoFinal,
          )} | Geração média: ${calculos.geracaoMediaMensalKwh} kWh/mês | Payback: ${
            calculos.paybackMeses
          } meses.\nStatus: ${status} (${statusRevisao}).`,
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

  // Gerar PDF direto da visualização através do iframe (ou nova aba como fallback seguro)
  const handleGerarPDF = () => {
    if (!propostaPDFData) {
      alert('Selecione um cliente para gerar o PDF da proposta.')
      return
    }
    const iframeWin = previewIframeRef.current?.contentWindow
    if (iframeWin) {
      try {
        iframeWin.focus()
        iframeWin.print()
        return
      } catch (err) {
        console.warn('Falha ao imprimir direto pelo iframe, abrindo em nova aba:', err)
      }
    }
    abrirPropostaSolarEmNovaAba(propostaPDFData)
  }

  // Gera e baixa o documento Word (.docx) com os mesmos dados e seções habilitadas do preview
  const handleGerarPropostaWord = async () => {
    if (!propostaPDFData) {
      alert('Selecione um cliente para gerar a proposta em Word.')
      return
    }

    try {
      setIsGeneratingWord(true)
      await baixarPropostaSolarDocx(propostaPDFData)
    } catch (err) {
      console.error('Erro ao gerar proposta Word:', err)
      alert('Ocorreu um erro ao gerar o documento Word. Tente novamente.')
    } finally {
      setIsGeneratingWord(false)
    }
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
                    ? `Editar Orçamento / Gerar Nova Revisão`
                    : 'Novo Orçamento de Energia Solar Fotovoltaica'}
                </h2>
                {initialOrcamento?.numero_revisao && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    Revisão Atual: {initialOrcamento.numero_revisao}
                  </span>
                )}
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
              {totalCustosComDesconto > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {formatCurrency(totalCustosComDesconto)}
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
          {/* ========================================================================= */}
          {/* ABA 1: DADOS TÉCNICOS & SISTEMA                                           */}
          {/* ========================================================================= */}
          {activeTab === 'tecnico' && (
            <div className="space-y-4 animate-in fade-in duration-150 relative">
              {/* 1. BARRA SUPERIOR (não colapsável) */}
              <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-emerald-600 backdrop-blur-md">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-600/50">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                      Resumo Instantâneo do Sistema Solar (Erechim/RS)
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-200">
                    Potência: <strong className="text-white">{potenciaKwp.toFixed(2)} kWp</strong> •
                    Investimento:{' '}
                    <strong className="text-white">{formatCurrency(valorInvestimentoFinal)}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2.5">
                  <div className="bg-white/10 p-2 sm:p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                      Geração Média
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {calculos.geracaoMediaMensalKwh.toLocaleString('pt-BR')} kWh
                    </span>
                    <span className="text-[10px] text-emerald-300 block">/mês estimada</span>
                  </div>

                  <div className="bg-white/10 p-2 sm:p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                      Geração Anual
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {calculos.geracaoAnualEstimadaKwh.toLocaleString('pt-BR')} kWh
                    </span>
                    <span className="text-[10px] text-emerald-300 block">no primeiro ano</span>
                  </div>

                  <div className="bg-white/10 p-2 sm:p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                      Economia Mensal
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-amber-300">
                      {formatCurrency(calculos.economia1Mes)}
                    </span>
                    <span className="text-[10px] text-emerald-300 block">
                      {formatCurrency(calculos.economia1Ano)}/ano
                    </span>
                  </div>

                  <div className="bg-white/10 p-2 sm:p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                      Conta após Solar
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {formatCurrency(calculos.contaPrimeiroMesComSolar)}
                    </span>
                    <span className="text-[10px] text-emerald-300 block">
                      antes: {formatCurrency(calculos.contaAtualSemSolarMes)}
                    </span>
                  </div>

                  <div className="bg-white/10 p-2 sm:p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                      Payback
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {calculos.paybackMeses} meses
                    </span>
                    <span className="text-[10px] text-emerald-300 block">
                      ~ {calculos.paybackAnos} anos
                    </span>
                  </div>

                  <div className="bg-white/10 p-2 sm:p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                    <span className="text-[10px] text-emerald-200 uppercase font-semibold block">
                      Custo por kWp
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {formatCurrency(calculos.custoPorKwpInstalado)}
                    </span>
                    <span className="text-[10px] text-emerald-300 block">instalado</span>
                  </div>
                </div>
              </div>

              {/* 2. DADOS DO CLIENTE (aberto por padrão) */}
              <SecaoAcordeao
                titulo="2. Dados do Cliente"
                subtitulo="Busca automática de cliente, documento, cidade e endereço"
                icone={<User className="w-4 h-4" />}
                aberta={secaoClienteAberta}
                overflowVisible
                className="relative z-30"
                onToggle={() => setSecaoClienteAberta((prev) => !prev)}
                badge={
                  clienteAtual ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      UC: {clienteAtual.uc || 'Não informada'}
                    </span>
                  ) : undefined
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start relative z-30">
                  <div className="relative z-30">
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
              </SecaoAcordeao>

              {/* 3. DADOS DE ENTRADA DO SISTEMA (aberto por padrão) */}
              <SecaoAcordeao
                titulo="3. Dados de Entrada do Sistema"
                subtitulo="Consumo médio, geração pretendida, tipo, padrão, enquadramento, tarifa e potência"
                icone={<Sliders className="w-4 h-4" />}
                aberta={secaoEntradaAberta}
                onToggle={() => setSecaoEntradaAberta((prev) => !prev)}
                badge={
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {potenciaKwp.toFixed(2)} kWp • {consumoKwhMes} kWh/mês
                  </span>
                }
              >
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
                      onChange={(e) => {
                        const novoConsumo = Number(e.target.value) || 0
                        setConsumoKwhMes(novoConsumo)
                        if (!geracaoPretendidaEditadaManualmente) {
                          setGeracaoPretendidaKwhMes(novoConsumo)
                        }
                      }}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 650"
                    />
                  </div>

                  {/* Geração pretendida (kWh/mês) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-gray-700 block">
                        Geração pretendida (kWh/mês)
                      </label>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        Dimensiona kWp
                      </span>
                    </div>
                    <input
                      type="number"
                      value={geracaoPretendidaKwhMes}
                      min={0}
                      step={10}
                      onChange={(e) => {
                        setGeracaoPretendidaEditadaManualmente(true)
                        const val = e.target.value
                        setGeracaoPretendidaKwhMes(val === '' ? '' : Number(val) || 0)
                      }}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 790 (ou mais que o consumo médio)"
                      title="Informe a energia média mensal desejada (kWh/mês) caso queira dimensionar um sistema maior que o consumo médio atual"
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

                  {/* Padrão de Ligação (Fases) */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Padrão de Ligação (Fases) *
                    </label>
                    <select
                      value={padraoFases}
                      onChange={(e) => setPadraoFases(e.target.value as PadraoFasesSolar)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="monofásico">Monofásico</option>
                      <option value="bifásico">Bifásico</option>
                      <option value="trifásico">Trifásico</option>
                    </select>
                  </div>

                  {/* Enquadramento Regulatório */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Enquadramento *
                    </label>
                    <select
                      value={enquadramento}
                      onChange={(e) => setEnquadramento(e.target.value as EnquadramentoSolar)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="GD_I">GD I — Protegido (sem Fio B)</option>
                      <option value="GD_II">GD II — Novo Marco Legal (Fio B progressivo)</option>
                    </select>
                  </div>

                  {/* Tarifa concessionária */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Tarifa cheia (R$ por kWh) *
                    </label>
                    <input
                      type="number"
                      value={tarifaKwh}
                      min={0.1}
                      step={0.0001}
                      onChange={(e) => setTarifaKwh(Number(e.target.value) || 0)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: 1.1979"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      GD Eco Líquida: {calculos.gdEcoLiquidaKwh.toFixed(4)} R$/kWh (FS:{' '}
                      {(calculos.fatorSimultaneidade * 100).toFixed(0)}%)
                    </span>
                  </div>

                  {/* Potência do sistema em kWp */}
                  <div className="sm:col-span-2">
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
                    {dimensionamentoSugerido && (
                      <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-emerald-700 font-medium leading-tight">
                          Sugerido:{' '}
                          {geracaoPretendidaKwhMes && (
                            <>
                              <strong>
                                {Number(geracaoPretendidaKwhMes).toLocaleString('pt-BR')} kWh/mês
                              </strong>{' '}
                              (~
                              {dimensionamentoSugerido.geracaoPretendidaKwhAno.toLocaleString(
                                'pt-BR',
                              )}{' '}
                              kWh/ano)
                            </>
                          )}{' '}
                          na orientação{' '}
                          <strong className="capitalize">
                            {dimensionamentoSugerido.orientacao}
                          </strong>{' '}
                          ({dimensionamentoSugerido.potenciaKwpNecessaria.toFixed(2)} kWp)
                        </span>
                        <button
                          type="button"
                          onClick={handleAplicarDimensionamento}
                          className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold underline inline-flex items-center gap-0.5 hover:bg-emerald-100/60 px-1.5 py-0.5 rounded transition-colors"
                          title="Aplicar potência e placas sugeridas"
                        >
                          Aplicar sugerido (
                          {dimensionamentoSugerido.potenciaKwpNecessaria.toFixed(2)} kWp)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </SecaoAcordeao>

              {/* 3. ORÇAMENTOS DE FORNECEDORES & EQUIPAMENTOS (fechado por padrão) */}
              <SecaoAcordeao
                titulo="3. Orçamentos de Fornecedores & Equipamentos"
                subtitulo="Cotações, fornecedor ativo, equipamentos vinculados, fixação, orientação e área"
                icone={<Receipt className="w-4 h-4" />}
                aberta={secaoFornecedoresEquipamentosAberta}
                onToggle={() => setSecaoFornecedoresEquipamentosAberta((prev) => !prev)}
                badge={
                  fornecedorSelecionadoObj ? (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Ativo: {fornecedorSelecionadoObj.nome_fornecedor} • {numeroPlacas} placas
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {numeroPlacas} placas • {tipoEstrutura}
                    </span>
                  )
                }
              >
                <div className="space-y-5">
                  {/* (a) e (b): Botões e lista de cotações de fornecedores */}
                  <SecaoOrcamentosFornecedores
                    clienteId={selectedClienteId}
                    orcamentoSolarId={initialOrcamento?.id}
                    fornecedorSelecionadoId={fornecedorSelecionadoId}
                    equipamentos={[...equipamentosModulos, ...equipamentosInversores]}
                    onEquipamentoCadastrado={(novo) => {
                      if (novo.tipo === 'modulo_fv') {
                        setEquipamentosModulos((prev) => [
                          novo,
                          ...prev.filter((e) => e.id !== novo.id),
                        ])
                      } else {
                        setEquipamentosInversores((prev) => [
                          novo,
                          ...prev.filter((e) => e.id !== novo.id),
                        ])
                      }
                    }}
                    onUsarEquipamentos={(equip) => {
                      if (equip.marcaPainel) setMarcaPainel(equip.marcaPainel)
                      if (equip.potenciaPlacaWp && equip.potenciaPlacaWp > 0) {
                        handlePotenciaPlacaChange(equip.potenciaPlacaWp)
                      }
                      if (equip.numeroPlacas && equip.numeroPlacas > 0) {
                        handleNumeroPlacasChange(equip.numeroPlacas)
                      }
                      if (equip.marcaInversor) setMarcaInversor(equip.marcaInversor)
                      if (equip.quantidadeInversores && equip.quantidadeInversores > 0) {
                        setQuantidadeInversores(equip.quantidadeInversores)
                      }
                      if (equip.garantiaModulosFabricacaoAnos) {
                        setGarantiaModulosFabricacaoAnos(equip.garantiaModulosFabricacaoAnos)
                      }
                      if (equip.garantiaInversorAnos) {
                        setGarantiaInversorAnos(equip.garantiaInversorAnos)
                      }
                    }}
                    onAplicarAoProjeto={async (fornOrc) => {
                      const valorTotalForn = Number(fornOrc.valor_total) || 0

                      // 1. Atualização otimista e imediata do estado local (seleção exclusiva)
                      setFornecedorSelecionadoId(fornOrc.id)
                      fornecedorAplicadoRef.current = { id: fornOrc.id, valor: valorTotalForn }
                      updateCustoField('materiaisEquipamentos', valorTotalForn)

                      // Se houver valor manual fixo travando o total, libera para o cálculo em cadeia da planilha de custos fluir
                      setValorInvestimentoManual(0)
                      setInvestimentoEditadoManualmente(false)

                      // Atualiza também dados dos equipamentos se cadastrados no fornecedor
                      if (fornOrc.modulos && fornOrc.modulos[0]?.descricao) {
                        setMarcaPainel(fornOrc.modulos[0].descricao)
                      }
                      if (
                        fornOrc.modulos &&
                        fornOrc.modulos[0]?.quantidade &&
                        fornOrc.modulos[0].quantidade > 0
                      ) {
                        handleNumeroPlacasChange(fornOrc.modulos[0].quantidade)
                      }
                      if (fornOrc.inversores && fornOrc.inversores[0]?.descricao) {
                        setMarcaInversor(fornOrc.inversores[0].descricao)
                      }
                      if (
                        fornOrc.inversores &&
                        fornOrc.inversores[0]?.quantidade &&
                        fornOrc.inversores[0].quantidade > 0
                      ) {
                        setQuantidadeInversores(fornOrc.inversores[0].quantidade)
                      }

                      // 2. Feedback visual claro com ação para navegar imediatamente para a Aba de Custos
                      const nomeForn = fornOrc.nome_fornecedor || 'Fornecedor'
                      const valorFormatado = formatCurrency(valorTotalForn)

                      toast.success(
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="font-bold text-emerald-950 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                            <span>{nomeForn} aplicado ao projeto!</span>
                          </div>
                          <div className="text-gray-600">
                            Materiais atualizado para <strong>{valorFormatado}</strong>. Custos
                            recalculados em cadeia.
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('custos')}
                            className="mt-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-[11px] self-start inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Ver Aba de Custos Atualizada</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>,
                        { duration: 5000 },
                      )

                      // 3. Persistência assíncrona em segundo plano sem bloquear o recálculo
                      try {
                        await selecionarFornecedorOrcamento(fornOrc.id, {
                          orcamentoSolarId: initialOrcamento?.id,
                          clienteId: selectedClienteId,
                        })
                      } catch (errSync) {
                        console.warn('Persistência em background do fornecedor ativo:', errSync)
                      }
                    }}
                  />

                  {/* (d): Campos preservados: tipo de estrutura, orientação, área, FINAME e investimento manual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-3 border-t border-gray-100">
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
                    <div className="sm:col-span-2 lg:col-span-4">
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Valor de Investimento (R$)
                      </label>
                      <input
                        type="number"
                        value={
                          investimentoEditadoManualmente && valorInvestimentoManual > 0
                            ? valorInvestimentoManual
                            : ''
                        }
                        min={0}
                        step={100}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0
                          setValorInvestimentoManual(val)
                          setInvestimentoEditadoManualmente(true)
                        }}
                        className="w-full text-xs font-bold text-gray-900 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder={
                          totalCustosComDesconto > 0
                            ? `Calculado da aba custos (${formatCurrency(totalCustosComDesconto)})`
                            : 'Ou preencha na aba de custos'
                        }
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        {investimentoEditadoManualmente && valorInvestimentoManual > 0
                          ? 'Valor fixado manualmente'
                          : totalCustosComDesconto > 0
                            ? 'Calculado da soma da Aba de Custos'
                            : 'Estimado por kWp'}
                      </span>
                    </div>
                  </div>
                </div>
              </SecaoAcordeao>

              {/* 4. GERAÇÃO ESTIMADA (fechado por padrão, compacta) */}
              <SecaoAcordeao
                titulo="4. Geração Estimada"
                subtitulo="Geração mensal e anual do kit, geração simulada personalizada/Solergo e safra detalhada mês a mês"
                icone={<Sun className="w-4 h-4" />}
                aberta={secaoGeracaoEstimadaAberta}
                onToggle={() => setSecaoGeracaoEstimadaAberta((prev) => !prev)}
                badge={
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {calculos.geracaoAnualEstimadaKwh.toLocaleString('pt-BR')} kWh/ano
                  </span>
                }
              >
                <div className="space-y-3.5">
                  {/* Linha superior de cards densos/compactos */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* 1. Geração Mensal (kit) */}
                    <div className="p-2.5 rounded-lg border border-emerald-150 bg-emerald-50/50 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Geração Mensal (kit)
                      </span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-base font-black text-emerald-950">
                          {calculos.geracaoMediaMensalKwh.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700">kWh/mês</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5">
                        Potência {potenciaKwp.toFixed(2)} kWp
                      </span>
                    </div>

                    {/* 2. Geração Anual (kit) */}
                    <div className="p-2.5 rounded-lg border border-emerald-150 bg-emerald-50/50 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Geração Anual (kit)
                      </span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-base font-black text-emerald-950">
                          {calculos.geracaoAnualEstimadaKwh.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700">kWh/ano</span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5">
                        Estimativa Erechim/RS
                      </span>
                    </div>

                    {/* 3. Campo editável Geração Simulada + Importar do Solergo */}
                    <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/80 flex flex-col justify-between focus-within:border-emerald-500 focus-within:bg-white transition-colors">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <label
                          htmlFor="input-geracao-simulada"
                          className="text-[10px] font-bold uppercase tracking-wider text-gray-700"
                        >
                          Geração Simulada
                        </label>
                        <button
                          type="button"
                          onClick={() => setModalSolergoOpen(true)}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 underline font-semibold"
                        >
                          <Upload className="w-3 h-3" /> Importar do Solergo
                        </button>
                      </div>
                      <div className="mt-1 relative flex items-center">
                        <input
                          id="input-geracao-simulada"
                          type="number"
                          min={0}
                          step={10}
                          value={geracaoSimuladaKwhAno}
                          onChange={(e) => {
                            const val = e.target.value
                            setGeracaoSimuladaKwhAno(val === '' ? '' : Math.max(0, Number(val)))
                          }}
                          placeholder="Ex: 8400"
                          className="w-full text-xs font-bold text-gray-900 bg-white px-2 py-1 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-[10px] font-semibold text-gray-400 ml-1.5 whitespace-nowrap">
                          kWh/ano
                        </span>
                      </div>
                      {ajusteSolergoAtivo ? (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            Ajustado via Solergo
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAjusteSolergoAtivo(false)
                              setGeracaoFonte('automatico')
                              setGeracaoMensalSolergo(null)
                              setGeracaoSimuladaKwhAno('')
                              setImagemSolergoFile(null)
                            }}
                            className="text-[9px] text-amber-900 hover:underline font-medium"
                          >
                            Voltar ao automático
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] text-gray-400 mt-0.5">
                          Opcional (salva no orçamento)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Safra mês a mês JAN–DEZ compacta (kWh + HSP) */}
                  <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                    <div className="flex items-center justify-between text-[11px] pb-1 border-b border-gray-200/60">
                      <span className="text-gray-600 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        Geração Mensal Detalhada (Jan a Dez) — Irradiância Erechim/RS
                      </span>
                      <span className="font-extrabold text-emerald-700">
                        Total:{' '}
                        {(
                          calculos.geracaoMensalDetalhada.reduce(
                            (acc, i) => acc + (i.geracaoKwh || 0),
                            0,
                          ) || calculos.geracaoAnualEstimadaKwh
                        ).toLocaleString('pt-BR')}{' '}
                        kWh/ano
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                      {calculos.geracaoMensalDetalhada.map((item) => (
                        <div
                          key={item.mesIndex}
                          className="px-1.5 py-1.5 rounded-md border border-gray-200/80 bg-white text-center hover:border-emerald-300 transition-colors shadow-2xs"
                        >
                          <div className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">
                            {item.mesNome.slice(0, 3)}
                          </div>
                          <div className="text-[11px] font-black text-emerald-800 leading-tight mt-0.5">
                            {item.geracaoKwh.toLocaleString('pt-BR')}
                          </div>
                          <div className="text-[8.5px] text-gray-400 leading-none mt-0.5">
                            {item.irradiacaoHSP.toFixed(2)}h
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SecaoAcordeao>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: ABA DE CUSTOS                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'custos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Card Principal de Custos */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Planilha de Custos do Orçamento Solar
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Cálculos automáticos em tempo real: mão de obra vinculada às {numeroPlacas}{' '}
                      placas, impostos com 2 opções fiscais, administração, comissão e indicação.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                      Valor Total do Orçamento
                    </span>
                    <span className="text-xl font-black text-emerald-700">
                      {formatCurrency(totalCustosComDesconto)}
                    </span>
                    {resultadoCustosAba.desconto > 0 && (
                      <span className="text-[10px] text-gray-400 block line-through">
                        Bruto: {formatCurrency(totalCustosCalculado)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Grade dos Campos de Custos Conforme Requisitos do Usuário */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Requisito 1: Mão de obra de instalação & Valor por placa compactados */}
                  <div className="md:col-span-2 lg:col-span-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-gray-200/60 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                          1. Mão de Obra de Instalação ({numeroPlacas} placas)
                        </span>
                      </div>
                      {maoDeObraEditadaManualmente ? (
                        <button
                          type="button"
                          onClick={handleResetarMaoDeObraAuto}
                          className="text-[10px] text-blue-700 hover:underline font-semibold self-start sm:self-auto"
                          title="Restaurar fórmula automática: placas × valor por placa"
                        >
                          Restaurar auto ({numeroPlacas} × {formatCurrency(valorPorPlaca)})
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded self-start sm:self-auto">
                          Auto: {numeroPlacas} placas × {formatCurrency(valorPorPlaca)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Campo: Valor por placa (editável) */}
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[11px] font-medium text-gray-700">
                            Valor por placa (R$) *
                          </label>
                          <span className="text-[10px] text-gray-400">× {numeroPlacas} placas</span>
                        </div>
                        <input
                          type="number"
                          value={valorPorPlaca || ''}
                          min={0}
                          step={10}
                          onChange={(e) => handleValorPorPlacaChange(Number(e.target.value))}
                          className="w-full text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Ex: 150,00"
                          title={`Multiplicado pelas ${numeroPlacas} placas configuradas`}
                        />
                      </div>

                      {/* Campo: Mão de obra de instalação (auto preenchido, editável manualmente) */}
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[11px] font-medium text-gray-700">
                            Mão de obra total (R$) *
                          </label>
                          {maoDeObraEditadaManualmente ? (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                              Manual
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600">
                              = {formatCurrency(custos.maoDeObra)}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          value={custos.maoDeObra || ''}
                          min={0}
                          step={50}
                          onChange={(e) => handleMaoDeObraManualChange(Number(e.target.value))}
                          className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            maoDeObraEditadaManualmente
                              ? 'border-amber-300 bg-amber-50/40 text-amber-900'
                              : 'border-emerald-300 bg-white text-emerald-800'
                          }`}
                          placeholder="0,00"
                          title={
                            maoDeObraEditadaManualmente
                              ? 'Valor customizado manual. Clique em "Restaurar auto" para voltar ao automático.'
                              : `Preenchido automaticamente (${numeroPlacas} × ${formatCurrency(valorPorPlaca)} = ${formatCurrency(custos.maoDeObra)})`
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Valor de Materiais / Equipamentos (Alimentado pelo fornecedor ou digitado) */}
                  <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-gray-700">
                        Materiais / Equipamentos (R$)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {fornecedorSelecionadoObj &&
                          (() => {
                            const nomeFornecedorExibicao =
                              fornecedorSelecionadoObj.nome_fornecedor ||
                              (fornecedorSelecionadoObj as any).fornecedor_nome ||
                              'Fornecedor'
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const valorForn =
                                    Number(fornecedorSelecionadoObj.valor_total) || 0
                                  fornecedorAplicadoRef.current = {
                                    id: fornecedorSelecionadoObj.id,
                                    valor: valorForn,
                                  }
                                  updateCustoField('materiaisEquipamentos', valorForn)
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-800 font-medium hover:underline bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                                title={`Reaplicar ${formatCurrency(Number(fornecedorSelecionadoObj.valor_total) || 0)} do fornecedor ${nomeFornecedorExibicao}`}
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                Atualizar do fornecedor
                              </button>
                            )
                          })()}
                        <span
                          className="text-[10px] text-emerald-700 font-semibold cursor-help"
                          title="Alimentado automaticamente ao selecionar fornecedor na tabela abaixo, podendo ser editado manualmente a qualquer momento"
                        >
                          Auto/Fornecedor
                        </span>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={custos.materiaisEquipamentos || ''}
                      min={0}
                      step={100}
                      onChange={(e) =>
                        updateCustoField('materiaisEquipamentos', Number(e.target.value))
                      }
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="0,00"
                      title="Alimentado automaticamente ao selecionar fornecedor no comparativo abaixo, permitindo edição manual"
                    />
                  </div>

                  {/* NOVO: Materiais Extras (Campo exclusivamente manual: andaimes, cabos, estruturas adicionais etc.) */}
                  <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-gray-700">
                        Materiais Extras (R$)
                      </label>
                      <span
                        className="text-[10px] text-gray-400 cursor-help"
                        title="Valores extras manuais: andaimes, cabos, estruturas adicionais etc."
                      >
                        Manual
                      </span>
                    </div>
                    <input
                      type="number"
                      value={custos.materiaisExtras || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('materiaisExtras', Number(e.target.value))}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="0,00"
                      title="Valores extras manuais: andaimes, cabos, estruturas adicionais etc."
                    />
                  </div>

                  {/* Requisito 6: Risco de engenharia (padrão R$ 400, editável) - Compacto */}
                  <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-gray-700">
                        6. Risco de engenharia (R$) *
                      </label>
                      <span
                        className="text-[10px] text-gray-400 cursor-help"
                        title="Preenchido com valor padrão de R$ 400, podendo ser editado"
                      >
                        Padrão R$ 400
                      </span>
                    </div>
                    <input
                      type="number"
                      value={custos.riscoEngenharia !== undefined ? custos.riscoEngenharia : 400}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('riscoEngenharia', Number(e.target.value))}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="400,00"
                      title="Preenchido com valor padrão de R$ 400, podendo ser editado"
                    />
                  </div>

                  {/* Frete e guincho - Compacto */}
                  <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-gray-700">
                        Frete e guincho (R$)
                      </label>
                      <span
                        className="text-[10px] text-gray-400 cursor-help"
                        title="Logística e içamento dos módulos fotovoltaicos"
                      >
                        Içamento
                      </span>
                    </div>
                    <input
                      type="number"
                      value={custos.freteGuincho || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('freteGuincho', Number(e.target.value))}
                      className="w-full text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="0,00"
                      title="Logística e içamento dos módulos"
                    />
                  </div>

                  {/* Subestação de energia se necessário - Compacto */}
                  <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-gray-700">
                        Subestação (R$)
                      </label>
                      <span
                        className="text-[10px] text-gray-400 cursor-help"
                        title="Transformador / subestação rural ou industrial se aplicável"
                      >
                        Se aplicável
                      </span>
                    </div>
                    <input
                      type="number"
                      value={custos.subestacao || ''}
                      min={0}
                      step={100}
                      onChange={(e) => updateCustoField('subestacao', Number(e.target.value))}
                      className="w-full text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="0,00"
                      title="Transformador / subestação rural ou industrial"
                    />
                  </div>

                  {/* Terceirização de serviços - Compacto */}
                  <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-gray-700">
                        Terceirização (R$)
                      </label>
                      <span
                        className="text-[10px] text-gray-400 cursor-help"
                        title="Projetistas, ARTs ou consultores externos"
                      >
                        ART/Externos
                      </span>
                    </div>
                    <input
                      type="number"
                      value={custos.terceirizacao || ''}
                      min={0}
                      step={50}
                      onChange={(e) => updateCustoField('terceirizacao', Number(e.target.value))}
                      className="w-full text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="0,00"
                      title="Projetistas, ARTs ou consultores externos"
                    />
                  </div>

                  {/* Marketing e combustível - Compacto */}
                  <div className="p-2.5 rounded-lg bg-gray-50/70 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-gray-700">
                        Marketing/Combustível (R$)
                      </label>
                      <span
                        className="text-[10px] text-gray-400 cursor-help"
                        title="Deslocamento e suporte comercial"
                      >
                        Deslocamento
                      </span>
                    </div>
                    <input
                      type="number"
                      value={custos.marketingCombustivel || ''}
                      min={0}
                      step={50}
                      onChange={(e) =>
                        updateCustoField('marketingCombustivel', Number(e.target.value))
                      }
                      className="w-full text-xs font-medium px-2.5 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="0,00"
                      title="Deslocamento e suporte comercial"
                    />
                  </div>
                </div>

                {/* Seção de Desconto sobre o total do projeto (em percentual %, refletindo proporcionalmente em Administração, Comissão e Indicação) */}
                <div className="px-3 py-2.5 rounded-lg bg-amber-50/70 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                      Desconto
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-amber-950">
                          Desconto sobre o Total do Projeto (%)
                        </span>
                        {resultadoCustosAba.desconto > 0 && resultadoCustosAba.valorTotal > 0 && (
                          <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300">
                            {resultadoCustosAba.percentualDescontoProjeto
                              .toFixed(2)
                              .replace('.', ',')}
                            % do projeto = {formatCurrency(resultadoCustosAba.desconto)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-amber-800">
                        Reflete <strong>proporcionalmente</strong> em Administração (15%), Comissão
                        comercial (3% — mantendo piso R$ 600) e Indicação (1%). Não altera
                        materiais, mão de obra, impostos nem o valor total.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {resultadoCustosAba.desconto > 0 && (
                      <span className="text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                        Base líq.:{' '}
                        {formatCurrency(
                          resultadoCustosAba.baseComDesconto ??
                            Math.max(
                              0,
                              resultadoCustosAba.somaComImpostos - resultadoCustosAba.desconto,
                            ),
                        )}
                      </span>
                    )}
                    <div className="relative w-28 sm:w-32">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={descontoPercentual || ''}
                        onChange={(e) =>
                          setDescontoPercentual(
                            Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                          )
                        }
                        className="w-full text-xs font-bold pl-2.5 pr-7 py-1 rounded-md border border-amber-300 bg-white text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500 text-right"
                        placeholder="0,00%"
                        title="Digite o percentual de desconto sobre o total do projeto"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Requisito 5: Seletor de Impostos com Opção 1 e Opção 2 - Compactado */}
                <div className="px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-blue-200/60">
                    <div className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wide">
                        5. Seletor de Impostos
                      </span>
                      <span
                        className="text-[10px] text-blue-700 hidden sm:inline cursor-help"
                        title="Escolha o regime fiscal aplicável ao orçamento"
                      >
                        (Opção 1 ou Opção 2)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-blue-700 font-semibold">Imposto:</span>
                      <span className="text-xs font-black text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {formatCurrency(resultadoCustosAba.impostos)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Opção 1 (16% s/ valores exceto materiais) - regime opcaoImposto === 2 */}
                    <label
                      className={`w-full px-2.5 py-1.5 rounded-md border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        opcaoImposto === 2
                          ? 'border-blue-600 bg-white shadow-2xs ring-1 ring-blue-500/20'
                          : 'border-blue-200 bg-white/70 hover:bg-white text-gray-700'
                      }`}
                      title={`Opção 1: 16% sobre todos os valores exceto materiais / equipamentos (Imposto: ${formatCurrency(comparativoImpostos.impostoOpcao2)})${comparativoImpostos.melhorOpcao === 2 ? ' — Menor imposto calculado' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="opcao_imposto_radio"
                          checked={opcaoImposto === 2}
                          onChange={() => handleSelecionarOpcaoImpostoManual(2)}
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[11px] text-gray-900">
                            Opção 1 (16% s/ valores exceto materiais)
                          </span>
                          {comparativoImpostos.melhorOpcao === 2 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Mais econômica
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {formatCurrency(comparativoImpostos.impostoOpcao2)}
                      </span>
                    </label>

                    {/* Opção 2 (9,23% s/ total do projeto) - regime opcaoImposto === 1 */}
                    <label
                      className={`w-full px-2.5 py-1.5 rounded-md border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        opcaoImposto === 1
                          ? 'border-blue-600 bg-white shadow-2xs ring-1 ring-blue-500/20'
                          : 'border-blue-200 bg-white/70 hover:bg-white text-gray-700'
                      }`}
                      title={`Opção 2: 9,23% sobre o total do projeto (Imposto: ${formatCurrency(comparativoImpostos.impostoOpcao1)})${comparativoImpostos.melhorOpcao === 1 ? ' — Menor imposto calculado' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="opcao_imposto_radio"
                          checked={opcaoImposto === 1}
                          onChange={() => handleSelecionarOpcaoImpostoManual(1)}
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[11px] text-gray-900">
                            Opção 2 (9,23% s/ total do projeto)
                          </span>
                          {comparativoImpostos.melhorOpcao === 1 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Mais econômica
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {formatCurrency(comparativoImpostos.impostoOpcao1)}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Requisitos 2, 3, 4: Campos Calculados Automaticamente - Compactado */}
                <div className="px-3 py-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-emerald-200/60">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                        Campos Calculados Automaticamente
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-800">
                      <span>Base c/ impostos:</span>
                      <strong className="bg-emerald-100/80 px-1.5 py-0.2 rounded font-bold text-emerald-900">
                        {formatCurrency(resultadoCustosAba.somaComImpostos)}
                      </strong>
                      {resultadoCustosAba.desconto > 0 && (
                        <span className="text-amber-700">
                          (com desconto: {formatCurrency(resultadoCustosAba.baseComDesconto)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Requisito 2: Administração */}
                    <div
                      className={`bg-white px-2.5 py-2 rounded-md border shadow-2xs space-y-1.5 transition-colors ${
                        manualAdministracao
                          ? 'border-amber-300 ring-1 ring-amber-400/20'
                          : 'border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-gray-800">
                          2. Administração
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!manualAdministracao) {
                                setValorManualAdministracao(resultadoCustosAba.administracao)
                                setManualAdministracao(true)
                              } else {
                                setManualAdministracao(false)
                              }
                            }}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                              manualAdministracao
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                            title={
                              manualAdministracao
                                ? 'Clique para voltar ao cálculo automático de 15%'
                                : 'Clique para editar o valor manualmente em R$'
                            }
                          >
                            {manualAdministracao ? 'Manual' : 'Auto (15%)'}
                          </button>
                        </div>
                      </div>

                      {manualAdministracao ? (
                        <div className="space-y-1">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                              R$
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={50}
                              value={valorManualAdministracao || ''}
                              onChange={(e) =>
                                setValorManualAdministracao(
                                  Math.max(0, Number(e.target.value) || 0),
                                )
                              }
                              className="w-full text-xs font-bold pl-7 pr-2 py-1 rounded border border-amber-300 bg-amber-50/30 text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="0,00"
                              title="Digite o valor de administração em R$"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-gray-500">
                            <span>Valor manual em R$</span>
                            <button
                              type="button"
                              onClick={() => setManualAdministracao(false)}
                              className="text-blue-700 hover:underline font-semibold"
                            >
                              Restaurar 15%
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-emerald-800">
                              {formatCurrency(resultadoCustosAba.administracao)}
                            </span>
                            {resultadoCustosAba.administracaoDescontada > 0 && (
                              <span
                                className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200"
                                title={`Original sem desconto: ${formatCurrency(resultadoCustosAba.administracaoSemDesconto)} | Descontado: − ${formatCurrency(resultadoCustosAba.administracaoDescontada)}`}
                              >
                                − {formatCurrency(resultadoCustosAba.administracaoDescontada)} pelo
                                desconto
                              </span>
                            )}
                          </div>
                          <p
                            className="text-[9px] text-gray-400 truncate"
                            title={
                              resultadoCustosAba.desconto > 0
                                ? `Original: ${formatCurrency(resultadoCustosAba.administracaoSemDesconto)} | (Base c/ desc. ${formatCurrency(resultadoCustosAba.baseComDesconto)}) × 15% = ${formatCurrency(resultadoCustosAba.administracao)} (redução de ${formatCurrency(resultadoCustosAba.administracaoDescontada)})`
                                : '(Soma com materiais e impostos) × 0,15'
                            }
                          >
                            {resultadoCustosAba.administracaoDescontada > 0
                              ? `Original: ${formatCurrency(resultadoCustosAba.administracaoSemDesconto)} (Base c/ desc. × 15%)`
                              : resultadoCustosAba.desconto > 0
                                ? `Base c/ desc. × 15%`
                                : `(Soma c/ imposto) × 15%`}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Requisito 3: Comissão comercial com piso de R$ 600 */}
                    <div
                      className={`bg-white px-2.5 py-2 rounded-md border shadow-2xs space-y-1.5 transition-colors ${
                        manualComissao
                          ? 'border-amber-300 ring-1 ring-amber-400/20'
                          : 'border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-gray-800">3. Comissão</span>
                        <div className="flex items-center gap-1">
                          {!manualComissao && resultadoCustosAba.comissaoUsouPisoMinimo && (
                            <span
                              className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200"
                              title="Piso mínimo de comissão comercial aplicado"
                            >
                              Piso R$ 600
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (!manualComissao) {
                                setValorManualComissao(resultadoCustosAba.comissaoComercial)
                                setManualComissao(true)
                              } else {
                                setManualComissao(false)
                              }
                            }}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                              manualComissao
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                            title={
                              manualComissao
                                ? 'Clique para voltar ao cálculo automático de 3% (piso R$ 600)'
                                : 'Clique para editar o valor manualmente em R$'
                            }
                          >
                            {manualComissao ? 'Manual' : 'Auto (3%)'}
                          </button>
                        </div>
                      </div>

                      {manualComissao ? (
                        <div className="space-y-1">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                              R$
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={50}
                              value={valorManualComissao || ''}
                              onChange={(e) =>
                                setValorManualComissao(Math.max(0, Number(e.target.value) || 0))
                              }
                              className="w-full text-xs font-bold pl-7 pr-2 py-1 rounded border border-amber-300 bg-amber-50/30 text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="0,00"
                              title="Digite o valor de comissão comercial em R$"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-gray-500">
                            <span>Valor manual em R$</span>
                            <button
                              type="button"
                              onClick={() => setManualComissao(false)}
                              className="text-blue-700 hover:underline font-semibold"
                            >
                              Restaurar 3%
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-emerald-800">
                              {formatCurrency(resultadoCustosAba.comissaoComercial)}
                            </span>
                            {resultadoCustosAba.comissaoUsouPisoMinimo && (
                              <span
                                className="text-[10px] font-semibold text-gray-500 cursor-help"
                                title="Valor que resultaria da aplicação pura de 3% sobre a base líquida"
                              >
                                (3% = {formatCurrency(resultadoCustosAba.comissaoPura3Pct)})
                              </span>
                            )}
                            {resultadoCustosAba.comissaoDescontada > 0 && (
                              <span
                                className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200"
                                title={`Original sem desconto: ${formatCurrency(resultadoCustosAba.comissaoSemDesconto)} | Descontado: − ${formatCurrency(resultadoCustosAba.comissaoDescontada)}`}
                              >
                                − {formatCurrency(resultadoCustosAba.comissaoDescontada)} pelo
                                desconto
                              </span>
                            )}
                          </div>
                          <p
                            className="text-[9px] text-gray-400 truncate"
                            title={
                              resultadoCustosAba.comissaoUsouPisoMinimo
                                ? `Piso de R$ 600 aplicado (3% puro daria ${formatCurrency(resultadoCustosAba.comissaoPura3Pct)})${resultadoCustosAba.comissaoDescontada > 0 ? ` | Original: ${formatCurrency(resultadoCustosAba.comissaoSemDesconto)}` : ''}`
                                : resultadoCustosAba.comissaoDescontada > 0
                                  ? `Original: ${formatCurrency(resultadoCustosAba.comissaoSemDesconto)} | Base c/ desc. × 3% = ${formatCurrency(resultadoCustosAba.comissaoComercial)} (redução de ${formatCurrency(resultadoCustosAba.comissaoDescontada)})`
                                  : '(Soma com materiais e impostos) × 0,03'
                            }
                          >
                            {resultadoCustosAba.comissaoUsouPisoMinimo
                              ? `Piso R$ 600 (3% = ${formatCurrency(resultadoCustosAba.comissaoPura3Pct)})`
                              : resultadoCustosAba.comissaoDescontada > 0
                                ? `Original: ${formatCurrency(resultadoCustosAba.comissaoSemDesconto)} (Base c/ desc. × 3%)`
                                : resultadoCustosAba.desconto > 0
                                  ? `Base c/ desc. × 3%`
                                  : `(Soma c/ imposto) × 3%`}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Requisito 4: Indicação */}
                    <div
                      className={`bg-white px-2.5 py-2 rounded-md border shadow-2xs space-y-1.5 transition-colors ${
                        manualIndicacao
                          ? 'border-amber-300 ring-1 ring-amber-400/20'
                          : 'border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-gray-800">4. Indicação</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!manualIndicacao) {
                                setValorManualIndicacao(resultadoCustosAba.indicacao)
                                setManualIndicacao(true)
                              } else {
                                setManualIndicacao(false)
                              }
                            }}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                              manualIndicacao
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                            title={
                              manualIndicacao
                                ? 'Clique para voltar ao cálculo automático com percentual configurável'
                                : 'Clique para editar o valor manualmente em R$'
                            }
                          >
                            {manualIndicacao ? 'Manual' : `Auto (${percentualIndicacaoAuto}%)`}
                          </button>
                        </div>
                      </div>

                      {manualIndicacao ? (
                        <div className="space-y-1">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                              R$
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={50}
                              value={valorManualIndicacao || ''}
                              onChange={(e) =>
                                setValorManualIndicacao(Math.max(0, Number(e.target.value) || 0))
                              }
                              className="w-full text-xs font-bold pl-7 pr-2 py-1 rounded border border-amber-300 bg-amber-50/30 text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="0,00"
                              title="Digite o valor de indicação em R$"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-gray-500">
                            <span>Valor manual em R$</span>
                            <button
                              type="button"
                              onClick={() => setManualIndicacao(false)}
                              className="text-blue-700 hover:underline font-semibold"
                            >
                              Restaurar Auto ({percentualIndicacaoAuto}%)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {/* Campo numérico editável em % do percentual automático */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-gray-500 font-medium">
                              Taxa auto:
                            </span>
                            <div className="relative w-20">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={
                                  percentualIndicacaoAuto === 0
                                    ? '0'
                                    : percentualIndicacaoAuto || ''
                                }
                                onChange={(e) =>
                                  setPercentualIndicacaoAuto(
                                    Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                                  )
                                }
                                className="w-full text-xs font-bold pl-1.5 pr-5 py-0.5 rounded border border-emerald-300 bg-emerald-50/30 text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                                placeholder="0"
                                title="Percentual de indicação automática (% sobre o total)"
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 pointer-events-none">
                                %
                              </span>
                            </div>
                          </div>

                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-emerald-800">
                              {formatCurrency(resultadoCustosAba.indicacao)}
                            </span>
                            {resultadoCustosAba.indicacaoDescontada > 0 && (
                              <span
                                className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200"
                                title={`Original sem desconto: ${formatCurrency(resultadoCustosAba.indicacaoSemDesconto)} | Descontado: − ${formatCurrency(resultadoCustosAba.indicacaoDescontada)}`}
                              >
                                − {formatCurrency(resultadoCustosAba.indicacaoDescontada)} pelo
                                desconto
                              </span>
                            )}
                          </div>
                          <p
                            className="text-[9px] text-gray-400 truncate"
                            title={
                              resultadoCustosAba.indicacaoDescontada > 0
                                ? `Original: ${formatCurrency(resultadoCustosAba.indicacaoSemDesconto)} | Base c/ desc. × ${percentualIndicacaoAuto}% = ${formatCurrency(resultadoCustosAba.indicacao)} (redução de ${formatCurrency(resultadoCustosAba.indicacaoDescontada)})`
                                : `(Soma com materiais e impostos) × ${((Number(percentualIndicacaoAuto) || 0) / 100).toLocaleString('pt-BR')}`
                            }
                          >
                            {resultadoCustosAba.indicacaoDescontada > 0
                              ? `Original: ${formatCurrency(resultadoCustosAba.indicacaoSemDesconto)} (Base c/ desc. × ${percentualIndicacaoAuto}%)`
                              : resultadoCustosAba.desconto > 0
                                ? `Base c/ desc. × ${percentualIndicacaoAuto}%`
                                : `(Soma c/ imposto) × ${percentualIndicacaoAuto}%`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumo e Ação da Aba de Custos - Compacto */}
                <div className="px-3.5 py-2.5 bg-emerald-50/70 rounded-lg border border-emerald-300 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                        Total Geral de Custos{' '}
                        {resultadoCustosAba.desconto > 0 ? '(Líquido c/ Desconto)' : ''}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-emerald-950">
                          {formatCurrency(totalCustosComDesconto)}
                        </span>
                        {resultadoCustosAba.desconto > 0 && (
                          <span className="text-[11px] text-gray-500 line-through">
                            {formatCurrency(totalCustosCalculado)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-6 w-px bg-emerald-200 hidden sm:block" />
                    <div className="text-[11px] text-emerald-800">
                      Custo por kWp:{' '}
                      <strong>{formatCurrency(calculos.custoPorKwpInstalado)}</strong> / kWp (
                      {potenciaKwp.toFixed(2)} kWp)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setValorInvestimentoManual(totalCustosComDesconto)
                      setInvestimentoEditadoManualmente(false)
                      setActiveTab('parcelamentos')
                    }}
                    className="px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-all"
                  >
                    <span>Usar no Investimento</span>
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

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-bold text-emerald-900 whitespace-nowrap">
                        Investimento Total (R$):
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={valorInvestimentoFinal || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0
                          setValorInvestimentoManual(val)
                          setInvestimentoEditadoManualmente(true)
                        }}
                        className={`w-32 text-xs font-black px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right ${
                          investimentoEditadoManualmente
                            ? 'border-amber-400 bg-amber-50 text-amber-950'
                            : 'border-emerald-300 bg-white text-emerald-950'
                        }`}
                        placeholder="0,00"
                        title={
                          investimentoEditadoManualmente
                            ? 'Valor editado manualmente'
                            : 'Valor calculado automaticamente da aba de custos'
                        }
                      />
                      {investimentoEditadoManualmente && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                          Manual
                        </span>
                      )}
                    </div>

                    {(investimentoEditadoManualmente ||
                      (valorInvestimentoManual > 0 &&
                        valorInvestimentoManual !==
                          (totalCustosComDesconto > 0
                            ? totalCustosComDesconto
                            : potenciaKwp > 0
                              ? Math.round(potenciaKwp * 3800)
                              : 0))) && (
                      <button
                        type="button"
                        onClick={() => {
                          setValorInvestimentoManual(0)
                          setInvestimentoEditadoManualmente(false)
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                        title="Voltar ao valor calculado automaticamente da aba de custos"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Voltar ao automático</span>
                      </button>
                    )}
                  </div>
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
                        <span className="text-gray-500">Conta hoje:</span>
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

                  {/* 2. Cartão de Crédito */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs uppercase text-gray-900 truncate">
                          Cartão de Crédito
                        </span>
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full shrink-0">
                          {parcelasCartao}x (
                          {jurosCartao.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          % a.m.)
                        </span>
                      </div>

                      {/* Inputs de customização: parcelas, juros e entrada */}
                      <div className="mt-2.5 p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                              Parcelas
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={parcelasCartao}
                              onChange={(e) =>
                                setParcelasCartao(Math.max(1, parseInt(e.target.value, 10) || 1))
                              }
                              className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                              Juros (% a.m.)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={jurosCartao}
                              onChange={(e) =>
                                setJurosCartao(Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                            Entrada (R$)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={valorInvestimentoFinal}
                            step={100}
                            value={entradaCartao || ''}
                            placeholder="0,00"
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0)
                              setEntradaCartao(Math.min(val, valorInvestimentoFinal))
                            }}
                            className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="text-xl font-black text-gray-900 mt-2">
                        {formatCurrency(calculos.parcelamentos.cartao18x.valorParcela)}
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {entradaCartao > 0 && (
                          <span className="block text-emerald-700 font-semibold">
                            Entrada: {formatCurrency(entradaCartao)}
                          </span>
                        )}
                        Total: {formatCurrency(calculos.parcelamentos.cartao18x.valorTotal)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta hoje:</span>
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

                  {/* 3. Financiamento Banco 1 */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs uppercase text-gray-900 truncate">
                          Financiamento Banco 1
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                          {parcelasBanco1}x (
                          {jurosBanco1.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          % a.m.)
                        </span>
                      </div>

                      {/* Inputs de customização: parcelas, juros e entrada */}
                      <div className="mt-2.5 p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                              Parcelas
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={180}
                              value={parcelasBanco1}
                              onChange={(e) =>
                                setParcelasBanco1(Math.max(1, parseInt(e.target.value, 10) || 1))
                              }
                              className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                              Juros (% a.m.)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={jurosBanco1}
                              onChange={(e) =>
                                setJurosBanco1(Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                            Entrada (R$)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={valorInvestimentoFinal}
                            step={100}
                            value={entradaBanco1 || ''}
                            placeholder="0,00"
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0)
                              setEntradaBanco1(Math.min(val, valorInvestimentoFinal))
                            }}
                            className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="text-xl font-black text-gray-900 mt-2">
                        {formatCurrency(calculos.parcelamentos.financiamentoBanco1.valorParcela)}
                      </div>
                      {calculos.parcelamentos.financiamentoBanco1.valorIof !== undefined &&
                        calculos.parcelamentos.financiamentoBanco1.valorIof > 0 && (
                          <span className="block text-[10px] font-semibold text-emerald-700 mt-0.5">
                            Inclui IOF de{' '}
                            {formatCurrency(calculos.parcelamentos.financiamentoBanco1.valorIof)}
                          </span>
                        )}
                      <p className="text-[10px] text-gray-500">
                        {entradaBanco1 > 0 && (
                          <span className="block text-amber-800 font-semibold">
                            Entrada: {formatCurrency(entradaBanco1)}
                          </span>
                        )}
                        Total:{' '}
                        {formatCurrency(calculos.parcelamentos.financiamentoBanco1.valorTotal)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta hoje:</span>
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

                  {/* 4. Financiamento Banco 2 */}
                  <div className="p-4 rounded-xl border-2 border-blue-400 bg-blue-50/40 flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs uppercase text-blue-950 truncate">
                          Financiamento Banco 2
                        </span>
                        <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full shrink-0">
                          {parcelasBanco2}x (
                          {jurosBanco2.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          % a.m.)
                        </span>
                      </div>

                      {/* Inputs de customização: parcelas, juros e entrada */}
                      <div className="mt-2.5 p-2 bg-blue-100/50 rounded-lg border border-blue-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-blue-900 block mb-0.5">
                              Parcelas
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={180}
                              value={parcelasBanco2}
                              onChange={(e) =>
                                setParcelasBanco2(Math.max(1, parseInt(e.target.value, 10) || 1))
                              }
                              className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-blue-900 block mb-0.5">
                              Juros (% a.m.)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={jurosBanco2}
                              onChange={(e) =>
                                setJurosBanco2(Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-blue-900 block mb-0.5">
                            Entrada (R$)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={valorInvestimentoFinal}
                            step={100}
                            value={entradaBanco2 || ''}
                            placeholder="0,00"
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0)
                              setEntradaBanco2(Math.min(val, valorInvestimentoFinal))
                            }}
                            className="w-full text-xs font-bold px-2 py-1 bg-white rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="text-xl font-black text-blue-800 mt-2">
                        {formatCurrency(calculos.parcelamentos.financiamentoBanco2.valorParcela)}
                      </div>
                      {calculos.parcelamentos.financiamentoBanco2.valorIof !== undefined &&
                        calculos.parcelamentos.financiamentoBanco2.valorIof > 0 && (
                          <span className="block text-[10px] font-semibold text-blue-800 mt-0.5">
                            Inclui IOF de{' '}
                            {formatCurrency(calculos.parcelamentos.financiamentoBanco2.valorIof)}
                          </span>
                        )}
                      <p className="text-[10px] text-gray-500">
                        {entradaBanco2 > 0 && (
                          <span className="block text-blue-900 font-semibold">
                            Entrada: {formatCurrency(entradaBanco2)}
                          </span>
                        )}
                        Total:{' '}
                        {formatCurrency(calculos.parcelamentos.financiamentoBanco2.valorTotal)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-blue-200 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conta hoje:</span>
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGerarPDF}
                      disabled={!clienteAtual || !propostaPDFData}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="Imprimir ou salvar PDF da proposta oficial"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Gerar PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGerarPropostaWord}
                      disabled={isGeneratingWord || !clienteAtual || !propostaPDFData}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 border border-blue-700 flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                      title="Gerar e baixar proposta oficial em Word (.docx)"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>{isGeneratingWord ? 'Gerando Word...' : 'Gerar Word'}</span>
                    </button>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Validade: 5 dias
                    </span>
                  </div>
                </div>

                {/* Card de Controle: Seções da Proposta (Toggles Liga/Desliga) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                        ⚙️
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-gray-900">
                          Seções da Proposta
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Ligue ou desligue as seções opcionais para personalizar o resumo e a
                          proposta final em PDF.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                      Atualização em tempo real
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Toggle: Layout do Telhado */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">
                          Layout do Telhado
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          Solergo / vista técnica
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={layoutTelhadoHabilitado}
                          onChange={(e) => {
                            const val = e.target.checked
                            setLayoutTelhadoHabilitado(val)
                            setSecoesHabilitadas((prev) => ({ ...prev, layoutTelhado: val }))
                          }}
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Toggle: Fotos do Projeto */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">
                          Fotos do Projeto
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          Vistoria & equipamentos
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={secoesHabilitadas.fotosProjeto !== false}
                          onChange={(e) =>
                            setSecoesHabilitadas((prev) => ({
                              ...prev,
                              fotosProjeto: e.target.checked,
                            }))
                          }
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Toggle: Sazonalidade Solar */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">
                          Sazonalidade Solar
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          Geração mês a mês (12m)
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={secoesHabilitadas.sazonalidadeSolar !== false}
                          onChange={(e) =>
                            setSecoesHabilitadas((prev) => ({
                              ...prev,
                              sazonalidadeSolar: e.target.checked,
                            }))
                          }
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Toggle: Portfólio de Usinas */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">
                          Portfólio de Usinas
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          Projetos reais homologados
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={secoesHabilitadas.portfolioUsinas !== false}
                          onChange={(e) =>
                            setSecoesHabilitadas((prev) => ({
                              ...prev,
                              portfolioUsinas: e.target.checked,
                            }))
                          }
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Painel de Edição de Conteúdo 100% Personalizável da Proposta */}
                <PainelEdicaoConteudoProposta
                  conteudo={conteudoProposta}
                  onChange={setConteudoProposta}
                />

                {/* Seletor de Instalações que Aparecerão na Apresentação da Proposta */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          ✓
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Instalações que aparecerão na apresentação da proposta
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Escolha quais usinas de referência do portfólio Delfos Solar serão exibidas
                        ao cliente nesta proposta.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const todosIds = usinasGaleria.map((u) => u.id)
                          setInstalacoesSelecionadasIds(todosIds)
                        }}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        Selecionar todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstalacoesSelecionadasIds([])}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                      >
                        Desmarcar todas
                      </button>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {instalacoesSelecionadasIds.length === 0
                          ? `Todas (${usinasGaleria.length})`
                          : `${instalacoesSelecionadasIds.length} selecionada(s)`}
                      </span>
                    </div>
                  </div>

                  {loadingGaleria ? (
                    <div className="py-6 text-center text-xs text-gray-400">
                      Carregando usinas da galeria...
                    </div>
                  ) : usinasGaleria.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-500 bg-gray-50 rounded-lg">
                      Nenhuma usina cadastrada na galeria de instalações.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {usinasGaleria.map((usina) => {
                        const isChecked =
                          instalacoesSelecionadasIds.length === 0 ||
                          instalacoesSelecionadasIds.includes(usina.id)
                        const urlFoto = getFotoUrl(usina)

                        const toggleSelect = () => {
                          if (instalacoesSelecionadasIds.length === 0) {
                            // Se estava no fallback (todas ativas), ao clicar desmarca esta usina
                            const outrosIds = usinasGaleria
                              .map((u) => u.id)
                              .filter((id) => id !== usina.id)
                            setInstalacoesSelecionadasIds(outrosIds)
                          } else if (instalacoesSelecionadasIds.includes(usina.id)) {
                            setInstalacoesSelecionadasIds((prev) =>
                              prev.filter((id) => id !== usina.id),
                            )
                          } else {
                            setInstalacoesSelecionadasIds((prev) => [...prev, usina.id])
                          }
                        }

                        return (
                          <div
                            key={usina.id}
                            onClick={toggleSelect}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                              isChecked
                                ? 'border-emerald-400 bg-emerald-50/50 shadow-2xs'
                                : 'border-gray-200 bg-white hover:border-gray-300 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                            />

                            {/* Miniatura da foto ou placeholder verde */}
                            <div className="w-12 h-10 rounded-md overflow-hidden bg-emerald-900/10 shrink-0 flex items-center justify-center border border-gray-200">
                              {urlFoto ? (
                                <img
                                  src={urlFoto}
                                  alt={usina.titulo}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback para ícone se foto quebrar
                                    ;(e.target as HTMLElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                <Sun className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div
                                className="font-bold text-gray-900 truncate"
                                title={usina.titulo}
                              >
                                {usina.titulo || 'Usina Solar Delfos'}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {usina.cidade || 'Erechim / RS'}
                              </div>
                              <div className="text-[10px] font-bold text-emerald-700">
                                {usina.potencia_kwp ? `${usina.potencia_kwp} kWp` : 'Turnkey'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {instalacoesSelecionadasIds.length === 0 && usinasGaleria.length > 0 && (
                    <div className="text-[11px] text-gray-500 italic bg-amber-50/70 text-amber-800 p-2 rounded-lg border border-amber-200/60 flex items-center gap-1.5">
                      <span>💡</span>
                      <span>
                        Nenhuma usina selecionada especificamente: a proposta exibirá{' '}
                        <strong>todas as {usinasGaleria.length} usinas</strong> do portfólio (regra
                        de segurança comercial).
                      </span>
                    </div>
                  )}
                </div>

                {/* Card: Layout do Telhado (Solergo / Imagem Técnica) */}
                <div className="bg-white border border-gray-200 shadow-xs rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shrink-0">
                        <ImageIcon className="w-4 h-4 text-blue-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            Layout do Telhado
                          </h4>
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.2 rounded-full">
                            Solergo / Vista Técnica
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Anexe a planta ou imagem de posicionamento dos módulos extraída do Solergo
                          para a proposta.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={layoutTelhadoHabilitado}
                          onChange={(e) => {
                            const val = e.target.checked
                            setLayoutTelhadoHabilitado(val)
                            setSecoesHabilitadas((prev) => ({ ...prev, layoutTelhado: val }))
                          }}
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-2 text-xs font-bold text-gray-700">
                          {layoutTelhadoHabilitado ? 'Incluir na proposta' : 'Omitido na proposta'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {layoutTelhadoHabilitado ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={layoutInputRef}
                          type="file"
                          accept="image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setLayoutTelhadoFile(file)
                              const objectUrl = URL.createObjectURL(file)
                              setLayoutTelhadoPreviewUrl(objectUrl)
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => layoutInputRef.current?.click()}
                          className="text-xs font-bold px-3.5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {layoutTelhadoPreviewUrl
                              ? 'Trocar Imagem do Solergo'
                              : 'Anexar Layout do Solergo (PNG/JPG)'}
                          </span>
                        </button>
                        {layoutTelhadoPreviewUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setLayoutTelhadoFile(null)
                              setLayoutTelhadoPreviewUrl(null)
                              if (layoutInputRef.current) layoutInputRef.current.value = ''
                            }}
                            className="text-xs font-semibold px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover Imagem</span>
                          </button>
                        )}
                        <span className="text-[11px] text-gray-500">
                          Formatos aceitos: PNG ou JPG (até 10 MB)
                        </span>
                      </div>

                      {/* Preview grande da imagem anexada ou placeholder ilustrativo Solergo */}
                      <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-900/5 p-2 flex flex-col items-center">
                        {layoutTelhadoPreviewUrl ? (
                          <div className="w-full space-y-1">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[11px] font-bold text-gray-700">
                                Pré-visualização da Imagem Anexada:
                              </span>
                              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Pronto para a proposta
                              </span>
                            </div>
                            <div className="w-full max-h-[360px] flex items-center justify-center bg-gray-950/40 rounded-lg overflow-hidden border border-gray-200">
                              <img
                                src={layoutTelhadoPreviewUrl}
                                alt="Layout do Telhado anexado"
                                className="w-full h-auto max-h-[350px] object-contain rounded-lg"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[11px] font-medium text-gray-500">
                                Exemplo Ilustrativo de Layout Técnico Solergo (Placeholder):
                              </span>
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                Nenhuma imagem anexada ainda
                              </span>
                            </div>
                            <div className="w-full max-h-[260px] flex items-center justify-center bg-slate-900 rounded-lg overflow-hidden border border-slate-700 p-1">
                              <img
                                src={solergoLayoutPlaceholderSvg}
                                alt="Exemplo Ilustrativo Solergo"
                                className="w-full h-auto max-h-[250px] object-contain rounded opacity-85"
                              />
                            </div>
                            <p className="text-[10px] text-gray-500 italic text-center">
                              * Anexe a imagem do Solergo acima para que ela apareça na proposta
                              final do cliente.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      A seção de layout do telhado está desativada e não será exibida na proposta em
                      PDF ou Word.
                    </div>
                  )}
                </div>

                {/* Preview fiel do PDF gerado (HTML idêntico ao do PDF impresso/baixado) */}
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
                  <div className="p-2 sm:p-4 bg-slate-200/75 flex justify-center overflow-x-auto">
                    <div className="w-[210mm] max-w-full px-[7mm] box-border flex justify-center">
                      <iframe
                        ref={previewIframeRef}
                        title="Preview da Proposta"
                        srcDoc={htmlPropostaPreview}
                        sandbox="allow-same-origin allow-modals allow-scripts"
                        className="w-[210mm] max-w-full h-[85vh] min-h-[750px] bg-white border border-gray-300 rounded-xl shadow-lg"
                      />
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
            {/* Continuar para a Aba de Custos */}
            <button
              type="button"
              onClick={() => setActiveTab('custos')}
              className="px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
              title="Avançar para a aba de Custos"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Salvar Orçamento */}
            <button
              type="button"
              onClick={() => handleSalvar()}
              disabled={isSubmitting || !clienteAtual}
              className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Salvando...'
                  : initialOrcamento?.id
                    ? `Salvar como Revisão ${(initialOrcamento.numero_revisao || 1) + 1}`
                    : 'Salvar Orçamento'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Importação do Solergo */}
      <ModalImportarSolergo
        open={modalSolergoOpen}
        onOpenChange={setModalSolergoOpen}
        geracaoAutomaticaPadrao={calculos.geracaoAnualEstimadaKwh}
        potenciaKwp={potenciaKwp}
        valoresIniciais={geracaoMensalSolergo}
        onAplicarSolergo={({ valoresMensais, totalAnual, imagemArquivo }) => {
          setGeracaoMensalSolergo(valoresMensais)
          setGeracaoSimuladaKwhAno(totalAnual)
          setAjusteSolergoAtivo(true)
          setGeracaoFonte('solergo')
          if (imagemArquivo) setImagemSolergoFile(imagemArquivo)
        }}
      />
    </div>
  )
}

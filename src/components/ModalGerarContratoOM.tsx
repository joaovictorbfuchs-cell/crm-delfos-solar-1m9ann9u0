import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Zap,
  DollarSign,
  Send,
  ArrowLeft,
  ExternalLink,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileCheck,
  Phone,
  Factory,
  Calculator,
} from 'lucide-react'
import type { Cliente, PropostaOM, UsinaCliente } from '@/types/crm'
import { fetchUsinasByClienteId } from '@/services/crmService'
import { Checkbox } from '@/components/ui/checkbox'
import type { DadosProcuracaoOM } from '@/lib/procuracaoGenerator'
import { abrirProcuracaoImpressao } from '@/lib/procuracaoGenerator'
import { gerarProcuracaoPdfBlobBase64 } from '@/components/BotaoBaixarProcuracaoPDF'
import { blobParaDataUriBase64 } from '@/lib/pdfBlobUtils'
import {
  type DadosContratoOM,
  type PlanoContratoOM,
  type ServicosAdicionaisValores,
  type ParametrosCalculoAnexoII,
  DADOS_FIXOS_CONTRATADA_CONTRATO,
  SERVICOS_ADICIONAIS_PADRAO,
  formatarDataExtenso,
  numeroParaExtensoEmReais,
  normalizarDadosContrato,
  getAnexoIPlanoConteudo,
  getAnexoIIServicos,
  calcularValoresSugeridosAnexoII,
  baixarContratoPDF,
  abrirContratoImpressao,
} from '@/lib/contratoGenerator'
import { estimarDistanciaDelfosCliente } from '@/lib/calculoDeslocamentoAtividades'
const LazyBotaoBaixarContratoOMPDF = React.lazy(
  () => import('@/components/BotaoBaixarContratoOMPDF'),
)
import { formatarCPF } from '@/lib/cpfValidator'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'
import { sendWhatsAppDocumento, createAtividade } from '@/services/crmService'
import { getFriendlyWhatsAppErrorMessage } from '@/lib/whatsappGateway'
import { blobParaDataUriBase64 } from '@/lib/pdfBlobUtils'
import { toast } from 'sonner'
import {
  resolverNumeroDestinoCliente,
  resolverNumeroDestinoClienteSync,
  MENSAGEM_ALERTA_SEM_NUMERO,
  type OrigemNumeroDestino,
} from '@/lib/resolverNumeroDestinoCliente'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
export interface ModalGerarContratoOMProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente
  propostaOM?: PropostaOM | null
  initialDados?: Partial<DadosContratoOM> | null
  modoVisualizacaoDireta?: boolean
  usinasDoCliente?: UsinaCliente[]
  usinaPreSelecionadaId?: string
  onDocumentoGerado?: (dados: DadosContratoOM, usinaId?: string | null) => void
}

export const ModalGerarContratoOM: React.FC<ModalGerarContratoOMProps> = ({
  open,
  onOpenChange,
  cliente,
  propostaOM,
  initialDados,
  modoVisualizacaoDireta = false,
  usinasDoCliente,
  usinaPreSelecionadaId,
  onDocumentoGerado,
}) => {
  // Etapa 1: 'revisao' (formulário com todos os dados preenchidos automaticamente da ficha e editáveis)
  // Etapa 2: 'confirmacao_tabela' (revisão e confirmação explícita da tabela completa do Anexo II antes da emissão)
  // Etapa 3: 'previsualizacao' (página A4 com o texto exato do modelo + botões Baixar PDF e Enviar WhatsApp)
  const [etapa, setEtapa] = useState<'revisao' | 'confirmacao_tabela' | 'previsualizacao'>(
    'revisao',
  )

  // Dados do Contratante
  const [formNome, setFormNome] = useState('')
  const [formCpfCnpj, setFormCpfCnpj] = useState('')
  const [formEndereco, setFormEndereco] = useState('')
  const [formMunicipio, setFormMunicipio] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [origemDestino, setOrigemDestino] = useState<OrigemNumeroDestino>('nenhum')
  const [contatoAdicionalNome, setContatoAdicionalNome] = useState<string | undefined>()
  const [formEmail, setFormEmail] = useState('')

  // Lista de Usinas do Cliente e Usina Selecionada
  const [listaUsinas, setListaUsinas] = useState<UsinaCliente[]>([])
  const [usinaSelecionadaId, setUsinaSelecionadaId] = useState<string>('')

  // Dados Técnicos do Sistema
  const [formNumModulos, setFormNumModulos] = useState<number | string>('0')
  const [formMarcaInversores, setFormMarcaInversores] = useState('')
  const [formLocalInstalacao, setFormLocalInstalacao] = useState<'Telhado' | 'Solo'>('Telhado')
  const [formEnderecoInstalacaoDiferente, setFormEnderecoInstalacaoDiferente] = useState('')

  // Plano e Valores
  const [formPlano, setFormPlano] = useState<PlanoContratoOM>('Essencial')
  const [formValorTotal, setFormValorTotal] = useState<number>(2280)
  const [formValorMensal, setFormValorMensal] = useState<number>(190)
  const [formDataExtenso, setFormDataExtenso] = useState('')

  // Valores dos Serviços Adicionais (Anexo II)
  const [formServicosAdicionais, setFormServicosAdicionais] = useState<ServicosAdicionaisValores>(
    SERVICOS_ADICIONAIS_PADRAO,
  )
  const [showServicosAdicionaisEdit, setShowServicosAdicionaisEdit] = useState(false)

  // Variáveis para cálculo sugerido dos serviços do Anexo II (com base na proposta/usina vinculada)
  const [paramPotenciaKwp, setParamPotenciaKwp] = useState<number>(0)
  const [paramDistanciaKm, setParamDistanciaKm] = useState<number>(15)
  const [paramValorKm, setParamValorKm] = useState<number>(2.5)
  const [paramValorKwh, setParamValorKwh] = useState<number>(0.92)
  const [paramValorPorPlaca, setParamValorPorPlaca] = useState<number>(9.0)
  const [showParametrosCalculo, setShowParametrosCalculo] = useState<boolean>(false)

  // Carregar usinas do cliente quando o modal abrir (se não fornecidas nas props)
  useEffect(() => {
    if (!open || !cliente) return
    let active = true

    if (usinasDoCliente && usinasDoCliente.length > 0) {
      setListaUsinas(usinasDoCliente)
      const inicialId =
        usinaPreSelecionadaId && usinasDoCliente.some((u) => u.id === usinaPreSelecionadaId)
          ? usinaPreSelecionadaId
          : usinasDoCliente.length === 1
            ? usinasDoCliente[0].id
            : ''
      setUsinaSelecionadaId(inicialId)
    } else {
      fetchUsinasByClienteId(cliente.id).then((res) => {
        if (!active) return
        setListaUsinas(res)
        const inicialId =
          usinaPreSelecionadaId && res.some((u) => u.id === usinaPreSelecionadaId)
            ? usinaPreSelecionadaId
            : res.length === 1
              ? res[0].id
              : ''
        setUsinaSelecionadaId(inicialId)
      })
    }

    return () => {
      active = false
    }
  }, [open, cliente, usinasDoCliente, usinaPreSelecionadaId])

  // Ao abrir o modal, pré-carrega os dados da ficha do cliente ou initialDados
  useEffect(() => {
    if (open && cliente) {
      let cancelResolucao = false
      async function resolverTelefoneCliente() {
        const res = await resolverNumeroDestinoCliente(cliente)
        if (cancelResolucao) return
        setOrigemDestino(res.origem)
        setContatoAdicionalNome(res.contatoAdicionalNome)
        if (res.numeroFormatado && !initialDados?.telefone) {
          setFormTelefone(res.numeroFormatado)
        }
      }
      resolverTelefoneCliente()

      setAtividadeRegistrada(false)

      if (initialDados) {
        setFormNome(
          initialDados.nomeRazaoSocial ||
            cliente.razao_social ||
            cliente.nome ||
            cliente.titular_nome ||
            '',
        )
        setFormCpfCnpj(
          initialDados.cpfCnpj || cliente.cnpj || cliente.cpf || cliente.titular_cpf || '',
        )
        setFormEndereco(initialDados.enderecoInstalacao || cliente.endereco || '')
        setFormMunicipio(initialDados.municipio || cliente.cidade || 'Erechim/RS')
        setFormTelefone(
          initialDados.telefone ||
            cliente.telefone ||
            cliente.whatsapp ||
            cliente.titular_telefone ||
            '',
        )
        setFormEmail(initialDados.email || cliente.email || cliente.titular_email || '')
        setFormNumModulos(
          initialDados.numeroModulos || cliente.placas_qtd || propostaOM?.numero_modulos || '0',
        )
        setFormMarcaInversores(
          initialDados.marcaInversores ||
            cliente.inversor_marca ||
            cliente.inversor_modelo ||
            propostaOM?.marca_inversores ||
            'Growatt',
        )
        setFormLocalInstalacao(
          (initialDados.localInstalacao as any) ||
            (String(cliente.telhado_tipo || '')
              .toLowerCase()
              .includes('solo')
              ? 'Solo'
              : 'Telhado'),
        )
        setFormEnderecoInstalacaoDiferente(
          initialDados.enderecoInstalacaoDiferente || cliente.usina_endereco || '',
        )
        setFormPlano(initialDados.planoSelecionado || 'Essencial')
        setFormValorTotal(initialDados.valorTotal || 2280)
        setFormValorMensal(initialDados.valorMensal || 190)
        setFormDataExtenso(initialDados.dataPorExtenso || formatarDataExtenso(new Date()))
        setFormServicosAdicionais(initialDados.servicosAdicionais || SERVICOS_ADICIONAIS_PADRAO)

        // Carrega parâmetros para cálculo de sugestão a partir da proposta ou cliente
        const potInicial = propostaOM?.potencia_kwp || cliente.potencia_kwp || 0
        const distInicial =
          propostaOM?.distancia_km ??
          estimarDistanciaDelfosCliente(cliente.endereco || '', cliente.cidade || '').distanciaKm
        const kmValInicial = propostaOM?.valor_km ?? 2.5
        const kwhValInicial = propostaOM?.valor_kwh ?? 0.92
        const placaValInicial = propostaOM?.valor_por_placa ?? 9.0
        setParamPotenciaKwp(potInicial)
        setParamDistanciaKm(distInicial)
        setParamValorKm(kmValInicial)
        setParamValorKwh(kwhValInicial)
        setParamValorPorPlaca(placaValInicial)

        setEtapa(modoVisualizacaoDireta ? 'previsualizacao' : 'revisao')
        return
      }

      // Preenchimento automático da ficha do cliente e proposta O&M aprovada
      const potInicial = propostaOM?.potencia_kwp || cliente.potencia_kwp || 0
      const distInicial =
        propostaOM?.distancia_km ??
        estimarDistanciaDelfosCliente(cliente.endereco || '', cliente.cidade || '').distanciaKm
      const kmValInicial = propostaOM?.valor_km ?? 2.5
      const kwhValInicial = propostaOM?.valor_kwh ?? 0.92
      const placaValInicial = propostaOM?.valor_por_placa ?? 9.0
      setParamPotenciaKwp(potInicial)
      setParamDistanciaKm(distInicial)
      setParamValorKm(kmValInicial)
      setParamValorKwh(kwhValInicial)
      setParamValorPorPlaca(placaValInicial)
      const nomeEfetivo = cliente.razao_social || cliente.nome || cliente.titular_nome || ''
      const docEfetivo = cliente.cnpj || cliente.cpf || cliente.titular_cpf || ''

      const enderecoPartes = [
        cliente.endereco,
        cliente.numero && cliente.numero !== 'S/N' ? `nº ${cliente.numero}` : cliente.numero,
        cliente.bairro,
      ].filter(Boolean)
      const enderecoEfetivo =
        enderecoPartes.length > 0 ? enderecoPartes.join(', ') : cliente.endereco || ''

      const municipioEfetivo = cliente.cidade || 'Erechim/RS'
      const telefoneEfetivo =
        cliente.whatsapp ||
        cliente.telefone ||
        cliente.titular_telefone ||
        propostaOM?.expand?.cliente_id?.whatsapp ||
        propostaOM?.expand?.cliente_id?.telefone ||
        ''
      const emailEfetivo = cliente.email || cliente.titular_email || ''

      // Sistema Fotovoltaico
      const modulosEfetivo = propostaOM?.numero_modulos || cliente.placas_qtd || 0
      const inversoresEfetivo =
        propostaOM?.marca_inversores ||
        [cliente.inversor_marca, cliente.inversor_modelo].filter(Boolean).join(' ') ||
        'Growatt / Huawei'

      const telhadoTipo = (cliente.telhado_tipo || '').toLowerCase()
      const localEfetivo: 'Telhado' | 'Solo' = telhadoTipo.includes('solo') ? 'Solo' : 'Telhado'

      // Plano e valores da proposta aprovada quando houver (utilizando valores salvos/ajustados da proposta)
      let planoDef: PlanoContratoOM = 'Essencial'
      let valorMensalDef = 190
      let valorTotalDef = 2280

      if (propostaOM) {
        const planoTexto = (propostaOM.plano_escolhido || '').toLowerCase()
        if (planoTexto.includes('preven') || planoTexto.includes('inspec')) {
          planoDef = 'Prevenção'
          valorMensalDef = propostaOM.valor_plano_inspecao || propostaOM.valor_mensal_plano || 450
          valorTotalDef =
            propostaOM.valor_anual_plano || Math.round(valorMensalDef * 12 * 100) / 100
        } else if (propostaOM.plano_escolhido === 'Completo') {
          planoDef = 'Completo'
          valorMensalDef = propostaOM.valor_plano_completo || propostaOM.valor_mensal_plano || 1450
          valorTotalDef =
            propostaOM.valor_anual_plano || Math.round(valorMensalDef * 12 * 100) / 100
        } else if (propostaOM.plano_escolhido === 'Essencial') {
          planoDef = 'Essencial'
          valorMensalDef = propostaOM.valor_plano_essencial || propostaOM.valor_mensal_plano || 190
          valorTotalDef =
            propostaOM.valor_anual_plano || Math.round(valorMensalDef * 12 * 100) / 100
        } else if (propostaOM.valor_mensal_plano) {
          valorMensalDef = propostaOM.valor_mensal_plano
          valorTotalDef =
            propostaOM.valor_anual_plano || Math.round(valorMensalDef * 12 * 100) / 100
        }
      }

      setFormNome(nomeEfetivo)
      setFormCpfCnpj(docEfetivo)
      setFormEndereco(enderecoEfetivo)
      setFormMunicipio(municipioEfetivo)
      setFormTelefone(telefoneEfetivo ? formatWhatsAppPhone(telefoneEfetivo) : '')
      setFormEmail(emailEfetivo)
      setFormNumModulos(modulosEfetivo)
      setFormMarcaInversores(inversoresEfetivo)
      setFormLocalInstalacao(localEfetivo)
      setFormEnderecoInstalacaoDiferente(cliente.usina_endereco || '')
      setFormPlano(planoDef)
      setFormValorMensal(valorMensalDef)
      setFormValorTotal(valorTotalDef)
      setFormDataExtenso(formatarDataExtenso(new Date()))
      setFormServicosAdicionais(SERVICOS_ADICIONAIS_PADRAO)
      setEtapa(modoVisualizacaoDireta ? 'previsualizacao' : 'revisao')

      return () => {
        cancelResolucao = true
      }
    }
  }, [open, cliente, propostaOM, initialDados, modoVisualizacaoDireta])

  // Altera valores quando o plano for mudado na etapa de revisão se o usuário não inseriu custom
  // (prioriza valores salvos da proposta O&M quando disponíveis)
  const handlePlanoChange = (novoPlano: PlanoContratoOM) => {
    setFormPlano(novoPlano)
    if (novoPlano === 'Essencial') {
      const v = propostaOM?.valor_plano_essencial || 190
      setFormValorMensal(v)
      setFormValorTotal(Math.round(v * 12 * 100) / 100)
    } else if (novoPlano === 'Prevenção') {
      const v = propostaOM?.valor_plano_inspecao || 450
      setFormValorMensal(v)
      setFormValorTotal(Math.round(v * 12 * 100) / 100)
    } else if (novoPlano === 'Completo') {
      const v = propostaOM?.valor_plano_completo || 1450
      setFormValorMensal(v)
      setFormValorTotal(Math.round(v * 12 * 100) / 100)
    }
  }

  const handleValorMensalChange = (v: number) => {
    setFormValorMensal(v)
    setFormValorTotal(v * 12)
  }

  const dadosConsolidados: DadosContratoOM = useMemo(() => {
    return normalizarDadosContrato({
      nomeRazaoSocial: formNome,
      cpfCnpj: formCpfCnpj,
      enderecoInstalacao: formEndereco,
      municipio: formMunicipio,
      telefone: formTelefone,
      email: formEmail,
      numeroModulos: formNumModulos,
      marcaInversores: formMarcaInversores,
      localInstalacao: formLocalInstalacao,
      enderecoInstalacaoDiferente: formEnderecoInstalacaoDiferente,
      planoSelecionado: formPlano,
      valorTotal: formValorTotal,
      valorMensal: formValorMensal,
      valorEscritoTotal: numeroParaExtensoEmReais(formValorTotal),
      valorEscritoMensal: numeroParaExtensoEmReais(formValorMensal),
      servicosAdicionais: formServicosAdicionais,
      dataPorExtenso: formDataExtenso,
      cidadeAssinatura: 'Erechim',
    })
  }, [
    formNome,
    formCpfCnpj,
    formEndereco,
    formMunicipio,
    formTelefone,
    formEmail,
    formNumModulos,
    formMarcaInversores,
    formLocalInstalacao,
    formEnderecoInstalacaoDiferente,
    formPlano,
    formValorTotal,
    formValorMensal,
    formDataExtenso,
    formServicosAdicionais,
  ])

  // Telefone para checagem do WhatsApp
  const telefoneApenasDigitos = useMemo(() => {
    return (formTelefone || '').replace(/\D/g, '')
  }, [formTelefone])

  const temTelefoneValido = telefoneApenasDigitos.length >= 10

  const [atividadeRegistrada, setAtividadeRegistrada] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)

  const registrarAtividadeEmissao = (dados: DadosContratoOM) => {
    if (!atividadeRegistrada) {
      setAtividadeRegistrada(true)
      onDocumentoGerado?.(dados, usinaSelecionadaId || null)
    }
  }

  // Handler de seleção de Usina para auto-preenchimento
  const handleSelecionarUsina = (usinaId: string) => {
    setUsinaSelecionadaId(usinaId)
    if (!usinaId) return

    const usina = listaUsinas.find((u) => u.id === usinaId)
    if (!usina) return

    // Preenche quantidade de placas
    const qtdPlacas = usina.quantidade_placas || usina.qtd_modulos
    if (qtdPlacas) {
      setFormNumModulos(qtdPlacas)
    }

    if (usina.potencia_kwp) {
      setParamPotenciaKwp(Number(usina.potencia_kwp) || 0)
    }

    // Preenche inversores
    const inversores =
      usina.inversores_info ||
      [usina.fabricante_inversores, usina.modelo_inversores].filter(Boolean).join(' ')
    if (inversores) {
      setFormMarcaInversores(inversores)
    }

    // Preenche local de instalação
    if (usina.tipo_estrutura) {
      setFormLocalInstalacao(usina.tipo_estrutura === 'solo' ? 'Solo' : 'Telhado')
    }

    // Preenche endereço da usina se houver e for específico
    if (usina.endereco) {
      setFormEnderecoInstalacaoDiferente(usina.endereco)
    }

    toast.info(`Dados técnicos e endereço preenchidos a partir da usina "${usina.nome}".`)
  }

  // Ação de cálculo de valores sugeridos para a Tabela de Serviços Adicionais (Anexo II)
  const handleCalcularValoresSugeridos = () => {
    const params: ParametrosCalculoAnexoII = {
      numeroModulos: Number(formNumModulos) || 0,
      potenciaKwp: Number(paramPotenciaKwp) || 0,
      distanciaKm: Number(paramDistanciaKm) || 0,
      valorKm: Number(paramValorKm) || 0,
      valorKwh: Number(paramValorKwh) || 0,
      valorPorPlaca: Number(paramValorPorPlaca) || 9,
    }

    const novosValores = calcularValoresSugeridosAnexoII(params)
    setFormServicosAdicionais(novosValores)
    setShowServicosAdicionaisEdit(true)
    toast.success(
      'Valores do Anexo II calculados e preenchidos com base nas variáveis da usina/proposta!',
    )
  }

  // Avançar da etapa de revisão dos dados gerais para a etapa de confirmação da tabela do Anexo II
  const handleAvancarParaConfirmacaoTabela = () => {
    if (!formNome.trim()) {
      toast.warning('Informe o Nome ou Razão Social do cliente/contratante.')
      return
    }
    if (!formCpfCnpj.trim()) {
      toast.warning('Informe o CPF ou CNPJ do contratante.')
      return
    }
    setEtapa('confirmacao_tabela')
  }

  // Confirmar os valores da tabela do Anexo II e avançar para a emissão/pré-visualização
  const handleConfirmarTabelaEEmitir = () => {
    setEtapa('previsualizacao')
    registrarAtividadeEmissao(dadosConsolidados)
    toast.success('Valores do Anexo II confirmados com sucesso!')
  }

  // Submodal de conferência e envio do WhatsApp com PDF anexo (mesmo padrão da Procuração)
  const [modalConferenciaWhatsAppOpen, setModalConferenciaWhatsAppOpen] = useState(false)
  const [whatsappTelefoneEditado, setWhatsappTelefoneEditado] = useState('')
  const [whatsappMensagemEditada, setWhatsappMensagemEditada] = useState('')

  // 1. Callback de download com @react-pdf/renderer
  const handleDownloadPDFClick = () => {
    registrarAtividadeEmissao(dadosConsolidados)
    toast.success('Download do PDF do contrato iniciado com sucesso!')
  }

  // 2. Abrir Modal de Conferência de WhatsApp ao clicar no botão "Enviar pelo WhatsApp"
  const handleAbrirConferenciaWhatsApp = () => {
    const primeiroNome = (dadosConsolidados.nomeRazaoSocial || 'Cliente').split(' ')[0]
    const mensagemTexto = `Olá ${primeiroNome}! Segue em anexo o Contrato de Prestação de Serviços de Operação e Manutenção (O&M) da Delfos Solar no ${dadosConsolidados.planoSelecionado} para sua conferência e assinatura. O valor mensal é de ${formatCurrency(dadosConsolidados.valorMensal)} (${dadosConsolidados.valorEscritoMensal}). Ficamos à total disposição para qualquer dúvida!`

    setWhatsappTelefoneEditado(formTelefone || '')
    setWhatsappMensagemEditada(mensagemTexto)
    setModalConferenciaWhatsAppOpen(true)
  }

  // 3. Confirmar e Enviar Documento via WhatsApp com PDF oficial gerado (@react-pdf/renderer) e legenda
  const handleConfirmarEnvioWhatsApp = async () => {
    const telLimpo = (whatsappTelefoneEditado || '').replace(/\D/g, '')
    if (telLimpo.length < 10) {
      toast.error('Informe um número de telefone WhatsApp válido com DDD (mínimo 10 dígitos).')
      return
    }

    const mensagemLimpa = whatsappMensagemEditada.trim()
    if (!mensagemLimpa) {
      toast.error('Por favor, informe a mensagem a ser enviada junto ao contrato.')
      return
    }

    setIsSendingWhatsApp(true)
    try {
      // 1. Gera o PDF oficial em Base64 Data URI via @react-pdf/renderer (mesmo documento do botão "Baixar como PDF")
      const { gerarContratoOMPdfBlobBase64 } = await import('@/components/BotaoBaixarContratoOMPDF')
      const { base64, fileName } = await gerarContratoOMPdfBlobBase64(dadosConsolidados)
      if (!base64) {
        toast.error('Não foi possível gerar o PDF oficial do contrato para envio.')
        setIsSendingWhatsApp(false)
        return
      }

      const legendaComPrefixo = aplicarPrefixoMensagemManual(mensagemLimpa)

      // 2. Envia documento de fato via endpoint oficial de documentos do WhatsApp (Z-API)
      const res = await sendWhatsAppDocumento({
        cliente_id: cliente.id,
        telefone_destino: telLimpo,
        tipo: 'documento',
        legenda: legendaComPrefixo,
        nome_arquivo:
          fileName ||
          `Contrato_OM_Delfos_${dadosConsolidados.planoSelecionado}_${(dadosConsolidados.nomeRazaoSocial || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        base64: base64,
      })

      if (res.sent || res.ok) {
        toast.success('Contrato O&M em PDF enviado com sucesso pelo WhatsApp!')
        registrarAtividadeEmissao(dadosConsolidados)

        // Registrar atividade no histórico/timeline do cliente
        try {
          await createAtividade({
            cliente_id: cliente.id,
            tipo: 'gerar_contrato',
            titulo: `Contrato O&M (${dadosConsolidados.planoSelecionado}) Enviado via WhatsApp`,
            descricao: `Contrato O&M em PDF enviado para ${dadosConsolidados.nomeRazaoSocial} no número ${formatWhatsAppPhone(telLimpo)} com documento anexo.`,
            data: new Date().toISOString(),
            status: 'concluida',
            autor: 'CRM Delfos Solar',
          })
        } catch (atvErr) {
          console.warn('Falha ao registrar atividade de envio de contrato no histórico:', atvErr)
        }

        setModalConferenciaWhatsAppOpen(false)
      } else {
        const errorMsg = getFriendlyWhatsAppErrorMessage(res)
        toast.error(errorMsg || 'Falha ao enviar documento via WhatsApp.')
      }
    } catch (err: any) {
      console.error('Erro ao disparar WhatsApp de contrato O&M com PDF anexo:', err)
      toast.error(err?.message || 'Falha na conexão ao enviar documento via WhatsApp.')
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  const anexoIConteudo = useMemo(() => {
    return getAnexoIPlanoConteudo(dadosConsolidados.planoSelecionado)
  }, [dadosConsolidados.planoSelecionado])

  const anexoIIServicos = useMemo(() => {
    return getAnexoIIServicos(dadosConsolidados.servicosAdicionais)
  }, [dadosConsolidados.servicosAdicionais])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-[#F9FAFB]">
        {/* Header Superior */}
        <div className="p-5 sm:p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900">
                  {etapa === 'revisao'
                    ? 'Gerar Contrato de Prestação de Serviços O&M — Revisão de Dados'
                    : etapa === 'confirmacao_tabela'
                      ? 'Confirmar Tabela de Serviços Adicionais (Anexo II) — Conferência Prévia'
                      : 'Pré-Visualização do Contrato O&M — Modelo Oficial Delfos'}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {etapa === 'revisao'
                    ? 'Confira os dados do cliente, sistema técnico, plano e valores antes de avançar para a emissão.'
                    : etapa === 'confirmacao_tabela'
                      ? 'Revise os valores finais de cada um dos 12 serviços do Anexo II antes de emitir o contrato oficial.'
                      : 'Confira o contrato completo no padrão A4 oficial Delfos com os anexos antes de baixar ou enviar pelo WhatsApp.'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-xs">
                Plano {dadosConsolidados.planoSelecionado}
              </Badge>
              {etapa === 'confirmacao_tabela' && (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-xs">
                  Etapa: Confirmação Anexo II
                </Badge>
              )}
              {etapa === 'previsualizacao' && (
                <Badge className="bg-emerald-600 text-white font-medium text-xs">
                  Pronto para emissão
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TELA 1: PRÉ-REVISÃO DOS DADOS DO CLIENTE E CONTRATO (EDITÁVEIS)          */}
        {/* ========================================================================= */}
        {etapa === 'revisao' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Bloco 1: Dados do Cliente / Contratante */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    1. Dados do Contratante (Cliente)
                  </h4>
                </div>
                <span className="text-[11px] text-gray-400">Preenchido da ficha • Editável</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Nome Completo ou Razão Social <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Fazenda Três Palmeiras ou Marcelo Becker"
                    className="h-9 text-xs mt-1 bg-white font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui «Nome_RazaoSocial» no modelo oficial.
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    CPF ou CNPJ <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formCpfCnpj}
                    onChange={(e) => setFormCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="h-9 text-xs mt-1 bg-white font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «CPFCNPJ».</p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">Município / UF</Label>
                  <Input
                    value={formMunicipio}
                    onChange={(e) => setFormMunicipio(e.target.value)}
                    placeholder="Ex: Erechim/RS ou Passo Fundo/RS"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «municipio».</p>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Endereço da Instalação / Domicílio
                  </Label>
                  <Input
                    value={formEndereco}
                    onChange={(e) => setFormEndereco(e.target.value)}
                    placeholder="Ex: Linha São João, Km 12, Zona Rural"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «Enderecoinstalacao».</p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Telefone para Contato / WhatsApp
                  </Label>
                  <Input
                    value={formTelefone}
                    onChange={(e) => {
                      setFormTelefone(formatWhatsAppPhone(e.target.value))
                    }}
                    placeholder="(54) 99712-8844"
                    className="h-9 text-xs mt-1 bg-white font-mono"
                  />
                  {origemDestino === 'contato_adicional_whatsapp' && (
                    <div className="mt-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 flex items-center gap-1.5 font-medium">
                      <span className="font-bold">Contato adicional:</span>
                      <span>{contatoAdicionalNome || 'Contato com WhatsApp'}</span>
                      <span className="text-blue-600">(utilizado como alternativa)</span>
                    </div>
                  )}
                  {origemDestino === 'cliente_telefone' && (
                    <div className="mt-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-1.5">
                      <span>Usando telefone do cliente (sem WhatsApp cadastrado).</span>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui «Telefone». Usado para envio do contrato via WhatsApp.
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    E-mail do Contratante
                  </Label>
                  <Input
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="cliente@exemplo.com.br"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «Email».</p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Dados Técnicos do Sistema Fotovoltaico & Vínculo com Usina */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    2. Dados Técnicos do Sistema Fotovoltaico
                  </h4>
                </div>
                <span className="text-[11px] text-gray-400">Parâmetros técnicos da instalação</span>
              </div>

              {/* Seletor de Usina do Cliente (caso de uso: 1 contrato por usina ou vínculo direto) */}
              {listaUsinas.length > 0 && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Vincular a uma Usina do Cliente (1 Contrato por Usina)</span>
                    </Label>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Auto-preenche endereço e equipamentos
                    </span>
                  </div>
                  <select
                    value={usinaSelecionadaId}
                    onChange={(e) => handleSelecionarUsina(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-emerald-300 text-xs bg-white text-gray-900 font-semibold focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Nenhuma usina específica (contrato geral do cliente)</option>
                    {listaUsinas.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} {u.potencia_kwp ? `(${u.potencia_kwp} kWp)` : ''}{' '}
                        {u.qtd_modulos || u.quantidade_placas
                          ? `• ${u.qtd_modulos || u.quantidade_placas} placas`
                          : ''}{' '}
                        {u.endereco ? `• ${u.endereco}` : ''}
                      </option>
                    ))}
                  </select>
                  {usinaSelecionadaId && (
                    <p className="text-[10px] text-emerald-800">
                      ✓ A usina selecionada será vinculada a este contrato O&M na base de dados.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Número de Módulos (Painéis)
                  </Label>
                  <Input
                    type="number"
                    value={formNumModulos}
                    onChange={(e) => setFormNumModulos(e.target.value)}
                    placeholder="Ex: 64"
                    className="h-9 text-xs mt-1 bg-white font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «N_Modulos».</p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Fabricante e Modelo dos Inversores
                  </Label>
                  <Input
                    value={formMarcaInversores}
                    onChange={(e) => setFormMarcaInversores(e.target.value)}
                    placeholder="Ex: Growatt MAX 30KTL3-X ou Fronius Symo"
                    className="h-9 text-xs mt-1 bg-white font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «Marcainversores».</p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Local de Instalação
                  </Label>
                  <select
                    value={formLocalInstalacao}
                    onChange={(e) => setFormLocalInstalacao(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs bg-white mt-1 font-medium"
                  >
                    <option value="Telhado">Telhado</option>
                    <option value="Solo">Solo</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «Local_SoloTelhado».</p>
                </div>

                <div className="sm:col-span-3">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Endereço da Instalação (se diferente do endereço do Contratante)
                  </Label>
                  <Input
                    value={formEnderecoInstalacaoDiferente}
                    onChange={(e) => setFormEnderecoInstalacaoDiferente(e.target.value)}
                    placeholder="Deixe em branco se for o mesmo endereço do cliente acima"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Plano Contratado e Condições Financeiras */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    3. Plano Contratado & Condições Financeiras
                  </h4>
                </div>
                <span className="text-[11px] text-gray-400">Cláusula 5ª • Parcelamento em 12x</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Plano Selecionado <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={formPlano}
                    onChange={(e) => handlePlanoChange(e.target.value as PlanoContratoOM)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs bg-white mt-1 font-bold text-emerald-800"
                  >
                    <option value="Essencial">Essencial (R$ 190,00/mês)</option>
                    <option value="Prevenção">Prevenção (R$ 450,00/mês)</option>
                    <option value="Completo">Completo (R$ 1.450,00/mês)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui «PlanoSelecionado» e define o Anexo I.
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Valor Mensal da Parcela (R$/mês) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="10"
                    value={formValorMensal}
                    onChange={(e) => handleValorMensalChange(Number(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 bg-white font-bold text-emerald-700 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Extenso: <em>{numeroParaExtensoEmReais(formValorMensal)}</em>
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Valor Total Anual (12 parcelas) (R$) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="10"
                    value={formValorTotal}
                    onChange={(e) => setFormValorTotal(Number(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 bg-white font-bold text-gray-900 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Extenso: <em>{numeroParaExtensoEmReais(formValorTotal)}</em>
                  </p>
                </div>

                <div className="sm:col-span-3">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Data da Assinatura (por extenso em português)
                  </Label>
                  <Input
                    value={formDataExtenso}
                    onChange={(e) => setFormDataExtenso(e.target.value)}
                    placeholder="Ex: 14 de setembro de 2026"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui «Data» no fecho de Erechim.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 4: Serviços Adicionais (Anexo II) — Valores editáveis */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => setShowServicosAdicionaisEdit(!showServicosAdicionaisEdit)}
                >
                  <FileText className="w-4 h-4 text-gray-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    4. Tabela de Serviços Adicionais (Anexo II)
                  </h4>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botão de Calcular Valores Sugeridos (Melhoria 1) */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCalcularValoresSugeridos}
                    className="h-8 px-2.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 gap-1.5 shadow-2xs"
                    title="Calcular valores sugeridos dos 12 serviços com base na quantidade de módulos, potência, distância e parâmetros da usina/proposta"
                  >
                    <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Calcular valores sugeridos</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowParametrosCalculo(!showParametrosCalculo)}
                    className="text-[11px] font-medium text-gray-600 hover:text-gray-900 underline underline-offset-2 flex items-center gap-1"
                    title="Visualizar ou editar variáveis de cálculo (distância, potência, valor/km, etc.)"
                  >
                    <span>{showParametrosCalculo ? 'Ocultar Parâmetros' : 'Parâmetros Usina'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowServicosAdicionaisEdit(!showServicosAdicionaisEdit)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>
                      {showServicosAdicionaisEdit
                        ? 'Ocultar Valores'
                        : 'Personalizar Valores (12 Itens)'}
                    </span>
                    {showServicosAdicionaisEdit ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-painel retrátil de parâmetros de cálculo da usina/proposta */}
              {showParametrosCalculo && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      Parâmetros vinculados à usina / proposta para o cálculo
                    </span>
                    <span className="text-[10px] text-emerald-800">
                      O botão &quot;Calcular valores sugeridos&quot; usa estes parâmetros
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <Label className="text-[10px] font-medium text-emerald-900">Nº Módulos</Label>
                      <Input
                        type="number"
                        value={formNumModulos}
                        onChange={(e) => setFormNumModulos(Number(e.target.value) || 0)}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-medium text-emerald-900">
                        Potência (kWp)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={paramPotenciaKwp}
                        onChange={(e) => setParamPotenciaKwp(Number(e.target.value) || 0)}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-medium text-emerald-900">
                        Distância (km)
                      </Label>
                      <Input
                        type="number"
                        value={paramDistanciaKm}
                        onChange={(e) => setParamDistanciaKm(Number(e.target.value) || 0)}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-medium text-emerald-900">
                        Valor por km (R$)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={paramValorKm}
                        onChange={(e) => setParamValorKm(Number(e.target.value) || 0)}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-medium text-emerald-900">
                        Valor p/ Placa (R$)
                      </Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={paramValorPorPlaca}
                        onChange={(e) => setParamValorPorPlaca(Number(e.target.value) || 0)}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-700">
                    * Módulos escalam a limpeza (R$/placa). Distância e valor/km escalam serviços
                    com visita in loco (ida e volta). Hora adicional fixa em R$ 150,00.
                  </p>
                </div>
              )}

              {showServicosAdicionaisEdit ? (
                <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs animate-in fade-in">
                  <div>
                    <Label className="text-[10px] text-gray-600">1. Diagnóstico Técnico (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.diagnostico}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          diagnostico: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      2. Manutenção Corretiva (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.manutencaoCorretiva}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          manutencaoCorretiva: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      3. Inspeção Termográfica (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.inspecaoTermografica}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          inspecaoTermografica: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">4. Inspeção Técnica (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.inspecaoTecnica}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          inspecaoTecnica: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">5. Limpeza de Painéis (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.limpezaPaineis}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          limpezaPaineis: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">6. Testes em Inversor (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.testesInversor}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          testesInversor: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      7. Substituição Inversor (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.substituicaoInversor}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          substituicaoInversor: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      8. Relatório Seguradora (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.relatorioSeguradora}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          relatorioSeguradora: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">9. Datalogger / WiFi (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.configuracaoDatalogger}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          configuracaoDatalogger: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">10. Gestão de Rateio (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.gestaoRateio}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          gestaoRateio: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      11. Auditoria Faturamento (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.auditoriaFaturamento}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          auditoriaFaturamento: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">12. Manutenção Ativos (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.manutencaoAtivos}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          manutencaoAtivos: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg">
                  Valores padrão Delfos configurados (Diagnóstico{' '}
                  {formatCurrency(formServicosAdicionais.diagnostico)}, Termografia{' '}
                  {formatCurrency(formServicosAdicionais.inspecaoTermografica)}, Limpeza{' '}
                  {formatCurrency(formServicosAdicionais.limpezaPaineis)}, etc. com hora adicional
                  R$ 150,00).
                </div>
              )}
            </div>

            {/* Bloco 5: Dados Fixos da Contratada Delfos */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                    5. Dados Fixos da Contratada (Delfos Solar)
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Padrão Institucional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Razão Social & CNPJ
                  </span>
                  <div className="font-bold text-gray-900">
                    {DADOS_FIXOS_CONTRATADA_CONTRATO.razaoSocial}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    CNPJ: <span className="font-mono">{DADOS_FIXOS_CONTRATADA_CONTRATO.cnpj}</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Representante Legal & RT
                  </span>
                  <div className="font-bold text-gray-900">
                    {DADOS_FIXOS_CONTRATADA_CONTRATO.representanteNome}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    {DADOS_FIXOS_CONTRATADA_CONTRATO.representanteCargo} • CPF:{' '}
                    <span className="font-mono">
                      {DADOS_FIXOS_CONTRATADA_CONTRATO.representanteCpf}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 p-2.5 bg-white rounded-xl border border-emerald-100 text-[11px] text-gray-600">
                  <strong className="text-gray-800">Sede Social:</strong>{' '}
                  {DADOS_FIXOS_CONTRATADA_CONTRATO.endereco}
                </div>
              </div>
            </div>

            {/* Rodapé com botões de ação da Revisão */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleAvancarParaConfirmacaoTabela}
                className="w-full sm:w-auto bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-2 shadow-xs transition-transform hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Revisar Tabela Anexo II</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 2: ETAPA DE CONFIRMAÇÃO DA TABELA DO ANEXO II ANTES DA EMISSÃO       */}
        {/* ========================================================================= */}
        {etapa === 'confirmacao_tabela' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      Confirmação dos Valores — Anexo II (Serviços Adicionais)
                    </h4>
                    <p className="text-xs text-gray-500">
                      Revise a tabela completa antes da emissão oficial. Você pode ajustar valores
                      caso a caso ou recalcular com novos parâmetros.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCalcularValoresSugeridos}
                    className="h-8 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 gap-1.5 shadow-2xs"
                  >
                    <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Recalcular sugeridos</span>
                  </Button>
                </div>
              </div>

              {/* Resumo de Parâmetros da Usina */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                    Módulos
                  </span>
                  <span className="font-bold text-gray-900">{formNumModulos || '0'} placas</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                    Potência
                  </span>
                  <span className="font-bold text-gray-900">
                    {paramPotenciaKwp ? `${paramPotenciaKwp} kWp` : 'Não informada'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                    Distância
                  </span>
                  <span className="font-bold text-gray-900">
                    {paramDistanciaKm || 0} km ({formatCurrency(paramValorKm)}/km)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                    Hora Adicional
                  </span>
                  <span className="font-bold text-gray-900">R$ 150,00 / hora</span>
                </div>
              </div>

              {/* Tabela completa com inputs diretos para ajuste fino */}
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100/90 text-gray-800 font-bold border-b border-gray-200">
                      <th className="p-2.5 text-center w-12">Item</th>
                      <th className="p-2.5 text-left w-48">Serviço</th>
                      <th className="p-2.5 text-left">Descrição Detalhada</th>
                      <th className="p-2.5 text-right w-36">Valor Gravado (R$)</th>
                      <th className="p-2.5 text-center w-28">Hora Adicional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {anexoIIServicos.map((s, idx) => {
                      // Determina a chave correspondente no estado para permitir edição inline se desejado
                      const chaveMapeamento: Record<number, keyof ServicosAdicionaisValores> = {
                        1: 'diagnostico',
                        2: 'manutencaoCorretiva',
                        3: 'inspecaoTermografica',
                        4: 'inspecaoTecnica',
                        5: 'limpezaPaineis',
                        6: 'testesInversor',
                        7: 'substituicaoInversor',
                        8: 'relatorioSeguradora',
                        9: 'configuracaoDatalogger',
                        10: 'gestaoRateio',
                        11: 'auditoriaFaturamento',
                        12: 'manutencaoAtivos',
                      }
                      const chave = chaveMapeamento[idx + 1]

                      return (
                        <tr key={s.item} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-2.5 text-center font-bold text-gray-700">{s.item}</td>
                          <td className="p-2.5 font-semibold text-gray-900">{s.servico}</td>
                          <td className="p-2.5 text-gray-600 leading-snug text-[11px]">
                            {s.descricao}
                          </td>
                          <td className="p-2.5 text-right">
                            {chave ? (
                              <div className="inline-flex items-center gap-1 justify-end font-mono">
                                <span className="text-[11px] text-gray-400">R$</span>
                                <Input
                                  type="number"
                                  value={formServicosAdicionais[chave]}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0
                                    setFormServicosAdicionais((prev) => ({
                                      ...prev,
                                      [chave]: val,
                                    }))
                                  }}
                                  className="h-8 w-24 text-right text-xs font-bold font-mono text-emerald-800 bg-emerald-50/40 border-emerald-300 focus:bg-white"
                                />
                              </div>
                            ) : (
                              <span className="font-bold text-emerald-800 font-mono">
                                {s.valor}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center text-gray-700 font-mono text-[11px]">
                            {s.horaAdicional}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> Estes são os valores exatos que constarão na tabela do{' '}
                  <strong>Anexo II</strong> impressa no contrato oficial e no arquivo PDF. Você pode
                  ajustar qualquer valor individualmente nos campos acima antes de prosseguir.
                </div>
              </div>
            </div>

            {/* Rodapé com botões de ação da Confirmação */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEtapa('revisao')}
                className="w-full sm:w-auto text-xs gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar e Ajustar Dados</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarTabelaEEmitir}
                className="w-full sm:w-auto bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-2 shadow-xs transition-transform hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar valores e emitir contrato</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 3: PRÉ-VISUALIZAÇÃO EM FOLHA A4 COM O TEXTO EXATO E BOTÕES          */}
        {/* ========================================================================= */}
        {etapa === 'previsualizacao' && (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Barra Superior de Ações com os botões obrigatórios */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEtapa('confirmacao_tabela')}
                className="text-xs text-gray-600 hover:text-gray-900 gap-1.5"
                title="Voltar para a conferência da tabela de serviços adicionais"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar e Ajustar Tabela Anexo II</span>
              </Button>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                {/* Botão Secundário: Abrir para Impressão */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => abrirContratoImpressao(dadosConsolidados, true)}
                  className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50 gap-1.5 hidden md:inline-flex"
                  title="Abrir versão de impressão nativa do navegador"
                >
                  <Printer className="w-4 h-4 text-gray-500" />
                  <span>Imprimir</span>
                </Button>

                {/* BOTÃO OBRIGATÓRIO 1: BAIXAR COMO PDF (@react-pdf/renderer com download contrato-om.pdf) */}
                <React.Suspense
                  fallback={
                    <Button
                      type="button"
                      size="sm"
                      disabled
                      className="bg-[#16A34A]/80 text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Baixar como PDF</span>
                    </Button>
                  }
                >
                  <LazyBotaoBaixarContratoOMPDF
                    dados={dadosConsolidados}
                    onClick={handleDownloadPDFClick}
                  />
                </React.Suspense>

                {/* BOTÃO OBRIGATÓRIO 2: ENVIAR PELO WHATSAPP (com conferência e envio Z-API do PDF oficial) */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAbrirConferenciaWhatsApp}
                  disabled={!temTelefoneValido || isSendingWhatsApp}
                  className={`text-xs font-bold gap-1.5 shadow-xs transition-transform ${
                    temTelefoneValido && !isSendingWhatsApp
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white hover:scale-[1.02]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title={
                    temTelefoneValido
                      ? `Conferir número e enviar contrato em PDF via WhatsApp para ${dadosConsolidados.telefone || 'cliente'}`
                      : 'Cliente sem telefone de contato cadastrado na ficha'
                  }
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar pelo WhatsApp</span>
                </Button>
              </div>
            </div>

            {/* Aviso quando o cliente não tiver telefone */}
            {!temTelefoneValido && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> O cliente não possui telefone de contato válido
                  cadastrado. O botão <em>Enviar pelo WhatsApp</em> está desabilitado. Você pode
                  voltar à etapa de revisão e preencher o telefone ou fazer o download do PDF.
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* SIMULAÇÃO DA FOLHA A4 COM O TEXTO EXATO DO MODELO OFICIAL             */}
            {/* ===================================================================== */}
            <div className="w-full flex justify-center py-2">
              <div
                className="w-full max-w-[760px] bg-white rounded-lg border border-gray-300 shadow-xl p-8 sm:p-14 text-gray-900 space-y-6 leading-relaxed select-text"
                style={{
                  fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
                  fontSize: '14px',
                  lineHeight: '1.75',
                }}
              >
                {/* Header Institucional */}
                <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3 mb-6">
                  <div>
                    <div className="font-bold text-emerald-800 text-base tracking-wide">
                      DELFOS ENGENHARIA
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Operação, Manutenção & Eficiência Solar
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-gray-600">
                    <div>CNPJ: 21.379.952/0001-38</div>
                    <div>Erechim/RS</div>
                  </div>
                </div>

                {/* Título Principal */}
                <div className="text-center space-y-1 mb-8">
                  <h1 className="font-bold uppercase tracking-wider text-base sm:text-lg">
                    CONTRATO DE PRESTAÇÃO DE SERVIÇOS
                  </h1>
                  <h2 className="text-xs sm:text-sm font-semibold text-gray-700">
                    Acompanhamento, Análise de Performance e Manutenção de Gerador Fotovoltaico
                  </h2>
                </div>

                {/* Preâmbulo */}
                <p className="text-justify">
                  Pelo presente instrumento particular, de um lado,{' '}
                  <strong>DELFOS ENGENHARIA LTDA</strong>, pessoa jurídica de direito privado,
                  inscrita no CNPJ sob o nº <strong>21.379.952/0001-38</strong>, com sede na Rua
                  Espírito Santo, nº 275, Centro, Erechim/RS, CEP 99709-296, neste ato representada
                  por seu sócio administrador e responsável técnico{' '}
                  <strong>João Victor Bagetti Fuchs</strong>, engenheiro eletricista, portador do
                  CPF nº <strong>811.562.780-15</strong>, doravante denominada{' '}
                  <strong>CONTRATADA</strong>; e, de outro lado,{' '}
                  <strong>{dadosConsolidados.nomeRazaoSocial}</strong>, portador do CPF/CNPJ nº{' '}
                  <strong>{dadosConsolidados.cpfCnpj}</strong>, domiciliado no endereço{' '}
                  <strong>{dadosConsolidados.enderecoInstalacao}</strong>,{' '}
                  <strong>{dadosConsolidados.municipio}</strong> com contato no telefone{' '}
                  <strong>{dadosConsolidados.telefone || 'não informado'}</strong> e e-mail{' '}
                  <strong>{dadosConsolidados.email || 'não informado'}</strong>, doravante
                  denominado <strong>CONTRATANTE</strong>, têm entre si, justo e contratado, o
                  presente Contrato de Prestação de Serviços de Monitoramento.
                </p>

                {/* Bloco Dados Técnicos */}
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-600 text-xs space-y-1.5 my-4">
                  <div className="font-bold uppercase text-emerald-900 tracking-wider">
                    DADOS TÉCNICOS DO SISTEMA FOTOVOLTAICO:
                  </div>
                  <div>
                    <strong>Número total de módulos fotovoltaicos:</strong>{' '}
                    {dadosConsolidados.numeroModulos} painéis
                  </div>
                  <div>
                    <strong>Fabricante e potência dos inversores:</strong>{' '}
                    {dadosConsolidados.marcaInversores}
                  </div>
                  <div>
                    <strong>Local de instalação:</strong> {dadosConsolidados.localInstalacao}
                  </div>
                  <div>
                    <strong>Endereço da instalação:</strong>{' '}
                    {dadosConsolidados.enderecoInstalacaoDiferente ||
                      dadosConsolidados.enderecoInstalacao}
                  </div>
                </div>

                {/* Plano Contratado */}
                <p>
                  <strong>PLANO CONTRATADO: {dadosConsolidados.planoSelecionado}</strong>
                </p>

                <p className="text-justify">
                  Fica desde logo definido que o presente contrato é composto e integrado, para
                  todos os fins e efeitos de direito, pelos seguintes documentos:
                </p>
                <ol className="list-[lower-alpha] pl-6 space-y-1 text-justify">
                  <li>O corpo principal, contendo as Cláusulas 1ª a 13ª;</li>
                  <li>O Anexo I — Detalhamento de Serviços e Tabela de Valores;</li>
                  <li>O Anexo II — Tabela de Serviços Adicionais.</li>
                </ol>

                <p className="text-justify">
                  A <strong>CONTRATANTE</strong> declara ter recebido, lido e concordado
                  integralmente com o teor de todos os documentos acima referidos, que passam a
                  fazer parte inseparável deste instrumento contratual.
                </p>

                {/* Cláusula 1 */}
                <div className="font-bold uppercase text-sm pt-2">CLÁUSULA 1ª – OBJETO</div>
                <p className="text-justify">
                  O objeto do presente contrato é a prestação, pela <strong>CONTRATADA</strong> ao{' '}
                  <strong>CONTRATANTE</strong>, de serviços de acompanhamento, análise de
                  performance e manutenção preventiva de gerador fotovoltaico, conforme as
                  especificações técnicas e operacionais descritas no Anexo I, bem como a realização
                  de eventuais serviços adicionais previstos no Anexo II, quando solicitados pelo{' '}
                  <strong>CONTRATANTE</strong>.
                </p>

                {/* Cláusula 2 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 2ª – PRAZO E VIGÊNCIA
                </div>
                <p className="text-justify">
                  2.1 O presente contrato terá vigência de 12 (doze) meses, contados a partir da
                  data de sua assinatura.
                </p>
                <p className="text-justify">
                  2.2 Ao término do prazo inicial, o contrato será automaticamente renovado por
                  períodos sucessivos de 12 (doze) meses, salvo manifestação em contrário de
                  qualquer das partes, comunicada por escrito com antecedência mínima de 30 (trinta)
                  dias do término da vigência em curso.
                </p>

                {/* Cláusula 3 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 3ª – OBRIGAÇÕES DA CONTRATADA
                </div>
                <p className="text-justify">
                  3.1 A <strong>CONTRATADA</strong> obriga-se a executar os serviços descritos no
                  Anexo I, observando as diretrizes técnicas e os prazos ali estabelecidos.
                </p>
                <p className="text-justify">
                  3.2 A <strong>CONTRATADA</strong> se compromete a atuar em dias úteis e horário
                  comercial (segunda a sexta-feira, das 08h00 às 17h30), salvo disposição em
                  contrário expressamente acordada entre as partes.
                </p>
                <p className="text-justify">
                  3.3 Para manutenções e inspeções, o prazo máximo de atuação será de até 2 (dois)
                  dias úteis, contados a partir da notificação de anomalia ou solicitação de
                  serviço, desde que não haja necessidade de peças especiais ou condições
                  excepcionais que justifiquem prazo superior, hipótese em que a{' '}
                  <strong>CONTRATADA</strong> comunicará o novo prazo ao{' '}
                  <strong>CONTRATANTE</strong>.
                </p>

                {/* Cláusula 4 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 4ª – OBRIGAÇÕES DO CONTRATANTE
                </div>
                <p className="text-justify">
                  4.1 O <strong>CONTRATANTE</strong> obriga-se a:
                </p>
                <ol className="list-decimal pl-6 space-y-1.5 text-justify text-xs sm:text-sm">
                  <li>
                    Permitir o acesso irrestrito da <strong>CONTRATADA</strong> ao local de
                    instalação do sistema fotovoltaico, para fins de monitoramento, inspeção,
                    manutenção e reparo, em dias úteis e horário comercial, mediante agendamento
                    prévio.
                  </li>
                  <li>
                    Fornecer à <strong>CONTRATADA</strong> todas as informações técnicas necessárias
                    à execução dos serviços, incluindo manuais, diagramas elétricos, dados de
                    garantia e histórico de manutenções anteriores.
                  </li>
                  <li>
                    Manter o ambiente da instalação em condições adequadas de segurança e limpeza.
                  </li>
                  <li>Pagar pontualmente os valores devidos na forma da Cláusula 5ª.</li>
                  <li>
                    Disponibilizar um ponto de acesso WiFi de alta qualidade de sinal próximo aos
                    inversores, essencial para garantir o monitoramento remoto contínuo do sistema.
                    O nome da rede (SSID) deve conter apenas letras ou números, sem espaços ou
                    caracteres especiais. O <strong>CONTRATANTE</strong> deverá fornecer login e
                    senha de acesso à <strong>CONTRATADA</strong>.
                  </li>
                  <li>
                    Comunicar imediatamente à <strong>CONTRATADA</strong> qualquer alteração nas
                    condições de funcionamento do sistema ou ocorrência de eventos que possam afetar
                    seu desempenho.
                  </li>
                  <li>
                    Informar as credenciais de acesso aos portais de monitoramento dos inversores.
                  </li>
                  <li>
                    Conceder acesso ao portal da concessionária/cooperativa de energia local para a
                    contratada, a fim desta obter as informações para elaboração dos relatórios
                    mensais.
                  </li>
                </ol>

                {/* Cláusula 5 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 5ª – VALOR E CONDIÇÕES DE PAGAMENTO
                </div>
                <p className="text-justify">
                  5.1. Pelos serviços prestados, a <strong>CONTRATANTE</strong> pagará à{' '}
                  <strong>CONTRATADA</strong> o valor total de{' '}
                  <strong>{formatCurrency(dadosConsolidados.valorTotal)}</strong> (
                  <em>{dadosConsolidados.valorEscritoTotal}</em>), dividido em 12 (doze) parcelas
                  mensais, iguais e sucessivas, no valor unitário de{' '}
                  <strong>{formatCurrency(dadosConsolidados.valorMensal)}</strong> (
                  <em>{dadosConsolidados.valorEscritoMensal}</em>) cada, conforme plano contratado.
                </p>
                <p className="text-justify">
                  5.2 O pagamento será efetuado até o 10º (décimo) dia de cada mês, mediante boleto
                  bancário ou PIX a ser emitido pela <strong>CONTRATADA</strong>.
                </p>
                <p className="text-justify">
                  5.3 Em caso de atraso no pagamento, incidirá multa de 2% (dois por cento) sobre o
                  valor devido, além de juros de mora de 1% (um por cento) ao mês, e atualização
                  monetária pelo índice IGP-M (e, na impossibilidade de sua apuração, pelo IPCA),
                  calculados pro rata die.
                </p>

                {/* Cláusula 6 */}
                <div className="font-bold uppercase text-sm pt-2">CLÁUSULA 6ª – REAJUSTE ANUAL</div>
                <p className="text-justify">
                  6.1 O valor dos serviços será reajustado anualmente, na data de aniversário do
                  contrato, pelo índice IGP-M (ou, na falta deste, pelo IPCA), com base na variação
                  acumulada nos últimos 12 meses.
                </p>
                <p className="text-justify">
                  6.2 Caso o sistema seja ampliado (aumento de módulos, inversores ou potência
                  instalada), a <strong>CONTRATADA</strong> poderá solicitar reajuste proporcional
                  do valor dos serviços, mediante apresentação de documentação técnica comprovando a
                  ampliação. O novo valor entrará em vigor no mês subsequente à aprovação do
                  reajuste pelo <strong>CONTRATANTE</strong>.
                </p>

                {/* Cláusula 7 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 7ª – GARANTIA DOS SERVIÇOS
                </div>
                <p className="text-justify">
                  7.1 A <strong>CONTRATADA</strong> garante o trabalho realizado pelo prazo de 6
                  (seis) meses, contados da data de execução do serviço, excetuando-se defeitos
                  decorrentes de uso inadequado, acidentes, intervenções de terceiros não
                  autorizados ou condições climáticas extremas.
                </p>
                <p className="text-justify">
                  7.2 Os materiais empregados nos serviços serão cobertos pela garantia do
                  respectivo fabricante, não assumindo a <strong>CONTRATADA</strong> qualquer
                  responsabilidade adicional além daquelas previstas na garantia original.
                </p>

                {/* Cláusula 8 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 8ª – CONFIDENCIALIDADE E PROTEÇÃO DE DADOS
                </div>
                <p className="text-justify">
                  8.1 As partes se comprometem a manter sigilo absoluto sobre todas as informações
                  técnicas, comerciais e operacionais a que tiverem acesso em virtude deste
                  contrato, incluindo dados de geração, parâmetros de inversores, dados cadastrais e
                  financeiros do <strong>CONTRATANTE</strong>, durante e após a vigência contratual.
                </p>
                <p className="text-justify">
                  8.2 As partes se obrigam a cumprir integralmente as disposições da Lei nº
                  13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), em especial quanto
                  ao tratamento de dados pessoais eventualmente coletados, armazenados ou
                  processados no âmbito da execução dos serviços, responsabilizando-se cada parte
                  por suas respectivas obrigações como controladora ou operadora de dados.
                </p>

                {/* Cláusula 9 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 9ª – DEFINIÇÃO DE ANOMALIA E PROTOCOLO OPERACIONAL DE DIAGNÓSTICA
                </div>
                <p className="text-justify">
                  9.1 Para os fins deste contrato, considera-se anomalia qualquer falha de
                  equipamento detectada automaticamente pelo sistema de monitoramento (inversor
                  desligado, perda de comunicação, queda abrupta de geração, funcionamento fora dos
                  parâmetros previstos, etc.), bem como qualquer notificação feita pelo{' '}
                  <strong>CONTRATANTE</strong>.
                </p>
                <p className="text-justify">
                  9.2 O protocolo operacional de diagnóstico integrado seguirá as seguintes etapas:
                </p>
                <ol className="list-decimal pl-6 space-y-1.5 text-justify text-xs sm:text-sm">
                  <li>
                    <strong>Detecção:</strong> O sistema de monitoramento detecta a anomalia
                    automaticamente ou mediante comunicação do <strong>CONTRATANTE</strong>.
                  </li>
                  <li>
                    <strong>Solicitação de Informações:</strong> A <strong>CONTRATADA</strong>{' '}
                    solicita ao <strong>CONTRATANTE</strong> o envio de fotos e/ou vídeos do
                    equipamento afetado, bem como informações complementares (histórico de
                    funcionamento, mensagens de erro, comportamento observado) para análise técnica
                    preliminar.
                  </li>
                  <li>
                    <strong>Triagem Remota:</strong> A <strong>CONTRATADA</strong> realiza análise
                    técnica remota com base nas informações, fotos e vídeos fornecidos, buscando
                    identificar a causa provável da anomalia e tentar resolvê-la remotamente através
                    de orientações técnicas, reconfiguração de parâmetros ou outras soluções que não
                    exijam presença física.
                  </li>
                  <li>
                    <strong>Diagnóstico In Loco:</strong> Caso a triagem remota não seja suficiente
                    para resolver a anomalia, a <strong>CONTRATADA</strong> agendará visita técnica
                    in loco. O tempo despendido nesta visita será cobrado conforme a Tabela de
                    Serviços Adicionais (Anexo II), sendo faturado por hora ou fração de hora
                    conforme o item correspondente.
                  </li>
                  <li>
                    <strong>Execução e Faturamento:</strong> Realizado o serviço conforme
                    necessário, a <strong>CONTRATADA</strong> fornecerá relatório de conclusão
                    contendo descrição do serviço realizado, peças utilizadas (se houver), tempo
                    despendido e recomendações. O faturamento seguirá a Tabela de Serviços
                    Adicionais (Anexo II), sendo o valor cobrado conforme o serviço efetivamente
                    prestado.
                  </li>
                </ol>

                {/* Cláusula 10 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 10ª – RESCISÃO CONTRATUAL
                </div>
                <p className="text-justify">
                  10.1 Rescisão por conveniência: Qualquer das partes poderá rescindir o presente
                  contrato, a qualquer tempo, mediante comunicação escrita com aviso prévio de 30
                  (trinta) dias.
                </p>
                <p className="text-justify">
                  10.1.1 Caso a rescisão seja motivada pelo <strong>CONTRATANTE</strong>, este
                  deverá pagar multa equivalente a 50% (cinquenta por cento) dos valores mensais
                  remanescentes até o final do período contratado. Todos os valores em aberto
                  (mensalidades vencidas, serviços adicionais realizados e multa rescisória) deverão
                  ser quitados integralmente no prazo de 10 (dez) dias após a data de rescisão.
                </p>
                <p className="text-justify">
                  10.2 Rescisão por inadimplemento: A <strong>CONTRATADA</strong> poderá rescindir o
                  contrato independentemente de aviso prévio, no caso de atraso no pagamento
                  superior a 30 (trinta) dias. Nesta hipótese, o <strong>CONTRATANTE</strong>{' '}
                  permanecerá obrigado ao pagamento das mensalidades vencidas e dos serviços
                  adicionais eventualmente prestados.
                </p>

                {/* Cláusula 11 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 11ª – FORÇA MAIOR E SEGURO
                </div>
                <p className="text-justify">
                  11.1 Nenhuma das partes será responsável por perdas ou atrasos no cumprimento de
                  suas obrigações decorrentes de eventos de força maior ou caso fortuito, assim
                  entendidos aqueles imprevisíveis ou, se previsíveis, inevitáveis, tais como
                  guerras, greves, catástrofes naturais, tempestades com granizo, queda de raios,
                  incêndios de grandes proporções, interrupções no fornecimento de energia elétrica
                  pela concessionária, atos de autoridades públicas que impeçam a execução dos
                  serviços, e outros eventos equivalentes, desde que devidamente comprovados.
                </p>
                <p className="text-justify">
                  11.2 O <strong>CONTRATANTE</strong> declara-se ciente da necessidade de manter
                  seguro patrimonial adequado que cubra os riscos mencionados, bem como seguro de
                  responsabilidade civil para danos a terceiros eventualmente causados pelo sistema.
                  A <strong>CONTRATADA</strong> recomenda fortemente que o{' '}
                  <strong>CONTRATANTE</strong> contrate seguro específico para a instalação
                  fotovoltaica, com cobertura abrangente para eventos climáticos (granizo,
                  tempestades, raios), furto e roubo, de modo a proteger adequadamente seu
                  investimento e garantir a continuidade operacional do sistema em caso de sinistro.
                </p>

                {/* Cláusula 12 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 12ª – RESPONSABILIDADE CIVIL
                </div>
                <p className="text-justify">
                  12.1 A <strong>CONTRATADA</strong> responderá exclusivamente por danos diretos
                  comprovadamente causados ao <strong>CONTRATANTE</strong> em decorrência de
                  negligência grave na execução dos serviços objeto deste contrato, desde que o{' '}
                  <strong>CONTRATANTE</strong> tenha cumprido integralmente suas obrigações
                  contratuais.
                </p>
                <p className="text-justify">
                  12.2 Ficam expressamente excluídos da responsabilidade da{' '}
                  <strong>CONTRATADA</strong>:
                </p>
                <ol className="list-decimal pl-6 space-y-1 text-justify text-xs">
                  <li>
                    Danos indiretos, lucros cessantes, perda de receita de energia, danos morais ou
                    qualquer outro dano não-material;
                  </li>
                  <li>Força maior ou caso fortuito, conforme definido na Cláusula 11ª;</li>
                  <li>
                    Negligência, imperícia ou imprudência do <strong>CONTRATANTE</strong> ou de
                    terceiros (incluindo, mas não se limitando a, outras empresas de manutenção,
                    instaladores, concessionárias ou prestadores de serviços);
                  </li>
                  <li>
                    Desgaste natural, uso inadequado, adulteração, modificação não autorizada ou
                    falta de manutenção do sistema pelo <strong>CONTRATANTE</strong>;
                  </li>
                  <li>
                    Eventos climáticos extremos, condições ambientais fora dos parâmetros normais de
                    operação, ou falhas de equipamentos de fabricação de terceiros;
                  </li>
                  <li>
                    Qualquer dano decorrente do não cumprimento das obrigações do{' '}
                    <strong>CONTRATANTE</strong> (incluindo, mas não se limitando a, falta de WiFi
                    adequado, falta de acesso ao local, falta de informações técnicas);
                  </li>
                  <li>
                    Danos causados por falta de seguro patrimonial ou de responsabilidade civil do{' '}
                    <strong>CONTRATANTE</strong>.
                  </li>
                </ol>
                <p className="text-justify">
                  12.3 Os serviços prestados são de natureza preventiva e de monitoramento, não
                  sendo a <strong>CONTRATADA</strong> responsável por falhas de equipamentos de
                  terceiros (fabricantes de módulos, inversores, string boxes, etc.), cuja
                  responsabilidade permanece exclusivamente com os respectivos fabricantes e suas
                  garantias.
                </p>

                {/* Cláusula 13 */}
                <div className="font-bold uppercase text-sm pt-2">CLÁUSULA 13ª – FORO</div>
                <p className="text-justify">
                  As partes elegem o foro da Comarca de <strong>Erechim/RS</strong> como o único
                  competente para dirimir quaisquer controvérsias oriundas do presente contrato, com
                  renúncia expressa a qualquer outro, por mais privilegiado que seja.
                </p>

                <p className="text-justify pt-2">
                  E, por estarem justas e contratadas, as partes assinam o presente instrumento em 2
                  (duas) vias de igual teor e forma, na presença das testemunhas abaixo.
                </p>

                {/* Assinaturas */}
                <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
                  <div className="space-y-1">
                    <div className="border-t border-gray-900 w-full mb-2" />
                    <div className="font-bold text-xs sm:text-sm">
                      {dadosConsolidados.nomeRazaoSocial}
                    </div>
                    <div className="text-xs text-gray-700">
                      CPF/CNPJ: {dadosConsolidados.cpfCnpj}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 uppercase">
                      CONTRATANTE
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="border-t border-gray-900 w-full mb-2" />
                    <div className="font-bold text-xs sm:text-sm">DELFOS ENGENHARIA LTDA.</div>
                    <div className="text-xs text-gray-700">CNPJ: 21.379.952/0001-38</div>
                    <div className="text-[11px] font-semibold text-gray-500 uppercase">
                      CONTRATADA
                    </div>
                  </div>
                </div>

                <div className="pt-4 text-left text-xs sm:text-sm">
                  {dadosConsolidados.cidadeAssinatura}/RS, {dadosConsolidados.dataPorExtenso}.
                </div>

                {/* ========================================================= */}
                {/* ANEXO I — RENDERIZA APENAS O PLANO SELECIONADO            */}
                {/* ========================================================= */}
                <div className="border-t-2 border-dashed border-gray-300 pt-8 mt-10 space-y-4">
                  <div className="text-center">
                    <h3 className="font-bold text-sm sm:text-base text-emerald-800 uppercase tracking-wide">
                      {anexoIConteudo.titulo}
                    </h3>
                    <p className="text-xs text-gray-600 font-semibold mt-1">
                      {anexoIConteudo.subtitulo}
                    </p>
                  </div>

                  <ol className="list-decimal pl-6 space-y-2 text-xs sm:text-sm text-justify">
                    {anexoIConteudo.itens.map((it) => (
                      <li key={it.numero}>
                        <strong>{it.titulo}</strong> — {it.descricao}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* ========================================================= */}
                {/* ANEXO II — TABELA DE SERVIÇOS ADICIONAIS                  */}
                {/* ========================================================= */}
                <div className="border-t-2 border-dashed border-gray-300 pt-8 mt-10 space-y-4">
                  <div className="text-center">
                    <h3 className="font-bold text-sm sm:text-base text-emerald-800 uppercase tracking-wide">
                      ANEXO II – TABELA INTEGRADA DE SERVIÇOS ADICIONAIS
                    </h3>
                  </div>

                  <p className="text-xs text-gray-700 text-justify">
                    Os serviços abaixo serão cobrados adicionalmente ao valor do plano contratado,
                    mediante solicitação expressa do <strong>CONTRATANTE</strong> e aprovação do
                    respectivo orçamento. Os valores unitários serão reajustados anualmente pelo
                    mesmo índice previsto na Cláusula 6ª do contrato principal (IGP-M ou IPCA).
                  </p>

                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-[11px] border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100 text-gray-900 font-bold">
                          <th className="border border-gray-300 p-2 text-center w-10">Item</th>
                          <th className="border border-gray-300 p-2 text-left w-36">Serviço</th>
                          <th className="border border-gray-300 p-2 text-left">
                            Descrição Detalhada
                          </th>
                          <th className="border border-gray-300 p-2 text-right w-24">Valor (R$)</th>
                          <th className="border border-gray-300 p-2 text-center w-24">
                            Hora Adic.
                          </th>
                          <th className="border border-gray-300 p-2 text-left w-32">Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anexoIIServicos.map((s) => (
                          <tr key={s.item} className="hover:bg-gray-50/70">
                            <td className="border border-gray-300 p-2 text-center font-bold text-gray-800">
                              {s.item}
                            </td>
                            <td className="border border-gray-300 p-2 font-semibold text-gray-900">
                              {s.servico}
                            </td>
                            <td className="border border-gray-300 p-2 text-gray-700 leading-snug">
                              {s.descricao}
                            </td>
                            <td className="border border-gray-300 p-2 text-right font-bold text-emerald-700">
                              {s.valor}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-gray-800">
                              {s.horaAdicional}
                            </td>
                            <td className="border border-gray-300 p-2 text-[10px] text-gray-500">
                              {s.observacoes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Dica de integração com WhatsApp */}
            <div className="p-3 bg-gray-100 rounded-xl text-[11px] text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                O download e o envio WhatsApp utilizam o mesmo gerador oficial de PDF
                (@react-pdf/renderer).
              </span>
              <button
                type="button"
                onClick={() => abrirContratoImpressao(dadosConsolidados, false)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1 text-[11px]"
              >
                <ExternalLink className="w-3 h-3" />
                Abrir versão HTML
              </button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* ========================================================================= */}
      {/* SUBMODAL: CONFERÊNCIA DE TELEFONE E MENSAGEM ANTES DO DISPARO WHATSAPP    */}
      {/* ========================================================================= */}
      <Dialog
        open={modalConferenciaWhatsAppOpen}
        onOpenChange={(v) => {
          if (!isSendingWhatsApp) setModalConferenciaWhatsAppOpen(v)
        }}
      >
        <DialogContent className="max-w-md p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Send className="w-4 h-4 text-emerald-600" />
              Enviar Contrato O&M via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              O contrato gerado em PDF com o layout oficial Delfos será anexado como documento junto
              à mensagem abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div>
              <Label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1 mb-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Número de Destino (WhatsApp)
              </Label>
              <Input
                value={whatsappTelefoneEditado}
                onChange={(e) => setWhatsappTelefoneEditado(formatWhatsAppPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className="h-9 text-xs font-mono font-medium"
                disabled={isSendingWhatsApp}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Confira o DDD e número antes de disparar via Z-API.
              </p>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-gray-700 mb-1 block">
                Mensagem / Legenda do Documento
              </Label>
              <textarea
                value={whatsappMensagemEditada}
                onChange={(e) => setWhatsappMensagemEditada(e.target.value)}
                rows={5}
                className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                placeholder="Escreva a mensagem..."
                disabled={isSendingWhatsApp}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Prefixo institucional padrão Delfos Solar é anexado automaticamente.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <strong>Anexo garantido:</strong> O PDF é gerado pelo mesmo motor oficial
                (@react-pdf/renderer) e enviado em base64 direto na conversa.
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalConferenciaWhatsAppOpen(false)}
              disabled={isSendingWhatsApp}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarEnvioWhatsApp}
              disabled={isSendingWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
            >
              {isSendingWhatsApp ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isSendingWhatsApp ? 'Enviando PDF...' : 'Confirmar e Enviar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

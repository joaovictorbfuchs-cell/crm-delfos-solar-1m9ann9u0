import React, { useState } from 'react'
import {
  X,
  UserPlus,
  AlertCircle,
  Loader2,
  Sparkles,
  UploadCloud,
  Zap,
  Building2,
  Landmark,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import type { Cliente } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { OrigemLeadTipo, ProdutoTipo, TipoVendaSelect } from '@/types/crm'
import { TIPOS_VENDA_OPTIONS, TIPOS_VENDA_CONFIG } from '@/constants/tipoVenda'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { useCnpjLookup } from '@/hooks/useCnpjLookup'
import {
  CnpjInputWithLookup,
  CnpjConflictBanner,
  CnpjConflictField,
} from '@/components/CnpjInputWithLookup'
import { CnpjDataNormalized } from '@/services/cnpjLookupService'
import {
  SecoesCadastroNovoCliente,
  DadosCadastroNovoCliente,
  DADOS_NOVO_CLIENTE_INICIAIS,
} from './SecoesCadastroNovoCliente'
import { createNegocio } from '@/services/negociosService'
import { removerPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import {
  ModalImportarContaRGE,
  type DadosImportadosContaRGE,
} from '@/components/ModalImportarContaRGE'
import {
  normalizarEOordenarHistorico,
  calcularMetricasHistorico,
} from '@/lib/historicoConsumoFatura'
import { ModalAvisoDuplicidadeTelefone } from '@/components/ModalAvisoDuplicidadeTelefone'
import {
  detectarDuplicidadeTelefone,
  executarMesclagemDuplicado,
  type ContatoCorrespondente,
} from '@/services/duplicidadeContatoService'

interface NovoLeadModalProps {
  isOpen: boolean
  onClose: () => void
}

const ORIGENS: OrigemLeadTipo[] = ['Facebook', 'Instagram', 'Indicação', 'Site', 'Outro']

export const NovoLeadModal: React.FC<NovoLeadModalProps> = ({ isOpen, onClose }) => {
  const { addCliente, clientes, refreshData } = useClientes()
  const { user } = useAuth()
  const { toast } = useToast()

  // Modo de seleção: cadastrar novo cliente/lead ou vincular a cliente existente
  const [modoCliente, setModoCliente] = useState<'novo' | 'existente'>('novo')
  const [clienteExistenteId, setClienteExistenteId] = useState<string>('')
  const [clienteExistenteSelecionado, setClienteExistenteSelecionado] = useState<Cliente | null>(
    null,
  )

  const [cnpj, setCnpj] = useState('')
  const [nome, setNome] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [estado, setEstado] = useState('RS')
  const [cep, setCep] = useState('')
  const [cnaePrincipal, setCnaePrincipal] = useState('')
  const [situacaoCadastral, setSituacaoCadastral] = useState('')
  const [dataAbertura, setDataAbertura] = useState('')
  const [consumoKwhMes, setConsumoKwhMes] = useState<string>('')
  const [tipoVenda, setTipoVenda] = useState<TipoVendaSelect>('Energia Solar')
  const [origem, setOrigem] = useState<OrigemLeadTipo>('Indicação')
  const [produto, setProduto] = useState<ProdutoTipo>('Energia Solar')
  const [cidade, setCidade] = useState('Erechim/RS')
  const [valorEstimadoExistente, setValorEstimadoExistente] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [conflitosCnpj, setConflitosCnpj] = useState<CnpjConflictField[]>([])
  const [pendenteDadosReceita, setPendenteDadosReceita] = useState<CnpjDataNormalized | null>(null)
  const [modalImportarContaOpen, setModalImportarContaOpen] = useState(false)
  const [dadosNovoCliente, setDadosNovoCliente] = useState<DadosCadastroNovoCliente>(
    DADOS_NOVO_CLIENTE_INICIAIS,
  )
  const [dadosFaturaArmazenados, setDadosFaturaArmazenados] =
    useState<DadosImportadosContaRGE | null>(null)

  // Estados para detecção e aviso de duplicidade de Telefone/WhatsApp
  const [duplicadosEncontrados, setDuplicadosEncontrados] = useState<ContatoCorrespondente[]>([])
  const [modalDuplicidadeAberto, setModalDuplicidadeAberto] = useState(false)
  const [isMesclando, setIsMesclando] = useState(false)

  const {
    status: cnpjStatus,
    errorMessage: cnpjErrorMessage,
    isLoading: isCnpjLoading,
    lookup: lookupCnpj,
    reset: resetCnpjLookup,
  } = useCnpjLookup()

  if (!isOpen) return null

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    if (modoCliente === 'existente') {
      if (!clienteExistenteId) {
        newErrors.clienteExistente = 'Selecione um cliente existente para vincular o negócio'
      }
    } else {
      if (!nome.trim()) {
        newErrors.nome = 'Informe o nome do lead'
      }
      if (!telefone.trim() && !whatsapp.trim()) {
        newErrors.telefone = 'Informe o telefone ou WhatsApp de contato'
      }
      if (!origem) {
        newErrors.origem = 'Selecione a origem do lead'
      }
    }
    if (consumoKwhMes && (isNaN(Number(consumoKwhMes)) || Number(consumoKwhMes) < 0)) {
      newErrors.consumo = 'Consumo deve ser um número positivo'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setModoCliente('novo')
    setClienteExistenteId('')
    setClienteExistenteSelecionado(null)
    setCnpj('')
    setNome('')
    setRazaoSocial('')
    setNomeFantasia('')
    setTelefone('')
    setWhatsapp('')
    setEmail('')
    setEndereco('')
    setNumero('')
    setComplemento('')
    setBairro('')
    setEstado('RS')
    setCep('')
    setCnaePrincipal('')
    setSituacaoCadastral('')
    setDataAbertura('')
    setConsumoKwhMes('')
    setTipoVenda('Energia Solar')
    setOrigem('Indicação')
    setProduto('Energia Solar')
    setCidade('Erechim/RS')
    setDadosNovoCliente(DADOS_NOVO_CLIENTE_INICIAIS)
    setErrors({})
    setConflitosCnpj([])
    setPendenteDadosReceita(null)
    setDadosFaturaArmazenados(null)
    setDuplicadosEncontrados([])
    setModalDuplicidadeAberto(false)
    resetCnpjLookup()
  }

  const handleSelectClienteExistente = (id: string, cli?: Cliente) => {
    setClienteExistenteId(id)
    setClienteExistenteSelecionado(cli || null)
    if (errors.clienteExistente) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.clienteExistente
        return next
      })
    }
  }

  const handleAplicarDadosConta = (dados: DadosImportadosContaRGE) => {
    setDadosFaturaArmazenados(dados)
    setModoCliente('novo')

    // Preenche automaticamente os campos do cadastro do lead
    if (dados.nome) {
      setNome(dados.nome)
    }
    if (dados.razao_social) {
      setRazaoSocial(dados.razao_social)
    }
    if (dados.cnpj) {
      setCnpj(dados.cnpj)
    } else if (dados.cpf_cnpj) {
      setCnpj(dados.cpf_cnpj)
    }

    if (dados.endereco) setEndereco(dados.endereco)
    if (dados.numero) setNumero(dados.numero)
    if (dados.complemento) setComplemento(dados.complemento)
    if (dados.bairro) setBairro(dados.bairro)
    if (dados.cidade) setCidade(dados.cidade)
    if (dados.estado) setEstado(dados.estado)
    if (dados.cep) setCep(dados.cep)

    if (dados.consumo_kwh_mes !== undefined && dados.consumo_kwh_mes !== null) {
      setConsumoKwhMes(String(Math.round(dados.consumo_kwh_mes)))
    }
  }

  const aplicarDadosReceita = (d: CnpjDataNormalized, sobrescrever = true) => {
    const nomePrincipal = d.nome_fantasia || d.razao_social
    if (sobrescrever || !nome) setNome(nomePrincipal || nome)
    if (sobrescrever || !razaoSocial) setRazaoSocial(d.razao_social || razaoSocial)
    if (sobrescrever || !nomeFantasia) setNomeFantasia(d.nome_fantasia || nomeFantasia)
    if (sobrescrever || !cidade) {
      setCidade(d.municipio ? `${d.municipio}/${d.uf}` : cidade)
    }
    if (sobrescrever || !estado) setEstado(d.uf || estado)
    if (sobrescrever || !endereco) setEndereco(d.logradouro || endereco)
    if (sobrescrever || !numero) setNumero(d.numero || numero)
    if (sobrescrever || !complemento) setComplemento(d.complemento || complemento)
    if (sobrescrever || !bairro) setBairro(d.bairro || bairro)
    if (sobrescrever || !cep) setCep(d.cep || cep)
    if (d.telefone && (sobrescrever || !telefone)) {
      setTelefone(d.telefone)
      if (!whatsapp || sobrescrever) setWhatsapp(d.telefone)
    }
    if (d.email && (sobrescrever || !email)) setEmail(d.email)
    if (d.cnae_principal && (sobrescrever || !cnaePrincipal)) setCnaePrincipal(d.cnae_principal)
    if (d.situacao_cadastral && (sobrescrever || !situacaoCadastral))
      setSituacaoCadastral(d.situacao_cadastral)
    if (d.data_abertura && (sobrescrever || !dataAbertura)) setDataAbertura(d.data_abertura)

    toast({
      title: 'Dados preenchidos pela Receita Federal!',
      description: `${d.razao_social || nomePrincipal} localizado com sucesso.`,
    })
    setConflitosCnpj([])
    setPendenteDadosReceita(null)
  }

  const handleCnpjBlur = async () => {
    try {
      const raw = cnpj.replace(/\D/g, '')
      if (raw.length !== 14) return

      const result = await lookupCnpj(raw)
      if (!result) return

      const conflitos: CnpjConflictField[] = []
      const nomePrincipal = result.nome_fantasia || result.razao_social

      if (nome.trim() && nome.trim().toLowerCase() !== nomePrincipal.toLowerCase()) {
        conflitos.push({
          campo: 'nome',
          label: 'Nome do Lead',
          valorAtual: nome,
          valorReceita: nomePrincipal,
        })
      }
      if (
        telefone.trim() &&
        result.telefone &&
        telefone.replace(/\D/g, '') !== result.telefone.replace(/\D/g, '')
      ) {
        conflitos.push({
          campo: 'telefone',
          label: 'Telefone',
          valorAtual: telefone,
          valorReceita: result.telefone,
        })
      }
      const cidadeFormatada = result.municipio ? `${result.municipio}/${result.uf}` : ''
      if (
        cidade.trim() &&
        cidadeFormatada &&
        cidade.trim().toLowerCase() !== cidadeFormatada.toLowerCase()
      ) {
        conflitos.push({
          campo: 'cidade',
          label: 'Cidade',
          valorAtual: cidade,
          valorReceita: cidadeFormatada,
        })
      }

      if (conflitos.length > 0) {
        setConflitosCnpj(conflitos)
        setPendenteDadosReceita(result)
        aplicarDadosReceita(result, false)
      } else {
        aplicarDadosReceita(result, true)
      }
    } catch (err: unknown) {
      // Degradação graciosa: falha na consulta de CNPJ nunca quebra o formulário
      console.warn(
        '[NovoLeadModal] Não foi possível consultar CNPJ no blur (fluxo manual mantido):',
        err,
      )
    }
  }

  const handleClose = () => {
    if (isSubmitting || isMesclando) return
    resetForm()
    onClose()
  }

  const montarPayloadLead = () => {
    // Integra campos preenchidos pelas 3 seções completas de Novo Cliente
    const nomeFinal = (dadosNovoCliente.nome || nome).trim()
    const razaoSocialFinal = (dadosNovoCliente.razao_social || razaoSocial || nomeFinal).trim()
    const nomeFantasiaFinal = (dadosNovoCliente.nome_fantasia || nomeFantasia).trim()
    const docFinal = (dadosNovoCliente.cnpj_cpf || cnpj).trim()
    const docLimpo = docFinal.replace(/\D/g, '')
    const isCnpj = docLimpo.length === 14
    const isCpf = docLimpo.length === 11

    const telFinal = (
      dadosNovoCliente.telefone ||
      telefone ||
      dadosNovoCliente.whatsapp ||
      whatsapp
    ).trim()
    const whatsFinal = (
      dadosNovoCliente.whatsapp ||
      whatsapp ||
      dadosNovoCliente.telefone ||
      telefone
    ).trim()
    const emailFinal = (dadosNovoCliente.email || email).trim().toLowerCase()

    const enderecoFinal = (dadosNovoCliente.endereco || endereco).trim()
    const numeroFinal = (dadosNovoCliente.numero || numero).trim()
    const complementoFinal = (dadosNovoCliente.complemento || complemento).trim()
    const bairroFinal = (dadosNovoCliente.bairro || bairro).trim()
    const estadoFinal = (dadosNovoCliente.estado || estado || 'RS').trim().toUpperCase()
    const cepFinal = (dadosNovoCliente.cep || cep).trim()
    const cidadeBase = (dadosNovoCliente.cidade || cidade).trim() || 'Erechim'
    const cidadeComUf =
      cidadeBase.includes('/') || !estadoFinal ? cidadeBase : `${cidadeBase}/${estadoFinal}`

    const consumoNum = dadosNovoCliente.consumo_kwh_mes
      ? Number(dadosNovoCliente.consumo_kwh_mes)
      : consumoKwhMes
        ? Number(consumoKwhMes)
        : 0
    const potenciaEstimada = dadosNovoCliente.potencia_kwp
      ? Number(dadosNovoCliente.potencia_kwp)
      : consumoNum > 0
        ? Number((consumoNum / 120).toFixed(1))
        : 0
    const valorEstimado = potenciaEstimada > 0 ? Math.round(potenciaEstimada * 3500) : 0

    // Mapear tipoVenda para um valor válido do enum aceito no campo select `produto` da coleção clientes:
    let produtoEnum: ProdutoTipo = 'Energia Solar'
    if (tipoVenda === 'O&M (Operação e Manutenção)') {
      produtoEnum = 'Plano de O&M'
    } else if (tipoVenda === 'Carregadores Veículos Elétricos') {
      produtoEnum = 'Carregadores veiculares'
    } else if (tipoVenda === 'Baterias') {
      produtoEnum = 'Sistemas Híbridos'
    } else if (tipoVenda === 'Energia Solar') {
      produtoEnum = 'Energia Solar'
    } else {
      produtoEnum = 'Energia Solar'
    }

    const payloadNovoCliente: Record<string, unknown> = {
      nome: nomeFinal,
      razao_social: razaoSocialFinal || undefined,
      nome_fantasia: nomeFantasiaFinal || undefined,
      cnpj: isCnpj ? docFinal : undefined,
      cpf: isCpf ? docFinal : undefined,
      rg: (dadosNovoCliente.rg || '').trim() || undefined,
      inscricao_estadual:
        (dadosNovoCliente.inscricao_estadual || dadosNovoCliente.rg_ie || '').trim() || undefined,
      telefone: telFinal,
      whatsapp: whatsFinal,
      email: emailFinal || undefined,
      endereco: enderecoFinal || undefined,
      numero: numeroFinal || undefined,
      complemento: complementoFinal || undefined,
      bairro: bairroFinal || undefined,
      estado: estadoFinal || undefined,
      cep: cepFinal || undefined,
      concessionaria: (dadosNovoCliente.concessionaria || 'RGE').trim() || 'RGE',
      uc: (dadosNovoCliente.uc || '').trim() || undefined,
      tipo_fornecimento: dadosNovoCliente.tipo_fornecimento || 'trifásico',
      cnae_principal: cnaePrincipal.trim() || undefined,
      situacao_cadastral: situacaoCadastral.trim() || undefined,
      data_nascimento_fundacao: dataAbertura.trim() || undefined,
      tipo_cliente: isCnpj ? 'comercial' : 'residencial',
      consumo_kwh_mes: consumoNum,
      origem_lead: origem,
      produto: produtoEnum,
      tipo_venda: tipoVenda,
      status: 'Novo Lead',
      cidade: cidadeComUf,
      potencia_kwp: potenciaEstimada,
      valor_estimado: valorEstimado,
    }

    if (dadosFaturaArmazenados) {
      if (dadosFaturaArmazenados.uc) {
        payloadNovoCliente.uc = dadosFaturaArmazenados.uc
      }
      if (dadosFaturaArmazenados.cpf) {
        payloadNovoCliente.cpf = dadosFaturaArmazenados.cpf
      }
      if (dadosFaturaArmazenados.classificacao_grupo_subgrupo) {
        payloadNovoCliente.grupo_subgrupo = dadosFaturaArmazenados.classificacao_grupo_subgrupo
      }
      if (dadosFaturaArmazenados.tipo_fornecimento) {
        payloadNovoCliente.tipo_fornecimento = dadosFaturaArmazenados.tipo_fornecimento
      }
      if (dadosFaturaArmazenados.tensao_nominal) {
        payloadNovoCliente.tensao_nominal = dadosFaturaArmazenados.tensao_nominal
      }
      if (dadosFaturaArmazenados.historico_consumo_fatura) {
        const histTratado = normalizarEOordenarHistorico(
          dadosFaturaArmazenados.historico_consumo_fatura,
        )
        payloadNovoCliente.historico_consumo_fatura = histTratado

        const metricas = calcularMetricasHistorico(histTratado)
        if (metricas.quantidade_meses_historico > 0) {
          payloadNovoCliente.consumo_medio =
            dadosFaturaArmazenados.consumo_medio ?? metricas.media_mensal_consumo_kwh
          payloadNovoCliente.consumo_anual_kwh =
            dadosFaturaArmazenados.consumo_anual_kwh ?? metricas.somatorio_consumo_anual_kwh
          payloadNovoCliente.consumo_medio_diario_kwh = metricas.consumo_medio_diario_kwh
        }
      }
      if (
        payloadNovoCliente.consumo_medio === undefined &&
        dadosFaturaArmazenados.consumo_medio !== undefined
      ) {
        payloadNovoCliente.consumo_medio = dadosFaturaArmazenados.consumo_medio
      }
      if (
        payloadNovoCliente.consumo_anual_kwh === undefined &&
        dadosFaturaArmazenados.consumo_anual_kwh !== undefined
      ) {
        payloadNovoCliente.consumo_anual_kwh = dadosFaturaArmazenados.consumo_anual_kwh
      }
      if (dadosFaturaArmazenados.tarifa !== undefined) {
        payloadNovoCliente.tarifa = dadosFaturaArmazenados.tarifa
      }
    }

    return payloadNovoCliente
  }

  const executarPersistenciaLead = async (ignorarDuplicidade = false) => {
    // Caso 1: Negócio para Cliente Existente
    if (modoCliente === 'existente') {
      const cliRef =
        clienteExistenteSelecionado || clientes.find((c) => c.id === clienteExistenteId)
      if (!cliRef) {
        toast({
          variant: 'destructive',
          title: 'Cliente não encontrado',
          description: 'Selecione um cliente válido da lista.',
        })
        return
      }

      try {
        setIsSubmitting(true)
        const consumoNum = consumoKwhMes
          ? Number(consumoKwhMes)
          : Number(cliRef.consumo_kwh_mes || 0)
        const potenciaEstimada =
          consumoNum > 0 ? Number((consumoNum / 120).toFixed(1)) : Number(cliRef.potencia_kwp || 0)
        const valorEstimado =
          potenciaEstimada > 0
            ? Math.round(potenciaEstimada * 3500)
            : Number(cliRef.valor_estimado || 0)

        const nomeClean = removerPrefixoMensagemManual(cliRef.nome.trim())
        await createNegocio({
          cliente_id: cliRef.id,
          titulo: `Negócio - ${nomeClean}`,
          tipo_negocio:
            tipoVenda === 'O&M (Operação e Manutenção)'
              ? 'renovação'
              : tipoVenda === 'Carregadores Veículos Elétricos'
                ? 'serviço'
                : tipoVenda === 'Baterias'
                  ? 'bateria'
                  : 'venda usina',
          tipo_venda: tipoVenda,
          etapa_funil: 'novo lead',
          status: 'em andamento',
          valor_estimado: valorEstimado,
          probabilidade: 10,
          consultor_responsavel:
            user?.id && user.id.trim() ? user.id.trim() : cliRef.responsavel_id || undefined,
        })

        toast({
          title: 'Negócio criado com sucesso!',
          description: `Novo negócio para "${nomeClean}" adicionado à coluna "Novo Lead".`,
        })

        if (refreshData) {
          await refreshData()
        }

        handleClose()
      } catch (err: unknown) {
        console.error('Erro ao criar negócio para cliente existente:', err)
        toast({
          variant: 'destructive',
          title: 'Erro ao criar negócio',
          description: err instanceof Error ? err.message : 'Tente novamente.',
        })
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Caso 2: Novo Cliente / Lead
    if (!ignorarDuplicidade && (telefone.trim() || whatsapp.trim())) {
      const duplicados = await detectarDuplicidadeTelefone({
        telefone: telefone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        ignorarOrigem: 'cliente',
        clientesPrecarregados: clientes,
      })

      if (duplicados.length > 0) {
        setDuplicadosEncontrados(duplicados)
        setModalDuplicidadeAberto(true)
        return
      }
    }

    try {
      setIsSubmitting(true)
      const payloadNovoCliente = montarPayloadLead()
      const clienteCriado = await addCliente(payloadNovoCliente as any)

      // Registra também o Negócio correspondente na coleção `negocios` (100% aditivo)
      try {
        const nomeClean = removerPrefixoMensagemManual(nome.trim())
        await createNegocio({
          cliente_id: clienteCriado.id,
          titulo: `Negócio - ${nomeClean}`,
          tipo_negocio:
            tipoVenda === 'O&M (Operação e Manutenção)'
              ? 'renovação'
              : tipoVenda === 'Carregadores Veículos Elétricos'
                ? 'serviço'
                : tipoVenda === 'Baterias'
                  ? 'bateria'
                  : 'venda usina',
          tipo_venda: tipoVenda,
          etapa_funil: 'novo lead',
          status: 'em andamento',
          valor_estimado: Number(payloadNovoCliente.valor_estimado || 0),
          probabilidade: 10,
          consultor_responsavel: user?.id && user.id.trim() ? user.id.trim() : undefined,
        })
      } catch (errNegocio) {
        console.warn(
          'Aviso: cliente criado mas falhou ao criar registro inicial em negocios:',
          errNegocio,
        )
      }

      toast({
        title: 'Lead e Negócio cadastrados com sucesso!',
        description: `${nome.trim()} adicionado à coluna "Novo Lead" do funil.`,
      })

      handleClose()
    } catch (err: unknown) {
      console.error('Erro ao cadastrar lead:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar lead',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await executarPersistenciaLead(false)
  }

  const handleConfirmarMesclagem = async (destino: ContatoCorrespondente) => {
    setIsMesclando(true)
    try {
      const payloadNovoCliente = montarPayloadLead()
      await executarMesclagemDuplicado({
        registroDestino: destino,
        dadosNovos: payloadNovoCliente,
      })

      toast({
        title: 'Lead mesclado com sucesso!',
        description: `Informações consolidadas no registro existente "${destino.nome}".`,
      })

      setModalDuplicidadeAberto(false)
      handleClose()
      if (refreshData) {
        await refreshData()
      }
    } catch (err) {
      console.error('Erro ao mesclar lead:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao mesclar',
        description: 'Não foi possível mesclar com o registro existente.',
      })
    } finally {
      setIsMesclando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Card ampliado (max-w-4xl / max-w-5xl em desktop, max-h-[90vh], scroll interno, header e footer fixos) */}
      <div className="relative z-50 w-full max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Fixo */}
        <div className="px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shadow-xs">
              <UserPlus className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">+ Novo Negócio</h2>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Etapa 1 - Novo Lead
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Cadastre uma nova oportunidade no funil comercial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form com Scroll Interno e Footer Fixo */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Corpo com Scroll Interno */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* SEÇÃO 1: VINCULAÇÃO E IMPORTAÇÃO RÁPIDA (GRID 2 COLUNAS NO DESKTOP) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card 1: Modo de Seleção (Novo Lead vs Cliente Existente) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Vincular Oportunidade a:
                  </span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setModoCliente('novo')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        modoCliente === 'novo'
                          ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Novo cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoCliente('existente')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        modoCliente === 'existente'
                          ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cliente existente
                    </button>
                  </div>
                </div>

                {modoCliente === 'existente' ? (
                  <div className="space-y-2 pt-1">
                    <ClienteAutocomplete
                      clientes={clientes}
                      value={clienteExistenteId}
                      onChange={handleSelectClienteExistente}
                      placeholder="Buscar cliente existente por nome, telefone, cidade ou documento..."
                    />
                    {errors.clienteExistente && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {errors.clienteExistente}
                      </p>
                    )}
                    {clienteExistenteSelecionado && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{clienteExistenteSelecionado.nome}</p>
                          <p className="text-[11px] text-emerald-700">
                            {clienteExistenteSelecionado.telefone ||
                              clienteExistenteSelecionado.whatsapp ||
                              'Sem telefone'}
                            {clienteExistenteSelecionado.cidade
                              ? ` • ${clienteExistenteSelecionado.cidade}`
                              : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full">
                          Vinculado
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Card 2: Importação de Fatura de Energia (quadro verde com botão de upload minimalista) */}
              <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/30 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setModalImportarContaOpen(true)}
                  className="w-full h-full min-h-[72px] flex items-center justify-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-xs hover:shadow transition-all font-semibold text-xs cursor-pointer active:scale-[0.99]"
                >
                  <UploadCloud className="w-5 h-5 shrink-0" />
                  <span>Anexar conta de energia</span>
                  {dadosFaturaArmazenados?.uc && (
                    <span className="ml-1 text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      UC {dadosFaturaArmazenados.uc}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* SEÇÃO 2: TIPO DE PRODUTO / OPORTUNIDADE (GRID COM OS 5 CARDS) */}
            <div className="p-4 bg-slate-50/80 rounded-xl border-2 border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    Tipo de Oportunidade / Venda{' '}
                    <span className="text-emerald-600 font-extrabold">* (Escolha primeiro)</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Selecione a categoria comercial para definir o ícone e a cor do card no funil:
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Etapa inicial obrigatória
                </span>
              </div>

              {/* Grid responsivo dos 5 cards de produtos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {TIPOS_VENDA_OPTIONS.map((opcao) => {
                  const cfg = TIPOS_VENDA_CONFIG[opcao]
                  const IconComponent = cfg.icon
                  const isSelected = tipoVenda === opcao

                  return (
                    <button
                      key={opcao}
                      type="button"
                      onClick={() => {
                        setTipoVenda(opcao)
                        // Alinha produto secundário com a seleção
                        if (opcao === 'O&M (Operação e Manutenção)') {
                          setProduto('Plano de O&M')
                        } else if (opcao === 'Carregadores Veículos Elétricos') {
                          setProduto('Carregadores veiculares')
                        } else if (opcao === 'Baterias') {
                          setProduto('Sistemas Híbridos')
                        } else {
                          setProduto('Energia Solar')
                        }
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? `${cfg.bgLightClass} ring-2 ring-emerald-500 shadow-xs font-semibold`
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${cfg.iconClass}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold leading-tight">{opcao}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {cfg.descricao}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SEÇÃO 3: CAMPOS DO LEAD OU CLIENTE EXISTENTE (GRID DE 2 COLUNAS NO DESKTOP) */}
            {modoCliente === 'novo' ? (
              <div className="space-y-4">
                <SecoesCadastroNovoCliente
                  dados={dadosNovoCliente}
                  onChange={(novos) => {
                    setDadosNovoCliente(novos)
                    setNome(novos.nome)
                    setRazaoSocial(novos.razao_social)
                    setNomeFantasia(novos.nome_fantasia)
                    setCnpj(novos.cnpj_cpf)
                    setTelefone(novos.telefone)
                    setWhatsapp(novos.whatsapp)
                    setEmail(novos.email)
                    setEndereco(novos.endereco)
                    setNumero(novos.numero)
                    setComplemento(novos.complemento)
                    setBairro(novos.bairro)
                    setCidade(novos.cidade)
                    setEstado(novos.estado)
                    setCep(novos.cep)
                    if (novos.consumo_kwh_mes) setConsumoKwhMes(novos.consumo_kwh_mes)
                  }}
                  disabled={isSubmitting}
                />

                {/* Origem do Lead */}
                <div className="p-4 bg-white rounded-xl border border-gray-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Origem do Lead <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value as OrigemLeadTipo)}
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  >
                    {ORIGENS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400">Canal de captação comercial.</p>
                </div>
              </div>
            ) : (
              /* Modo Cliente Existente: campos complementares deste negócio */
              <div className="p-4 bg-white rounded-xl border border-gray-200/80 space-y-3">
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">
                  Detalhes do Negócio para o Cliente Selecionado
                </div>
                <div className="max-w-md">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Consumo Estimado (kWh/mês)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={
                      clienteExistenteSelecionado?.consumo_kwh_mes
                        ? `Padrão do cliente: ${clienteExistenteSelecionado.consumo_kwh_mes} kWh/mês`
                        : 'Ex: 850'
                    }
                    value={consumoKwhMes}
                    onChange={(e) => setConsumoKwhMes(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Caso preenchido, calcula automaticamente potência estimada e valor no funil.
                  </span>
                </div>
              </div>
            )}

            {/* Aviso Informativo do Estágio Inicial */}
          </div>

          {/* Footer Fixo */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-gray-500">
              Campos marcados com <span className="text-red-500 font-bold">*</span> são
              obrigatórios.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-120 flex items-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : modoCliente === 'existente' ? (
                  'Salvar Negócio'
                ) : (
                  'Salvar Lead'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Secundário de Importação de Conta RGE */}
      <ModalImportarContaRGE
        isOpen={modalImportarContaOpen}
        onClose={() => setModalImportarContaOpen(false)}
        onConfirmar={handleAplicarDadosConta}
      />

      {/* Modal Aviso de Duplicidade de Telefone/WhatsApp */}
      <ModalAvisoDuplicidadeTelefone
        isOpen={modalDuplicidadeAberto}
        onClose={() => setModalDuplicidadeAberto(false)}
        duplicados={duplicadosEncontrados}
        numeroInformado={whatsapp.trim() || telefone.trim()}
        nomeInformado={nome.trim()}
        modo="criacao"
        onConfirmarMesclar={handleConfirmarMesclagem}
        onContinuarMesmoAssim={async () => {
          setModalDuplicidadeAberto(false)
          await executarPersistenciaLead(true)
        }}
        isCarregando={isMesclando}
      />
    </div>
  )
}

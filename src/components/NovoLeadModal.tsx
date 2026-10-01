import React, { useState } from 'react'
import { X, UserPlus, AlertCircle, Loader2, Sparkles, FileText, Zap, Building2 } from 'lucide-react'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import type { Cliente } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'
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

const PRODUTOS: ProdutoTipo[] = [
  'Energia Solar',
  'Plano de O&M',
  'Sistemas Híbridos',
  'Carregadores veiculares',
  'Manutenção avulsa',
]

export const NovoLeadModal: React.FC<NovoLeadModalProps> = ({ isOpen, onClose }) => {
  const { addCliente, clientes, refreshData } = useClientes()
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
  }

  const handleClose = () => {
    if (isSubmitting || isMesclando) return
    resetForm()
    onClose()
  }

  const montarPayloadLead = () => {
    const consumoNum = consumoKwhMes ? Number(consumoKwhMes) : 0
    const potenciaEstimada = consumoNum > 0 ? Number((consumoNum / 120).toFixed(1)) : 0
    const valorEstimado = potenciaEstimada > 0 ? Math.round(potenciaEstimada * 3500) : 0

    const telFinal = telefone.trim() || whatsapp.trim()
    const whatsFinal = whatsapp.trim() || telefone.trim()

    const payloadNovoCliente: Record<string, unknown> = {
      nome: nome.trim(),
      razao_social: razaoSocial.trim() || undefined,
      nome_fantasia: nomeFantasia.trim() || undefined,
      cnpj: cnpj.trim() || undefined,
      telefone: telFinal,
      whatsapp: whatsFinal,
      email: email.trim() || undefined,
      endereco: endereco.trim() || undefined,
      numero: numero.trim() || undefined,
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim() || undefined,
      estado: estado.trim() || undefined,
      cep: cep.trim() || undefined,
      cnae_principal: cnaePrincipal.trim() || undefined,
      situacao_cadastral: situacaoCadastral.trim() || undefined,
      data_nascimento_fundacao: dataAbertura.trim() || undefined,
      tipo_cliente: cnpj.replace(/\D/g, '').length === 14 ? 'comercial' : 'residencial',
      consumo_kwh_mes: consumoNum,
      origem_lead: origem,
      produto:
        tipoVenda === 'Energia Solar' ? 'Energia Solar' : (tipoVenda as unknown as ProdutoTipo),
      tipo_venda: tipoVenda,
      status: 'Novo Lead',
      cidade: cidade.trim() || 'Erechim/RS',
      potencia_kwp: potenciaEstimada,
      valor_estimado: valorEstimado,
    }

    if (dadosFaturaArmazenados) {
      if (dadosFaturaArmazenados.uc) {
        payloadNovoCliente.uc = dadosFaturaArmazenados.uc
        payloadNovoCliente.numero_uc = dadosFaturaArmazenados.uc
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

      {/* Modal Card */}
      <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <UserPlus className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">+ Novo Negócio</h2>
              <p className="text-xs text-gray-500">
                Cadastre uma nova oportunidade no funil comercial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* SELETOR NO TOPO: NOVO CLIENTE (DEFAULT) OU CLIENTE EXISTENTE */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Vincular a:
              </span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setModoCliente('novo')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
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
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    modoCliente === 'existente'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cliente existente
                </button>
              </div>
            </div>
            {modoCliente === 'existente' && (
              <div className="space-y-1.5 pt-1">
                <ClienteAutocomplete
                  clientes={clientes}
                  value={clienteExistenteId}
                  onChange={handleSelectClienteExistente}
                  placeholder="Buscar cliente existente por nome, telefone, cidade ou documento..."
                />
                {errors.clienteExistente && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.clienteExistente}
                  </p>
                )}
                {clienteExistenteSelecionado && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
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
            )}
          </div>

          {/* BOTÃO EM DESTAQUE: IMPORTAR DADOS DA CONTA */}
          <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-emerald-950">
                    Tem a fatura de energia em mãos?
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    RGE / Gemini
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 leading-snug">
                  Anexe a conta ou tire foto para preencher titular, CPF/CNPJ, endereço, UC e
                  consumo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalImportarContaOpen(true)}
              className="w-full sm:w-auto shrink-0 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Zap className="w-3.5 h-3.5" />
              Importar dados da conta
            </button>
          </div>

          {/* Banner indicador caso dados da fatura já tenham sido importados */}
          {dadosFaturaArmazenados && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Dados importados da conta{' '}
                  {dadosFaturaArmazenados.uc ? (
                    <strong className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                      UC {dadosFaturaArmazenados.uc}
                    </strong>
                  ) : null}
                  {dadosFaturaArmazenados.consumo_medio
                    ? ` • Média: ${Math.round(dadosFaturaArmazenados.consumo_medio)} kWh/mês`
                    : null}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalImportarContaOpen(true)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline shrink-0 ml-2"
              >
                Revisar dados
              </button>
            </div>
          )}

          {/* PASSO 1: ESCOLHA O TIPO DE VENDA PRIMEIRO */}
          <div className="p-3.5 bg-slate-50 rounded-xl border-2 border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Tipo de venda{' '}
                <span className="text-emerald-600 font-extrabold">* (Escolha primeiro)</span>
              </label>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Etapa inicial obrigatória
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Selecione a categoria comercial deste card para definir ícone e cor no funil:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? `${cfg.bgLightClass} ring-2 ring-emerald-500 shadow-xs font-semibold`
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                        isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100'
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 ${cfg.iconClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold leading-tight">{opcao}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {cfg.descricao}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Campos exclusivos para cadastro de NOVO lead */}
          {modoCliente === 'novo' ? (
            <>
              {/* Campo CNPJ opcional com consulta automática */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                <CnpjInputWithLookup
                  value={cnpj}
                  onChange={(val) => {
                    setCnpj(val)
                    if (conflitosCnpj.length > 0) setConflitosCnpj([])
                  }}
                  onBlur={handleCnpjBlur}
                  onLookupClick={() =>
                    lookupCnpj(cnpj, true).then((r) => r && aplicarDadosReceita(r, true))
                  }
                  status={cnpjStatus}
                  errorMessage={cnpjErrorMessage}
                  isLoading={isCnpjLoading}
                  label="CNPJ (Empresa / PJ) - Consulta Automática"
                  helperText="Preencha os 14 dígitos e saia do campo para buscar dados da Receita Federal"
                />

                <CnpjConflictBanner
                  conflitos={conflitosCnpj}
                  onManterMeusDados={() => {
                    setConflitosCnpj([])
                    setPendenteDadosReceita(null)
                  }}
                  onUsarDadosReceita={() => {
                    if (pendenteDadosReceita) aplicarDadosReceita(pendenteDadosReceita, true)
                  }}
                />

                {situacaoCadastral && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-gray-600 flex-wrap">
                    <span className="font-semibold text-gray-700">Situação:</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {situacaoCadastral}
                    </span>
                    {cnaePrincipal && (
                      <span className="text-[11px] text-gray-500 truncate" title={cnaePrincipal}>
                        • CNAE: {cnaePrincipal}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Nome do Lead / Razão Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva ou Fazenda Esperança"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    errors.nome ? 'border-red-500 bg-red-50/20' : 'border-gray-200'
                  }`}
                />
                {errors.nome && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.nome}
                  </p>
                )}
              </div>

              {/* Telefone, WhatsApp e Consumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    WhatsApp <span className="text-emerald-600 font-bold">(XX) XXXXX-XXXX</span>
                  </label>
                  <input
                    type="text"
                    placeholder="(54) 99876-5432"
                    value={whatsapp}
                    onChange={(e) => {
                      const formatted = formatWhatsAppPhone(e.target.value)
                      setWhatsapp(formatted)
                      if (!telefone) setTelefone(formatted)
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="(54) 3522-1234"
                    value={telefone}
                    onChange={(e) => setTelefone(formatWhatsAppPhone(e.target.value))}
                    className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                      errors.telefone ? 'border-red-500 bg-red-50/20' : 'border-gray-200'
                    }`}
                  />
                  {errors.telefone && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.telefone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Consumo (kWh/mês)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex: 850"
                    value={consumoKwhMes}
                    onChange={(e) => setConsumoKwhMes(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                      errors.consumo ? 'border-red-500 bg-red-50/20' : 'border-gray-200'
                    }`}
                  />
                  {errors.consumo && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.consumo}
                    </p>
                  )}
                </div>
              </div>

              {/* Origem e Produto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Origem do Lead <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value as OrigemLeadTipo)}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  >
                    {ORIGENS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Produto / Serviço
                  </label>
                  <select
                    value={produto}
                    onChange={(e) => setProduto(e.target.value as ProdutoTipo)}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  >
                    {PRODUTOS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cidade / Região (opcional, padrão Erechim/RS) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Cidade / Região
                </label>
                <input
                  type="text"
                  placeholder="Ex: Erechim/RS, Passo Fundo/RS, Chapecó/SC"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </>
          ) : (
            /* Modo Cliente Existente: campos complementares deste negócio */
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-3">
              <div>
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
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Caso preenchido, calcula automaticamente potência estimada e valor no funil.
                </span>
              </div>
            </div>
          )}

          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-start gap-2 text-xs text-emerald-800">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              O lead será criado diretamente na etapa <strong>"1 - Novo Lead"</strong> do funil de
              vendas com o tipo <strong>"{tipoVenda}"</strong>.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-120 flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
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

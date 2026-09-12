import React, { useState, useEffect } from 'react'
import {
  X,
  User,
  Building2,
  Plus,
  AlertCircle,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  FileText,
  MapPin,
  Check,
  HelpCircle,
} from 'lucide-react'
import { TipoPessoa, FornecedorEspecialidade } from '@/types/crm'
import { formatarCPF, validarCPF } from '@/lib/cpfValidator'
import { validarCNPJ } from '@/lib/orcamentoParser'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { useCnpjLookup } from '@/hooks/useCnpjLookup'
import {
  CnpjInputWithLookup,
  CnpjConflictBanner,
  CnpjConflictField,
} from '@/components/CnpjInputWithLookup'
import { CnpjDataNormalized } from '@/services/cnpjLookupService'
import {
  fetchAtividadesSetor,
  cadastrarNovaAtividadeSetor,
  ATIVIDADES_SETOR_PADRAO,
} from '@/services/atividadesSetorService'
import { toast } from 'sonner'

export type EntidadeTipo = 'cliente' | 'fornecedor'

export interface DadosCadastroForm {
  tipo_pessoa: TipoPessoa
  // Documentos
  cpf?: string
  cnpj?: string
  // Nomes
  nome: string // Nome completo (PF) ou Razão Social / Nome da Empresa (PJ)
  razao_social?: string
  nome_fantasia?: string
  // PJ específicos da Receita
  situacao_cadastral?: string
  cnae_principal?: string
  data_abertura?: string
  // Contatos
  telefone: string
  telefone_secundario?: string
  email?: string
  contato_principal?: string
  // Atividade e Origem
  atividade_principal?: string
  como_conheceu?: string
  observacoes?: string
  // Endereço
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  // Específico fornecedor
  especialidade?: FornecedorEspecialidade
}

interface ModalCadastroClienteFornecedorProps {
  isOpen: boolean
  onClose: () => void
  tipoEntidade: EntidadeTipo
  onSubmit: (dados: DadosCadastroForm) => Promise<void>
  dadosIniciais?: Partial<DadosCadastroForm>
}

const OPCOES_COMO_CONHECEU = [
  'Indicação',
  'Site',
  'Redes Sociais',
  'Feira/Evento',
  'WhatsApp',
  'Outro',
]

export const ModalCadastroClienteFornecedor: React.FC<ModalCadastroClienteFornecedorProps> = ({
  isOpen,
  onClose,
  tipoEntidade,
  onSubmit,
  dadosIniciais,
}) => {
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>(dadosIniciais?.tipo_pessoa || 'juridica')

  // Documentos
  const [cpf, setCpf] = useState(dadosIniciais?.cpf || '')
  const [cnpj, setCnpj] = useState(dadosIniciais?.cnpj || '')
  const [docError, setDocError] = useState<string | null>(null)

  // Nomes
  const [nome, setNome] = useState(dadosIniciais?.nome || '')
  const [razaoSocial, setRazaoSocial] = useState(dadosIniciais?.razao_social || '')
  const [nomeFantasia, setNomeFantasia] = useState(dadosIniciais?.nome_fantasia || '')

  // PJ Receita
  const [situacaoCadastral, setSituacaoCadastral] = useState(
    dadosIniciais?.situacao_cadastral || '',
  )
  const [cnaePrincipal, setCnaePrincipal] = useState(dadosIniciais?.cnae_principal || '')
  const [dataAbertura, setDataAbertura] = useState(dadosIniciais?.data_abertura || '')

  // Contatos
  const [telefone, setTelefone] = useState(dadosIniciais?.telefone || '')
  const [telefoneSecundario, setTelefoneSecundario] = useState(
    dadosIniciais?.telefone_secundario || '',
  )
  const [email, setEmail] = useState(dadosIniciais?.email || '')
  const [contatoPrincipal, setContatoPrincipal] = useState(dadosIniciais?.contato_principal || '')

  // Atividade e Origem
  const [atividadesLista, setAtividadesLista] = useState<string[]>(ATIVIDADES_SETOR_PADRAO)
  const [atividadePrincipal, setAtividadePrincipal] = useState(
    dadosIniciais?.atividade_principal || 'Instalador',
  )
  const [novaAtividadeModal, setNovaAtividadeModal] = useState(false)
  const [novaAtividadeNome, setNovaAtividadeNome] = useState('')
  const [isCadastrandoAtividade, setIsCadastrandoAtividade] = useState(false)

  const [comoConheceu, setComoConheceu] = useState(dadosIniciais?.como_conheceu || 'Indicação')
  const [observacoes, setObservacoes] = useState(dadosIniciais?.observacoes || '')

  // Endereço
  const [endereco, setEndereco] = useState(dadosIniciais?.endereco || '')
  const [numero, setNumero] = useState(dadosIniciais?.numero || '')
  const [complemento, setComplemento] = useState(dadosIniciais?.complemento || '')
  const [bairro, setBairro] = useState(dadosIniciais?.bairro || '')
  const [cidade, setCidade] = useState(dadosIniciais?.cidade || 'Erechim')
  const [estado, setEstado] = useState(dadosIniciais?.estado || 'RS')
  const [cep, setCep] = useState(dadosIniciais?.cep || '')

  // Fornecedor
  const [especialidade, setEspecialidade] = useState<FornecedorEspecialidade>(
    dadosIniciais?.especialidade || 'completo',
  )

  // Submissão & Conflitos CNPJ
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflitosCnpj, setConflitosCnpj] = useState<CnpjConflictField[]>([])
  const [pendenteDadosReceita, setPendenteDadosReceita] = useState<CnpjDataNormalized | null>(null)

  // Consulta CNPJ
  const {
    status: cnpjStatus,
    errorMessage: cnpjErrorMessage,
    isLoading: isCnpjLoading,
    lookup: lookupCnpj,
    reset: resetCnpjLookup,
  } = useCnpjLookup()

  // Carregar lista de atividades do banco
  useEffect(() => {
    if (isOpen) {
      fetchAtividadesSetor().then((lista) => {
        setAtividadesLista(lista)
        if (!atividadePrincipal && lista.length > 0) {
          setAtividadePrincipal(lista[0])
        }
      })
    }
  }, [isOpen])

  // Resetar ao abrir
  useEffect(() => {
    if (isOpen) {
      if (dadosIniciais) {
        setTipoPessoa(dadosIniciais.tipo_pessoa || 'juridica')
        setCpf(dadosIniciais.cpf || '')
        setCnpj(dadosIniciais.cnpj || '')
        setNome(dadosIniciais.nome || '')
        setRazaoSocial(dadosIniciais.razao_social || '')
        setNomeFantasia(dadosIniciais.nome_fantasia || '')
        setSituacaoCadastral(dadosIniciais.situacao_cadastral || '')
        setCnaePrincipal(dadosIniciais.cnae_principal || '')
        setDataAbertura(dadosIniciais.data_abertura || '')
        setTelefone(dadosIniciais.telefone || '')
        setTelefoneSecundario(dadosIniciais.telefone_secundario || '')
        setEmail(dadosIniciais.email || '')
        setContatoPrincipal(dadosIniciais.contato_principal || '')
        setAtividadePrincipal(dadosIniciais.atividade_principal || 'Instalador')
        setComoConheceu(dadosIniciais.como_conheceu || 'Indicação')
        setObservacoes(dadosIniciais.observacoes || '')
        setEndereco(dadosIniciais.endereco || '')
        setNumero(dadosIniciais.numero || '')
        setComplemento(dadosIniciais.complemento || '')
        setBairro(dadosIniciais.bairro || '')
        setCidade(dadosIniciais.cidade || 'Erechim')
        setEstado(dadosIniciais.estado || 'RS')
        setCep(dadosIniciais.cep || '')
        setEspecialidade(dadosIniciais.especialidade || 'completo')
      } else {
        resetForm()
      }
    }
  }, [isOpen, dadosIniciais])

  const resetForm = () => {
    setTipoPessoa('juridica')
    setCpf('')
    setCnpj('')
    setDocError(null)
    setNome('')
    setRazaoSocial('')
    setNomeFantasia('')
    setSituacaoCadastral('')
    setCnaePrincipal('')
    setDataAbertura('')
    setTelefone('')
    setTelefoneSecundario('')
    setEmail('')
    setContatoPrincipal('')
    setAtividadePrincipal('Instalador')
    setComoConheceu('Indicação')
    setObservacoes('')
    setEndereco('')
    setNumero('')
    setComplemento('')
    setBairro('')
    setCidade('Erechim')
    setEstado('RS')
    setCep('')
    setEspecialidade('completo')
    setConflitosCnpj([])
    setPendenteDadosReceita(null)
    resetCnpjLookup()
  }

  if (!isOpen) return null

  // Aplicar dados da Receita Federal para PJ
  const aplicarDadosReceita = (d: CnpjDataNormalized, sobrescrever = true) => {
    const nomePrincipal = d.nome_fantasia || d.razao_social
    if (sobrescrever || !nome) setNome(nomePrincipal || nome)
    if (sobrescrever || !razaoSocial) setRazaoSocial(d.razao_social || razaoSocial)
    if (sobrescrever || !nomeFantasia) setNomeFantasia(d.nome_fantasia || nomeFantasia)
    if (sobrescrever || !endereco) setEndereco(d.logradouro || endereco)
    if (sobrescrever || !numero) setNumero(d.numero || numero)
    if (sobrescrever || !complemento) setComplemento(d.complemento || complemento)
    if (sobrescrever || !bairro) setBairro(d.bairro || bairro)
    if (sobrescrever || !cidade) setCidade(d.municipio || cidade)
    if (sobrescrever || !estado) setEstado(d.uf || estado)
    if (sobrescrever || !cep) setCep(d.cep || cep)
    if (d.telefone && (sobrescrever || !telefone)) setTelefone(d.telefone)
    if (d.email && (sobrescrever || !email)) setEmail(d.email)
    if (d.situacao_cadastral && (sobrescrever || !situacaoCadastral))
      setSituacaoCadastral(d.situacao_cadastral)
    if (d.cnae_principal && (sobrescrever || !cnaePrincipal)) setCnaePrincipal(d.cnae_principal)
    if (d.data_abertura && (sobrescrever || !dataAbertura)) setDataAbertura(d.data_abertura)

    toast.success('Dados preenchidos via Receita Federal!')
    setConflitosCnpj([])
    setPendenteDadosReceita(null)
  }

  // Ao digitar os 14 dígitos do CNPJ ou sair do campo
  const handleCnpjBlur = async () => {
    const raw = cnpj.replace(/\D/g, '')
    if (raw.length !== 14) {
      if (raw.length > 0) {
        setDocError('CNPJ deve conter 14 dígitos.')
      } else {
        setDocError(null)
      }
      return
    }

    if (!validarCNPJ(raw)) {
      setDocError('CNPJ inválido (dígitos verificadores incorretos).')
      return
    }
    setDocError(null)

    const result = await lookupCnpj(raw)
    if (!result) return

    const conflitos: CnpjConflictField[] = []
    const nomePrincipal = result.nome_fantasia || result.razao_social

    if (nome.trim() && nome.trim().toLowerCase() !== nomePrincipal.toLowerCase()) {
      conflitos.push({
        campo: 'nome',
        label: tipoEntidade === 'fornecedor' ? 'Nome da Empresa' : 'Nome / Razão Social',
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
        label: 'Telefone Principal',
        valorAtual: telefone,
        valorReceita: result.telefone,
      })
    }
    if (email.trim() && result.email && email.trim().toLowerCase() !== result.email.toLowerCase()) {
      conflitos.push({
        campo: 'email',
        label: 'E-mail',
        valorAtual: email,
        valorReceita: result.email,
      })
    }
    if (
      cidade.trim() &&
      result.municipio &&
      cidade.trim().toLowerCase() !== result.municipio.toLowerCase()
    ) {
      conflitos.push({
        campo: 'cidade',
        label: 'Cidade',
        valorAtual: cidade,
        valorReceita: result.municipio,
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

  // Validação em tempo real do CPF
  const handleCpfChange = (val: string) => {
    const formatado = formatarCPF(val)
    setCpf(formatado)
    const raw = formatado.replace(/\D/g, '')
    if (raw.length === 11) {
      if (!validarCPF(raw)) {
        setDocError('CPF inválido (dígitos verificadores incorretos).')
      } else {
        setDocError(null)
      }
    } else if (raw.length > 0) {
      setDocError('CPF incompleto (digite os 11 números).')
    } else {
      setDocError(null)
    }
  }

  // Cadastrar nova atividade na lista
  const handleSalvarNovaAtividade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaAtividadeNome.trim()) return

    try {
      setIsCadastrandoAtividade(true)
      const nomeCriado = await cadastrarNovaAtividadeSetor(novaAtividadeNome)
      if (!atividadesLista.includes(nomeCriado)) {
        setAtividadesLista((prev) => [...prev, nomeCriado])
      }
      setAtividadePrincipal(nomeCriado)
      toast.success(`Atividade "${nomeCriado}" cadastrada com sucesso!`)
      setNovaAtividadeNome('')
      setNovaAtividadeModal(false)
    } catch (err: unknown) {
      console.error('Erro ao cadastrar nova atividade:', err)
      toast.error('Erro ao cadastrar atividade.')
    } finally {
      setIsCadastrandoAtividade(false)
    }
  }

  // Submit final
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (!nome.trim()) {
      toast.error(
        tipoPessoa === 'fisica'
          ? 'Informe o nome completo da pessoa física'
          : 'Informe a razão social ou nome da empresa',
      )
      return
    }

    if (tipoPessoa === 'fisica') {
      const rawCpf = cpf.replace(/\D/g, '')
      if (!rawCpf) {
        setDocError('Informe o CPF da pessoa física.')
        toast.error('Informe o CPF')
        return
      }
      if (!validarCPF(rawCpf)) {
        setDocError('CPF inválido. Por favor, corrija antes de salvar.')
        toast.error('CPF inválido')
        return
      }
    } else {
      // PJ
      const rawCnpj = cnpj.replace(/\D/g, '')
      if (rawCnpj.length > 0 && !validarCNPJ(rawCnpj)) {
        setDocError('CNPJ inválido. Por favor, corrija antes de salvar.')
        toast.error('CNPJ inválido')
        return
      }
    }

    if (!telefone.trim() && !email.trim()) {
      toast.error('Informe pelo menos um telefone ou email de contato.')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        tipo_pessoa: tipoPessoa,
        cpf: tipoPessoa === 'fisica' ? cpf.trim() || undefined : undefined,
        cnpj: tipoPessoa === 'juridica' ? cnpj.trim() || undefined : undefined,
        nome: nome.trim(),
        razao_social: tipoPessoa === 'juridica' ? razaoSocial.trim() || nome.trim() : undefined,
        nome_fantasia: tipoPessoa === 'juridica' ? nomeFantasia.trim() || undefined : undefined,
        situacao_cadastral:
          tipoPessoa === 'juridica' ? situacaoCadastral.trim() || undefined : undefined,
        cnae_principal: tipoPessoa === 'juridica' ? cnaePrincipal.trim() || undefined : undefined,
        data_abertura: tipoPessoa === 'juridica' ? dataAbertura.trim() || undefined : undefined,
        telefone: telefone.trim(),
        telefone_secundario: telefoneSecundario.trim() || undefined,
        email: email.trim() || undefined,
        contato_principal: contatoPrincipal.trim() || undefined,
        atividade_principal: atividadePrincipal || 'Instalador',
        como_conheceu: comoConheceu || 'Indicação',
        observacoes: observacoes.trim() || undefined,
        endereco: endereco.trim() || undefined,
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        estado: estado.trim().toUpperCase() || undefined,
        cep: cep.trim() || undefined,
        especialidade: tipoEntidade === 'fornecedor' ? especialidade : undefined,
      })

      toast.success(
        `${tipoEntidade === 'cliente' ? 'Cliente' : 'Fornecedor'} cadastrado com sucesso!`,
      )
      onClose()
      resetForm()
    } catch (err: unknown) {
      console.error('Erro ao salvar:', err)
      toast.error('Ocorreu um erro ao salvar o registro. Verifique os dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const tituloEntidade = tipoEntidade === 'cliente' ? 'Cliente' : 'Fornecedor'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative z-50 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        {/* Header com destaque verde Delfos */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shadow-xs">
              {tipoPessoa === 'fisica' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Building2 className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                Novo {tituloEntidade}
              </h2>
              <p className="text-xs text-gray-500">
                Escolha o tipo de pessoa e preencha os dados cadastrais
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs"
        >
          {/* SELEÇÃO DO TIPO DE PESSOA: PF / PJ */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800 text-xs block">
              Tipo de Pessoa <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTipoPessoa('fisica')
                  setDocError(null)
                }}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 transition-all font-semibold ${
                  tipoPessoa === 'fisica'
                    ? 'border-[#16A34A] bg-emerald-50/70 text-[#16A34A] shadow-xs'
                    : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Pessoa Física (CPF)</span>
                {tipoPessoa === 'fisica' && <Check className="w-4 h-4 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoPessoa('juridica')
                  setDocError(null)
                }}
                className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 transition-all font-semibold ${
                  tipoPessoa === 'juridica'
                    ? 'border-[#16A34A] bg-emerald-50/70 text-[#16A34A] shadow-xs'
                    : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Pessoa Jurídica (CNPJ)</span>
                {tipoPessoa === 'juridica' && <Check className="w-4 h-4 ml-auto" />}
              </button>
            </div>
          </div>

          {/* DOCUMENTO E CONSULTA RECEITA FEDERAL */}
          {tipoPessoa === 'juridica' ? (
            <div className="p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-200/60 space-y-2">
              <CnpjInputWithLookup
                value={cnpj}
                onChange={(val) => {
                  setCnpj(val)
                  setDocError(null)
                  if (conflitosCnpj.length > 0) setConflitosCnpj([])
                }}
                onBlur={handleCnpjBlur}
                onLookupClick={() =>
                  lookupCnpj(cnpj, true).then((r) => r && aplicarDadosReceita(r, true))
                }
                status={cnpjStatus}
                errorMessage={cnpjErrorMessage}
                isLoading={isCnpjLoading}
                label="CNPJ (Pessoa Jurídica) *"
                helperText="Ao digitar os 14 dígitos, a Receita Federal preenche Razão Social, Fantasia, Endereço, CNAE e Abertura automaticamente"
              />

              {docError && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {docError}
                </p>
              )}

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
            </div>
          ) : (
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-gray-700 text-xs block">
                  CPF (Pessoa Física) <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  Preenchimento manual (dados PF protegidos pela LGPD)
                </span>
              </div>
              <input
                type="text"
                value={cpf}
                maxLength={14}
                onChange={(e) => handleCpfChange(e.target.value)}
                placeholder="000.000.000-00"
                className={`w-full px-3 py-2 text-xs font-mono rounded-lg border transition-all ${
                  docError
                    ? 'border-red-400 bg-red-50/20'
                    : 'border-gray-300 focus:ring-emerald-500'
                } focus:outline-none focus:ring-2`}
              />
              {docError && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {docError}
                </p>
              )}
            </div>
          )}

          {/* DADOS PRINCIPAIS (NOME COMPLETO PF OU RAZÃO SOCIAL/FANTASIA PJ) */}
          {tipoPessoa === 'fisica' ? (
            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva Silveira"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Razão Social Completa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={razaoSocial || nome}
                  onChange={(e) => {
                    setRazaoSocial(e.target.value)
                    if (!nome) setNome(e.target.value)
                  }}
                  placeholder="Ex: Sol Tecno Comércio e Instalação LTDA"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={nomeFantasia}
                  onChange={(e) => {
                    setNomeFantasia(e.target.value)
                    setNome(e.target.value || razaoSocial)
                  }}
                  placeholder="Ex: Sol Tecno Distribuidora"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* CAMPOS ESPECÍFICOS PJ (RECEITA FEDERAL) */}
          {tipoPessoa === 'juridica' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50/70 rounded-xl border border-gray-200/70">
              <div>
                <label className="font-medium text-gray-600 block mb-1">Situação Cadastral</label>
                <input
                  type="text"
                  value={situacaoCadastral}
                  onChange={(e) => setSituacaoCadastral(e.target.value)}
                  placeholder="Ex: ATIVA"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-semibold text-emerald-800"
                />
              </div>

              <div>
                <label className="font-medium text-gray-600 block mb-1">CNAE Principal</label>
                <input
                  type="text"
                  value={cnaePrincipal}
                  onChange={(e) => setCnaePrincipal(e.target.value)}
                  placeholder="Ex: 4321-5/00 Elétrica Solar"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-gray-600 block mb-1">Data de Abertura</label>
                <input
                  type="date"
                  value={dataAbertura}
                  onChange={(e) => setDataAbertura(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>
          )}

          {/* CONTATOS: TELEFONE PRINCIPAL, TELEFONE SECUNDÁRIO, EMAIL, CONTATO PRINCIPAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Telefone Principal / WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(formatWhatsAppPhone(e.target.value))}
                  placeholder="(54) 99999-9999"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Telefone Secundário</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={telefoneSecundario}
                  onChange={(e) => setTelefoneSecundario(formatWhatsAppPhone(e.target.value))}
                  placeholder="(54) 3522-0000"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Contato Principal (Pessoa Responsável)
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contatoPrincipal}
                  onChange={(e) => setContatoPrincipal(e.target.value)}
                  placeholder="Ex: Carlos Eduardo ou Maria Oliveira"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* ATIVIDADE PRINCIPAL (COM BOTÃO CADASTRO DE NOVA ATIVIDADE) E COMO CONHECEU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-gray-700 text-xs block">
                  Atividade Principal (Setor Solar) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setNovaAtividadeModal(true)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Cadastrar Nova Atividade</span>
                </button>
              </div>

              <select
                value={atividadePrincipal}
                onChange={(e) => setAtividadePrincipal(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {atividadesLista.map((ativ) => (
                  <option key={ativ} value={ativ}>
                    {ativ}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Como conheceu a empresa?
              </label>
              <select
                value={comoConheceu}
                onChange={(e) => setComoConheceu(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {OPCOES_COMO_CONHECEU.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CASO FORNECEDOR: ESPECIALIDADE */}
          {tipoEntidade === 'fornecedor' && (
            <div>
              <label className="font-semibold text-gray-700 block mb-1">
                Especialidade de Fornecimento <span className="text-red-500">*</span>
              </label>
              <select
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value as FornecedorEspecialidade)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
              >
                <option value="completo">Kit Completo Fotovoltaico</option>
                <option value="paineis">Painéis Fotovoltaicos</option>
                <option value="inversores">Inversores</option>
                <option value="estruturas">Estruturas de Fixação</option>
                <option value="acessorios">Acessórios & Proteções</option>
              </select>
            </div>
          )}

          {/* ENDEREÇO COMPLETO */}
          <div className="p-3.5 bg-gray-50/90 rounded-xl border border-gray-200 space-y-2.5">
            <span className="font-bold text-gray-800 block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Endereço Completo & Localização
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] text-gray-500 block mb-0.5">Logradouro / Rua</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua / Avenida"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Número</label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Nº"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Bairro</label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Cidade</label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[11px] text-gray-500 block mb-0.5">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    placeholder="RS"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-center font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-0.5">CEP</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 block mb-0.5">Complemento</label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Sala, Casa, Apto, Galpão..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* OBSERVAÇÕES GERAIS */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1">Observações Gerais</label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações comerciais, preferências de contato, características da instalação..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar {tituloEntidade}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SUBMODAL: CADASTRAR NOVA ATIVIDADE DO SETOR SOLAR */}
      {novaAtividadeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setNovaAtividadeModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                Cadastrar Nova Atividade
              </h3>
              <button
                type="button"
                onClick={() => setNovaAtividadeModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaAtividade} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nome da Atividade *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={novaAtividadeNome}
                  onChange={(e) => setNovaAtividadeNome(e.target.value)}
                  placeholder="Ex: Auditoria Energética, Seguradora..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNovaAtividadeModal(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCadastrandoAtividade || !novaAtividadeNome.trim()}
                  className="px-4 py-1.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1"
                >
                  {isCadastrandoAtividade ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Incluir na Lista</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

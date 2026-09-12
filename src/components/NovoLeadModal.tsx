import React, { useState } from 'react'
import { X, UserPlus, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import type { OrigemLeadTipo, ProdutoTipo } from '@/types/crm'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { useCnpjLookup } from '@/hooks/useCnpjLookup'
import {
  CnpjInputWithLookup,
  CnpjConflictBanner,
  CnpjConflictField,
} from '@/components/CnpjInputWithLookup'
import { CnpjDataNormalized } from '@/services/cnpjLookupService'

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
  const { addCliente } = useClientes()
  const { toast } = useToast()

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
  const [origem, setOrigem] = useState<OrigemLeadTipo>('Indicação')
  const [produto, setProduto] = useState<ProdutoTipo>('Energia Solar')
  const [cidade, setCidade] = useState('Erechim/RS')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [conflitosCnpj, setConflitosCnpj] = useState<CnpjConflictField[]>([])
  const [pendenteDadosReceita, setPendenteDadosReceita] = useState<CnpjDataNormalized | null>(null)

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
    if (!nome.trim()) {
      newErrors.nome = 'Informe o nome do lead'
    }
    if (!telefone.trim() && !whatsapp.trim()) {
      newErrors.telefone = 'Informe o telefone ou WhatsApp de contato'
    }
    if (!origem) {
      newErrors.origem = 'Selecione a origem do lead'
    }
    if (consumoKwhMes && (isNaN(Number(consumoKwhMes)) || Number(consumoKwhMes) < 0)) {
      newErrors.consumo = 'Consumo deve ser um número positivo'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
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
    setOrigem('Indicação')
    setProduto('Energia Solar')
    setCidade('Erechim/RS')
    setErrors({})
    setConflitosCnpj([])
    setPendenteDadosReceita(null)
    resetCnpjLookup()
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
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setIsSubmitting(true)

      const consumoNum = consumoKwhMes ? Number(consumoKwhMes) : 0
      // Estimativa inicial automática de potência (base 120 kWh/kWp no sul do Brasil) e valor (R$ 3.500/kWp)
      const potenciaEstimada = consumoNum > 0 ? Number((consumoNum / 120).toFixed(1)) : 0
      const valorEstimado = potenciaEstimada > 0 ? Math.round(potenciaEstimada * 3500) : 0

      const telFinal = telefone.trim() || whatsapp.trim()
      const whatsFinal = whatsapp.trim() || telefone.trim()

      await addCliente({
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
        produto,
        status: 'Novo Lead',
        cidade: cidade.trim() || 'Erechim/RS',
        potencia_kwp: potenciaEstimada,
        valor_estimado: valorEstimado,
      })

      toast({
        title: 'Lead cadastrado com sucesso!',
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
              <h2 className="text-lg font-bold text-gray-900">+ Novo Lead</h2>
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

          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-start gap-2 text-xs text-emerald-800">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              O lead será criado diretamente na etapa <strong>"1 - Novo Lead"</strong> do funil de
              vendas, com a etiqueta do produto selecionado.
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
                  Cadastrando...
                </>
              ) : (
                'Salvar Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

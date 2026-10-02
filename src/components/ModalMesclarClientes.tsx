import React, { useState, useMemo, useEffect } from 'react'
import {
  GitMerge,
  ArrowRight,
  Check,
  AlertTriangle,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Zap,
  Info,
  Layers,
  Calendar,
  X,
  Search,
  UserPlus,
  Briefcase,
  Star,
  Activity,
  DollarSign,
  Sun,
  ClipboardList,
} from 'lucide-react'
import { contarVinculosCliente, type VinculosClienteSumario } from '@/services/crmService'
import type { Cliente } from '@/types/crm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge, ProductBadge } from '@/components/StatusBadge'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'

interface ModalMesclarClientesProps {
  isOpen: boolean
  onClose: () => void
  clienteInicial?: Cliente | null
  todosClientes: Cliente[]
  onConfirmarMesclagem: (opcoes: import('@/services/crmService').MesclagemOpcoes) => Promise<void>
}

type CampoMesclavel =
  | 'nome'
  | 'tipo_pessoa'
  | 'cpf'
  | 'cnpj'
  | 'telefone'
  | 'whatsapp'
  | 'email'
  | 'cidade'
  | 'estado'
  | 'endereco'
  | 'bairro'
  | 'numero'
  | 'cep'
  | 'uc'
  | 'potencia_kwp'
  | 'valor_estimado'
  | 'status'
  | 'produto'
  | 'observacoes'

interface CampoConfig {
  key: CampoMesclavel
  label: string
  format?: (val: any) => string
}

const CAMPOS_CONFIG: CampoConfig[] = [
  { key: 'nome', label: 'Nome do Cliente' },
  {
    key: 'tipo_pessoa',
    label: 'Tipo de Pessoa',
    format: (v) => (v === 'juridica' ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'),
  },
  { key: 'cpf', label: 'CPF' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'telefone', label: 'Telefone Principal', format: (v) => formatWhatsAppPhone(v || '') },
  { key: 'whatsapp', label: 'WhatsApp', format: (v) => formatWhatsAppPhone(v || '') },
  { key: 'email', label: 'E-mail' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado (UF)' },
  { key: 'endereco', label: 'Logradouro / Endereço' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'numero', label: 'Número' },
  { key: 'cep', label: 'CEP' },
  { key: 'uc', label: 'Unidade Consumidora (UC)' },
  { key: 'potencia_kwp', label: 'Potência (kWp)', format: (v) => (v ? `${v} kWp` : '—') },
  { key: 'valor_estimado', label: 'Valor Estimado', format: (v) => (v ? formatCurrency(v) : '—') },
  { key: 'status', label: 'Status Comercial' },
  { key: 'produto', label: 'Produto Principal' },
  { key: 'observacoes', label: 'Observações' },
]

export const ModalMesclarClientes: React.FC<ModalMesclarClientesProps> = ({
  isOpen,
  onClose,
  clienteInicial,
  todosClientes,
  onConfirmarMesclagem,
}) => {
  const [mestreId, setMestreId] = useState<string>('')
  const [secundarioId, setSecundarioId] = useState<string>('')
  const [buscaSecundario, setBuscaSecundario] = useState<string>('')
  const [modoMesclagem, setModoMesclagem] = useState<
    'unificar_cliente' | 'converter_contato_adicional'
  >('unificar_cliente')
  const [contatoPapel, setContatoPapel] = useState<
    'principal' | 'financeiro' | 'tecnico' | 'responsavel' | 'outro'
  >('outro')
  const [contatoCargo, setContatoCargo] = useState<string>('')
  const [contatoIsWhatsapp, setContatoIsWhatsapp] = useState<boolean>(true)
  const [contatoIsPrincipal, setContatoIsPrincipal] = useState<boolean>(false)

  const [sumarioVinculos, setSumarioVinculos] = useState<VinculosClienteSumario | null>(null)
  const [carregandoSumario, setCarregandoSumario] = useState<boolean>(false)

  const [escolhasCampos, setEscolhasCampos] = useState<
    Record<CampoMesclavel, 'mestre' | 'secundario'>
  >({} as any)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inicializar quando o modal abrir ou clienteInicial mudar
  useEffect(() => {
    if (isOpen) {
      if (clienteInicial) {
        setMestreId(clienteInicial.id)
      } else if (todosClientes.length > 0) {
        setMestreId(todosClientes[0].id)
      }
      setSecundarioId('')
      setBuscaSecundario('')
      setModoMesclagem('unificar_cliente')
      setContatoPapel('outro')
      setContatoCargo('')
      setContatoIsPrincipal(false)
      setContatoIsWhatsapp(true)
      setSumarioVinculos(null)
    }
  }, [isOpen, clienteInicial, todosClientes])

  // Carregar contagem de vínculos quando secundário for selecionado
  useEffect(() => {
    if (secundarioId) {
      setCarregandoSumario(true)
      contarVinculosCliente(secundarioId)
        .then((res) => setSumarioVinculos(res))
        .catch(console.error)
        .finally(() => setCarregandoSumario(false))
    } else {
      setSumarioVinculos(null)
    }
  }, [secundarioId])

  const clienteMestre = useMemo(() => {
    return todosClientes.find((c) => c.id === mestreId) || null
  }, [todosClientes, mestreId])

  const clienteSecundario = useMemo(() => {
    return todosClientes.find((c) => c.id === secundarioId) || null
  }, [todosClientes, secundarioId])

  // Inicializar escolhas de campos: padrão é mestre, mas se mestre estiver vazio e secundário tiver valor, secundário prevalece
  useEffect(() => {
    if (clienteMestre && clienteSecundario) {
      const initial: Record<CampoMesclavel, 'mestre' | 'secundario'> = {} as any
      CAMPOS_CONFIG.forEach(({ key }) => {
        const valMestre = clienteMestre[key]
        const valSec = clienteSecundario[key]
        const hasMestre =
          valMestre !== undefined && valMestre !== null && String(valMestre).trim() !== ''
        const hasSec = valSec !== undefined && valSec !== null && String(valSec).trim() !== ''

        if (!hasMestre && hasSec) {
          initial[key] = 'secundario'
        } else {
          initial[key] = 'mestre'
        }
      })
      setEscolhasCampos(initial)
    }
  }, [clienteMestre, clienteSecundario])

  // Inverter papéis: quem era secundário vira mestre e vice-versa
  const handleInverterPapeis = () => {
    if (!clienteMestre || !clienteSecundario) return
    const tempMestre = mestreId
    setMestreId(secundarioId)
    setSecundarioId(tempMestre)
  }

  // Lista de possíveis clientes duplicados para selecionar como secundário
  const candidatosSecundario = useMemo(() => {
    if (!clienteMestre) return []
    const termo = buscaSecundario.trim().toLowerCase()

    return todosClientes
      .filter((c) => c.id !== clienteMestre.id)
      .filter((c) => {
        if (!termo) return true
        const nome = (c.nome || '').toLowerCase()
        const cpf = (c.cpf || '').replace(/\D/g, '')
        const cnpj = (c.cnpj || '').replace(/\D/g, '')
        const tel = (c.telefone || '').replace(/\D/g, '')
        const cid = (c.cidade || '').toLowerCase()
        const email = (c.email || '').toLowerCase()

        return (
          nome.includes(termo) ||
          cpf.includes(termo) ||
          cnpj.includes(termo) ||
          tel.includes(termo) ||
          cid.includes(termo) ||
          email.includes(termo)
        )
      })
      .slice(0, 50)
  }, [todosClientes, clienteMestre, buscaSecundario])

  const handleSelectCampo = (campo: CampoMesclavel, origem: 'mestre' | 'secundario') => {
    setEscolhasCampos((prev) => ({
      ...prev,
      [campo]: origem,
    }))
  }

  const handleConfirmar = async () => {
    if (!clienteMestre || !clienteSecundario) return

    if (modoMesclagem === 'converter_contato_adicional') {
      try {
        setIsSubmitting(true)
        await onConfirmarMesclagem({
          clienteMestreId: clienteMestre.id,
          clienteSecundarioId: clienteSecundario.id,
          camposSobrescritos: {},
          modo: 'converter_contato_adicional',
          contatoAdicionalConfig: {
            papel: contatoIsPrincipal ? 'principal' : contatoPapel,
            cargo: contatoCargo.trim() || undefined,
            is_principal: contatoIsPrincipal,
            is_whatsapp: contatoIsWhatsapp,
          },
        })
        onClose()
      } catch (err) {
        console.error('Falha ao converter cliente em contato adicional:', err)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Modo padrão: unificar_cliente
    const camposSobrescritos: Partial<Cliente> = {}

    CAMPOS_CONFIG.forEach(({ key }) => {
      const origem = escolhasCampos[key] || 'mestre'
      const valorEscolhido = origem === 'secundario' ? clienteSecundario[key] : clienteMestre[key]

      if (valorEscolhido !== undefined) {
        // @ts-expect-error
        camposSobrescritos[key] = valorEscolhido
      }
    })

    if (clienteSecundario.observacoes && clienteSecundario.observacoes.trim()) {
      const obsMestre = clienteMestre.observacoes || ''
      const obsSec = clienteSecundario.observacoes.trim()
      if (!obsMestre.includes(obsSec)) {
        camposSobrescritos.observacoes = obsMestre
          ? `${obsMestre}\n\n[Histórico mesclado do cadastro duplicado (${clienteSecundario.nome})]: ${obsSec}`
          : `[Histórico mesclado de ${clienteSecundario.nome}]: ${obsSec}`
      }
    }

    if (clienteSecundario.dados_importados) {
      camposSobrescritos.dados_importados = {
        ...(clienteMestre.dados_importados || {}),
        ...(clienteSecundario.dados_importados || {}),
        mesclado_em: new Date().toISOString(),
        mesclado_com_id: clienteSecundario.id,
      }
    }

    try {
      setIsSubmitting(true)
      await onConfirmarMesclagem({
        clienteMestreId: clienteMestre.id,
        clienteSecundarioId: clienteSecundario.id,
        camposSobrescritos,
        modo: 'unificar_cliente',
      })
      onClose()
    } catch (err) {
      console.error('Falha ao confirmar mesclagem:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-gray-200 bg-linear-to-r from-emerald-50 via-teal-50 to-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  Mesclar Clientes Duplicados
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-600 mt-0.5">
                  Funda dois cadastros em um só. Todos os negócios, orçamentos, contratos,
                  atividades e conversas são transferidos com segurança para o cliente principal.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Seletor de Modo de Mesclagem */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
              Como deseja realizar a mesclagem?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setModoMesclagem('unificar_cliente')}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  modoMesclagem === 'unificar_cliente'
                    ? 'bg-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white/60 border-gray-200 hover:bg-white text-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    modoMesclagem === 'unificar_cliente'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {modoMesclagem === 'unificar_cliente' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <GitMerge className="w-3.5 h-3.5 text-emerald-600" />
                    Unificar os dois cadastros como Cliente
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Funde os campos de ambos em um único cadastro de cliente mestre. O cliente
                    duplicado deixa de existir.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModoMesclagem('converter_contato_adicional')}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                  modoMesclagem === 'converter_contato_adicional'
                    ? 'bg-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white/60 border-gray-200 hover:bg-white text-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    modoMesclagem === 'converter_contato_adicional'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {modoMesclagem === 'converter_contato_adicional' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    Converter em contato adicional do cliente
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Transfere tudo (oportunidades, usinas, histórico) para o cliente principal e
                    transforma o outro em contato adicional.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Seção 1: Seleção do Cliente Mestre e Secundário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Cliente Mestre (O que FICA) */}
            <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  Cliente Mestre (permanece na base)
                </span>
                {clienteSecundario && (
                  <button
                    type="button"
                    onClick={handleInverterPapeis}
                    disabled={isSubmitting}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline inline-flex items-center gap-1"
                    title="Inverter mestre e duplicado"
                  >
                    ⇄ Inverter papéis
                  </button>
                )}
              </div>

              {clienteMestre ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-gray-900">{clienteMestre.nome}</h4>
                    <StatusBadge status={clienteMestre.status} />
                  </div>
                  <div className="text-gray-600 flex items-center gap-2 flex-wrap">
                    {clienteMestre.cpf && <span>CPF: {clienteMestre.cpf}</span>}
                    {clienteMestre.cnpj && <span>CNPJ: {clienteMestre.cnpj}</span>}
                    {clienteMestre.telefone && (
                      <span>Tel: {formatWhatsAppPhone(clienteMestre.telefone)}</span>
                    )}
                  </div>
                  <div className="text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {clienteMestre.cidade || 'Cidade não informada'}
                      {clienteMestre.estado ? ` - ${clienteMestre.estado}` : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Nenhum cliente mestre selecionado.</p>
              )}
            </div>

            {/* Card Cliente Secundário (O que SERÁ ABSORVIDO) */}
            <div className="p-4 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/40 relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Cliente Duplicado (será absorvido e excluído)
                </span>
              </div>

              {clienteSecundario ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-gray-900">{clienteSecundario.nome}</h4>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={clienteSecundario.status} />
                      <button
                        type="button"
                        onClick={() => setSecundarioId('')}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                        title="Trocar cliente duplicado"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-600 flex items-center gap-2 flex-wrap">
                    {clienteSecundario.cpf && <span>CPF: {clienteSecundario.cpf}</span>}
                    {clienteSecundario.cnpj && <span>CNPJ: {clienteSecundario.cnpj}</span>}
                    {clienteSecundario.telefone && (
                      <span>Tel: {formatWhatsAppPhone(clienteSecundario.telefone)}</span>
                    )}
                  </div>
                  <div className="text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {clienteSecundario.cidade || 'Cidade não informada'}
                      {clienteSecundario.estado ? ` - ${clienteSecundario.estado}` : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar cliente duplicado por nome, documento ou telefone..."
                      value={buscaSecundario}
                      onChange={(e) => setBuscaSecundario(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
                    {candidatosSecundario.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        Nenhum cliente correspondente encontrado.
                      </div>
                    ) : (
                      candidatosSecundario.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSecundarioId(c.id)}
                          className="w-full text-left p-2 hover:bg-amber-50/70 transition-colors flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">{c.nome}</span>
                            <span className="text-[11px] text-gray-500 ml-2">
                              {c.cpf || c.cnpj || c.telefone || c.cidade || 'Sem detalhes'}
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-700 font-bold">Selecionar</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Painel Dinâmico Conforme Modo de Mesclagem */}
          {clienteMestre &&
            clienteSecundario &&
            modoMesclagem === 'converter_contato_adicional' && (
              <div className="space-y-4 border border-emerald-200 bg-emerald-50/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                      Configuração do Contato Adicional Gerado
                    </h4>
                    <p className="text-xs text-gray-500">
                      O cadastro de <strong>{clienteSecundario.nome}</strong> será excluído como
                      cliente e mantido como contato em <strong>{clienteMestre.nome}</strong>.
                    </p>
                  </div>
                </div>

                {/* Sumário do que será transferido */}
                <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Sumário do que será transferido para {clienteMestre.nome}:</span>
                  </div>
                  {carregandoSumario ? (
                    <div className="text-xs text-gray-400 py-1">Calculando vínculos...</div>
                  ) : sumarioVinculos ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-gray-50 border border-gray-100">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Negócios
                        </span>
                        <span className="text-base font-bold text-gray-900">
                          {sumarioVinculos.negocios}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-gray-50 border border-gray-100">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Atividades
                        </span>
                        <span className="text-base font-bold text-gray-900">
                          {sumarioVinculos.atividades}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-gray-50 border border-gray-100">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Usinas
                        </span>
                        <span className="text-base font-bold text-gray-900">
                          {sumarioVinculos.usinas}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-gray-50 border border-gray-100">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Orçamentos
                        </span>
                        <span className="text-base font-bold text-gray-900">
                          {sumarioVinculos.orcamentos}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Campos do Contato Adicional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Nome no contato adicional
                    </label>
                    <input
                      type="text"
                      disabled
                      value={clienteSecundario.nome}
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-md text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Papel do contato
                    </label>
                    <select
                      value={contatoPapel}
                      onChange={(e) => setContatoPapel(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="principal">Principal</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="tecnico">Técnico</option>
                      <option value="responsavel">Responsável</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Sócio, Gerente, Esposa, Contato Operacional"
                      value={contatoCargo}
                      onChange={(e) => setContatoCargo(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Telefone / WhatsApp herdado
                    </label>
                    <input
                      type="text"
                      disabled
                      value={
                        clienteSecundario.whatsapp || clienteSecundario.telefone || 'Não informado'
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-md text-gray-700"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-gray-100 space-y-2">
                    <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={contatoIsPrincipal}
                        onChange={(e) => setContatoIsPrincipal(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-emerald-900 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                        Definir como Contato Principal de {clienteMestre.nome}
                      </span>
                    </label>
                    <p className="text-[11px] text-gray-500 pl-6">
                      Se marcado, as mensagens de WhatsApp disparadas para o cliente passarão a ser
                      enviadas prioritariamente para esta pessoa.
                    </p>
                  </div>
                </div>

                {/* Alerta claro de exclusão */}
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Aviso de exclusão do cadastro independente:</p>
                    <p className="text-[11px] text-amber-800">
                      O registro de cliente de <strong>{clienteSecundario.nome}</strong> será
                      excluído da lista geral de clientes. Todos os negócios, atividades, usinas e
                      histórico serão transferidos integralmente para{' '}
                      <strong>{clienteMestre.nome}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Seção 2: Tabela de Escolha Campo a Campo */}
          {clienteMestre && clienteSecundario && modoMesclagem === 'unificar_cliente' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Escolha de Dados Campo a Campo
                  </h4>
                  <p className="text-xs text-gray-500">
                    Selecione qual valor deve prevalecer no cadastro final para cada informação.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allMestre: any = {}
                      CAMPOS_CONFIG.forEach((f) => (allMestre[f.key] = 'mestre'))
                      setEscolhasCampos(allMestre)
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded bg-emerald-50 border border-emerald-200"
                  >
                    Tudo do Mestre
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allSec: any = {}
                      CAMPOS_CONFIG.forEach((f) => (allSec[f.key] = 'secundario'))
                      setEscolhasCampos(allSec)
                    }}
                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 px-2 py-1 rounded bg-amber-50 border border-amber-200"
                  >
                    Tudo do Duplicado
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 w-1/4">Campo</th>
                      <th className="py-2.5 px-3 w-3/8 text-emerald-900 bg-emerald-50/50">
                        Opção A: Mestre ({clienteMestre.nome.split(' ')[0]})
                      </th>
                      <th className="py-2.5 px-3 w-3/8 text-amber-900 bg-amber-50/50">
                        Opção B: Duplicado ({clienteSecundario.nome.split(' ')[0]})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {CAMPOS_CONFIG.map(({ key, label, format }) => {
                      const valMestreRaw = clienteMestre[key]
                      const valSecRaw = clienteSecundario[key]
                      const valMestreStr = format
                        ? format(valMestreRaw)
                        : String(valMestreRaw ?? '')
                      const valSecStr = format ? format(valSecRaw) : String(valSecRaw ?? '')

                      const isConflito =
                        Boolean(valMestreRaw || valSecRaw) &&
                        String(valMestreRaw || '').trim() !== String(valSecRaw || '').trim()

                      const selectedOrigem = escolhasCampos[key] || 'mestre'

                      return (
                        <tr
                          key={key}
                          className={`transition-colors ${
                            isConflito ? 'bg-amber-50/20' : 'hover:bg-gray-50/60'
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-gray-700">
                            <div className="flex items-center gap-1.5">
                              <span>{label}</span>
                              {isConflito && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-amber-500"
                                  title="Valores diferentes"
                                />
                              )}
                            </div>
                          </td>

                          {/* Opção Mestre */}
                          <td
                            onClick={() => handleSelectCampo(key, 'mestre')}
                            className={`py-2 px-3 cursor-pointer transition-all ${
                              selectedOrigem === 'mestre'
                                ? 'bg-emerald-100/60 font-semibold text-emerald-950 border-l-2 border-emerald-600'
                                : 'text-gray-500 hover:bg-gray-100/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">
                                {valMestreStr.trim() ? (
                                  valMestreStr
                                ) : (
                                  <span className="text-gray-300 italic font-normal">Vazio</span>
                                )}
                              </span>
                              {selectedOrigem === 'mestre' && (
                                <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              )}
                            </div>
                          </td>

                          {/* Opção Secundário */}
                          <td
                            onClick={() => handleSelectCampo(key, 'secundario')}
                            className={`py-2 px-3 cursor-pointer transition-all ${
                              selectedOrigem === 'secundario'
                                ? 'bg-amber-100/70 font-semibold text-amber-950 border-l-2 border-amber-600'
                                : 'text-gray-500 hover:bg-gray-100/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">
                                {valSecStr.trim() ? (
                                  valSecStr
                                ) : (
                                  <span className="text-gray-300 italic font-normal">Vazio</span>
                                )}
                              </span>
                              {selectedOrigem === 'secundario' && (
                                <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Box Informativo de Garantia de Dados */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Segurança e integridade garantidas na mesclagem:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-blue-800 space-y-0.5 pl-1">
                  <li>
                    Todas as propostas, orçamentos e contratos O&M do duplicado serão transferidos
                    para o mestre.
                  </li>
                  <li>
                    Atividades e histórico de conversas do WhatsApp permanecem preservados e
                    integrados.
                  </li>
                  <li>
                    Uma anotação de auditoria será registrada automaticamente no histórico do
                    cliente mestre.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Selecione o cliente duplicado acima para comparar os dados e configurar a fusão.
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!clienteMestre || !clienteSecundario || isSubmitting}
            onClick={handleConfirmar}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
          >
            {modoMesclagem === 'converter_contato_adicional' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Convertendo...' : 'Confirmar Conversão em Contato'}</span>
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Mesclando cadastros...' : 'Confirmar e Mesclar Clientes'}
                </span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

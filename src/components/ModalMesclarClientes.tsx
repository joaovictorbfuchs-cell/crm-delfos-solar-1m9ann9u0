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
} from 'lucide-react'
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
  onConfirmarMesclagem: (opcoes: {
    clienteMestreId: string
    clienteSecundarioId: string
    camposSobrescritos: Partial<Cliente>
  }) => Promise<void>
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
    }
  }, [isOpen, clienteInicial, todosClientes])

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

    // Construir os campos consolidados conforme escolha do usuário
    const camposSobrescritos: Partial<Cliente> = {}

    CAMPOS_CONFIG.forEach(({ key }) => {
      const origem = escolhasCampos[key] || 'mestre'
      const valorEscolhido = origem === 'secundario' ? clienteSecundario[key] : clienteMestre[key]

      if (valorEscolhido !== undefined) {
        // @ts-expect-error
        camposSobrescritos[key] = valorEscolhido
      }
    })

    // Fusão inteligente das observações caso ambos tenham anotações
    if (clienteSecundario.observacoes && clienteSecundario.observacoes.trim()) {
      const obsMestre = clienteMestre.observacoes || ''
      const obsSec = clienteSecundario.observacoes.trim()
      if (!obsMestre.includes(obsSec)) {
        camposSobrescritos.observacoes = obsMestre
          ? `${obsMestre}\n\n[Histórico mesclado do cadastro duplicado (${clienteSecundario.nome})]: ${obsSec}`
          : `[Histórico mesclado de ${clienteSecundario.nome}]: ${obsSec}`
      }
    }

    // Preservar ou fundir dados_importados
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

          {/* Seção 2: Tabela de Escolha Campo a Campo */}
          {clienteMestre && clienteSecundario ? (
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
            <GitMerge className="w-4 h-4" />
            <span>{isSubmitting ? 'Mesclando cadastros...' : 'Confirmar e Mesclar Clientes'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

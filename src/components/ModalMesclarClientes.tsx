import React, { useState, useMemo, useEffect } from 'react'
import {
  GitMerge,
  Check,
  AlertTriangle,
  MapPin,
  X,
  Search,
  UserPlus,
  Star,
  Activity,
  Layers,
  Info,
  Crown,
  Plus,
  Building2,
  Trash2,
  Phone,
  Mail,
  Zap,
  Loader2,
} from 'lucide-react'
import {
  contarVinculosCliente,
  type VinculosClienteSumario,
  type MesclagemOpcoes,
  type ProgressoMesclagemInfo,
} from '@/services/crmService'
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
import { StatusBadge } from '@/components/StatusBadge'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'

export interface ModalMesclarClientesProps {
  isOpen: boolean
  onClose: () => void
  clienteInicial?: Cliente | null
  // Lista inicial de clientes selecionados (2 ou mais)
  clientesIniciais?: Cliente[]
  todosClientes: Cliente[]
  onConfirmarMesclagem: (opcoes: MesclagemOpcoes) => Promise<void>
}

export type CampoMesclavel =
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
  | 'complemento'
  | 'cep'
  | 'uc'
  | 'concessionaria'
  | 'classe_consumo'
  | 'tarifa'
  | 'potencia_kwp'
  | 'valor_estimado'
  | 'status'
  | 'produto'
  | 'tipo_cliente'
  | 'tipo_venda'
  | 'inversor_marca'
  | 'inversor_modelo'
  | 'placas_qtd'
  | 'placas_marca'
  | 'telhado_tipo'
  | 'consumo_kwh_mes'
  | 'origem_lead'
  | 'nome_fantasia'
  | 'razao_social'
  | 'contato_principal'
  | 'contato'
  | 'atividade_principal'
  | 'cnae_principal'
  | 'situacao_cadastral'
  | 'titular_nome'
  | 'titular_cpf'
  | 'titular_telefone'
  | 'titular_email'
  | 'observacoes'

interface CampoConfig {
  key: CampoMesclavel
  label: string
  grupo: 'identificacao' | 'contato' | 'endereco' | 'solar' | 'comercial' | 'titular' | 'outros'
  format?: (val: any) => string
}

export const CAMPOS_CONFIG: CampoConfig[] = [
  // Identificação
  { key: 'nome', label: 'Nome do Cliente', grupo: 'identificacao' },
  {
    key: 'tipo_pessoa',
    label: 'Tipo de Pessoa',
    grupo: 'identificacao',
    format: (v) => (v === 'juridica' ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'),
  },
  { key: 'cpf', label: 'CPF', grupo: 'identificacao' },
  { key: 'cnpj', label: 'CNPJ', grupo: 'identificacao' },
  { key: 'razao_social', label: 'Razão Social', grupo: 'identificacao' },
  { key: 'nome_fantasia', label: 'Nome Fantasia', grupo: 'identificacao' },
  { key: 'cnae_principal', label: 'CNAE Principal', grupo: 'identificacao' },
  { key: 'situacao_cadastral', label: 'Situação Cadastral', grupo: 'identificacao' },

  // Contatos
  {
    key: 'telefone',
    label: 'Telefone Principal',
    grupo: 'contato',
    format: (v) => formatWhatsAppPhone(v || ''),
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    grupo: 'contato',
    format: (v) => formatWhatsAppPhone(v || ''),
  },
  { key: 'email', label: 'E-mail', grupo: 'contato' },
  { key: 'contato_principal', label: 'Contato Principal', grupo: 'contato' },
  { key: 'contato', label: 'Outro Contato / Observação de Contato', grupo: 'contato' },

  // Endereço
  { key: 'cidade', label: 'Cidade', grupo: 'endereco' },
  { key: 'estado', label: 'Estado (UF)', grupo: 'endereco' },
  { key: 'endereco', label: 'Logradouro / Endereço', grupo: 'endereco' },
  { key: 'numero', label: 'Número', grupo: 'endereco' },
  { key: 'bairro', label: 'Bairro', grupo: 'endereco' },
  { key: 'complemento', label: 'Complemento', grupo: 'endereco' },
  { key: 'cep', label: 'CEP', grupo: 'endereco' },

  // Dados da UC / Solar
  { key: 'uc', label: 'Unidade Consumidora (UC)', grupo: 'solar' },
  { key: 'concessionaria', label: 'Concessionária', grupo: 'solar' },
  { key: 'classe_consumo', label: 'Classe de Consumo', grupo: 'solar' },
  {
    key: 'tarifa',
    label: 'Tarifa de Energia',
    grupo: 'solar',
    format: (v) => (v ? `R$ ${Number(v).toFixed(4)}` : '—'),
  },
  {
    key: 'consumo_kwh_mes',
    label: 'Consumo Médio (kWh/mês)',
    grupo: 'solar',
    format: (v) => (v ? `${v} kWh` : '—'),
  },
  {
    key: 'potencia_kwp',
    label: 'Potência Estimada (kWp)',
    grupo: 'solar',
    format: (v) => (v ? `${v} kWp` : '—'),
  },
  { key: 'inversor_marca', label: 'Marca do Inversor', grupo: 'solar' },
  { key: 'inversor_modelo', label: 'Modelo do Inversor', grupo: 'solar' },
  { key: 'placas_marca', label: 'Marca das Placas', grupo: 'solar' },
  {
    key: 'placas_qtd',
    label: 'Quantidade de Placas',
    grupo: 'solar',
    format: (v) => (v ? `${v} placas` : '—'),
  },
  { key: 'telhado_tipo', label: 'Tipo de Telhado / Estrutura', grupo: 'solar' },

  // Comercial
  { key: 'status', label: 'Status no Funil Comercial', grupo: 'comercial' },
  { key: 'produto', label: 'Produto Principal', grupo: 'comercial' },
  { key: 'tipo_cliente', label: 'Segmento / Tipo de Cliente', grupo: 'comercial' },
  { key: 'tipo_venda', label: 'Tipo de Venda', grupo: 'comercial' },
  { key: 'origem_lead', label: 'Origem do Lead', grupo: 'comercial' },
  {
    key: 'valor_estimado',
    label: 'Valor Estimado',
    grupo: 'comercial',
    format: (v) => (v ? formatCurrency(v) : '—'),
  },

  // Titular da Conta
  { key: 'titular_nome', label: 'Nome do Titular da Conta', grupo: 'titular' },
  { key: 'titular_cpf', label: 'CPF do Titular da Conta', grupo: 'titular' },
  {
    key: 'titular_telefone',
    label: 'Telefone do Titular',
    grupo: 'titular',
    format: (v) => formatWhatsAppPhone(v || ''),
  },
  { key: 'titular_email', label: 'E-mail do Titular', grupo: 'titular' },

  // Outros
  { key: 'atividade_principal', label: 'Ramo / Atividade Principal', grupo: 'outros' },
  { key: 'observacoes', label: 'Observações Gerais', grupo: 'outros' },
]

export const ModalMesclarClientes: React.FC<ModalMesclarClientesProps> = ({
  isOpen,
  onClose,
  clienteInicial,
  clientesIniciais = [],
  todosClientes,
  onConfirmarMesclagem,
}) => {
  // Lista de IDs dos clientes participantes da mesclagem (pode ser 2, 3, 4... N)
  const [clientesParticipantesIds, setClientesParticipantesIds] = useState<string[]>([])
  // O cliente principal (sobrevivente)
  const [clientePrincipalId, setClientePrincipalId] = useState<string>('')
  // Busca para adicionar mais clientes à mesclagem
  const [buscaAdicional, setBuscaAdicional] = useState<string>('')
  const [mostrarBuscaAdicionar, setMostrarBuscaAdicionar] = useState<boolean>(false)

  // Modo: unificar_cliente (funde no principal) ou converter_contato_adicional (cria contatos adicionais no principal)
  const [modoMesclagem, setModoMesclagem] = useState<
    'unificar_cliente' | 'converter_contato_adicional'
  >('unificar_cliente')

  // Configurações individuais de contato adicional por cliente secundário (se modo converter_contato_adicional)
  const [contatosConfig, setContatosConfig] = useState<
    Record<
      string,
      {
        papel: 'principal' | 'financeiro' | 'tecnico' | 'responsavel' | 'outro'
        cargo: string
        is_whatsapp: boolean
        is_principal: boolean
      }
    >
  >({})

  // Sumário de vínculos por cliente secundário
  const [sumariosVinculos, setSumariosVinculos] = useState<Record<string, VinculosClienteSumario>>(
    {},
  )
  const [carregandoSumarios, setCarregandoSumarios] = useState<boolean>(false)

  // Mapa de escolhas por campo: { campoKey: clienteIdEscolhido }
  const [escolhasCampos, setEscolhasCampos] = useState<Record<CampoMesclavel, string>>({} as any)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progressoMesclagem, setProgressoMesclagem] = useState<ProgressoMesclagemInfo | null>(null)

  // Filtro de visualização dos campos (mostrar todos ou apenas divergentes)
  const [filtroApenasDivergentes, setFiltroApenasDivergentes] = useState<boolean>(false)

  // Inicializar quando o modal abrir
  useEffect(() => {
    if (!isOpen) return

    let idsIniciais: string[] = []

    if (clientesIniciais && clientesIniciais.length > 0) {
      idsIniciais = clientesIniciais.map((c) => c.id)
    } else if (clienteInicial) {
      idsIniciais = [clienteInicial.id]
    } else if (todosClientes.length > 0) {
      idsIniciais = [todosClientes[0].id]
    }

    // Remove duplicados
    idsIniciais = Array.from(new Set(idsIniciais.filter(Boolean)))

    setClientesParticipantesIds(idsIniciais)
    setClientePrincipalId(idsIniciais[0] || '')
    setBuscaAdicional('')
    setMostrarBuscaAdicionar(false)
    setModoMesclagem('unificar_cliente')
    setContatosConfig({})
    setSumariosVinculos({})
    setProgressoMesclagem(null)
    setFiltroApenasDivergentes(false)
  }, [isOpen, clienteInicial, clientesIniciais, todosClientes])

  // Obter objetos completos dos clientes participantes na ordem
  const clientesParticipantes = useMemo(() => {
    const map = new Map(todosClientes.map((c) => [c.id, c]))
    return clientesParticipantesIds.map((id) => map.get(id)).filter((c): c is Cliente => Boolean(c))
  }, [todosClientes, clientesParticipantesIds])

  const clientePrincipal = useMemo(() => {
    return (
      clientesParticipantes.find((c) => c.id === clientePrincipalId) ||
      clientesParticipantes[0] ||
      null
    )
  }, [clientesParticipantes, clientePrincipalId])

  const clientesSecundarios = useMemo(() => {
    if (!clientePrincipal) return []
    return clientesParticipantes.filter((c) => c.id !== clientePrincipal.id)
  }, [clientesParticipantes, clientePrincipal])

  // Carregar vínculos dos secundários para exibição
  useEffect(() => {
    if (clientesSecundarios.length === 0) {
      setSumariosVinculos({})
      return
    }

    let isMounted = true
    setCarregandoSumarios(true)

    Promise.all(
      clientesSecundarios.map(async (sec) => {
        try {
          const sum = await contarVinculosCliente(sec.id)
          return { id: sec.id, sum }
        } catch {
          return {
            id: sec.id,
            sum: {
              negocios: 0,
              atividades: 0,
              usinas: 0,
              orcamentos: 0,
              contratosOM: 0,
              projetos: 0,
              ordensServico: 0,
              conversasWhatsApp: 0,
              contatosAdicionais: 0,
              total: 0,
            },
          }
        }
      }),
    ).then((results) => {
      if (!isMounted) return
      const map: Record<string, VinculosClienteSumario> = {}
      results.forEach((r) => {
        map[r.id] = r.sum
      })
      setSumariosVinculos(map)
      setCarregandoSumarios(false)
    })

    return () => {
      isMounted = false
    }
  }, [clientesSecundarios])

  // Inicializar escolhas de campos sempre que a lista de participantes ou o cliente principal mudar
  useEffect(() => {
    if (clientesParticipantes.length === 0 || !clientePrincipal) return

    setEscolhasCampos((prev) => {
      const novasEscolhas: Record<CampoMesclavel, string> = { ...prev }

      CAMPOS_CONFIG.forEach(({ key }) => {
        const atualId = novasEscolhas[key]
        // Se a escolha atual já aponta para um cliente participante que tem valor, mantém
        if (atualId && clientesParticipantesIds.includes(atualId)) {
          const cliAtual = clientesParticipantes.find((c) => c.id === atualId)
          const valAtual = cliAtual ? cliAtual[key] : undefined
          if (valAtual !== undefined && valAtual !== null && String(valAtual).trim() !== '') {
            return
          }
        }

        // Caso padrão: preferir cliente principal se ele tiver valor
        const valPrincipal = clientePrincipal[key]
        const principalPreenchido =
          valPrincipal !== undefined && valPrincipal !== null && String(valPrincipal).trim() !== ''

        if (principalPreenchido) {
          novasEscolhas[key] = clientePrincipal.id
          return
        }

        // Se principal não tem valor, procurar o primeiro cliente participante que tenha valor preenchido
        const participanteComValor = clientesParticipantes.find((c) => {
          const v = c[key]
          return v !== undefined && v !== null && String(v).trim() !== ''
        })

        if (participanteComValor) {
          novasEscolhas[key] = participanteComValor.id
        } else {
          novasEscolhas[key] = clientePrincipal.id
        }
      })

      return novasEscolhas
    })
  }, [clientesParticipantes, clientePrincipal, clientesParticipantesIds])

  // Total acumulado de vínculos que serão transferidos
  const totalVinculosGeral = useMemo(() => {
    return Object.values(sumariosVinculos).reduce(
      (acc, s) => ({
        negocios: acc.negocios + (s?.negocios || 0),
        atividades: acc.atividades + (s?.atividades || 0),
        usinas: acc.usinas + (s?.usinas || 0),
        orcamentos: acc.orcamentos + (s?.orcamentos || 0),
        contratosOM: acc.contratosOM + (s?.contratosOM || 0),
        projetos: acc.projetos + (s?.projetos || 0),
        ordensServico: acc.ordensServico + (s?.ordensServico || 0),
        conversasWhatsApp: acc.conversasWhatsApp + (s?.conversasWhatsApp || 0),
        contatosAdicionais: acc.contatosAdicionais + (s?.contatosAdicionais || 0),
        total: acc.total + (s?.total || 0),
      }),
      {
        negocios: 0,
        atividades: 0,
        usinas: 0,
        orcamentos: 0,
        contratosOM: 0,
        projetos: 0,
        ordensServico: 0,
        conversasWhatsApp: 0,
        contatosAdicionais: 0,
        total: 0,
      },
    )
  }, [sumariosVinculos])

  // Candidatos para adicionar à mesclagem
  const candidatosParaAdicionar = useMemo(() => {
    const termo = buscaAdicional.trim().toLowerCase()
    const setIds = new Set(clientesParticipantesIds)

    return todosClientes
      .filter((c) => !setIds.has(c.id))
      .filter((c) => {
        if (!termo) return true
        const nome = (c.nome || '').toLowerCase()
        const cpf = (c.cpf || '').replace(/\D/g, '')
        const cnpj = (c.cnpj || '').replace(/\D/g, '')
        const tel = (c.telefone || '').replace(/\D/g, '')
        const wa = (c.whatsapp || '').replace(/\D/g, '')
        const cid = (c.cidade || '').toLowerCase()
        const email = (c.email || '').toLowerCase()

        return (
          nome.includes(termo) ||
          cpf.includes(termo) ||
          cnpj.includes(termo) ||
          tel.includes(termo) ||
          wa.includes(termo) ||
          cid.includes(termo) ||
          email.includes(termo)
        )
      })
      .slice(0, 30)
  }, [todosClientes, clientesParticipantesIds, buscaAdicional])

  const handleAdicionarCliente = (cliente: Cliente) => {
    if (clientesParticipantesIds.includes(cliente.id)) return
    setClientesParticipantesIds((prev) => [...prev, cliente.id])
    setBuscaAdicional('')
    setMostrarBuscaAdicionar(false)
  }

  const handleRemoverCliente = (clienteIdParaRemover: string) => {
    if (clientesParticipantesIds.length <= 1) return
    const novaLista = clientesParticipantesIds.filter((id) => id !== clienteIdParaRemover)
    setClientesParticipantesIds(novaLista)

    if (clientePrincipalId === clienteIdParaRemover) {
      setClientePrincipalId(novaLista[0] || '')
    }
  }

  const handleDefinirPrincipal = (id: string) => {
    setClientePrincipalId(id)
  }

  const handleSelectCampo = (campo: CampoMesclavel, clienteId: string) => {
    setEscolhasCampos((prev) => ({
      ...prev,
      [campo]: clienteId,
    }))
  }

  const handleAplicarTudoDeUmCliente = (clienteId: string) => {
    const map: Record<CampoMesclavel, string> = {} as any
    CAMPOS_CONFIG.forEach((f) => {
      map[f.key] = clienteId
    })
    setEscolhasCampos(map)
  }

  // Identificar se há divergência entre os valores de um campo entre os clientes participantes
  const isCampoDivergente = (campo: CampoMesclavel) => {
    const valoresNaoVazios = clientesParticipantes
      .map((c) => {
        const val = c[campo]
        return val !== undefined && val !== null ? String(val).trim() : ''
      })
      .filter((v) => v !== '')

    if (valoresNaoVazios.length <= 1) return false
    const primeiro = valoresNaoVazios[0]
    return valoresNaoVazios.some((v) => v !== primeiro)
  }

  const handleConfirmar = async () => {
    if (!clientePrincipal || clientesSecundarios.length === 0) return

    // 1. Preparar campos sobrescritos escolhidos pelo usuário
    const camposSobrescritos: Partial<Cliente> = {}
    const participantesMap = new Map(clientesParticipantes.map((c) => [c.id, c]))

    CAMPOS_CONFIG.forEach(({ key }) => {
      const escolhidoId = escolhasCampos[key] || clientePrincipal.id
      const cliEscolhido = participantesMap.get(escolhidoId) || clientePrincipal
      const valor = cliEscolhido[key]

      if (valor !== undefined) {
        // @ts-expect-error indexação dinâmica de campo de Cliente
        camposSobrescritos[key] = valor
      }
    })

    // 2. Fundir observações de todos os secundários sem perder nada
    const observacoesPartes: string[] = []
    if (camposSobrescritos.observacoes && typeof camposSobrescritos.observacoes === 'string') {
      observacoesPartes.push(camposSobrescritos.observacoes.trim())
    } else if (clientePrincipal.observacoes) {
      observacoesPartes.push(clientePrincipal.observacoes.trim())
    }

    clientesSecundarios.forEach((sec) => {
      if (sec.observacoes && sec.observacoes.trim()) {
        const obsTrim = sec.observacoes.trim()
        const jaConsta = observacoesPartes.some((p) => p.includes(obsTrim))
        if (!jaConsta) {
          observacoesPartes.push(`[Histórico mesclado de "${sec.nome}"]: ${obsTrim}`)
        }
      }
    })

    if (observacoesPartes.length > 0) {
      camposSobrescritos.observacoes = observacoesPartes.filter(Boolean).join('\n\n')
    }

    // 3. Fundir dados_importados preservando metadados de auditoria
    const dadosImportadosFundidos: Record<string, any> = {
      ...(clientePrincipal.dados_importados || {}),
    }

    clientesSecundarios.forEach((sec) => {
      if (sec.dados_importados && typeof sec.dados_importados === 'object') {
        Object.assign(dadosImportadosFundidos, sec.dados_importados)
      }
    })

    dadosImportadosFundidos.mesclado_em = new Date().toISOString()
    dadosImportadosFundidos.mesclado_com_ids = clientesSecundarios.map((s) => s.id)
    camposSobrescritos.dados_importados = dadosImportadosFundidos

    try {
      setIsSubmitting(true)
      setProgressoMesclagem({
        etapa: 'iniciando',
        concluidos: 0,
        total: 100,
        porcentagem: 0,
        detalhe: 'Iniciando unificação de clientes...',
      })

      await onConfirmarMesclagem({
        clienteMestreId: clientePrincipal.id,
        clienteSecundarioId: clientesSecundarios[0]?.id,
        clientesSecundariosIds: clientesSecundarios.map((s) => s.id),
        camposSobrescritos,
        modo: modoMesclagem,
        contatoAdicionalConfig:
          clientesSecundarios.length === 1 && modoMesclagem === 'converter_contato_adicional'
            ? contatosConfig[clientesSecundarios[0].id]
            : undefined,
        onProgresso: (p) => {
          setProgressoMesclagem(p)
        },
      })
      onClose()
    } catch (err) {
      console.error('Falha ao confirmar mesclagem:', err)
      setProgressoMesclagem(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const podeMesclar = Boolean(clientePrincipal && clientesSecundarios.length >= 1)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[94vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-linear-to-r from-emerald-50 via-teal-50 to-white shrink-0">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <GitMerge className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>Mesclar Clientes ({clientesParticipantes.length} selecionados)</span>
                    {clientesParticipantes.length > 2 && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                        {clientesParticipantes.length} em 1
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-600 mt-0.5">
                    Selecione o cliente principal que permanecerá ativo. Escolha individualmente de
                    qual cliente manter o valor em cada campo. Todos os negócios, usinas, atividades
                    e históricos serão unificados sem nenhuma perda de dados.
                  </DialogDescription>
                </div>
              </div>

              {/* Botão de Adicionar mais clientes */}
              <div className="shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarBuscaAdicionar((prev) => !prev)}
                  className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 font-semibold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Adicionar outro cliente</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Popover / Linha de busca para adicionar cliente extra */}
          {mostrarBuscaAdicionar && (
            <div className="mt-3 p-3 bg-white border border-emerald-200 rounded-xl shadow-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <span>Buscar cliente para incluir na mesclagem:</span>
                <button
                  type="button"
                  onClick={() => setMostrarBuscaAdicionar(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Digite nome, CPF, CNPJ, telefone, cidade..."
                  value={buscaAdicional}
                  onChange={(e) => setBuscaAdicional(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                {candidatosParaAdicionar.length === 0 ? (
                  <div className="p-2.5 text-center text-xs text-gray-400">
                    Nenhum cliente disponível encontrado.
                  </div>
                ) : (
                  candidatosParaAdicionar.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleAdicionarCliente(c)}
                      className="w-full text-left p-2 hover:bg-emerald-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-900">{c.nome}</span>
                        <span className="text-[11px] text-gray-500 ml-2">
                          {c.cpf || c.cnpj || c.telefone || c.cidade || 'Sem detalhes'}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold shrink-0">
                        + Incluir
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Seletor de Modo de Mesclagem */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
              Como deseja unificar estes {clientesParticipantes.length} cadastros?
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
                    Unificar todos em um único Cliente Principal
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Funde todos os campos no cadastro principal. Os cadastros absorvidos deixam de
                    existir como registros separados, mas todas as oportunidades, usinas e histórico
                    são transferidos integralmente.
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
                    Converter clientes mesclados em Contatos Adicionais
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Transfere todos os vínculos para o principal e preserva os nomes dos demais como
                    contatos adicionais vinculados à ficha do cliente principal.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Cards dos Clientes Selecionados lado a lado (scroll horizontal suave) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-emerald-600" />
                Definir o Cliente Principal (o registro que sobreviverá):
              </span>
              <span className="text-[11px] text-gray-500">
                Clique na estrela / coroa de qualquer card para torná-lo o principal.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto pb-1">
              {clientesParticipantes.map((c, idx) => {
                const isPrincipal = c.id === clientePrincipal?.id
                const vinculos = sumariosVinculos[c.id]

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-xl border-2 transition-all relative flex flex-col justify-between ${
                      isPrincipal
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-amber-300/80 bg-amber-50/30 hover:border-amber-400'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleDefinirPrincipal(c.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                            isPrincipal
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                          title={
                            isPrincipal
                              ? 'Cliente principal atual'
                              : 'Clique para definir como principal'
                          }
                        >
                          <Crown
                            className={`w-3 h-3 ${isPrincipal ? 'text-amber-300' : 'text-gray-400'}`}
                          />
                          <span>{isPrincipal ? 'Cliente Principal' : 'Tornar Principal'}</span>
                        </button>

                        {clientesParticipantes.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoverCliente(c.id)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded-md"
                            title="Remover este cliente da mesclagem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-sm text-gray-900 leading-snug truncate">
                            {c.nome}
                          </h4>
                          <StatusBadge status={c.status} />
                        </div>
                        <div className="text-[11px] text-gray-600 space-y-0.5">
                          {c.cpf && (
                            <div>
                              CPF: <span className="font-mono">{c.cpf}</span>
                            </div>
                          )}
                          {c.cnpj && (
                            <div>
                              CNPJ: <span className="font-mono">{c.cnpj}</span>
                            </div>
                          )}
                          {c.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{formatWhatsAppPhone(c.telefone)}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-gray-500">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">
                              {c.cidade || 'Cidade não informada'}
                              {c.estado ? ` - ${c.estado}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2.5 border-t border-gray-200/70 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleAplicarTudoDeUmCliente(c.id)}
                        className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                        title="Marcar todos os campos abaixo para virem deste cliente"
                      >
                        Usar todos os campos deste
                      </button>

                      {!isPrincipal && vinculos && (
                        <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/80 px-1.5 py-0.5 rounded">
                          {vinculos.total} {vinculos.total === 1 ? 'vínculo' : 'vínculos'} a
                          transferir
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sumário Consolidado dos Vínculos Transferidos */}
          <div className="bg-white border border-emerald-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>
                  Total de registros que serão transferidos para{' '}
                  <strong>{clientePrincipal?.nome || 'o cliente principal'}</strong>:
                </span>
              </div>
              {carregandoSumarios && (
                <span className="text-[11px] text-gray-400">Calculando vínculos...</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                  Negócios
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {totalVinculosGeral.negocios}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                  Atividades
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {totalVinculosGeral.atividades}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                  Usinas
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {totalVinculosGeral.usinas}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                  Orçamentos
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {totalVinculosGeral.orcamentos}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                  Contratos O&M
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {totalVinculosGeral.contratosOM}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                  Projetos
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {totalVinculosGeral.projetos}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                  OS de Campo
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {totalVinculosGeral.ordensServico}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                  Contatos
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  {totalVinculosGeral.contatosAdicionais}
                </span>
              </div>
            </div>
          </div>

          {/* Configuração de Contatos Adicionais (se modo converter_contato_adicional selecionado) */}
          {modoMesclagem === 'converter_contato_adicional' && (
            <div className="space-y-3 border border-emerald-300 bg-emerald-50/40 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    Contatos adicionais gerados a partir dos clientes mesclados
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Cada cliente mesclado será mantido como contato na ficha de{' '}
                    <strong>{clientePrincipal?.nome}</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {clientesSecundarios.map((sec) => {
                  const cfg = contatosConfig[sec.id] || {
                    papel: 'outro',
                    cargo: sec.tipo_pessoa === 'juridica' ? 'Representante Legal' : 'Contato',
                    is_whatsapp: Boolean(sec.whatsapp || sec.telefone),
                    is_principal: false,
                  }

                  return (
                    <div
                      key={sec.id}
                      className="p-3 bg-white border border-gray-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block">{sec.nome}</span>
                        <span className="text-[11px] text-gray-500">
                          {formatWhatsAppPhone(sec.whatsapp || sec.telefone || '') ||
                            'Sem telefone'}
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">
                          Papel do Contato
                        </label>
                        <select
                          value={cfg.papel}
                          onChange={(e) =>
                            setContatosConfig((prev) => ({
                              ...prev,
                              [sec.id]: { ...cfg, papel: e.target.value as any },
                            }))
                          }
                          className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="principal">Principal</option>
                          <option value="financeiro">Financeiro</option>
                          <option value="tecnico">Técnico</option>
                          <option value="responsavel">Responsável</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">
                          Cargo / Função
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Sócio, Diretor, Gerente"
                          value={cfg.cargo}
                          onChange={(e) =>
                            setContatosConfig((prev) => ({
                              ...prev,
                              [sec.id]: { ...cfg, cargo: e.target.value },
                            }))
                          }
                          className="w-full px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TABELA DE ESCOLHA CAMPO A CAMPO (N COLUNAS LADO A LADO) */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Escolha de Dados Campo a Campo ({CAMPOS_CONFIG.length} campos)</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Clique na célula de qualquer coluna para definir a origem que prevalecerá no
                  cadastro final unificado.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltroApenasDivergentes((prev) => !prev)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                    filtroApenasDivergentes
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {filtroApenasDivergentes ? 'Mostrando só divergentes' : 'Filtrar divergentes'}
                </button>
              </div>
            </div>

            {/* Tabela com scroll horizontal para N colunas */}
            <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 w-48 sticky left-0 bg-gray-50 z-10 shadow-[1px_0_0_0_#e5e7eb]">
                      Campo
                    </th>
                    {clientesParticipantes.map((cli, idx) => {
                      const isPrincipal = cli.id === clientePrincipal?.id
                      return (
                        <th
                          key={cli.id}
                          className={`py-2.5 px-3 min-w-[200px] ${
                            isPrincipal
                              ? 'bg-emerald-100/70 text-emerald-950 font-black'
                              : 'bg-gray-50/80 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate" title={cli.nome}>
                              {cli.nome.split(' ')[0]} {cli.nome.split(' ')[1] || ''}
                            </span>
                            {isPrincipal ? (
                              <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold shrink-0">
                                Principal
                              </span>
                            ) : (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-medium shrink-0">
                                Secundário
                              </span>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {CAMPOS_CONFIG.filter((cfg) => {
                    if (!filtroApenasDivergentes) return true
                    return isCampoDivergente(cfg.key)
                  }).map(({ key, label, format }) => {
                    const divergente = isCampoDivergente(key)
                    const clienteEscolhidoId = escolhasCampos[key] || clientePrincipal?.id

                    return (
                      <tr
                        key={key}
                        className={`transition-colors ${
                          divergente ? 'bg-amber-50/30' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        {/* Coluna Nome do Campo fixada */}
                        <td className="py-2 px-3 font-semibold text-gray-700 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e5e7eb]">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{label}</span>
                            {divergente && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                                title="Valores diferentes entre os clientes"
                              />
                            )}
                          </div>
                        </td>

                        {/* Uma coluna para cada cliente participante */}
                        {clientesParticipantes.map((cli) => {
                          const valRaw = cli[key]
                          const valStr = format ? format(valRaw) : String(valRaw ?? '')
                          const isSelected = clienteEscolhidoId === cli.id
                          const isPrincipal = cli.id === clientePrincipal?.id
                          const temValor =
                            valRaw !== undefined && valRaw !== null && String(valRaw).trim() !== ''

                          return (
                            <td
                              key={cli.id}
                              onClick={() => handleSelectCampo(key, cli.id)}
                              className={`py-2 px-3 cursor-pointer transition-all border-l border-gray-100 ${
                                isSelected
                                  ? isPrincipal
                                    ? 'bg-emerald-100/70 font-bold text-emerald-950 ring-1 ring-inset ring-emerald-500'
                                    : 'bg-amber-100/80 font-bold text-amber-950 ring-1 ring-inset ring-amber-500'
                                  : 'text-gray-600 hover:bg-gray-100/60'
                              }`}
                              title={`Clique para manter o valor de ${cli.nome} para este campo`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {temValor ? (
                                    valStr
                                  ) : (
                                    <span className="text-gray-300 italic font-normal text-[11px]">
                                      — Vazio
                                    </span>
                                  )}
                                </span>
                                {isSelected && (
                                  <div
                                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                      isPrincipal
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-amber-600 text-white'
                                    }`}
                                  >
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Indicador de Progresso em Tempo Real durante a Mesclagem */}
          {isSubmitting && (
            <div
              data-testid="progresso-mesclagem-container"
              className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl space-y-2.5 shadow-xs animate-in fade-in"
            >
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span data-testid="progresso-etapa-texto">
                    {progressoMesclagem?.detalhe || 'Executando mesclagem segura dos cadastros...'}
                  </span>
                </div>
                {typeof progressoMesclagem?.porcentagem === 'number' && (
                  <span className="text-emerald-800 font-mono font-extrabold text-xs">
                    {progressoMesclagem.porcentagem}%
                  </span>
                )}
              </div>

              {/* Barra de progresso */}
              <div className="w-full bg-emerald-200/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${
                      typeof progressoMesclagem?.porcentagem === 'number'
                        ? Math.max(5, Math.min(100, progressoMesclagem.porcentagem))
                        : 20
                    }%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-emerald-800">
                <span>
                  Processando em lotes concorrentes (8 requisições simultâneas). Não feche esta
                  janela.
                </span>
                {progressoMesclagem?.total ? (
                  <span className="font-semibold text-emerald-900">
                    {progressoMesclagem.concluidos}/{progressoMesclagem.total} itens
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {/* Alerta de exclusão com segurança reforçada */}
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Garantia de segurança na unificação:</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              O cliente principal <strong>{clientePrincipal?.nome}</strong> permanecerá na base com
              todos os dados escolhidos. Os cadastros de{' '}
              <strong>
                {clientesSecundarios.map((s) => s.nome).join(', ') || 'nenhum secundário'}
              </strong>{' '}
              deixarão de existir como registros independentes, mas 100% dos seus negócios, usinas,
              atividades, orçamentos, contratos e histórico de WhatsApp serão repontados com
              segurança para o cliente principal.
            </p>
          </div>
        </div>

        {/* Rodapé com botões de ação */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            {isSubmitting && (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 mr-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mesclando registros...</span>
              </span>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!podeMesclar || isSubmitting}
              onClick={handleConfirmar}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unificando clientes...</span>
                </>
              ) : (
                <>
                  <GitMerge className="w-4 h-4" />
                  <span>{`Confirmar e Mesclar ${clientesParticipantes.length} Clientes`}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default ModalMesclarClientes

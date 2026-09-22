import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Loader2,
  Users,
  Briefcase,
  Wrench,
  FolderKanban,
  FileSignature,
  Building2,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { fetchOrdensServico } from '@/services/crmService'
import type { OrdemServico } from '@/types/crm'

export type SearchCategoryType =
  | 'clientes'
  | 'negocios'
  | 'ordens_servico'
  | 'projetos'
  | 'contratos_om'

export interface SearchResultItem {
  id: string
  category: SearchCategoryType
  title: string
  subtitle?: string
  badge?: string
  badgeColorClass?: string
  icon: React.ElementType
  clienteId?: string
  action: () => void
}

/**
 * Utilitário para destacar trechos de texto que batem com a busca
 */
export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <span>{text}</span>

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

const CATEGORY_CONFIG: Record<
  SearchCategoryType,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  clientes: {
    label: 'Clientes',
    icon: Users,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  negocios: {
    label: 'Negócios / Oportunidades',
    icon: Briefcase,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ordens_servico: {
    label: 'Ordens de Serviço / Manutenções',
    icon: Wrench,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  projetos: {
    label: 'Projetos Fotovoltaicos',
    icon: FolderKanban,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  contratos_om: {
    label: 'Contratos O&M',
    icon: FileSignature,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
  },
}

export const BarraBuscaGlobal: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate()
  const { clientes, contatosAdicionais, projetos, contratosOM, manutencoes, openFichaCliente } =
    useClientes()

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([])
  const [isLoadingOS, setIsLoadingOS] = useState(false)
  const [hasLoadedOS, setHasLoadedOS] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Carrega Ordens de Serviço sob demanda quando o usuário foca na busca
  const carregarOrdensServico = useCallback(async () => {
    if (hasLoadedOS || isLoadingOS) return
    try {
      setIsLoadingOS(true)
      const oss = await fetchOrdensServico()
      setOrdensServico(oss)
      setHasLoadedOS(true)
    } catch (err) {
      console.warn('Erro ao carregar OS para busca global:', err)
    } finally {
      setIsLoadingOS(false)
    }
  }, [hasLoadedOS, isLoadingOS])

  // Normalizador de texto para busca case-insensitive e acentos
  const normalize = (str?: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  const trimmedQuery = query.trim()
  const normalizedQuery = normalize(trimmedQuery)

  // Mapeia os resultados por categoria
  const resultsGrouped = useMemo(() => {
    if (normalizedQuery.length < 2) {
      return {
        clientes: [],
        negocios: [],
        ordens_servico: [],
        projetos: [],
        contratos_om: [],
      }
    }

    // 1. Clientes (nome, cidade, email, telefone, whatsapp, doc)
    const matchedClientes: SearchResultItem[] = []
    const matchedClienteIds = new Set<string>()

    clientes.forEach((cli) => {
      const matchNome = normalize(cli.nome).includes(normalizedQuery)
      const matchFantasia = normalize(cli.nome_fantasia).includes(normalizedQuery)
      const matchRazao = normalize(cli.razao_social).includes(normalizedQuery)
      const matchCidade = normalize(cli.cidade).includes(normalizedQuery)
      const matchEmail = normalize(cli.email).includes(normalizedQuery)
      const matchTelefone = normalize(cli.telefone).includes(normalizedQuery)
      const matchWhats = normalize(cli.whatsapp).includes(normalizedQuery)
      const matchCnpj = normalize(cli.cnpj).includes(normalizedQuery)
      const matchCpf = normalize(cli.cpf).includes(normalizedQuery)

      if (
        matchNome ||
        matchFantasia ||
        matchRazao ||
        matchCidade ||
        matchEmail ||
        matchTelefone ||
        matchWhats ||
        matchCnpj ||
        matchCpf
      ) {
        matchedClienteIds.add(cli.id)

        // Detalhe prioritário para exibir
        const detalhes: string[] = []
        if (cli.cidade) detalhes.push(cli.cidade)
        if (cli.telefone || cli.whatsapp) detalhes.push(cli.telefone || cli.whatsapp || '')
        if (cli.email) detalhes.push(cli.email)

        matchedClientes.push({
          id: `cliente-${cli.id}`,
          category: 'clientes',
          title: cli.nome || cli.razao_social || 'Cliente sem nome',
          subtitle: detalhes.join(' • ') || 'Cliente cadastrado',
          badge: cli.cidade || (cli.tipo_cliente ? String(cli.tipo_cliente) : undefined),
          badgeColorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Users,
          clienteId: cli.id,
          action: () => {
            openFichaCliente(cli.id)
            setIsOpen(false)
          },
        })
      }
    })

    // 1b. Contatos adicionais vinculados aos clientes (comportamento aditivo)
    // Quando o usuário digitar o nome/cargo/fone/email de um contato adicional,
    // exibe o CLIENTE PAI com badge "Encontrado via contato: [Nome]"
    contatosAdicionais.forEach((contato) => {
      const matchNomeContato = normalize(contato.nome).includes(normalizedQuery)
      const matchCargoContato = normalize(contato.cargo).includes(normalizedQuery)
      const matchTelefoneContato = normalize(contato.telefone).includes(normalizedQuery)
      const matchEmailContato = normalize(contato.email).includes(normalizedQuery)

      if (matchNomeContato || matchCargoContato || matchTelefoneContato || matchEmailContato) {
        const clientePai = clientes.find((c) => c.id === contato.cliente)
        if (!clientePai) return

        // Se o cliente pai já foi encontrado diretamente pelo nome/dados cadastrais,
        // podemos atualizar o badge ou adicionar uma indicação clara sem duplicar o id de resultado
        const jaInseridoDireto = matchedClienteIds.has(clientePai.id)

        if (jaInseridoDireto) {
          // Atualiza o item existente para destacar o badge do contato adicional encontrado
          const indexExistente = matchedClientes.findIndex(
            (item) => item.clienteId === clientePai.id,
          )
          if (indexExistente !== -1) {
            matchedClientes[indexExistente] = {
              ...matchedClientes[indexExistente],
              badge: `Encontrado via contato: ${contato.nome}`,
              badgeColorClass: 'bg-teal-50 text-teal-800 border-teal-300 font-semibold',
            }
          }
        } else {
          matchedClienteIds.add(clientePai.id)

          const detalhesContato: string[] = []
          if (contato.cargo) detalhesContato.push(contato.cargo)
          if (contato.telefone) detalhesContato.push(contato.telefone)
          if (contato.email) detalhesContato.push(contato.email)
          if (clientePai.cidade) detalhesContato.push(clientePai.cidade)

          matchedClientes.push({
            id: `cliente-${clientePai.id}-via-contato-${contato.id}`,
            category: 'clientes',
            title: clientePai.nome || clientePai.razao_social || 'Cliente sem nome',
            subtitle: `Contato: ${contato.nome}${detalhesContato.length > 0 ? ` (${detalhesContato.join(' • ')})` : ''}`,
            badge: `Encontrado via contato: ${contato.nome}`,
            badgeColorClass: 'bg-teal-50 text-teal-800 border-teal-300 font-semibold',
            icon: Users,
            clienteId: clientePai.id,
            action: () => {
              openFichaCliente(clientePai.id)
              setIsOpen(false)
            },
          })
        }
      }
    })

    // 2. Negócios / Oportunidades do Funil Comercial
    // Clientes que possuem status de funil ativo ou que o usuário buscou por valor/etapa/produto
    const matchedNegocios: SearchResultItem[] = []
    clientes.forEach((cli) => {
      const statusFunil = cli.status || 'Novo Lead'
      const matchStatus = normalize(statusFunil).includes(normalizedQuery)
      const matchProduto = normalize(cli.produto).includes(normalizedQuery)
      const matchNome = normalize(cli.nome).includes(normalizedQuery)
      const matchOrigem = normalize(cli.origem_lead).includes(normalizedQuery)

      // Se der match na etapa ou produto, ou se buscou o nome e o cliente está no funil comercial
      if (
        matchStatus ||
        matchProduto ||
        (matchNome &&
          [
            'Novo Lead',
            'Levantamento',
            'Orçamento',
            'Negociação',
            'Fechado',
            'Contato Futuro',
          ].includes(cli.status))
      ) {
        const valorFormatado = cli.valor_estimado
          ? `R$ ${Number(cli.valor_estimado).toLocaleString('pt-BR')}`
          : 'Sem valor definido'
        const subtitulo = `${cli.nome} • ${valorFormatado} • ${cli.produto || 'Energia Solar'}`

        matchedNegocios.push({
          id: `negocio-${cli.id}`,
          category: 'negocios',
          title: `Oportunidade: ${cli.nome}`,
          subtitle: subtitulo,
          badge: statusFunil,
          badgeColorClass:
            statusFunil === 'Fechado'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : statusFunil === 'Negociação'
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Briefcase,
          clienteId: cli.id,
          action: () => {
            openFichaCliente(cli.id, 'historico')
            setIsOpen(false)
          },
        })
      }
    })

    // 3. Ordens de Serviço & Manutenções (número/id, tipo, descrição, técnico, cliente)
    const matchedOS: SearchResultItem[] = []
    const seenOSIds = new Set<string>()

    // Da tabela ordens_servico
    ordensServico.forEach((os) => {
      const clienteNome = os.expand?.cliente_id?.nome || os.expand?.cliente_id?.razao_social || ''
      const matchId = normalize(os.id).includes(normalizedQuery)
      const matchTipo = normalize(os.tipo_servico).includes(normalizedQuery)
      const matchCliente = normalize(clienteNome).includes(normalizedQuery)
      const matchTecnico = normalize(os.atribuida_a).includes(normalizedQuery)
      const matchDesc = normalize(os.detalhes_execucao || os.instrucoes).includes(normalizedQuery)
      const matchEnd = normalize(os.endereco).includes(normalizedQuery)

      if (matchId || matchTipo || matchCliente || matchTecnico || matchDesc || matchEnd) {
        seenOSIds.add(os.id)
        matchedOS.push({
          id: `os-${os.id}`,
          category: 'ordens_servico',
          title: `OS #${os.id.slice(-6).toUpperCase()} - ${os.tipo_servico}`,
          subtitle: `${clienteNome || 'Cliente não identificado'} • ${os.atribuida_a ? `Técnico: ${os.atribuida_a}` : os.endereco || 'Campo'}`,
          badge: os.status === 'concluida' ? 'Concluída' : 'Pendente',
          badgeColorClass:
            os.status === 'concluida'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Wrench,
          clienteId: os.cliente_id,
          action: () => {
            if (os.cliente_id) {
              openFichaCliente(os.cliente_id, 'om')
            } else {
              navigate('/execucao-os')
            }
            setIsOpen(false)
          },
        })
      }
    })

    // Das manutenções legadas (caso existam e não estejam duplicadas)
    manutencoes.forEach((m) => {
      if (seenOSIds.has(m.id)) return
      const cli = clientes.find((c) => c.id === m.cliente_id)
      const cliNome = cli?.nome || ''
      const matchTipo = normalize(m.tipo).includes(normalizedQuery)
      const matchCli = normalize(cliNome).includes(normalizedQuery)
      const matchTec = normalize(m.tecnico).includes(normalizedQuery)
      const matchDesc = normalize(m.descricao).includes(normalizedQuery)

      if (matchTipo || matchCli || matchTec || matchDesc) {
        matchedOS.push({
          id: `manutencao-${m.id}`,
          category: 'ordens_servico',
          title: `Manutenção: ${m.tipo}`,
          subtitle: `${cliNome || 'Cliente'} • ${m.tecnico || 'Equipe O&M'}${m.descricao ? ` • ${m.descricao}` : ''}`,
          badge: m.status,
          badgeColorClass:
            m.status === 'Concluído'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Wrench,
          clienteId: m.cliente_id,
          action: () => {
            openFichaCliente(m.cliente_id, 'om')
            setIsOpen(false)
          },
        })
      }
    })

    // 4. Projetos Fotovoltaicos
    const matchedProjetos: SearchResultItem[] = []
    projetos.forEach((proj) => {
      const cli = clientes.find((c) => c.id === proj.cliente_id)
      const cliNome = cli?.nome || ''
      const matchEtapa = normalize(proj.etapa).includes(normalizedQuery)
      const matchCli = normalize(cliNome).includes(normalizedQuery)
      const matchCidade = normalize(proj.cidade).includes(normalizedQuery)
      const matchProf = normalize(proj.profissional_nome).includes(normalizedQuery)
      const matchObs = normalize(proj.observacoes).includes(normalizedQuery)

      if (matchEtapa || matchCli || matchCidade || matchProf || matchObs) {
        matchedProjetos.push({
          id: `projeto-${proj.id}`,
          category: 'projetos',
          title: `Projeto: ${cliNome || 'Sem cliente'}`,
          subtitle: `${proj.etapa} • ${proj.potencia_kwp ? `${proj.potencia_kwp} kWp` : ''} • ${proj.cidade || ''}`,
          badge: proj.etapa,
          badgeColorClass: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: FolderKanban,
          clienteId: proj.cliente_id,
          action: () => {
            openFichaCliente(proj.cliente_id, 'projeto')
            setIsOpen(false)
          },
        })
      }
    })

    // 5. Contratos O&M
    const matchedContratos: SearchResultItem[] = []
    contratosOM.forEach((ct) => {
      const cli = clientes.find((c) => c.id === ct.cliente_id)
      const cliNome = cli?.nome || ''
      const matchPlano = normalize(ct.plano).includes(normalizedQuery)
      const matchNumero = normalize(ct.numero_contrato).includes(normalizedQuery)
      const matchCli = normalize(cliNome).includes(normalizedQuery)
      const matchStatus = normalize(ct.status).includes(normalizedQuery)

      if (matchPlano || matchNumero || matchCli || matchStatus) {
        matchedContratos.push({
          id: `contrato-${ct.id}`,
          category: 'contratos_om',
          title: `Contrato O&M: ${cliNome || 'Cliente'} (${ct.plano})`,
          subtitle: `${ct.numero_contrato ? `Nº ${ct.numero_contrato} • ` : ''}${ct.valor_mensal !== undefined && ct.valor_mensal !== null && !isNaN(Number(ct.valor_mensal)) ? `R$ ${ct.valor_mensal}/mês` : 'Valor a definir'} • Status: ${ct.status || 'Ativo'}`,
          badge: ct.plano,
          badgeColorClass: 'bg-teal-100 text-teal-800 border-teal-200',
          icon: FileSignature,
          clienteId: ct.cliente_id,
          action: () => {
            openFichaCliente(ct.cliente_id, 'om')
            setIsOpen(false)
          },
        })
      }
    })

    return {
      clientes: matchedClientes.slice(0, 6),
      negocios: matchedNegocios.slice(0, 5),
      ordens_servico: matchedOS.slice(0, 5),
      projetos: matchedProjetos.slice(0, 4),
      contratos_om: matchedContratos.slice(0, 4),
    }
  }, [
    normalizedQuery,
    clientes,
    contatosAdicionais,
    ordensServico,
    manutencoes,
    projetos,
    contratosOM,
    openFichaCliente,
    navigate,
  ])

  // Lista plana de itens visíveis para permitir navegação por teclado (ArrowUp / ArrowDown / Enter)
  const flatResults = useMemo(() => {
    const list: SearchResultItem[] = []
    list.push(...resultsGrouped.clientes)
    list.push(...resultsGrouped.negocios)
    list.push(...resultsGrouped.ordens_servico)
    list.push(...resultsGrouped.projetos)
    list.push(...resultsGrouped.contratos_om)
    return list
  }, [resultsGrouped])

  const totalResultsCount = flatResults.length

  // Reseta índice selecionado quando a lista muda
  useEffect(() => {
    setSelectedIndex(0)
  }, [trimmedQuery])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Gerenciamento de teclas de atalho: ArrowDown, ArrowUp, Enter, Escape, e Ctrl+K / Cmd+K para focar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+K ou Ctrl+K foca a barra de busca
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
      return
    }

    if (!isOpen || flatResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % flatResults.length)
      scrollActiveIntoView((selectedIndex + 1) % flatResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length)
      scrollActiveIntoView((selectedIndex - 1 + flatResults.length) % flatResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selectedItem = flatResults[selectedIndex]
      if (selectedItem) {
        selectedItem.action()
      }
    }
  }

  const scrollActiveIntoView = (index: number) => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-search-item]')
    const target = items[index] as HTMLElement | undefined
    if (target) {
      target.scrollIntoView({ block: 'nearest' })
    }
  }

  const handleClear = () => {
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  let runningItemIndex = -1

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Campo de Busca Estilo Pipedrive */}
      <div className="relative flex items-center w-full">
        <div className="absolute left-3 sm:left-3.5 flex items-center pointer-events-none text-gray-400">
          {isLoadingOS ? (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            carregarOrdensServico()
            if (trimmedQuery.length >= 2) {
              setIsOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar no CRM (clientes, negócios, OS, contratos...)"
          aria-label="Pesquisar no CRM"
          className="w-full h-10 sm:h-11 pl-9 sm:pl-10 pr-20 sm:pr-24 text-xs sm:text-sm font-medium text-gray-900 bg-gray-50/90 hover:bg-gray-100/90 focus:bg-white rounded-full border border-gray-200/90 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all outline-hidden placeholder:text-gray-400"
        />

        {/* Botão de Limpar e Atalho Cmd+K */}
        <div className="absolute right-2 sm:right-3 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded-md">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown de Resultados em Tempo Real */}
      {isOpen && trimmedQuery.length >= 2 && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-200/90 shadow-2xl z-50 overflow-hidden max-h-[75vh] sm:max-h-[500px] flex flex-col animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Cabeçalho do Dropdown */}
          <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">
                {totalResultsCount} resultado{totalResultsCount === 1 ? '' : 's'}
              </span>
              <span>para &ldquo;{trimmedQuery}&rdquo;</span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 bg-white border rounded text-[10px]">↑</kbd>
                <kbd className="px-1 py-0.2 bg-white border rounded text-[10px]">↓</kbd> navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border rounded text-[10px]">↵</kbd> abrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 bg-white border rounded text-[10px]">esc</kbd> fechar
              </span>
            </div>
          </div>

          {/* Conteúdo com scroll */}
          <div className="overflow-y-auto divide-y divide-gray-100/80 p-2 space-y-3">
            {totalResultsCount === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-800">
                  Nenhum resultado para &ldquo;{trimmedQuery}&rdquo;
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Tente pesquisar por outro nome, telefone, cidade, número de OS ou contrato.
                </p>
              </div>
            ) : (
              (
                [
                  'clientes',
                  'negocios',
                  'ordens_servico',
                  'projetos',
                  'contratos_om',
                ] as SearchCategoryType[]
              ).map((catKey) => {
                const items = resultsGrouped[catKey]
                if (!items || items.length === 0) return null
                const catConfig = CATEGORY_CONFIG[catKey]
                const CatIcon = catConfig.icon

                return (
                  <div key={catKey} className="pt-2 first:pt-0">
                    {/* Título da Categoria */}
                    <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <CatIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{catConfig.label}</span>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full">
                        {items.length}
                      </span>
                    </div>

                    {/* Lista de Itens */}
                    <div className="mt-1 space-y-1">
                      {items.map((item) => {
                        runningItemIndex += 1
                        const isSelected = runningItemIndex === selectedIndex
                        const itemIndex = runningItemIndex

                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-search-item
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-3 group ${
                              isSelected
                                ? 'bg-emerald-50/90 text-emerald-950 ring-1 ring-emerald-500/30'
                                : 'hover:bg-gray-50 text-gray-800'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                                }`}
                              >
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-2">
                                  <HighlightMatch text={item.title} query={trimmedQuery} />
                                  {item.badge && (
                                    <span
                                      className={`inline-flex text-[10px] font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${
                                        item.badgeColorClass ||
                                        'bg-gray-100 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.subtitle && (
                                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                    <HighlightMatch text={item.subtitle} query={trimmedQuery} />
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5 text-gray-400 group-hover:text-emerald-600">
                              {isSelected ? (
                                <span className="text-[11px] font-medium text-emerald-700 hidden sm:flex items-center gap-0.5">
                                  Abrir <CornerDownLeft className="w-3 h-3" />
                                </span>
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Rodapé informativo */}
          {totalResultsCount > 0 && (
            <div className="p-2.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 px-4">
              <span>
                Pressione{' '}
                <kbd className="px-1 py-0.5 bg-white border rounded font-mono text-[10px]">
                  Enter
                </kbd>{' '}
                para abrir o item selecionado
              </span>
              <span
                className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                onClick={() => navigate('/clientes')}
              >
                Ver todos os clientes →
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

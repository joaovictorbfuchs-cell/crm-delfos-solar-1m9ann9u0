import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  KanbanSquare,
  CalendarCheck,
  Users,
  Wrench,
  Menu as MenuIcon,
  LayoutDashboard,
  FolderKanban,
  Sun,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  ListChecks,
  Cpu,
  Images,
  Truck,
  Contact,
  UserCog,
  LogOut,
  X,
  Plus,
  Filter,
  Check,
  ChevronDown,
  BookOpen,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DelfosLogo } from '@/components/DelfosLogo'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { MobileFiltrosDrawer } from '@/components/MobileFiltrosDrawer'
import { NovoLeadModal } from '@/components/NovoLeadModal'
import { TIPOS_VENDA_OPTIONS } from '@/constants/tipoVenda'
import { AssistenteDelfosBotao } from '@/components/AssistenteDelfosChat'

interface MobileLayoutChromeProps {
  isAdmin: boolean
  isInstalador: boolean
  displayName: string
  displayEmail: string
  userInitial: string
  appVersion: string
  pendentesWhatsAppCount: number
  profissionais?: Array<{ id: string; nome?: string; name?: string }>
  onLogout: () => void
}

export const MobileLayoutChrome: React.FC<MobileLayoutChromeProps> = ({
  isAdmin,
  isInstalador,
  displayName,
  displayEmail,
  userInitial,
  appVersion,
  pendentesWhatsAppCount,
  profissionais = [],
  onLogout,
}) => {
  const location = useLocation()
  const navigate = useNavigate()

  const { refreshData } = useClientes()
  const [menuMaisOpen, setMenuMaisOpen] = useState(false)
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const [modalNovoLeadOpen, setModalNovoLeadOpen] = useState(false)
  const [isRefreshingMobile, setIsRefreshingMobile] = useState(false)

  const handleMobileRefresh = async () => {
    if (isRefreshingMobile) return
    setIsRefreshingMobile(true)
    try {
      if (typeof refreshData === 'function') {
        await refreshData()
      }
      window.dispatchEvent(new CustomEvent('delfos:recarregar-dados'))
    } catch (err) {
      console.error('Erro ao atualizar dados mobile:', err)
    } finally {
      setIsRefreshingMobile(false)
    }
  }

  // Filtros locais aplicáveis nas telas
  const [comercialTipoVenda, setComercialTipoVenda] = useState('todos')
  const [clientesStatus, setClientesStatus] = useState('todos')
  const [projetosProfissional, setProjetosProfissional] = useState('todos')

  // Identificação do título central do funil / aba atual
  const currentFunil = React.useMemo(() => {
    if (location.pathname === '/comercial') {
      return { id: 'comercial', label: 'Funil Comercial', isFunil: true }
    }
    if (location.pathname === '/projetos') {
      return { id: 'projetos', label: 'Funil de Projetos', isFunil: true }
    }
    if (location.pathname === '/central-atividades') {
      return { id: 'central-atividades', label: 'Central de Atividades', isFunil: false }
    }
    if (location.pathname === '/clientes') {
      return { id: 'clientes', label: 'Clientes', isFunil: false }
    }
    if (
      location.pathname === '/servicos-campo' ||
      location.pathname === '/execucao-os' ||
      location.pathname === '/minhas-os'
    ) {
      return { id: 'servicos-campo', label: 'Serviços de Campo', isFunil: false }
    }
    if (location.pathname === '/') {
      return { id: 'dashboard', label: 'Dashboard', isFunil: false }
    }
    if (location.pathname === '/propostas' || location.pathname === '/orcamentos') {
      return { id: 'propostas', label: 'Propostas & Orçamentos', isFunil: false }
    }
    if (
      location.pathname === '/manutencoes' ||
      location.pathname === '/clientes-pos-vendas' ||
      location.pathname === '/pos-vendas'
    ) {
      return { id: 'manutencoes', label: 'O&M / Manutenções', isFunil: false }
    }
    if (location.pathname === '/central-atendimento') {
      return { id: 'central-atendimento', label: 'Central WhatsApp', isFunil: false }
    }
    if (location.pathname === '/automacoes') {
      return { id: 'automacoes', label: 'Automações do CRM', isFunil: false }
    }
    if (location.pathname === '/equipamentos') {
      return { id: 'equipamentos', label: 'Equipamentos', isFunil: false }
    }
    if (location.pathname === '/ativos') {
      return { id: 'ativos', label: 'Ativos das Usinas', isFunil: false }
    }
    if (location.pathname === '/gerenciar-usuarios') {
      return { id: 'gerenciar-usuarios', label: 'Gerenciar Usuários', isFunil: false }
    }
    return { id: 'crm', label: 'Comercial', isFunil: true }
  }, [location.pathname])

  // Ação ao clicar no botão (+) do Header Mobile
  const handleNovoClick = () => {
    if (location.pathname === '/comercial') {
      window.dispatchEvent(new CustomEvent('delfos:abrir-novo-lead'))
    } else if (location.pathname === '/projetos') {
      window.dispatchEvent(new CustomEvent('delfos:abrir-novo-lead'))
    } else if (location.pathname === '/clientes') {
      window.dispatchEvent(new CustomEvent('delfos:abrir-novo-lead'))
    } else {
      // Abre modal fallback universal de novo lead
      setModalNovoLeadOpen(true)
    }
  }

  // Grupos de filtros para o drawer de filtros
  const filterGroups = React.useMemo(() => {
    if (location.pathname === '/comercial') {
      return [
        {
          id: 'tipo_venda',
          label: 'Tipo de Venda',
          selectedValue: comercialTipoVenda,
          options: [
            { id: 'todos', label: 'Todos os tipos' },
            ...TIPOS_VENDA_OPTIONS.map((t) => ({ id: t, label: t })),
          ],
          onChange: (val: string) => {
            setComercialTipoVenda(val)
            window.dispatchEvent(
              new CustomEvent('delfos:mobile-filter-change', {
                detail: { tipoVenda: val },
              }),
            )
          },
        },
      ]
    }
    if (location.pathname === '/clientes') {
      return [
        {
          id: 'status_cliente',
          label: 'Status do Cliente',
          selectedValue: clientesStatus,
          options: [
            { id: 'todos', label: 'Todos os status' },
            { id: 'Novo Lead', label: 'Novo Lead' },
            { id: 'Contato Feito', label: 'Contato Feito' },
            { id: 'Visita Agendada', label: 'Visita Agendada' },
            { id: 'Proposta Enviada', label: 'Proposta Enviada' },
            { id: 'Em Negociação', label: 'Em Negociação' },
            { id: 'Fechado', label: 'Fechado' },
            { id: 'Perdido', label: 'Perdido' },
          ],
          onChange: (val: string) => {
            setClientesStatus(val)
            window.dispatchEvent(
              new CustomEvent('delfos:mobile-filter-change', {
                detail: { statusFilter: val },
              }),
            )
          },
        },
      ]
    }
    if (location.pathname === '/projetos') {
      return [
        {
          id: 'profissional',
          label: 'Responsável Técnico',
          selectedValue: projetosProfissional,
          options: [
            { id: 'todos', label: 'Todos os profissionais' },
            ...profissionais.map((p) => ({ id: p.id, label: p.nome || p.name || 'Profissional' })),
          ],
          onChange: (val: string) => {
            setProjetosProfissional(val)
            window.dispatchEvent(
              new CustomEvent('delfos:mobile-filter-change', {
                detail: { profissionalId: val },
              }),
            )
          },
        },
      ]
    }
    return []
  }, [location.pathname, comercialTipoVenda, clientesStatus, projetosProfissional, profissionais])

  const activeFiltersCount =
    (comercialTipoVenda !== 'todos' && location.pathname === '/comercial' ? 1 : 0) +
    (clientesStatus !== 'todos' && location.pathname === '/clientes' ? 1 : 0) +
    (projetosProfissional !== 'todos' && location.pathname === '/projetos' ? 1 : 0)

  // Itens da bottom bar enxuta: se instalador, apenas Serviços de Campo
  const bottomBarTabs = isInstalador
    ? [
        {
          id: 'servicos-campo',
          label: 'Serviços de Campo',
          path: '/servicos-campo',
          icon: Wrench,
          isActive: true,
        },
      ]
    : [
        {
          id: 'comercial',
          label: 'Comercial',
          path: '/comercial',
          icon: KanbanSquare,
          isActive: location.pathname === '/comercial',
        },
        {
          id: 'central-atividades',
          label: 'Atividades',
          path: '/central-atividades',
          icon: Layers,
          isActive: location.pathname === '/central-atividades',
        },
        {
          id: 'clientes',
          label: 'Clientes',
          path: '/clientes',
          icon: Users,
          isActive: location.pathname === '/clientes',
        },
        {
          id: 'servicos-campo',
          label: 'Serviços de campo',
          path: '/servicos-campo',
          icon: Wrench,
          isActive:
            location.pathname === '/servicos-campo' ||
            location.pathname === '/execucao-os' ||
            location.pathname === '/minhas-os',
        },
      ]

  // Menu Mais com todas as rotas existentes (se instalador, apenas Serviços de Campo)
  const menuMaisSections = isInstalador
    ? [
        {
          title: 'Operação',
          items: [
            {
              label: 'Serviços de Campo',
              path: '/servicos-campo',
              icon: Wrench,
            },
          ],
        },
      ]
    : [
        {
          title: 'Principal',
          items: [
            { label: 'Dashboard', path: '/', icon: LayoutDashboard },
            { label: 'Funil Comercial', path: '/comercial', icon: KanbanSquare },
            { label: 'Funil de Projetos', path: '/projetos', icon: FolderKanban },
            { label: 'Propostas & Orçamentos', path: '/propostas', icon: Sun },
            { label: 'Central de Atividades', path: '/central-atividades', icon: Layers },
            { label: 'Gestão de Clientes', path: '/clientes', icon: Users },
            { label: 'Contatos', path: '/contatos', icon: Contact },
            { label: 'Base de Conhecimento', path: '/base-conhecimento', icon: BookOpen },
          ],
        },
        {
          title: 'Operação e Serviços',
          items: [
            {
              label: 'Serviços de Campo',
              path: '/servicos-campo',
              icon: Wrench,
            },
            { label: 'O&M / Manutenções', path: '/manutencoes', icon: ShieldCheck },
            {
              label: 'Central WhatsApp',
              path: '/central-atendimento',
              icon: WhatsAppIcon,
              badge: pendentesWhatsAppCount,
            },
          ],
        },
        {
          title: 'Configurações & Gestão',
          items: [
            { label: 'Automações do CRM', path: '/automacoes', icon: Zap },
            { label: 'Equipamentos', path: '/equipamentos', icon: Cpu },
            { label: 'Ativos das Usinas', path: '/ativos', icon: Cpu },
            { label: 'Galeria de Usinas', path: '/instalacoes-galeria', icon: Images },
            { label: 'Fornecedores', path: '/fornecedores', icon: Truck },
            { label: 'Importar Clientes', path: '/importar-clientes', icon: FileSpreadsheet },
            ...(isAdmin
              ? [{ label: 'Gerenciar Usuários', path: '/gerenciar-usuarios', icon: UserCog }]
              : []),
          ],
        },
      ]

  return (
    <>
      {/* ============================================================== */}
      {/* 1. HEADER MOBILE SIMPLIFICADO (APENAS MOBILE: lg:hidden)       */}
      {/* ============================================================== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200/90 z-30 px-3 flex items-center justify-between shadow-2xs select-none">
        {/* Lado Esquerdo: Ícone de Filtro (ou Logo para instalador) */}
        <div className="flex items-center">
          {!isInstalador ? (
            <button
              type="button"
              onClick={() => setFiltrosOpen(true)}
              aria-label="Abrir filtros"
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all"
              title="Filtros"
            >
              <Filter className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
              )}
            </button>
          ) : (
            <div className="pl-1">
              <DelfosLogo height={28} />
            </div>
          )}
        </div>

        {/* Centro: Nome do funil/tela atual com seta/dropdown para alternar funil e telas principais (apenas para Admin) */}
        <div className="flex-1 min-w-0 flex items-center justify-center px-1">
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 active:bg-gray-200/80 transition-colors max-w-full cursor-pointer focus:outline-none"
                  title="Clique para alternar funis e navegação"
                >
                  <span className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                    {currentFunil.label}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-60 p-1.5">
                <DropdownMenuLabel className="text-[11px] text-gray-400 uppercase tracking-wider px-2 py-1">
                  Alternar Funil & Telas
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigate('/comercial')}
                  className={`flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs font-semibold ${
                    location.pathname === '/comercial'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <KanbanSquare className="w-4 h-4 text-emerald-600" />
                    <span>Funil Comercial</span>
                  </div>
                  {location.pathname === '/comercial' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate('/projetos')}
                  className={`flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs font-semibold ${
                    location.pathname === '/projetos'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-blue-600" />
                    <span>Funil de Projetos</span>
                  </div>
                  {location.pathname === '/projetos' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                  onClick={() => navigate('/central-atividades')}
                  className={`flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs font-medium ${
                    location.pathname === '/central-atividades'
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Central de Atividades</span>
                  </div>
                  {location.pathname === '/central-atividades' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate('/clientes')}
                  className={`flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs font-medium ${
                    location.pathname === '/clientes'
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Gestão de Clientes</span>
                  </div>
                  {location.pathname === '/clientes' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate('/manutencoes')}
                  className={`flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-xs font-medium ${
                    location.pathname === '/manutencoes'
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>O&M / Manutenções</span>
                  </div>
                  {location.pathname === '/manutencoes' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
              Serviços de Campo
            </span>
          )}
        </div>

        {/* Lado Direito: Assistente Delfos (ícone redondo pequeno) + Botão (+) Novo Negócio + Ícone do WhatsApp */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botão do Assistente Inteligente Delfos no topo do mobile (para Admin) */}
          {isAdmin && <AssistenteDelfosBotao size="sm" />}

          {isAdmin &&
            !(
              location.pathname === '/servicos-campo' ||
              location.pathname === '/execucao-os' ||
              location.pathname === '/minhas-os'
            ) && (
              <>
                {/* Botão + para adicionar novo negócio (lead/deal) */}
                <button
                  type="button"
                  onClick={handleNovoClick}
                  aria-label="Adicionar novo negócio"
                  title="Adicionar novo negócio / lead"
                  className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Botão de atualizar no mobile posicionado à ESQUERDA do botão de WhatsApp */}
                <button
                  type="button"
                  onClick={handleMobileRefresh}
                  disabled={isRefreshingMobile}
                  aria-label="Atualizar dados do sistema"
                  title="Atualizar dados"
                  className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-emerald-50 active:scale-95 border border-gray-200 hover:border-emerald-200 text-gray-700 hover:text-emerald-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-emerald-600 ${isRefreshingMobile ? 'animate-spin' : ''}`}
                  />
                </button>

                {/* Ícone do WhatsApp presente nas demais abas mobile */}
                <button
                  type="button"
                  onClick={() => navigate('/central-atendimento')}
                  aria-label="Central de Atendimento WhatsApp"
                  title="Abrir Central WhatsApp"
                  className="relative w-9 h-9 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white flex items-center justify-center shadow-xs transition-all"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  {pendentesWhatsAppCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 flex items-center justify-center text-[10px] font-black rounded-full bg-red-600 text-white ring-2 ring-white shadow-xs">
                      {pendentesWhatsAppCount > 99 ? '99+' : pendentesWhatsAppCount}
                    </span>
                  )}
                </button>
              </>
            )}

          {/* Ações do topo para Instalador: Atualizar e Sair */}
          {isInstalador && (
            <>
              <button
                type="button"
                onClick={handleMobileRefresh}
                disabled={isRefreshingMobile}
                aria-label="Atualizar dados"
                title="Atualizar dados"
                className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-emerald-50 active:scale-95 border border-gray-200 text-gray-700 hover:text-emerald-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 text-emerald-600 ${isRefreshingMobile ? 'animate-spin' : ''}`}
                />
              </button>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sair da conta"
                title="Sair"
                className="h-9 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 border border-red-200 text-red-600 hover:text-red-700 flex items-center gap-1 text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>Sair</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. BOTTOM BAR SIMPLIFICADA (APENAS MOBILE: lg:hidden)          */}
      {/* Oculta para Instalador (apenas 1 tela de operação);            */}
      {/* Admin mantém as 5 abas normais: Comercial, Ativ, Cli, OS, Mais */}
      {/* ============================================================== */}
      {!isInstalador && (
        <nav
          aria-label="Navegação inferior mobile"
          className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200/90 z-30 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] select-none flex items-center justify-around"
        >
          {bottomBarTabs.map((tab) => {
            const IconComponent = tab.icon
            const isActive = tab.isActive

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.path)}
                aria-label={tab.label}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1 h-full transition-all active:scale-95 cursor-pointer relative ${
                  isActive ? 'text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {/* Indicador superior fino de aba ativa */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-600 rounded-b-full" />
                )}
                <div
                  className={`p-1 rounded-xl transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] tracking-tight leading-tight truncate max-w-full mt-0.5 ${
                    isActive ? 'font-bold text-emerald-700' : 'font-medium text-gray-500'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}

          {/* 5ª aba: Mais (ou Menu) - abre drawer com navegações restantes */}
          <button
            type="button"
            onClick={() => setMenuMaisOpen(true)}
            aria-label="Mais opções e navegação completa"
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 h-full transition-all active:scale-95 cursor-pointer relative ${
              menuMaisOpen ? 'text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {menuMaisOpen && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-600 rounded-b-full" />
            )}
            <div
              className={`p-1 rounded-xl transition-colors ${
                menuMaisOpen ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'
              }`}
            >
              <MenuIcon className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] tracking-tight leading-tight truncate max-w-full mt-0.5 ${
                menuMaisOpen ? 'font-bold text-emerald-700' : 'font-medium text-gray-500'
              }`}
            >
              Mais
            </span>
          </button>
        </nav>
      )}

      {/* ============================================================== */}
      {/* 3. DRAWER DO MENU "MAIS" COM TODAS AS NAVEGAÇÕES PRESERVADAS   */}
      {/* ============================================================== */}
      <Dialog open={menuMaisOpen} onOpenChange={setMenuMaisOpen}>
        <DialogContent className="lg:hidden p-0 max-w-md w-full h-[90vh] max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
          {/* Header do Menu Mais */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <DelfosLogo height={32} />
              <div className="border-l border-gray-200 pl-2.5">
                <span className="text-xs font-bold text-gray-900 block leading-tight">
                  Menu Delfos
                </span>
                <span className="text-[10px] text-gray-400 font-mono">v{appVersion}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMenuMaisOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista de seções e rotas preservadas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {menuMaisSections.map((sec) => (
              <div key={sec.title} className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
                  {sec.title}
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {sec.items.map((item) => {
                    const ItemIcon = item.icon
                    const isItemActive = location.pathname === item.path

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMenuMaisOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                          isItemActive
                            ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60 shadow-2xs'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ItemIcon
                            className={`w-4 h-4 shrink-0 ${
                              isItemActive ? 'text-emerald-700' : 'text-gray-500'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer do Drawer com dados do Usuário e Logout */}
          <div className="p-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                  isAdmin ? 'bg-emerald-700' : 'bg-blue-600'
                }`}
              >
                {userInitial}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-gray-900 truncate block leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-gray-400 truncate block">{displayEmail}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMenuMaisOpen(false)
                onLogout()
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* 4. DRAWER DE FILTROS MOBILE (Acionado pelo ícone do Header)    */}
      {/* ============================================================== */}
      <MobileFiltrosDrawer
        isOpen={filtrosOpen}
        onClose={() => setFiltrosOpen(false)}
        title={`Filtros: ${currentFunil.label}`}
        description="Filtre e personalize a visualização atual no celular"
        groups={filterGroups}
        activeCount={activeFiltersCount}
        onClearAll={() => {
          setComercialTipoVenda('todos')
          setClientesStatus('todos')
          setProjetosProfissional('todos')
          window.dispatchEvent(
            new CustomEvent('delfos:mobile-filter-change', {
              detail: {
                tipoVenda: 'todos',
                statusFilter: 'todos',
                profissionalId: 'todos',
              },
            }),
          )
        }}
      />

      {/* ============================================================== */}
      {/* 5. MODAL GLOBAL DE NOVO LEAD PARA MOBILE (Acionado pelo +)     */}
      {/* ============================================================== */}
      <NovoLeadModal isOpen={modalNovoLeadOpen} onClose={() => setModalNovoLeadOpen(false)} />
    </>
  )
}

export default MobileLayoutChrome

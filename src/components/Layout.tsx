import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  CalendarCheck,
  ClipboardCheck,
  Wrench,
  Users,
  UserCog,
  FileSpreadsheet,
  Truck,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  MessageSquare,
  Settings,
  Shield,
  ShieldCheck,
  Images,
  Cpu,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useClientes } from '@/contexts/ClientesContext'
import { ModalGerenciarWhatsAppTemplates } from '@/components/ModalGerenciarWhatsAppTemplates'
import { ModalImportarPlanilhaTarifaria } from '@/components/ModalImportarPlanilhaTarifaria'
import { FichaClienteDrawer } from '@/components/FichaClienteDrawer'
import { DelfosLogo } from '@/components/DelfosLogo'
import { NotificacoesBell } from '@/components/NotificacoesBell'
import { BarraBuscaGlobal } from '@/components/BarraBuscaGlobal'

export default function Layout() {
  const { user, userProfile, isAdmin, isInstalador, logout } = useAuth()
  const { whatsAppConversas } = useClientes()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [modalWhatsAppTemplatesOpen, setModalWhatsAppTemplatesOpen] = useState(false)
  const [modalPlanilhaTarifariaOpen, setModalPlanilhaTarifariaOpen] = useState(false)

  // Contagem de atendimentos pendentes: Fila de Novos + conversas Em Atendimento com novas mensagens não lidas
  const pendentesWhatsAppCount = React.useMemo(() => {
    return whatsAppConversas.filter((c) => {
      if (c.status === 'novo') return true
      if (c.status === 'em_atendimento' && (c.reaberta_em || (c.nao_lidas && c.nao_lidas > 0))) {
        return true
      }
      return false
    }).length
  }, [whatsAppConversas])

  // Estado da sidebar colapsada para desktop, com persistência em localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('delfos_sidebar_collapsed')
      return saved === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('delfos_sidebar_collapsed', String(isSidebarCollapsed))
    } catch (e) {
      console.error('Falha ao salvar preferência da sidebar:', e)
    }
  }, [isSidebarCollapsed])

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard'
      case '/comercial':
        return 'Funil Comercial'
      case '/orcamentos':
      case '/propostas':
        return 'Propostas & Orçamentos Solares'
      case '/projetos':
        return 'Projetos & Pós-Venda'
      case '/atividades':
        return 'Atividades & Calendário'
      case '/execucao-os':
        return 'Execução de OS'
      case '/planos-om':
      case '/planos-monitoramento':
        return 'Planos de Monitoramento & O&M'
      case '/manutencoes':
        return 'Contratos & Manutenções (O&M)'
      case '/central-atendimento':
        return 'Central de Atendimento WhatsApp'
      case '/clientes':
        return 'Gestão de Clientes'
      case '/automacoes':
        return 'Automações do CRM'
      case '/equipamentos':
        return 'Cadastro de Equipamentos'
      case '/importar-clientes':
        return 'Importar Clientes (Pipedrive / Conta Azul)'
      case '/importar-acessos':
        return 'Importar Acessos & Monitoramento'
      case '/fornecedores':
        return 'Fornecedores de Equipamentos'
      case '/instalacoes-galeria':
        return 'Biblioteca de Instalações'
      case '/gerenciar-usuarios':
        return 'Gerenciar Usuários'
      default:
        return 'Delfos Solar CRM'
    }
  }

  // Se o usuário for instalador, mostra APENAS "Execução de OS"
  // Se for admin, mostra todos os itens incluindo Gerenciar Usuários
  const navItems: Array<{
    name: string
    path: string
    icon: React.ElementType
    badge?: number
  }> = isInstalador
    ? [{ name: 'Execução de OS', path: '/execucao-os', icon: ClipboardCheck }]
    : [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Comercial', path: '/comercial', icon: KanbanSquare },
        { name: 'Propostas', path: '/propostas', icon: Sun },
        { name: 'Projetos', path: '/projetos', icon: FolderKanban },
        { name: 'Atividades', path: '/atividades', icon: CalendarCheck },
        { name: 'Execução de OS', path: '/execucao-os', icon: ClipboardCheck },
        { name: 'Planos O&M', path: '/planos-om', icon: ShieldCheck },
        { name: 'O&M / Manutenções', path: '/manutencoes', icon: Wrench },
        { name: 'Automações', path: '/automacoes', icon: Zap },
        { name: 'Cadastro de Equipamentos', path: '/equipamentos', icon: Cpu },
        { name: 'Clientes', path: '/clientes', icon: Users },
        { name: 'Galeria Usinas', path: '/instalacoes-galeria', icon: Images },
        { name: 'Gerenciar Usuários', path: '/gerenciar-usuarios', icon: UserCog },
        { name: 'Importar Clientes', path: '/importar-clientes', icon: FileSpreadsheet },
        { name: 'Fornecedores', path: '/fornecedores', icon: Truck },
      ]

  const displayName = userProfile?.name || user?.name || 'Usuário'
  const displayEmail = userProfile?.email || user?.email || 'usuario@delfosengenharia.com.br'
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U'

  return (
    <div className="min-h-screen flex bg-[#F8FAF9] text-[#1F2937]">
      {/* Sidebar for Desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-[#E5E7EB] shrink-0 sticky top-0 h-screen z-30 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {/* Brand Logo & Toggle Button */}
        <div
          className={`h-16 px-3 border-b border-[#E5E7EB] flex items-center bg-white ${
            isSidebarCollapsed ? 'justify-center relative' : 'justify-between'
          }`}
        >
          <NavLink
            to="/"
            className="flex items-center justify-center group overflow-hidden py-1"
            title="Delfos Solar - Ir para o início"
          >
            {isSidebarCollapsed ? (
              <DelfosLogo
                height={36}
                collapsed
                className="transition-transform duration-200 group-hover:scale-110 drop-shadow-xs"
              />
            ) : (
              <DelfosLogo
                height={44}
                className="transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
              />
            )}
          </NavLink>

          <button
            onClick={toggleSidebar}
            className={`p-1.5 text-gray-400 hover:text-[#166534] hover:bg-emerald-50 rounded-lg transition-colors ${
              isSidebarCollapsed
                ? 'absolute -right-3 top-5 bg-white border border-[#E5E7EB] shadow-xs hover:shadow text-gray-600 z-40'
                : ''
            }`}
            title={isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-label={isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2' : 'px-4'} py-6 space-y-1.5`}>
          {!isSidebarCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Navegação Principal
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path === '/propostas' && location.pathname === '/orcamentos') ||
              (item.path === '/orcamentos' && location.pathname === '/propostas') ||
              (item.path === '/planos-om' &&
                (location.pathname === '/planos-om' ||
                  location.pathname === '/planos-monitoramento'))
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`flex items-center rounded-xl font-medium text-sm transition-all duration-150 relative group ${
                  isSidebarCollapsed ? 'justify-center p-3 w-full' : 'gap-3 px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#DCFCE7] text-[#166534] font-semibold shadow-xs'
                    : 'text-gray-600 hover:bg-[#F8FAF9] hover:text-[#166534]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-[#16A34A]' : 'text-gray-400 group-hover:text-[#16A34A]'
                  }`}
                />
                {!isSidebarCollapsed && (
                  <>
                    <span className="truncate">{item.name}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                    {isActive && !item.badge && (
                      <ChevronRight className="w-4 h-4 ml-auto text-[#16A34A] shrink-0" />
                    )}
                  </>
                )}
                {/* Badge no modo colapsado */}
                {isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
                )}
                {/* Tooltip no modo colapsado para hover */}
                {isSidebarCollapsed && (
                  <span className="absolute left-full ml-2.5 px-2.5 py-1 bg-gray-900 text-white text-xs font-semibold rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.name}{' '}
                    {item.badge !== undefined && item.badge > 0 ? `(${item.badge})` : ''}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User Card in Sidebar bottom */}
        <div
          className={`border-t border-[#E5E7EB] bg-gray-50/50 ${
            isSidebarCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-4'
          }`}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div
                className="w-9 h-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs cursor-default"
                title={`${user?.name || 'João Silva'} (${user?.email || 'joao@delfosengenharia.com.br'})`}
              >
                {userInitial}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full flex items-center justify-center"
                title="Sair do sistema"
                aria-label="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                    isAdmin ? 'bg-[#16A34A]' : 'bg-blue-600'
                  }`}
                >
                  {userInitial}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                    <span>{displayName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                        isAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isAdmin ? 'Admin' : 'Instalador'}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate">{displayEmail}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                title="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-72 max-w-[80%] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-250">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center py-1"
                title="Delfos Solar"
              >
                <DelfosLogo height={42} />
              </NavLink>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ||
                      (item.path === '/planos-om' &&
                        (location.pathname === '/planos-om' ||
                          location.pathname === '/planos-monitoramento'))
                        ? 'bg-[#DCFCE7] text-[#166534] font-semibold'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#16A34A]' : 'text-gray-400'}`} />
                    <span>{item.name}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </nav>

            {/* Logout on mobile */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {userInitial}
                </div>
                <div className="truncate text-xs text-gray-800 font-medium">
                  {user?.name || 'João Silva'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-red-600 font-medium flex items-center gap-1 hover:underline"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-20">
          {/* Lado Esquerdo: Hambúrguer em Mobile + Logo Compacto em mobile + Barra de Busca Central */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-2xl min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo sutil no topo mobile quando a sidebar está recolhida */}
            <NavLink to="/" className="lg:hidden flex items-center shrink-0 pr-1">
              <DelfosLogo height={30} />
            </NavLink>

            {/* Barra de Busca Proeminente ocupando o espaço onde ficava o título repetido */}
            <div className="flex-1 min-w-0">
              <BarraBuscaGlobal />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botões do Topo para Admin (WhatsApp, Templates, Notificações) */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/central-atendimento')}
                  className={`relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-bold transition-all hover:scale-[1.02] shadow-2xs ${
                    location.pathname === '/central-atendimento'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-[#166534] border-emerald-200'
                  }`}
                  title="Central de Atendimento WhatsApp"
                  aria-label={`Central de Atendimento WhatsApp${pendentesWhatsAppCount > 0 ? ` (${pendentesWhatsAppCount} mensagens pendentes)` : ''}`}
                >
                  <div className="relative flex items-center justify-center">
                    <MessageSquare
                      className={`w-4 h-4 ${
                        location.pathname === '/central-atendimento'
                          ? 'text-white'
                          : 'text-[#16A34A]'
                      }`}
                    />
                    {pendentesWhatsAppCount > 0 && (
                      <span
                        className={`absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-black rounded-full ring-2 shadow-xs ${
                          location.pathname === '/central-atendimento'
                            ? 'bg-white text-emerald-700 ring-emerald-600'
                            : 'bg-emerald-600 text-white ring-white'
                        }`}
                      >
                        {pendentesWhatsAppCount > 99 ? '99+' : pendentesWhatsAppCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:inline">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalWhatsAppTemplatesOpen(true)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1 text-gray-500 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-medium transition-colors shadow-2xs"
                  title="Templates e Configurações de WhatsApp"
                  aria-label="Templates e Configurações de WhatsApp"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="hidden xl:inline text-[11px]">Templates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalPlanilhaTarifariaOpen(true)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1 text-gray-500 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-medium transition-colors shadow-2xs"
                  title="Configurações: Parâmetros Tarifários (Lei 14.300 / Planilha de Orçamento)"
                  aria-label="Configurações: Parâmetros Tarifários"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="hidden xl:inline text-[11px]">Tarifas</span>
                </button>

                <NotificacoesBell />
              </>
            )}

            {/* Informações do Usuário no Topo com Badge de Perfil */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:border-l border-gray-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-gray-800 flex items-center justify-end gap-1.5">
                  {displayName}
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Instalador'}
                  </span>
                </span>
                <span className="text-[11px] text-gray-400">
                  {isAdmin ? 'Acesso Completo' : 'Operação em Campo'}
                </span>
              </div>
              <div
                className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-xs border border-white shrink-0 ${
                  isAdmin
                    ? 'bg-gradient-to-tr from-[#166534] to-[#16A34A]'
                    : 'bg-gradient-to-tr from-blue-700 to-blue-500'
                }`}
                title={`${displayName} (${isAdmin ? 'Administrador' : 'Instalador'})`}
              >
                {userInitial}
              </div>

              {/* Botão de Logout no Header em Telas Menores */}
              <button
                type="button"
                onClick={handleLogout}
                className="lg:hidden p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Universal Ficha do Cliente Drawer (Apenas para Admin) */}
      {isAdmin && <FichaClienteDrawer />}

      {/* Modal Global de Templates e Gateway WhatsApp (Apenas para Admin) */}
      {isAdmin && (
        <ModalGerenciarWhatsAppTemplates
          isOpen={modalWhatsAppTemplatesOpen}
          onClose={() => setModalWhatsAppTemplatesOpen(false)}
        />
      )}

      {/* Modal Global de Importação de Parâmetros Tarifários (Apenas para Admin) */}
      {isAdmin && (
        <ModalImportarPlanilhaTarifaria
          isOpen={modalPlanilhaTarifariaOpen}
          onClose={() => setModalPlanilhaTarifariaOpen(false)}
        />
      )}
    </div>
  )
}

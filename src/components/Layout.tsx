import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  CalendarCheck,
  Wrench,
  Users,
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
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useClientes } from '@/contexts/ClientesContext'
import { ModalGerenciarWhatsAppTemplates } from '@/components/ModalGerenciarWhatsAppTemplates'
import { FichaClienteDrawer } from '@/components/FichaClienteDrawer'
import { DelfosLogo } from '@/components/DelfosLogo'
import { NotificacoesBell } from '@/components/NotificacoesBell'

export default function Layout() {
  const { user, logout } = useAuth()
  const { whatsAppConversas } = useClientes()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [modalWhatsAppTemplatesOpen, setModalWhatsAppTemplatesOpen] = useState(false)

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
        return 'Orçamentos de Energia Solar'
      case '/projetos':
        return 'Projetos & Pós-Venda'
      case '/atividades':
        return 'Atividades & Calendário'
      case '/manutencoes':
        return 'Contratos & Manutenções (O&M)'
      case '/central-atendimento':
        return 'Central de Atendimento WhatsApp'
      case '/clientes':
        return 'Gestão de Clientes'
      case '/fornecedores':
        return 'Fornecedores de Equipamentos'
      default:
        return 'Delfos Solar CRM'
    }
  }

  const navItems: Array<{
    name: string
    path: string
    icon: React.ElementType
    badge?: number
  }> = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Comercial', path: '/comercial', icon: KanbanSquare },
    { name: 'Orçamentos', path: '/orcamentos', icon: Sun },
    { name: 'Projetos', path: '/projetos', icon: FolderKanban },
    { name: 'Atividades', path: '/atividades', icon: CalendarCheck },
    { name: 'O&M / Manutenções', path: '/manutencoes', icon: Wrench },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Fornecedores', path: '/fornecedores', icon: Truck },
  ]
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'J'

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
          className={`h-16 px-3 border-b border-[#E5E7EB] flex items-center ${
            isSidebarCollapsed ? 'justify-center relative' : 'justify-between'
          }`}
        >
          <NavLink
            to="/"
            className="flex items-center justify-center group overflow-hidden"
            title="Delfos Solar"
          >
            {isSidebarCollapsed ? (
              <DelfosLogo
                height={38}
                collapsed
                className="transition-transform group-hover:scale-105"
              />
            ) : (
              <DelfosLogo height={42} className="transition-transform group-hover:scale-105" />
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
            const isActive = location.pathname === item.path
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
                <div className="w-9 h-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {userInitial}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {user?.name || 'João Silva'}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {user?.email || 'joao@delfosengenharia.com.br'}
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
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center"
              >
                <DelfosLogo height={40} />
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
                      isActive
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
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botão da Central de Atendimento WhatsApp com Badge de Mensagens Pendentes */}
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
                    location.pathname === '/central-atendimento' ? 'text-white' : 'text-[#16A34A]'
                  }`}
                />
                {/* Badge bolha no canto superior direito do ícone */}
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

            {/* Botão para Configurações & Templates de WhatsApp */}
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

            {/* Sino de Notificações / Lembretes de Hoje */}
            <NotificacoesBell />

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-800">
                {user?.name || 'João Silva'}
              </span>
              <span className="text-[11px] text-gray-400">Erechim & Região</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center font-bold text-sm shadow-xs border border-white shrink-0">
              {userInitial}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Universal Ficha do Cliente Drawer */}
      <FichaClienteDrawer />

      {/* Modal Global de Templates e Gateway WhatsApp */}
      <ModalGerenciarWhatsAppTemplates
        isOpen={modalWhatsAppTemplatesOpen}
        onClose={() => setModalWhatsAppTemplatesOpen(false)}
      />
    </div>
  )
}

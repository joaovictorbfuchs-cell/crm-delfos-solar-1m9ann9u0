import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  KanbanSquare,
  FolderKanban,
  CalendarCheck,
  ClipboardCheck,
  Wrench,
  ShieldCheck,
  Users,
  UserCog,
  FileSpreadsheet,
  Truck,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronDown,
  Sun,
  MessageSquare,
  Settings,
  BookOpen,
  Images,
  Cpu,
  Zap,
  ListChecks,
  Contact,
  Layers,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useClientes } from '@/contexts/ClientesContext'
import { ModalGerenciarWhatsAppTemplates } from '@/components/ModalGerenciarWhatsAppTemplates'
import { FichaClienteDrawer } from '@/components/FichaClienteDrawer'
import { DelfosLogo } from '@/components/DelfosLogo'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NotificacoesBell } from '@/components/NotificacoesBell'
import { BarraBuscaGlobal } from '@/components/BarraBuscaGlobal'
import { MobileLayoutChrome } from '@/components/MobileLayoutChrome'
import AssistenteDelfosChat, { AssistenteDelfosBotao } from '@/components/AssistenteDelfosChat'
import packageJson from '../../package.json'

const APP_VERSION = (packageJson as { version?: string })?.version || '0.0.707'

export default function Layout() {
  const { user, userProfile, isAdmin, isInstalador, logout } = useAuth()
  const { whatsAppConversas, profissionais } = useClientes()
  const location = useLocation()
  const navigate = useNavigate()
  const [modalWhatsAppTemplatesOpen, setModalWhatsAppTemplatesOpen] = useState(false)
  const [configuracoesExpanded, setConfiguracoesExpanded] = useState(false)

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
      case '/central-atividades':
        return 'Central de Atividades'
      case '/atividades':
        return 'Atividades & Calendário'
      case '/servicos-campo':
      case '/execucao-os':
        return 'Serviços de Campo'
      case '/minhas-os':
        return 'Minhas OS'
      case '/planos-om':
      case '/planos-monitoramento':
        return 'Planos de Monitoramento & O&M'
      case '/clientes-pos-vendas':
      case '/pos-vendas':
        return 'O&M / Pós-vendas'
      case '/manutencoes':
        return 'Contratos & Manutenções (O&M)'
      case '/ordens-servico':
        return 'Ordens de Serviço'
      case '/central-atendimento':
        return 'Central de Atendimento WhatsApp'
      case '/clientes':
        return 'Gestão de Clientes'
      case '/contatos':
        return 'Visão Consolidada de Contatos'
      case '/automacoes':
        return 'Automações do CRM'
      case '/catalogo-atividades':
        return 'Catálogo de Atividades'
      case '/equipamentos':
        return 'Cadastro de Equipamentos'
      case '/ativos':
        return 'Cadastro de Ativos das Usinas'
      case '/importar-clientes':
        return 'Importar Clientes (Pipedrive / Conta Azul)'
      case '/importar-contatos-google':
        return 'Importar Contatos do Google'
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

  // Se o usuário for prestador/instalador, mostra APENAS "Minhas OS"
  // Se for admin/proprietário, mostra todos os itens incluindo "Serviços de Campo"
  interface NavSubItem {
    name: string
    path: string
    icon: React.ElementType
    badge?: number
  }

  interface NavItem {
    name: string
    path?: string
    icon: React.ElementType
    badge?: number
    subItems?: NavSubItem[]
    isGroup?: boolean
  }

  const configuracoesSubItems: NavSubItem[] = [
    { name: 'Catálogo de atividades', path: '/catalogo-atividades', icon: ListChecks },
    { name: 'Automações', path: '/automacoes', icon: Zap },
    { name: 'Cadastro de equipamentos', path: '/equipamentos', icon: Cpu },
    { name: 'Ativos das usinas', path: '/ativos', icon: Cpu },
    { name: 'Galeria de usinas', path: '/instalacoes-galeria', icon: Images },
    { name: 'Fornecedores', path: '/fornecedores', icon: Truck },
    { name: 'Importar Clientes', path: '/importar-clientes', icon: FileSpreadsheet },
    { name: 'Gerenciar usuários', path: '/gerenciar-usuarios', icon: UserCog },
  ]

  const isConfiguracoesActive = configuracoesSubItems.some((sub) => location.pathname === sub.path)

  const navItems: NavItem[] = isInstalador
    ? [{ name: 'Minhas OS', path: '/minhas-os', icon: ClipboardCheck }]
    : [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Comercial', path: '/comercial', icon: KanbanSquare },
        { name: 'Propostas', path: '/propostas', icon: Sun },
        { name: 'Central de Atividades', path: '/central-atividades', icon: Layers },
        { name: 'Projetos', path: '/projetos', icon: FolderKanban },
        { name: 'Atividades', path: '/atividades', icon: CalendarCheck },
        { name: 'Serviços de Campo', path: '/servicos-campo', icon: Wrench },
        {
          name: 'O&M / Manutenções',
          path: '/manutencoes',
          icon: ShieldCheck,
        },
        { name: 'Clientes', path: '/clientes', icon: Users },
        { name: 'Contatos', path: '/contatos', icon: Contact },
        { name: 'Base de Conhecimento', path: '/base-conhecimento', icon: BookOpen },
        {
          name: 'Configurações',
          icon: Settings,
          isGroup: true,
          subItems: configuracoesSubItems,
        },
      ]

  const isManutencoesSectionActive =
    location.pathname === '/manutencoes' ||
    location.pathname === '/clientes-pos-vendas' ||
    location.pathname === '/pos-vendas'

  const displayName = userProfile?.name || user?.name || 'Usuário'
  const displayEmail = userProfile?.email || user?.email || 'usuario@delfosengenharia.com.br'
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U'

  return (
    <div className="min-h-screen flex bg-[#F8FAF9] text-[#1F2937]">
      {/* Chrome do Layout Mobile: Header simplificado (Filtro, Funil/Dropdown, +, WhatsApp) + Bottom Bar (5 abas) + Menu Mais */}
      <MobileLayoutChrome
        isAdmin={isAdmin}
        isInstalador={isInstalador}
        displayName={displayName}
        displayEmail={displayEmail}
        userInitial={userInitial}
        appVersion={APP_VERSION}
        pendentesWhatsAppCount={pendentesWhatsAppCount}
        profissionais={profissionais}
        onLogout={handleLogout}
      />

      {/* Sidebar for Desktop: sempre expandida, estreita e fixa (~88px), ícone em cima + texto embaixo */}
      <aside className="hidden lg:flex flex-col w-[88px] bg-white border-r border-[#E5E7EB] shrink-0 sticky top-0 h-screen z-30 select-none">
        {/* Brand Logo */}
        <div className="h-16 px-2 border-b border-[#E5E7EB] flex items-center justify-center bg-white shrink-0">
          <NavLink
            to="/"
            className="flex items-center justify-center group overflow-hidden py-1"
            title="Delfos Solar - Ir para o início"
          >
            <DelfosLogo
              height={38}
              collapsed
              className="transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
            />
          </NavLink>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-1.5 py-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon

            // Se for item de agrupamento (Configurações)
            if (item.isGroup && item.subItems) {
              const isActive = isConfiguracoesActive
              const isExpanded = configuracoesExpanded

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setConfiguracoesExpanded((prev) => !prev)}
                    title={item.name}
                    aria-expanded={isExpanded}
                    className={`flex flex-col items-center justify-center text-center rounded-xl p-2 w-full transition-all duration-150 relative group cursor-pointer ${
                      isActive
                        ? 'bg-[#DCFCE7] text-[#166534] font-semibold shadow-xs'
                        : 'text-gray-600 hover:bg-[#F0FDF4] hover:text-[#166534]'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                          isActive ? 'text-[#16A34A]' : 'text-gray-500 group-hover:text-[#16A34A]'
                        }`}
                      />
                      {/* Indicador de expansão sutil */}
                      <span
                        className={`absolute -bottom-1 -right-2 text-[9px] ${
                          isActive ? 'text-[#16A34A]' : 'text-gray-400 group-hover:text-[#16A34A]'
                        }`}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium leading-tight mt-1 px-0.5 line-clamp-2">
                      {item.name}
                    </span>
                  </button>

                  {/* Subitens de Configurações */}
                  {isExpanded && (
                    <div className="space-y-1 pt-1 pb-1 border-y border-emerald-100 bg-emerald-50/40 rounded-lg my-1">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon
                        const isSubActive = location.pathname === sub.path

                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            title={sub.name}
                            className={`flex flex-col items-center justify-center text-center rounded-lg p-1.5 transition-all duration-150 relative group ${
                              isSubActive
                                ? 'bg-emerald-200/80 text-[#166534] font-bold shadow-2xs'
                                : 'text-gray-600 hover:bg-white hover:text-[#166534]'
                            }`}
                          >
                            <SubIcon
                              className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                                isSubActive
                                  ? 'text-[#16A34A]'
                                  : 'text-gray-500 group-hover:text-[#16A34A]'
                              }`}
                            />
                            <span className="text-[10px] font-medium leading-tight mt-1 px-0.5 line-clamp-2">
                              {sub.name}
                            </span>
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const itemPath = item.path || '/'
            const isActive =
              location.pathname === itemPath ||
              (itemPath === '/propostas' && location.pathname === '/orcamentos') ||
              (itemPath === '/orcamentos' && location.pathname === '/propostas') ||
              (itemPath === '/servicos-campo' &&
                (location.pathname === '/servicos-campo' ||
                  location.pathname === '/execucao-os')) ||
              (itemPath === '/minhas-os' && location.pathname === '/minhas-os') ||
              (itemPath === '/planos-om' &&
                (location.pathname === '/planos-om' ||
                  location.pathname === '/planos-monitoramento'))

            return (
              <div key={itemPath} className="space-y-1">
                <NavLink
                  to={itemPath}
                  title={item.name}
                  className={`flex flex-col items-center justify-center text-center rounded-xl p-2 w-full transition-all duration-150 relative group ${
                    isActive
                      ? 'bg-[#DCFCE7] text-[#166534] font-semibold shadow-xs'
                      : 'text-gray-600 hover:bg-[#F0FDF4] hover:text-[#166534]'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                        isActive ? 'text-[#16A34A]' : 'text-gray-500 group-hover:text-[#16A34A]'
                      }`}
                    />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-600 text-white shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium leading-tight mt-1 px-0.5 line-clamp-2">
                    {item.name}
                  </span>
                </NavLink>
              </div>
            )
          })}
        </nav>

        {/* User Card in Sidebar bottom */}
        <div className="border-t border-[#E5E7EB] bg-gray-50/60 p-2 flex flex-col items-center gap-1.5 shrink-0">
          <div
            className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
              isAdmin ? 'bg-[#16A34A]' : 'bg-blue-600'
            }`}
            title={`${displayName} (${displayEmail}) - ${isAdmin ? 'Admin' : 'Instalador'}`}
          >
            {userInitial}
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
            title="Sair do sistema"
            aria-label="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <a
            href="/schema-delfos-solar.xlsx"
            download="schema-delfos-solar.xlsx"
            className="p-1 text-gray-400 hover:text-[#166534] hover:bg-emerald-50 rounded-md transition-colors flex items-center justify-center"
            title="Exportar Schema do Banco (XLSX)"
            aria-label="Exportar Schema (XLSX)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </a>
          <div
            className="text-[9px] font-mono text-gray-400 text-center select-none pt-0.5 cursor-default leading-none"
            title={`Delfos Solar v${APP_VERSION}`}
          >
            v{APP_VERSION}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Desktop (apenas desktop: hidden lg:flex; no mobile o MobileLayoutChrome assume) */}
        <header className="hidden lg:flex h-16 bg-white border-b border-[#E5E7EB] px-6 lg:px-8 items-center justify-between gap-3 sticky top-0 z-20">
          {/* Lado Esquerdo: Barra de Busca Central */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl min-w-0">
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

                <NotificacoesBell />
              </>
            )}

            {/* Botão do Assistente Delfos no Header Desktop (ícone pequeno redondo no topo) */}
            <AssistenteDelfosBotao size="sm" />

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
            </div>
          </div>
        </header>

        {/* Content Body: no mobile, header fixo tem h-14 (3.5rem / 56px) + margem de segurança; bottom bar tem h-16 (4rem / 64px) + margem */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 overflow-y-auto pt-[4.5rem] pb-24 lg:pt-6 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Assistente Inteligente Delfos (Chat com RAG na Base de Conhecimento - Visível em todas as telas) */}
      <AssistenteDelfosChat />

      {/* Universal Ficha do Cliente Drawer (Apenas para Admin) */}
      {isAdmin && (
        <ErrorBoundary compact errorMessage="Não foi possível carregar a Ficha do Cliente">
          <FichaClienteDrawer />
        </ErrorBoundary>
      )}
      {/* Modal Global de Templates e Gateway WhatsApp (Apenas para Admin) */}
      {isAdmin && (
        <ModalGerenciarWhatsAppTemplates
          isOpen={modalWhatsAppTemplatesOpen}
          onClose={() => setModalWhatsAppTemplatesOpen(false)}
        />
      )}
    </div>
  )
}

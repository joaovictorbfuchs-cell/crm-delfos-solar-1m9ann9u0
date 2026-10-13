import React, { useState, useEffect, useRef } from 'react'
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
  RefreshCw,
  MoreHorizontal,
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

const APP_VERSION = (packageJson as { version?: string })?.version || '0.0.710'

export default function Layout() {
  const { user, userProfile, isAdmin, isInstalador, logout } = useAuth()
  const { whatsAppConversas, profissionais, refreshData } = useClientes()
  const location = useLocation()
  const navigate = useNavigate()
  const [modalWhatsAppTemplatesOpen, setModalWhatsAppTemplatesOpen] = useState(false)
  const [maisOpcoesOpen, setMaisOpcoesOpen] = useState(false)
  const maisOpcoesRef = useRef<HTMLDivElement>(null)
  const [isRefreshingGlobal, setIsRefreshingGlobal] = useState(false)

  const handleGlobalRefresh = async () => {
    if (isRefreshingGlobal) return
    setIsRefreshingGlobal(true)
    try {
      if (typeof refreshData === 'function') {
        await refreshData()
      }
      window.dispatchEvent(new CustomEvent('delfos:recarregar-dados'))
    } catch (err) {
      console.error('Erro ao atualizar dados globais:', err)
    } finally {
      setIsRefreshingGlobal(false)
    }
  }

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
        return 'Propostas'
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

  // Fechar o popover "Mais Opções" ao clicar fora ou navegar
  useEffect(() => {
    setMaisOpcoesOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!maisOpcoesOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (maisOpcoesRef.current && !maisOpcoesRef.current.contains(event.target as Node)) {
        setMaisOpcoesOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMaisOpcoesOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [maisOpcoesOpen])

  interface NavSubItem {
    name: string
    path: string
    icon: React.ElementType
    badge?: number
    description?: string
  }

  interface NavItem {
    name: string
    path: string
    icon: React.ElementType
    badge?: number
  }

  // Itens secundários agrupados no painel flutuante (flyout) "Mais Opções"
  // Conforme solicitação do usuário para eliminar a barra de rolagem da sidebar
  const maisOpcoesItems: NavSubItem[] = [
    {
      name: 'Automações',
      path: '/automacoes',
      icon: Zap,
      description: 'Fluxos automáticos e gatilhos',
    },
    {
      name: 'Cadastro de equipamentos',
      path: '/equipamentos',
      icon: Cpu,
      description: 'Módulos, inversores e estruturas',
    },
    {
      name: 'Ativos das usinas',
      path: '/ativos',
      icon: Cpu,
      description: 'Inversores instalados e seriais',
    },
    {
      name: 'Galeria de usinas',
      path: '/instalacoes-galeria',
      icon: Images,
      description: 'Fotos das obras finalizadas',
    },
    {
      name: 'Fornecedores',
      path: '/fornecedores',
      icon: Truck,
      description: 'Distribuidores e parceiros solares',
    },
    {
      name: 'Importar Clientes',
      path: '/importar-clientes',
      icon: FileSpreadsheet,
      description: 'Pipedrive, Conta Azul e CSV',
    },
    {
      name: 'Gerenciar usuários',
      path: '/gerenciar-usuarios',
      icon: UserCog,
      description: 'Perfis de acesso e equipe',
    },
    {
      name: 'Base de Conhecimento',
      path: '/base-conhecimento',
      icon: BookOpen,
      description: 'Documentos e procedimentos',
    },
    {
      name: 'Configurações',
      path: '/equipamentos',
      icon: Settings,
      description: 'Logotipo, WhatsApp, notificações e tarifas',
    },
  ]

  const isMaisOpcoesActive = maisOpcoesItems.some((sub) => location.pathname === sub.path)

  // Itens principais fixos visíveis na sidebar desktop
  // Para instalador: apenas "Serviços"
  // Para admin: Dashboard, Comercial, Propostas, Atividades, Projetos, Serviços, O&M, Clientes, Contatos
  const navItems: NavItem[] = isInstalador
    ? [{ name: 'Serviços', path: '/servicos-campo', icon: Wrench }]
    : [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Comercial', path: '/comercial', icon: KanbanSquare },
        { name: 'Propostas', path: '/propostas', icon: Sun },
        { name: 'Atividades', path: '/central-atividades', icon: Layers },
        { name: 'Projetos', path: '/projetos', icon: FolderKanban },
        { name: 'Serviços', path: '/servicos-campo', icon: Wrench },
        { name: 'O&M', path: '/manutencoes', icon: ShieldCheck },
        { name: 'Clientes', path: '/clientes', icon: Users },
        { name: 'Contatos', path: '/contatos', icon: Contact },
      ]

  const isManutencoesSectionActive =
    location.pathname === '/manutencoes' ||
    location.pathname === '/clientes-pos-vendas' ||
    location.pathname === '/pos-vendas'

  const displayName = userProfile?.name || user?.name || 'Usuário'
  const displayEmail = userProfile?.email || user?.email || 'usuario@delfosengenharia.com.br'
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U'

  return (
    <div className="min-h-screen flex bg-[#F8FAF9] text-[#1F2937] max-w-full overflow-x-hidden min-w-0">
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
        {/* Brand Logo - compacto (h-14 / 56px) para maximizar área útil da navegação desktop */}
        <div className="h-14 px-2 border-b border-[#E5E7EB] flex items-center justify-center bg-white shrink-0">
          <NavLink
            to={isInstalador ? '/servicos-campo' : '/'}
            className="flex items-center justify-center group overflow-hidden py-0.5"
            title="Delfos Solar - Ir para o início"
          >
            <DelfosLogo
              height={34}
              collapsed
              className="transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
            />
          </NavLink>
        </div>

        {/* Navigation Links: lista com densidade ultra otimizada para todos os 9 itens principais
            cabem integralmente sem corte vertical (Dashboard e Comercial 100% visíveis no topo),
            com overflow-y-auto e scrollbar oculta como salvaguarda preventiva */}
        <nav className="flex-1 px-1 py-1 min-h-0 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 flex flex-col justify-start min-h-0 overflow-y-auto overscroll-contain pr-0.5 space-y-[2px] scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const Icon = item.icon
              const itemPath = item.path
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
                <div key={itemPath} className="w-full">
                  <NavLink
                    to={itemPath}
                    title={item.name}
                    className={`flex flex-col items-center justify-center text-center rounded-md px-1 py-1 w-full transition-all duration-150 relative group ${
                      isActive
                        ? 'bg-[#DCFCE7] text-[#166534] font-bold shadow-xs'
                        : 'text-gray-600 hover:bg-[#F0FDF4] hover:text-[#166534]'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                          isActive ? 'text-[#16A34A]' : 'text-gray-500 group-hover:text-[#16A34A]'
                        }`}
                      />
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-600 text-white shadow-2xs">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium leading-none mt-1 px-0.5 truncate max-w-full">
                      {item.name}
                    </span>
                  </NavLink>
                </div>
              )
            })}
          </div>

          {/* Botão "Mais Opções" FIXO na base da lista (shrink-0), com Flyout Flutuante à direita abrindo ACIMA do botão */}
          {isAdmin && (
            <div
              ref={maisOpcoesRef}
              className="relative pt-1 border-t border-gray-100 shrink-0 mt-0.5"
            >
              <button
                type="button"
                onClick={() => setMaisOpcoesOpen((prev) => !prev)}
                title="Mais Opções de Configuração e Gestão"
                aria-label="Mais Opções"
                aria-haspopup="dialog"
                aria-expanded={maisOpcoesOpen}
                className={`flex flex-col items-center justify-center text-center rounded-md px-1 py-1 w-full transition-all duration-150 relative group cursor-pointer ${
                  maisOpcoesOpen || isMaisOpcoesActive
                    ? 'bg-[#DCFCE7] text-[#166534] font-bold shadow-xs'
                    : 'text-gray-600 hover:bg-[#F0FDF4] hover:text-[#166534]'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Settings
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      maisOpcoesOpen ? 'rotate-45' : 'group-hover:scale-110'
                    } ${
                      maisOpcoesOpen || isMaisOpcoesActive
                        ? 'text-[#16A34A]'
                        : 'text-gray-500 group-hover:text-[#16A34A]'
                    }`}
                  />
                  <ChevronRight
                    className={`absolute -right-2.5 w-3 h-3 transition-transform duration-150 ${
                      maisOpcoesOpen
                        ? 'rotate-90 text-[#16A34A]'
                        : 'text-gray-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-medium leading-none mt-1 px-0.5 truncate max-w-full">
                  Mais Opções
                </span>
              </button>

              {/* Flyout Popover flutuante no estilo do exemplo anexado pelo usuário:
                  - Card branco com cantos arredondados (rounded-xl)
                  - Sombra projetada elegante (shadow-xl)
                  - Borda sutil (border border-gray-200)
                  - Cabeçalho "Configurar" ou "Mais Opções"
                  - Linhas com ícone à esquerda + rótulo (+ subtítulo sutil opcional)
                  - Posicionado flutuante à direita da sidebar (left-[84px] bottom-0)
                  - max-h-[75vh] para abrir acima do botão sem ser cortado pela janela
              */}
              {maisOpcoesOpen && (
                <div
                  role="dialog"
                  aria-label="Menu Mais Opções"
                  className="absolute left-[84px] bottom-0 w-72 max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150 origin-bottom-left"
                >
                  {/* Pequena seta indicadora estilizada apontando para o botão da sidebar */}
                  <div
                    aria-hidden="true"
                    className="absolute -left-2 bottom-3.5 w-3.5 h-3.5 bg-white border-l border-b border-gray-200 rotate-45 pointer-events-none"
                  />

                  {/* Cabeçalho do Card Popover */}
                  <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                        <Settings className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800">Mais Opções</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaisOpcoesOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                      title="Fechar menu"
                      aria-label="Fechar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Lista de Itens no Flyout com ícone à esquerda + rótulo */}
                  <div className="py-1 overflow-y-auto flex-1 overscroll-contain">
                    {maisOpcoesItems.map((sub) => {
                      const SubIcon = sub.icon
                      const isSubActive = location.pathname === sub.path

                      return (
                        <NavLink
                          key={sub.name}
                          to={sub.path}
                          onClick={() => setMaisOpcoesOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2 text-xs transition-colors duration-150 group ${
                            isSubActive
                              ? 'bg-emerald-50 text-[#166534] font-semibold border-l-3 border-[#16A34A]'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-emerald-800'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isSubActive
                                ? 'bg-emerald-100 text-[#16A34A]'
                                : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-[#16A34A]'
                            }`}
                          >
                            <SubIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium leading-snug truncate">
                              {sub.name}
                            </div>
                            {sub.description && (
                              <div className="text-[11px] text-gray-400 font-normal truncate">
                                {sub.description}
                              </div>
                            )}
                          </div>
                          {isSubActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] shrink-0" />
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Card in Sidebar bottom - altura reduzida e layout compacto */}
        <div className="border-t border-[#E5E7EB] bg-gray-50/60 p-1.5 flex flex-col items-center gap-1 shrink-0">
          <div className="flex items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                isAdmin ? 'bg-[#16A34A]' : 'bg-blue-600'
              }`}
              title={`${displayName} (${displayEmail}) - ${isAdmin ? 'Admin' : 'Instalador'}`}
            >
              {userInitial}
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center justify-center"
              title="Sair do sistema"
              aria-label="Sair do sistema"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 select-none pt-0.5 leading-none">
            <a
              href="/schema-delfos-solar.xlsx"
              download="schema-delfos-solar.xlsx"
              className="p-0.5 text-gray-400 hover:text-[#166534] hover:bg-emerald-50 rounded transition-colors flex items-center justify-center"
              title="Exportar Schema do Banco (XLSX)"
              aria-label="Exportar Schema (XLSX)"
            >
              <FileSpreadsheet className="w-3 h-3" />
            </a>
            <span
              className="text-[9px] font-mono text-gray-400 text-center cursor-default"
              title={`Delfos Solar v${APP_VERSION}`}
            >
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {/* Top Header Desktop (apenas desktop: hidden lg:flex; no mobile o MobileLayoutChrome assume) */}
        <header className="hidden lg:flex h-16 bg-white border-b border-[#E5E7EB] px-4 lg:px-6 items-center justify-between gap-3 sticky top-0 z-20 max-w-full min-w-0">
          {/* Lado Esquerdo: Barra de Busca Central (apenas admin tem busca global de clientes/negócios/propostas) */}
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-2xl">
            <div className="flex-1 min-w-0">
              {isAdmin ? (
                <BarraBuscaGlobal />
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <span>Painel do Instalador — Serviços de Campo Delfos Solar</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Botão de Atualizar Geral — posicionado à ESQUERDA do botão de WhatsApp */}
            <button
              type="button"
              onClick={handleGlobalRefresh}
              disabled={isRefreshingGlobal}
              className="p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1.5 text-gray-600 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Atualizar dados do sistema"
              aria-label="Atualizar dados do sistema"
            >
              <RefreshCw
                className={`w-4 h-4 text-emerald-600 ${isRefreshingGlobal ? 'animate-spin' : ''}`}
              />
              <span className="hidden xl:inline text-[11px]">Atualizar</span>
            </button>

            {/* Botão Sair para Instalador (Desktop: imediatamente à direita de Atualizar) */}
            {isInstalador && (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sair da conta"
                title="Sair"
                className="p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>Sair</span>
              </button>
            )}

            {/* Botões do Topo para Admin (WhatsApp, Templates, Notificações) */}
            {isAdmin && (
              <div className="contents" key="header-admin-botoes">
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
              </div>
            )}

            {/* Botão do Assistente Delfos no Header Desktop (ícone pequeno redondo no topo) */}
            <AssistenteDelfosBotao size="sm" />
          </div>
        </header>

        {/* Content Body: no mobile, header fixo tem h-14 (3.5rem / 56px); no desktop, header tem h-16 (top-0 sticky) e respiro compacto de ~12-14px.
            Na tela de Serviços de Campo (/servicos-campo ou /execucao-os), o usuário solicitou subir os blocos bem próximo do título no mobile (max-lg:pt-[3.75rem]), aproximando o calendário do topo.
            Para instalador, a barra inferior mobile foi removida, logo usa max-lg:pb-6 em vez de max-lg:pb-20 */}
        <main
          className={`flex-1 px-3 sm:px-6 lg:px-8 pt-3 pb-6 overflow-y-auto ${
            location.pathname === '/servicos-campo' || location.pathname === '/execucao-os'
              ? 'max-lg:pt-[3.75rem] max-lg:pb-20'
              : location.pathname === '/central-atendimento'
                ? 'max-lg:pt-14 max-lg:pb-16 max-lg:px-2'
                : 'max-lg:pt-[4.5rem] max-lg:pb-20'
          } ${isInstalador ? 'max-lg:pb-6' : ''}`}
        >
          <Outlet />
        </main>
      </div>

      {/* Assistente Inteligente Delfos (Chat com RAG na Base de Conhecimento - Visível para Admin) */}
      {isAdmin && <AssistenteDelfosChat />}

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

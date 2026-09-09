import React, { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  KanbanSquare,
  Wrench,
  Users,
  Sun,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { FichaClienteDrawer } from '@/components/FichaClienteDrawer'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      case '/manutencoes':
        return 'Manutenções e O.S.'
      case '/clientes':
        return 'Base de Clientes'
      default:
        return 'Delfos Solar CRM'
    }
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Comercial', path: '/comercial', icon: KanbanSquare },
    { name: 'Manutenções', path: '/manutencoes', icon: Wrench },
    { name: 'Clientes', path: '/clientes', icon: Users },
  ]

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'J'

  return (
    <div className="min-h-screen flex bg-[#F8FAF9] text-[#1F2937]">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-[#E5E7EB] shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Logo */}
        <div className="p-6 border-b border-[#E5E7EB] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Sun className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-gray-900 block leading-tight">
              DELFOS
            </span>
            <span className="text-xs font-semibold tracking-wider text-[#16A34A] uppercase block">
              Energia Solar
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Navegação Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[#DCFCE7] text-[#166534] font-semibold shadow-xs'
                    : 'text-gray-600 hover:bg-[#F8FAF9] hover:text-[#166534]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#16A34A]' : 'text-gray-400'}`} />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-[#16A34A]" />}
              </NavLink>
            )
          })}
        </nav>

        {/* User Card in Sidebar bottom */}
        <div className="p-4 border-t border-[#E5E7EB] bg-gray-50/50">
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
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] flex items-center justify-center text-white shadow-xs">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-gray-900 block leading-tight">
                    DELFOS
                  </span>
                  <span className="text-[11px] font-semibold text-[#16A34A] uppercase block">
                    Energia Solar
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
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

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-800">
                {user?.name || 'João Silva'}
              </span>
              <span className="text-[11px] text-gray-400">Erechim & Região</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center font-bold text-sm shadow-xs border border-white">
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
    </div>
  )
}

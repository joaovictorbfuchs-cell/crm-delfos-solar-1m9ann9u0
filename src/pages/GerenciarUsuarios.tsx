import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  Wrench,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  KeyRound,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX,
  Mail,
  User,
  Power,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchUsuariosSistema,
  createUsuarioSistema,
  updateUsuarioSistema,
  deleteUsuarioSistema,
  toggleAtivoUsuario,
  NovoUsuarioInput,
  EditarUsuarioInput,
} from '@/services/usuariosService'
import type { SistemaUsuario, UserRole } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export default function GerenciarUsuarios() {
  const { userProfile, user: currentAuthUser } = useAuth()
  const currentUserId = userProfile?.id || (currentAuthUser as any)?.id

  const [usuarios, setUsuarios] = useState<SistemaUsuario[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditarOpen, setModalEditarOpen] = useState(false)
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<SistemaUsuario | null>(null)
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<SistemaUsuario | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulário Novo Usuário
  const [novoForm, setNovoForm] = useState<NovoUsuarioInput>({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    role: 'instalador',
    ativo: true,
  })

  // Formulário Edição
  const [editForm, setEditForm] = useState<{
    name: string
    email: string
    phone: string
    role: UserRole
    ativo: boolean
    newPassword: string
    newPasswordConfirm: string
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'instalador',
    ativo: true,
    newPassword: '',
    newPasswordConfirm: '',
  })

  const carregarUsuarios = async () => {
    setIsLoading(true)
    try {
      const data = await fetchUsuariosSistema()
      setUsuarios(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar lista de usuários')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarUsuarios()
  }, [])

  // Filtragem
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((u) => {
      if (roleFilter !== 'todos' && u.role !== roleFilter) return false
      if (statusFilter === 'ativos' && !u.ativo) return false
      if (statusFilter === 'inativos' && u.ativo) return false

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const nameMatch = u.name.toLowerCase().includes(query)
        const emailMatch = u.email.toLowerCase().includes(query)
        return nameMatch || emailMatch
      }
      return true
    })
  }, [usuarios, roleFilter, statusFilter, searchTerm])

  // Contagens
  const counts = useMemo(() => {
    const total = usuarios.length
    const admins = usuarios.filter((u) => u.role === 'admin').length
    const instaladores = usuarios.filter((u) => u.role === 'instalador').length
    const ativos = usuarios.filter((u) => u.ativo).length
    const inativos = usuarios.filter((u) => !u.ativo).length
    return { total, admins, instaladores, ativos, inativos }
  }, [usuarios])

  // Handlers Novo Usuário
  const handleOpenNovoModal = () => {
    setNovoForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirm: '',
      role: 'instalador',
      ativo: true,
    })
    setModalNovoOpen(true)
  }

  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoForm.name.trim() || !novoForm.email.trim()) {
      toast.error('Preencha o nome e o e-mail do usuário.')
      return
    }
    if (!novoForm.password || novoForm.password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (novoForm.password !== novoForm.passwordConfirm) {
      toast.error('A confirmação de senha não confere.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await createUsuarioSistema(novoForm)
      setUsuarios((prev) => {
        const exists = prev.some((u) => u.id === created.id)
        if (exists) {
          return prev.map((u) => (u.id === created.id ? created : u))
        }
        return [created, ...prev]
      })
      setModalNovoOpen(false)
      toast.success(`Usuário "${created.name}" salvo com sucesso!`)
    } catch (err: any) {
      console.error(err)
      const msg =
        err?.data?.data?.email?.message ||
        'Erro ao cadastrar usuário. Verifique os dados informados.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handlers Edição
  const handleOpenEditarModal = (u: SistemaUsuario) => {
    setUsuarioParaEditar(u)
    setEditForm({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role || 'instalador',
      ativo: u.ativo !== false,
      newPassword: '',
      newPasswordConfirm: '',
    })
    setModalEditarOpen(true)
  }

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioParaEditar) return

    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Preencha o nome e o e-mail.')
      return
    }

    // Não permitir que o usuário atual desative a si mesmo
    if (usuarioParaEditar.id === currentUserId && !editForm.ativo) {
      toast.error('Você não pode desativar sua própria conta de administrador.')
      return
    }

    // Se informou nova senha, validar tamanho e confirmação
    if (editForm.newPassword) {
      if (editForm.newPassword.length < 8) {
        toast.error('A nova senha deve ter no mínimo 8 caracteres.')
        return
      }
      if (editForm.newPassword !== editForm.newPasswordConfirm) {
        toast.error('As senhas não coincidem.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload: EditarUsuarioInput = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
        ativo: editForm.ativo,
      }
      if (editForm.newPassword) {
        payload.password = editForm.newPassword
        payload.passwordConfirm = editForm.newPasswordConfirm
      }

      const updated = await updateUsuarioSistema(usuarioParaEditar.id, payload)
      setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setModalEditarOpen(false)
      setUsuarioParaEditar(null)
      toast.success(`Dados do usuário "${updated.name}" atualizados com sucesso!`)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao atualizar usuário. Verifique os dados fornecidos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Ativo / Inativo
  const handleToggleAtivo = async (u: SistemaUsuario) => {
    if (u.id === currentUserId) {
      toast.error('Você não pode desativar sua própria conta.')
      return
    }

    try {
      const updated = await toggleAtivoUsuario(u.id, u.ativo !== false)
      setUsuarios((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      if (updated.ativo) {
        toast.success(`Usuário "${updated.name}" foi reativado.`)
      } else {
        toast.warning(`Usuário "${updated.name}" foi desativado.`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar status do usuário.')
    }
  }

  // Exclusão
  const handleConfirmExclusao = async () => {
    if (!usuarioParaExcluir) return
    if (usuarioParaExcluir.id === currentUserId) {
      toast.error('Você não pode excluir sua própria conta.')
      setUsuarioParaExcluir(null)
      return
    }

    setIsSubmitting(true)
    try {
      await deleteUsuarioSistema(usuarioParaExcluir.id)
      setUsuarios((prev) => prev.filter((u) => u.id !== usuarioParaExcluir.id))
      toast.success(`Usuário "${usuarioParaExcluir.name}" excluído permanentemente.`)
      setUsuarioParaExcluir(null)
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível excluir o usuário.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#166534] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Gerenciar Usuários & Perfis
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Controle de acesso por papel: Administradores e Instaladores de campo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleOpenNovoModal}
            className="h-11 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Novo Usuário</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={carregarUsuarios}
            disabled={isLoading}
            className="h-11 px-3 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 block uppercase">
            Total Usuários
          </span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">{counts.total}</span>
          <span className="text-[11px] text-gray-400 mt-0.5 block">{counts.ativos} ativos</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-2xs bg-emerald-50/30">
          <span className="text-xs font-semibold text-emerald-800 block uppercase flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            Administradores
          </span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{counts.admins}</span>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Acesso completo ao CRM</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-2xs bg-blue-50/30">
          <span className="text-xs font-semibold text-blue-800 block uppercase flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            Instaladores
          </span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">
            {counts.instaladores}
          </span>
          <span className="text-[11px] text-blue-600 mt-0.5 block">
            Acesso apenas à Execução OS
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <span className="text-xs font-semibold text-gray-500 block uppercase flex items-center gap-1">
            <UserX className="w-3.5 h-3.5 text-rose-500" />
            Desativados
          </span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">{counts.inativos}</span>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Login bloqueado</span>
        </div>
      </div>

      {/* Regras e Permissões Explicativas */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950">
        <h4 className="font-bold text-sm mb-1.5 flex items-center gap-2 text-emerald-900">
          <Shield className="w-4 h-4 text-emerald-700" />
          Definição dos Perfis de Acesso
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div className="bg-white/80 rounded-xl p-3 border border-emerald-200/60">
            <span className="font-bold text-emerald-800 block mb-1">👑 Administrador:</span>
            <p className="text-gray-600 leading-relaxed">
              Acesso irrestrito a todas as áreas: Dashboard, Comercial, Clientes, Orçamentos, O&M,
              Central WhatsApp, Importações e Gerenciamento de Usuários.
            </p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-emerald-200/60">
            <span className="font-bold text-blue-800 block mb-1">⚡ Instalador:</span>
            <p className="text-gray-600 leading-relaxed">
              Acesso exclusivo à tela <strong>Execução de OS (/execucao-os)</strong>. Visualiza
              apenas as suas ordens de serviço atribuídas, checklist, fotos e dados técnicos. Dados
              financeiros, propostas e clientes gerais ficam 100% ocultos.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-2xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 text-xs sm:text-sm rounded-xl border-gray-200 focus:border-emerald-600"
          />
        </div>

        {/* Filtro Perfil */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-11 px-3 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
        >
          <option value="todos">Todos os Perfis</option>
          <option value="admin">Administrador</option>
          <option value="instalador">Instalador</option>
        </select>

        {/* Filtro Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 px-3 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
        >
          <option value="todos">Todos os Status</option>
          <option value="ativos">Apenas Ativos</option>
          <option value="inativos">Apenas Desativados</option>
        </select>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-700">Carregando usuários do sistema...</p>
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Users className="w-10 h-10 text-gray-300 mb-2" />
            <h4 className="text-sm font-bold text-gray-800">Nenhum usuário encontrado</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Não encontramos colaboradores correspondentes aos filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                  <th className="py-3.5 px-4">E-mail Corporativo</th>
                  <th className="py-3.5 px-4">WhatsApp / Tel</th>
                  <th className="py-3.5 px-4">Perfil</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsuarios.map((u) => {
                  const isCurrent = u.id === currentUserId
                  const isAdmin = u.role === 'admin'
                  const isAtivo = u.ativo !== false

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors hover:bg-gray-50/80 ${
                        !isAtivo ? 'bg-gray-50/50 opacity-75' : ''
                      }`}
                    >
                      {/* Usuário (Avatar + Nome) */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                              isAdmin
                                ? 'bg-gradient-to-tr from-emerald-700 to-emerald-500'
                                : 'bg-gradient-to-tr from-blue-700 to-blue-500'
                            }`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 block sm:hidden">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* E-mail */}
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{u.email}</td>

                      {/* WhatsApp / Telefone */}
                      <td className="py-3.5 px-4 text-gray-700 text-xs">
                        {u.phone ? (
                          <span className="font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md border border-gray-200 inline-block">
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Não cadastrado</span>
                        )}
                      </td>

                      {/* Perfil */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Shield className="w-3.5 h-3.5 text-emerald-700" />
                            Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <Wrench className="w-3.5 h-3.5 text-blue-700" />
                            Instalador
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isAtivo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Desativado
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1 sm:gap-2">
                          {/* Toggle Ativo/Inativo */}
                          <button
                            type="button"
                            onClick={() => handleToggleAtivo(u)}
                            disabled={isCurrent}
                            title={
                              isCurrent
                                ? 'Não é possível desativar a si mesmo'
                                : isAtivo
                                  ? 'Desativar usuário'
                                  : 'Reativar usuário'
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed border-gray-200 text-gray-400'
                                : isAtivo
                                  ? 'border-gray-200 text-gray-500 hover:text-amber-700 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditarModal(u)}
                            title="Editar dados e redefinir senha"
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => setUsuarioParaExcluir(u)}
                            disabled={isCurrent}
                            title={
                              isCurrent ? 'Não é possível excluir a si mesmo' : 'Excluir usuário'
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed border-gray-200 text-gray-400'
                                : 'border-gray-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR NOVO USUÁRIO */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              <span>Novo Usuário do Sistema</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Cadastre um colaborador e defina o perfil de acesso no CRM Delfos Solar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarNovo} className="space-y-3.5 py-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo *</label>
              <Input
                type="text"
                required
                placeholder="Ex: Carlos Eduardo Silva"
                value={novoForm.name}
                onChange={(e) => setNovoForm({ ...novoForm, name: e.target.value })}
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  E-mail Corporativo *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="carlos.silva@delfosengenharia.com.br"
                  value={novoForm.email}
                  onChange={(e) => setNovoForm({ ...novoForm, email: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  WhatsApp / Celular
                </label>
                <Input
                  type="text"
                  placeholder="(54) 99999-0000"
                  value={novoForm.phone || ''}
                  onChange={(e) => setNovoForm({ ...novoForm, phone: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Perfil de Acesso *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNovoForm({ ...novoForm, role: 'admin' })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    novoForm.role === 'admin'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Administrador
                    </span>
                    {novoForm.role === 'admin' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Acesso completo ao CRM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNovoForm({ ...novoForm, role: 'instalador' })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    novoForm.role === 'instalador'
                      ? 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-600'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-blue-600" />
                      Instalador
                    </span>
                    {novoForm.role === 'instalador' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Apenas Execução de OS</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Senha Provisória *
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Mínimo 8 dígitos"
                  value={novoForm.password}
                  onChange={(e) => setNovoForm({ ...novoForm, password: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirmar Senha *
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Repita a senha"
                  value={novoForm.passwordConfirm}
                  onChange={(e) => setNovoForm({ ...novoForm, passwordConfirm: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setModalNovoOpen(false)}
                className="rounded-xl h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl h-10"
              >
                {isSubmitting ? 'Cadastrando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR USUÁRIO */}
      <Dialog open={modalEditarOpen} onOpenChange={setModalEditarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Edit2 className="w-5 h-5 text-emerald-600" />
              <span>Editar Usuário</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Altere os dados, papel ou redefina a senha de acesso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEdicao} className="space-y-3.5 py-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo *</label>
              <Input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail *</label>
                <Input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  WhatsApp / Celular
                </label>
                <Input
                  type="text"
                  placeholder="(54) 99999-0000"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Perfil de Acesso</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, role: 'admin' })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    editForm.role === 'admin'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Administrador
                    </span>
                    {editForm.role === 'admin' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Acesso irrestrito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, role: 'instalador' })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    editForm.role === 'instalador'
                      ? 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-600'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-blue-600" />
                      Instalador
                    </span>
                    {editForm.role === 'instalador' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">Apenas Execução OS</span>
                </button>
              </div>
            </div>

            {/* Status Ativo Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Status da Conta</span>
                <span className="text-[11px] text-gray-500">
                  {editForm.ativo
                    ? 'Usuário pode logar normalmente'
                    : 'Usuário com acesso bloqueado'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, ativo: !editForm.ativo })}
                disabled={usuarioParaEditar?.id === currentUserId}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  editForm.ativo
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                } ${usuarioParaEditar?.id === currentUserId ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {editForm.ativo ? 'Ativo' : 'Desativado'}
              </button>
            </div>

            {/* Redefinição Opcional de Senha */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-1.5">
                <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                Redefinir Senha (opcional)
              </span>
              <p className="text-[11px] text-gray-400 mb-2">
                Deixe em branco caso deseje manter a senha atual do colaborador.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  type="password"
                  placeholder="Nova senha (min. 8)"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
                <Input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={editForm.newPasswordConfirm}
                  onChange={(e) => setEditForm({ ...editForm, newPasswordConfirm: e.target.value })}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setModalEditarOpen(false)}
                className="rounded-xl h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl h-10"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG EXCLUSÃO */}
      <AlertDialog
        open={Boolean(usuarioParaExcluir)}
        onOpenChange={(open) => !open && setUsuarioParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 text-xs text-gray-600">
              <p>
                Tem certeza que deseja remover o usuário <strong>{usuarioParaExcluir?.name}</strong>{' '}
                ({usuarioParaExcluir?.email})?
              </p>
              <p className="text-gray-500">
                Esta ação revogará todo e qualquer acesso deste colaborador ao CRM. Se preferir
                manter o histórico sem permitir novo login, considere apenas{' '}
                <strong>desativar</strong> o usuário.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmExclusao()
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isSubmitting ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

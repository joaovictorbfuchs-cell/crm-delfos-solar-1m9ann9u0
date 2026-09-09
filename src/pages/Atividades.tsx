import React, { useState, useMemo } from 'react'
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Clock,
  PhoneCall,
  Users,
  Send,
  Wrench,
  FileText,
  ArrowRightLeft,
  Loader2,
  UserCheck,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { AtividadeItem } from '@/components/AtividadeItem'
import type { AtividadeTipo } from '@/types/crm'

export const Atividades: React.FC = () => {
  const { clientes, atividades, addAtividade, removeAtividade, openFichaCliente } = useClientes()

  // Estado do formulário de criação de atividade
  const [selectedClienteId, setSelectedClienteId] = useState('')
  const [tipo, setTipo] = useState<AtividadeTipo>('ligacao')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Filtros da timeline geral
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClienteId, setFilterClienteId] = useState<string>('todos')
  const [filterTipo, setFilterTipo] = useState<string>('todos')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClienteId) {
      setFormError('Selecione um cliente para vincular a atividade.')
      return
    }
    if (!descricao.trim()) {
      setFormError('Preencha a descrição da atividade.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError(null)

      const finalTitulo =
        titulo.trim() ||
        (tipo === 'ligacao'
          ? 'Ligação telefônica'
          : tipo === 'reuniao'
            ? 'Reunião comercial'
            : tipo === 'proposta'
              ? 'Envio de proposta'
              : tipo === 'visita_tecnica'
                ? 'Visita técnica de vistoria'
                : 'Anotação de cliente')

      await addAtividade({
        cliente_id: selectedClienteId,
        tipo,
        titulo: finalTitulo,
        descricao: descricao.trim(),
        data: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
        autor: 'João Silva',
      })

      setTitulo('')
      setDescricao('')
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 3000)
    } catch (err: unknown) {
      console.error('Falha ao criar atividade:', err)
      setFormError('Erro ao registrar atividade. Verifique os dados e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtragem e ordenação da timeline geral (mais recentes no topo)
  const filteredAtividades = useMemo(() => {
    return atividades
      .filter((a) => {
        if (filterClienteId !== 'todos' && a.cliente_id !== filterClienteId) {
          return false
        }
        if (filterTipo !== 'todos' && a.tipo !== filterTipo) {
          return false
        }
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase()
          const descMatch = (a.descricao || '').toLowerCase().includes(term)
          const titMatch = (a.titulo || '').toLowerCase().includes(term)
          const clientMatch = (a.expand?.cliente_id?.nome || '').toLowerCase().includes(term)
          if (!descMatch && !titMatch && !clientMatch) return false
        }
        return true
      })
      .sort(
        (a, b) => new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime(),
      )
  }, [atividades, filterClienteId, filterTipo, searchTerm])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header com resumo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Central de Atividades
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Planeje contatos, registre visitas técnicas e acompanhe a timeline geral de todos os
            clientes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-800">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Total de atividades: {atividades.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================== */}
        {/* FORMULÁRIO: NOVA ATIVIDADE (4 colunas no desktop)           */}
        {/* ========================================================== */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs sticky top-20">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              Agendar Nova Atividade
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
              Delfos CRM
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* 1. Selecionar Cliente */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">
                Cliente <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cidade ? `(${c.cidade})` : ''} - {c.status}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Tipo de Atividade */}
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-700 block">Tipo de Atividade</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'ligacao', label: 'Ligação', icon: PhoneCall },
                  { id: 'reuniao', label: 'Reunião', icon: Users },
                  { id: 'proposta', label: 'Envio Proposta', icon: Send },
                  { id: 'visita_tecnica', label: 'Visita Técnica', icon: Wrench },
                  { id: 'anotacao', label: 'Anotação', icon: FileText },
                ].map((item) => {
                  const Icon = item.icon
                  const isSelected = tipo === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTipo(item.id as AtividadeTipo)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold shadow-2xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isSelected ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Título */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Título do Registro</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Ligação para apresentar proposta técnica..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 4. Data e Hora */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">
                Data e Horário <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 bg-white"
              />
            </div>

            {/* 5. Descrição */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">
                Descrição detalhada <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                placeholder="Detalhes, pauta combinada, observações técnicas ou resultado da conversa..."
                className="w-full text-xs p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {formError && (
              <p className="text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
                {formError}
              </p>
            )}

            {formSuccess && (
              <p className="text-[11px] text-emerald-700 font-medium bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Atividade registrada com sucesso na timeline!
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !selectedClienteId || !descricao.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando Atividade...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  Salvar e Vincular ao Cliente
                </>
              )}
            </button>
          </form>
        </div>

        {/* ========================================================== */}
        {/* TIMELINE GERAL DE ATIVIDADES (7-8 colunas no desktop)        */}
        {/* ========================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white rounded-xl border border-gray-200/90 p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar em atividades, títulos, clientes ou notas..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterClienteId}
                  onChange={(e) => setFilterClienteId(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white max-w-[160px] truncate"
                >
                  <option value="todos">Todos clientes</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>

                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="todos">Todos os tipos</option>
                  <option value="ligacao">Ligações</option>
                  <option value="reuniao">Reuniões</option>
                  <option value="proposta">Propostas</option>
                  <option value="visita_tecnica">Visitas Técnicas</option>
                  <option value="anotacao">Anotações</option>
                  <option value="mudanca_estagio">Mudanças de Estágio</option>
                </select>
              </div>
            </div>

            {/* Chips de contagem rápida */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100 text-[11px] text-gray-500">
              <span className="font-semibold text-gray-700">Filtrados:</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-800">
                {filteredAtividades.length} atividades
              </span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-emerald-700 hover:underline ml-1"
                >
                  Limpar busca
                </button>
              )}
            </div>
          </div>

          {/* Timeline de cards */}
          {filteredAtividades.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-gray-800">Nenhuma atividade encontrada</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Tente alterar os filtros acima ou registre uma nova atividade preenchendo o
                formulário ao lado.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Timeline Geral de Atividades ({filteredAtividades.length})
                </h3>
                <span className="text-[11px] text-gray-400">Mais recentes no topo</span>
              </div>

              <div className="space-y-1">
                {filteredAtividades.map((atv) => (
                  <div key={atv.id} className="relative">
                    <AtividadeItem
                      atividade={atv}
                      onDelete={removeAtividade}
                      showClienteName={true}
                    />
                    {/* Botão para abrir a ficha do cliente correspondente */}
                    {atv.cliente_id && (
                      <div className="absolute right-3.5 top-3.5">
                        <button
                          type="button"
                          onClick={() => openFichaCliente(atv.cliente_id)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-semibold transition-colors"
                        >
                          Ver ficha →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Atividades

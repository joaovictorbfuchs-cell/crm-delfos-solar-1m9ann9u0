import React, { useState, useMemo, useEffect } from 'react'
import {
  Calendar,
  FileText,
  User,
  Loader2,
  Briefcase,
  Wrench,
  FileSpreadsheet,
  Settings2,
} from 'lucide-react'
import {
  CATEGORIAS_ATIVIDADES,
  ATIVIDADES_PADRAO,
  buildCustomTipoDef,
  getTipoAtividadeConfig,
  type TipoAtividadeDef,
} from '@/constants/atividadesTipos'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import type { AtividadeTipo, AtividadeCategoriaId, UsinaCliente } from '@/types/crm'
import { Sun } from 'lucide-react'

interface QuickAddAtividadeProps {
  clienteId: string
  usinas?: UsinaCliente[]
  onSuccess?: () => void
  onOpenGerenciar?: () => void
  onSelectTipoEspecial?: (tipoId: string) => void
  onOpenModalCompleto?: () => void
}

export const QuickAddAtividade: React.FC<QuickAddAtividadeProps> = ({
  clienteId,
  usinas = [],
  onSuccess,
  onOpenGerenciar,
  onOpenModalCompleto,
  onSelectTipoEspecial,
}) => {
  const { addAtividade, usuarios, tiposAtividadesCustom } = useClientes()
  const { user } = useAuth()

  // Alternador de modo: 'atividade' (duas etapas) vs 'anotacao'
  const [mode, setMode] = useState<'atividade' | 'anotacao'>('atividade')

  // Etapa 1: Categoria ativa
  const [selectedCategoria, setSelectedCategoria] = useState<AtividadeCategoriaId>('comercial')

  // Etapa 2: Sub-tipo selecionado dentro da categoria
  const [subTipo, setSubTipo] = useState<AtividadeTipo>('contato_ligacao')

  // Form states
  const [titulo, setTitulo] = useState('Entrar em contato')
  const [descricao, setDescricao] = useState('')
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>(() => {
    return usinas.length === 1 ? usinas[0].id : ''
  })

  // Sincronizar se lista de usinas carregar posteriormente
  useEffect(() => {
    if (usinas.length === 1 && !selectedUsinaId) {
      setSelectedUsinaId(usinas[0].id)
    }
  }, [usinas, selectedUsinaId])

  const [dataHora, setDataHora] = useState(() => {
    const now = new Date()
    now.setHours(now.getHours() + 1, 0, 0, 0)
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [responsavelId, setResponsavelId] = useState<string>(user?.id || '')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Montar lista de tipos customizados convertidos em TipoAtividadeDef
  const customDefs = useMemo(() => {
    return (tiposAtividadesCustom || []).map((t) => buildCustomTipoDef(t))
  }, [tiposAtividadesCustom])

  // Tipos da categoria selecionada (padrão + customizados)
  const tiposDaCategoria = useMemo(() => {
    const padroes = ATIVIDADES_PADRAO.filter((t) => t.categoria === selectedCategoria)
    const customs = customDefs.filter((t) => t.categoria === selectedCategoria)
    return [...padroes, ...customs]
  }, [selectedCategoria, customDefs])

  // Troca de categoria (Etapa 1)
  const handleSelectCategoria = (catId: AtividadeCategoriaId) => {
    setSelectedCategoria(catId)
    // Seleciona automaticamente o primeiro tipo da nova categoria
    const firstOfCat =
      ATIVIDADES_PADRAO.find((t) => t.categoria === catId) ||
      customDefs.find((t) => t.categoria === catId)
    if (firstOfCat) {
      setSubTipo(firstOfCat.id)
      setTitulo(firstOfCat.tituloPadrao)
      if (
        onSelectTipoEspecial &&
        (firstOfCat.id === 'auto_leitura_rge' ||
          firstOfCat.id === 'anexo_g' ||
          firstOfCat.id === 'troca_titularidade' ||
          firstOfCat.id === 'transferencia_creditos' ||
          firstOfCat.id === 'gerar_procuracao' ||
          firstOfCat.id === 'gerar_contrato')
      ) {
        onSelectTipoEspecial(firstOfCat.id)
      }
    }
  }

  // Seleção de tipo específico (Etapa 2)
  const handleSelectTipo = (item: TipoAtividadeDef) => {
    setSubTipo(item.id)
    setTitulo(item.tituloPadrao)
    if (
      onSelectTipoEspecial &&
      (item.id === 'auto_leitura_rge' ||
        item.id === 'anexo_g' ||
        item.id === 'troca_titularidade' ||
        item.id === 'transferencia_creditos' ||
        item.id === 'gerar_procuracao' ||
        item.id === 'gerar_contrato')
    ) {
      onSelectTipoEspecial(item.id)
    }
  }

  const handleModeChange = (newMode: 'atividade' | 'anotacao') => {
    setMode(newMode)
    setError(null)
    if (newMode === 'anotacao') {
      setTitulo('Anotação')
      setDescricao('')
    } else {
      const cfg = getTipoAtividadeConfig(subTipo, customDefs)
      setTitulo(cfg.tituloPadrao)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const respUser = usuarios.find((u) => u.id === responsavelId)
      const responsavelNome = respUser?.name || user?.name || 'Usuário Delfos'

      if (mode === 'anotacao') {
        if (!descricao.trim()) {
          setError('Por favor, digite o conteúdo da anotação.')
          setIsLoading(false)
          return
        }

        await addAtividade({
          cliente_id: clienteId,
          tipo: 'anotacao',
          titulo: 'Anotação',
          descricao: descricao.trim(),
          data: new Date().toISOString(),
          autor: user?.name || 'Usuário Delfos',
          responsavel_id: responsavelId || user?.id,
          responsavel_nome: responsavelNome,
          status: 'concluida',
          usina_id: selectedUsinaId || undefined,
        })
        setDescricao('')
      } else {
        const tipoConfig = getTipoAtividadeConfig(subTipo, customDefs)
        const finalTitulo = titulo.trim() || tipoConfig.tituloPadrao
        const isAutoLeitura =
          subTipo === 'auto_leitura_rge' ||
          subTipo.includes('auto_leitura') ||
          finalTitulo.toLowerCase().includes('auto leitura') ||
          finalTitulo.toLowerCase().includes('auto-leitura')
        const finalTipo = isAutoLeitura ? 'auto_leitura_rge' : subTipo
        const finalDescricao =
          descricao.trim() ||
          (isAutoLeitura
            ? 'Auto Leitura RGE - aguardando leitura do medidor'
            : tipoConfig.descricaoAjuda || tipoConfig.tituloPadrao || 'Atividade sem descrição')

        await addAtividade({
          cliente_id: clienteId,
          tipo: finalTipo,
          titulo: finalTitulo,
          descricao: finalDescricao,
          data: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
          autor: user?.name || 'Usuário Delfos',
          responsavel_id: responsavelId || user?.id,
          responsavel_nome: responsavelNome,
          status: 'pendente',
          usina_id: selectedUsinaId || undefined,
        })
        setDescricao('')
      }

      setSuccess(true)
      if (onSuccess) onSuccess()
      setTimeout(() => setSuccess(false), 2500)
    } catch (err: unknown) {
      console.error('Falha ao adicionar atividade/anotação:', err)
      setError('Não foi possível salvar. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const currentTipoConfig = getTipoAtividadeConfig(subTipo, customDefs)

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 space-y-3.5">
      {/* Botões alternadores de modo: Anotação vs Atividade + Gerenciar */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2 flex-wrap">
        <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleModeChange('atividade')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'atividade'
                ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            Tarefas
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('anotacao')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'anotacao'
                ? 'bg-white text-amber-800 font-bold shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            Nova Anotação
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenModalCompleto && (
            <button
              type="button"
              onClick={onOpenModalCompleto}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
              title="Abrir modal Registrar Atividade completo"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Registrar Atividade</span>
            </button>
          )}

          {onOpenGerenciar && (
            <button
              type="button"
              onClick={onOpenGerenciar}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 rounded-lg border border-gray-200 transition-colors"
              title="Gerenciar tipos de atividades padrão e personalizadas"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Gerenciar Tipos</span>
            </button>
          )}

          <span className="text-[11px] text-gray-400 font-medium hidden md:inline">
            {mode === 'atividade' ? 'Seleção em 2 etapas' : 'Nota interna rápida'}
          </span>
        </div>
      </div>

      {/* Seleção em 2 etapas para Atividades */}
      {mode === 'atividade' && (
        <div className="space-y-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
          {/* ETAPA 1: Escolha da Categoria */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-[10px] text-white font-bold">
                  1
                </span>
                Passo 1: Selecione a Categoria
              </span>
              <span className="text-[10px] text-gray-400">
                {CATEGORIAS_ATIVIDADES.find((c) => c.id === selectedCategoria)?.nome}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {CATEGORIAS_ATIVIDADES.map((cat) => {
                const isCatSelected = selectedCategoria === cat.id
                const IconComponent =
                  cat.id === 'comercial'
                    ? Briefcase
                    : cat.id === 'manutencao'
                      ? Wrench
                      : FileSpreadsheet

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategoria(cat.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold transition-all border ${
                      isCatSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50/50 hover:text-emerald-900'
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 ${
                        isCatSelected ? 'text-white' : 'text-gray-500'
                      }`}
                    />
                    <span className="truncate leading-tight text-[11px]">{cat.nome}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ETAPA 2: Escolha do Tipo específico da categoria */}
          <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-[10px] text-white font-bold">
                  2
                </span>
                Passo 2: Tipo de Atividade ({tiposDaCategoria.length})
              </span>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[200px]">
                {currentTipoConfig.tituloPadrao}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {tiposDaCategoria.map((item) => {
                const ItemIcon = item.icon
                const isSelected = subTipo === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTipo(item)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-left text-xs transition-all border ${
                      isSelected
                        ? 'bg-[#16A34A] text-white font-bold shadow-2xs ring-1 ring-[#16A34A] border-transparent'
                        : 'bg-white text-gray-700 hover:bg-emerald-50/60 hover:text-emerald-900 border-gray-200/80'
                    }`}
                    title={`${item.tituloPadrao} — ${item.descricaoAjuda}`}
                  >
                    <div
                      className={`p-1 rounded-md shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : `${item.iconBg} ${item.iconText}`
                      }`}
                    >
                      <ItemIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate min-w-0">
                      <span className="truncate text-[11px] leading-tight block">
                        {item.tituloPadrao}
                      </span>
                      {!item.isPadrao ? (
                        <span
                          className={`text-[9px] font-normal block ${
                            isSelected ? 'text-emerald-100' : 'text-amber-600'
                          }`}
                        >
                          personalizada
                        </span>
                      ) : item.id === 'auto_leitura_rge' ||
                        item.id === 'anexo_g' ||
                        item.id === 'troca_titularidade' ||
                        item.id === 'transferencia_creditos' ||
                        item.id === 'gerar_procuracao' ||
                        item.id === 'gerar_contrato' ? (
                        <span
                          className={`text-[9px] font-semibold block ${
                            isSelected ? 'text-emerald-100' : 'text-emerald-700'
                          }`}
                        >
                          fluxo dedicado ↗
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Formulário: Anotação rápida ou Atividade agendada */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'anotacao' ? (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-700 block">
              Conteúdo da Anotação
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Escreva a anotação sobre a fatura, negociação, restrições ou observações internas..."
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none bg-white shadow-2xs"
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Título (preenchido automaticamente ao clicar no tipo) */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Título da Atividade
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título da atividade..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* Data e Hora */}
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Data e Horário
                </label>
                <input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700 bg-white"
                />
              </div>

              {/* Usuário Responsável (padrão: usuário logado) */}
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-600" />
                  Responsável
                </label>
                <select
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  {usuarios.length === 0 && user && (
                    <option value={user.id}>{user.name || user.email}</option>
                  )}
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {user?.id === u.id ? '(Você)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campo de Vínculo de Usina */}
            {usinas.length === 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
                <Sun className="w-3.5 h-3.5 text-[#E0A838] shrink-0" />
                <span className="text-[11px] font-medium">
                  Vinculada automaticamente à usina: <strong>{usinas[0].nome}</strong>
                </span>
              </div>
            )}

            {usinas.length >= 2 && (
              <div>
                <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-1 mb-1">
                  <Sun className="w-3 h-3 text-[#E0A838]" />
                  <span>Vincular a usina</span>
                  <span className="text-[10px] text-gray-400 font-normal">(opcional)</span>
                </label>
                <select
                  value={selectedUsinaId}
                  onChange={(e) => setSelectedUsinaId(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="">Nenhuma usina vinculada (geral do cliente)</option>
                  {usinas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} {u.potencia_kwp ? `(${u.potencia_kwp} kWp)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Descrição Detalhada - Opcional */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 flex items-center justify-between mb-1">
                <span>Descrição detalhada</span>
                <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
              </label>
              <textarea
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes adicionais da atividade, pauta da reunião ou observações técnicas (opcional)..."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none bg-white"
              />
            </div>
          </div>
        )}

        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
        {success && (
          <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            ✓ {mode === 'anotacao' ? 'Anotação salva' : 'Atividade agendada'} com sucesso na
            timeline!
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : mode === 'anotacao' ? (
              <>
                <FileText className="w-3.5 h-3.5" />
                Salvar Anotação
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                Agendar Atividade
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

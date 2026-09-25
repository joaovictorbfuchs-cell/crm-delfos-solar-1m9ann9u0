import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  RotateCcw,
  Palette,
  Eye,
  EyeOff,
  Type,
  ListChecks,
  CheckCircle2,
  Building2,
  BarChart3,
  Sun,
  TrendingUp,
  DollarSign,
  Sparkles,
  Layers,
} from 'lucide-react'
import {
  PALETA_CORES_DESTAQUE,
  ORDEM_BLOCOS_PADRAO,
  BLOCOS_METADATA,
  getConteudoPropostaDefaults,
  type BlocoPropostaId,
  type ConteudoProposta,
  type DiferencialInstitucional,
} from '@/lib/conteudoProposta'

export interface PainelEdicaoConteudoPropostaProps {
  conteudo: ConteudoProposta
  onChange: (novoConteudo: ConteudoProposta) => void
}

/** Seletor de cores reutilizável com paleta predefinida e hex customizável */
interface ColorPickerFieldProps {
  label?: string
  value: string
  onChange: (color: string) => void
}

const ColorPickerField: React.FC<ColorPickerFieldProps> = ({
  label = 'Cor de destaque',
  value,
  onChange,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase">{value}</span>
      </div>
      <div className="flex items-center flex-wrap gap-1.5">
        {PALETA_CORES_DESTAQUE.map((item) => {
          const isSelected = item.valor.toLowerCase() === value?.toLowerCase()
          return (
            <button
              key={item.valor}
              type="button"
              onClick={() => onChange(item.valor)}
              className={`w-6 h-6 rounded-full border-2 transition-transform shadow-2xs flex items-center justify-center ${
                isSelected ? 'scale-110 ring-2 ring-offset-1 ring-emerald-500' : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: item.valor,
                borderColor: isSelected ? '#ffffff' : 'rgba(0,0,0,0.1)',
              }}
              title={item.nome}
            >
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </button>
          )
        })}
        {/* Input customizado de cor nativo */}
        <div className="relative flex items-center ml-1">
          <input
            type="color"
            value={value || '#16A34A'}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 p-0 rounded-md border border-gray-300 cursor-pointer overflow-hidden"
            title="Escolher cor personalizada"
          />
        </div>
      </div>
    </div>
  )
}

/** Componente de edição de checklist com adicionar/editar/remover */
interface ChecklistEditorProps {
  label: string
  items: string[]
  onChange: (novosItens: string[]) => void
  placeholderNovo?: string
}

const ChecklistEditor: React.FC<ChecklistEditorProps> = ({
  label,
  items,
  onChange,
  placeholderNovo = 'Novo item da lista...',
}) => {
  const [novoTexto, setNovoTexto] = useState('')

  const handleAddItem = () => {
    const textoLimpo = novoTexto.trim()
    if (!textoLimpo) return
    onChange([...items, textoLimpo])
    setNovoTexto('')
  }

  const handleEditItem = (index: number, valor: string) => {
    const atualizados = [...items]
    atualizados[index] = valor
    onChange(atualizados)
  }

  const handleRemoveItem = (index: number) => {
    const atualizados = items.filter((_, i) => i !== index)
    onChange(atualizados)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
          <span className="text-[10px] font-semibold text-gray-400">({items.length})</span>
        </label>
      </div>

      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="text-emerald-600 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={item}
              onChange={(e) => handleEditItem(idx, e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            />
            <button
              type="button"
              onClick={() => handleRemoveItem(idx)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Remover item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Input para adicionar novo item */}
        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddItem()
              }
            }}
            placeholder={placeholderNovo}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50/50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          />
          <button
            type="button"
            onClick={handleAddItem}
            disabled={!novoTexto.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 flex items-center gap-1 shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Componente de acordeão colapsável por seção da proposta */
interface SecaoEditorProps {
  id: string
  titulo: string
  subtitulo: string
  icone: React.ReactNode
  aberta: boolean
  onToggleAberta: () => void
  visivel?: boolean
  onToggleVisivel?: (visivel: boolean) => void
  children: React.ReactNode
}

const SecaoEditor: React.FC<SecaoEditorProps> = ({
  titulo,
  subtitulo,
  icone,
  aberta,
  onToggleAberta,
  visivel,
  onToggleVisivel,
  children,
}) => {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-all">
      <div className="px-3.5 py-2.5 bg-gray-50/90 border-b border-gray-200/80 flex items-center justify-between gap-2">
        <div
          onClick={onToggleAberta}
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
        >
          <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            {icone}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold text-gray-900 truncate">{titulo}</h5>
              {visivel !== undefined && (
                <span
                  className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
                    visivel
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border-gray-300'
                  }`}
                >
                  {visivel ? 'Exibido' : 'Oculto'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 truncate">{subtitulo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleVisivel !== undefined && visivel !== undefined && (
            <label
              className="relative inline-flex items-center cursor-pointer select-none"
              title={visivel ? 'Seção visível na proposta' : 'Seção oculta na proposta'}
            >
              <input
                type="checkbox"
                className="sr-only peer"
                checked={visivel}
                onChange={(e) => onToggleVisivel(e.target.checked)}
              />
              <div className="w-8 h-4.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          )}

          <button
            type="button"
            onClick={onToggleAberta}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors"
            title={aberta ? 'Recolher seção' : 'Expandir seção'}
          >
            {aberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {aberta && (
        <div className="p-3.5 space-y-3.5 bg-white animate-in fade-in duration-100 text-xs">
          {children}
        </div>
      )}
    </div>
  )
}

export const PainelEdicaoConteudoProposta: React.FC<PainelEdicaoConteudoPropostaProps> = ({
  conteudo,
  onChange,
}) => {
  // Controle de acordeões abertos
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({
    capa: false,
    apresentacao: false,
    situacaoAtual: false,
    seuSistema: false,
    projecao25Anos: false,
    investimento: false,
  })

  const toggleSecao = (id: string) => {
    setSecoesAbertas((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const ordemAtual: BlocoPropostaId[] =
    conteudo.ordemBlocos && conteudo.ordemBlocos.length === ORDEM_BLOCOS_PADRAO.length
      ? conteudo.ordemBlocos
      : [...ORDEM_BLOCOS_PADRAO]

  const blocosVisiveis: Record<BlocoPropostaId, boolean> = {
    capa: conteudo.blocosVisiveis?.capa !== false,
    apresentacao:
      conteudo.blocosVisiveis?.apresentacao !== undefined
        ? conteudo.blocosVisiveis.apresentacao !== false
        : conteudo.secaoApresentacao?.visivel !== false,
    situacaoAtual:
      conteudo.blocosVisiveis?.situacaoAtual !== undefined
        ? conteudo.blocosVisiveis.situacaoAtual !== false
        : conteudo.secaoSituacaoAtual?.visivel !== false,
    seuSistema:
      conteudo.blocosVisiveis?.seuSistema !== undefined
        ? conteudo.blocosVisiveis.seuSistema !== false
        : conteudo.secaoSeuSistema?.visivel !== false,
    projecao25Anos:
      conteudo.blocosVisiveis?.projecao25Anos !== undefined
        ? conteudo.blocosVisiveis.projecao25Anos !== false
        : conteudo.secaoProjecao25Anos?.visivel !== false,
    investimento:
      conteudo.blocosVisiveis?.investimento !== undefined
        ? conteudo.blocosVisiveis.investimento !== false
        : conteudo.secaoInvestimento?.visivel !== false,
  }

  const totalAtivos = ORDEM_BLOCOS_PADRAO.filter((id) => blocosVisiveis[id]).length

  const handleMoverBloco = (index: number, direcao: 'cima' | 'baixo') => {
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1
    if (novoIndex < 0 || novoIndex >= ordemAtual.length) return
    const novaOrdem = [...ordemAtual]
    const [removido] = novaOrdem.splice(index, 1)
    novaOrdem.splice(novoIndex, 0, removido)
    onChange({
      ...conteudo,
      ordemBlocos: novaOrdem,
      blocosVisiveis,
    })
  }

  const handleToggleVisibilidadeBloco = (id: BlocoPropostaId, visivel: boolean) => {
    const novosBlocosVisiveis = {
      ...blocosVisiveis,
      [id]: visivel,
    }

    // Sincroniza também com os campos legados internos se aplicável
    let novoConteudo: ConteudoProposta = {
      ...conteudo,
      ordemBlocos: ordemAtual,
      blocosVisiveis: novosBlocosVisiveis,
    }

    if (id === 'apresentacao') {
      novoConteudo = {
        ...novoConteudo,
        secaoApresentacao: { ...novoConteudo.secaoApresentacao, visivel },
      }
    } else if (id === 'situacaoAtual') {
      novoConteudo = {
        ...novoConteudo,
        secaoSituacaoAtual: { ...novoConteudo.secaoSituacaoAtual, visivel },
      }
    } else if (id === 'seuSistema') {
      novoConteudo = {
        ...novoConteudo,
        secaoSeuSistema: { ...novoConteudo.secaoSeuSistema, visivel },
      }
    } else if (id === 'projecao25Anos') {
      novoConteudo = {
        ...novoConteudo,
        secaoProjecao25Anos: { ...novoConteudo.secaoProjecao25Anos, visivel },
      }
    } else if (id === 'investimento') {
      novoConteudo = {
        ...novoConteudo,
        secaoInvestimento: { ...novoConteudo.secaoInvestimento, visivel },
      }
    }

    onChange(novoConteudo)
  }

  const handleRedefinirOrdemEVisibilidade = () => {
    const visiveisTodosLigados: Record<BlocoPropostaId, boolean> = {
      capa: true,
      apresentacao: true,
      situacaoAtual: true,
      seuSistema: true,
      projecao25Anos: true,
      investimento: true,
    }

    onChange({
      ...conteudo,
      ordemBlocos: [...ORDEM_BLOCOS_PADRAO],
      blocosVisiveis: visiveisTodosLigados,
      secaoApresentacao: { ...conteudo.secaoApresentacao, visivel: true },
      secaoSituacaoAtual: { ...conteudo.secaoSituacaoAtual, visivel: true },
      secaoSeuSistema: { ...conteudo.secaoSeuSistema, visivel: true },
      secaoProjecao25Anos: { ...conteudo.secaoProjecao25Anos, visivel: true },
      secaoInvestimento: { ...conteudo.secaoInvestimento, visivel: true },
    })
  }

  const handleRestaurarPadroes = () => {
    if (
      window.confirm(
        'Deseja restaurar todos os textos e cores da proposta para os valores padrão da Delfos Solar?',
      )
    ) {
      onChange(getConteudoPropostaDefaults())
    }
  }

  // Helpers para atualização imutável profunda
  const updateCapa = (campo: string, valor: any) => {
    onChange({
      ...conteudo,
      capa: { ...conteudo.capa, [campo]: valor },
    })
  }

  const updateApresentacao = (campo: string, valor: any) => {
    onChange({
      ...conteudo,
      secaoApresentacao: { ...conteudo.secaoApresentacao, [campo]: valor },
    })
  }

  const updateSituacaoAtual = (campo: string, valor: any) => {
    onChange({
      ...conteudo,
      secaoSituacaoAtual: { ...conteudo.secaoSituacaoAtual, [campo]: valor },
    })
  }

  const updateSeuSistema = (campo: string, valor: any) => {
    onChange({
      ...conteudo,
      secaoSeuSistema: { ...conteudo.secaoSeuSistema, [campo]: valor },
    })
  }

  const updateBlocoSeuSistema = (
    blocoKey: 'blocoComoFunciona' | 'blocoMonitoramentoDetalhado',
    campo: string,
    valor: any,
  ) => {
    onChange({
      ...conteudo,
      secaoSeuSistema: {
        ...conteudo.secaoSeuSistema,
        [blocoKey]: {
          ...conteudo.secaoSeuSistema[blocoKey],
          [campo]: valor,
        },
      },
    })
  }

  const updateProjecao25Anos = (campo: string, valor: any) => {
    onChange({
      ...conteudo,
      secaoProjecao25Anos: { ...conteudo.secaoProjecao25Anos, [campo]: valor },
    })
  }

  const updateInvestimento = (campo: string, valor: any) => {
    onChange({
      ...conteudo,
      secaoInvestimento: { ...conteudo.secaoInvestimento, [campo]: valor },
    })
  }

  // CRUD dos Diferenciais Institucionais
  const handleAddDiferencial = () => {
    const novoDif: DiferencialInstitucional = {
      id: `dif-${Date.now()}`,
      icone: '⚡',
      titulo: 'Novo Diferencial',
      descricao: 'Descrição do diferencial exclusivo da Delfos Solar.',
    }
    updateApresentacao('diferenciais', [
      ...(conteudo.secaoApresentacao.diferenciais || []),
      novoDif,
    ])
  }

  const handleEditDiferencial = (
    index: number,
    campo: keyof DiferencialInstitucional,
    valor: string,
  ) => {
    const diferenciais = [...(conteudo.secaoApresentacao.diferenciais || [])]
    diferenciais[index] = { ...diferenciais[index], [campo]: valor }
    updateApresentacao('diferenciais', diferenciais)
  }

  const handleRemoveDiferencial = (index: number) => {
    const diferenciais = (conteudo.secaoApresentacao.diferenciais || []).filter(
      (_, i) => i !== index,
    )
    updateApresentacao('diferenciais', diferenciais)
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
      {/* Header do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                Personalização do Conteúdo da Proposta
              </h4>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                100% Editável
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Edite textos, títulos, avisos, checklists e selecione cores para cada seção da
              proposta. As alterações refletem imediatamente no preview abaixo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRestaurarPadroes}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Restaurar todos os textos e cores para o padrão original"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Restaurar Padrões</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO: ESTRUTURA E ORDEM DAS SEÇÕES DA PROPOSTA                           */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-bold text-gray-900">
                  Estrutura e Ordem das Seções da Proposta
                </h5>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {totalAtivos} de {ORDEM_BLOCOS_PADRAO.length} seções ativas na proposta
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Use as setas para reorganizar a sequência dos blocos no PDF/Word/Preview e ative ou
                oculte seções conforme o perfil do cliente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRedefinirOrdemEVisibilidade}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center gap-1.5 transition-colors shadow-2xs self-start sm:self-auto shrink-0"
            title="Restaura a ordem original padrão e reativa todos os 6 blocos"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Redefinir Ordem e Visibilidade</span>
          </button>
        </div>

        {/* Lista interativa dos blocos na ordem atual */}
        <div className="space-y-1.5">
          {ordemAtual.map((blocoId, index) => {
            const meta = BLOCOS_METADATA[blocoId] || {
              id: blocoId,
              titulo: blocoId,
              descricao: '',
            }
            const isVisivel = blocosVisiveis[blocoId]
            const isPrimeiro = index === 0
            const isUltimo = index === ordemAtual.length - 1

            return (
              <div
                key={blocoId}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-all ${
                  isVisivel
                    ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    : 'bg-slate-100/60 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Posição ordinal */}
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isVisivel ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </span>

                  {/* Nome e descrição do bloco */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {meta.titulo}
                      </span>
                      {!isVisivel && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-600 border border-gray-300 shrink-0">
                          Oculto
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{meta.descricao}</p>
                  </div>
                </div>

                {/* Controles: mover para cima, mover para baixo e switch de visibilidade */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-white border border-gray-200 rounded-md shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      disabled={isPrimeiro}
                      onClick={() => handleMoverBloco(index, 'cima')}
                      className="p-1 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-400 transition-colors"
                      title={isPrimeiro ? 'Já é o primeiro bloco' : 'Mover para cima'}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-3.5 bg-gray-200" />
                    <button
                      type="button"
                      disabled={isUltimo}
                      onClick={() => handleMoverBloco(index, 'baixo')}
                      className="p-1 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-400 transition-colors"
                      title={isUltimo ? 'Já é o último bloco' : 'Mover para baixo'}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <label
                    className="relative inline-flex items-center cursor-pointer select-none ml-1"
                    title={isVisivel ? 'Ocultar bloco da proposta' : 'Exibir bloco na proposta'}
                  >
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isVisivel}
                      onChange={(e) => handleToggleVisibilidadeBloco(blocoId, e.target.checked)}
                    />
                    <div className="w-8 h-4.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lista de Seções Editáveis em Acordeão */}
      <div className="space-y-3">
        {/* ========================================================================= */}
        {/* SEÇÃO 1: CAPA DA PROPOSTA                                                 */}
        {/* ========================================================================= */}
        <SecaoEditor
          id="capa"
          titulo="Capa da Proposta"
          subtitulo="Badge, chamada principal, subtítulo, rótulos e cor de destaque da capa"
          icone={<Type className="w-4 h-4" />}
          aberta={Boolean(secoesAbertas.capa)}
          onToggleAberta={() => toggleSecao('capa')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ColorPickerField
              label="Cor de destaque da capa"
              value={conteudo.capa.corDestaque || '#16A34A'}
              onChange={(cor) => updateCapa('corDestaque', cor)}
            />

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Badge / Etiqueta Superior
              </label>
              <input
                type="text"
                value={conteudo.capa.badge}
                onChange={(e) => updateCapa('badge', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="PROPOSTA TÉCNICO-COMERCIAL"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Título Principal da Capa (quebras de linha permitidas)
              </label>
              <textarea
                rows={2}
                value={conteudo.capa.titulo}
                onChange={(e) => updateCapa('titulo', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Energia que&#10;gera retorno"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Subtítulo da Capa
              </label>
              <input
                type="text"
                value={conteudo.capa.subtitulo}
                onChange={(e) => updateCapa('subtitulo', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Sistema fotovoltaico projetado exclusivamente para você"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Rótulo "Preparada para"
              </label>
              <input
                type="text"
                value={conteudo.capa.rotuloPreparadaPara}
                onChange={(e) => updateCapa('rotuloPreparadaPara', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="PREPARADA PARA:"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Rótulo do Consultor
              </label>
              <input
                type="text"
                value={conteudo.capa.rotuloConsultor}
                onChange={(e) => updateCapa('rotuloConsultor', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Consultor:"
              />
            </div>
          </div>
        </SecaoEditor>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: DADOS DO CLIENTE & LOCALIZAÇÃO (Rótulos)                         */}
        {/* ========================================================================= */}
        <SecaoEditor
          id="dadosCliente"
          titulo="Rótulos dos Dados do Cliente"
          subtitulo="Personalize as legendas de documento, cidade e endereço da usina"
          icone={<Building2 className="w-4 h-4" />}
          aberta={Boolean(secoesAbertas.dadosCliente)}
          onToggleAberta={() => toggleSecao('dadosCliente')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Rótulo Documento
              </label>
              <input
                type="text"
                value={conteudo.dadosCliente.rotuloDocumento}
                onChange={(e) =>
                  onChange({
                    ...conteudo,
                    dadosCliente: { ...conteudo.dadosCliente, rotuloDocumento: e.target.value },
                  })
                }
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="CPF/CNPJ:"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Rótulo Município / UF
              </label>
              <input
                type="text"
                value={conteudo.dadosCliente.rotuloCidade}
                onChange={(e) =>
                  onChange({
                    ...conteudo,
                    dadosCliente: { ...conteudo.dadosCliente, rotuloCidade: e.target.value },
                  })
                }
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Município/UF:"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Rótulo Endereço da Usina
              </label>
              <input
                type="text"
                value={conteudo.dadosCliente.rotuloEndereco}
                onChange={(e) =>
                  onChange({
                    ...conteudo,
                    dadosCliente: { ...conteudo.dadosCliente, rotuloEndereco: e.target.value },
                  })
                }
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Endereço da Usina:"
              />
            </div>
          </div>
        </SecaoEditor>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: APRESENTAÇÃO INSTITUCIONAL & DIFERENCIAIS                        */}
        {/* ========================================================================= */}
        <SecaoEditor
          id="apresentacao"
          titulo="1. Apresentação da Empresa (Institucional)"
          subtitulo="Textos da Delfos Solar, tempo de mercado e lista de diferenciais"
          icone={<Building2 className="w-4 h-4" />}
          aberta={Boolean(secoesAbertas.apresentacao)}
          onToggleAberta={() => toggleSecao('apresentacao')}
          visivel={conteudo.secaoApresentacao.visivel}
          onToggleVisivel={(visivel) => updateApresentacao('visivel', visivel)}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ColorPickerField
                label="Cor de destaque da seção"
                value={conteudo.secaoApresentacao.corDestaque || '#16A34A'}
                onChange={(cor) => updateApresentacao('corDestaque', cor)}
              />

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Badge de Categoria
                </label>
                <input
                  type="text"
                  value={conteudo.secaoApresentacao.badge}
                  onChange={(e) => updateApresentacao('badge', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="INSTITUCIONAL"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Badge Tempo de Atuação
                </label>
                <input
                  type="text"
                  value={conteudo.secaoApresentacao.tempoAtuacaoBadge}
                  onChange={(e) => updateApresentacao('tempoAtuacaoBadge', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="DESDE 2014"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Título da Apresentação
                </label>
                <input
                  type="text"
                  value={conteudo.secaoApresentacao.titulo}
                  onChange={(e) => updateApresentacao('titulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="A Delfos Solar"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Subtítulo / Slogan
                </label>
                <input
                  type="text"
                  value={conteudo.secaoApresentacao.subtitulo}
                  onChange={(e) => updateApresentacao('subtitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Energia que gera retorno"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Texto Descritivo Institucional
              </label>
              <textarea
                rows={3}
                value={conteudo.secaoApresentacao.textoDescritivo}
                onChange={(e) => updateApresentacao('textoDescritivo', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Descrição institucional completa da empresa..."
              />
            </div>

            {/* Lista de Diferenciais Institucionais com CRUD */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                    <span>🏢</span>
                    <span>Cards de Diferenciais da Empresa</span>
                    <span className="text-[10px] text-gray-400">
                      ({conteudo.secaoApresentacao.diferenciais?.length || 0})
                    </span>
                  </h6>
                  <p className="text-[10px] text-gray-500">
                    Adicione, edite ou remova os cartões de diferenciais exibidos na apresentação.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddDiferencial}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Diferencial</span>
                </button>
              </div>

              <div className="space-y-2">
                {(conteudo.secaoApresentacao.diferenciais || []).map((dif, idx) => (
                  <div
                    key={dif.id || idx}
                    className="p-2.5 bg-white border border-gray-200 rounded-lg shadow-2xs space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={dif.icone}
                        onChange={(e) => handleEditDiferencial(idx, 'icone', e.target.value)}
                        className="w-10 text-center text-sm py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        title="Ícone ou emoji do diferencial"
                        placeholder="⚡"
                      />
                      <input
                        type="text"
                        value={dif.titulo}
                        onChange={(e) => handleEditDiferencial(idx, 'titulo', e.target.value)}
                        className="flex-1 text-xs font-bold px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Título do diferencial..."
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDiferencial(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remover este diferencial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={dif.descricao}
                      onChange={(e) => handleEditDiferencial(idx, 'descricao', e.target.value)}
                      className="w-full text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Descrição do diferencial..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SecaoEditor>

        {/* ========================================================================= */}
        {/* SEÇÃO 4: SITUAÇÃO ATUAL                                                   */}
        {/* ========================================================================= */}
        <SecaoEditor
          id="situacaoAtual"
          titulo="2. Situação Atual"
          subtitulo="Títulos e subtítulos dos cards de consumo, custos e gastos sem solar"
          icone={<BarChart3 className="w-4 h-4" />}
          aberta={Boolean(secoesAbertas.situacaoAtual)}
          onToggleAberta={() => toggleSecao('situacaoAtual')}
          visivel={conteudo.secaoSituacaoAtual.visivel}
          onToggleVisivel={(visivel) => updateSituacaoAtual('visivel', visivel)}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ColorPickerField
                label="Cor de destaque da seção"
                value={conteudo.secaoSituacaoAtual.corDestaque || '#16A34A'}
                onChange={(cor) => updateSituacaoAtual('corDestaque', cor)}
              />

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Badge da Seção
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSituacaoAtual.badge}
                  onChange={(e) => updateSituacaoAtual('badge', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Situação Atual"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Título da Seção
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSituacaoAtual.titulo}
                  onChange={(e) => updateSituacaoAtual('titulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Situação Atual"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Subtítulo Explicativo da Seção
              </label>
              <textarea
                rows={2}
                value={conteudo.secaoSituacaoAtual.subtitulo}
                onChange={(e) => updateSituacaoAtual('subtitulo', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Panorama do seu padrão de consumo energético..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Card 1: Título de Consumo
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSituacaoAtual.consumoTitulo}
                  onChange={(e) => updateSituacaoAtual('consumoTitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Consumo de Energia"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Card 1: Subtítulo de Consumo
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSituacaoAtual.consumoSubtitulo}
                  onChange={(e) => updateSituacaoAtual('consumoSubtitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Volume consumido da concessionária"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Card 2: Título de Custos
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSituacaoAtual.custoTitulo}
                  onChange={(e) => updateSituacaoAtual('custoTitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Custos com Concessionária"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Card 2: Subtítulo de Custos
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSituacaoAtual.custoSubtitulo}
                  onChange={(e) => updateSituacaoAtual('custoSubtitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Desembolso financeiro sem retorno"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Card 3: Título de Gastos Sem Solar (Use {'{periodo}'} para tempo dinâmico)
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSituacaoAtual.avisoInerciaTitulo}
                  onChange={(e) => updateSituacaoAtual('avisoInerciaTitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Gastos Acumulados Sem Solar: 1, {periodo} e 25 Anos"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Card 3: Subtítulo Explicativo
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSituacaoAtual.avisoInerciaSubtitulo}
                  onChange={(e) => updateSituacaoAtual('avisoInerciaSubtitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Total faturado pela concessionária ao longo do tempo..."
                />
              </div>
            </div>
          </div>
        </SecaoEditor>

        {/* ========================================================================= */}
        {/* SEÇÃO 5: SEU SISTEMA FOTOVOLTAICO                                         */}
        {/* ========================================================================= */}
        <SecaoEditor
          id="seuSistema"
          titulo="3. Seu Sistema Fotovoltaico & Engenharia"
          subtitulo="Blocos de funcionamento On-Grid, aplicativo mobile e monitoramento"
          icone={<Sun className="w-4 h-4" />}
          aberta={Boolean(secoesAbertas.seuSistema)}
          onToggleAberta={() => toggleSecao('seuSistema')}
          visivel={conteudo.secaoSeuSistema.visivel}
          onToggleVisivel={(visivel) => updateSeuSistema('visivel', visivel)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ColorPickerField
                label="Cor de destaque da seção"
                value={conteudo.secaoSeuSistema.corDestaque || '#16A34A'}
                onChange={(cor) => updateSeuSistema('corDestaque', cor)}
              />

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Badge Superior
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSeuSistema.badge}
                  onChange={(e) => updateSeuSistema('badge', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Seu Sistema Fotovoltaico"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Título Principal
                </label>
                <input
                  type="text"
                  value={conteudo.secaoSeuSistema.titulo}
                  onChange={(e) => updateSeuSistema('titulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Conheça sua usina solar"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Subtítulo Explicativo
              </label>
              <textarea
                rows={2}
                value={conteudo.secaoSeuSistema.subtitulo}
                onChange={(e) => updateSeuSistema('subtitulo', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Engenharia de precisão planejada sob medida para você..."
              />
            </div>

            {/* Sub-bloco A: Como Funciona o Sistema Solar (On-Grid) */}
            <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-blue-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-blue-800 font-bold text-xs">
                    ⚡ Bloco: Como Funciona o On-Grid
                  </span>
                  <span className="text-[9.5px] px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    Ilustração do Sistema
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={conteudo.secaoSeuSistema.blocoComoFunciona?.visivel !== false}
                    onChange={(e) =>
                      updateBlocoSeuSistema('blocoComoFunciona', 'visivel', e.target.checked)
                    }
                  />
                  <div className="w-8 h-4.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block mb-1">Badge</label>
                  <input
                    type="text"
                    value={conteudo.secaoSeuSistema.blocoComoFunciona.badge}
                    onChange={(e) =>
                      updateBlocoSeuSistema('blocoComoFunciona', 'badge', e.target.value)
                    }
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block mb-1">Título</label>
                  <input
                    type="text"
                    value={conteudo.secaoSeuSistema.blocoComoFunciona.titulo}
                    onChange={(e) =>
                      updateBlocoSeuSistema('blocoComoFunciona', 'titulo', e.target.value)
                    }
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block mb-1">
                    Tag Direita
                  </label>
                  <input
                    type="text"
                    value={conteudo.secaoSeuSistema.blocoComoFunciona.tagDireita}
                    onChange={(e) =>
                      updateBlocoSeuSistema('blocoComoFunciona', 'tagDireita', e.target.value)
                    }
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-gray-700 block mb-1">
                    Texto Descritivo
                  </label>
                  <textarea
                    rows={2}
                    value={conteudo.secaoSeuSistema.blocoComoFunciona.descricao}
                    onChange={(e) =>
                      updateBlocoSeuSistema('blocoComoFunciona', 'descricao', e.target.value)
                    }
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <ChecklistEditor
                    label="Checklist de Homologação / Engenharia"
                    items={conteudo.secaoSeuSistema.blocoComoFunciona.checklist || []}
                    onChange={(itens) =>
                      updateBlocoSeuSistema('blocoComoFunciona', 'checklist', itens)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Sub-bloco B: Monitoramento Detalhado */}
            <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-purple-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-purple-800 font-bold text-xs">
                    📊 Bloco: Monitoramento Detalhado
                  </span>
                  <span className="text-[9.5px] px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 font-semibold">
                    Mockup do Smartphone
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={
                      conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado?.visivel !== false
                    }
                    onChange={(e) =>
                      updateBlocoSeuSistema(
                        'blocoMonitoramentoDetalhado',
                        'visivel',
                        e.target.checked,
                      )
                    }
                  />
                  <div className="w-8 h-4.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block mb-1">Badge</label>
                  <input
                    type="text"
                    value={conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.badge}
                    onChange={(e) =>
                      updateBlocoSeuSistema('blocoMonitoramentoDetalhado', 'badge', e.target.value)
                    }
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block mb-1">Título</label>
                  <input
                    type="text"
                    value={conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.titulo}
                    onChange={(e) =>
                      updateBlocoSeuSistema('blocoMonitoramentoDetalhado', 'titulo', e.target.value)
                    }
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-700 block mb-1">
                    Tag Direita
                  </label>
                  <input
                    type="text"
                    value={conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.tagDireita}
                    onChange={(e) =>
                      updateBlocoSeuSistema(
                        'blocoMonitoramentoDetalhado',
                        'tagDireita',
                        e.target.value,
                      )
                    }
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-gray-700 block mb-1">
                    Texto Descritivo
                  </label>
                  <textarea
                    rows={2}
                    value={conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.descricao}
                    onChange={(e) =>
                      updateBlocoSeuSistema(
                        'blocoMonitoramentoDetalhado',
                        'descricao',
                        e.target.value,
                      )
                    }
                    className="w-full text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <ChecklistEditor
                    label="Checklist de Recursos do Aplicativo"
                    items={conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.checklist || []}
                    onChange={(itens) =>
                      updateBlocoSeuSistema('blocoMonitoramentoDetalhado', 'checklist', itens)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </SecaoEditor>

        {/* ========================================================================= */}
        {/* SEÇÃO 6: PROJEÇÃO EM 25 ANOS                                              */}
        {/* ========================================================================= */}
        <SecaoEditor
          id="projecao25Anos"
          titulo="4. Projeção de Economia em 25 Anos"
          subtitulo="Títulos da curva de retorno financeiro e aviso legal regulatório"
          icone={<TrendingUp className="w-4 h-4" />}
          aberta={Boolean(secoesAbertas.projecao25Anos)}
          onToggleAberta={() => toggleSecao('projecao25Anos')}
          visivel={conteudo.secaoProjecao25Anos.visivel}
          onToggleVisivel={(visivel) => updateProjecao25Anos('visivel', visivel)}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ColorPickerField
                label="Cor de destaque da seção"
                value={conteudo.secaoProjecao25Anos.corDestaque || '#16A34A'}
                onChange={(cor) => updateProjecao25Anos('corDestaque', cor)}
              />

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Badge Superior
                </label>
                <input
                  type="text"
                  value={conteudo.secaoProjecao25Anos.badge}
                  onChange={(e) => updateProjecao25Anos('badge', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Curva de Retorno e Payback"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Título Principal
                </label>
                <input
                  type="text"
                  value={conteudo.secaoProjecao25Anos.titulo}
                  onChange={(e) => updateProjecao25Anos('titulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Sua economia ao longo do tempo"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Subtítulo Explicativo
              </label>
              <textarea
                rows={2}
                value={conteudo.secaoProjecao25Anos.subtitulo}
                onChange={(e) => updateProjecao25Anos('subtitulo', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Veja o quanto você vai economizar ao longo da vida útil..."
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Aviso Legal de Rodapé da Projeção
              </label>
              <input
                type="text"
                value={conteudo.secaoProjecao25Anos.avisoLegal}
                onChange={(e) => updateProjecao25Anos('avisoLegal', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="* Projeção baseada na degradação linear de fábrica..."
              />
            </div>
          </div>
        </SecaoEditor>

        {/* ========================================================================= */}
        {/* SEÇÃO 7: INVESTIMENTO & CONDIÇÕES DE PAGAMENTO                            */}
        {/* ========================================================================= */}
        <SecaoEditor
          id="investimento"
          titulo="5. Investimento e Condições de Pagamento"
          subtitulo="Textos do banner de investimento, prazo turnkey e aviso de postergação"
          icone={<DollarSign className="w-4 h-4" />}
          aberta={Boolean(secoesAbertas.investimento)}
          onToggleAberta={() => toggleSecao('investimento')}
          visivel={conteudo.secaoInvestimento.visivel}
          onToggleVisivel={(visivel) => updateInvestimento('visivel', visivel)}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ColorPickerField
                label="Cor de destaque do banner"
                value={conteudo.secaoInvestimento.corDestaque || '#16A34A'}
                onChange={(cor) => updateInvestimento('corDestaque', cor)}
              />

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Título do Banner de Investimento
                </label>
                <input
                  type="text"
                  value={conteudo.secaoInvestimento.titulo}
                  onChange={(e) => updateInvestimento('titulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Investimento Total"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Subtítulo de Condições
                </label>
                <input
                  type="text"
                  value={conteudo.secaoInvestimento.subtituloCondicoes}
                  onChange={(e) => updateInvestimento('subtituloCondicoes', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Condições de pagamento"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Texto Complementar de Prazo Turnkey
              </label>
              <input
                type="text"
                value={conteudo.secaoInvestimento.prazoTextoComplementar}
                onChange={(e) => updateInvestimento('prazoTextoComplementar', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                placeholder="Engenharia, homologação na concessionária e instalação turnkey"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Aviso Postergação: Título
                </label>
                <input
                  type="text"
                  value={conteudo.secaoInvestimento.avisoPostergacaoTitulo}
                  onChange={(e) => updateInvestimento('avisoPostergacaoTitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Custo de Postergação"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Aviso Postergação: Subtítulo
                </label>
                <input
                  type="text"
                  value={conteudo.secaoInvestimento.avisoPostergacaoSubtitulo}
                  onChange={(e) => updateInvestimento('avisoPostergacaoSubtitulo', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Cada mês sem energia solar custa dinheiro"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Aviso Postergação: Texto Explicativo
                </label>
                <textarea
                  rows={2}
                  value={conteudo.secaoInvestimento.avisoPostergacaoTexto}
                  onChange={(e) => updateInvestimento('avisoPostergacaoTexto', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="Adiar a decisão significa continuar pagando a conta cheia..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Aviso Legal de Rodapé
                </label>
                <input
                  type="text"
                  value={conteudo.secaoInvestimento.avisoLegalRodape}
                  onChange={(e) => updateInvestimento('avisoLegalRodape', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  placeholder="De acordo com as especificações e valores da proposta"
                />
              </div>
            </div>
          </div>
        </SecaoEditor>
      </div>
    </div>
  )
}

export default PainelEdicaoConteudoProposta

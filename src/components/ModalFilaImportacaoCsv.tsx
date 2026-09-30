import React, { useState, useMemo } from 'react'
import {
  X,
  Phone,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UserPlus,
  GitMerge,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react'
import { Cliente } from '@/types/crm'
import {
  ItemImportacaoContatoCsv,
  DecisaoContatoCsv,
} from '@/services/importacaoCsvContatosService'
import { formatWhatsAppPhone } from '@/lib/formatters'

interface ModalFilaImportacaoCsvProps {
  isOpen: boolean
  onClose: () => void
  itens: ItemImportacaoContatoCsv[]
  clientesExistentes: Cliente[]
  onAlterarDecisao: (idTemp: string, decisao: DecisaoContatoCsv, clienteMescla?: Cliente) => void
  onExecutarImportacao: () => Promise<void>
  isProcessando: boolean
  progresso: number
}

export function ModalFilaImportacaoCsv({
  isOpen,
  onClose,
  itens,
  clientesExistentes,
  onAlterarDecisao,
  onExecutarImportacao,
  isProcessando,
  progresso,
}: ModalFilaImportacaoCsvProps) {
  const [filtroAba, setFiltroAba] = useState<'pendentes' | 'identicos' | 'todos'>('pendentes')
  const [busca, setBusca] = useState<string>('')

  // Estado para o modal de seleção de cliente para mescla
  const [itemParaMescla, setItemParaMescla] = useState<ItemImportacaoContatoCsv | null>(null)
  const [buscaClienteMescla, setBuscaClienteMescla] = useState<string>('')
  const [clienteSelecionadoMescla, setClienteSelecionadoMescla] = useState<Cliente | null>(null)

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = itens.length
    const identicos = itens.filter((i) => i.status === 'identico').length
    const diferentes = itens.filter((i) => i.status === 'diferente').length
    const naoEncontrados = itens.filter((i) => i.status === 'nao_encontrado').length
    const pendentes = itens.filter((i) => !i.resolvido).length
    const resolvidos = itens.filter((i) => i.resolvido).length

    const acaoManter = itens.filter((i) => i.decisao === 'manter_atual').length
    const acaoAtualizar = itens.filter((i) => i.decisao === 'atualizar_whatsapp').length
    const acaoCriar = itens.filter((i) => i.decisao === 'criar_novo').length
    const acaoMesclar = itens.filter((i) => i.decisao === 'mesclar_existente').length
    const acaoIgnorar = itens.filter((i) => i.decisao === 'ignorar').length

    return {
      total,
      identicos,
      diferentes,
      naoEncontrados,
      pendentes,
      resolvidos,
      acaoManter,
      acaoAtualizar,
      acaoCriar,
      acaoMesclar,
      acaoIgnorar,
    }
  }, [itens])

  // Itens filtrados para exibição
  const itensExibidos = useMemo(() => {
    return itens.filter((item) => {
      // Filtro de aba
      if (filtroAba === 'pendentes') {
        if (item.resolvido) return false
      } else if (filtroAba === 'identicos') {
        if (item.status !== 'identico') return false
      }

      // Filtro de busca textual
      if (busca.trim()) {
        const query = busca.toLowerCase()
        const matchNome = (item.nomeCsv || '').toLowerCase().includes(query)
        const matchTel = (item.telefoneCsv || '').includes(query)
        const matchEmail = (item.emailCsv || '').toLowerCase().includes(query)
        return matchNome || matchTel || matchEmail
      }

      return true
    })
  }, [itens, filtroAba, busca])

  // Lista de clientes filtrados para mescla
  const clientesFiltradosMescla = useMemo(() => {
    if (!itemParaMescla) return []
    const term = buscaClienteMescla.trim().toLowerCase()
    if (!term) return clientesExistentes.slice(0, 20)

    const digitsOnly = term.replace(/\D/g, '')

    return clientesExistentes
      .filter((c) => {
        const matchNome = (c.nome || '').toLowerCase().includes(term)
        const matchCidade = (c.cidade || '').toLowerCase().includes(term)
        const telDigits = (c.telefone || '').replace(/\D/g, '')
        const whatsDigits = (c.whatsapp || '').replace(/\D/g, '')
        const matchTel =
          digitsOnly.length > 0 &&
          (telDigits.includes(digitsOnly) || whatsDigits.includes(digitsOnly))
        return matchNome || matchCidade || matchTel
      })
      .slice(0, 30)
  }, [clientesExistentes, buscaClienteMescla, itemParaMescla])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Importação e Comparação de Contatos por CSV</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  {itens.length} contatos
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Comparação automática com clientes cadastrados pelo nome • Números idênticos são
                mantidos sem perguntar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessando}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo dos Contadores / Estatísticas */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Total de Contatos
            </div>
            <div className="text-lg font-extrabold text-gray-900 mt-0.5">{estatisticas.total}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Lidos da planilha</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Idênticos ao CRM</span>
            </div>
            <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
              {estatisticas.identicos}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Mantidos sem perguntar</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Número Diferente</span>
            </div>
            <div className="text-lg font-extrabold text-amber-700 mt-0.5">
              {estatisticas.diferentes}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">Comparativo de número</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-xs">
            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Não Cadastrados</span>
            </div>
            <div className="text-lg font-extrabold text-blue-700 mt-0.5">
              {estatisticas.naoEncontrados}
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">Criar ou mesclar</div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFiltroAba('pendentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filtroAba === 'pendentes'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pendências de Decisão ({estatisticas.pendentes})
            </button>

            <button
              type="button"
              onClick={() => setFiltroAba('identicos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filtroAba === 'identicos'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Idênticos ({estatisticas.identicos})
            </button>

            <button
              type="button"
              onClick={() => setFiltroAba('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filtroAba === 'todos'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({estatisticas.total})
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Lista de Registros */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-gray-50/50">
          {itensExibidos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto stroke-1" />
              <h3 className="text-sm font-bold text-gray-800 mt-3">
                Nenhum contato pendente nesta visualização
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                {filtroAba === 'pendentes'
                  ? 'Todas as pendências e divergências foram decididas! Clique no botão abaixo para aplicar as alterações.'
                  : 'Nenhum registro encontrado para os filtros selecionados.'}
              </p>
            </div>
          ) : (
            itensExibidos.map((item) => (
              <div
                key={item.idTemp}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                  item.status === 'identico'
                    ? 'border-emerald-200/80 bg-emerald-50/20'
                    : item.status === 'diferente'
                      ? 'border-amber-200 hover:border-amber-300'
                      : 'border-blue-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Informações do Contato e Comparação */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{item.nomeCsv}</span>
                      {item.cidadeCsv && (
                        <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {item.cidadeCsv}
                        </span>
                      )}

                      {/* Badge do Status */}
                      {item.status === 'identico' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Número Idêntico (Mantido)</span>
                        </span>
                      )}

                      {item.status === 'diferente' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Número Diferente do Cadastro</span>
                        </span>
                      )}

                      {item.status === 'nao_encontrado' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                          <span>Contato Não Cadastrado</span>
                        </span>
                      )}
                    </div>

                    {/* Comparativo de Números */}
                    {item.status === 'diferente' && item.clienteEncontrado && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                            Número Atual no Cadastro ({item.clienteEncontrado.nome})
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 font-mono">
                              WhatsApp:{' '}
                              {formatWhatsAppPhone(item.whatsappAtual || '') || 'Não informado'}
                            </span>
                            {item.telefoneAtual && item.telefoneAtual !== item.whatsappAtual && (
                              <span className="text-[11px] text-gray-500 font-mono">
                                (Tel: {formatWhatsAppPhone(item.telefoneAtual)})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs">
                          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">
                            Número vindo do CSV (Planilha)
                          </div>
                          <div className="font-bold text-amber-900 font-mono">
                            {item.telefoneCsvFormatado || item.telefoneCsv || 'Sem número'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Caso Não Encontrado */}
                    {item.status === 'nao_encontrado' && (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs flex items-center justify-between gap-3">
                        <div>
                          <span className="text-gray-500">Telefone vindo do CSV: </span>
                          <span className="font-bold text-blue-900 font-mono">
                            {item.telefoneCsvFormatado || item.telefoneCsv}
                          </span>
                          {item.emailCsv && (
                            <span className="ml-3 text-gray-500">• {item.emailCsv}</span>
                          )}
                        </div>
                        {item.clienteSelecionadoParaMescla && (
                          <div className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            Mesclar com: {item.clienteSelecionadoParaMescla.nome}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Caso Idêntico */}
                    {item.status === 'identico' && (
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>Cliente: </span>
                        <strong className="text-gray-700">{item.clienteEncontrado?.nome}</strong>
                        <span>• WhatsApp: </span>
                        <strong className="text-gray-700 font-mono">
                          {formatWhatsAppPhone(item.whatsappAtual || item.telefoneCsv)}
                        </strong>
                        <span className="text-emerald-600 font-medium">
                          (Valores conferem, mantendo sem alterações)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação para o Usuário */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Caso 1: Número Diferente -> Escolha entre Manter Atual ou Atualizar com CSV */}
                    {item.status === 'diferente' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAlterarDecisao(item.idTemp, 'manter_atual')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            item.decisao === 'manter_atual'
                              ? 'bg-gray-800 text-white shadow-xs'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Manter Atual</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onAlterarDecisao(item.idTemp, 'atualizar_whatsapp')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            item.decisao === 'atualizar_whatsapp'
                              ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                              : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Atualizar com CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onAlterarDecisao(item.idTemp, 'ignorar')}
                          className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            item.decisao === 'ignorar'
                              ? 'bg-gray-200 text-gray-700'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          title="Ignorar esta linha"
                        >
                          Ignorar
                        </button>
                      </div>
                    )}

                    {/* Caso 2: Não Encontrado -> Escolha entre Criar Novo ou Mesclar com Existente */}
                    {item.status === 'nao_encontrado' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAlterarDecisao(item.idTemp, 'criar_novo')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            item.decisao === 'criar_novo'
                              ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                              : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Criar Novo Cliente</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setItemParaMescla(item)
                            setClienteSelecionadoMescla(item.clienteSelecionadoParaMescla || null)
                            setBuscaClienteMescla(item.nomeCsv)
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            item.decisao === 'mesclar_existente'
                              ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/20'
                              : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>
                            {item.clienteSelecionadoParaMescla
                              ? `Mesclado (${item.clienteSelecionadoParaMescla.nome.slice(0, 15)}...)`
                              : 'Mesclar com Existente'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onAlterarDecisao(item.idTemp, 'ignorar')}
                          className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            item.decisao === 'ignorar'
                              ? 'bg-gray-200 text-gray-700'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          title="Ignorar esta linha"
                        >
                          Ignorar
                        </button>
                      </div>
                    )}

                    {/* Caso 3: Idêntico -> Apenas informativo */}
                    {item.status === 'identico' && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mantido como está</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Barra de Progresso quando estiver aplicando */}
        {isProcessando && (
          <div className="p-4 bg-emerald-50 border-t border-emerald-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span>Aplicando alterações na base de clientes...</span>
              <span>{progresso}%</span>
            </div>
            <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer com Ações */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            <span>Decisões pendentes: </span>
            <strong className={estatisticas.pendentes > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              {estatisticas.pendentes === 0
                ? 'Tudo resolvido!'
                : `${estatisticas.pendentes} aguardando escolha`}
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessando}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onExecutarImportacao}
              disabled={isProcessando || itens.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isProcessando ? 'Processando...' : 'Aplicar Escolhas e Concluir Importação'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Submodal para Selecionar Cliente Existente para Mesclar */}
      {itemParaMescla && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/70">
              <div className="flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-purple-700" />
                <h3 className="text-sm font-bold text-purple-900">
                  Mesclar Contato com Cliente Existente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setItemParaMescla(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                <div className="text-[10px] uppercase font-bold text-gray-500">
                  Contato da Planilha CSV
                </div>
                <div className="font-bold text-gray-800">{itemParaMescla.nomeCsv}</div>
                <div className="font-mono text-gray-600">
                  Número: {itemParaMescla.telefoneCsvFormatado || itemParaMescla.telefoneCsv}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Selecione o cliente cadastrado com quem deseja mesclar:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, telefone ou cidade..."
                    value={buscaClienteMescla}
                    onChange={(e) => setBuscaClienteMescla(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pt-1">
                {clientesFiltradosMescla.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Nenhum cliente cadastrado encontrado com esse termo.
                  </p>
                ) : (
                  clientesFiltradosMescla.map((cli) => {
                    const isSelected = clienteSelecionadoMescla?.id === cli.id
                    return (
                      <button
                        key={cli.id}
                        type="button"
                        onClick={() => setClienteSelecionadoMescla(cli)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/70 font-semibold text-purple-900 shadow-xs'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-gray-900">{cli.nome}</div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            {formatWhatsAppPhone(cli.whatsapp || cli.telefone || '') ||
                              'Sem telefone'}{' '}
                            • {cli.cidade || 'Erechim'}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemParaMescla(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!clienteSelecionadoMescla}
                onClick={() => {
                  if (clienteSelecionadoMescla && itemParaMescla) {
                    onAlterarDecisao(
                      itemParaMescla.idTemp,
                      'mesclar_existente',
                      clienteSelecionadoMescla,
                    )
                    setItemParaMescla(null)
                  }
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                Confirmar Mescla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

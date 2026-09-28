import React, { useState, useRef, useEffect } from 'react'
import {
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  HelpCircle,
  BookOpen,
  ChevronDown,
  Minimize2,
  Maximize2,
  CornerDownLeft,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  perguntarAssistenteDelfos,
  listarCategorias,
  type KnowledgeCategory,
  type AssistenteMensagem,
} from '@/services/knowledgeBaseService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AssistenteDelfosChatProps {
  aberto?: boolean
  onAbertoChange?: (aberto: boolean) => void
  /** Se deve renderizar o botão flutuante próprio (fallback, default false pois agora está no header) */
  mostrarBotaoFlutuante?: boolean
}

export function AssistenteDelfosBotao({
  onClick,
  className = '',
  size = 'md',
}: {
  onClick?: () => void
  className?: string
  size?: 'sm' | 'md'
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick) {
      onClick()
    } else {
      window.dispatchEvent(new CustomEvent('delfos:abrir-assistente'))
    }
  }

  const isSmall = size === 'sm'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Abrir Assistente Inteligente Delfos"
      title="Abrir Assistente Inteligente Delfos"
      className={`relative inline-flex items-center justify-center rounded-full text-white bg-gradient-to-tr from-[#166534] via-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 active:scale-95 transition-all shadow-xs hover:shadow-md border border-white/20 select-none group cursor-pointer ${
        isSmall ? 'w-8 h-8' : 'w-9 h-9'
      } ${className}`}
    >
      <Bot
        className={`${isSmall ? 'w-4 h-4' : 'w-5 h-5'} text-white group-hover:scale-110 transition-transform`}
      />
      {/* Ponto indicador de status IA ativo (estilo badge/notificação discreta) */}
      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white ring-1 ring-emerald-600/30 animate-pulse" />
    </button>
  )
}

export default function AssistenteDelfosChat({
  aberto: abertoProp,
  onAbertoChange,
  mostrarBotaoFlutuante = false,
}: AssistenteDelfosChatProps = {}) {
  const [abertoInterno, setAbertoInterno] = useState(false)
  const isControlado = abertoProp !== undefined
  const aberto = isControlado ? abertoProp : abertoInterno

  const setAberto = (val: boolean) => {
    if (!isControlado) {
      setAbertoInterno(val)
    }
    onAbertoChange?.(val)
  }
  const [minimizado, setMinimizado] = useState(false)
  const [inputTexto, setInputTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [categorias, setCategorias] = useState<KnowledgeCategory[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')

  const [mensagens, setMensagens] = useState<AssistenteMensagem[]>([
    {
      id: 'msg-bem-vindo',
      remetente: 'assistente',
      texto:
        'Olá! Sou o Assistente Delfos. Posso esclarecer dúvidas sobre interpretação de faturas RGE, argumentos de venda, dúvidas técnicas de inversores e normas a partir da nossa Base de Conhecimento. Como posso ajudar hoje?',
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const fimMensagensRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carregar categorias disponíveis para filtro opcional
  useEffect(() => {
    listarCategorias()
      .then((cats) => setCategorias(cats))
      .catch(() => {})
  }, [])

  // Auto scroll para o final das mensagens
  useEffect(() => {
    if (aberto && !minimizado) {
      fimMensagensRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensagens, aberto, minimizado, carregando])

  // Ouvinte global para abrir o chat através de eventos
  useEffect(() => {
    const handleAbrirAssistente = () => {
      setAberto(true)
      setMinimizado(false)
    }
    window.addEventListener('delfos:abrir-assistente', handleAbrirAssistente)
    return () => {
      window.removeEventListener('delfos:abrir-assistente', handleAbrirAssistente)
    }
  }, [])

  // Foco no input ao abrir
  useEffect(() => {
    if (aberto && !minimizado) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [aberto, minimizado])

  const handleEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const pergunta = inputTexto.trim()
    if (!pergunta || carregando) return

    const msgUsuario: AssistenteMensagem = {
      id: `usr-${Date.now()}`,
      remetente: 'user',
      texto: pergunta,
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }

    setMensagens((prev) => [...prev, msgUsuario])
    setInputTexto('')
    setCarregando(true)

    try {
      const res = await perguntarAssistenteDelfos({
        pergunta: pergunta,
        categoria_id: categoriaFiltro === 'todas' ? null : categoriaFiltro,
      })

      const msgResposta: AssistenteMensagem = {
        id: `ast-${Date.now()}`,
        remetente: 'assistente',
        texto: res.resposta,
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        categoriaOrigem: res.categoria_origem,
        artigosUtilizados: res.artigos_utilizados,
        erro: !res.ok,
      }

      setMensagens((prev) => [...prev, msgResposta])
    } catch (err: any) {
      const msgErro: AssistenteMensagem = {
        id: `err-${Date.now()}`,
        remetente: 'assistente',
        texto:
          'Não encontrei essa informação na base de conhecimento. Deseja cadastrar um novo artigo sobre este tema?',
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        erro: true,
      }
      setMensagens((prev) => [...prev, msgErro])
    } finally {
      setCarregando(false)
    }
  }

  const enviarSugestao = (texto: string) => {
    setInputTexto(texto)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  return (
    <>
      {/* Botão Flutuante autônomo (renderizado apenas se explicitamente habilitado, fallback) */}
      {mostrarBotaoFlutuante && !aberto && (
        <div className="fixed top-3 right-28 z-40 print:hidden font-sans">
          <AssistenteDelfosBotao onClick={() => setAberto(true)} />
        </div>
      )}

      {/* Janela de Chat Interno (quando aberto) */}
      {aberto && (
        <div className="fixed top-16 right-3 sm:right-6 md:right-8 z-50 print:hidden font-sans">
          <div
            className={`flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-200 ${
              minimizado ? 'w-72 sm:w-80 h-14' : 'w-[92vw] sm:w-[420px] h-[540px] max-h-[82vh]'
            }`}
          >
            {/* Header do Chat */}
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white p-3 sm:px-4 flex items-center justify-between shrink-0 select-none shadow-xs">
              <div
                className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                onClick={() => setMinimizado(!minimizado)}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                  <Bot className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold leading-tight truncate flex items-center gap-1.5">
                    Assistente Delfos
                    <span className="text-[10px] font-normal bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded">
                      RAG
                    </span>
                  </h3>
                  <p className="text-[10px] text-emerald-200/80 truncate">
                    Consultando Base de Conhecimento
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 text-white/80">
                <button
                  onClick={() => setMinimizado(!minimizado)}
                  className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title={minimizado ? 'Maximizar' : 'Minimizar'}
                >
                  {minimizado ? (
                    <Maximize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Minimize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setAberto(false)}
                  className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Fechar chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Corpo do Chat (se não minimizado) */}
            {!minimizado && (
              <>
                {/* Filtro de Categoria Opcional */}
                <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] shrink-0">
                  <span className="text-gray-500 font-medium shrink-0">Buscar em:</span>
                  <select
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className="bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 focus:outline-none focus:border-emerald-500 flex-1 truncate"
                  >
                    <option value="todas">Toda a Base de Conhecimento</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.titulo}
                      </option>
                    ))}
                  </select>
                  <Link
                    to="/base-conhecimento"
                    onClick={() => setMinimizado(true)}
                    className="text-emerald-700 hover:text-emerald-900 font-bold shrink-0 flex items-center gap-0.5 hover:underline"
                    title="Abrir página completa"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span className="hidden sm:inline">Base</span>
                  </Link>
                </div>

                {/* Lista de Mensagens */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-gray-50/40">
                  {mensagens.map((msg) => {
                    const isUser = msg.remetente === 'user'
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                            isUser
                              ? 'bg-emerald-600 text-white rounded-br-xs'
                              : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-xs'
                          }`}
                        >
                          {/* Se tem categoria de origem identificada */}
                          {!isUser && msg.categoriaOrigem && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mb-2 w-fit">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{msg.categoriaOrigem}</span>
                            </div>
                          )}

                          <div className="space-y-1">{msg.texto}</div>

                          {/* Artigos Utilizados */}
                          {!isUser && msg.artigosUtilizados && msg.artigosUtilizados.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
                              <span className="font-semibold block text-gray-600 mb-0.5">
                                Fontes consultadas:
                              </span>
                              <ul className="list-disc pl-3 space-y-0.5">
                                {msg.artigosUtilizados.map((a, idx) => (
                                  <li key={idx} className="truncate">
                                    {a.titulo}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.horario}</span>
                      </div>
                    )
                  })}

                  {carregando && (
                    <div className="flex items-start gap-2">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-xs p-3 text-xs text-gray-500 flex items-center gap-2 shadow-2xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Consultando artigos e documentos com Gemini...</span>
                      </div>
                    </div>
                  )}

                  <div ref={fimMensagensRef} />
                </div>

                {/* Sugestões rápidas de perguntas */}
                {mensagens.length <= 2 && !carregando && (
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
                    <span className="text-gray-400 shrink-0 font-semibold text-[10px]">
                      Sugestões:
                    </span>
                    <button
                      onClick={() =>
                        enviarSugestao('Como calcular a tarifa da RGE somando TUSD e TE?')
                      }
                      className="shrink-0 bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-full hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                    >
                      Tarifa RGE TUSD + TE
                    </button>
                    <button
                      onClick={() =>
                        enviarSugestao('O que responder para o cliente que acha o preço caro?')
                      }
                      className="shrink-0 bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-full hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                    >
                      Objeção de Preço
                    </button>
                    <button
                      onClick={() =>
                        enviarSugestao('Qual a frequência recomendada para limpeza dos módulos?')
                      }
                      className="shrink-0 bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-full hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                    >
                      Limpeza O&M
                    </button>
                  </div>
                )}

                {/* Input de Envio */}
                <form
                  onSubmit={handleEnviar}
                  className="p-2.5 sm:p-3 border-t border-gray-200 bg-white flex items-center gap-2 shrink-0"
                >
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Pergunte sobre regras, faturas, vendas..."
                    value={inputTexto}
                    onChange={(e) => setInputTexto(e.target.value)}
                    disabled={carregando}
                    className="text-xs h-9 bg-gray-50 border-gray-200 focus:bg-white rounded-xl"
                  />
                  <Button
                    type="submit"
                    disabled={!inputTexto.trim() || carregando}
                    size="sm"
                    className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0"
                    title="Enviar pergunta"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

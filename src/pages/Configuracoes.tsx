import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Settings,
  MessageSquare,
  Zap,
  Cpu,
  Images,
  Truck,
  FileSpreadsheet,
  KeyRound,
  ListChecks,
  UserCog,
  BookOpen,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Import dos componentes de telas existentes que serão renderizados dentro das abas
import AutomacoesPage from './Automacoes'
import MensagensWhatsApp from './MensagensWhatsApp'
import GerenciadorFluxosFollowUp from '@/components/GerenciadorFluxosFollowUp'
import EquipamentosPage from './Equipamentos'
import AtivosPage from './Ativos'
import InstalacoesGaleriaPage from './InstalacoesGaleria'
import Fornecedores from './Fornecedores'
import ImportarClientes from './ImportarClientes'
import ImportarAcessos from './ImportarAcessos'
import GerenciarUsuarios from './GerenciarUsuarios'
import BaseConhecimento from './BaseConhecimento'
import { GerenciadorPadroesAtividades } from '@/components/GerenciadorPadroesAtividades'

type GrupoAbaId = 'comunicacao' | 'cadastros' | 'gestao'
type SubTelaId =
  // Comunicação
  | 'automacoes'
  | 'fluxos-follow-up'
  | 'mensagens-whatsapp'
  // Cadastros
  | 'equipamentos'
  | 'instalacoes-galeria'
  | 'ativos'
  | 'fornecedores'
  | 'importar-clientes'
  | 'importar-acessos'
  | 'padroes-atividades'
  // Gestão
  | 'gerenciar-usuarios'
  | 'base-conhecimento'

interface SubTelaDef {
  id: SubTelaId
  label: string
  grupo: GrupoAbaId
  icon: React.ElementType
  descricao: string
  urlPropria: string
}

const SUB_TELAS: SubTelaDef[] = [
  // Comunicação
  {
    id: 'automacoes',
    label: 'Automações',
    grupo: 'comunicacao',
    icon: Zap,
    descricao: 'Regras e gatilhos automáticos do funil e pós-vendas',
    urlPropria: '/automacoes',
  },
  {
    id: 'fluxos-follow-up',
    label: 'Fluxos de Follow-up',
    grupo: 'comunicacao',
    icon: Zap,
    descricao: 'Réguas de acompanhamento do disparo em massa com etapas escalonadas',
    urlPropria: '/configuracoes?aba=comunicacao&tela=fluxos-follow-up',
  },
  {
    id: 'mensagens-whatsapp',
    label: 'Mensagens WhatsApp',
    grupo: 'comunicacao',
    icon: MessageSquare,
    descricao: 'Templates e modelos oficiais para envio de mensagens',
    urlPropria: '/mensagens-whatsapp',
  },

  // Cadastros
  {
    id: 'equipamentos',
    label: 'Equipamentos',
    grupo: 'cadastros',
    icon: Cpu,
    descricao: 'Módulos FV, inversores, datasheets e garantias',
    urlPropria: '/equipamentos',
  },
  {
    id: 'instalacoes-galeria',
    label: 'Galeria de Usinas',
    grupo: 'cadastros',
    icon: Images,
    descricao: 'Fotos de obras finalizadas e biblioteca de fotos',
    urlPropria: '/instalacoes-galeria',
  },
  {
    id: 'ativos',
    label: 'Ativos das Usinas',
    grupo: 'cadastros',
    icon: Cpu,
    descricao: 'Inversores instalados, números de série e telemetria',
    urlPropria: '/ativos',
  },
  {
    id: 'fornecedores',
    label: 'Fornecedores',
    grupo: 'cadastros',
    icon: Truck,
    descricao: 'Distribuidores e parceiros comerciais de equipamentos',
    urlPropria: '/fornecedores',
  },
  {
    id: 'importar-clientes',
    label: 'Importar Clientes',
    grupo: 'cadastros',
    icon: FileSpreadsheet,
    descricao: 'Importador em lote via Pipedrive, Conta Azul e planilhas',
    urlPropria: '/importar-clientes',
  },
  {
    id: 'importar-acessos',
    label: 'Importar Acessos',
    grupo: 'cadastros',
    icon: KeyRound,
    descricao: 'Contas e credenciais de monitoramento de usinas',
    urlPropria: '/importar-acessos',
  },
  {
    id: 'padroes-atividades',
    label: 'Padrões de Atividades',
    grupo: 'cadastros',
    icon: ListChecks,
    descricao: 'Catálogo de atividades, checklists dinâmicos e preços base',
    urlPropria: '/central-atividades',
  },

  // Gestão
  {
    id: 'gerenciar-usuarios',
    label: 'Gerenciar Usuários',
    grupo: 'gestao',
    icon: UserCog,
    descricao: 'Controle de contas de acesso, perfis e equipe técnica',
    urlPropria: '/gerenciar-usuarios',
  },
  {
    id: 'base-conhecimento',
    label: 'Base de Conhecimento',
    grupo: 'gestao',
    icon: BookOpen,
    descricao: 'Manuais técnicos, procedimentos e base para o Assistente IA',
    urlPropria: '/base-conhecimento',
  },
]

const GRUPOS = [
  { id: 'comunicacao', label: 'Comunicação', subtitulo: 'Automações & WhatsApp' },
  { id: 'cadastros', label: 'Cadastros', subtitulo: 'Equipamentos, usinas & ativos' },
  { id: 'gestao', label: 'Gestão', subtitulo: 'Usuários & Conhecimento' },
] as const

export function ConfiguracoesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Lê aba e tela ativa dos query params ou define padrão (comunicação / automacoes)
  const tabParam = searchParams.get('aba') as GrupoAbaId | null
  const telaParam = searchParams.get('tela') as SubTelaId | null

  const [abaAtiva, setAbaAtiva] = useState<GrupoAbaId>(() => {
    if (
      tabParam &&
      (tabParam === 'comunicacao' || tabParam === 'cadastros' || tabParam === 'gestao')
    ) {
      return tabParam
    }
    if (telaParam) {
      const encontrada = SUB_TELAS.find((s) => s.id === telaParam)
      if (encontrada) return encontrada.grupo
    }
    return 'comunicacao'
  })

  const [subTelaAtiva, setSubTelaAtiva] = useState<SubTelaId>(() => {
    if (telaParam && SUB_TELAS.some((s) => s.id === telaParam)) {
      return telaParam
    }
    if (tabParam === 'cadastros') return 'equipamentos'
    if (tabParam === 'gestao') return 'gerenciar-usuarios'
    return 'automacoes'
  })

  // Sincroniza query params ao mudar de tela/aba
  const selecionarSubTela = (tela: SubTelaDef) => {
    setAbaAtiva(tela.grupo)
    setSubTelaAtiva(tela.id)
    setSearchParams({ aba: tela.grupo, tela: tela.id }, { replace: true })
  }

  const selecionarGrupo = (grupoId: GrupoAbaId) => {
    setAbaAtiva(grupoId)
    // Seleciona a primeira subtela daquele grupo
    const primeiraDoGrupo = SUB_TELAS.find((s) => s.grupo === grupoId)
    if (primeiraDoGrupo) {
      setSubTelaAtiva(primeiraDoGrupo.id)
      setSearchParams({ aba: grupoId, tela: primeiraDoGrupo.id }, { replace: true })
    }
  }

  // Sincronizar se o usuário alterar a URL via histórico/link direto
  useEffect(() => {
    if (
      tabParam &&
      (tabParam === 'comunicacao' || tabParam === 'cadastros' || tabParam === 'gestao')
    ) {
      setAbaAtiva(tabParam)
    }
    if (telaParam && SUB_TELAS.some((s) => s.id === telaParam)) {
      setSubTelaAtiva(telaParam)
      const found = SUB_TELAS.find((s) => s.id === telaParam)
      if (found) setAbaAtiva(found.grupo)
    }
  }, [tabParam, telaParam])

  const subtelaAtual = SUB_TELAS.find((s) => s.id === subTelaAtiva) || SUB_TELAS[0]

  return (
    <div className="space-y-4 max-w-7xl mx-auto py-2">
      {/* Cabeçalho da Página de Configurações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 text-white flex items-center justify-center shadow-xs">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Configurações & Cadastros
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-gray-50 text-gray-700 border-gray-200"
              >
                Painel Administrativo
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Centralize a gestão de comunicação, cadastros do catálogo solar e controle de usuários
            </p>
          </div>
        </div>

        {/* Link para abrir tela isolada em URL própria */}
        {subtelaAtual.urlPropria && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(subtelaAtual.urlPropria)}
            className="text-xs font-semibold gap-1.5 h-8 border-gray-200 text-gray-700 hover:text-emerald-800 hover:bg-emerald-50 self-start sm:self-auto"
            title={`Abrir ${subtelaAtual.label} em URL dedicada`}
          >
            <span>Abrir tela dedicada ({subtelaAtual.urlPropria})</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </Button>
        )}
      </div>

      {/* Navegação Topo por Grupos (Mobile + Tablet) */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-gray-100">
        {GRUPOS.map((grupo) => {
          const isActive = abaAtiva === grupo.id
          return (
            <button
              key={grupo.id}
              type="button"
              onClick={() => selecionarGrupo(grupo.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {grupo.label}
            </button>
          )
        })}
      </div>

      {/* Sub-itens no Mobile (Dropdown ou botões com scroll horizontal) */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {SUB_TELAS.filter((s) => s.grupo === abaAtiva).map((sub) => {
          const SubIcon = sub.icon
          const isSelected = subTelaAtiva === sub.id
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => selecionarSubTela(sub)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SubIcon
                className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-700' : 'text-gray-400'}`}
              />
              <span>{sub.label}</span>
            </button>
          )
        })}
      </div>

      {/* Layout Principal: Menu Lateral à Esquerda + Conteúdo à Direita (Padrão GitHub/Notion) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Menu interno de Abas com grupos colapsáveis / organizados */}
        <aside className="hidden lg:block lg:col-span-3 bg-white border border-gray-200/90 rounded-2xl p-3 shadow-2xs sticky top-20">
          <div className="space-y-4">
            {GRUPOS.map((grupo) => {
              const itensDoGrupo = SUB_TELAS.filter((s) => s.grupo === grupo.id)
              const hasActiveItem = itensDoGrupo.some((s) => s.id === subTelaAtiva)

              return (
                <div key={grupo.id} className="space-y-1">
                  <div className="px-3 py-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      {grupo.label}
                    </span>
                    {hasActiveItem && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                  </div>

                  <div className="space-y-0.5">
                    {itensDoGrupo.map((item) => {
                      const ItemIcon = item.icon
                      const isItemActive = subTelaAtiva === item.id

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selecionarSubTela(item)}
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left group cursor-pointer ${
                            isItemActive
                              ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-2xs'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isItemActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                              }`}
                            >
                              <ItemIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate">{item.label}</span>
                          </div>
                          {isItemActive && (
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Coluna Direita: Conteúdo da Tela Selecionada */}
        <main className="lg:col-span-9 min-w-0">
          <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-6 shadow-2xs">
            {/* Header contextual da subtela */}
            <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <subtelaAtual.icon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    {subtelaAtual.label}
                  </h2>
                  <p className="text-xs text-gray-500">{subtelaAtual.descricao}</p>
                </div>
              </div>
            </div>

            {/* Renderização condicional da subtela ativa (reutilizando componentes existentes sem duplicar lógica) */}
            <div className="min-w-0">
              {subTelaAtiva === 'automacoes' && <AutomacoesPage />}
              {subTelaAtiva === 'fluxos-follow-up' && <GerenciadorFluxosFollowUp />}
              {subTelaAtiva === 'mensagens-whatsapp' && <MensagensWhatsApp />}
              {subTelaAtiva === 'equipamentos' && <EquipamentosPage />}
              {subTelaAtiva === 'instalacoes-galeria' && <InstalacoesGaleriaPage />}
              {subTelaAtiva === 'ativos' && <AtivosPage />}
              {subTelaAtiva === 'fornecedores' && <Fornecedores />}
              {subTelaAtiva === 'importar-clientes' && <ImportarClientes />}
              {subTelaAtiva === 'importar-acessos' && <ImportarAcessos />}
              {subTelaAtiva === 'padroes-atividades' && (
                <GerenciadorPadroesAtividades showTitle={false} />
              )}
              {subTelaAtiva === 'gerenciar-usuarios' && <GerenciarUsuarios />}
              {subTelaAtiva === 'base-conhecimento' && <BaseConhecimento />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ConfiguracoesPage

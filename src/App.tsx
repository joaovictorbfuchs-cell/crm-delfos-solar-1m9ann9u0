import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ClientesProvider } from '@/contexts/ClientesContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Layout from './components/Layout'
import { Loader2 } from 'lucide-react'
import { lazyWithRetry } from '@/lib/lazyWithRetry'

// Fallback de carregamento leve centralizado para as páginas lazy
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full p-8 text-muted-foreground">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
      <span className="text-xs font-medium tracking-wide">Carregando módulo...</span>
    </div>
  </div>
)

// Code-splitting resiliente das páginas com lazyWithRetry:
// Garante retry imediato e auto-reload caso o navegador tente buscar um chunk com hash antigo após um novo deploy.
const Index = lazyWithRetry(() => import('./pages/Index'))
const Comercial = lazyWithRetry(() => import('./pages/Comercial'))
const Projetos = lazyWithRetry(() => import('./pages/Projetos'))
const Manutencoes = lazyWithRetry(() => import('./pages/Manutencoes'))
const OrdensServico = lazyWithRetry(() => import('./pages/OrdensServico'))
const Clientes = lazyWithRetry(() => import('./pages/Clientes'))
const ClientesPosVendas = lazyWithRetry(() => import('./pages/ClientesPosVendas'))
const ContatosView = lazyWithRetry(() => import('./pages/Contatos'))
const Fornecedores = lazyWithRetry(() => import('./pages/Fornecedores'))
const Orcamentos = lazyWithRetry(() => import('./pages/Orcamentos'))
const InstalacoesGaleriaPage = lazyWithRetry(() => import('./pages/InstalacoesGaleria'))
const EquipamentosPage = lazyWithRetry(() => import('./pages/Equipamentos'))
const AtivosPage = lazyWithRetry(() => import('./pages/Ativos'))
const AutomacoesPage = lazyWithRetry(() => import('./pages/Automacoes'))
const Atividades = lazyWithRetry(() => import('./pages/Atividades'))
const CentralAtividades = lazyWithRetry(() => import('./pages/CentralAtividades'))
const ExecucaoOS = lazyWithRetry(() => import('./pages/ExecucaoOS'))
const MinhasOS = lazyWithRetry(() => import('./pages/MinhasOS'))
const CentralAtendimento = lazyWithRetry(() => import('./pages/CentralAtendimento'))
const ImportarClientes = lazyWithRetry(() => import('./pages/ImportarClientes'))
const ImportarContatosGoogle = lazyWithRetry(() => import('./pages/ImportarContatosGoogle'))
const ImportarAcessos = lazyWithRetry(() => import('./pages/ImportarAcessos'))
const GerenciarUsuarios = lazyWithRetry(() => import('./pages/GerenciarUsuarios'))
const Login = lazyWithRetry(() => import('./pages/Login'))
const RedefinirSenha = lazyWithRetry(() => import('./pages/RedefinirSenha'))
const RelatorioFaturaPage = lazyWithRetry(() => import('./pages/RelatorioFatura'))
const RelatorioOSPublico = lazyWithRetry(() => import('./pages/RelatorioOSPublico'))
const RelatorioOSPreview = lazyWithRetry(() => import('./pages/RelatorioOSPreview'))
const PropostaOMPublica = lazyWithRetry(() => import('./pages/PropostaOMPublica'))
const BaseConhecimento = lazyWithRetry(() => import('./pages/BaseConhecimento'))
const MensagensWhatsApp = lazyWithRetry(() => import('./pages/MensagensWhatsApp'))
const Configuracoes = lazyWithRetry(() => import('./pages/Configuracoes'))
const Integracoes = lazyWithRetry(() => import('./pages/Integracoes'))
const Financeiro = lazyWithRetry(() => import('./pages/Financeiro'))
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Rotas públicas: montam de forma 100% independente do ClientesProvider e protegidas pelo ErrorBoundary dedicado */}
            <Route
              path="/login"
              element={
                <ErrorBoundary errorMessage="Ocorreu um problema ao carregar o painel de acesso">
                  <Login />
                </ErrorBoundary>
              }
            />
            <Route
              path="/redefinir-senha"
              element={
                <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a recuperação de senha">
                  <RedefinirSenha />
                </ErrorBoundary>
              }
            />
            {/* Link público individual/tokenizado para proposta O&M e aceite de plano */}
            <Route
              path="/proposta-om/:token"
              element={
                <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a proposta O&M">
                  <PropostaOMPublica />
                </ErrorBoundary>
              }
            />
            {/* Rota pública para visualização do Relatório Completo de Análise de Fatura RGE */}
            <Route
              path="/relatorio-fatura/:token"
              element={
                <ErrorBoundary errorMessage="Ocorreu um problema ao carregar o relatório de análise de fatura">
                  <RelatorioFaturaPage />
                </ErrorBoundary>
              }
            />
            {/* Rota pública para visualização do Relatório Técnico de Execução de OS */}
            <Route
              path="/relatorio-os/:id"
              element={
                <ErrorBoundary errorMessage="Ocorreu um problema ao carregar o relatório da ordem de serviço">
                  <RelatorioOSPublico />
                </ErrorBoundary>
              }
            />
            {/* Rota autenticada para visualização do preview web do relatório técnico */}
            <Route
              path="/relatorio-os-preview/:id"
              element={
                <ProtectedRoute>
                  <ErrorBoundary errorMessage="Ocorreu um problema ao carregar o preview do relatório da ordem de serviço">
                    <RelatorioOSPreview />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Rotas protegidas (autenticadas): envelopadas pelo ClientesProvider */}
            <Route
              element={
                <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a página inicial do CRM">
                  <ProtectedRoute>
                    <ClientesProvider>
                      <Layout />
                    </ClientesProvider>
                  </ProtectedRoute>
                </ErrorBoundary>
              }
            >
              {/* Rotas de Serviços de Campo / Minhas OS */}
              <Route
                path="/servicos-campo"
                element={
                  <ErrorBoundary errorMessage="Ocorreu um problema ao carregar Serviços de Campo">
                    <ExecucaoOS />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/execucao-os"
                element={
                  <ErrorBoundary errorMessage="Ocorreu um problema ao carregar Serviços de Campo">
                    <ExecucaoOS />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/minhas-os"
                element={
                  <ErrorBoundary errorMessage="Ocorreu um problema ao carregar Minhas OS">
                    <MinhasOS />
                  </ErrorBoundary>
                }
              />
              {/* Rotas restritas para Administradores: instalador é redirecionado para Serviços de Campo */}
              <Route
                path="/"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ErrorBoundary errorMessage="Ocorreu um problema ao carregar o Dashboard">
                      <Index />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/comercial"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Comercial />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/central-atendimento"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <CentralAtendimento />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orcamentos"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Orcamentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/propostas"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Orcamentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projetos"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a página de Projetos">
                      <Projetos />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/central-atividades"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a Central de Atividades">
                      <CentralAtividades />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/atividades"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Navigate to="/central-atividades" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manutencoes"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Manutencoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ordens-servico"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <OrdensServico />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planos-om"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Manutencoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planos-monitoramento"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Manutencoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes-pos-vendas"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ClientesPosVendas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos-vendas"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ClientesPosVendas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Clientes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contatos"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ContatosView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/automacoes"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AutomacoesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mensagens-whatsapp"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ErrorBoundary errorMessage="Ocorreu um problema ao carregar as Mensagens de WhatsApp">
                      <MensagensWhatsApp />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/equipamentos"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <EquipamentosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ativos"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AtivosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gerenciar-usuarios"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <GerenciarUsuarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/importar-clientes"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ImportarClientes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/importar-contatos-google"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ImportarContatosGoogle />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/importar-acessos"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ImportarAcessos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fornecedores"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Fornecedores />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instalacoes-galeria"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <InstalacoesGaleriaPage />
                  </ProtectedRoute>
                }
              />
              {/* Base de Conhecimento (acessível por administradores e equipe de vendas/gestão) */}
              <Route
                path="/base-conhecimento"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a Base de Conhecimento">
                      <BaseConhecimento />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              {/* Novas rotas da reorganização do CRM: Configurações, Integrações e Financeiro */}
              <Route
                path="/configuracoes"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ErrorBoundary errorMessage="Ocorreu um problema ao carregar as Configurações do CRM">
                      <Configuracoes />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/integracoes"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a Central de Integrações">
                      <Integracoes />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financeiro"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a Gestão Financeira">
                      <Financeiro />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App

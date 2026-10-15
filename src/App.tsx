import { Suspense, lazy } from 'react'
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

// Fallback de carregamento leve centralizado para as páginas lazy
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full p-8 text-muted-foreground">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
      <span className="text-xs font-medium tracking-wide">Carregando módulo...</span>
    </div>
  </div>
)

// Code-splitting das páginas com React.lazy para reduzir drasticamente o grafo estático do Vite/Rollup
// e evitar erro de OOM (exit code 137) no build de produção.
const Index = lazy(() => import('./pages/Index'))
const Comercial = lazy(() => import('./pages/Comercial'))
const Projetos = lazy(() => import('./pages/Projetos'))
const Manutencoes = lazy(() => import('./pages/Manutencoes'))
const OrdensServico = lazy(() => import('./pages/OrdensServico'))
const Clientes = lazy(() => import('./pages/Clientes'))
const ClientesPosVendas = lazy(() => import('./pages/ClientesPosVendas'))
const ContatosView = lazy(() => import('./pages/Contatos'))
const Fornecedores = lazy(() => import('./pages/Fornecedores'))
const Orcamentos = lazy(() => import('./pages/Orcamentos'))
const InstalacoesGaleriaPage = lazy(() => import('./pages/InstalacoesGaleria'))
const EquipamentosPage = lazy(() => import('./pages/Equipamentos'))
const AtivosPage = lazy(() => import('./pages/Ativos'))
const AutomacoesPage = lazy(() => import('./pages/Automacoes'))
const Atividades = lazy(() => import('./pages/Atividades'))
const CentralAtividades = lazy(() => import('./pages/CentralAtividades'))
const ExecucaoOS = lazy(() => import('./pages/ExecucaoOS'))
const MinhasOS = lazy(() => import('./pages/MinhasOS'))
const CentralAtendimento = lazy(() => import('./pages/CentralAtendimento'))
const ImportarClientes = lazy(() => import('./pages/ImportarClientes'))
const ImportarContatosGoogle = lazy(() => import('./pages/ImportarContatosGoogle'))
const ImportarAcessos = lazy(() => import('./pages/ImportarAcessos'))
const GerenciarUsuarios = lazy(() => import('./pages/GerenciarUsuarios'))
const Login = lazy(() => import('./pages/Login'))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'))
const RelatorioFaturaPage = lazy(() => import('./pages/RelatorioFatura'))
const RelatorioOSPublico = lazy(() => import('./pages/RelatorioOSPublico'))
const RelatorioOSPreview = lazy(() => import('./pages/RelatorioOSPreview'))
const PropostaOMPublica = lazy(() => import('./pages/PropostaOMPublica'))
const BaseConhecimento = lazy(() => import('./pages/BaseConhecimento'))
const NotFound = lazy(() => import('./pages/NotFound'))

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
                    <Projetos />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App

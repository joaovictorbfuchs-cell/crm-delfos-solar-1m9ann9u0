import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ClientesProvider } from '@/contexts/ClientesContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Layout from './components/Layout'

import Index from './pages/Index'
import Comercial from './pages/Comercial'
import Projetos from './pages/Projetos'
import Manutencoes from './pages/Manutencoes'
import Clientes from './pages/Clientes'
import ClientesPosVendas from './pages/ClientesPosVendas'
import Fornecedores from './pages/Fornecedores'
import Orcamentos from './pages/Orcamentos'
import InstalacoesGaleriaPage from './pages/InstalacoesGaleria'
import EquipamentosPage from './pages/Equipamentos'
import AutomacoesPage from './pages/Automacoes'
import CatalogoAtividades from './pages/CatalogoAtividades'
import Atividades from './pages/Atividades'
import ExecucaoOS from './pages/ExecucaoOS'
import { CentralAtendimento } from './pages/CentralAtendimento'
import ImportarClientes from './pages/ImportarClientes'
import ImportarAcessos from './pages/ImportarAcessos'
import GerenciarUsuarios from './pages/GerenciarUsuarios'
import Login from './pages/Login'
import RedefinirSenha from './pages/RedefinirSenha'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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

          {/* Rotas protegidas (autenticadas): envelopadas pelo ClientesProvider */}
          <Route
            element={
              <ErrorBoundary errorMessage="Ocorreu um problema ao carregar a página">
                <ProtectedRoute>
                  <ClientesProvider>
                    <Layout />
                  </ClientesProvider>
                </ProtectedRoute>
              </ErrorBoundary>
            }
          >
            {/* Rota comum ou permitida a ambos */}
            <Route path="/execucao-os" element={<ExecucaoOS />} />
            {/* Rotas restritas para Administradores: Layout já tem ProtectedRoute de autenticação geral, aqui apenas requiredRole="admin" se necessário */}
            <Route
              path="/"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Index />
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
              path="/atividades"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Atividades />
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
              path="/catalogo-atividades"
              element={
                <ProtectedRoute requiredRole="admin">
                  <CatalogoAtividades />
                </ProtectedRoute>
              }
            />{' '}
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App

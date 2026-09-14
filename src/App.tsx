import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ClientesProvider } from '@/contexts/ClientesContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from './components/Layout'

import Index from './pages/Index'
import Comercial from './pages/Comercial'
import Projetos from './pages/Projetos'
import Manutencoes from './pages/Manutencoes'
import Clientes from './pages/Clientes'
import Fornecedores from './pages/Fornecedores'
import Orcamentos from './pages/Orcamentos'
import Atividades from './pages/Atividades'
import ExecucaoOS from './pages/ExecucaoOS'
import { CentralAtendimento } from './pages/CentralAtendimento'
import ImportarClientes from './pages/ImportarClientes'
import ImportarAcessos from './pages/ImportarAcessos'
import ImportarContratosOM from './pages/ImportarContratosOM'
import GerenciarUsuarios from './pages/GerenciarUsuarios'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ClientesProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Rota comum ou permitida a ambos */}
              <Route path="/execucao-os" element={<ExecucaoOS />} />

              {/* Rotas restritas apenas para Administradores */}
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
                path="/clientes"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Clientes />
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
                path="/importar-acessos"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ImportarAcessos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/importar-contratos-om"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ImportarContratosOM />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ClientesProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App

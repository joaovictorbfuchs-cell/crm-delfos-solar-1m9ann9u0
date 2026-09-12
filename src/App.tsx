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
import { CentralAtendimento } from './pages/CentralAtendimento'
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
              <Route path="/" element={<Index />} />
              <Route path="/comercial" element={<Comercial />} />
              <Route path="/central-atendimento" element={<CentralAtendimento />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/projetos" element={<Projetos />} />
              <Route path="/atividades" element={<Atividades />} />
              <Route path="/manutencoes" element={<Manutencoes />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ClientesProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App

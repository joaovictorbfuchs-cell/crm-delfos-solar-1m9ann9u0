import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Cliente, Manutencao, Atividade, ManutencaoTipo, ManutencaoStatus } from '@/types/crm'
import {
  fetchClientes,
  fetchManutencoes,
  fetchAtividades,
  createManutencao as apiCreateManutencao,
  createCliente as apiCreateCliente,
  updateClienteStatus as apiUpdateClienteStatus,
} from '@/services/crmService'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/contexts/AuthContext'

interface ClientesContextType {
  clientes: Cliente[]
  manutencoes: Manutencao[]
  atividades: Atividade[]
  isLoading: boolean
  error: string | null
  selectedClienteId: string | null
  selectedCliente: Cliente | null
  openFichaCliente: (id: string) => void
  closeFichaCliente: () => void
  addCliente: (data: Partial<Cliente> & { nome: string }) => Promise<Cliente>
  addManutencao: (data: {
    cliente_id: string
    data: string
    tipo: ManutencaoTipo
    status: ManutencaoStatus
    tecnico?: string
    descricao?: string
  }) => Promise<Manutencao>
  updateClienteStatus: (id: string, status: Cliente['status']) => Promise<void>
  refreshData: () => Promise<void>
}

const ClientesContext = createContext<ClientesContextType | undefined>(undefined)

export const ClientesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)

  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const [cList, mList, aList] = await Promise.all([
        fetchClientes(),
        fetchManutencoes(),
        fetchAtividades(),
      ])
      setClientes(cList)
      setManutencoes(mList)
      setAtividades(aList)
    } catch (err: unknown) {
      console.error('Error loading CRM data:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do CRM')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Realtime updates for clientes
  useRealtime<Cliente>(
    'clientes',
    (data) => {
      if (data.action === 'create') {
        setClientes((prev) => [...prev, data.record])
      } else if (data.action === 'update') {
        setClientes((prev) => prev.map((c) => (c.id === data.record.id ? data.record : c)))
      } else if (data.action === 'delete') {
        setClientes((prev) => prev.filter((c) => c.id !== data.record.id))
      }
    },
    isAuthenticated,
  )

  // Realtime updates for manutencoes
  useRealtime<Manutencao>(
    'manutencoes',
    () => {
      // Refresh to ensure expand relation is populated
      fetchManutencoes().then(setManutencoes).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for atividades
  useRealtime<Atividade>(
    'atividades',
    () => {
      fetchAtividades().then(setAtividades).catch(console.error)
    },
    isAuthenticated,
  )

  const addCliente = async (data: Partial<Cliente> & { nome: string }) => {
    const created = await apiCreateCliente(data)
    // Atualiza estado local imediatamente caso o realtime demore
    setClientes((prev) => {
      if (prev.some((c) => c.id === created.id)) return prev
      return [created, ...prev]
    })
    return created
  }

  const openFichaCliente = (id: string) => {
    setSelectedClienteId(id)
  }

  const closeFichaCliente = () => {
    setSelectedClienteId(null)
  }

  const addManutencao = async (data: {
    cliente_id: string
    data: string
    tipo: ManutencaoTipo
    status: ManutencaoStatus
    tecnico?: string
    descricao?: string
  }) => {
    const created = await apiCreateManutencao(data)
    const updated = await fetchManutencoes()
    setManutencoes(updated)
    return created
  }

  const updateClienteStatus = async (id: string, status: Cliente['status']) => {
    // Optimistic update
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    try {
      const updated = await apiUpdateClienteStatus(id, status)
      setClientes((prev) => prev.map((c) => (c.id === id ? updated : c)))
    } catch (err) {
      console.error('Erro ao atualizar status do cliente:', err)
      // Reverter recarregando dados
      await loadAllData()
      throw err
    }
  }

  const selectedCliente = clientes.find((c) => c.id === selectedClienteId) || null

  return (
    <ClientesContext.Provider
      value={{
        clientes,
        manutencoes,
        atividades,
        isLoading,
        error,
        selectedClienteId,
        selectedCliente,
        openFichaCliente,
        closeFichaCliente,
        addCliente,
        addManutencao,
        updateClienteStatus,
        refreshData: loadAllData,
      }}
    >
      {children}
    </ClientesContext.Provider>
  )
}

export function useClientes(): ClientesContextType {
  const context = useContext(ClientesContext)
  if (!context) {
    throw new Error('useClientes must be used within a ClientesProvider')
  }
  return context
}

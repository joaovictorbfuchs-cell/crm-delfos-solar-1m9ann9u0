import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ListaOM, type AbaPrincipalOM } from '@/components/ListaOM'
import { calcularContagensOM } from '@/lib/omCategorizacao'
import { ModalNovoContratoOM } from '@/components/ModalNovoContratoOM'
import { ModalNovaPropostaOM } from '@/components/ModalNovaPropostaOM'

export default function Manutencoes() {
  const {
    clientes,
    contratosOM,
    sistemas,
    anomaliasOM,
    servicosAdicionaisOM,
    servicosAvulsos,
    isLoading,
    openFichaOM,
  } = useClientes()

  const location = useLocation()
  const [activeSubTab, setActiveSubTab] = useState<AbaPrincipalOM>('com_plano')
  const [isNovoContratoOpen, setIsNovoContratoOpen] = useState(false)
  const [isNovaPropostaOpen, setIsNovaPropostaOpen] = useState(false)

  // Quando acessado via rota direta /planos-om ou /planos-monitoramento, força a aba com_plano (Planos O&M)
  useEffect(() => {
    if (location.pathname === '/planos-om' || location.pathname === '/planos-monitoramento') {
      setActiveSubTab('com_plano')
    }
  }, [location.pathname])

  // Métricas do Módulo O&M unificadas com a categorização por cliente
  const contagens = React.useMemo(
    () =>
      calcularContagensOM(
        clientes,
        contratosOM,
        servicosAdicionaisOM,
        anomaliasOM,
        servicosAvulsos,
        sistemas,
      ),
    [clientes, contratosOM, servicosAdicionaisOM, anomaliasOM, servicosAvulsos, sistemas],
  )
  const contratosAtivos = contagens.planosAtivos

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando carteira de O&M e manutenções...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3.5">
      {/* Conteúdo Principal: Base Completa O&M com sub-abas Planos O&M e Clientes Pós-Vendas */}
      <ListaOM
        onOpenFichaOM={openFichaOM}
        onOpenNovoContrato={() => setIsNovoContratoOpen(true)}
        onOpenNovaProposta={() => setIsNovaPropostaOpen(true)}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
      />

      {/* Modal Novo Contrato de O&M */}
      <ModalNovoContratoOM
        isOpen={isNovoContratoOpen}
        onClose={() => setIsNovoContratoOpen(false)}
      />

      {/* Modal Nova Proposta O&M */}
      <ModalNovaPropostaOM
        isOpen={isNovaPropostaOpen}
        onClose={() => setIsNovaPropostaOpen(false)}
      />
    </div>
  )
}

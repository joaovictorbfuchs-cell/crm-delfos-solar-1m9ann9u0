import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ModalNovaPropostaOM } from './ModalNovaPropostaOM'
import * as crmService from '@/services/crmService'

// Mocks dos contextos
const mockClientes = [
  {
    id: 'o0olajza1e5zgw7',
    nome: 'Metal Mecânica Solução Ltda',
    cidade: 'Erechim',
    estado: 'RS',
    potencia_kwp: 12.6,
    placas_qtd: 28,
    inversor_marca: 'GROWATT',
    inversor_modelo: 'ON GRID MIN10000TL-X 10KW',
    status: 'Fechado',
  },
  {
    id: 'cli-com-varias-usinas',
    nome: 'Agrícola Vale do Sol',
    cidade: 'Passo Fundo',
    estado: 'RS',
    potencia_kwp: 50.0,
    status: 'Ativo',
  },
]

const mockUsinaMetalMecanica: import('@/types/crm').UsinaCliente = {
  id: '6nnj464oav7wjd1',
  collectionId: 'pbc_3535928899',
  collectionName: 'usinas',
  cliente_id: 'o0olajza1e5zgw7',
  nome: 'Usina Principal - Solução Metal Mecanica (Metal Mecânica Solução LTDA)',
  potencia_kwp: 27.81,
  qtd_modulos: 54,
  quantidade_placas: 54,
  geracao_estimada_kwh: 2450,
  geracao_media_mensal_kwh: 1920,
  fabricante_inversores: 'SOFAR',
  modelo_inversores: '10KTLM-G3',
  inversores_info: 'GROWATT 10KW',
  fabricante_modulos: 'Jinko Solar',
  modelo_modulos: 'Tiger Pro 60HC',
  tipo_telhado: 'metalico',
  tipo_estrutura: 'telhado',
  tarifa: 0.92,
  created: '2026-09-14 11:40:31.115Z',
  updated: '2026-10-29 15:13:15.970Z',
}

const mockUsinasMultiplas: import('@/types/crm').UsinaCliente[] = [
  {
    id: 'usina-sol-1',
    collectionId: 'pbc_3535928899',
    collectionName: 'usinas',
    cliente_id: 'cli-com-varias-usinas',
    nome: 'Usina Sede',
    potencia_kwp: 30.0,
    qtd_modulos: 60,
    geracao_estimada_kwh: 3600,
    fabricante_inversores: 'Fronius',
    modelo_inversores: 'Symo 30kW',
    created: '2026-01-01',
    updated: '2026-01-01',
  },
  {
    id: 'usina-sol-2',
    collectionId: 'pbc_3535928899',
    collectionName: 'usinas',
    cliente_id: 'cli-com-varias-usinas',
    nome: 'Usina Granja',
    potencia_kwp: 20.0,
    qtd_modulos: 40,
    geracao_estimada_kwh: 2400,
    fabricante_inversores: 'Deye',
    modelo_inversores: 'SUN-20K',
    created: '2026-01-02',
    updated: '2026-01-02',
  },
]

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    clientes: mockClientes,
    addPropostaOM: vi.fn().mockResolvedValue({ id: 'prop-om-nova-123' }),
    updatePropostaOM: vi.fn().mockResolvedValue({ id: 'prop-om-atualizada-123' }),
    addTimelineOM: vi.fn().mockResolvedValue({}),
    updateClienteStatus: vi.fn().mockResolvedValue({}),
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', name: 'Consultor Solar' },
  }),
}))

describe('ModalNovaPropostaOM - Seleção de Cliente e Usina em Duas Etapas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Dropdown do cliente mostra nome e cidade sem exibir kWp resumido no rótulo', async () => {
    vi.spyOn(crmService, 'fetchSistemasTecnicosCliente').mockResolvedValue([mockUsinaMetalMecanica])

    render(
      <ModalNovaPropostaOM isOpen={true} onClose={() => {}} initialClienteId="o0olajza1e5zgw7" />,
    )

    // O rótulo da opção de Metal Mecânica não deve conter kWp
    const optCliente = screen.getByRole('option', {
      name: /Metal Mecânica Solução Ltda — Erechim/i,
    })
    expect(optCliente).toBeTruthy()
    expect(optCliente.textContent).not.toContain('kWp')
    expect(optCliente.textContent).not.toContain('12.6')
  })

  it('2. Carrega dados técnicos da usina real (27,81 kWp, 54 módulos) para Metal Mecânica Solução e NÃO o cadastro resumido (12,6 kWp / 28 placas)', async () => {
    const fetchSpy = vi
      .spyOn(crmService, 'fetchSistemasTecnicosCliente')
      .mockResolvedValue([mockUsinaMetalMecanica])

    render(
      <ModalNovaPropostaOM isOpen={true} onClose={() => {}} initialClienteId="o0olajza1e5zgw7" />,
    )

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('o0olajza1e5zgw7')
    })

    // Potência técnica exibida na tela deve ser a da usina real
    await waitFor(() => {
      expect(screen.getByText('27.81 kWp')).toBeTruthy()
      expect(screen.getByText('54 placas')).toBeTruthy()
    })

    // Não deve exibir os 12,6 kWp nem 28 placas do cadastro resumido
    expect(screen.queryByText('12.6 kWp')).toBeNull()
    expect(screen.queryByText('28 placas')).toBeNull()
  })

  it('3. Quando o cliente tem mais de uma usina, exibe "Todas as usinas (somatório)" e soma potência, módulos e geração', async () => {
    vi.spyOn(crmService, 'fetchSistemasTecnicosCliente').mockResolvedValue(mockUsinasMultiplas)

    render(
      <ModalNovaPropostaOM
        isOpen={true}
        onClose={() => {}}
        initialClienteId="cli-com-varias-usinas"
      />,
    )

    // Opção "Todas as usinas (somatório)" disponível e selecionada por padrão para múltiplas
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /Todas as usinas \(somatório\) — 2 usinas/i }),
      ).toBeTruthy()
    })

    // Potência somada: 30 + 20 = 50 kWp; módulos somados: 60 + 40 = 100 placas; geração somada: 3600 + 2400 = 6000 kWh
    await waitFor(() => {
      expect(screen.getByText('50 kWp')).toBeTruthy()
      expect(screen.getByText('100 placas')).toBeTruthy()
      expect(screen.getByText(/6\.000 kWh/i)).toBeTruthy()
    })

    // Inversores listam todas as usinas
    expect(
      screen.getByText(/Usina Sede: Fronius Symo 30kW • Usina Granja: Deye SUN-20K/i),
    ).toBeTruthy()
  })

  it('4. Permite alternar de "Todas as usinas" para uma usina individual específica', async () => {
    vi.spyOn(crmService, 'fetchSistemasTecnicosCliente').mockResolvedValue(mockUsinasMultiplas)

    render(
      <ModalNovaPropostaOM
        isOpen={true}
        onClose={() => {}}
        initialClienteId="cli-com-varias-usinas"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('50 kWp')).toBeTruthy()
    })

    // Seleciona a Usina 1 (30 kWp, 60 placas)
    const selectUsina =
      screen.getByLabelText(/2\. Selecione a Usina/i) || screen.getAllByRole('combobox')[1]
    fireEvent.change(selectUsina, { target: { value: 'usina-sol-1' } })

    await waitFor(() => {
      expect(screen.getByText('30 kWp')).toBeTruthy()
      expect(screen.getByText('60 placas')).toBeTruthy()
    })
  })
})

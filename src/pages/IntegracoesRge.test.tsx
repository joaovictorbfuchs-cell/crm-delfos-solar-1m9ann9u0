import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import IntegracoesRge from './IntegracoesRge'

// Mock de PocketBase
const mockCollection = vi.fn()
vi.mock('@/lib/pocketbase/client', () => {
  const fakePb = {
    collection: (name: string) => mockCollection(name),
  }
  return {
    default: fakePb,
    pb: fakePb,
  }
})

// Mock de toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}))

describe('IntegracoesRge - Redesign Completo (v0.0.1580 / v0.0.1582)', () => {
  const credenciaisMock = [
    {
      id: 'cred-1',
      uc: '11111111',
      rotulo: 'Carlos Ortiz - Sítio',
      status: 'ok',
      login: 'carlos@email.com',
      cliente_id: 'cli-1',
      expand: {
        cliente_id: { id: 'cli-1', nome: 'Carlos Ortiz' },
      },
    },
    {
      id: 'cred-2',
      uc: '22222222',
      rotulo: 'Padaria Central',
      status: 'erro',
      login: 'padaria@email.com',
      ultimo_erro: 'Senha inválida na RGE',
    },
    {
      id: 'cred-3',
      uc: '33333333',
      rotulo: 'Fazenda Boa Vista',
      status: 'novo',
    },
  ]

  const contasMock = [
    {
      id: 'conta-1',
      uc: '11111111',
      competencia: '2024-03',
      credencial_id: 'cred-1',
      cliente_id: 'cli-1',
      origem: 'AUTOMÁTICO',
      created: '2024-03-10T12:00:00Z',
    },
    {
      id: 'conta-2',
      uc: '22222222',
      competencia: '2024-02',
      credencial_id: 'cred-2',
      origem: 'MANUAL',
      created: '2024-02-10T12:00:00Z',
    },
  ]

  const beneficiariasMock = [
    {
      id: 'ben-1',
      credencial_id: 'cred-1',
      cliente_id: 'cli-1',
      uc: '99999991',
      rotulo: 'Casa de Praia',
      percentual: 8,
    },
    {
      id: 'ben-2',
      credencial_id: 'cred-1',
      cliente_id: 'cli-1',
      uc: '99999992',
      rotulo: 'Apartamento Centro',
      percentual: 25,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    mockCollection.mockImplementation((collName: string) => {
      if (collName === 'rge_credenciais') {
        return {
          getFullList: vi.fn().mockResolvedValue(credenciaisMock),
          create: vi.fn().mockResolvedValue({ id: 'cred-nova', uc: '77777777', status: 'novo' }),
          update: vi.fn().mockResolvedValue({}),
          delete: vi.fn().mockResolvedValue({}),
        }
      }
      if (collName === 'rge_contas') {
        return {
          getFullList: vi.fn().mockResolvedValue(contasMock),
          create: vi.fn().mockResolvedValue({ id: 'conta-nova' }),
        }
      }
      if (collName === 'rge_beneficiarias') {
        return {
          getFullList: vi.fn().mockResolvedValue(beneficiariasMock),
          create: vi
            .fn()
            .mockImplementation((payload) =>
              Promise.resolve({ id: `ben-${Date.now()}`, ...payload }),
            ),
          update: vi.fn().mockResolvedValue({}),
          delete: vi.fn().mockResolvedValue({}),
        }
      }
      if (collName === 'clientes') {
        return {
          getFullList: vi.fn().mockResolvedValue([
            { id: 'cli-1', nome: 'Carlos Ortiz' },
            { id: 'cli-2', nome: 'Padaria Central' },
          ]),
        }
      }
      if (collName === 'usinas') {
        return {
          getFullList: vi
            .fn()
            .mockResolvedValue([
              { id: 'usi-1', nome: 'Usina Solar Sítio', uc: '11111111', cliente_id: 'cli-1' },
            ]),
        }
      }
      return {
        getFullList: vi.fn().mockResolvedValue([]),
      }
    })
  })

  it('renderiza os cards de métricas no topo', async () => {
    render(<IntegracoesRge />)

    await waitFor(() => {
      expect(screen.getByText('Métricas de Integração')).toBeTruthy()
    })

    expect(screen.getByText('Concessionárias Cadastradas')).toBeTruthy()
    expect(screen.getByText('Status das Credenciais')).toBeTruthy()
    expect(screen.getByText('Faturas Baixadas')).toBeTruthy()
  })

  it('permite alternar entre as abas Concessionária, Faturas e Beneficiárias', async () => {
    render(<IntegracoesRge />)

    await waitFor(() => {
      expect(screen.getByText('Gerenciar Concessionária')).toBeTruthy()
    })

    const abaFaturas = screen.getByText('Gerenciar Faturas')
    const abaBeneficiarias = screen.getByText('Beneficiárias')

    expect(abaFaturas).toBeTruthy()
    expect(abaBeneficiarias).toBeTruthy()

    // Alterna para Faturas
    fireEvent.click(abaFaturas)
    expect(screen.getByText('Nº UNIDADE')).toBeTruthy()
    expect(screen.getByText('MÊS')).toBeTruthy()

    // Alterna para Beneficiárias
    fireEvent.click(abaBeneficiarias)
    expect(screen.getByText('Confira as suas unidades geradoras e beneficiárias.')).toBeTruthy()
    expect(screen.getByText('Gestão de Beneficiárias')).toBeTruthy()
    expect(screen.getByText('UC Beneficiárias desvinculadas')).toBeTruthy()
  })

  it('exibe as colunas corretas na tabela da aba Gerenciar Faturas incluindo nome do cliente', async () => {
    render(<IntegracoesRge />)

    await waitFor(() => {
      expect(screen.getByText('Gerenciar Faturas')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Gerenciar Faturas'))

    // Colunas especificadas no layout
    expect(screen.getByText('CONCESSIONÁRIA')).toBeTruthy()
    expect(screen.getByText('UNIDADE')).toBeTruthy()
    expect(screen.getByText('Nº UNIDADE')).toBeTruthy()
    expect(screen.getByText('MÊS')).toBeTruthy()
    expect(screen.getByText('ALERTAS')).toBeTruthy()
    expect(screen.getByText('ORIGEM')).toBeTruthy()

    // Verifica que o nome do cliente "Carlos Ortiz" aparece na coluna UNIDADE
    await waitFor(() => {
      expect(screen.getAllByText('Carlos Ortiz').length).toBeGreaterThan(0)
    })
  })

  it('exibe a tela Beneficiárias agrupada por cliente com % e alertas', async () => {
    render(<IntegracoesRge />)

    await waitFor(() => {
      expect(screen.getByText('Beneficiárias')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Beneficiárias'))

    // Subtítulo e busca
    expect(screen.getByText('Confira as suas unidades geradoras e beneficiárias.')).toBeTruthy()
    expect(screen.getByPlaceholderText('Filtre pelo nome da unidade...')).toBeTruthy()

    // Colunas da tabela
    expect(screen.getByText('DISTRIBUIÇÃO')).toBeTruthy()
    expect(screen.getByText('Nº DA UC')).toBeTruthy()

    // Grupo de cliente "Carlos Ortiz"
    await waitFor(() => {
      expect(screen.getAllByText('Carlos Ortiz').length).toBeGreaterThan(0)
      expect(screen.getByText('Casa de Praia')).toBeTruthy()
      expect(screen.getByText('Apartamento Centro')).toBeTruthy()
    })

    // Percentuais formatados
    expect(screen.getByText('8%')).toBeTruthy()
    expect(screen.getByText('25%')).toBeTruthy()
  })

  it('abre modal para adicionar unidade beneficiária e valida soma <= 100%', async () => {
    render(<IntegracoesRge />)

    await waitFor(() => {
      expect(screen.getByText('Beneficiárias')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Beneficiárias'))

    await waitFor(() => {
      expect(screen.getByLabelText('Adicionar beneficiária')).toBeTruthy()
    })

    // Clica no botão de adicionar beneficiária do grupo
    fireEvent.click(screen.getByLabelText('Adicionar beneficiária'))

    expect(screen.getByText('Adicionar Unidade Beneficiária')).toBeTruthy()

    // Preenche os campos
    const inputNome = screen.getByPlaceholderText('Ex.: Casa da Praia, Sítio')
    const inputUc = screen.getByPlaceholderText('Ex.: 20041900119')
    const inputPct = screen.getByRole('spinbutton')

    fireEvent.change(inputNome, { target: { value: 'Chácara das Flores' } })
    fireEvent.change(inputUc, { target: { value: '99999993' } })

    // Tentativa com percentual que estoura 100% (8 + 25 = 33 existentes; adiciona 70 -> total 103 > 100)
    fireEvent.change(inputPct, { target: { value: '70' } })
    expect(screen.getByText(/Atenção: A soma ultrapassa 100%/)).toBeTruthy()

    // Ajusta para percentual válido (10% -> total 43% <= 100%)
    fireEvent.change(inputPct, { target: { value: '10' } })
    expect(screen.queryByText(/Atenção: A soma ultrapassa 100%/)).toBeNull()

    // Salva
    const botaoSalvar = screen.getByRole('button', { name: 'Adicionar Beneficiária' })
    fireEvent.click(botaoSalvar)

    await waitFor(() => {
      expect(screen.queryByText('Adicionar Unidade Beneficiária')).toBeNull()
    })
  })

  it('permite filtrar unidades pelo campo de busca na aba Beneficiárias', async () => {
    render(<IntegracoesRge />)

    await waitFor(() => {
      expect(screen.getByText('Beneficiárias')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Beneficiárias'))

    const inputBusca = screen.getByPlaceholderText('Filtre pelo nome da unidade...')
    fireEvent.change(inputBusca, { target: { value: 'Praia' } })

    await waitFor(() => {
      expect(screen.getByText('Casa de Praia')).toBeTruthy()
      expect(screen.queryByText('Apartamento Centro')).toBeNull()
    })
  })

  it('alterna para a sub-aba UC Beneficiárias desvinculadas', async () => {
    render(<IntegracoesRge />)

    await waitFor(() => {
      expect(screen.getByText('Beneficiárias')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('Beneficiárias'))

    const abaDesvinculadas = screen.getByText('UC Beneficiárias desvinculadas')
    fireEvent.click(abaDesvinculadas)

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma UC beneficiária desvinculada/)).toBeTruthy()
    })
  })
})

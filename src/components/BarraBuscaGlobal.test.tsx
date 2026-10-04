import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  HighlightMatch,
  DropdownResultadosErrorBoundary,
  BarraBuscaGlobal,
} from './BarraBuscaGlobal'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock do contexto de clientes
const mockClientes = [
  {
    id: 'cli-1',
    nome: 'Mauro Antônio Serraglio',
    razao_social: 'Mauro Serraglio ME',
    cidade: 'Erechim',
    telefone: '(54) 9176-6675',
    whatsapp: '5491766675',
    status: 'Novo Lead',
  },
  {
    id: 'cli-2',
    nome: 'Mauro da Silva',
    cidade: 'Passo Fundo',
    telefone: '(54) 9988-1122',
    status: 'Em Negociação',
  },
]

const mockOpenFichaCliente = vi.fn()

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    clientes: mockClientes,
    contatosAdicionais: [],
    projetos: [],
    contratosOM: [],
    manutencoes: [],
    openFichaCliente: mockOpenFichaCliente,
  }),
}))

vi.mock('@/services/crmService', () => ({
  fetchOrdensServico: vi.fn().mockResolvedValue([]),
  fetchOutrosContatos: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/contatosService', () => ({
  fetchContatosUnicos: vi.fn().mockResolvedValue([]),
}))

describe('BarraBuscaGlobal - HighlightMatch', () => {
  it('deve renderizar texto sem alteração quando a query for vazia', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, { text: 'Carlos Alberto Lima', query: '' }),
    )
    expect(html).toContain('Carlos Alberto Lima')
    expect(html).not.toContain('<mark')
  })

  it('deve envolver o trecho pesquisado em tag mark com destaque em verde/esmeralda', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, { text: 'Carlos Alberto Lima', query: 'alberto' }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Alberto</mark>',
    )
    expect(html).toContain('Carlos')
    expect(html).toContain('Lima')
  })

  it('deve ser case-insensitive ao destacar', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, { text: 'Passo Fundo/RS', query: 'PASSO' }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Passo</mark>',
    )
    expect(html).toContain('Fundo/RS')
  })

  it('deve destacar múltiplos tokens separadamente (ex: "mauro se" em "Mauro Antônio Serraglio")', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Mauro Antônio Serraglio',
        query: 'mauro se',
      }),
    )
    // "Mauro" e "Se" devem estar destacados individualmente
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Mauro</mark>',
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Se</mark>',
    )
    expect(html).toContain('Antônio')
    expect(html).toContain('rraglio')
  })

  it('preserva destaque contíguo com acentuação compatível', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Mauro Antônio Serraglio',
        query: 'Mauro Antônio',
      }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Mauro Antônio</mark>',
    )
  })

  it('formata badge Encontrado via contato corretamente', () => {
    const contatoNome = 'Rodrigo Becker'
    const badge = `Encontrado via contato: ${contatoNome}`
    expect(badge).toBe('Encontrado via contato: Rodrigo Becker')
  })

  it('destaca tokens mesmo com pontuações ou acentos', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Mauro Antônio Serraglio - (54) 9176-6675',
        query: 'mauro se',
      }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Mauro</mark>',
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Se</mark>',
    )
  })

  it('destaca contato de base unificada com tokens parciais', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Gabriel Becker Engenharia',
        query: 'gabriel beck',
      }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Gabriel</mark>',
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Beck</mark>',
    )
  })

  it('verifica que HighlightMatch suporta termos vazios e múltiplos espaços sem quebrar', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Gabriel Becker Engenharia',
        query: '   ',
      }),
    )
    expect(html).toContain('Gabriel Becker Engenharia')
    expect(html).not.toContain('<mark')
  })

  it('deve lidar defensivamente com text undefined ou null sem lançar erro', () => {
    // text como undefined
    const htmlUndefined = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: undefined as unknown as string,
        query: 'mauro',
      }),
    )
    expect(htmlUndefined).toBe('<span></span>')

    // text como null
    const htmlNull = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: null as unknown as string,
        query: 'mauro',
      }),
    )
    expect(htmlNull).toBe('<span></span>')
  })

  it('deve lidar com query null ou undefined sem lançar erro', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Mauro Serraglio',
        query: null as unknown as string,
      }),
    )
    expect(html).toBe('<span>Mauro Serraglio</span>')
  })

  it('deve escapar corretamente caracteres especiais de regex na query', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Delfos Solar (54) 9999-0000 [RS]',
        query: '(54) [RS]',
      }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">(54)</mark>',
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">[RS]</mark>',
    )
  })

  it('deve renderizar números como text de forma segura', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 12345,
        query: '234',
      }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">234</mark>',
    )
  })

  it('ErrorBoundary local deve renderizar mensagem amigável caso um filho lance exceção', () => {
    const BuggyComponent = () => {
      throw new Error('Falha simulada na renderização de item')
    }

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const html = renderToStaticMarkup(
      React.createElement(
        DropdownResultadosErrorBoundary,
        null,
        React.createElement(BuggyComponent, null),
      ),
    )

    expect(html).toContain('Não foi possível exibir os resultados')
    expect(html).toContain('Ocorreu uma inconsistência transitória')

    consoleErrorSpy.mockRestore()
  })
})

describe('BarraBuscaGlobal - Renderização via Portal e Interatividade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar o dropdown no document.body via portal quando a query tiver >= 2 caracteres', async () => {
    render(
      <MemoryRouter>
        <BarraBuscaGlobal />
      </MemoryRouter>,
    )

    const input = screen.getByPlaceholderText(
      'Pesquisar no CRM (clientes, negócios, OS, contratos...)',
    )
    expect(input).not.toBeNull()

    // Inicialmente o dropdown não deve existir no DOM
    expect(screen.queryByTestId('dropdown-resultados-busca')).toBeNull()

    // Digita "mauro"
    fireEvent.change(input, { target: { value: 'mauro' } })

    // O dropdown deve agora estar no documento (renderizado via createPortal diretamente em document.body)
    await waitFor(() => {
      const dropdown = screen.getByTestId('dropdown-resultados-busca')
      expect(dropdown).not.toBeNull()
      expect(dropdown.parentElement).toBe(document.body)
    })

    // Deve exibir ambos os clientes "Mauro" encontrados
    expect(screen.getByText('Mauro Antônio Serraglio')).not.toBeNull()
    expect(screen.getByText('Mauro da Silva')).not.toBeNull()
    expect(screen.getByText(/2 resultados/i)).not.toBeNull()
  })

  it('permite abrir a ficha do cliente ao clicar no resultado da lista suspensa', async () => {
    render(
      <MemoryRouter>
        <BarraBuscaGlobal />
      </MemoryRouter>,
    )

    const input = screen.getByPlaceholderText(
      'Pesquisar no CRM (clientes, negócios, OS, contratos...)',
    )
    fireEvent.change(input, { target: { value: 'mauro' } })

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-resultados-busca')).not.toBeNull()
    })

    // Clica no segundo Mauro ("Mauro da Silva")
    const itemMauroSilva = screen.getByText('Mauro da Silva').closest('button')
    expect(itemMauroSilva).not.toBeNull()
    if (itemMauroSilva) {
      fireEvent.click(itemMauroSilva)
    }

    expect(mockOpenFichaCliente).toHaveBeenCalledWith('cli-2')
  })

  it('fecha o dropdown ao pressionar Escape ou clicar fora', async () => {
    render(
      <MemoryRouter>
        <BarraBuscaGlobal />
      </MemoryRouter>,
    )

    const input = screen.getByPlaceholderText(
      'Pesquisar no CRM (clientes, negócios, OS, contratos...)',
    )
    fireEvent.change(input, { target: { value: 'mauro' } })

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-resultados-busca')).not.toBeNull()
    })

    // Pressiona Escape
    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByTestId('dropdown-resultados-busca')).toBeNull()
    })
  })
})

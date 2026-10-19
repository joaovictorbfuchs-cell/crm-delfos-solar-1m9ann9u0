import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PainelEdicaoConteudoOM } from './PainelEdicaoConteudoOM'
import {
  normalizarConteudoPropostaOM,
  getConteudoPropostaOMDefaults,
} from '@/lib/conteudoPropostaOM'
import { PreviewPropostaOMDocumento } from './PreviewPropostaOMDocumento'
import { PropostaOMPDFDocument } from './PropostaOMPDFDocument'
import {
  gerarHTMLPropostaOM,
  type PropostaPDFInput,
  calcularPropostaOM,
} from '@/lib/propostaOMGenerator'

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="doc">{children}</div>,
  Page: ({ children }: any) => <div data-testid="page">{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  Image: ({ src }: any) => <img data-testid="pdf-image" src={src} alt="pdf-img" />,
  StyleSheet: { create: (s: any) => s },
}))

describe('PainelEdicaoConteudoOM - Lista dinâmica de benefícios', () => {
  it('exibe os benefícios iniciais por plano com botões de remover e adicionar', () => {
    const conteudoInicial = getConteudoPropostaOMDefaults()
    const handleChange = vi.fn()

    render(<PainelEdicaoConteudoOM conteudo={conteudoInicial} onChange={handleChange} />)

    // Abre a seção 3 de planos
    const botaoSecaoPlanos = screen.getByRole('button', {
      name: /3\. Planos de gestão e manutenção/i,
    })
    fireEvent.click(botaoSecaoPlanos)

    expect(screen.getByText('Plano Essencial')).toBeTruthy()
    expect(screen.getByText('Plano Inspeção')).toBeTruthy()
    expect(screen.getByText('Plano Completo')).toBeTruthy()

    // Botões de adicionar benefício para cada um dos 3 planos
    const botoesAdicionar = screen.getAllByRole('button', { name: /Adicionar benefício/i })
    expect(botoesAdicionar.length).toBe(3)

    // Botões de remover benefício (lixeira com aria-label)
    const botoesRemoverCompleto = screen.getAllByRole('button', {
      name: /Remover Benefício .* do Plano Completo/i,
    })
    expect(botoesRemoverCompleto.length).toBe(conteudoInicial.secao4.beneficiosCompleto.length)
  })

  it('permite remover um benefício do Plano Completo sem deixar slot vazio', () => {
    const conteudoInicial = getConteudoPropostaOMDefaults()
    let estadoAtual = conteudoInicial
    const handleChange = vi.fn((novo) => {
      estadoAtual = novo
    })

    const { rerender } = render(
      <PainelEdicaoConteudoOM conteudo={estadoAtual} onChange={handleChange} />,
    )

    // Abre a seção 3
    fireEvent.click(screen.getByRole('button', { name: /3\. Planos de gestão e manutenção/i }))

    const qtdOriginal = estadoAtual.secao4.beneficiosCompleto.length
    expect(qtdOriginal).toBeGreaterThan(0)

    // Remove o primeiro benefício do Plano Completo
    const botoesRemoverCompleto = screen.getAllByRole('button', {
      name: /Remover Benefício .* do Plano Completo/i,
    })
    fireEvent.click(botoesRemoverCompleto[0])

    expect(handleChange).toHaveBeenCalled()
    expect(estadoAtual.secao4.beneficiosCompleto.length).toBe(qtdOriginal - 1)

    // Re-renderiza com o novo estado e confere que a lista ajustou
    rerender(<PainelEdicaoConteudoOM conteudo={estadoAtual} onChange={handleChange} />)
    const novosBotoesRemover = screen.getAllByRole('button', {
      name: /Remover Benefício .* do Plano Completo/i,
    })
    expect(novosBotoesRemover.length).toBe(qtdOriginal - 1)
  })

  it('permite adicionar um novo benefício ao plano', () => {
    const conteudoInicial = getConteudoPropostaOMDefaults()
    let estadoAtual = conteudoInicial
    const handleChange = vi.fn((novo) => {
      estadoAtual = novo
    })

    render(<PainelEdicaoConteudoOM conteudo={estadoAtual} onChange={handleChange} />)

    fireEvent.click(screen.getByRole('button', { name: /3\. Planos de gestão e manutenção/i }))

    const botoesAdicionar = screen.getAllByRole('button', { name: /Adicionar benefício/i })
    // Clica em adicionar no Plano Completo (3º botão)
    fireEvent.click(botoesAdicionar[2])

    expect(handleChange).toHaveBeenCalled()
    expect(estadoAtual.secao4.beneficiosCompleto.length).toBe(
      conteudoInicial.secao4.beneficiosCompleto.length + 1,
    )
    expect(
      estadoAtual.secao4.beneficiosCompleto[estadoAtual.secao4.beneficiosCompleto.length - 1],
    ).toBe('')
  })
})

describe('normalizarConteudoPropostaOM e renderização tolerante', () => {
  it('tolera campos legados de benefício e converte para array', () => {
    const legado = {
      secao4: {
        beneficio_completo_1: 'Benefício Custom 1',
        beneficio_completo_2: 'Benefício Custom 2',
      },
    }
    const norm = normalizarConteudoPropostaOM(legado)
    expect(norm.secao4.beneficiosCompleto).toEqual(['Benefício Custom 1', 'Benefício Custom 2'])
  })

  it('filtra benefícios vazios ou com apenas espaços em branco no Preview, PDF e HTML gerado', () => {
    const calculosMock = calcularPropostaOM({ geracaoMensalKwh: 1000, valorKwh: 0.9 })
    const propostaMock: PropostaPDFInput = {
      cliente: { nome: 'Usina Teste' },
      tecnico: { potenciaKwp: 10, geracaoMediaKwh: 1000, numeroModulos: 20 },
      parametros: { valorKwh: 0.9 },
      calculos: calculosMock,
      conteudo: {
        ...getConteudoPropostaOMDefaults(),
        secao4: {
          ...getConteudoPropostaOMDefaults().secao4,
          beneficiosCompleto: ['Benefício 1 Válido', '', '   ', 'Benefício 2 Válido'],
        },
      },
    }

    // 1. Preview
    render(<PreviewPropostaOMDocumento dados={propostaMock} conteudo={propostaMock.conteudo} />)
    expect(screen.getByText('Benefício 1 Válido')).toBeTruthy()
    expect(screen.getByText('Benefício 2 Válido')).toBeTruthy()

    // 2. PropostaOMPDFDocument
    const { container: pdfContainer } = render(<PropostaOMPDFDocument dados={propostaMock} />)
    expect(pdfContainer).toBeTruthy()
    expect(screen.getAllByText('Benefício 1 Válido').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Benefício 2 Válido').length).toBeGreaterThan(0)

    // 3. HTML gerado
    const html = gerarHTMLPropostaOM(propostaMock)
    expect(html).toContain('Benefício 1 Válido')
    expect(html).toContain('Benefício 2 Válido')
    expect(html).not.toContain('<li><span style="color:#16A34A;font-weight:bold;">✓</span> </li>')
    expect(html).not.toContain(
      '<li><span style="color:#16A34A;font-weight:bold;">✓</span>    </li>',
    )
  })
})

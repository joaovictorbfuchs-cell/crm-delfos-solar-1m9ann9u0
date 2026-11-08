import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import { IntegracoesRgePage } from '@/pages/IntegracoesRge'

describe('IntegracoesRgePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza e carrega credenciais e contas com sucesso sem erro 400', async () => {
    const credenciaisMock = [
      {
        id: 'rec_cred_1',
        uc: '20041900119',
        rotulo: 'Usina Matriz',
        login: 'joao@delfosengenharia.com.br',
        tem_senha: true,
        tem_token: false,
        modo_auth: 'senha',
        status: 'novo',
        ativo: true,
      },
    ]

    const contasMock = [
      {
        id: 'rec_conta_1',
        uc: '20041900119',
        competencia: '2026-10',
        consumo_kwh: 1450,
        nome_arquivo: 'conta-20041900119.pdf',
        created: '2026-11-08T10:00:00Z',
      },
    ]

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url)
      if (urlStr.includes('/backend/v1/rge/credenciais')) {
        return new Response(JSON.stringify({ ok: true, itens: credenciaisMock }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (urlStr.includes('/backend/v1/rge/contas')) {
        return new Response(JSON.stringify({ ok: true, itens: contasMock }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<IntegracoesRgePage />)

    // Aguarda carregar
    await waitFor(() => {
      expect(screen.getByText('20041900119')).toBeTruthy()
    })

    expect(screen.getByText('Usina Matriz')).toBeTruthy()
    expect(screen.getByText('joao@delfosengenharia.com.br')).toBeTruthy()
    expect(screen.queryByText(/GoError: invalid sort field/i)).toBeNull()

    // Clicar em "Atualizar" deve recarregar sem erros
    const btnAtualizar = screen.getByRole('button', { name: /Atualizar/i })
    fireEvent.click(btnAtualizar)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/backend/v1/rge/credenciais'),
        expect.anything(),
      )
    })

    expect(screen.queryByText(/Não foi possível carregar a integração/i)).toBeNull()
  })

  it('exibe mensagem quando endpoint rge/credenciais retorna erro', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url)
      if (urlStr.includes('/backend/v1/rge/credenciais')) {
        return new Response(
          JSON.stringify({ ok: false, error: 'GoError: invalid sort field "created"' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
      return new Response(JSON.stringify({ ok: true, itens: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<IntegracoesRgePage />)

    await waitFor(() => {
      expect(screen.getByText(/GoError: invalid sort field "created"/i)).toBeTruthy()
    })
  })
})

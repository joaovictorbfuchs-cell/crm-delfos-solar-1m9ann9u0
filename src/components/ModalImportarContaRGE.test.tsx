import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ModalImportarContaRGE } from '@/components/ModalImportarContaRGE'
import * as faturaRGEService from '@/services/faturaRGEService'

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

describe('ModalImportarContaRGE', () => {
  it('renderiza corretamente o modal com dropzone no desktop', () => {
    render(<ModalImportarContaRGE isOpen={true} onClose={vi.fn()} onConfirmar={vi.fn()} />)
    expect(screen.getByText('Importar dados da conta RGE')).toBeDefined()
    expect(screen.getByText('Arraste a fatura RGE ou clique para selecionar')).toBeDefined()
    expect(screen.getByText(/Nome do titular \/ Razão Social/i)).toBeDefined()
  })

  it('processa fatura e exibe tela de revisão com campos extraídos', async () => {
    vi.spyOn(faturaRGEService, 'analisarFaturaRGEGemini').mockResolvedValueOnce({
      ok: true,
      data: {
        e_fatura_rge: true,
        titular_nome: 'DELFOS ENGENHARIA EIRELI',
        cpf_cnpj: '21.379.952/0001-38',
        uc: '200.419.001-19',
        classificacao_grupo_subgrupo: 'Convencional B3 Comercial',
        tipo_fornecimento: 'Trifásico',
        tensao_nominal: '220V',
        endereco_completo: {
          rua: 'R ESPIRITO SANTO',
          numero: '275',
          complemento: 'não informado na fatura',
          bairro: 'FATIMA',
          cidade: 'ERECHIM',
          estado: 'RS',
          cep: '99709-296',
        },
        historico_consumo: [
          { mes_ano: 'SET 26', consumo_kwh: 600, dias_ciclo: 30 },
          { mes_ano: 'AGO 26', consumo_kwh: 500, dias_ciclo: 30 },
        ],
        calculos: {
          somatorio_consumo_anual_kwh: 1100,
          media_mensal_consumo_kwh: 550,
          consumo_medio_diario_kwh: 18.33,
        },
      },
    })

    const onConfirmar = vi.fn()
    const { container } = render(
      <ModalImportarContaRGE isOpen={true} onClose={vi.fn()} onConfirmar={onConfirmar} />,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()

    const file = new File(['dummy-content'], 'conta_rge.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Deve avançar para a tela de revisão
    const confirmButton = await screen.findByRole('button', { name: /Confirmar e preencher/i })
    expect(confirmButton).toBeDefined()

    // Verifica se os campos preencheram os inputs editáveis
    expect(screen.getByDisplayValue('DELFOS ENGENHARIA EIRELI')).toBeDefined()
    expect(screen.getByDisplayValue('21.379.952/0001-38')).toBeDefined()
    expect(screen.getByDisplayValue('200.419.001-19')).toBeDefined()
    expect(screen.getByDisplayValue('550')).toBeDefined()

    // Clica em confirmar
    fireEvent.click(confirmButton)

    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'DELFOS ENGENHARIA EIRELI',
        cnpj: '21.379.952/0001-38',
        uc: '200.419.001-19',
        numero_uc: '200.419.001-19',
        tipo_fornecimento: 'Trifásico',
        consumo_kwh_mes: 550,
        consumo_medio: 550,
      }),
    )
  })
})

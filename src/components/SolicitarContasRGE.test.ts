import { describe, it, expect } from 'vitest'
import { calcularStatusPrazoRGE } from './PrazoRGEBadge'
import {
  gerarAssuntoContasRGE,
  gerarCorpoHtmlContasRGE,
  EMAIL_RGE_PADRAO,
} from '@/lib/emailContasRGETemplate'

describe('Solicitar Contas RGE - Prazos e Templates', () => {
  it('deve gerar assunto no padrão exato solicitado', () => {
    const assunto = gerarAssuntoContasRGE('1009845231', 'João Silva')
    expect(assunto).toBe('Solicitação de faturas de energia — UC 1009845231 — João Silva')
  })

  it('deve conter o texto obrigatório no corpo HTML', () => {
    const html = gerarCorpoHtmlContasRGE({
      numeroUc: '1009845231',
      enderecoUc: 'Rua das Flores, 123, Erechim/RS',
      nomeCliente: 'João Silva',
      documentoCliente: '123.456.789-00',
      nomeResponsavel: 'Daniel Rotava',
      cargoResponsavel: 'Engenheiro Responsável',
      telefoneDelfos: '(54) 99646-8910',
      emailDelfos: 'delfos.usinas@gmail.com',
    })

    expect(html).toContain(
      'Venho por meio deste solicitar o envio das faturas/contas de energia elétrica dos últimos 5 (cinco) anos',
    )
    expect(html).toContain('1009845231')
    expect(html).toContain('Rua das Flores, 123, Erechim/RS')
    expect(html).toContain('João Silva')
    expect(html).toContain('123.456.789-00')
    expect(html).toContain(
      'Segue em anexo a procuração/autorização e demais documentos necessários',
    )
    expect(html).toContain('Daniel Rotava')
    expect(html).toContain('Engenheiro Responsável')
    expect(html).toContain('Delfos Engenharia Ltda')
    expect(html).toContain('www.delfosengenharia.com.br')
  })

  it('deve calcular status de prazo vencido em vermelho (< 0 dias)', () => {
    const dPassada = new Date()
    dPassada.setDate(dPassada.getDate() - 3)
    const info = calcularStatusPrazoRGE(dPassada.toISOString())

    expect(info.status).toBe('prazo_vencido')
    expect(info.badgeClass).toContain('text-rose-800')
    expect(info.dotClass).toContain('bg-rose-500')
  })

  it('deve calcular status de prazo próximo em laranja (<= 2 dias)', () => {
    const dAmanha = new Date()
    dAmanha.setDate(dAmanha.getDate() + 1)
    const info = calcularStatusPrazoRGE(dAmanha.toISOString())

    expect(info.status).toBe('prazo_proximo')
    expect(info.badgeClass).toContain('text-orange-800')
    expect(info.dotClass).toContain('bg-orange-500')
  })

  it('deve calcular status em andamento em amarelo (> 2 dias)', () => {
    const dFutura = new Date()
    dFutura.setDate(dFutura.getDate() + 10)
    const info = calcularStatusPrazoRGE(dFutura.toISOString())

    expect(info.status).toBe('em_andamento')
    expect(info.badgeClass).toContain('text-amber-800')
    expect(info.dotClass).toContain('bg-amber-500')
  })

  it('deve tratar prazo ausente como em andamento (amarelo)', () => {
    const info = calcularStatusPrazoRGE(null)
    expect(info.status).toBe('sem_prazo')
    expect(info.badgeClass).toContain('text-amber-800')
  })
})

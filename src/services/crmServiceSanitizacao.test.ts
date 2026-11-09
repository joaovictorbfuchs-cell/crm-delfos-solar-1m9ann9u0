import { describe, it, expect } from 'vitest'
import { sanitizarPayloadUsina } from '@/services/crmService'

describe('sanitizarPayloadUsina (crmService)', () => {
  it('descarta campos inexistentes na coleção usinas e mantém os válidos', () => {
    const out = sanitizarPayloadUsina({
      numero_uc: '123',
      concessionaria: 'RGE',
      campo_inexistente: 'x',
      id: 'abc',
      expand: {},
    })
    expect(out.numero_uc).toBe('123')
    expect(out.concessionaria).toBe('RGE')
    expect(out.campo_inexistente).toBeUndefined()
    expect(out.id).toBeUndefined()
    expect(out.expand).toBeUndefined()
  })

  it('normaliza número com vírgula decimal ("1,5" → 1.5)', () => {
    const out = sanitizarPayloadUsina({ potencia_kwp: '1,5' })
    expect(out.potencia_kwp).toBe(1.5)
  })

  it('normaliza número com milhar e vírgula ("1.234,56" → 1234.56)', () => {
    const out = sanitizarPayloadUsina({ tarifa: '1.234,56' })
    expect(out.tarifa).toBe(1234.56)
  })

  it('descarta valor não numérico em campo numérico', () => {
    const out = sanitizarPayloadUsina({ potencia_kwp: 'n/a', nome: 'U' })
    expect(out.potencia_kwp).toBeUndefined()
    expect(out.nome).toBe('U')
  })

  it('arredonda inteiro (quantidade_placas)', () => {
    const out = sanitizarPayloadUsina({ quantidade_placas: 10.7 })
    expect(out.quantidade_placas).toBe(11)
  })

  it('converte select inválido normalizando acento ("aereo" → "aéreo")', () => {
    const out = sanitizarPayloadUsina({ tipo_atendimento: 'aereo' })
    expect(out.tipo_atendimento).toBe('aéreo')
  })

  it('descarta valor de select fora da lista (tipo_telhado "verde")', () => {
    const out = sanitizarPayloadUsina({ tipo_telhado: 'verde', nome: 'U' })
    expect(out.tipo_telhado).toBeUndefined()
    expect(out.nome).toBe('U')
  })

  it('converte relation vazia para null (contrato_id)', () => {
    const out = sanitizarPayloadUsina({ contrato_id: '' })
    expect(out.contrato_id).toBeNull()
  })

  it('converte data brasileira dd/mm/yyyy para ISO', () => {
    const out = sanitizarPayloadUsina({ data_instalacao: '15/03/2024' })
    expect(out.data_instalacao).toBe('2024-03-15')
  })

  it('mantém data ISO existente', () => {
    const out = sanitizarPayloadUsina({
      data_instalacao: '2024-03-15T10:00:00.000Z',
    })
    expect(out.data_instalacao).toBe('2024-03-15T10:00:00.000Z')
  })

  it('converte string vazia de campo numérico para null', () => {
    const out = sanitizarPayloadUsina({ geracao_media_mensal_kwh: '' })
    expect(out.geracao_media_mensal_kwh).toBeNull()
  })

  it('mantém campo bool (dados_atualizados) estrito', () => {
    const out = sanitizarPayloadUsina({ dados_atualizados: 'sim' })
    expect(out.dados_atualizados).toBe(true)
  })

  it('mantém json documentos_usina como array', () => {
    const json = [{ nome: 'a.pdf', id: 'x' }]
    const out = sanitizarPayloadUsina({ documentos_usina: json })
    expect(out.documentos_usina).toEqual(json)
  })

  it('descarta objeto em campo de texto', () => {
    const out = sanitizarPayloadUsina({ numero_medidor: { a: 1 } })
    expect(out.numero_medidor).toBeUndefined()
  })

  it('sanitizarPayloadCliente: descarta placeholder "Número não identificado pelo WhatsApp" e preserva 10 e 11 dígitos', async () => {
    const { sanitizarPayloadCliente } = await import('@/services/crmService')
    const out = sanitizarPayloadCliente({
      nome: 'Cliente Teste',
      telefone: 'Número não identificado pelo WhatsApp',
      whatsapp: '(54) 99999-0000',
    })
    expect(out.telefone).toBe('')
    expect(out.whatsapp).toBe('(54) 99999-0000')

    const outFixo = sanitizarPayloadCliente({
      nome: 'Cliente Fixo',
      telefone: '(54) 3522-0000',
      whatsapp: 'Número não identificado pelo WhatsApp',
    })
    expect(outFixo.telefone).toBe('(54) 3522-0000')
    expect(outFixo.whatsapp).toBe('')
  })
})

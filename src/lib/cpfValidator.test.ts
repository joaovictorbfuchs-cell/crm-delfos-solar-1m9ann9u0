import { describe, it, expect } from 'vitest'
import { formatarCPF, formatarCpfCnpj, limparCPF, validarCPF } from './cpfValidator'

describe('cpfValidator & formatarCpfCnpj', () => {
  it('limparCPF deve remover caracteres não numéricos', () => {
    expect(limparCPF('123.456.789-00')).toBe('12345678900')
    expect(limparCPF('12.345.678/0001-90')).toBe('12345678000190')
    expect(limparCPF('')).toBe('')
    expect(limparCPF(null)).toBe('')
    expect(limparCPF(undefined)).toBe('')
  })

  it('formatarCPF deve aplicar máscara de CPF até 11 dígitos', () => {
    expect(formatarCPF('61326080000')).toBe('613.260.800-00')
    expect(formatarCPF('613')).toBe('613')
    expect(formatarCPF('6132')).toBe('613.2')
    expect(formatarCPF('6132608')).toBe('613.260.8')
    expect(formatarCPF('6132608000')).toBe('613.260.800-0')
  })

  it('validarCPF deve validar dígitos verificadores corretamente', () => {
    expect(validarCPF('11111111111')).toBe(false)
    expect(validarCPF('12345678900')).toBe(false)
    // CPF com dígito correto gerado por algoritmo
    // 52998224725 é um CPF válido para testes
    expect(validarCPF('52998224725')).toBe(true)
  })

  describe('formatarCpfCnpj - máscara dinâmica conforme número de dígitos', () => {
    it('deve retornar string vazia para entrada vazia ou nula', () => {
      expect(formatarCpfCnpj('')).toBe('')
      expect(formatarCpfCnpj(null)).toBe('')
      expect(formatarCpfCnpj(undefined)).toBe('')
      expect(formatarCpfCnpj('   ')).toBe('')
    })

    it('deve aplicar máscara de CPF progressiva até 11 dígitos', () => {
      expect(formatarCpfCnpj('6')).toBe('6')
      expect(formatarCpfCnpj('61')).toBe('61')
      expect(formatarCpfCnpj('613')).toBe('613')
      expect(formatarCpfCnpj('6132')).toBe('613.2')
      expect(formatarCpfCnpj('613260')).toBe('613.260')
      expect(formatarCpfCnpj('6132608')).toBe('613.260.8')
      expect(formatarCpfCnpj('613260800')).toBe('613.260.800')
      expect(formatarCpfCnpj('6132608000')).toBe('613.260.800-0')
      expect(formatarCpfCnpj('61326080000')).toBe('613.260.800-00')
    })

    it('deve alternar imediatamente para CNPJ a partir do 12º dígito', () => {
      // 11 dígitos: CPF -> 613.260.800-00
      // 12 dígitos: vira CNPJ -> 61.326.080/0000
      expect(formatarCpfCnpj('613260800001')).toBe('61.326.080/0000-1')
      expect(formatarCpfCnpj('6132608000019')).toBe('61.326.080/0000-19')
      // 14 dígitos completo: CNPJ -> 12.345.678/0001-90
      expect(formatarCpfCnpj('12345678000190')).toBe('12.345.678/0001-90')
    })

    it('não deve ultrapassar 14 dígitos (trunca entradas maiores)', () => {
      expect(formatarCpfCnpj('12345678000190999')).toBe('12.345.678/0001-90')
    })

    it('deve aceitar entrada colada com pontuação existente e normalizar corretamente', () => {
      // CPF colado com pontuação
      expect(formatarCpfCnpj('613.260.800-00')).toBe('613.260.800-00')
      // CNPJ colado com pontuação
      expect(formatarCpfCnpj('12.345.678/0001-90')).toBe('12.345.678/0001-90')
      // CPF colado com caracteres extras/espaços
      expect(formatarCpfCnpj('  613.260.800-00  ')).toBe('613.260.800-00')
      // CNPJ colado bagunçado
      expect(formatarCpfCnpj('CNPJ: 12.345.678/0001-90')).toBe('12.345.678/0001-90')
    })

    it('deve transformar dinamicamente quando o usuário digita mais dígitos sobre um CPF formatado', () => {
      const cpfFormatado = '613.260.800-00'
      // O usuário digita mais um dígito '1' no final
      const inputUsuario = `${cpfFormatado}1`
      expect(formatarCpfCnpj(inputUsuario)).toBe('61.326.080/0000-1')
    })
  })
})

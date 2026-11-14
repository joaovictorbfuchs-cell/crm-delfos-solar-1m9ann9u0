import { describe, expect, it } from 'vitest'
import {
  construirPlanoImportacao,
  normalizarUc,
  parsePercentualPlanilha,
  type BeneficiariaLike,
  type CredencialLike,
} from './importacaoBeneficiarias'
import { parseCsvString } from './spreadsheetParser'

const HEADERS = [
  'Tela',
  'Usina (Geradora)',
  'Tipo',
  'Unidade / Endereço',
  'Nº da UC',
  'Distribuição (%)',
]

function tabelaCsv(conteudo: string) {
  return parseCsvString(conteudo)
}

function csvLinha(cells: string[]): string {
  return cells
    .map((c) => (c.includes(';') || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c))
    .join(';')
}

const CRED_A: CredencialLike = { id: 'cred-a', uc: '123', rotulo: 'Usina A' }
const CRED_B: CredencialLike = { id: 'cred-b', uc: '456', rotulo: 'Usina B' }
const CRED_CPF: CredencialLike = { id: 'cred-cpf', uc: '77894600178', rotulo: 'Usina CPF' }

describe('normalizarUc', () => {
  it('mantém apenas dígitos', () => {
    expect(normalizarUc('778.946.001-78')).toBe('77894600178')
    expect(normalizarUc(' 3.064-805 ')).toBe('3064805')
    expect(normalizarUc('(não informada)')).toBe('')
  })
})

describe('parsePercentualPlanilha', () => {
  it('fração <= 1 mantém o valor como está (0.1 = 10%, 0.05 = 5%)', () => {
    expect(parsePercentualPlanilha(0.1)).toBeCloseTo(0.1)
    expect(parsePercentualPlanilha(0.05)).toBeCloseTo(0.05)
    expect(parsePercentualPlanilha('0,05')).toBeCloseTo(0.05)
    expect(parsePercentualPlanilha(0.9)).toBeCloseTo(0.9)
    aguardar
    expect(parsePercentualPlanilha(1)).toBeCloseTo(1)
  })

  it('valor > 1 é percentual e é dividido por 100 (10 = 10%, 2.5 = 2.5%)', () => {
    expect(parsePercentualPlanilha(10)).toBeCloseTo(0.1)
    expect(parsePercentualPlanilha(2.5)).toBeCloseTo(0.025)
    expect(parsePercentualPlanilha(15)).toBeCloseTo(0.15)
  })

  it('texto com sufixo % é tratado como percentual ("10%" = 0.10)', () => {
    expect(parsePercentualPlanilha('10%')).toBeCloseTo(0.1)
    expect(parsePercentualPlanilha('15%')).toBeCloseTo(0.15)
  })
})

describe('construirPlanoImportacao', () => {
  it('ignora UC vazia e (não informada), contando como ignorada', () => {
    const csv = [
      csvLinha(HEADERS),
      csvLinha(['Tela 1', 'Usina A', 'Geradora', 'Usina A', '123', '0']),
      csvLinha(['Tela 1', 'Usina A', 'Beneficiária', 'Benef sem UC', '', '0,5']),
      csvLinha([
        'Tela 1',
        'Usina A',
        'Beneficiária',
        'Benef não informada',
        '(não informada)',
        '0,5',
      ]),
      csvLinha(['Tela 1', 'Usina A', 'Beneficiária', 'Benef ok', '999', '0,5']),
    ].join('\n')
    const plano = construirPlanoImportacao(tabelaCsv(csv), [CRED_A], [])
    expect(plano.ignoradas).toBe(2)
    expect(plano.itensParaImportar).toBe(1)
    expect(plano.ignoradasDetalhe.join(' ')).toContain('UC inválida')
  })

  it('normaliza UC com pontuação (CPF colado na coluna UC) e grava só dígitos', () => {
    const csv = [
      csvLinha(HEADERS),
      csvLinha(['Tela 1', 'Usina CPF', 'Geradora', 'Usina CPF', '778.946.001-78', '0']),
      csvLinha(['Tela 1', 'Usina CPF', 'Beneficiária', 'Fulano', '3.064.805.001-60', '1']),
    ].join('\n')
    const plano = construirPlanoImportacao(tabelaCsv(csv), [CRED_CPF], [])
    expect(plano.usinas[0]?.credencialId).toBe('cred-cpf')
    expect(plano.usinas[0]?.itens[0]?.uc).toBe('306480500160')
    expect(plano.itensParaImportar).toBe(1)
  })

  it('marca como já cadastrada quando credencial_id+uc já existe', () => {
    const jaExiste: BeneficiariaLike = {
      id: 'b1',
      credencial_id: 'cred-a',
      uc: '999',
      ativo: true,
    }
    const csv = [
      csvLinha(HEADERS),
      csvLinha(['Tela 1', 'Usina A', 'Geradora', 'Usina A', '123', '0']),
      csvLinha(['Tela 1', 'Usina A', 'Beneficiária', 'Já existe', '999', '0,5']),
      csvLinha(['Tela 1', 'Usina A', 'Beneficiária', 'Nova', '888', '0,5']),
    ].join('\n')
    const plano = construirPlanoImportacao(tabelaCsv(csv), [CRED_A], [jaExiste])
    expect(plano.jaCadastradas).toBe(1)
    expect(plano.itensParaImportar).toBe(1)
  })

  it('reporta duplicata dentro do arquivo e mantém a primeira', () => {
    const csv = [
      csvLinha(HEADERS),
      csvLinha(['Tela 4', 'Usina A', 'Geradora', 'Usina A', '123', '0']),
      csvLinha(['Tela 4', 'Usina A', 'Beneficiária', 'Primeira', '3081574448', '1']),
      csvLinha(['Tela 4', 'Usina A', 'Beneficiária', 'Segunda', '3081574448', '1']),
    ].join('\n')
    const plano = construirPlanoImportacao(tabelaCsv(csv), [CRED_A], [])
    expect(plano.duplicatas).toBe(1)
    expect(plano.itensParaImportar).toBe(1)
    expect(plano.ignoradasDetalhe.join(' ')).toContain('repetida na planilha')
  })

  it('geradora com UC inválida tenta casar credencial pelo rótulo, senão marca sem credencial', () => {
    const csv = [
      csvLinha(HEADERS),
      csvLinha(['Tela 4', 'Igreja sem UC', 'Geradora', 'Igreja sem UC', '(não informada)', '0']),
      csvLinha(['Tela 4', 'Igreja sem UC', 'Beneficiária', 'Sede', '3081576320', '0,6']),
    ].join('\n')
    const semCredencial = construirPlanoImportacao(tabelaCsv(csv), [CRED_A], [])
    expect(semCredencial.usinas[0]?.credencialId).toBeNull()
    expect(semCredencial.usinas[0]?.itens[0]?.status).toBe('sem_credencial')
    expect(semCredencial.itensParaImportar).toBe(0)
    expect(semCredencial.avisos.join(' ')).toContain('falta de credencial')

    const credPorNome: CredencialLike = { id: 'cred-nome', uc: '', rotulo: 'Igreja sem UC' }
    const comCredencial = construirPlanoImportacao(tabelaCsv(csv), [credPorNome], [])
    expect(comCredencial.usinas[0]?.credencialId).toBe('cred-nome')
    expect(comCredencial.itensParaImportar).toBe(1)
  })

  it('nova geradora com UC inexistente é marcada para criação de credencial', () => {
    const csv = [
      csvLinha(HEADERS),
      csvLinha(['Tela 1', 'Usina Nova', 'Geradora', 'Usina Nova', '321', '0']),
      csvLinha(['Tela 1', 'Usina Nova', 'Beneficiária', 'Casa', '654', '1']),
    ].join('\n')
    const plano = construirPlanoImportacao(tabelaCsv(csv), [CRED_A], [])
    expect(plano.usinas[0]?.credencialNova).toBe(true)
    expect(plano.itensParaImportar).toBe(1)
  })

  it('nova linha Geradora troca o contexto das beneficiárias seguintes', () => {
    const csv = [
      csvLinha(HEADERS),
      csvLinha(['Tela 1', 'Usina A', 'Geradora', 'Usina A', '123', '0']),
      csvLinha(['Tela 1', 'Usina A', 'Beneficiária', 'De A', '111', '0,5']),
      csvLinha(['Tela 2', 'Usina B', 'Geradora', 'Usina B', '456', '0']),
      csvLinha(['Tela 2', 'Usina B', 'Beneficiária', 'De B', '222', '0,5']),
    ].join('\n')
    const plano = construirPlanoImportacao(tabelaCsv(csv), [CRED_A, CRED_B], [])
    expect(plano.usinas).toHaveLength(2)
    expect(plano.usinas[0]?.itens[0]?.uc).toBe('111')
    expect(plano.usinas[1]?.itens[0]?.uc).toBe('222')
    expect(plano.itensParaImportar).toBe(2)
  })
})

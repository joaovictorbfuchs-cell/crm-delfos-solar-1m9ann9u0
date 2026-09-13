import { describe, it, expect } from 'vitest'
import {
  limparNomeClienteParaMatching,
  normalizarStringParaComparacao,
  calcularSimilaridadeDice,
  casarClienteComBase,
  mapearTipoAcessoParaMarca,
  detectarCabecalhoAcessos,
} from './importacaoAcessosService'
import type { Cliente, MonitoramentoMarca } from '@/types/crm'

// Dados 100% fictícios para testes unitários (REGRA: jamais dados reais da planilha)
const mockClienteFicticio = (partial: Partial<Cliente> & { id: string; nome: string }): Cliente => {
  return {
    collectionId: 'pbc_clientes',
    collectionName: 'clientes',
    telefone: '',
    endereco: '',
    uc: '',
    cidade: 'Erechim',
    potencia_kwp: 5,
    valor_estimado: 25000,
    status: 'Fechado',
    data_instalacao: '',
    inversor_marca: '',
    inversor_modelo: '',
    placas_qtd: 0,
    placas_marca: '',
    telhado_tipo: 'ceramico',
    produto: 'Energia Solar',
    created: '2026-09-10',
    updated: '2026-09-10',
    ...partial,
  }
}

describe('importacaoAcessosService - Normalização e Matching de Nomes', () => {
  it('deve limpar sufixos corporativos e termos entre parênteses corretamente', () => {
    // Nomes sintéticos de teste
    expect(limparNomeClienteParaMatching('Metalúrgica Alvorada LTDA (Ampliação)')).toBe(
      'Metalúrgica Alvorada',
    )
    expect(limparNomeClienteParaMatching('Padaria Sol Nascente ME (Usina)')).toBe(
      'Padaria Sol Nascente',
    )
    expect(limparNomeClienteParaMatching('Granja São Bento EIRELI (Aviário)')).toBe(
      'Granja São Bento',
    )
    expect(limparNomeClienteParaMatching('Fazenda Boa Esperança (Casa)')).toBe(
      'Fazenda Boa Esperança',
    )
    expect(limparNomeClienteParaMatching('Posto Petrovale S/A (inversor novo)')).toBe(
      'Posto Petrovale',
    )
    expect(limparNomeClienteParaMatching('Cooperativa Agro Vale (Nome Conjunto)')).toBe(
      'Cooperativa Agro Vale',
    )
    expect(limparNomeClienteParaMatching('Comércio de Grãos Modelo - Usina 02')).toBe(
      'Comércio de Grãos Modelo',
    )
    expect(limparNomeClienteParaMatching('Mercado Progresso 75K')).toBe('Mercado Progresso')
  })

  it('deve normalizar acentos, caixa alta e pontuações', () => {
    expect(normalizarStringParaComparacao('  INDÚSTRIA & COMÉRCIO SÃO JOÃO  ')).toBe(
      'industria comercio sao joao',
    )
    expect(normalizarStringParaComparacao('Éderli Bêcker')).toBe('ederli becker')
  })

  it('deve calcular similaridade alta para nomes grafados com pequenas variações', () => {
    const score = calcularSimilaridadeDice('Clenir Dal Agnol', 'Elenir Fatima Dalbosco Dal Agnol')
    expect(score).toBeGreaterThan(0.6)

    const scoreExato = calcularSimilaridadeDice('Carlos Eduardo Souza', 'Carlos Eduardo Souza')
    expect(scoreExato).toBe(1)
  })

  it('deve casar cliente por e-mail com alta confiança', () => {
    const clientesBase: Cliente[] = [
      mockClienteFicticio({
        id: 'cli_ficticio_1',
        nome: 'Cervejaria Artesanal Aurora',
        email: 'cervejaria.teste@ficticio.com.br',
      }),
    ]

    const resultado = casarClienteComBase('cervejaria.teste@ficticio.com.br', clientesBase)
    expect(resultado.clienteId).toBe('cli_ficticio_1')
    expect(resultado.confianca).toBe('alta')
    expect(resultado.scoreSimilaridade).toBe(1)
  })

  it('deve casar cliente por nome normalizado mesmo com sufixos e anotações na planilha', () => {
    const clientesBase: Cliente[] = [
      mockClienteFicticio({
        id: 'cli_ficticio_2',
        nome: 'Supermercado Nova Era LTDA',
      }),
      mockClienteFicticio({
        id: 'cli_ficticio_3',
        nome: 'João da Silva Sauro',
      }),
    ]

    // Planilha traz com anotações extras e sem LTDA
    const res1 = casarClienteComBase('Supermercado Nova Era (Ampliação)', clientesBase)
    expect(res1.clienteId).toBe('cli_ficticio_2')
    expect(res1.confianca).toMatch(/alta|media/)

    const res2 = casarClienteComBase('JOAO DA SILVA SAURO', clientesBase)
    expect(res2.clienteId).toBe('cli_ficticio_3')
    expect(res2.confianca).toBe('alta')
  })

  it('deve retornar confianca nenhuma quando cliente não existe na base', () => {
    const clientesBase: Cliente[] = [
      mockClienteFicticio({
        id: 'cli_ficticio_4',
        nome: 'Móveis Rústicos Pinheiro',
      }),
    ]

    const resultado = casarClienteComBase('Farmácia Saúde Total Não Cadastrada', clientesBase)
    expect(resultado.clienteId).toBeNull()
    expect(resultado.confianca).toBe('nenhuma')
  })
})

describe('importacaoAcessosService - Mapeamento de TIPO DE ACESSO para Marcas', () => {
  const marcasCadastradas: MonitoramentoMarca[] = [
    {
      id: 'mm_1',
      collectionId: 'pbc_marcas',
      collectionName: 'monitoramento_marcas',
      marca: 'SolarEdge',
      app_nome: 'mySolarEdge',
      created: '',
      updated: '',
    },
  ]

  it('deve mapear Growatt e ShinePhone para Growatt', () => {
    const res1 = mapearTipoAcessoParaMarca('Growatt', marcasCadastradas)
    expect(res1.marcaIdentificada).toBe('Growatt')
    expect(res1.appNomeSugerido).toBe('ShinePhone')

    const res2 = mapearTipoAcessoParaMarca('ShinePhone', marcasCadastradas)
    expect(res2.marcaIdentificada).toBe('Growatt')
  })

  it('deve mapear Solarman e suas variações', () => {
    const res1 = mapearTipoAcessoParaMarca('SolarMAN', marcasCadastradas)
    expect(res1.marcaIdentificada).toBe('Solarman')

    const res2 = mapearTipoAcessoParaMarca('Solarman busines - Smart', marcasCadastradas)
    expect(res2.marcaIdentificada).toBe('Solarman')

    const res3 = mapearTipoAcessoParaMarca('Solarman 2', marcasCadastradas)
    expect(res3.marcaIdentificada).toBe('Solarman')
  })

  it('deve mapear Solis, SolisCloud e SloisCloud', () => {
    const res1 = mapearTipoAcessoParaMarca('Solis', marcasCadastradas)
    expect(res1.marcaIdentificada).toBe('Solis')

    const res2 = mapearTipoAcessoParaMarca('SolisCloud', marcasCadastradas)
    expect(res2.marcaIdentificada).toBe('Solis')

    const res3 = mapearTipoAcessoParaMarca('SloisCloud', marcasCadastradas)
    expect(res3.marcaIdentificada).toBe('Solis')
  })

  it('deve mapear Goodwe e SEMS Portal', () => {
    const res1 = mapearTipoAcessoParaMarca('Goodwe', marcasCadastradas)
    expect(res1.marcaIdentificada).toBe('Goodwe')

    const res2 = mapearTipoAcessoParaMarca('SEMS Portal', marcasCadastradas)
    expect(res2.marcaIdentificada).toBe('Goodwe')

    const res3 = mapearTipoAcessoParaMarca('Goodwe - semsportal.com', marcasCadastradas)
    expect(res3.marcaIdentificada).toBe('Goodwe')
  })

  it('deve mapear CSI Cloud, Canadian Solar e variações', () => {
    const res1 = mapearTipoAcessoParaMarca('CSI CLOUD', marcasCadastradas)
    expect(res1.marcaIdentificada).toBe('CSI')

    const res2 = mapearTipoAcessoParaMarca('Canadian', marcasCadastradas)
    expect(res2.marcaIdentificada).toBe('CSI')

    const res3 = mapearTipoAcessoParaMarca('GINLONG MONITORING (CSI)', marcasCadastradas)
    expect(res3.marcaIdentificada).toBe('CSI')
  })

  it('deve mapear WiseSolarPlus e Wise Solar Plus', () => {
    const res = mapearTipoAcessoParaMarca('WiseSolarPlus', marcasCadastradas)
    expect(res.marcaIdentificada).toBe('WiseSolar')
  })

  it('deve mapear Fronius e Solarweb', () => {
    const res1 = mapearTipoAcessoParaMarca('Fronius', marcasCadastradas)
    expect(res1.marcaIdentificada).toBe('Fronius')

    const res2 = mapearTipoAcessoParaMarca('SOLARWEB', marcasCadastradas)
    expect(res2.marcaIdentificada).toBe('Fronius')
  })

  it('deve mapear Sungrow e Isolarcloud', () => {
    const res1 = mapearTipoAcessoParaMarca('Sungrow', marcasCadastradas)
    expect(res1.marcaIdentificada).toBe('Sungrow')

    const res2 = mapearTipoAcessoParaMarca('Isolarcloud - Sungrow', marcasCadastradas)
    expect(res2.marcaIdentificada).toBe('Sungrow')
  })

  it('deve mapear SMA, ABB, Hoymiles e Renovigi', () => {
    expect(mapearTipoAcessoParaMarca('SMA').marcaIdentificada).toBe('SMA')
    expect(mapearTipoAcessoParaMarca('ABB').marcaIdentificada).toBe('ABB')
    expect(mapearTipoAcessoParaMarca('Hoymiles').marcaIdentificada).toBe('Hoymiles')
    expect(mapearTipoAcessoParaMarca('Renovigi portal').marcaIdentificada).toBe('Renovigi')
    expect(mapearTipoAcessoParaMarca('Renovigi.solar').marcaIdentificada).toBe('Renovigi')
  })

  it('deve deixar tipo desconhecido como texto livre sem quebrar', () => {
    const res = mapearTipoAcessoParaMarca('Inversor Experimental Customizado XYZ')
    expect(res.marcaIdentificada).toBe('Inversor Experimental Customizado XYZ')
    expect(res.ehDesconhecida).toBe(true)
  })
})

describe('importacaoAcessosService - Detecção de Cabeçalho', () => {
  it('deve detectar colunas da planilha de acessos com tolerância a caixa e espaços', () => {
    const headers = [
      'CLIENTE',
      'TIPO DE ACESSO',
      'Login',
      'SENHA',
      'link de acesso',
      'Login',
      'Senha',
    ]
    const detectado = detectarCabecalhoAcessos(headers)

    expect(detectado).not.toBeNull()
    expect(detectado?.clienteCol).toBe('CLIENTE')
    expect(detectado?.tipoAcessoCol).toBe('TIPO DE ACESSO')
    expect(detectado?.loginCol).toBe('Login')
    expect(detectado?.senhaCol).toBe('SENHA')
    expect(detectado?.linkCol).toBe('link de acesso')
  })
})

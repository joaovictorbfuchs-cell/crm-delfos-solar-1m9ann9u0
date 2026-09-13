import { describe, it, expect } from 'vitest'
import {
  normalizarDadosContrato,
  numeroParaExtensoEmReais,
  formatarDataExtenso,
  getAnexoIPlanoConteudo,
  getAnexoIIServicos,
  gerarHTMLContratoOM,
  gerarPDFBinarioContrato,
  DADOS_FIXOS_CONTRATADA_CONTRATO,
  SERVICOS_ADICIONAIS_PADRAO,
} from './contratoGenerator'

describe('contratoGenerator - Contrato de Prestação de Serviços O&M Delfos Solar', () => {
  const dadosExemploMarcelo = {
    nomeRazaoSocial: 'Marcelo Becker Agropecuária',
    cpfCnpj: '412.589.630-18',
    enderecoInstalacao: 'Linha São João, Km 12, Zona Rural',
    municipio: 'Passo Fundo/RS',
    telefone: '(54) 99712-8844',
    email: 'marcelo.becker@fazenda3palmeiras.com.br',
    numeroModulos: 64,
    marcaInversores: 'Growatt MAX 30KTL3-X LV',
    localInstalacao: 'Telhado',
    planoSelecionado: 'Essencial' as const,
    valorTotal: 2280,
    valorMensal: 190,
  }

  const dadosExemploMaria = {
    nomeRazaoSocial: 'Maria Santos Comercio de Alimentos LTDA',
    cpfCnpj: '14.283.945/0001-82',
    enderecoInstalacao: 'Rua Itália, nº 450, Centro',
    municipio: 'Erechim/RS',
    telefone: '(54) 99812-3456',
    email: 'contato@mercadosantos.com.br',
    numeroModulos: 30,
    marcaInversores: 'Fronius Symo 12.0-3-M',
    localInstalacao: 'Telhado',
    planoSelecionado: 'Prevenção' as const,
    valorTotal: 5400,
    valorMensal: 450,
  }

  it('deve conter os dados fixos exatos da contratada DELFOS ENGENHARIA LTDA', () => {
    expect(DADOS_FIXOS_CONTRATADA_CONTRATO.razaoSocial).toBe('DELFOS ENGENHARIA LTDA')
    expect(DADOS_FIXOS_CONTRATADA_CONTRATO.cnpj).toBe('21.379.952/0001-38')
    expect(DADOS_FIXOS_CONTRATADA_CONTRATO.endereco).toBe(
      'Rua Espírito Santo, nº 275, Centro, Erechim/RS, CEP 99709-296',
    )
    expect(DADOS_FIXOS_CONTRATADA_CONTRATO.representanteNome).toBe('João Victor Bagetti Fuchs')
    expect(DADOS_FIXOS_CONTRATADA_CONTRATO.representanteCargo).toBe('engenheiro eletricista')
    expect(DADOS_FIXOS_CONTRATADA_CONTRATO.representanteCpf).toBe('811.562.780-15')
    expect(DADOS_FIXOS_CONTRATADA_CONTRATO.cidadeSede).toBe('Erechim')
  })

  it('deve converter números em valores por extenso em reais com precisão', () => {
    expect(numeroParaExtensoEmReais(190)).toBe('cento e noventa reais')
    expect(numeroParaExtensoEmReais(2280)).toBe('dois mil e duzentos e oitenta reais')
    expect(numeroParaExtensoEmReais(450)).toBe('quatrocentos e cinquenta reais')
    expect(numeroParaExtensoEmReais(5400)).toBe('cinco mil e quatrocentos reais')
    expect(numeroParaExtensoEmReais(1450)).toBe('um mil e quatrocentos e cinquenta reais')
  })

  it('deve formatar data por extenso em português', () => {
    const dataFixa = new Date(2026, 8, 14) // 14 de setembro de 2026
    expect(formatarDataExtenso(dataFixa)).toBe('14 de setembro de 2026')
  })

  it('deve montar o Anexo I renderizando apenas os 6 itens do Plano Essencial', () => {
    const anexoEssencial = getAnexoIPlanoConteudo('Essencial')
    expect(anexoEssencial.titulo).toBe('ANEXO I – PLANO ESSENCIAL')
    expect(anexoEssencial.itens).toHaveLength(6)
    expect(anexoEssencial.itens[0].titulo).toContain('Aplicativo Premium')
    expect(anexoEssencial.itens[1].titulo).toContain(
      'Monitoramento da geração em horários comerciais',
    )
    expect(anexoEssencial.itens[2].titulo).toContain('Relatório mensal de desempenho')
    expect(anexoEssencial.itens[3].titulo).toContain('Suporte técnico especializado')
    expect(anexoEssencial.itens[4].titulo).toContain('Intermediação com a RGE')
    expect(anexoEssencial.itens[5].titulo).toContain('Configuração e suporte remoto')
  })

  it('deve montar o Anexo I renderizando os 9 itens do Plano Prevenção', () => {
    const anexoPrevencao = getAnexoIPlanoConteudo('Prevenção')
    expect(anexoPrevencao.titulo).toBe('ANEXO I – PLANO PREVENÇÃO')
    expect(anexoPrevencao.itens).toHaveLength(9)
    expect(anexoPrevencao.itens[6].titulo).toContain('Inspeção preventiva anual')
    expect(anexoPrevencao.itens[7].titulo).toContain('Reaperto de conexões e grampos')
    expect(anexoPrevencao.itens[8].titulo).toContain('Verificação de desempenho')
  })

  it('deve montar o Anexo I renderizando os 10 itens do Plano Completo', () => {
    const anexoCompleto = getAnexoIPlanoConteudo('Completo')
    expect(anexoCompleto.titulo).toBe('ANEXO I – PLANO COMPLETO')
    expect(anexoCompleto.itens).toHaveLength(10)
    expect(anexoCompleto.itens[9].titulo).toContain('Limpeza de placas solares 2x/ano')
  })

  it('deve montar o Anexo II com os 12 serviços adicionais completos', () => {
    const servicos = getAnexoIIServicos(SERVICOS_ADICIONAIS_PADRAO)
    expect(servicos).toHaveLength(12)
    expect(servicos[0].servico).toBe('Diagnóstico Técnico')
    expect(servicos[0].horaAdicional).toBe('R$ 150,00')
    expect(servicos[1].servico).toBe('Manutenção Corretiva')
    expect(servicos[2].servico).toBe('Inspeção Termográfica e Relatório')
    expect(servicos[4].servico).toBe('Limpeza de Painéis Solares')
    expect(servicos[11].servico).toBe('Manutenção de Ativos e Medição')
  })

  it('deve gerar o HTML oficial do contrato com o texto integral e merge fields para Marcelo Becker (Essencial)', () => {
    const html = gerarHTMLContratoOM(dadosExemploMarcelo)

    expect(html).toContain('CONTRATO DE PRESTAÇÃO DE SERVIÇOS')
    expect(html).toContain(
      'Acompanhamento, Análise de Performance e Manutenção de Gerador Fotovoltaico',
    )
    expect(html).toContain('DELFOS ENGENHARIA LTDA')
    expect(html).toContain('21.379.952/0001-38')
    expect(html).toContain('João Victor Bagetti Fuchs')
    expect(html).toContain('811.562.780-15')
    expect(html).toContain('Marcelo Becker Agropecuária')
    expect(html).toContain('412.589.630-18')
    expect(html).toContain('64 painéis')
    expect(html).toContain('Growatt MAX 30KTL3-X LV')
    expect(html).toContain('PLANO CONTRATADO: Essencial')
    expect(html).toContain('CLÁUSULA 1ª – OBJETO')
    expect(html).toContain('CLÁUSULA 5ª – VALOR E CONDIÇÕES DE PAGAMENTO')
    expect(html).toContain('CLÁUSULA 13ª – FORO')
    expect(html).toContain('Comarca de Erechim/RS')
    expect(html).toContain('ANEXO I – PLANO ESSENCIAL')
    expect(html).not.toContain('ANEXO I – PLANO PREVENÇÃO')
    expect(html).toContain('ANEXO II – TABELA INTEGRADA DE SERVIÇOS ADICIONAIS')
  })

  it('deve gerar o HTML oficial do contrato para Maria Santos (Prevenção)', () => {
    const html = gerarHTMLContratoOM(dadosExemploMaria)

    expect(html).toContain('Maria Santos Comercio de Alimentos LTDA')
    expect(html).toContain('14.283.945/0001-82')
    expect(html).toContain('30 painéis')
    expect(html).toContain('Fronius Symo 12.0-3-M')
    expect(html).toContain('PLANO CONTRATADO: Prevenção')
    expect(html).toContain('ANEXO I – PLANO PREVENÇÃO')
    expect(html).not.toContain('ANEXO I – PLANO COMPLETO')
    expect(html).toContain('Inspeção preventiva anual')
  })

  it('deve gerar PDF binário nativo multi-página válido para o Contrato O&M', () => {
    const pdfBytes = gerarPDFBinarioContrato(dadosExemploMarcelo)
    expect(pdfBytes).toBeInstanceOf(Uint8Array)
    expect(pdfBytes.length).toBeGreaterThan(1500)

    const pdfString = new TextDecoder().decode(pdfBytes.slice(0, 50))
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true)
  })
})

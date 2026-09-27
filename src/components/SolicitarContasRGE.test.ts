import { describe, it, expect, vi } from 'vitest'
import {
  EMAIL_RGE_PADRAO,
  DELFOS_TELEFONE_PADRAO,
  DELFOS_EMAIL_PADRAO,
  ASSUNTO_RGE_ORIGINAL,
  CORPO_TEXTO_RGE_ORIGINAL,
  RGE_PLACEHOLDERS,
  gerarAssuntoContasRGE,
  gerarCorpoHtmlContasRGE,
  resolverPlaceholdersContasRGE,
  converterTextoEmHtmlContasRGE,
  carregarTemplatePadraoContasRGE,
  salvarTemplatePadraoContasRGE,
  restaurarTemplatePadraoContasRGE,
} from '@/lib/emailContasRGETemplate'
import { pb } from '@/lib/pocketbase/client'

describe('Módulo de Template de Solicitação de Contas RGE', () => {
  it('exporta constantes obrigatórias do processo RGE', () => {
    expect(EMAIL_RGE_PADRAO).toBe('atendimentocomercialrge@cpfl.com.br')
    expect(DELFOS_TELEFONE_PADRAO).toBe('(54) 99646-8910')
    expect(DELFOS_EMAIL_PADRAO).toBe('delfos.usinas@gmail.com')
    expect(ASSUNTO_RGE_ORIGINAL).toContain('Solicitação de faturas de energia')
    expect(CORPO_TEXTO_RGE_ORIGINAL).toContain('[número da UC]')
    expect(CORPO_TEXTO_RGE_ORIGINAL).toContain('[nome do cliente]')
    expect(RGE_PLACEHOLDERS.length).toBeGreaterThanOrEqual(6)
  })

  it('gera assunto com número da UC e nome do cliente padrão', () => {
    const assunto = gerarAssuntoContasRGE('1009845231', 'João Silva')
    expect(assunto).toBe('Solicitação de faturas de energia — UC 1009845231 — João Silva')
  })

  it('permite assunto customizado com placeholders', () => {
    const customTemplate =
      'URGENTE: Contas dos últimos 5 anos [número da UC] do titular [nome do cliente]'
    const assunto = gerarAssuntoContasRGE('998877', 'Maria Souza', customTemplate)
    expect(assunto).toBe('URGENTE: Contas dos últimos 5 anos 998877 do titular Maria Souza')
  })

  it('resolve placeholders em texto customizado', () => {
    const templateTexto =
      'Olá RGE, favor emitir extrato da UC [número da UC] do cliente [nome do cliente] CPF [CPF/CNPJ] em [endereço da UC].'

    const resolvido = resolverPlaceholdersContasRGE(templateTexto, {
      numeroUc: '1234567',
      nomeCliente: 'Empresa ABC',
      documentoCliente: '12.345.678/0001-90',
      enderecoUc: 'Av Brasil 500',
      nomeResponsavel: 'Daniel Rotava',
    })

    expect(resolvido).toContain('UC 1234567')
    expect(resolvido).toContain('Empresa ABC')
    expect(resolvido).toContain('12.345.678/0001-90')
    expect(resolvido).toContain('Av Brasil 500')
  })

  it('converte texto customizado em HTML completo com cabeçalho e assinatura', () => {
    const html = converterTextoEmHtmlContasRGE(
      'Mensagem de teste para concessionária referente às faturas.',
      'Carlos Engenheiro',
      'Diretor Técnico',
    )

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Mensagem de teste para concessionária')
    expect(html).toContain('Carlos Engenheiro')
    expect(html).toContain('Diretor Técnico')
    expect(html).toContain('Delfos Engenharia Ltda')
    expect(html).toContain('(54) 99646-8910')
  })

  it('gera o corpo HTML padrão completo quando nenhum template customizado é passado', () => {
    const html = gerarCorpoHtmlContasRGE({
      numeroUc: '1009845231',
      enderecoUc: 'Linha 4, Interior, Erechim/RS',
      nomeCliente: 'João Silva',
      documentoCliente: '123.456.789-00',
      nomeResponsavel: 'Daniel Rotava',
      cargoResponsavel: 'Engenheiro Eletricista',
      telefoneDelfos: '(54) 99646-8910',
      emailDelfos: 'delfos.usinas@gmail.com',
    })

    expect(html).toContain('1009845231')
    expect(html).toContain('Linha 4, Interior, Erechim/RS')
    expect(html).toContain('João Silva')
    expect(html).toContain('123.456.789-00')
    expect(html).toContain('Daniel Rotava')
    expect(html).toContain('Engenheiro Eletricista')
    expect(html).toContain('últimos 5 (cinco) anos')
    expect(html).toContain('Delfos Engenharia Ltda')
    expect(html).toContain('www.delfosengenharia.com.br')
  })

  it('gera o corpo HTML customizado quando template customizado é fornecido', () => {
    const customTemplate = `Solicito as contas da UC [número da UC] do cliente [nome do cliente]. Obrigado.`
    const html = gerarCorpoHtmlContasRGE(
      {
        numeroUc: '998811',
        enderecoUc: 'Rua A',
        nomeCliente: 'Ana Santos',
        documentoCliente: '111.222.333-44',
        nomeResponsavel: 'Daniel Rotava',
      },
      customTemplate,
    )

    expect(html).toContain('Solicito as contas da UC 998811 do cliente Ana Santos.')
    expect(html).toContain('Daniel Rotava')
  })

  it('carrega template padrão ou fallback se não houver dados no mock', async () => {
    const tpl = await carregarTemplatePadraoContasRGE()
    expect(tpl).toHaveProperty('assunto')
    expect(tpl).toHaveProperty('corpo')
    expect(tpl.assunto.length).toBeGreaterThan(0)
    expect(tpl.corpo.length).toBeGreaterThan(0)
  })
})

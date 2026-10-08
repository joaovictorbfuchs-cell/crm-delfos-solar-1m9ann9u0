import { describe, it, expect } from 'vitest'
import {
  DELFOS_TELEFONE_PADRAO,
  DELFOS_EMAIL_PADRAO,
  gerarAssuntoContasRGE,
  gerarCorpoHtmlContasRGE,
  resolverPlaceholdersContasRGE,
  RGE_PLACEHOLDERS,
} from '@/lib/emailContasRGETemplate'
import {
  MODELOS_INICIAIS_FALLBACK,
  EMAILS_INICIAIS_FALLBACK,
  listarModelosEmailRGE,
  listarEmailsRGE,
  EMAIL_DESTINO_PADRAO,
} from '@/services/emailRGEService'

describe('Recurso Email RGE e Modelos Configuráveis', () => {
  it('contém os 3 modelos iniciais com texto e e-mail de destino pré-configurados', () => {
    expect(MODELOS_INICIAIS_FALLBACK).toHaveLength(3)
    const nomes = MODELOS_INICIAIS_FALLBACK.map((m) => m.nome)
    expect(nomes).toContain('Solicitar contas RGE')
    expect(nomes).toContain('Troca de titularidade')
    expect(nomes).toContain('Transferência de créditos entre unidades consumidoras')

    for (const m of MODELOS_INICIAIS_FALLBACK) {
      expect(m.texto).toBeTruthy()
      expect(m.email_destino).toBe(EMAIL_DESTINO_PADRAO)
      expect(m.assunto).toContain('[número da UC]')
    }
  })

  it('contém lista inicial de e-mails RGE gerenciáveis', () => {
    expect(EMAILS_INICIAIS_FALLBACK.length).toBeGreaterThanOrEqual(2)
    const emails = EMAILS_INICIAIS_FALLBACK.map((e) => e.email)
    expect(emails).toContain('joao@delfosengenharia.com.br')
  })

  it('substitui todos os placeholders no texto do modelo de email', () => {
    const modeloTexto = `Solicito as faturas da UC [número da UC] no endereço [endereço da UC] do cliente [nome do cliente] ([CPF/CNPJ]). Resp: [nome do responsável], [cargo do responsável]. Contato: [telefone Delfos] | [email Delfos]`

    const params = {
      numeroUc: '9988776655',
      enderecoUc: 'Rua Espírito Santo, 275 - Erechim/RS',
      nomeCliente: 'João da Silva',
      documentoCliente: '123.456.789-00',
      nomeResponsavel: 'Daniel Rotava',
      cargoResponsavel: 'Diretor Técnico',
      telefoneDelfos: DELFOS_TELEFONE_PADRAO,
      emailDelfos: DELFOS_EMAIL_PADRAO,
    }

    const resultado = resolverPlaceholdersContasRGE(modeloTexto, params)

    expect(resultado).toContain('9988776655')
    expect(resultado).toContain('Rua Espírito Santo, 275 - Erechim/RS')
    expect(resultado).toContain('João da Silva')
    expect(resultado).toContain('123.456.789-00')
    expect(resultado).toContain('Daniel Rotava')
    expect(resultado).toContain('Diretor Técnico')
    expect(resultado).not.toContain('[número da UC]')
    expect(resultado).not.toContain('[nome do cliente]')
  })

  it('gera assunto dinâmico para modelos personalizados', () => {
    const assunto = gerarAssuntoContasRGE(
      '12345678',
      'Empresa Solar Teste',
      'Troca de Titularidade — UC [número da UC] — [nome do cliente]',
    )
    expect(assunto).toBe('Troca de Titularidade — UC 12345678 — Empresa Solar Teste')
  })

  it('gera corpo HTML com branding Delfos Solar e remetente oficial', () => {
    const html = gerarCorpoHtmlContasRGE({
      numeroUc: '100200300',
      enderecoUc: 'Av Sete de Setembro, 100',
      nomeCliente: 'Maria Souza',
      documentoCliente: '000.111.222-33',
      nomeResponsavel: 'Daniel Rotava',
      cargoResponsavel: 'Engenheiro Responsável',
      telefoneDelfos: DELFOS_TELEFONE_PADRAO,
      emailDelfos: DELFOS_EMAIL_PADRAO,
    })

    expect(html).toContain('Delfos Engenharia Ltda')
    expect(html).toContain('100200300')
    expect(html).toContain('Maria Souza')
    expect(html).toContain('Daniel Rotava')
  })

  it('tags de placeholders catalogadas estão completas', () => {
    expect(RGE_PLACEHOLDERS.length).toBeGreaterThanOrEqual(8)
    const tags = RGE_PLACEHOLDERS.map((p) => p.tag)
    expect(tags).toContain('[número da UC]')
    expect(tags).toContain('[endereço da UC]')
    expect(tags).toContain('[nome do cliente]')
    expect(tags).toContain('[CPF/CNPJ]')
  })
})

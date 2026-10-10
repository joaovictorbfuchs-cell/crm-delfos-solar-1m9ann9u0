import { OrdemServico } from '@/types/crm'
import { renderizarHTMLParaPdfBase64 } from '@/lib/pdfWhatsAppService'
import { dataUriToFile } from '@/lib/relatorioOSPdf'

export interface ItemConsolidadoMensal {
  id: string
  tipoCanonico: string // 'limpeza' | 'manutencao_preventiva' | 'manutencao_corretiva' | 'limpeza_manutencao' | 'outro'
  tipoExibicao: string
  tecnico: string
  clienteNome: string
  usinaNomeOuEndereco: string
  cidade: string
  dataConclusaoFormatada: string
  fotosCount: number
}

export interface RelatorioMensalCampoDados {
  mesNome: string
  ano: number
  totalAtividadesConcluidas: number
  distribuicaoCanonico: {
    limpeza: number
    manutencao_preventiva: number
    manutencao_corretiva: number
    limpeza_manutencao: number
    outros: number
  }
  totalPorTecnico: Array<{
    nome: string
    total: number
    limpeza: number
    manutencao_preventiva: number
    manutencao_corretiva: number
    limpeza_manutencao: number
    outros: number
  }>
  itens: ItemConsolidadoMensal[]
}

/**
 * Normaliza o tipo da atividade/OS estritamente a partir do campo canônico
 * tipo / tipo_custom_id, NUNCA heurística de título.
 */
export function normalizarTipoCanonicoAtividade(os: OrdemServico): {
  canonico:
    | 'limpeza'
    | 'manutencao_preventiva'
    | 'manutencao_corretiva'
    | 'limpeza_manutencao'
    | 'outro'
  label: string
} {
  const rawTipo = String(os.tipo || os.tipo_custom_id || '')
    .trim()
    .toLowerCase()

  if (rawTipo === 'limpeza') {
    return { canonico: 'limpeza', label: 'Limpeza dos Módulos' }
  }
  if (rawTipo === 'manutencao_preventiva') {
    return { canonico: 'manutencao_preventiva', label: 'Manutenção Preventiva' }
  }
  if (rawTipo === 'manutencao_corretiva') {
    return { canonico: 'manutencao_corretiva', label: 'Manutenção Corretiva' }
  }
  if (rawTipo === 'limpeza_manutencao') {
    return { canonico: 'limpeza_manutencao', label: 'Limpeza e Manutenção' }
  }

  // Se o campo tipo tiver outra chave canônica
  if (rawTipo.includes('preventiva')) {
    return { canonico: 'manutencao_preventiva', label: 'Manutenção Preventiva' }
  }
  if (rawTipo.includes('corretiva')) {
    return { canonico: 'manutencao_corretiva', label: 'Manutenção Corretiva' }
  }
  if (rawTipo.includes('limpeza')) {
    return { canonico: 'limpeza', label: 'Limpeza' }
  }

  return { canonico: 'outro', label: os.tipo_servico || 'Serviço em Campo' }
}

/**
 * Compila os dados consolidados do mês a partir das ordens de serviço / atividades de campo.
 */
export function compilarDadosConsolidadosMensal(
  ordensMes: OrdemServico[],
  mesNome: string,
  ano: number,
): RelatorioMensalCampoDados {
  const distribuicaoCanonico = {
    limpeza: 0,
    manutencao_preventiva: 0,
    manutencao_corretiva: 0,
    limpeza_manutencao: 0,
    outros: 0,
  }

  const mapaTecnicos = new Map<
    string,
    {
      nome: string
      total: number
      limpeza: number
      manutencao_preventiva: number
      manutencao_corretiva: number
      limpeza_manutencao: number
      outros: number
    }
  >()

  const itens: ItemConsolidadoMensal[] = []

  ordensMes.forEach((os) => {
    const { canonico, label } = normalizarTipoCanonicoAtividade(os)

    if (canonico === 'limpeza') distribuicaoCanonico.limpeza += 1
    else if (canonico === 'manutencao_preventiva') distribuicaoCanonico.manutencao_preventiva += 1
    else if (canonico === 'manutencao_corretiva') distribuicaoCanonico.manutencao_corretiva += 1
    else if (canonico === 'limpeza_manutencao') distribuicaoCanonico.limpeza_manutencao += 1
    else distribuicaoCanonico.outros += 1

    const nomeTecnico =
      os.atribuida_a?.trim() ||
      os.expand?.responsavel_usuario_id?.name ||
      os.expand?.profissional_id?.nome ||
      'Técnico Autorizado Delfos'

    if (!mapaTecnicos.has(nomeTecnico)) {
      mapaTecnicos.set(nomeTecnico, {
        nome: nomeTecnico,
        total: 0,
        limpeza: 0,
        manutencao_preventiva: 0,
        manutencao_corretiva: 0,
        limpeza_manutencao: 0,
        outros: 0,
      })
    }

    const tec = mapaTecnicos.get(nomeTecnico)!
    tec.total += 1
    if (canonico === 'limpeza') tec.limpeza += 1
    else if (canonico === 'manutencao_preventiva') tec.manutencao_preventiva += 1
    else if (canonico === 'manutencao_corretiva') tec.manutencao_corretiva += 1
    else if (canonico === 'limpeza_manutencao') tec.limpeza_manutencao += 1
    else tec.outros += 1

    const cli = os.expand?.cliente_id
    const clienteNome = cli?.nome || cli?.razao_social || 'Cliente Solar'
    const usina = os.expand?.usina_id
    const usinaNomeOuEndereco =
      (usina as any)?.nome ||
      (usina as any)?.apelido ||
      os.endereco ||
      cli?.endereco ||
      'Endereço da usina'
    const cidade = (usina as any)?.cidade || cli?.cidade || 'Erechim - RS'

    let dataFmt = ''
    if (os.concluida_em) {
      try {
        dataFmt = new Date(os.concluida_em).toLocaleDateString('pt-BR')
      } catch {
        dataFmt = os.concluida_em
      }
    } else if (os.updated) {
      try {
        dataFmt = new Date(os.updated).toLocaleDateString('pt-BR')
      } catch {
        dataFmt = os.updated
      }
    }

    const fotosCount = Array.isArray(os.fotos) ? os.fotos.length : 0

    itens.push({
      id: os.id,
      tipoCanonico: canonico,
      tipoExibicao: label,
      tecnico: nomeTecnico,
      clienteNome,
      usinaNomeOuEndereco,
      cidade,
      dataConclusaoFormatada: dataFmt,
      fotosCount,
    })
  })

  const totalPorTecnico = Array.from(mapaTecnicos.values()).sort((a, b) => b.total - a.total)

  return {
    mesNome,
    ano,
    totalAtividadesConcluidas: ordensMes.length,
    distribuicaoCanonico,
    totalPorTecnico,
    itens,
  }
}

/**
 * Gera o HTML A4 oficial do Relatório Consolidado Mensal do Serviço de Campo.
 */
export function gerarHTMLRelatorioConsolidadoMensal(dados: RelatorioMensalCampoDados): string {
  const { mesNome, ano, totalAtividadesConcluidas, distribuicaoCanonico, totalPorTecnico, itens } =
    dados

  const agoraData = new Date().toLocaleDateString('pt-BR')
  const agoraHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const linhasTecnicosHtml = totalPorTecnico
    .map(
      (t, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A;">${t.nome}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 800; color: #166534; font-size: 11pt;">${t.total}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #2563EB;">${t.limpeza}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #16A34A;">${t.manutencao_preventiva}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #DC2626;">${t.manutencao_corretiva}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #7C3AED;">${t.limpeza_manutencao}</td>
      </tr>
    `,
    )
    .join('')

  const linhasItensHtml = itens
    .map(
      (it, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td style="padding: 6px 8px; border-bottom: 1px solid #E2E8F0; font-size: 8pt; color: #64748B;">${it.dataConclusaoFormatada}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F172A; font-size: 8.5pt;">${it.clienteNome}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #E2E8F0; font-size: 8pt; color: #334155;">${it.usinaNomeOuEndereco} • <span style="color: #64748B;">${it.cidade}</span></td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #E2E8F0; font-size: 8pt; font-weight: 700; color: #047857;">${it.tipoExibicao}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #E2E8F0; font-size: 8pt; color: #1E293B;">${it.tecnico}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #E2E8F0; font-size: 8pt; text-align: center; font-weight: 700; color: #64748B;">${it.fotosCount > 0 ? `📷 ${it.fotosCount}` : '—'}</td>
      </tr>
    `,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Mensal de Serviços de Campo - ${mesNome} / ${ano}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #FFFFFF; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 9.5pt; line-height: 1.4; padding: 24px; }
    .container { width: 794px; margin: 0 auto; background: #FFFFFF; }
    .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px solid #16A34A; padding-bottom: 12px; margin-bottom: 16px; }
    .brand-title { font-size: 16pt; font-weight: 900; color: #0A539E; line-height: 1.1; }
    .brand-sub { font-size: 8.5pt; font-weight: 800; color: #16A34A; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
    .banner { background: #0F172A; color: #FFFFFF; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border-left: 5px solid #16A34A; }
    .banner-title { font-size: 13pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em; }
    .banner-sub { font-size: 8.5pt; color: #94A3B8; margin-top: 2px; }
    .cards-grid { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .card-cell { width: 25%; padding: 4px; vertical-align: top; }
    .metric-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; border-left: 3px solid #16A34A; }
    .metric-rotulo { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; color: #64748B; letter-spacing: 0.04em; }
    .metric-valor { font-size: 16pt; font-weight: 900; color: #0F172A; margin-top: 2px; }
    .secao-box { border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; page-break-inside: avoid; }
    .secao-header { background: #F1F5F9; border-bottom: 1.5px solid #E2E8F0; padding: 8px 12px; font-size: 9pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; color: #0F172A; }
    .secao-body { padding: 10px; }
    .table-data { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    .table-data th { background: #F8FAFC; border-bottom: 2px solid #CBD5E1; padding: 7px 8px; text-align: left; font-size: 7.5pt; font-weight: 800; text-transform: uppercase; color: #475569; }
    .footer { border-top: 2px solid #E2E8F0; padding-top: 10px; margin-top: 20px; font-size: 7.5pt; color: #64748B; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: middle;">
          <div class="brand-title">DELFOS SOLAR</div>
          <div class="brand-sub">Serviços de Campo • Engenharia &amp; Operação de Usinas</div>
          <div style="font-size: 7.5pt; color: #64748B; margin-top: 1px;">Delfos Engenharia Ltda • Rua Espírito Santo, 275 – Erechim/RS</div>
        </td>
        <td style="vertical-align: middle; text-align: right;">
          <div style="display: inline-block; background: #DCFCE7; color: #166534; border: 1.5px solid #86EFAC; font-size: 10pt; font-weight: 900; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">
            ${mesNome} / ${ano}
          </div>
        </td>
      </tr>
    </table>

    <div class="banner">
      <div class="banner-title">Relatório Consolidado Mensal do Serviço de Campo</div>
      <div class="banner-sub">Demonstrativo consolidado de atividades concluídas, distribuição canônica e produtividade por técnico</div>
    </div>

    <!-- Cards de Métricas Principais -->
    <table class="cards-grid">
      <tr>
        <td class="card-cell">
          <div class="metric-card" style="border-left-color: #16A34A; background: #F0FDF4;">
            <div class="metric-rotulo">Total Concluídas</div>
            <div class="metric-valor" style="color: #166534;">${totalAtividadesConcluidas}</div>
          </div>
        </td>
        <td class="card-cell">
          <div class="metric-card" style="border-left-color: #2563EB;">
            <div class="metric-rotulo">Limpeza Módulos</div>
            <div class="metric-valor" style="color: #1D4ED8;">${distribuicaoCanonico.limpeza}</div>
          </div>
        </td>
        <td class="card-cell">
          <div class="metric-card" style="border-left-color: #16A34A;">
            <div class="metric-rotulo">Manut. Preventiva</div>
            <div class="metric-valor" style="color: #15803D;">${distribuicaoCanonico.manutencao_preventiva}</div>
          </div>
        </td>
        <td class="card-cell">
          <div class="metric-card" style="border-left-color: #DC2626;">
            <div class="metric-rotulo">Manut. Corretiva</div>
            <div class="metric-valor" style="color: #B91C1C;">${distribuicaoCanonico.manutencao_corretiva}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- 1. Distribuição Canônica -->
    <div class="secao-box">
      <div class="secao-header">&#9632; 1. Distribuição por Tipo Canônico de Atividade</div>
      <div class="secao-body">
        <table class="table-data" cellpadding="0" cellspacing="0">
          <thead>
            <tr>
              <th>Tipo Canônico de Manutenção</th>
              <th style="text-align: center;">Quantidade Concluída</th>
              <th style="text-align: center;">Percentual</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700;">Limpeza dos Módulos (limpeza)</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 800; color: #2563EB;">${distribuicaoCanonico.limpeza}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">${totalAtividadesConcluidas > 0 ? Math.round((distribuicaoCanonico.limpeza / totalAtividadesConcluidas) * 100) : 0}%</td>
            </tr>
            <tr>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700;">Manutenção Preventiva (manutencao_preventiva)</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 800; color: #16A34A;">${distribuicaoCanonico.manutencao_preventiva}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">${totalAtividadesConcluidas > 0 ? Math.round((distribuicaoCanonico.manutencao_preventiva / totalAtividadesConcluidas) * 100) : 0}%</td>
            </tr>
            <tr>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700;">Manutenção Corretiva (manutencao_corretiva)</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 800; color: #DC2626;">${distribuicaoCanonico.manutencao_corretiva}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">${totalAtividadesConcluidas > 0 ? Math.round((distribuicaoCanonico.manutencao_corretiva / totalAtividadesConcluidas) * 100) : 0}%</td>
            </tr>
            <tr>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700;">Limpeza e Manutenção (limpeza_manutencao)</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 800; color: #7C3AED;">${distribuicaoCanonico.limpeza_manutencao}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">${totalAtividadesConcluidas > 0 ? Math.round((distribuicaoCanonico.limpeza_manutencao / totalAtividadesConcluidas) * 100) : 0}%</td>
            </tr>
            ${
              distribuicaoCanonico.outros > 0
                ? `<tr>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; font-weight: 700;">Outros Serviços de Campo</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 800; color: #475569;">${distribuicaoCanonico.outros}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">${totalAtividadesConcluidas > 0 ? Math.round((distribuicaoCanonico.outros / totalAtividadesConcluidas) * 100) : 0}%</td>
            </tr>`
                : ''
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. Produtividade por Técnico -->
    <div class="secao-box">
      <div class="secao-header">&#9632; 2. Total por Técnico Executante</div>
      <div class="secao-body">
        <table class="table-data" cellpadding="0" cellspacing="0">
          <thead>
            <tr>
              <th>Técnico / Prestador</th>
              <th style="text-align: center;">Total OS</th>
              <th style="text-align: center;">Limpeza</th>
              <th style="text-align: center;">Preventiva</th>
              <th style="text-align: center;">Corretiva</th>
              <th style="text-align: center;">Limp. + Manut.</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTecnicosHtml || '<tr><td colspan="6" style="padding: 10px; text-align: center; color: #94A3B8;">Nenhum técnico registrado no período.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. Relação de Usinas e Clientes Atendidos -->
    <div class="secao-box">
      <div class="secao-header">&#9632; 3. Relação de Usinas e Clientes Atendidos (${itens.length})</div>
      <div class="secao-body">
        <table class="table-data" cellpadding="0" cellspacing="0">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Usina / Local</th>
              <th>Tipo Canônico</th>
              <th>Técnico</th>
              <th style="text-align: center;">Fotos</th>
            </tr>
          </thead>
          <tbody>
            ${linhasItensHtml || '<tr><td colspan="6" style="padding: 10px; text-align: center; color: #94A3B8;">Nenhuma atividade finalizada no mês.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      <div>Delfos Engenharia Solar • Relatório Consolidado de Serviços de Campo • Erechim/RS</div>
      <div>Emitido em ${agoraData} às ${agoraHora}</div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Pipeline de geração de PDF do Relatório Consolidado Mensal via html2pdf.js
 */
export async function gerarPdfRelatorioConsolidadoMensal(
  ordensMes: OrdemServico[],
  mesNome: string,
  ano: number,
): Promise<{ base64: string; file: File; fileName: string; html: string }> {
  const dados = compilarDadosConsolidadosMensal(ordensMes, mesNome, ano)
  const html = gerarHTMLRelatorioConsolidadoMensal(dados)
  const mesSanitizado = mesNome.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const fileName = `Relatorio_Mensal_Servicos_Campo_${mesSanitizado}_${ano}.pdf`

  const base64 = await renderizarHTMLParaPdfBase64(html, fileName, {
    scale: 1.5,
    imageQuality: 0.8,
    compressJsPdf: true,
    timeoutMs: 30000,
  })

  if (!base64) {
    throw new Error('Falha ao renderizar PDF consolidado mensal.')
  }

  const file = dataUriToFile(base64, fileName)
  return { base64, file, fileName, html }
}

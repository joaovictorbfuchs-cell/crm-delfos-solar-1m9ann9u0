import React from 'react'
import {
  Zap,
  Check,
  ShieldCheck,
  Clock,
  Award,
  AlertCircle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react'
import type {
  SalvarPropostaCarregadorInput,
  ItemMaterialInfraestrutura,
} from '@/services/propostasCarregadorService'
import { formatCurrency } from '@/lib/formatters'
import { formatarDataBr, calcularDataValidade } from '@/lib/propostaCarregadorGenerator'
import logoDelfosPng from '@/assets/delfos-solar-a46ea.png'

export interface PreviewPropostaCarregadorDocumentoProps {
  dados: SalvarPropostaCarregadorInput
  editavel?: boolean
  onChangeField?: <K extends keyof SalvarPropostaCarregadorInput>(field: K, val: any) => void
}

export const PreviewPropostaCarregadorDocumento: React.FC<
  PreviewPropostaCarregadorDocumentoProps
> = ({ dados, editavel = false, onChangeField }) => {
  const dataEmissaoFormatada = formatarDataBr(dados.data_emissao) || formatarDataBr(new Date())
  const validadeCalculada = calcularDataValidade(dados.data_emissao, dados.validade_dias || 10)

  const numProposta = dados.numero_proposta || 'PROP-2025-084'
  const clienteNome = dados.cliente_nome || '[Nome do Cliente / Empresa Ltda]'
  const clienteDoc = dados.cliente_documento || '[00.000.000/0001-00]'
  const clienteContato = dados.cliente_contato || '[Nome do Contato — (54) 99999-0000]'
  const endereco = dados.endereco_instalacao || '[Rua Exemplo, nº 123 — Bairro, Erechim/RS]'
  const respAcomp = dados.responsavel_acompanhante || '[Engº ou Gestor Responsável]'
  const tipoLocal = dados.tipo_local || 'Residencial / Condomínio / Comercial'

  const op1Titulo = dados.opcao1_titulo || 'Opção 01: Wallbox AC 7,4 kW'
  const op1Potencia = dados.opcao1_potencia || '7,4 kW (32A)'
  const op1Tensao = dados.opcao1_tensao || 'Monofásico / Bifásico 220V'
  const op1Tempo = dados.opcao1_tempo_recarga || '~7h a 8h (bateria 50–60 kWh)'
  const op1Valor = Number(dados.opcao1_valor ?? 6890)

  const op2Titulo = dados.opcao2_titulo || 'Opção 02: Wallbox AC 22 kW'
  const op2Potencia = dados.opcao2_potencia || '22 kW (32A trifásico)'
  const op2Tensao = dados.opcao2_tensao || 'Trifásico 380V (ou 11kW em 220V)'
  const op2Tempo = dados.opcao2_tempo_recarga || '~3h a 4h (bateria 50–60 kWh)'
  const op2Valor = Number(dados.opcao2_valor ?? 9450)

  // Opção única: carregador já adquirido
  const isCarregadorAdquirido = Boolean(
    dados.carregador_adquirido || dados.modo_carregador === 'adquirido',
  )
  const carregadorModelo = isCarregadorAdquirido
    ? dados.carregador_modelo || 'Carregador Veicular do Cliente'
    : dados.carregador_modelo || dados.opcao2_titulo || 'Wallbox AC 22 kW Inteligente'
  const carregadorPotencia = isCarregadorAdquirido
    ? dados.carregador_potencia || ''
    : dados.carregador_potencia || dados.opcao2_potencia || '22 kW (32A)'
  const carregadorValor = isCarregadorAdquirido ? 0 : Number(dados.carregador_valor ?? op2Valor)

  // Modo de exibição: detalhado (padrão) vs ocultar valores por item (apenas valor total consolidado)
  const dJson = (dados.dados_json || {}) as Record<string, any>
  const ocultarValoresIndividuais = Boolean(
    dados.exibir_apenas_total ??
    dJson.exibir_apenas_total ??
    (dados.detalhar_valores === false || dJson.detalhar_valores === false),
  )

  // Lista de materiais e cálculo de subtotal
  const materiaisList: ItemMaterialInfraestrutura[] =
    Array.isArray(dados.materiais_infraestrutura) && dados.materiais_infraestrutura.length > 0
      ? dados.materiais_infraestrutura
      : []

  const subtotalMateriais =
    typeof dados.subtotal_materiais === 'number'
      ? dados.subtotal_materiais
      : materiaisList.reduce(
          (acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0),
          0,
        )

  // Serviços unificados de Instalação e Engenharia em um item único
  const vServicos = Number(
    dados.valor_servicos ??
      (dados.valor_servicos_instalacao !== undefined ||
      dados.valor_servicos_engenharia !== undefined
        ? (Number(dados.valor_servicos_instalacao) || 0) +
          (Number(dados.valor_servicos_engenharia) || 0)
        : 3050),
  )

  // Total consolidado: Carregador (0 se adquirido) + Materiais + Serviços
  const vTotal = Number(dados.valor_total ?? carregadorValor + subtotalMateriais + vServicos)

  const condicoes =
    dados.condicoes_pagamento ||
    '50% de sinal no aceite desta proposta e 50% no comissionamento e entrega técnica operacional. Opção de parcelamento via cartão em até 12x (consulte taxas) ou faturamento direto PJ sob análise prévia.'

  const prazoExec =
    dados.prazo_execucao ||
    'Instalação concluída em até 5 dias úteis após a assinatura e liberação do local de passagem. Instalação física realizada em 1 único dia útil com mínimo impacto na rotina.'

  const garantias =
    dados.garantias ||
    '1 ano integral de garantia da Delfos Engenharia para toda a mão de obra e infraestrutura elétrica. Equipamento carregador com garantia de fábrica (12 a 24 meses).'

  const sobOrcamento =
    dados.premissas_orcamento_previo ||
    'Disponível sob orçamento prévio após vistoria: obras civis de alvenaria/abertura de piso, acréscimo de potência junto à concessionária e cabeamentos excedentes a 15 metros.'

  const engNome = dados.engenheiro_nome || 'Eng. Eletricista João Victor Bagetti Fuchs'
  const engCrea = dados.engenheiro_crea || 'CREA-RS 151894'

  return (
    <div
      id="proposal-content"
      className="proposta-carregador-documento max-w-[960px] mx-auto bg-white border border-slate-200 rounded-lg shadow-sm print:shadow-none print:border-none p-8 sm:p-12 text-slate-900 font-sans print:m-0 print:p-0 print:max-w-full"
      style={{
        fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
      }}
    >
      <style>{`@page { size: A4; margin: 10mm; }
        @media print {
          html, body { width: 100% !important; height: auto !important; overflow: visible !important; background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .proposta-carregador-documento, .proposta-carregador-documento * { visibility: visible !important; }
          .proposta-carregador-documento { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: 100% !important; height: auto !important; max-height: none !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .no-print, [role="dialog"] > div:first-child, [data-radix-popper-content-wrapper] { display: none !important; }
          .proposta-carregador-documento section, .proposta-carregador-documento header, .proposta-carregador-documento footer { break-inside: avoid-page !important; page-break-inside: avoid !important; }
        }`}</style>
      {/* 1. CABEÇALHO */}
      <header className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-7 mb-7 gap-6">
        <div className="flex flex-col gap-2">
          {/* Logo Delfos Solar oficial otimizado */}
          <div className="flex items-center gap-3">
            <img
              src={logoDelfosPng}
              alt="Delfos Solar Logo"
              className="h-12 sm:h-14 w-auto object-contain shrink-0"
              style={{ maxHeight: '56px' }}
            />
            <div>
              <div className="text-xl font-extrabold tracking-tight text-slate-900">
                DELFOS ENGENHARIA
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                Infraestrutura Elétrica &amp; Eletromobilidade
              </div>
            </div>
          </div>
          <div className="text-[12px] text-slate-600 leading-snug">
            <strong>Delfos Engenharia Ltda</strong> • CNPJ: 21.379.952/0001-38
            <br />
            Rua Espírito Santo, 275 • Erechim – RS • CEP 99709-296
          </div>
        </div>

        <div className="text-left sm:text-right flex flex-col sm:items-end gap-1.5">
          <span className="bg-slate-900 text-white text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded inline-block">
            Proposta Comercial
          </span>
          <div className="text-lg font-bold text-slate-900">
            Nº{' '}
            {editavel && onChangeField ? (
              <input
                type="text"
                value={numProposta}
                onChange={(e) => onChangeField('numero_proposta', e.target.value)}
                className="bg-amber-50 border-b border-dashed border-amber-600 text-amber-900 font-bold px-1.5 py-0.5 rounded text-base focus:outline-none focus:bg-amber-100"
              />
            ) : (
              <span>{numProposta}</span>
            )}
          </div>
          <div className="text-[13px] text-slate-600">
            Emissão: <strong>{dataEmissaoFormatada}</strong>
            <br />
            Validade: <strong>10 dias corridos</strong> (até <span>{validadeCalculada}</span>)
          </div>
        </div>
      </header>

      {/* Título Oficial */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
          PROPOSTA COMERCIAL — Infraestrutura de Recarga Wallbox
        </h1>
        <p className="text-sm text-slate-600">
          Fornecimento e instalação técnica especializada de ponto de recarga veicular conforme
          normas ABNT NBR 5410 e ABNT NBR 17019.
        </p>
      </div>

      {/* 2. DADOS DO CLIENTE */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          1. Dados do Cliente &amp; Local de Instalação
        </h2>
        <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-sm">
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
              Cliente / Razão Social
            </div>
            {editavel && onChangeField ? (
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => onChangeField('cliente_nome', e.target.value)}
                className="w-full bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-semibold px-1 py-0.5 rounded text-sm focus:outline-none focus:bg-amber-100"
              />
            ) : (
              <div className="text-slate-900 font-semibold">{clienteNome}</div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
              CNPJ / CPF
            </div>
            {editavel && onChangeField ? (
              <input
                type="text"
                value={clienteDoc}
                onChange={(e) => onChangeField('cliente_documento', e.target.value)}
                className="w-full bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-semibold px-1 py-0.5 rounded text-sm focus:outline-none focus:bg-amber-100"
              />
            ) : (
              <div className="text-slate-900 font-semibold">{clienteDoc}</div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
              Contato / Telefone / E-mail
            </div>
            {editavel && onChangeField ? (
              <input
                type="text"
                value={clienteContato}
                onChange={(e) => onChangeField('cliente_contato', e.target.value)}
                className="w-full bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-semibold px-1 py-0.5 rounded text-sm focus:outline-none focus:bg-amber-100"
              />
            ) : (
              <div className="text-slate-900 font-semibold">{clienteContato}</div>
            )}
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
              Endereço da Instalação
            </div>
            {editavel && onChangeField ? (
              <input
                type="text"
                value={endereco}
                onChange={(e) => onChangeField('endereco_instalacao', e.target.value)}
                className="w-full bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-semibold px-1 py-0.5 rounded text-sm focus:outline-none focus:bg-amber-100"
              />
            ) : (
              <div className="text-slate-900 font-semibold">{endereco}</div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
              Responsável Acompanhante
            </div>
            {editavel && onChangeField ? (
              <input
                type="text"
                value={respAcomp}
                onChange={(e) => onChangeField('responsavel_acompanhante', e.target.value)}
                className="w-full bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-semibold px-1 py-0.5 rounded text-sm focus:outline-none focus:bg-amber-100"
              />
            ) : (
              <div className="text-slate-900 font-semibold">{respAcomp}</div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
              Tipo de Local
            </div>
            {editavel && onChangeField ? (
              <input
                type="text"
                value={tipoLocal}
                onChange={(e) => onChangeField('tipo_local', e.target.value)}
                className="w-full bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-semibold px-1 py-0.5 rounded text-sm focus:outline-none focus:bg-amber-100"
              />
            ) : (
              <div className="text-slate-900 font-semibold">{tipoLocal}</div>
            )}
          </div>
        </div>
      </section>

      {/* 3. ABERTURA PERSUASIVA */}
      <section className="mb-8 print:break-inside-avoid">
        <div className="bg-gradient-to-br from-[#f0fdf4] to-white border border-[#a7f3d0] border-l-4 border-l-[#047857] rounded-md p-5 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-1.5">
            Por que estruturar seu próprio ponto de recarga veicular?
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            A mobilidade elétrica é um caminho definitivo de eficiência e inteligência energética.
            Dispor de uma estação Wallbox dedicada transforma a experiência de uso: oferece{' '}
            <strong className="text-slate-900">
              total conveniência de abastecer no local onde o veículo já permanece estacionado
            </strong>
            , agrega alto valor percebido ao imóvel ou estabelecimento comercial, posiciona sua
            marca na vanguarda da sustentabilidade e garante autonomia diária com segurança contra
            sobrecargas elétricas e surtos de tensão.
          </p>
        </div>
      </section>

      {/* 4. MODELOS DE CARREGADOR DISPONÍVEIS OU CARREGADOR ADQUIRIDO */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          2. Carregador Veicular Wallbox
        </h2>

        {isCarregadorAdquirido ? (
          /* Opção Única: Carregador Já Adquirido pelo Cliente */
          <div className="border border-amber-300 bg-amber-50/60 rounded-md p-4 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-sm font-bold">{carregadorModelo}</strong>
                    <span className="bg-amber-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      Adquirido
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Equipamento fornecido diretamente pelo cliente. A Delfos Engenharia realizará o
                    comissionamento técnico, fixação em parede/totem, parametrizações elétricas e
                    conexão integral com a infraestrutura dedicada.
                  </div>
                  {carregadorPotencia && (
                    <div className="text-xs text-slate-700 font-semibold mt-1">
                      Potência / Tensão informada: {carregadorPotencia}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:text-right font-extrabold text-amber-900 text-base shrink-0 bg-white/80 px-3 py-1.5 rounded border border-amber-200 self-start sm:self-auto">
                Adquirido
              </div>
            </div>
          </div>
        ) : (
          /* Modo Padrão: 2 Modelos (7,4 kW e 22 kW Recomendado) */
          <>
            <div className="overflow-x-auto border border-slate-200 rounded-md mt-2">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-900 text-xs uppercase font-bold tracking-wider">
                    <th className="p-3 w-[30%]">Modelo &amp; Aplicação</th>
                    <th className="p-3 w-[15%]">Potência</th>
                    <th className="p-3 w-[20%]">Ligação &amp; Rede</th>
                    <th className="p-3 w-[20%]">Tempo Recarga (0–100%)*</th>
                    <th className="p-3 w-[15%] text-right">Investimento Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Opção 01 */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <strong className="text-slate-900">{op1Titulo}</strong>
                      <br />
                      <span className="text-xs text-slate-600">
                        Ideal para residências, condomínios e recarga noturna contínua.
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{op1Potencia}</td>
                    <td className="p-3 text-slate-700">{op1Tensao}</td>
                    <td className="p-3 text-slate-700">{op1Tempo}</td>
                    <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {editavel && onChangeField ? (
                        <input
                          type="number"
                          value={op1Valor}
                          onChange={(e) => onChangeField('opcao1_valor', Number(e.target.value))}
                          className="w-24 bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-bold px-1 py-0.5 rounded text-right focus:outline-none"
                        />
                      ) : (
                        formatCurrency(op1Valor)
                      )}
                    </td>
                  </tr>

                  {/* Opção 02 */}
                  <tr className="bg-[#f0fdf4] hover:bg-emerald-50">
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-slate-900">{op2Titulo}</strong>
                        <span className="bg-[#047857] text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                          Recomendado
                        </span>
                      </div>
                      <span className="text-xs text-slate-600">
                        Alta performance para frotas, comércios, clínicas e recarga rotativa.
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{op2Potencia}</td>
                    <td className="p-3 text-slate-700">{op2Tensao}</td>
                    <td className="p-3 text-slate-700">{op2Tempo}</td>
                    <td className="p-3 text-right font-bold text-[#047857] whitespace-nowrap">
                      {editavel && onChangeField ? (
                        <input
                          type="number"
                          value={op2Valor}
                          onChange={(e) => onChangeField('opcao2_valor', Number(e.target.value))}
                          className="w-24 bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-bold px-1 py-0.5 rounded text-right focus:outline-none"
                        />
                      ) : (
                        formatCurrency(op2Valor)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-slate-600 mt-1.5">
              *Tempo estimado em função da capacidade interna do inversor onboard do veículo. Ambos
              os modelos incluem conector padrão Tipo 2 (Tipo Mennekes) com cabo integrado de 5
              metros.
            </div>
          </>
        )}
      </section>

      {/* 5. ESCOPO TÉCNICO DA ENGENHARIA DE INSTALAÇÃO */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          3. Escopo Técnico da Engenharia de Instalação
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
          {/* Bloco A */}
          <div className="border border-slate-200 rounded-md bg-[#fbfcfd] p-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-[#047857] shrink-0" />
              <span>(A) Quadro de Proteção</span>
            </h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                Montagem em estrita conformidade com <strong>NBR 5410</strong> e{' '}
                <strong>NBR 17019</strong>.
              </li>
              <li>Disjuntor termomagnético dedicado com curva de disparo apropriada.</li>
              <li>
                Interruptor Diferencial Residual (<strong>DR Tipo A</strong> ou sensor DC 6mA) para
                proteção de usuários.
              </li>
              <li>
                Dispositivo Protetor de Surto (<strong>DPS Classe II</strong>).
              </li>
            </ul>
          </div>

          {/* Bloco B */}
          <div className="border border-slate-200 rounded-md bg-[#fbfcfd] p-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2 uppercase tracking-wide">
              <Zap className="w-4 h-4 text-[#047857] shrink-0" />
              <span>(B) Infraestrutura &amp; Cabeamento</span>
            </h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Condutores de cobre eletrolítico antichama (cabo isolação 750V / 1kV).</li>
              <li>Dimensionamento térmico e critério de queda de tensão (&lt; 2%).</li>
              <li>Eletrodutos rígidos ou metálicos aparentes de alto acabamento.</li>
              <li>Acessórios de fixação mecânica, abraçadeiras e prensas-cabos estanques.</li>
            </ul>
          </div>

          {/* Bloco C */}
          <div className="border border-slate-200 rounded-md bg-[#fbfcfd] p-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2 uppercase tracking-wide">
              <FileCheck className="w-4 h-4 text-[#047857] shrink-0" />
              <span>(C) Fixação &amp; Comissionamento</span>
            </h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Fixação em alvenaria / totem com chumbamento técnico seguro.</li>
              <li>Medição e adequação do sistema de aterramento elétrico exclusivo.</li>
              <li>Configuração de rede, controle de potência e ativação de RFID/App.</li>
              <li>Testes com simulador de carga veicular e checagem térmica pré-entrega.</li>
            </ul>
          </div>
        </div>

        {/* Caixa Legal & Técnica */}
        <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-3.5 flex items-start sm:items-center gap-3 text-xs text-slate-800">
          <Award className="w-6 h-6 text-[#047857] shrink-0" />
          <div>
            <strong>Documentação Técnica &amp; Legal Inclusa:</strong> Emissão de{' '}
            <strong>ART (Anotação de Responsabilidade Técnica) no CREA-RS</strong> pelo Engenheiro
            Responsável, diagramas elétricos unifilares da instalação e documentação compatível para
            fins de seguro patrimonial e vistorias do Corpo de Bombeiros.
          </div>
        </div>
      </section>

      {/* 6. INVESTIMENTO & CONDIÇÕES COMERCIAIS CONSOLIDADOS */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          4. Investimento Consolidado &amp; Condições Comerciais
        </h2>

        {/* Tabela estrita conforme especificação:
            (i) Valor do Carregador (ou Adquirido sem valor)
            (ii) Materiais da Infraestrutura (lista com valores)
            (iii) Valores de Serviços de Instalação e Serviços de Engenharia
        */}
        <div className="overflow-x-auto border border-slate-200 rounded-md mt-2">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-900 text-xs uppercase font-bold tracking-wider">
                <th className="p-3 w-[55%]">Item / Discriminação dos Custos</th>
                <th className="p-3 w-[15%] text-center">Quantidade</th>
                <th className="p-3 w-[15%] text-right">Unitário</th>
                <th className="p-3 w-[15%] text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* (i) Carregador Veicular */}
              <tr className={isCarregadorAdquirido ? 'bg-amber-50/40' : ''}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900">
                      1. Carregador Veicular — {carregadorModelo}
                    </strong>
                    {isCarregadorAdquirido && (
                      <span className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                        Adquirido
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">
                    {isCarregadorAdquirido
                      ? 'Equipamento já adquirido pelo cliente (sem valor monetário na proposta).'
                      : `Estação Wallbox homologada ${carregadorPotencia} com conector Tipo 2.`}
                  </span>
                </td>
                <td className="p-3 text-center text-slate-700">1 un</td>
                <td className="p-3 text-right text-slate-700">
                  {isCarregadorAdquirido
                    ? '—'
                    : ocultarValoresIndividuais
                      ? 'Incluso'
                      : formatCurrency(carregadorValor)}
                </td>
                <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                  {isCarregadorAdquirido ? (
                    <span className="text-amber-800 font-bold">Adquirido</span>
                  ) : ocultarValoresIndividuais ? (
                    <span className="text-emerald-700 font-semibold">Incluso</span>
                  ) : (
                    formatCurrency(carregadorValor)
                  )}
                </td>
              </tr>

              {/* (ii) Materiais da Infraestrutura de Instalação */}
              {ocultarValoresIndividuais ? (
                /* Modo Oculto: Materiais constam apenas como Incluso, sem valores unitários/subtotais */
                <tr className="border-t border-slate-200">
                  <td className="p-3">
                    <strong className="text-slate-900">
                      2. Materiais da Infraestrutura Elétrica de Instalação
                    </strong>
                    <br />
                    <span className="text-xs text-slate-600">
                      {materiaisList.length > 0
                        ? `Conjunto completo conforme NBR 5410 e NBR 17019 (${materiaisList.length} itens inclusos: quadro termoplástico IP65, disjuntores dedicados, DR Tipo A, DPS Classe II, cabos antichama e eletrodutos).`
                        : 'Quadro de proteção termoplástico, disjuntores, DR Tipo A, DPS e cabeamento de interligação.'}
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-700">1 lote</td>
                  <td className="p-3 text-right text-slate-700">Incluso</td>
                  <td className="p-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                    Incluso
                  </td>
                </tr>
              ) : materiaisList.length > 0 ? (
                /* Modo Detalhado com Itens de Materiais Discriminados */
                <>
                  <tr className="bg-slate-50/80 font-bold text-xs uppercase text-slate-700 border-t border-slate-200">
                    <td colSpan={4} className="py-2 px-3">
                      2. Materiais da Infraestrutura de Instalação (Itens Discriminados)
                    </td>
                  </tr>
                  {materiaisList.map((mat, idx) => {
                    const itemTotal =
                      (Number(mat.quantidade) || 0) * (Number(mat.valor_unitario) || 0)
                    return (
                      <tr key={mat.id || idx} className="hover:bg-slate-50/40 text-xs">
                        <td className="p-2.5 pl-5 text-slate-800">• {mat.descricao}</td>
                        <td className="p-2.5 text-center text-slate-600">{mat.quantidade} un</td>
                        <td className="p-2.5 text-right text-slate-600">
                          {formatCurrency(mat.valor_unitario)}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-slate-800">
                          {formatCurrency(itemTotal)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-slate-100/60 font-semibold text-xs border-t border-slate-200">
                    <td colSpan={3} className="py-2 px-3 text-right text-slate-700">
                      Subtotal dos Materiais da Infraestrutura:
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(subtotalMateriais)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr className="border-t border-slate-200">
                  <td className="p-3">
                    <strong className="text-slate-900">
                      2. Materiais da Infraestrutura Elétrica
                    </strong>
                    <br />
                    <span className="text-xs text-slate-600">
                      Quadro de proteção termoplástico, disjuntores, DR Tipo A, DPS e cabeamento de
                      interligação.
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-700">1 lote</td>
                  <td className="p-3 text-right text-slate-700">
                    {formatCurrency(subtotalMateriais)}
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-900">
                    {formatCurrency(subtotalMateriais)}
                  </td>
                </tr>
              )}

              {/* (iii) Serviços de Instalação e Engenharia */}
              <tr className="border-t border-slate-200">
                <td className="p-3">
                  <strong className="text-slate-900">3. Serviços de Instalação e Engenharia</strong>
                  <br />
                  <span className="text-xs text-slate-600">
                    Passagem e fixação de infraestrutura, montagem de quadro elétrico dedicado,
                    fixação mecânica do Wallbox, conexões elétricas, comissionamento com testes
                    funcionais, laudo técnico e emissão de ART no CREA-RS pelo Engenheiro
                    Responsável.
                  </span>
                </td>
                <td className="p-3 text-center text-slate-700">1 lote</td>
                <td className="p-3 text-right text-slate-700">
                  {ocultarValoresIndividuais ? (
                    'Incluso'
                  ) : editavel && onChangeField ? (
                    <input
                      type="number"
                      value={vServicos}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        onChangeField('valor_servicos', val)
                        onChangeField('valor_servicos_instalacao', val)
                        onChangeField('valor_servicos_engenharia', 0)
                      }}
                      className="w-24 bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-bold px-1 py-0.5 rounded text-right focus:outline-none"
                    />
                  ) : (
                    formatCurrency(vServicos)
                  )}
                </td>
                <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {ocultarValoresIndividuais ? (
                    <span className="text-emerald-700 font-semibold">Incluso</span>
                  ) : (
                    formatCurrency(vServicos)
                  )}
                </td>
              </tr>

              {/* Linha Final de Total */}
              <tr className="bg-[#f8fafc] border-t-2 border-slate-900 font-extrabold">
                <td colSpan={2} className="p-3 text-slate-900 text-base">
                  <div>INVESTIMENTO TOTAL</div>
                  <div className="text-[11px] font-normal text-slate-500">
                    {isCarregadorAdquirido
                      ? 'Composição: Carregador Adquirido (R$ 0,00) + Materiais + Serviços'
                      : 'Composição: Carregador + Materiais + Serviços'}
                  </div>
                </td>
                <td className="p-3 text-center text-slate-500">—</td>
                <td className="p-3 text-right text-xl text-[#047857] whitespace-nowrap">
                  {formatCurrency(vTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Condições de Pagamento */}
        <div className="mt-3 p-3.5 bg-[#f8fafc] rounded-md border border-slate-200 text-sm">
          <strong>Condições de Pagamento:</strong>{' '}
          {editavel && onChangeField ? (
            <textarea
              rows={2}
              value={condicoes}
              onChange={(e) => onChangeField('condicoes_pagamento', e.target.value)}
              className="w-full mt-1 bg-amber-50 border border-amber-300 rounded p-1.5 text-xs text-amber-950 font-medium focus:outline-none"
            />
          ) : (
            <span>{condicoes}</span>
          )}
        </div>
      </section>

      {/* 7. PRAZOS, GARANTIAS & PREMISSAS */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          5. Prazos, Garantia &amp; Premissas de Instalação
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="border border-slate-200 rounded-md bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#047857]" />
              <span>Prazo de Execução</span>
            </div>
            {editavel && onChangeField ? (
              <textarea
                rows={3}
                value={prazoExec}
                onChange={(e) => onChangeField('prazo_execucao', e.target.value)}
                className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-xs text-amber-950 focus:outline-none"
              />
            ) : (
              <p className="text-xs text-slate-800 leading-relaxed">{prazoExec}</p>
            )}
          </div>

          <div className="border border-slate-200 rounded-md bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#047857]" />
              <span>Garantias Asseguradas</span>
            </div>
            {editavel && onChangeField ? (
              <textarea
                rows={3}
                value={garantias}
                onChange={(e) => onChangeField('garantias', e.target.value)}
                className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-xs text-amber-950 focus:outline-none"
              />
            ) : (
              <p className="text-xs text-slate-800 leading-relaxed">{garantias}</p>
            )}
          </div>

          <div className="border border-slate-200 rounded-md bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Sob Orçamento Prévio</span>
            </div>
            {editavel && onChangeField ? (
              <textarea
                rows={3}
                value={sobOrcamento}
                onChange={(e) => onChangeField('premissas_orcamento_previo', e.target.value)}
                className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-xs text-amber-950 focus:outline-none"
              />
            ) : (
              <p className="text-xs text-slate-800 leading-relaxed">{sobOrcamento}</p>
            )}
          </div>
        </div>
      </section>

      {/* 8. RESPONSABILIDADE TÉCNICA */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          6. Responsabilidade Técnica
        </h2>
        <div className="flex items-center justify-between flex-wrap gap-4 bg-[#f8fafc] border border-slate-200 p-4 rounded-md">
          <div>
            <div className="text-base font-bold text-slate-900">
              {editavel && onChangeField ? (
                <input
                  type="text"
                  value={engNome}
                  onChange={(e) => onChangeField('engenheiro_nome', e.target.value)}
                  className="bg-amber-50 border-b border-dashed border-amber-600 px-1 font-bold text-slate-900 rounded"
                />
              ) : (
                engNome
              )}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Responsável Técnico •{' '}
              <strong>
                {editavel && onChangeField ? (
                  <input
                    type="text"
                    value={engCrea}
                    onChange={(e) => onChangeField('engenheiro_crea', e.target.value)}
                    className="bg-amber-50 border-b border-dashed border-amber-600 px-1 font-bold text-slate-900 rounded"
                  />
                ) : (
                  engCrea
                )}
              </strong>{' '}
              • Especialista em Instalações de Alta &amp; Baixa Tensão
            </div>
          </div>
          <div className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded text-slate-800 font-semibold">
            Registro Profissional Ativo CREA-RS
          </div>
        </div>
      </section>

      {/* 9. PRÓXIMOS PASSOS PARA ATIVAÇÃO */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          7. Próximos Passos para Ativação
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-3 text-center">
            <div className="w-6 h-6 bg-[#047857] text-white rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
              1
            </div>
            <div className="text-xs font-bold text-slate-900 mb-0.5">Aceite Formal</div>
            <div className="text-[11px] text-slate-600 leading-tight">
              Assinatura digital ou física da proposta.
            </div>
          </div>

          <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-3 text-center">
            <div className="w-6 h-6 bg-[#047857] text-white rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
              2
            </div>
            <div className="text-xs font-bold text-slate-900 mb-0.5">Sinal (50%)</div>
            <div className="text-[11px] text-slate-600 leading-tight">
              Confirmação financeira para reserva de insumos.
            </div>
          </div>

          <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-3 text-center">
            <div className="w-6 h-6 bg-[#047857] text-white rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
              3
            </div>
            <div className="text-xs font-bold text-slate-900 mb-0.5">Vistoria &amp; Agenda</div>
            <div className="text-[11px] text-slate-600 leading-tight">
              Alinhamento do traçado e agendamento da equipe.
            </div>
          </div>

          <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-3 text-center">
            <div className="w-6 h-6 bg-[#047857] text-white rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
              4
            </div>
            <div className="text-xs font-bold text-slate-900 mb-0.5">Instalação &amp; Testes</div>
            <div className="text-[11px] text-slate-600 leading-tight">
              Execução rápida, comissionamento e laudo técnico.
            </div>
          </div>

          <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-3 text-center">
            <div className="w-6 h-6 bg-[#047857] text-white rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
              5
            </div>
            <div className="text-xs font-bold text-slate-900 mb-0.5">Saldo Final</div>
            <div className="text-[11px] text-slate-600 leading-tight">
              Pagamento dos 50% restantes com entrega da ART.
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3 flex items-center gap-2 text-xs text-amber-900 font-semibold">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Atenção:</strong> Condições comerciais e reserva de equipamentos válidas por
            apenas <strong>10 dias</strong>. A agenda de montagem é confirmada por ordem cronológica
            de aceite.
          </span>
        </div>
      </section>

      {/* 10. ASSINATURAS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 mt-10 pt-6 border-t border-slate-200 print:break-inside-avoid">
        <div className="text-center">
          <div className="border-t-2 border-slate-900 pt-2 mb-1">
            <div className="font-bold text-sm text-slate-900">DELFOS ENGENHARIA LTDA</div>
            <div className="text-xs text-slate-600">CNPJ: 21.379.952/0001-38 — Erechim/RS</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {engNome} — {engCrea}
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="border-t-2 border-slate-900 pt-2 mb-1">
            <div className="font-bold text-sm text-slate-900">{clienteNome}</div>
            <div className="text-xs text-slate-600">De Acordo / Aceite da Proposta Comercial</div>
            <div className="text-[11px] text-slate-500 mt-1">Data do Aceite: ___ / ___ / 2025</div>
          </div>
        </div>
      </section>

      {/* Rodapé Oficial */}
      <footer className="border-t border-slate-200 pt-3 mt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
        <div>
          <strong>Delfos Engenharia Ltda</strong> • Erechim – RS • Contato Comercial: (54) 3522-0000
          • engenharia@delfosengenharia.com.br
        </div>
        <div>Proposta Comercial emitida conforme normas ABNT vigentes • Válida por 10 dias.</div>
      </footer>
    </div>
  )
}
export default PreviewPropostaCarregadorDocumento

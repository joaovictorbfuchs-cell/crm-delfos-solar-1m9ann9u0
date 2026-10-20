import React from 'react'
import { Zap, Check, ShieldCheck, Clock, Award, AlertCircle, FileCheck } from 'lucide-react'
import type { SalvarPropostaCarregadorInput } from '@/services/propostasCarregadorService'
import { formatCurrency } from '@/lib/formatters'
import { formatarDataBr, calcularDataValidade } from '@/lib/propostaCarregadorGenerator'

export interface PreviewPropostaCarregadorDocumentoProps {
  dados: SalvarPropostaCarregadorInput
  editavel?: boolean
  onChangeField?: <K extends keyof SalvarPropostaCarregadorInput>(
    field: K,
    val: SalvarPropostaCarregadorInput[K],
  ) => void
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

  const cPropMin = dados.custo_proprio_min ?? 18
  const cPropMax = dados.custo_proprio_max ?? 25
  const cPubMin = dados.custo_publico_min ?? 70
  const cPubMax = dados.custo_publico_max ?? 90

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

  const vMateriais = Number(dados.valor_estacao_materiais ?? 5950)
  const vServicos = Number(dados.valor_servicos_engenharia ?? 2450)
  const vTotal = Number(dados.valor_total ?? vMateriais + vServicos)

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
      className="max-w-[960px] mx-auto bg-white border border-slate-200 rounded-lg shadow-sm print:shadow-none print:border-none p-8 sm:p-12 text-slate-900 font-sans print:m-0 print:p-0 print:max-w-full"
      style={{
        fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
      }}
    >
      {/* 1. CABEÇALHO */}
      <header className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-7 mb-7 gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-slate-900">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-[#047857]"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>DELFOS ENGENHARIA</span>
          </div>
          <div className="text-[13px] text-slate-600 leading-snug">
            <strong>Delfos Engenharia Ltda</strong> • CNPJ: 21.379.952/0001-38
            <br />
            Erechim – RS • Soluções em Engenharia Elétrica &amp; Eletromobilidade
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

      {/* 4. PROJEÇÃO DE ECONOMIA */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          2. Projeção de Economia: Ponto Próprio vs. Posto Público
        </h2>
        <p className="text-xs text-slate-600 mb-3">
          *Valores médios de referência para consumo de 16 a 18 kWh a cada 100 km rodados em
          veículos elétricos médios (tarifa de energia local vs. tarifas de operadores de recarga
          rápida comercial):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card Recarga Própria */}
          <div className="border border-[#a7f3d0] bg-[#f0fdf4] rounded-md p-4 sm:p-5 relative">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#047857] mb-1">
              Recarga Própria (Wallbox Delfos)
            </div>
            <div className="text-2xl font-extrabold text-[#047857] tracking-tight">
              {editavel && onChangeField ? (
                <span className="inline-flex items-center gap-1">
                  R${' '}
                  <input
                    type="number"
                    value={cPropMin}
                    onChange={(e) => onChangeField('custo_proprio_min', Number(e.target.value))}
                    className="w-16 bg-white border border-emerald-300 rounded px-1 text-lg font-bold"
                  />
                  <span>a R$</span>
                  <input
                    type="number"
                    value={cPropMax}
                    onChange={(e) => onChangeField('custo_proprio_max', Number(e.target.value))}
                    className="w-16 bg-white border border-emerald-300 rounded px-1 text-lg font-bold"
                  />
                </span>
              ) : (
                `R$ ${cPropMin} a R$ ${cPropMax}`
              )}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Custo médio estimado a cada 100 km rodados (tarifa concessionária ou solar)
            </div>
          </div>

          {/* Card Eletroposto Público */}
          <div className="border border-slate-200 bg-white rounded-md p-4 sm:p-5 relative">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Eletroposto Público / Rápido Comercial
            </div>
            <div className="text-2xl font-extrabold text-slate-600 tracking-tight">
              {editavel && onChangeField ? (
                <span className="inline-flex items-center gap-1">
                  R${' '}
                  <input
                    type="number"
                    value={cPubMin}
                    onChange={(e) => onChangeField('custo_publico_min', Number(e.target.value))}
                    className="w-16 bg-slate-50 border border-slate-300 rounded px-1 text-lg font-bold"
                  />
                  <span>a R$</span>
                  <input
                    type="number"
                    value={cPubMax}
                    onChange={(e) => onChangeField('custo_publico_max', Number(e.target.value))}
                    className="w-16 bg-slate-50 border border-slate-300 rounded px-1 text-lg font-bold"
                  />
                </span>
              ) : (
                `R$ ${cPubMin} a R$ ${cPubMax}`
              )}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Custo médio cobrado por aplicativos e hubs de carregamento por 100 km
            </div>
          </div>

          {/* Badge de Destaque */}
          <div className="sm:col-span-2 bg-[#ecfdf5] border border-dashed border-[#047857] rounded-md p-3.5 flex items-center gap-3 text-sm font-semibold text-[#047857]">
            <Check className="w-5 h-5 shrink-0 text-[#047857] stroke-[2.5]" />
            <span>
              <strong>Economia de até 4x no custo por quilômetro:</strong> o investimento no
              carregador próprio se amortiza com a economia mensal em combustível e tempo de
              deslocamento.
            </span>
          </div>
        </div>
      </section>

      {/* 5. MODELOS DE CARREGADOR DISPONÍVEIS */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          3. Modelos de Carregador Disponíveis
        </h2>

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
          *Tempo estimado em função da capacidade interna do inversor onboard do veículo. Ambos os
          modelos incluem conector padrão Tipo 2 (Tipo Mennekes) com cabo integrado de 5 metros.
        </div>
      </section>

      {/* 6. ESCOPO TÉCNICO DA ENGENHARIA DE INSTALAÇÃO */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          4. Escopo Técnico da Engenharia de Instalação
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

      {/* 7. INVESTIMENTO & CONDIÇÕES COMERCIAIS */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-2 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          5. Investimento &amp; Condições Comerciais
        </h2>

        <div className="overflow-x-auto border border-slate-200 rounded-md mt-2">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-900 text-xs uppercase font-bold tracking-wider">
                <th className="p-3 w-[60%]">Descrição dos Itens / Serviços</th>
                <th className="p-3 w-[15%] text-center">Quantidade</th>
                <th className="p-3 w-[25%] text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3">
                  <strong className="text-slate-900">
                    Estação de Recarga Wallbox + Materiais Elétricos de Proteção
                  </strong>
                  <br />
                  <span className="text-xs text-slate-600">
                    Carregador com cabo Tipo 2, quadro dedicado, disjuntor, DR Tipo A, DPS e
                    cabeamento de interligação até 15 metros.
                  </span>
                </td>
                <td className="p-3 text-center text-slate-700">1 un / lote</td>
                <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {editavel && onChangeField ? (
                    <input
                      type="number"
                      value={vMateriais}
                      onChange={(e) => {
                        const m = Number(e.target.value)
                        onChangeField('valor_estacao_materiais', m)
                        onChangeField('valor_total', m + vServicos)
                      }}
                      className="w-28 bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-bold px-1 py-0.5 rounded text-right focus:outline-none"
                    />
                  ) : (
                    formatCurrency(vMateriais)
                  )}
                </td>
              </tr>

              <tr>
                <td className="p-3">
                  <strong className="text-slate-900">
                    Serviços Técnicos Especializados de Engenharia Delfos
                  </strong>
                  <br />
                  <span className="text-xs text-slate-600">
                    Montagem, cabeamento, aterramento, testes elétricos, comissionamento e emissão
                    de ART/CREA-RS.
                  </span>
                </td>
                <td className="p-3 text-center text-slate-700">1 serviço</td>
                <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {editavel && onChangeField ? (
                    <input
                      type="number"
                      value={vServicos}
                      onChange={(e) => {
                        const s = Number(e.target.value)
                        onChangeField('valor_servicos_engenharia', s)
                        onChangeField('valor_total', vMateriais + s)
                      }}
                      className="w-28 bg-amber-50 border-b border-dashed border-amber-600 text-amber-950 font-bold px-1 py-0.5 rounded text-right focus:outline-none"
                    />
                  ) : (
                    formatCurrency(vServicos)
                  )}
                </td>
              </tr>

              <tr className="bg-[#f8fafc] border-t-2 border-slate-900 font-extrabold">
                <td className="p-3 text-slate-900 text-base">INVESTIMENTO TOTAL</td>
                <td className="p-3 text-center text-slate-500">—</td>
                <td className="p-3 text-right text-lg text-[#047857] whitespace-nowrap">
                  {editavel && onChangeField ? (
                    <input
                      type="number"
                      value={vTotal}
                      onChange={(e) => onChangeField('valor_total', Number(e.target.value))}
                      className="w-32 bg-amber-50 border-b border-dashed border-amber-600 text-[#047857] font-extrabold px-1 py-0.5 rounded text-right focus:outline-none"
                    />
                  ) : (
                    formatCurrency(vTotal)
                  )}
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

      {/* 8. PRAZOS, GARANTIAS & PREMISSAS */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          6. Prazos, Garantia &amp; Premissas de Instalação
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

      {/* 9. RESPONSABILIDADE TÉCNICA */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          7. Responsabilidade Técnica
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

      {/* 10. PRÓXIMOS PASSOS PARA ATIVAÇÃO */}
      <section className="mb-8 print:break-inside-avoid">
        <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3 pb-1 border-b border-slate-200">
          <span className="w-1 h-4 bg-[#047857] rounded-xs inline-block" />
          8. Próximos Passos para Ativação
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

      {/* 11. ASSINATURAS */}
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

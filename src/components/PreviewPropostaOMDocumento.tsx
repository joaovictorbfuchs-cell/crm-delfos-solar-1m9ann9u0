import React, { useState } from 'react'
import {
  FileText,
  Printer,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Calendar,
  Award,
  Zap,
  TrendingDown,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { DelfosLogo } from '@/components/DelfosLogo'
import { ConteudoPropostaOM, normalizarConteudoPropostaOM } from '@/lib/conteudoPropostaOM'
import { PropostaPDFInput } from '@/lib/propostaOMGenerator'
import { OMPlanoTipo } from '@/types/crm'

export interface PreviewPropostaOMDocumentoProps {
  dados: PropostaPDFInput
  conteudo?: Partial<ConteudoPropostaOM> | null
  planoSelecionado?: OMPlanoTipo | ''
  onSelecionarPlano?: (plano: OMPlanoTipo) => void
  onUpdateConteudo?: (caminho: string, valor: string) => void
  modoEdicao?: boolean
  className?: string
  onImprimir?: () => void
}

export const PreviewPropostaOMDocumento: React.FC<PreviewPropostaOMDocumentoProps> = ({
  dados,
  conteudo,
  planoSelecionado,
  onSelecionarPlano,
  onUpdateConteudo,
  modoEdicao = false,
  className = '',
  onImprimir,
}) => {
  const c = normalizarConteudoPropostaOM(conteudo)
  const { cliente, tecnico, parametros, calculos } = dados

  const planoAtivo: OMPlanoTipo = (planoSelecionado ||
    parametros.planoEscolhido ||
    'Completo') as OMPlanoTipo

  const formatBRL = (val?: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatDateBR = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date()
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Cálculos dinâmicos
  const geracaoAnual = (tecnico.geracaoMediaKwh || 0) * 12
  const valorAnualBruto = geracaoAnual * (parametros.valorKwh || 0)

  // Custo anual do plano completo vs receita bruta
  const custoAnualCompleto = (calculos.planos.Completo?.mensal || 0) * 12
  const percentualCustoBruto =
    valorAnualBruto > 0 ? (custoAnualCompleto / valorAnualBruto) * 100 : 0

  return (
    <div
      className={`proposta-om-documento bg-white text-gray-900 font-sans shadow-lg rounded-2xl border border-gray-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 max-w-4xl mx-auto ${className}`}
    >
      {/* Barra de Ações Superior (Não impressa) */}
      <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
            O&amp;M
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Proposta Comercial O&amp;M Delfos Solar
            </div>
            <div className="text-[11px] text-slate-300">
              {cliente.nome} • Usina {tecnico.potenciaKwp.toFixed(2)} kWp (
              {tecnico.municipio || 'Erechim/RS'})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onImprimir ? (
            <button
              type="button"
              onClick={onImprimir}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo do Documento */}
      <div className="p-6 sm:p-10 space-y-8 bg-white print:p-4 print:space-y-6">
        {/* CABEÇALHO DO DOCUMENTO COM LOGO DELFOS */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-emerald-600/20">
          <div className="flex items-center gap-4">
            <div className="w-28 sm:w-36 shrink-0">
              <DelfosLogo className="w-full h-auto" />
            </div>
            <div className="border-l-2 border-gray-200 pl-4 py-1">
              <h1 className="text-base sm:text-lg font-black text-emerald-950 uppercase tracking-tight leading-tight">
                Gestão &amp; Manutenção de Usinas
              </h1>
              <p className="text-xs text-emerald-700 font-semibold tracking-wide">
                Delfos Engenharia Solar • Excelência em O&amp;M
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-[11px] uppercase tracking-wide">
              {c.secao1.badgeEmissao || 'Documento Oficial'}
            </span>
            <span className="text-gray-500 text-[11px] mt-1.5 font-medium">
              Emissão: <strong className="text-gray-800">{formatDateBR(dados.dataEmissao)}</strong>
            </span>
            {dados.autor && (
              <span className="text-gray-400 text-[10px]">Elaborado por: {dados.autor}</span>
            )}
          </div>
        </header>

        {/* 1. DADOS GERAIS E IDENTIFICAÇÃO TÉCNICA */}
        <section id="secao-1-dados" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                {c.secao1.titulo}
              </h2>
              <p className="subtitulo text-[11px] text-gray-500 font-medium">
                {c.secao1.subtitulo}
              </p>
            </div>
          </div>

          {/* Dois Quadros Lado a Lado: Cliente e Usina */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quadro 1: Dados do Cliente */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-gray-200 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Dados do Cliente
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded font-semibold">
                  Cadastrado
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Razão Social / Nome:</span>
                  <span className="font-bold text-gray-900 text-right">{cliente.nome}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">CNPJ / CPF:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {cliente.cpfOuCnpj || 'Não informado'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Município / UF:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {cliente.municipio || 'Erechim / RS'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Endereço:</span>
                  <span className="font-semibold text-gray-800 text-right truncate max-w-[220px]">
                    {cliente.endereco || 'Endereço da usina'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Telefone:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {cliente.telefone || '(54) 99129-2121'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">E-mail:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {cliente.email || 'contato@cliente.com'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quadro 2: Dados Técnicos da Usina */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-gray-200 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  Dados Técnicos da Usina
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded font-semibold">
                  Ativo em Operação
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Potência Total:</span>
                  <span className="font-extrabold text-emerald-700 text-right">
                    {tecnico.potenciaKwp.toFixed(2)} kWp
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Geração Estimada:</span>
                  <span className="font-bold text-gray-900 text-right">
                    {tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mês
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Inversor:</span>
                  <span className="font-semibold text-gray-800 text-right truncate max-w-[200px]">
                    {tecnico.marcaInversores || 'Inversores homologados'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Módulos:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {tecnico.numeroModulos
                      ? `${tecnico.numeroModulos} unidades`
                      : 'Conforme projeto'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Tipo de Instalação:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {tecnico.tipoInstalacao || 'Telhado Metálico/Cerâmico'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Tarifa Base:</span>
                  <span className="font-extrabold text-emerald-800 text-right">
                    {formatBRL(parametros.valorKwh)} / kWh
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Destaque de Valor Anual Gerado & Citação */}
          <div className="bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-teal-50 rounded-xl p-4 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-gray-600 block text-[11px]">
                  {c.secao1.cardAnualDestaquePrefixo}{' '}
                  <strong className="text-emerald-950 text-sm font-black">
                    {formatBRL(valorAnualBruto)}
                  </strong>{' '}
                  {c.secao1.cardAnualDestaqueSufixo}
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold">
                  (Base: {geracaoAnual.toLocaleString('pt-BR')} kWh/ano ×{' '}
                  {formatBRL(parametros.valorKwh)}/kWh)
                </span>
              </div>
            </div>

            <div className="sm:max-w-md bg-white/80 p-2.5 rounded-lg border border-emerald-200/80 text-[11px] text-emerald-900 italic font-medium leading-relaxed citacao-destaque">
              {c.secao1.citacaoDestaque}
            </div>
          </div>
        </section>

        {/* 2. CENÁRIOS DE EXPOSIÇÃO FINANCEIRA */}
        <section id="secao-2-cenarios" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                {c.secao2.titulo}
              </h2>
              <p className="subtitulo text-[11px] text-gray-500 font-medium">
                {c.secao2.subtitulo}
              </p>
            </div>
          </div>

          {/* 4 Cartões: Ativo Protegido, Perda 15%, Perda 20%, Prejuízo 30 dias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Ativo Protegido */}
            <div className="bg-emerald-50/60 border-2 border-emerald-400 rounded-xl p-3.5 text-center flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {c.secao2.tituloCardAtivo}
                </span>
                <div className="text-lg font-black text-emerald-700 mt-1">
                  {formatBRL(calculos.valorAtivoProtegido)}
                </div>
                <div className="text-[10px] text-emerald-900 font-semibold">/mês pleno</div>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[10px] text-gray-600">
                {c.secao2.subtituloCardAtivo} •{' '}
                <strong>{formatBRL(calculos.valorAtivoProtegido * 12)}/ano</strong>
              </div>
            </div>

            {/* Card 2: Perda 15% Sujidade */}
            <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-3.5 text-center flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-900 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                  {c.secao2.tituloCardPerda15}
                </span>
                <div className="text-lg font-black text-amber-700 mt-1">
                  - {formatBRL(calculos.perda15Ano)}
                </div>
                <div className="text-[10px] text-amber-900 font-semibold">prejuízo anual</div>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200/60 text-[10px] text-gray-600">
                {c.secao2.subtituloCardPerda15} (poeira e fuligem)
              </div>
            </div>

            {/* Card 3: Perda 20% Sem Prevenção */}
            <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-3.5 text-center flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-900 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  {c.secao2.tituloCardPerda20}
                </span>
                <div className="text-lg font-black text-amber-800 mt-1">
                  - {formatBRL(calculos.perda20Ano)}
                </div>
                <div className="text-[10px] text-amber-900 font-semibold">degradação/ano</div>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200/60 text-[10px] text-gray-600">
                {c.secao2.subtituloCardPerda20} (conexões frouxas/hotspots)
              </div>
            </div>

            {/* Card 4: Falha 30 dias */}
            <div className="bg-red-50/60 border-2 border-red-300 rounded-xl p-3.5 text-center flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-900 mb-1">
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  {c.secao2.tituloCardFalha30}
                </span>
                <div className="text-lg font-black text-red-600 mt-1">
                  - {formatBRL(calculos.prejuizo30Dias)}
                </div>
                <div className="text-[10px] text-red-900 font-semibold">1 mês parado</div>
              </div>
              <div className="mt-2 pt-2 border-t border-red-200/60 text-[10px] text-gray-600">
                {c.secao2.subtituloCardFalha30}
              </div>
            </div>
          </div>

          {/* Faixa "Atenção ao risco oculto" */}
          <div className="faixa-risco-oculto bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-3 text-xs text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium m-0">{c.secao2.avisoRiscoOculto}</p>
          </div>
        </section>

        {/* 3. QUAL PLANO ELIMINA CADA CENÁRIO (Tabela) */}
        <section id="secao-3-tabela" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                {c.secao3.titulo}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Matriz de risco coberta pelas soluções Delfos de O&amp;M
              </p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-gray-200 text-gray-800 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3 w-1/3">{c.secao3.colunaCenario}</th>
                  <th className="p-3 w-1/4 text-center">Plano que Elimina</th>
                  <th className="p-3">{c.secao3.colunaCobertura}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {c.secao3.linhas.map((l, idx) => (
                  <tr key={l.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="col-cenario p-3 font-semibold text-gray-900">{l.cenario}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {l.planoSelo}
                      </span>
                    </td>
                    <td className="col-cobertura p-3 text-gray-700">{l.cobertura}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. MODALIDADES DE PLANOS DE O&M (3 Cartões) */}
        <section id="secao-4-planos" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                  {c.secao4.titulo}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  Valores calculados pelo motor de O&amp;M para usina de{' '}
                  {tecnico.potenciaKwp.toFixed(2)} kWp
                </p>
              </div>
            </div>

            {planoAtivo && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300">
                Plano Vigente: <strong>{planoAtivo}</strong>
              </span>
            )}
          </div>

          {/* 3 Cartões lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PLANO 1: ESSENCIAL */}
            <div
              className={`rounded-2xl p-5 border-2 flex flex-col justify-between transition-all ${
                planoAtivo === 'Essencial'
                  ? 'border-emerald-600 bg-emerald-50/30 shadow-md ring-2 ring-emerald-600/20'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                    Plano Essencial
                  </h3>
                  {calculos.planos.Essencial?.isNegociado && (
                    <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                      Negociado
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-2xl font-black text-emerald-700">
                    {formatBRL(calculos.planos.Essencial?.mensal)}
                    <span className="text-xs text-gray-500 font-bold ml-1">/mês</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    Investimento anual:{' '}
                    <strong>{formatBRL(calculos.planos.Essencial?.anual)}</strong>
                  </div>
                </div>

                <ul className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-700">
                  {c.secao4.beneficiosEssencial.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => onSelecionarPlano && onSelecionarPlano('Essencial')}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    planoAtivo === 'Essencial'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {planoAtivo === 'Essencial' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{c.secao4.botaoTextoSelecionado}</span>
                    </>
                  ) : (
                    <span>{c.secao4.botaoTextoSelecionar}</span>
                  )}
                </button>
              </div>
            </div>

            {/* PLANO 2: INSPEÇÃO */}
            <div
              className={`rounded-2xl p-5 border-2 flex flex-col justify-between transition-all ${
                planoAtivo === 'Inspeção'
                  ? 'border-emerald-600 bg-emerald-50/30 shadow-md ring-2 ring-emerald-600/20'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                    Plano Inspeção
                  </h3>
                  {calculos.planos.Inspeção?.isNegociado && (
                    <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                      Negociado
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-2xl font-black text-emerald-700">
                    {formatBRL(calculos.planos.Inspeção?.mensal)}
                    <span className="text-xs text-gray-500 font-bold ml-1">/mês</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    Investimento anual:{' '}
                    <strong>{formatBRL(calculos.planos.Inspeção?.anual)}</strong>
                  </div>
                </div>

                <ul className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-700">
                  {c.secao4.beneficiosInspecao.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => onSelecionarPlano && onSelecionarPlano('Inspeção')}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    planoAtivo === 'Inspeção'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {planoAtivo === 'Inspeção' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{c.secao4.botaoTextoSelecionado}</span>
                    </>
                  ) : (
                    <span>{c.secao4.botaoTextoSelecionar}</span>
                  )}
                </button>
              </div>
            </div>

            {/* PLANO 3: COMPLETO (RECOMENDADO DELFOS) */}
            <div
              className={`rounded-2xl p-5 border-2 flex flex-col justify-between relative transition-all ${
                planoAtivo === 'Completo'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-lg ring-2 ring-emerald-600/30'
                  : 'border-emerald-500 bg-emerald-50/20 hover:border-emerald-600'
              }`}
            >
              {/* Selo RECOMENDADO DELFOS */}
              <div className="selo-recomendado absolute -top-3 right-4 bg-emerald-800 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-md tracking-wider">
                {c.secao4.seloRecomendado}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wide">
                    Plano Completo
                  </h3>
                  {calculos.planos.Completo?.isNegociado && (
                    <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                      Negociado
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-2xl font-black text-emerald-800">
                    {formatBRL(calculos.planos.Completo?.mensal)}
                    <span className="text-xs text-gray-600 font-bold ml-1">/mês</span>
                  </div>
                  <div className="text-[11px] text-emerald-900 font-semibold">
                    Investimento anual:{' '}
                    <strong>{formatBRL(calculos.planos.Completo?.anual)}</strong>
                  </div>
                </div>

                <ul className="space-y-2 pt-2 border-t border-emerald-200/60 text-xs text-gray-800 font-medium">
                  {c.secao4.beneficiosCompleto.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 mt-4 border-t border-emerald-200/60">
                <button
                  type="button"
                  onClick={() => onSelecionarPlano && onSelecionarPlano('Completo')}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    planoAtivo === 'Completo'
                      ? 'bg-emerald-700 text-white shadow-md hover:bg-emerald-800'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {planoAtivo === 'Completo' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{c.secao4.botaoTextoSelecionado}</span>
                    </>
                  ) : (
                    <span>{c.secao4.botaoTextoSelecionar}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 5. PADRÕES TÉCNICOS E CREDIBILIDADE */}
        <section id="secao-5-padroes" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              5
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                {c.secao5.titulo}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Conformidade com normas de engenharia e certificações oficiais
              </p>
            </div>
          </div>

          <div className="grid-padroes grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {c.secao5.itens.map((it, idx) => (
              <div
                key={it.id || idx}
                className="card-padrao bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-1.5"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">{it.titulo}</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed m-0">{it.descricao}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. NÍVEIS DE SERVIÇO (SLA) & COMPROMISSOS */}
        <section id="secao-6-sla" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              6
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                {c.secao6.titulo}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Compromissos contratuais de agilidade e transparência
              </p>
            </div>
          </div>

          <div className="grid-sla grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {c.secao6.itens.map((it, idx) => (
              <div
                key={it.id || idx}
                className="card-sla bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-1.5"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">{it.titulo}</h4>
                <p className="text-[11px] text-gray-600 leading-relaxed m-0">{it.descricao}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. CONDIÇÕES CONTRATUAIS & VIGÊNCIA */}
        <section id="secao-7-condicoes" className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              7
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                {c.secao7.titulo}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Cláusulas gerais e regras de prestação contínua
              </p>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-gray-200 border-l-4 border-l-emerald-600 rounded-xl p-4">
            <ul className="lista-condicoes space-y-2 text-xs text-gray-700 list-none p-0 m-0">
              {c.secao7.itens.map((it, idx) => (
                <li key={it.id || idx} className="item-condicao flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <div>
                    <strong className="text-gray-900">{it.titulo}:</strong>{' '}
                    <span className="desc text-gray-600">{it.descricao}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 8. ACEITE COMERCIAL E CONTRATAÇÃO */}
        <section id="secao-8-aceite" className="space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              8
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                {c.secao8.titulo}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Passos para ativação do contrato de O&amp;M e bloco de assinaturas
              </p>
            </div>
          </div>

          {/* 3 Passos Numerados */}
          <div className="grid-passos grid grid-cols-1 sm:grid-cols-3 gap-3">
            {c.secao8.passos.map((p, idx) => (
              <div
                key={idx}
                className="passo-item bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 space-y-1"
              >
                <div className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                  Passo {p.numero}
                </div>
                <strong className="text-xs text-gray-900 block">{p.titulo}</strong>
                <p className="text-[11px] text-gray-600 leading-snug m-0">{p.descricao}</p>
              </div>
            ))}
          </div>

          {/* Termo de Aceite com Valores da Proposta */}
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Termo de Aceite &amp; Autorização de Minuta
            </div>
            <p className="termo-aceite-texto text-xs text-gray-700 leading-relaxed m-0">
              {c.secao8.textoTermoAceite}
            </p>

            <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-gray-500">Plano Escolhido:</span>{' '}
                <strong className="text-emerald-800 uppercase font-black">{planoAtivo}</strong>
              </div>
              <div>
                <span className="text-gray-500">Mensalidade:</span>{' '}
                <strong className="text-gray-900 font-black">
                  {formatBRL(calculos.planos[planoAtivo]?.mensal)}/mês
                </strong>
              </div>
              <div>
                <span className="text-gray-500">Investimento Anual:</span>{' '}
                <strong className="text-gray-900 font-black">
                  {formatBRL(calculos.planos[planoAtivo]?.anual)}
                </strong>
              </div>
            </div>
          </div>

          {/* Bloco de Assinaturas */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            {/* Assinatura Contratante */}
            <div className="text-center space-y-1.5">
              <div className="border-b border-gray-400 w-4/5 mx-auto mb-2 pt-8" />
              <div className="font-bold text-gray-900">{cliente.nome}</div>
              <div className="text-[11px] text-gray-500">
                CPF/CNPJ: {cliente.cpfOuCnpj || 'De acordo'}
              </div>
              <div className="text-[10px] text-gray-400">Data: ____/____/________</div>
            </div>

            {/* Assinatura Contratada Delfos */}
            <div className="text-center space-y-1.5">
              <div className="border-b border-gray-400 w-4/5 mx-auto mb-2 pt-8" />
              <div className="font-bold text-emerald-950">DELFOS ENGENHARIA SOLAR</div>
              <div className="cargo-delfos text-[11px] text-emerald-800 font-semibold">
                {c.secao8.responsavelDelfosCargo}
              </div>
              <div className="text-[10px] text-gray-500">
                CNPJ {c.secao8.cnpjDelfos} • Erechim/RS
              </div>
            </div>
          </div>
        </section>

        {/* RODAPÉ OFICIAL DA DELFOS SOLAR (Mesmo da proposta solar) */}
        <footer id="rodape-oficial" className="pt-6 border-t border-gray-200">
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-center space-y-1.5 text-xs text-gray-600">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-extrabold text-gray-900">{c.rodape.empresaNome}</span>
              <span className="text-gray-400">•</span>
              <span>CNPJ {c.rodape.cnpj}</span>
              <span className="text-gray-400">•</span>
              <span>📞 {c.rodape.telefone}</span>
              <span className="text-gray-400">•</span>
              <span className="text-emerald-700 font-semibold">🌐 {c.rodape.site}</span>
            </div>
            <div className="text-[11px] text-gray-500">📍 {c.rodape.endereco}</div>
            <div className="rodape-validade text-[11px] font-bold text-emerald-700 pt-0.5">
              {c.rodape.textoValidade}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default PreviewPropostaOMDocumento

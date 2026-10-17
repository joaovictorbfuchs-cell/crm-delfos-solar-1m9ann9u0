import React from 'react'
import {
  Award,
  CheckCircle2,
  Download,
  Phone,
  Printer,
  Share2,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react'
import { delfosLogoAsset } from '@/components/DelfosLogo'
import { ConteudoPropostaOM, normalizarConteudoPropostaOM } from '@/lib/conteudoPropostaOM'
import { PropostaPDFInput } from '@/lib/propostaOMGenerator'
import { OMPlanoTipo } from '@/types/crm'
import { normalizarNomePlanoOM } from '@/lib/planosOM'

export interface PreviewPropostaOMDocumentoProps {
  dados: PropostaPDFInput
  conteudo?: Partial<ConteudoPropostaOM> | null
  planoSelecionado?: OMPlanoTipo | ''
  onSelecionarPlano?: (plano: OMPlanoTipo) => void
  onUpdateConteudo?: (caminho: string, valor: string) => void
  modoEdicao?: boolean
  onAceitarPlano?: () => void
  isSubmitting?: boolean
  aceiteRegistrado?: boolean
  className?: string
  onImprimir?: () => void
  onEnviarLink?: () => void
  onEnviarPdf?: () => void
  somenteLeitura?: boolean
  statusProposta?: string
  coletaAceiteCliente?: boolean
  aceiteNome?: string
  onAceiteNomeChange?: (value: string) => void
  aceiteDocumento?: string
  onAceiteDocumentoChange?: (value: string) => void
  aceiteConfirmado?: boolean
  onAceiteConfirmadoChange?: (value: boolean) => void
  onAprovarProposta?: () => void
  onGerarContrato?: () => void
  onElaborarProcuracao?: () => void
}

const formatarBRL = (valor?: number) =>
  (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatarData = (valor?: string) => {
  const data = valor ? new Date(valor) : new Date()
  return Number.isNaN(data.getTime())
    ? '—'
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const CabecalhoSecao: React.FC<{ numero: number; titulo: string; subtitulo?: string }> = ({
  numero,
  titulo,
  subtitulo,
}) => (
  <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
      {numero}
    </div>
    <div>
      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">{titulo}</h2>
      {subtitulo && <p className="text-[11px] text-gray-500 font-medium">{subtitulo}</p>}
    </div>
  </div>
)

const LinhaInformacao: React.FC<{ rotulo: string; valor?: string; destaque?: boolean }> = ({
  rotulo,
  valor,
  destaque,
}) => (
  <div className="flex justify-between gap-3 text-xs">
    <span className="text-gray-500 shrink-0">{rotulo}</span>
    <span className={`text-right font-semibold ${destaque ? 'text-emerald-800' : 'text-gray-800'}`}>
      {valor || 'Não informado'}
    </span>
  </div>
)

export const PreviewPropostaOMDocumento: React.FC<PreviewPropostaOMDocumentoProps> = ({
  dados,
  conteudo,
  planoSelecionado,
  onSelecionarPlano,
  onAceitarPlano,
  isSubmitting = false,
  aceiteRegistrado = false,
  className = '',
  onImprimir,
  onEnviarLink,
  onEnviarPdf,
  somenteLeitura = false,
  statusProposta,
  coletaAceiteCliente = false,
  aceiteNome = '',
  onAceiteNomeChange,
  aceiteDocumento = '',
  onAceiteDocumentoChange,
  aceiteConfirmado = false,
  onAceiteConfirmadoChange,
  onAprovarProposta,
  onGerarContrato,
  onElaborarProcuracao,
}) => {
  const c = normalizarConteudoPropostaOM(conteudo)
  const { cliente, tecnico, parametros, calculos } = dados
  const planoAtivo = normalizarNomePlanoOM(
    planoSelecionado || parametros.planoEscolhido || 'Completo',
  )
  const dataEmissao = dados.dataEmissao || new Date().toISOString()
  const dataValidade = new Date(dataEmissao)
  dataValidade.setDate(dataValidade.getDate() + (c.rodape.validadeDias || 5))
  const geracaoAnual = (tecnico.geracaoMediaKwh || 0) * 12
  const valorAnualBruto = geracaoAnual * (parametros.valorKwh || 0)
  const numeroProposta =
    dados.numeroProposta ||
    (dados.referenciaProposta && !/^[a-z0-9]{15}$/i.test(dados.referenciaProposta)
      ? dados.referenciaProposta
      : '') ||
    'Em elaboração'
  const negocioTitulo = dados.negocioTitulo?.trim() || ''

  const planos = [
    {
      chave: 'Essencial' as const,
      titulo: 'Plano Essencial',
      beneficios: c.secao4.beneficiosEssencial,
      calculo: calculos.planos.Essencial,
    },
    {
      chave: 'Inspeção' as const,
      titulo: 'Plano Inspeção',
      beneficios: c.secao4.beneficiosInspecao,
      calculo: calculos.planos.Inspeção,
    },
    {
      chave: 'Completo' as const,
      titulo: 'Plano Completo',
      beneficios: c.secao4.beneficiosCompleto,
      calculo: calculos.planos.Completo,
      recomendado: true,
    },
  ]

  const handleImprimir = () => {
    // Impressão direta na própria página: o bloco @media print deste componente
    // isola o documento (esconde o restante da tela), então o PDF sai idêntico
    // ao preview, sem janela intermediária nem cópia de estilos.
    window.print()
  }

  const beneficiosDoPlano = (itens: string[]) =>
    itens.map((item) =>
      item.replace(
        '{numeroModulos}',
        tecnico.numeroModulos ? String(tecnico.numeroModulos) : 'conforme projeto',
      ),
    )

  return (
    <div
      className={`proposta-om-documento bg-white text-gray-900 font-sans shadow-lg rounded-2xl border border-gray-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 max-w-4xl mx-auto ${className}`}
    >
      <style>{`@page { size: A4; margin: 12mm; }
        @media print {
          html, body { width: 100% !important; height: auto !important; overflow: visible !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .proposta-om-documento, .proposta-om-documento * { visibility: visible !important; }
          .proposta-om-documento { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; height: auto !important; max-height: none !important; overflow: visible !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .proposta-om-documento .no-print { display: none !important; }
          .proposta-om-documento section, .proposta-om-documento footer { break-inside: avoid-page !important; page-break-inside: avoid !important; }
          .proposta-om-documento #secao-4-escopo { break-before: page !important; page-break-before: always !important; }        }`}</style>

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onAprovarProposta &&
            !['aprovada', 'aprovado'].includes((statusProposta || '').toLowerCase()) && (
              <button
                type="button"
                onClick={onAprovarProposta}
                disabled={isSubmitting}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar proposta</span>
              </button>
            )}

          {['aprovada', 'aprovado'].includes((statusProposta || '').toLowerCase()) && (
            <>
              {onGerarContrato && (
                <button
                  type="button"
                  onClick={onGerarContrato}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Gerar contrato O&amp;M</span>
                </button>
              )}
              {onElaborarProcuracao && (
                <button
                  type="button"
                  onClick={onElaborarProcuracao}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <Award className="w-4 h-4" />
                  <span>Elaborar procuração</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onImprimir || handleImprimir}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
          {onEnviarLink && (
            <button
              type="button"
              onClick={onEnviarLink}
              disabled={isSubmitting}
              className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-60"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar link (WhatsApp)</span>
            </button>
          )}
          {onEnviarPdf && (
            <button
              type="button"
              onClick={onEnviarPdf}
              disabled={isSubmitting}
              className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>Enviar proposta PDF (WhatsApp)</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-10 space-y-7 bg-white print:p-4 print:space-y-5">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-emerald-600/20">
          <div className="flex items-center gap-4">
            <div className="w-28 sm:w-36 shrink-0">
              <img
                src={delfosLogoAsset}
                alt="Delfos Solar"
                className="block w-full h-auto object-contain"
              />
            </div>
            <div className="border-l-2 border-gray-200 pl-4 py-1">
              <h1 className="text-base sm:text-lg font-black text-emerald-950 uppercase tracking-tight leading-tight">
                Proposta de Gestão e Manutenção de Usinas Fotovoltaicas (O&amp;M)
              </h1>
              <p className="text-xs text-emerald-700 font-semibold tracking-wide">
                Prevenção ativa, aumento de geração e proteção do seu investimento solar.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-[11px] uppercase tracking-wide">
              {c.secao1.badgeEmissao || 'Documento Oficial'}
            </span>
            <span className="text-gray-700 text-[11px] mt-1.5 font-semibold text-right">
              Proposta nº {numeroProposta}
              {negocioTitulo && (
                <span className="block text-[10px] text-emerald-800 font-bold">
                  Negócio: {negocioTitulo}
                </span>
              )}
            </span>
            <span className="text-gray-500 text-[11px] mt-1 font-medium">
              Emissão: <strong className="text-gray-800">{formatarData(dataEmissao)}</strong>
            </span>
            <span className="text-gray-500 text-[11px] font-medium">
              Válida até:{' '}
              <strong className="text-gray-800">{formatarData(dataValidade.toISOString())}</strong>
            </span>
            {dados.autor && (
              <span className="text-gray-400 text-[10px]">Elaborado por: {dados.autor}</span>
            )}
          </div>
        </header>

        <section id="secao-1-dados" className="space-y-4">
          <CabecalhoSecao numero={1} titulo={c.secao1.titulo} subtitulo={c.secao1.subtitulo} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/80 rounded-xl p-4 border border-gray-200 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-[11px] font-bold text-emerald-900 uppercase">
                <User className="w-3.5 h-3.5 text-emerald-600" /> Dados do Cliente
              </div>
              <div className="space-y-1.5">
                <LinhaInformacao rotulo="Razão Social:" valor={cliente.nome} />
                <LinhaInformacao rotulo="CNPJ:" valor={cliente.cpfOuCnpj} />
                <LinhaInformacao
                  rotulo="Município:"
                  valor={cliente.municipio || tecnico.municipio}
                />
                <LinhaInformacao rotulo="Endereço:" valor={cliente.endereco} />
                <LinhaInformacao rotulo="Telefone:" valor={cliente.telefone} />
                <LinhaInformacao rotulo="E-mail:" valor={cliente.email} />
              </div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-4 border border-gray-200 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-[11px] font-bold text-emerald-900 uppercase">
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Dados Técnicos da Usina
              </div>
              <div className="space-y-1.5">
                <LinhaInformacao
                  rotulo="Potência Total:"
                  valor={`${tecnico.potenciaKwp.toLocaleString('pt-BR')} kWp`}
                  destaque
                />
                <LinhaInformacao
                  rotulo="Geração Estimada:"
                  valor={`${tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mês`}
                />
                <LinhaInformacao rotulo="Inversor:" valor={tecnico.marcaInversores} />
                <LinhaInformacao
                  rotulo="Módulos:"
                  valor={
                    tecnico.numeroModulos ? `${tecnico.numeroModulos} unidades` : 'Conforme projeto'
                  }
                />
                <LinhaInformacao rotulo="Tipo de Instalação:" valor={tecnico.tipoInstalacao} />
                <LinhaInformacao
                  rotulo="Tarifa Base:"
                  valor={`${formatarBRL(parametros.valorKwh)} / kWh`}
                  destaque
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-emerald-100">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 lg:items-center">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">
                    Energia bruta estimada da usina
                  </div>
                  <div className="mt-1 text-xs font-medium text-gray-600">
                    {c.secao1.cardAnualDestaquePrefixo}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <strong className="text-2xl sm:text-3xl leading-tight font-black tracking-tight text-emerald-950 tabular-nums">
                      {formatarBRL(valorAnualBruto)}
                    </strong>
                    <span className="text-sm font-extrabold text-emerald-800">/ano</span>
                    <span className="text-xs text-gray-600">
                      {c.secao1.cardAnualDestaqueSufixo}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white/85 px-3.5 py-2.5 lg:min-w-[220px]">
                  <div className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                    Base estimada
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-gray-900 tabular-nums">
                    {geracaoAnual.toLocaleString('pt-BR')} kWh/ano
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-800">
                    × {formatarBRL(parametros.valorKwh)}/kWh
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="secao-2-cenarios" className="space-y-4">
          <CabecalhoSecao numero={2} titulo={c.secao2.titulo} subtitulo={c.secao2.subtitulo} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 text-center shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-wide text-amber-900">
                {c.secao2.tituloCardPerda20}
              </span>
              <div className="text-2xl font-black text-amber-800 mt-1 tabular-nums">
                {formatarBRL(calculos.perda20Ano)}
              </div>
              <div className="text-xs text-amber-900 font-semibold">
                {c.secao2.subtituloCardPerda20}
              </div>
            </div>
            <div className="bg-red-50/80 border border-red-300 rounded-xl p-4 text-center shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-wide text-red-900">
                {c.secao2.tituloCardFalha30}
              </span>
              <div className="text-2xl font-black text-red-700 mt-1 tabular-nums">
                {formatarBRL(calculos.prejuizo30Dias)}
              </div>
              <div className="text-xs text-red-900 font-semibold">
                {c.secao2.subtituloCardFalha30}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-xs leading-relaxed text-amber-950">
            <p>{c.secao2.textoRiscoGarantia}</p>
            <p>{c.secao2.textoEvidenciaSujidade}</p>
            <a
              className="text-[10px] underline font-semibold text-emerald-800 break-words"
              href="https://www.scielo.br/j/ac/a/nYrQWs3y5BHwMLcWT5DvJdd?lang=pt"
              target="_blank"
              rel="noreferrer"
            >
              {c.secao2.fonteEvidenciaSujidade}
            </a>
          </div>
        </section>

        <section id="secao-3-planos" className="space-y-4">
          <CabecalhoSecao
            numero={3}
            titulo={c.secao4.titulo}
            subtitulo="Escolha a modalidade ideal para sua usina"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {planos.map((plano) => {
              const selecionado = planoAtivo === plano.chave
              return (
                <article
                  key={plano.chave}
                  className={`relative rounded-2xl p-5 border-2 flex flex-col justify-between transition-all ${selecionado ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-600/20' : 'border-gray-200 bg-white'} ${plano.recomendado ? 'pt-7' : ''}`}
                >
                  {plano.recomendado && (
                    <span className="absolute -top-3 right-4 bg-emerald-800 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full shadow">
                      {c.secao4.seloRecomendado}
                    </span>
                  )}
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold uppercase text-gray-900">
                      {plano.titulo}
                    </h3>
                    <div className="text-2xl font-black text-emerald-700">
                      {formatarBRL(plano.calculo.mensal)}
                      <span className="text-xs text-gray-500 font-bold ml-1">/mês</span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Investimento anual: <strong>{formatarBRL(plano.calculo.anual)}</strong>
                    </div>
                    <ul className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-700">
                      {beneficiosDoPlano(plano.beneficios).map((beneficio, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{beneficio}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    aria-pressed={selecionado}
                    onClick={() => onSelecionarPlano?.(plano.chave)}
                    className={`no-print mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${selecionado ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {selecionado ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {c.secao4.botaoTextoSelecionado}
                      </>
                    ) : (
                      c.secao4.botaoTextoSelecionar
                    )}
                  </button>
                  <div className="hidden print:block mt-3 text-xs font-semibold text-emerald-800">
                    {selecionado ? 'Plano selecionado ✓' : ''}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section id="secao-4-escopo" className="space-y-4">
          <CabecalhoSecao
            numero={4}
            titulo={c.secaoEscopoTecnico.titulo}
            subtitulo={c.secaoEscopoTecnico.subtitulo}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-slate-50 border border-gray-200 p-4">
            {c.secaoEscopoTecnico.itens.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-xs text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item.texto}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="secao-5-padroes" className="space-y-4">
          <CabecalhoSecao numero={5} titulo={c.secao5.titulo} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {c.secao5.itens.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-2"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-xs font-bold text-gray-900">{item.titulo}</h3>
                <p className="text-[11px] text-gray-600 leading-relaxed m-0">{item.descricao}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="secao-6-condicoes" className="space-y-4">
          <CabecalhoSecao numero={6} titulo={c.secao7.titulo} />
          <div className="bg-slate-50 border border-gray-200 border-l-4 border-l-emerald-600 rounded-xl p-4">
            <ul className="space-y-2 text-xs text-gray-700 list-none p-0 m-0">
              {c.secao7.itens.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>
                    <strong className="text-gray-900">{item.titulo}:</strong> {item.descricao}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="secao-7-aceite" className="space-y-5">
          <CabecalhoSecao
            numero={7}
            titulo={c.secao8.titulo}
            subtitulo="Seleção do plano, aceite preliminar e contratação"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {c.secao8.passos.map((passo) => (
              <div
                key={passo.numero}
                className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1"
              >
                <div className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                  {passo.numero}. {passo.titulo}
                </div>
                <p className="text-[11px] text-gray-600 leading-snug m-0">{passo.descricao}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-xl bg-slate-50 border border-gray-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">
              Selecione o plano desejado para contratação
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {planos.map((plano) => (
                <label
                  key={plano.chave}
                  className={`flex items-start gap-2 rounded-lg border p-3 text-xs cursor-pointer ${planoAtivo === plano.chave ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                >
                  <input
                    className="mt-0.5 accent-emerald-700"
                    type="radio"
                    name="plano-aceite-om"
                    value={plano.chave}
                    checked={planoAtivo === plano.chave}
                    onChange={() => onSelecionarPlano?.(plano.chave)}
                  />
                  <span className="space-y-1">
                    <strong className="block">
                      {plano.titulo}
                      {plano.recomendado ? ' — RECOMENDADO' : ''}
                    </strong>
                    <span className="block">{formatarBRL(plano.calculo.mensal)} / mês</span>
                    <span className="block text-gray-500">
                      {formatarBRL(plano.calculo.anual)} / ano
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-gray-500">Investimento selecionado:</span>{' '}
                <strong className="text-emerald-800 uppercase font-black">
                  Plano {planoAtivo}
                </strong>
              </div>
              <div>
                <strong className="text-gray-900">
                  {formatarBRL(calculos.planos[planoAtivo]?.mensal)}/mês
                </strong>
                <span className="text-gray-500"> • </span>
                <strong>{formatarBRL(calculos.planos[planoAtivo]?.anual)}/ano</strong>
              </div>
            </div>
            {statusProposta && /aprovad/i.test(statusProposta) && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900">
                Esta proposta já foi aprovada no CRM para o Plano {planoAtivo}.
              </div>
            )}
            {coletaAceiteCliente && !somenteLeitura && (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-[11px] font-semibold text-gray-700">
                    Nome completo do responsável
                    <input
                      type="text"
                      autoComplete="name"
                      value={aceiteNome}
                      onChange={(event) => onAceiteNomeChange?.(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Digite seu nome completo"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-gray-700">
                    CPF ou CNPJ do responsável
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={aceiteDocumento}
                      onChange={(event) => onAceiteDocumentoChange?.(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Somente números ou pontuação"
                    />
                  </label>
                </div>
                <label className="flex items-start gap-2 text-[11px] leading-relaxed text-gray-700">
                  <input
                    type="checkbox"
                    checked={aceiteConfirmado}
                    onChange={(event) => onAceiteConfirmadoChange?.(event.target.checked)}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>
                    Li e concordo com os termos desta proposta e autorizo o registro do plano
                    selecionado.
                  </span>
                </label>
              </div>
            )}
            <p className="text-[11px] text-gray-600 leading-relaxed m-0">
              {c.secao8.textoTermoAceite}
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed m-0">
              {c.secao8.termoAutorizacao}
            </p>
            {onAceitarPlano && (
              <div className="no-print flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={onAceitarPlano}
                  disabled={
                    isSubmitting ||
                    aceiteRegistrado ||
                    somenteLeitura ||
                    (coletaAceiteCliente &&
                      (!aceiteNome.trim() || !aceiteDocumento.trim() || !aceiteConfirmado))
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting
                    ? 'Registrando aceite…'
                    : aceiteRegistrado || somenteLeitura
                      ? 'Aceite registrado ✓'
                      : coletaAceiteCliente
                        ? 'Confirmar aceite do plano'
                        : 'De acordo — Quero contratar este plano'}
                </button>
                <span className="text-[10px] text-gray-500">
                  {aceiteRegistrado || somenteLeitura
                    ? 'O aceite foi registrado no CRM. A equipe Delfos enviará o contrato para assinatura.'
                    : coletaAceiteCliente
                      ? 'Após confirmar, o plano e os valores selecionados serão registrados no CRM.'
                      : c.secao8.textoCliqueAceite}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-3 text-xs">
            <div className="text-center space-y-1.5">
              <div className="border-b border-gray-400 w-4/5 mx-auto mb-2 pt-8" />
              <div className="font-bold text-gray-900">{cliente.nome}</div>
              <div className="text-[11px] text-gray-500">
                Nome do Responsável: ____________________
              </div>
              <div className="text-[10px] text-gray-400">
                CPF: ______________ • Data: ____/____/________
              </div>
            </div>
            <div className="text-center space-y-1.5">
              <div className="border-b border-gray-400 w-4/5 mx-auto mb-2 pt-8" />
              <div className="font-bold text-emerald-950">DELFOS ENGENHARIA SOLAR</div>
              <div className="text-[11px] text-emerald-800 font-semibold">
                {c.secao8.responsavelDelfosCargo}
              </div>
              <div className="text-[10px] text-gray-500">CNPJ {c.secao8.cnpjDelfos}</div>
            </div>
          </div>
        </section>

        <footer id="rodape-oficial" className="pt-5 border-t border-gray-200">
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-center space-y-1.5 text-xs text-gray-600">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <strong className="text-gray-900">{c.rodape.empresaNome}</strong>
              <span>•</span>
              <span>CNPJ {c.rodape.cnpj}</span>
              <span>•</span>
              <span>
                <Phone className="inline w-3 h-3" /> {c.rodape.telefone}
              </span>
              <span>•</span>
              <span>{c.rodape.site}</span>
            </div>
            <div className="text-[11px]">{c.rodape.endereco}</div>
            <div className="text-[10px] text-gray-500">
              {cliente.email ? `Contato: ${cliente.email} • ` : ''}
              {cliente.telefone || ''}
            </div>
            <div className="text-[11px] font-bold text-emerald-700">{c.rodape.textoValidade}</div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default PreviewPropostaOMDocumento

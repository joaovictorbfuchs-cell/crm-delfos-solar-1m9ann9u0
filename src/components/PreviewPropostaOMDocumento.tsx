import React from 'react'
import {
  Award,
  CheckCircle2,
  MapPin,
  Phone,
  Printer,
  ShieldCheck,
  User,
  Zap,
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
  onAceitarPlano?: () => void
  isSubmitting?: boolean
  aceiteRegistrado?: boolean
  className?: string
  onImprimir?: () => void
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
}) => {
  const c = normalizarConteudoPropostaOM(conteudo)
  const { cliente, tecnico, parametros, calculos } = dados
  const planoAtivo = (planoSelecionado || parametros.planoEscolhido || 'Completo') as OMPlanoTipo
  const dataEmissao = dados.dataEmissao || new Date().toISOString()
  const dataValidade = new Date(dataEmissao)
  dataValidade.setDate(dataValidade.getDate() + (c.rodape.validadeDias || 5))
  const geracaoAnual = (tecnico.geracaoMediaKwh || 0) * 12
  const valorAnualBruto = geracaoAnual * (parametros.valorKwh || 0)
  const numeroProposta = dados.propostaNumero || 'Em elaboração'
  const urlFonteSujidade = 'https://www.scielo.br/j/ac/a/nYrQWs3y5BHwMLcWT5DvJdd?lang=pt'

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

  const beneficiosDoPlano = (itens: string[]) =>
    itens.map((item) =>
      item.replace('{numeroModulos}', tecnico.numeroModulos ? String(tecnico.numeroModulos) : 'conforme projeto'),
    )

  return (
    <div
      className={`proposta-om-documento bg-white text-gray-900 font-sans shadow-lg rounded-2xl border border-gray-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 max-w-4xl mx-auto ${className}`}
    >
      <style>{`@media print { .proposta-om-documento { max-width: none !important; border: 0 !important; box-shadow: none !important; } .proposta-om-documento .no-print { display: none !important; } .proposta-om-documento section, .proposta-om-documento footer { break-inside: avoid; } }`}</style>

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
              {cliente.nome} • Usina {tecnico.potenciaKwp.toFixed(2)} kWp ({tecnico.municipio || 'Erechim/RS'})
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onImprimir || (() => window.print())}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar em PDF</span>
        </button>
      </div>

      <div className="p-6 sm:p-10 space-y-7 bg-white print:p-4 print:space-y-5">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-emerald-600/20">
          <div className="flex items-center gap-4">
            <div className="w-28 sm:w-36 shrink-0"><DelfosLogo className="w-full h-auto" /></div>
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
            <span className="text-gray-700 text-[11px] mt-1.5 font-semibold">Proposta nº {numeroProposta}</span>
            <span className="text-gray-500 text-[11px] mt-1 font-medium">
              Emissão: <strong className="text-gray-800">{formatarData(dataEmissao)}</strong>
            </span>
            <span className="text-gray-500 text-[11px] font-medium">
              Válida até: <strong className="text-gray-800">{formatarData(dataValidade.toISOString())}</strong>
            </span>
            {dados.autor && <span className="text-gray-400 text-[10px]">Elaborado por: {dados.autor}</span>}
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
                <LinhaInformacao rotulo="Município:" valor={cliente.municipio || tecnico.municipio} />
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
                <LinhaInformacao rotulo="Potência Total:" valor={`${tecnico.potenciaKwp.toLocaleString('pt-BR')} kWp`} destaque />
                <LinhaInformacao rotulo="Geração Estimada:" valor={`${tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mês`} />
                <LinhaInformacao rotulo="Inversor:" valor={tecnico.marcaInversores} />
                <LinhaInformacao rotulo="Módulos:" valor={tecnico.numeroModulos ? `${tecnico.numeroModulos} unidades` : 'Conforme projeto'} />
                <LinhaInformacao rotulo="Tipo de Instalação:" valor={tecnico.tipoInstalacao} />
                <LinhaInformacao rotulo="Tarifa Base:" valor={`${formatarBRL(parametros.valorKwh)} / kWh`} destaque />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-teal-50 rounded-xl p-4 border border-emerald-200 flex items-center gap-3 text-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs"><Award className="w-5 h-5" /></div>
            <div>
              <span className="text-gray-600 block text-[11px]">
                {c.secao1.cardAnualDestaquePrefixo}{' '}
                <strong className="text-emerald-950 text-base font-black">{formatarBRL(valorAnualBruto)}/ano</strong>
                {' '}{c.secao1.cardAnualDestaqueSufixo}
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold">
                Base estimada: {geracaoAnual.toLocaleString('pt-BR')} kWh/ano × {formatarBRL(parametros.valorKwh)}/kWh.
              </span>
            </div>
          </div>
        </section>

        <section id="secao-2-cenarios" className="space-y-4">
          <CabecalhoSecao numero={2} titulo={c.secao2.titulo} subtitulo={c.secao2.subtitulo} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 text-center">
              <span className="text-[11px] font-black uppercase tracking-wide text-amber-900">{c.secao2.tituloCardPerda20}</span>
              <div className="text-2xl font-black text-amber-800 mt-1">{formatarBRL(calculos.perda20Ano)}</div>
              <div className="text-xs text-amber-900 font-semibold">{c.secao2.subtituloCardPerda20}</div>
            </div>
            <div className="bg-red-50/70 border border-red-300 rounded-xl p-4 text-center">
              <span className="text-[11px] font-black uppercase tracking-wide text-red-900">{c.secao2.tituloCardFalha30}</span>
              <div className="text-2xl font-black text-red-700 mt-1">{formatarBRL(calculos.prejuizo30Dias)}</div>
              <div className="text-xs text-red-900 font-semibold">{c.secao2.subtituloCardFalha30}</div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-xs leading-relaxed text-amber-950">
            <p>{c.secao2.textoRiscoGarantia}</p>
            <p>{c.secao2.textoEvidenciaSujidade}</p>
            <a className="text-[10px] underline font-semibold text-emerald-800 break-words" href="https://www.scielo.br/j/ac/a/nYrQWs3y5BHwMLcWT5DvJdd?lang=pt" target="_blank" rel="noreferrer">
              {c.secao2.fonteEvidenciaSujidade}
            </a>
          </div>
        </section>

        <section id="secao-3-planos" className="space-y-4">
          <CabecalhoSecao numero={3} titulo={c.secao4.titulo} subtitulo="Escolha a modalidade ideal para sua usina" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {planos.map((plano) => {
              const selecionado = planoAtivo === plano.chave
              return (
                <article key={plano.chave} className={`relative rounded-2xl p-5 border-2 flex flex-col justify-between transition-all ${selecionado ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-600/20' : 'border-gray-200 bg-white'} ${plano.recomendado ? 'pt-7' : ''}`}>
                  {plano.recomendado && <span className="absolute -top-3 right-4 bg-emerald-800 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full shadow">{c.secao4.seloRecomendado}</span>}
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold uppercase text-gray-900">{plano.titulo}</h3>
                    <div className="text-2xl font-black text-emerald-700">
                      {formatarBRL(plano.calculo.mensal)}<span className="text-xs text-gray-500 font-bold ml-1">/mês</span>
                    </div>
                    <div className="text-[11px] text-gray-500">Investimento anual: <strong>{formatarBRL(plano.calculo.anual)}</strong></div>
                    <ul className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-700">
                      {beneficiosDoPlano(plano.beneficios).map((beneficio, idx) => (
                        <li key={idx} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /><span>{beneficio}</span></li>
                      ))}
                    </ul>
                  </div>
                  <button type="button" aria-pressed={selecionado} onClick={() => onSelecionarPlano?.(plano.chave)} className={`no-print mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${selecionado ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {selecionado ? <><CheckCircle2 className="w-3.5 h-3.5" />{c.secao4.botaoTextoSelecionado}</> : c.secao4.botaoTextoSelecionar}
                  </button>
                  <div className="hidden print:block mt-3 text-xs font-semibold text-emerald-800">{selecionado ? 'Plano selecionado ✓' : ''}</div>
                </article>
              )
            })}
          </div>
        </section>

        <section id="secao-4-escopo" className="space-y-4">
          <CabecalhoSecao numero={4} titulo={c.secaoEscopoTecnico.titulo} subtitulo={c.secaoEscopoTecnico.subtitulo} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-slate-50 border border-gray-200 p-4">
            {c.secaoEscopoTecnico.itens.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-xs text-gray-700"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /><span>{item.texto}</span></div>
            ))}
          </div>
        </section>

        <section id="secao-5-padroes" className="space-y-4">
          <CabecalhoSecao numero={5} titulo={c.secao5.titulo} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {c.secao5.itens.map((item) => (
              <div key={item.id} className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-2">
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
                <li key={item.id} className="flex items-start gap-2"><span className="text-emerald-600 font-bold">•</span><span><strong className="text-gray-900">{item.titulo}:</strong> {item.descricao}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section id="secao-7-aceite" className="space-y-5">
          <CabecalhoSecao numero={7} titulo={c.secao8.titulo} subtitulo="Seleção do plano, aceite preliminar e contratação" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {c.secao8.passos.map((passo) => (
              <div key={passo.numero} className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                <div className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">{passo.numero}. {passo.titulo}</div>
                <p className="text-[11px] text-gray-600 leading-snug m-0">{passo.descricao}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-xl bg-slate-50 border border-gray-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">Selecione o plano desejado para contratação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {planos.map((plano) => (
                <label key={plano.chave} className={`flex items-start gap-2 rounded-lg border p-3 text-xs cursor-pointer ${planoAtivo === plano.chave ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                  <input className="mt-0.5 accent-emerald-700" type="radio" name="plano-aceite-om" value={plano.chave} checked={planoAtivo === plano.chave} onChange={() => onSelecionarPlano?.(plano.chave)} />
                  <span className="space-y-1"><strong className="block">{plano.titulo}{plano.recomendado ? ' — RECOMENDADO' : ''}</strong><span className="block">{formatarBRL(plano.calculo.mensal)} / mês</span><span className="block text-gray-500">{formatarBRL(plano.calculo.anual)} / ano</span></span>
                </label>
              ))}
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div><span className="text-gray-500">Investimento selecionado:</span> <strong className="text-emerald-800 uppercase font-black">Plano {planoAtivo}</strong></div>
              <div><strong className="text-gray-900">{formatarBRL(calculos.planos[planoAtivo]?.mensal)}/mês</strong><span className="text-gray-500"> • </span><strong>{formatarBRL(calculos.planos[planoAtivo]?.anual)}/ano</strong></div>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed m-0">{c.secao8.textoTermoAceite}</p>
            <div className="no-print flex flex-col sm:flex-row sm:items-center gap-3">
              <button type="button" onClick={onAceitarPlano} disabled={!onAceitarPlano || isSubmitting || aceiteRegistrado} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-3 disabled:opacity-60 disabled:cursor-not-allowed">
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Registrando aceite…' : aceiteRegistrado ? 'Aceite registrado ✓' : 'De acordo — Quero contratar este plano'}
              </button>
              <span className="text-[10px] text-gray-500">{aceiteRegistrado ? 'Este aceite está registrado no CRM.' : c.secao8.textoCliqueAceite}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-3 text-xs">
            <div className="text-center space-y-1.5"><div className="border-b border-gray-400 w-4/5 mx-auto mb-2 pt-8" /><div className="font-bold text-gray-900">{cliente.nome}</div><div className="text-[11px] text-gray-500">Nome do Responsável: ____________________</div><div className="text-[10px] text-gray-400">CPF: ______________ • Data: ____/____/________</div></div>
            <div className="text-center space-y-1.5"><div className="border-b border-gray-400 w-4/5 mx-auto mb-2 pt-8" /><div className="font-bold text-emerald-950">DELFOS ENGENHARIA SOLAR</div><div className="text-[11px] text-emerald-800 font-semibold">{c.secao8.responsavelDelfosCargo}</div><div className="text-[10px] text-gray-500">CNPJ {c.secao8.cnpjDelfos}</div></div>
          </div>
        </section>

        <footer id="rodape-oficial" className="pt-5 border-t border-gray-200">
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-center space-y-1.5 text-xs text-gray-600">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <strong className="text-gray-900">{c.rodape.empresaNome}</strong><span>•</span><span>CNPJ {c.rodape.cnpj}</span><span>•</span><span><Phone className="inline w-3 h-3" /> {c.rodape.telefone}</span><span>•</span><span>{c.rodape.site}</span>
            </div>
            <div className="text-[11px]">{c.rodape.endereco}</div>
            <div className="text-[10px] text-gray-500">{cliente.email ? `Contato: ${cliente.email} • ` : ''}{cliente.telefone || ''}</div>
            <div className="text-[11px] font-bold text-emerald-700">{c.rodape.textoValidade}</div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default PreviewPropostaOMDocumento

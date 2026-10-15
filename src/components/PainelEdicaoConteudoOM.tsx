import React, { useState } from 'react'
import {
  FileText,
  Sliders,
  DollarSign,
  ShieldCheck,
  Clock,
  HelpCircle,
  RotateCcw,
  Plus,
  Trash2,
  Check,
} from 'lucide-react'
import {
  ConteudoPropostaOM,
  getConteudoPropostaOMDefaults,
  normalizarConteudoPropostaOM,
} from '@/lib/conteudoPropostaOM'

interface PainelEdicaoConteudoOMProps {
  conteudo?: Partial<ConteudoPropostaOM> | null
  onChange: (novo: ConteudoPropostaOM) => void
  disabled?: boolean
}

export const PainelEdicaoConteudoOM: React.FC<PainelEdicaoConteudoOMProps> = ({
  conteudo,
  onChange,
  disabled = false,
}) => {
  const dados = normalizarConteudoPropostaOM(conteudo)
  const [secaoAberta, setSecaoAberta] = useState<string>('secao1')

  const handleRestaurar = () => {
    if (confirm('Deseja restaurar todos os textos da proposta O&M para o padrão oficial?')) {
      onChange(getConteudoPropostaOMDefaults())
    }
  }

  const updateField = (caminho: string, valor: any) => {
    const partes = caminho.split('.')
    const clonar = (no: any, i: number): any => {
      if (i >= partes.length) return valor
      const chave = partes[i]
      if (Array.isArray(no)) {
        const idx = Number(chave)
        const arr = [...no]
        arr[idx] = clonar(no[idx] ?? {}, i + 1)
        return arr
      }
      const obj = { ...(no || {}) }
      obj[chave] = clonar(no?.[chave], i + 1)
      return obj
    }
    const novo = clonar(dados, 0)
    onChange(novo)
  }

  const toggleSecao = (nome: string) => {
    setSecaoAberta((prev) => (prev === nome ? '' : nome))
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                Seletor de Elementos & Textos da Proposta O&M
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Editável
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Personalize títulos, badges, chamadas de risco, SLA, condições e assinaturas das 8
              seções oficiais
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRestaurar}
          disabled={disabled}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 transition-colors"
          title="Restaurar textos originais do documento de referência"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Padrão</span>
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* SEÇÃO 1 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('secao1')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>1. Dados Gerais e Identificação Técnica</span>
            <span className="text-gray-400">{secaoAberta === 'secao1' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'secao1' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título da Seção</label>
                <input
                  type="text"
                  value={dados.secao1.titulo}
                  onChange={(e) => updateField('secao1.titulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Subtítulo</label>
                  <input
                    type="text"
                    value={dados.secao1.subtitulo}
                    onChange={(e) => updateField('secao1.subtitulo', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Badge de Emissão</label>
                  <input
                    type="text"
                    value={dados.secao1.badgeEmissao}
                    onChange={(e) => updateField('secao1.badgeEmissao', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Citação de Destaque (Comparativo de Custo vs Falha)
                </label>
                <textarea
                  rows={2}
                  value={dados.secao1.citacaoDestaque}
                  onChange={(e) => updateField('secao1.citacaoDestaque', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 2 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('secao2')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>2. Cenários de Exposição Financeira &amp; Alerta de Risco Oculto</span>
            <span className="text-gray-400">{secaoAberta === 'secao2' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'secao2' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Título</label>
                  <input
                    type="text"
                    value={dados.secao2.titulo}
                    onChange={(e) => updateField('secao2.titulo', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Subtítulo</label>
                  <input
                    type="text"
                    value={dados.secao2.subtitulo}
                    onChange={(e) => updateField('secao2.subtitulo', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Texto da Faixa &quot;Atenção ao risco oculto&quot;
                </label>
                <textarea
                  rows={3}
                  value={dados.secao2.avisoRiscoOculto}
                  onChange={(e) => updateField('secao2.avisoRiscoOculto', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 3 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('secao3')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>3. Tabela &quot;Qual Plano Elimina Cada Cenário&quot;</span>
            <span className="text-gray-400">{secaoAberta === 'secao3' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'secao3' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título da Tabela</label>
                <input
                  type="text"
                  value={dados.secao3.titulo}
                  onChange={(e) => updateField('secao3.titulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
              <div className="space-y-2 pt-2">
                <span className="font-bold text-gray-700 block">Linhas de Cobertura:</span>
                {dados.secao3.linhas.map((l, idx) => (
                  <div
                    key={l.id || idx}
                    className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-gray-500 uppercase font-semibold">
                          Cenário
                        </label>
                        <input
                          type="text"
                          value={l.cenario}
                          onChange={(e) =>
                            updateField(`secao3.linhas.${idx}.cenario`, e.target.value)
                          }
                          className="w-full px-2 py-1 text-xs border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase font-semibold">
                          Selo do Plano
                        </label>
                        <input
                          type="text"
                          value={l.planoSelo}
                          onChange={(e) =>
                            updateField(`secao3.linhas.${idx}.planoSelo`, e.target.value)
                          }
                          className="w-full px-2 py-1 text-xs border rounded bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-semibold">
                        Cobertura Delfos
                      </label>
                      <input
                        type="text"
                        value={l.cobertura}
                        onChange={(e) =>
                          updateField(`secao3.linhas.${idx}.cobertura`, e.target.value)
                        }
                        className="w-full px-2 py-1 text-xs border rounded bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 4 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('secao4')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>4. Modalidades de Planos (Benefícios &amp; Selo Recomendado)</span>
            <span className="text-gray-400">{secaoAberta === 'secao4' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'secao4' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Título</label>
                  <input
                    type="text"
                    value={dados.secao4.titulo}
                    onChange={(e) => updateField('secao4.titulo', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Texto do Selo de Destaque
                  </label>
                  <input
                    type="text"
                    value={dados.secao4.seloRecomendado}
                    onChange={(e) => updateField('secao4.seloRecomendado', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="border p-2.5 rounded-lg bg-gray-50">
                  <span className="font-bold text-gray-800 block mb-1">Plano Essencial</span>
                  {dados.secao4.beneficiosEssencial.map((b, i) => (
                    <input
                      key={i}
                      type="text"
                      value={b}
                      onChange={(e) =>
                        updateField(`secao4.beneficiosEssencial.${i}`, e.target.value)
                      }
                      className="w-full px-2 py-1 text-[11px] border rounded bg-white mb-1.5"
                    />
                  ))}
                </div>
                <div className="border p-2.5 rounded-lg bg-gray-50">
                  <span className="font-bold text-gray-800 block mb-1">Plano Inspeção</span>
                  {dados.secao4.beneficiosInspecao.map((b, i) => (
                    <input
                      key={i}
                      type="text"
                      value={b}
                      onChange={(e) =>
                        updateField(`secao4.beneficiosInspecao.${i}`, e.target.value)
                      }
                      className="w-full px-2 py-1 text-[11px] border rounded bg-white mb-1.5"
                    />
                  ))}
                </div>
                <div className="border border-emerald-300 p-2.5 rounded-lg bg-emerald-50/50">
                  <span className="font-bold text-emerald-900 block mb-1">Plano Completo</span>
                  {dados.secao4.beneficiosCompleto.map((b, i) => (
                    <input
                      key={i}
                      type="text"
                      value={b}
                      onChange={(e) =>
                        updateField(`secao4.beneficiosCompleto.${i}`, e.target.value)
                      }
                      className="w-full px-2 py-1 text-[11px] border rounded bg-white mb-1.5"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 5 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('secao5')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>5. Padrões Técnicos e Credibilidade (NR-10, Metrologia, Água Tratada)</span>
            <span className="text-gray-400">{secaoAberta === 'secao5' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'secao5' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título</label>
                <input
                  type="text"
                  value={dados.secao5.titulo}
                  onChange={(e) => updateField('secao5.titulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {dados.secao5.itens.map((it, idx) => (
                  <div key={it.id || idx} className="p-2.5 rounded-lg border bg-gray-50 space-y-1">
                    <input
                      type="text"
                      value={it.titulo}
                      onChange={(e) => updateField(`secao5.itens.${idx}.titulo`, e.target.value)}
                      className="w-full font-bold px-2 py-1 text-xs border rounded bg-white"
                    />
                    <textarea
                      rows={3}
                      value={it.descricao}
                      onChange={(e) => updateField(`secao5.itens.${idx}.descricao`, e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border rounded bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 6 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('secao6')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>6. Níveis de Serviço (SLA) &amp; Compromissos</span>
            <span className="text-gray-400">{secaoAberta === 'secao6' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'secao6' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título</label>
                <input
                  type="text"
                  value={dados.secao6.titulo}
                  onChange={(e) => updateField('secao6.titulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {dados.secao6.itens.map((it, idx) => (
                  <div key={it.id || idx} className="p-2.5 rounded-lg border bg-gray-50 space-y-1">
                    <input
                      type="text"
                      value={it.titulo}
                      onChange={(e) => updateField(`secao6.itens.${idx}.titulo`, e.target.value)}
                      className="w-full font-bold px-2 py-1 text-xs border rounded bg-white"
                    />
                    <textarea
                      rows={3}
                      value={it.descricao}
                      onChange={(e) => updateField(`secao6.itens.${idx}.descricao`, e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border rounded bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 7 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('secao7')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>7. Condições Contratuais &amp; Vigência (4 Itens)</span>
            <span className="text-gray-400">{secaoAberta === 'secao7' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'secao7' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título</label>
                <input
                  type="text"
                  value={dados.secao7.titulo}
                  onChange={(e) => updateField('secao7.titulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
              <div className="space-y-2">
                {dados.secao7.itens.map((it, idx) => (
                  <div key={it.id || idx} className="p-2.5 rounded-lg border bg-gray-50 space-y-1">
                    <input
                      type="text"
                      value={it.titulo}
                      onChange={(e) => updateField(`secao7.itens.${idx}.titulo`, e.target.value)}
                      className="w-full font-bold px-2 py-1 text-xs border rounded bg-white"
                    />
                    <textarea
                      rows={2}
                      value={it.descricao}
                      onChange={(e) => updateField(`secao7.itens.${idx}.descricao`, e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border rounded bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 8 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('secao8')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>8. Aceite Comercial, Passos de Contratação &amp; Assinaturas</span>
            <span className="text-gray-400">{secaoAberta === 'secao8' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'secao8' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Título</label>
                <input
                  type="text"
                  value={dados.secao8.titulo}
                  onChange={(e) => updateField('secao8.titulo', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {dados.secao8.passos.map((p, idx) => (
                  <div key={idx} className="p-2 border rounded-lg bg-gray-50">
                    <span className="font-bold text-[10px] text-gray-500 uppercase block mb-1">
                      Passo {p.numero}
                    </span>
                    <input
                      type="text"
                      value={p.titulo}
                      onChange={(e) => updateField(`secao8.passos.${idx}.titulo`, e.target.value)}
                      className="w-full font-bold px-2 py-1 text-xs border rounded bg-white mb-1"
                    />
                    <textarea
                      rows={2}
                      value={p.descricao}
                      onChange={(e) =>
                        updateField(`secao8.passos.${idx}.descricao`, e.target.value)
                      }
                      className="w-full px-2 py-1 text-[11px] border rounded bg-white"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Texto do Termo de Aceite
                </label>
                <textarea
                  rows={2}
                  value={dados.secao8.textoTermoAceite}
                  onChange={(e) => updateField('secao8.textoTermoAceite', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Cargo Delfos na Assinatura
                  </label>
                  <input
                    type="text"
                    value={dados.secao8.responsavelDelfosCargo}
                    onChange={(e) => updateField('secao8.responsavelDelfosCargo', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">CNPJ Delfos</label>
                  <input
                    type="text"
                    value={dados.secao8.cnpjDelfos}
                    onChange={(e) => updateField('secao8.cnpjDelfos', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSecao('rodape')}
            className="w-full px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>Rodapé Oficial (Mesmo da Proposta Solar Delfos)</span>
            <span className="text-gray-400">{secaoAberta === 'rodape' ? '▲' : '▼'}</span>
          </button>
          {secaoAberta === 'rodape' && (
            <div className="p-4 space-y-3 bg-white text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Empresa</label>
                  <input
                    type="text"
                    value={dados.rodape.empresaNome}
                    onChange={(e) => updateField('rodape.empresaNome', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={dados.rodape.cnpj}
                    onChange={(e) => updateField('rodape.cnpj', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Telefone</label>
                  <input
                    type="text"
                    value={dados.rodape.telefone}
                    onChange={(e) => updateField('rodape.telefone', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Endereço</label>
                  <input
                    type="text"
                    value={dados.rodape.endereco}
                    onChange={(e) => updateField('rodape.endereco', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Texto de Validade
                  </label>
                  <input
                    type="text"
                    value={dados.rodape.textoValidade}
                    onChange={(e) => updateField('rodape.textoValidade', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PainelEdicaoConteudoOM

import React, { useMemo, useRef, useState } from 'react'
import { FileText, RotateCcw } from 'lucide-react'
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

const CampoTexto: React.FC<{
  label: string
  value?: string | number
  onChange: (value: string) => void
  multiline?: boolean
  disabled?: boolean
}> = ({ label, value, onChange, multiline = false, disabled = false }) => {
  const common =
    'w-full px-3 py-2 border rounded-lg border-gray-300 bg-white text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-500'
  return (
    <label className="block min-w-0">
      <span className="font-semibold text-gray-700 block mb-1">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          disabled={disabled}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          className={`${common} resize-y`}
        />
      ) : (
        <input
          type="text"
          disabled={disabled}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          className={common}
        />
      )}
    </label>
  )
}

export const PainelEdicaoConteudoOM: React.FC<PainelEdicaoConteudoOMProps> = ({
  conteudo,
  onChange,
  disabled = false,
}) => {
  const dados = normalizarConteudoPropostaOM(conteudo)
  const [secaoAberta, setSecaoAberta] = useState('secao1')

  const updateField = (caminho: string, valor: unknown) => {
    const partes = caminho.split('.')
    const clonar = (no: any, indice: number): any => {
      if (indice >= partes.length) return valor
      const chave = partes[indice]
      if (Array.isArray(no)) {
        const index = Number(chave)
        const copia = [...no]
        copia[index] = clonar(no[index] ?? {}, indice + 1)
        return copia
      }
      const copia = { ...(no || {}) }
      copia[chave] = clonar(no?.[chave], indice + 1)
      return copia
    }
    onChange(clonar(dados, 0))
  }

  const toggleSecao = (nome: string) => setSecaoAberta((atual) => (atual === nome ? '' : nome))
  const toggleSecaoRef = useRef(toggleSecao)
  toggleSecaoRef.current = toggleSecao
  const secaoAbertaRef = useRef(secaoAberta)
  secaoAbertaRef.current = secaoAberta

  const restaurarPadrao = () => {
    if (window.confirm('Restaurar os textos da proposta O&M para o modelo oficial?')) {
      onChange(getConteudoPropostaOMDefaults())
    }
  }

  const Secao = useMemo(
    () =>
      ({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) => (
        <section className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            aria-expanded={secaoAbertaRef.current === id}
            onClick={() => toggleSecaoRef.current(id)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left text-xs font-bold text-gray-800"
          >
            <span>{titulo}</span>
            <span className="text-gray-400" aria-hidden="true">
              {secaoAbertaRef.current === id ? '▲' : '▼'}
            </span>
          </button>
          {secaoAbertaRef.current === id && (
            <div className="p-4 space-y-3 bg-white text-xs">{children}</div>
          )}
        </section>
      ),
    [],
  )

  // Manter o tipo do componente de campo estável para não remontar o input a cada tecla.
  const updateFieldRef = useRef(updateField)
  updateFieldRef.current = updateField
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled
  const Campo = useMemo(
    () =>
      ({
        path,
        ...props
      }: Omit<React.ComponentProps<typeof CampoTexto>, 'onChange'> & { path: string }) => (
        <CampoTexto
          {...props}
          disabled={disabledRef.current}
          onChange={(value) =>
            updateFieldRef.current(
              path,
              path === 'rodape.validadeDias' ? Math.max(1, Number(value) || 5) : value,
            )
          }
        />
      ),
    [],
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Editar textos da proposta O&amp;M</h3>
            <p className="text-xs text-gray-500">
              Os campos alterados aparecem na prévia e no PDF.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={restaurarPadrao}
          disabled={disabled}
          className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
        </button>
      </div>

      <div className="p-4 space-y-3">
        <Secao id="secao1" titulo="1. Dados do cliente e da usina">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Título" path="secao1.titulo" value={dados.secao1.titulo} />
            <Campo label="Subtítulo" path="secao1.subtitulo" value={dados.secao1.subtitulo} />
            <Campo
              label="Selo do documento"
              path="secao1.badgeEmissao"
              value={dados.secao1.badgeEmissao}
            />
            <Campo
              label="Texto antes do valor anual"
              path="secao1.cardAnualDestaquePrefixo"
              value={dados.secao1.cardAnualDestaquePrefixo}
            />
            <Campo
              label="Texto depois do valor anual"
              path="secao1.cardAnualDestaqueSufixo"
              value={dados.secao1.cardAnualDestaqueSufixo}
            />
            <Campo
              label="Chamada de destaque"
              path="secao1.citacaoDestaque"
              value={dados.secao1.citacaoDestaque}
              multiline
            />
          </div>
        </Secao>

        <Secao id="secao2" titulo="2. Cenários financeiros">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Título" path="secao2.titulo" value={dados.secao2.titulo} />
            <Campo label="Subtítulo" path="secao2.subtitulo" value={dados.secao2.subtitulo} />
            <Campo
              label="Título da perda anual por sujidade (20%)"
              path="secao2.tituloCardPerda20"
              value={dados.secao2.tituloCardPerda20}
            />
            <Campo
              label="Explicação da estimativa anual"
              path="secao2.subtituloCardPerda20"
              value={dados.secao2.subtituloCardPerda20}
            />
            <Campo
              label="Título da falha de equipamento (30 dias)"
              path="secao2.tituloCardFalha30"
              value={dados.secao2.tituloCardFalha30}
            />
            <Campo
              label="Explicação da perda por falha"
              path="secao2.subtituloCardFalha30"
              value={dados.secao2.subtituloCardFalha30}
            />
            <Campo
              label="Nota sobre garantia"
              path="secao2.textoRiscoGarantia"
              value={dados.secao2.textoRiscoGarantia}
              multiline
            />
            <Campo
              label="Evidência sobre sujidade (com ressalvas)"
              path="secao2.textoEvidenciaSujidade"
              value={dados.secao2.textoEvidenciaSujidade}
              multiline
            />
            <Campo
              label="Fonte da evidência"
              path="secao2.fonteEvidenciaSujidade"
              value={dados.secao2.fonteEvidenciaSujidade}
              multiline
            />
          </div>
        </Secao>

        <Secao id="secao3" titulo="3. Planos de gestão e manutenção">
          <Campo label="Título" path="secao4.titulo" value={dados.secao4.titulo} />
          <Campo
            label="Selo do plano recomendado"
            path="secao4.seloRecomendado"
            value={dados.secao4.seloRecomendado}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {(
              [
                ['Essencial', dados.secao4.beneficiosEssencial],
                ['Inspeção', dados.secao4.beneficiosInspecao],
                ['Completo', dados.secao4.beneficiosCompleto],
              ] as const
            ).map(([plano, beneficios]) => (
              <div key={plano} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <h4 className="font-bold text-gray-800">Plano {plano}</h4>
                {beneficios.map((beneficio, index) => (
                  <Campo
                    key={`${plano}-${index}`}
                    label={`Benefício ${index + 1}`}
                    path={`secao4.beneficios${plano === 'Inspeção' ? 'Inspecao' : plano}.${index}`}
                    value={beneficio}
                    multiline
                  />
                ))}
              </div>
            ))}
          </div>
        </Secao>

        <Secao id="secao4" titulo="4. Escopo técnico das visitas">
          <Campo
            label="Título"
            path="secaoEscopoTecnico.titulo"
            value={dados.secaoEscopoTecnico.titulo}
          />
          <Campo
            label="Subtítulo"
            path="secaoEscopoTecnico.subtitulo"
            value={dados.secaoEscopoTecnico.subtitulo}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dados.secaoEscopoTecnico.itens.map((item, index) => (
              <Campo
                key={item.id}
                label={`Atividade ${index + 1}`}
                path={`secaoEscopoTecnico.itens.${index}.texto`}
                value={item.texto}
                multiline
              />
            ))}
          </div>
        </Secao>

        <Secao id="secao5" titulo="5. Credibilidade">
          <Campo label="Título" path="secao5.titulo" value={dados.secao5.titulo} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dados.secao5.itens.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <Campo
                  label={`Diferencial ${index + 1}`}
                  path={`secao5.itens.${index}.titulo`}
                  value={item.titulo}
                />
                <Campo
                  label="Descrição"
                  path={`secao5.itens.${index}.descricao`}
                  value={item.descricao}
                  multiline
                />
              </div>
            ))}
          </div>
        </Secao>

        <Secao id="secao6" titulo="6. Condições">
          <Campo label="Título" path="secao7.titulo" value={dados.secao7.titulo} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dados.secao7.itens.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <Campo
                  label={`Condição ${index + 1}`}
                  path={`secao7.itens.${index}.titulo`}
                  value={item.titulo}
                />
                <Campo
                  label="Descrição"
                  path={`secao7.itens.${index}.descricao`}
                  value={item.descricao}
                  multiline
                />
              </div>
            ))}
          </div>
        </Secao>

        <Secao id="secao7" titulo="7. Aceite">
          <Campo label="Título" path="secao8.titulo" value={dados.secao8.titulo} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dados.secao8.passos.map((passo, index) => (
              <div key={passo.numero} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <Campo
                  label={`Etapa ${index + 1}`}
                  path={`secao8.passos.${index}.titulo`}
                  value={passo.titulo}
                />
                <Campo
                  label="Descrição"
                  path={`secao8.passos.${index}.descricao`}
                  value={passo.descricao}
                  multiline
                />
              </div>
            ))}
          </div>
          <Campo
            label="Termo de aceite"
            path="secao8.textoTermoAceite"
            value={dados.secao8.textoTermoAceite}
            multiline
          />
          <Campo
            label="Texto de autorização"
            path="secao8.termoAutorizacao"
            value={dados.secao8.termoAutorizacao}
            multiline
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo
              label="Instrução do botão de aceite"
              path="secao8.textoCliqueAceite"
              value={dados.secao8.textoCliqueAceite}
            />
            <Campo
              label="Cargo na assinatura Delfos"
              path="secao8.responsavelDelfosCargo"
              value={dados.secao8.responsavelDelfosCargo}
            />
            <Campo
              label="CNPJ na assinatura"
              path="secao8.cnpjDelfos"
              value={dados.secao8.cnpjDelfos}
            />
          </div>
        </Secao>

        <Secao id="rodape" titulo="Rodapé oficial">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Empresa" path="rodape.empresaNome" value={dados.rodape.empresaNome} />
            <Campo label="CNPJ" path="rodape.cnpj" value={dados.rodape.cnpj} />
            <Campo label="Telefone" path="rodape.telefone" value={dados.rodape.telefone} />
            <Campo label="Site" path="rodape.site" value={dados.rodape.site} />
            <Campo label="Endereço" path="rodape.endereco" value={dados.rodape.endereco} />
            <Campo
              label="Prazo de validade em dias"
              path="rodape.validadeDias"
              value={dados.rodape.validadeDias}
            />
            <Campo
              label="Texto de validade"
              path="rodape.textoValidade"
              value={dados.rodape.textoValidade}
            />
          </div>
          <p className="text-[10px] text-gray-500">
            Os campos antigos de cobertura e SLA permanecem preservados nos dados das propostas
            existentes, mas não aparecem no documento de sete seções.
          </p>
        </Secao>
      </div>
    </div>
  )
}

export default PainelEdicaoConteudoOM

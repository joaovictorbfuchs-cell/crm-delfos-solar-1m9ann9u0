import {
  ConteudoPropostaOM,
  normalizarConteudoPropostaOM,
  getConteudoPropostaOMDefaults,
} from '@/lib/conteudoPropostaOM'

export interface ItemEdicaoOMCfg {
  sel: string
  caminho: string
  stripIcone?: boolean
  indicePai?: string
}

export const MAPEAMENTO_EDICAO_OM: ItemEdicaoOMCfg[] = [
  // SEÇÃO 1: Dados Gerais e Identificação Técnica
  { sel: '#secao-1-dados h2', caminho: 'secao1.titulo' },
  { sel: '#secao-1-dados p.subtitulo', caminho: 'secao1.subtitulo' },
  { sel: '#secao-1-dados .badge-emissao', caminho: 'secao1.badgeEmissao', stripIcone: true },
  { sel: '#secao-1-dados .citacao-destaque', caminho: 'secao1.citacaoDestaque' },

  // SEÇÃO 2: Cenários de Exposição Financeira
  { sel: '#secao-2-cenarios h2', caminho: 'secao2.titulo' },
  { sel: '#secao-2-cenarios p.subtitulo', caminho: 'secao2.subtitulo' },
  { sel: '#secao-2-cenarios .faixa-risco-oculto p', caminho: 'secao2.avisoRiscoOculto' },

  // SEÇÃO 3: Qual Plano Elimina Cada Cenário
  { sel: '#secao-3-tabela h2', caminho: 'secao3.titulo' },
  {
    sel: '#secao-3-tabela tbody tr td.col-cenario',
    caminho: 'secao3.linhas.{i}.cenario',
    indicePai: '#secao-3-tabela tbody tr',
  },
  {
    sel: '#secao-3-tabela tbody tr td.col-cobertura',
    caminho: 'secao3.linhas.{i}.cobertura',
    indicePai: '#secao-3-tabela tbody tr',
  },

  // SEÇÃO 4: Modalidades de Planos de O&M
  { sel: '#secao-4-planos h2', caminho: 'secao4.titulo' },
  { sel: '#secao-4-planos .selo-recomendado', caminho: 'secao4.seloRecomendado' },

  // SEÇÃO 5: Padrões Técnicos e Credibilidade
  { sel: '#secao-5-padroes h2', caminho: 'secao5.titulo' },
  {
    sel: '#secao-5-padroes .card-padrao h4',
    caminho: 'secao5.itens.{i}.titulo',
    indicePai: '#secao-5-padroes .grid-padroes > div',
  },
  {
    sel: '#secao-5-padroes .card-padrao p',
    caminho: 'secao5.itens.{i}.descricao',
    indicePai: '#secao-5-padroes .grid-padroes > div',
  },

  // SEÇÃO 6: Níveis de Serviço (SLA) & Compromissos
  { sel: '#secao-6-sla h2', caminho: 'secao6.titulo' },
  {
    sel: '#secao-6-sla .card-sla h4',
    caminho: 'secao6.itens.{i}.titulo',
    indicePai: '#secao-6-sla .grid-sla > div',
  },
  {
    sel: '#secao-6-sla .card-sla p',
    caminho: 'secao6.itens.{i}.descricao',
    indicePai: '#secao-6-sla .grid-sla > div',
  },

  // SEÇÃO 7: Condições Contratuais & Vigência
  { sel: '#secao-7-condicoes h2', caminho: 'secao7.titulo' },
  {
    sel: '#secao-7-condicoes .item-condicao strong',
    caminho: 'secao7.itens.{i}.titulo',
    indicePai: '#secao-7-condicoes .lista-condicoes > li',
  },
  {
    sel: '#secao-7-condicoes .item-condicao span.desc',
    caminho: 'secao7.itens.{i}.descricao',
    indicePai: '#secao-7-condicoes .lista-condicoes > li',
  },

  // SEÇÃO 8: Aceite Comercial e Contratação
  { sel: '#secao-8-aceite h2', caminho: 'secao8.titulo' },
  {
    sel: '#secao-8-aceite .passo-item strong',
    caminho: 'secao8.passos.{i}.titulo',
    indicePai: '#secao-8-aceite .grid-passos > div',
  },
  {
    sel: '#secao-8-aceite .passo-item p',
    caminho: 'secao8.passos.{i}.descricao',
    indicePai: '#secao-8-aceite .grid-passos > div',
  },
  { sel: '#secao-8-aceite .termo-aceite-texto', caminho: 'secao8.textoTermoAceite' },
  { sel: '#secao-8-aceite .cargo-delfos', caminho: 'secao8.responsavelDelfosCargo' },

  // RODAPÉ OFICIAL
  { sel: '#rodape-oficial .rodape-validade', caminho: 'rodape.textoValidade' },
]

const ESTILO_EDICAO_OM = `<style>
.edicao-alvo { cursor: text; transition: all 0.15s ease-in-out; }
.edicao-alvo:hover { outline: 1.5px dashed rgba(22,163,74,.85); outline-offset: 2px; border-radius: 4px; background: rgba(22,163,74,.03); }
.edicao-alvo[contenteditable="true"] { outline: 2px solid #16A34A !important; background: rgba(22,163,74,.08) !important; border-radius: 4px; padding: 1px 3px; }
.edicao-dica-om { position: fixed; top: 10px; right: 10px; z-index: 99999; background: #064E3B; color: #FFFFFF; font: 700 11px Arial, sans-serif; padding: 6px 12px; border-radius: 8px; opacity: .95; box-shadow: 0 4px 12px rgba(0,0,0,.25); border: 1px solid #10B981; }
@media print {
  .edicao-dica-om { display: none !important; }
  .edicao-alvo, .edicao-alvo[contenteditable="true"] { outline: none !important; background: transparent !important; }
}
</style>`

const SCRIPT_EDICAO_OM = String.raw`<script data-om-edicao>
(function () {
  var MAPA = ${JSON.stringify(MAPEAMENTO_EDICAO_OM)};
  var ICONES = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u2713\u2714\u2022]+\.?\s*/u;
  var atual = null;

  function resolverCaminho(cfg, el) {
    if (cfg.caminho.indexOf('{i}') < 0) return cfg.caminho;
    var indice = 0;
    if (cfg.indicePai) {
      var pai = el.closest(cfg.indicePai);
      if (pai) {
        var todos = Array.prototype.slice.call(document.querySelectorAll(cfg.indicePai));
        indice = todos.indexOf(pai);
        if (indice < 0) indice = 0;
      }
    } else {
      var irmaos = Array.prototype.slice.call(el.parentNode.children);
      indice = irmaos.indexOf(el);
      if (indice < 0) indice = 0;
    }
    return cfg.caminho.replace('{i}', String(indice));
  }

  function salvar(el, cfg) {
    var texto = (el.innerText || el.textContent || '').replace(/\u00a0/g, ' ');
    if (cfg.stripIcone) texto = texto.replace(ICONES, '');
    texto = texto.replace(/^\s+|\s+$/g, '');
    var caminho = resolverCaminho(cfg, el);
    if (el.getAttribute('data-valor-original') !== texto) {
      el.setAttribute('data-valor-original', texto);
      window.parent.postMessage({ tipo: 'proposta-om-edicao', caminho: caminho, valor: texto }, '*');
    }
  }

  function marcarEditaveis() {
    MAPA.forEach(function (cfg, idxCfg) {
      var els = document.querySelectorAll(cfg.sel);
      Array.prototype.forEach.call(els, function (el) {
        el.classList.add('edicao-alvo');
        el.setAttribute('data-edit-cfg', String(idxCfg));
        el.setAttribute('title', 'Clique para editar este texto');
      });
    });
  }
  marcarEditaveis();

  // Dica flutuante no iframe
  var dica = document.createElement('div');
  dica.className = 'edicao-dica-om';
  dica.setAttribute('data-om-edicao', '1');
  dica.textContent = 'Modo de edição: clique em qualquer texto para editar (ESC cancela)';
  document.body.appendChild(dica);

  // Escuta seleções de plano dentro do iframe (se clicar no botão Selecionar do card)
  document.addEventListener('click', function (ev) {
    var btnPlano = ev.target && ev.target.closest ? ev.target.closest('[data-selecionar-plano]') : null;
    if (btnPlano) {
      ev.preventDefault();
      var planoId = btnPlano.getAttribute('data-selecionar-plano');
      window.parent.postMessage({ tipo: 'proposta-om-selecionar-plano', plano: planoId }, '*');
      return;
    }

    var alvo = ev.target && ev.target.closest ? ev.target.closest('.edicao-alvo') : null;
    if (!alvo) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (atual && atual !== alvo) atual.contentEditable = 'false';
    atual = alvo;
    alvo.contentEditable = 'true';
    alvo.setAttribute('data-valor-original', (alvo.innerText || '').trim());
    alvo.focus();
    var range = document.createRange();
    range.selectNodeContents(alvo);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }, true);

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && atual) {
      atual.contentEditable = 'false';
      atual = null;
    }
  });

  document.addEventListener('blur', function (ev) {
    var el = ev.target;
    if (!el || !el.classList || !el.classList.contains('edicao-alvo')) return;
    var cfg = MAPA[Number(el.getAttribute('data-edit-cfg'))];
    if (cfg) salvar(el, cfg);
    el.contentEditable = 'false';
    if (atual === el) atual = null;
  }, true);
})();
</script>`

/**
 * Injeta a camada de edição inline e seletor de elementos no HTML da proposta O&M
 */
export function injetarEdicaoNoPreviewOM(html: string): string {
  if (!html || html.indexOf('data-om-edicao') >= 0) return html
  const idx = html.lastIndexOf('</body>')
  if (idx < 0) return html
  return html.slice(0, idx) + ESTILO_EDICAO_OM + SCRIPT_EDICAO_OM + html.slice(idx)
}

/**
 * Atualiza um caminho arbitrário no ConteudoPropostaOM
 */
export function setCaminhoConteudoOM(
  raiz: Partial<ConteudoPropostaOM> | Record<string, any> | undefined | null,
  caminho: string,
  valor: any,
): ConteudoPropostaOM {
  const base = normalizarConteudoPropostaOM(raiz)
  const partes = caminho.split('.')

  const clonar = (no: any, i: number): any => {
    if (i >= partes.length) return valor
    const chave = partes[i]
    if (Array.isArray(no)) {
      const idx = Number(chave)
      if (Number.isNaN(idx)) return no
      const arr = [...no]
      arr[idx] = clonar(no[idx] ?? {}, i + 1)
      return arr
    }
    const obj = { ...(no || {}) }
    obj[chave] = clonar(no?.[chave], i + 1)
    return obj
  }

  return clonar(base, 0)
}

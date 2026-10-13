/**
 * Modo de edição por elemento da Proposta Técnico-Comercial DIRETO NO PREVIEW.
 *
 * Injeta, APENAS no HTML do preview (iframe), estilos e um script que permitem
 * clicar em qualquer texto editável, alterá-lo na hora e enviar a mudança de
 * volta ao `conteudo_proposta` (via postMessage). O PDF/Word/WhatsApp continuam
 * gerados do HTML LIMPO (sem este script) — o layout impresso não muda em nada.
 *
 * Uso:
 *   const htmlEditavel = injetarEdicaoNoPreview(htmlLimpo)
 *   // iframe srcDoc={htmlEditavel}; componente pai escuta 'message' e aplica
 *   // setCaminhoConteudo(prev, msg.caminho, msg.valor) em conteudo_proposta.
 */

export interface RegraEdicaoPreview {
  /** Seletor CSS do elemento editável (escopo pela seção quando aplicável) */
  sel: string
  /** Caminho dentro de ConteudoProposta; '{i}' é resolvido pelo índice do pai */
  caminho: string
  /** Seletor do pai usado para resolver '{i}' (ex.: '.card-diferencial') */
  indicePai?: string
  /** Remove emoji/check inicial antes de salvar (o template recoloca o ícone) */
  stripIcone?: boolean
  /** Preserva quebras de linha como \n (capa.titulo usa <br />) */
  br?: boolean
}

export const MAPEAMENTO_EDICAO_PROPOSTA: RegraEdicaoPreview[] = [
  // CAPA
  { sel: '.capa-badge-amarelo', caminho: 'capa.badge', stripIcone: true },
  { sel: '.capa-titulo-destaque', caminho: 'capa.titulo', br: true },
  { sel: '.capa-subtitulo-cinza', caminho: 'capa.subtitulo' },
  { sel: '.capa-prep-rotulo', caminho: 'capa.rotuloPreparadaPara' },
  // APRESENTAÇÃO
  {
    sel: '#secao-apresentacao-empresa .tag-secao',
    caminho: 'secaoApresentacao.badge',
  },
  {
    sel: '#secao-apresentacao-empresa .titulo-institucional-azul',
    caminho: 'secaoApresentacao.titulo',
  },
  {
    sel: '#secao-apresentacao-empresa .subtitulo-institucional-verde',
    caminho: 'secaoApresentacao.subtitulo',
  },
  {
    sel: '#secao-apresentacao-empresa p[style*="max-width: 740px"]',
    caminho: 'secaoApresentacao.textoDescritivo',
  },
  {
    sel: '.card-diferencial .card-diferencial-tit',
    caminho: 'secaoApresentacao.diferenciais.{i}.titulo',
    indicePai: '.card-diferencial',
  },
  {
    sel: '.card-diferencial .card-diferencial-desc',
    caminho: 'secaoApresentacao.diferenciais.{i}.descricao',
    indicePai: '.card-diferencial',
  },
  // SITUAÇÃO ATUAL
  {
    sel: '#secao-2-custo-inercia .badge-situacao-atual',
    caminho: 'secaoSituacaoAtual.badge',
    stripIcone: true,
  },
  {
    sel: '#secao-2-custo-inercia .secao-titulo-h2',
    caminho: 'secaoSituacaoAtual.titulo',
  },
  {
    sel: '#secao-2-custo-inercia .secao-desc-sub',
    caminho: 'secaoSituacaoAtual.subtitulo',
  },
  {
    sel: '.card-situacao.consumo .card-situacao-header-title',
    caminho: 'secaoSituacaoAtual.consumoTitulo',
  },
  {
    sel: '.card-situacao.consumo .card-situacao-header-sub',
    caminho: 'secaoSituacaoAtual.consumoSubtitulo',
  },
  {
    sel: '.card-situacao.custos .card-situacao-header-title',
    caminho: 'secaoSituacaoAtual.custoTitulo',
  },
  {
    sel: '.card-situacao.custos .card-situacao-header-sub',
    caminho: 'secaoSituacaoAtual.custoSubtitulo',
  },
  {
    sel: '#secao-2-custo-inercia .barras-topo-title',
    caminho: 'secaoSituacaoAtual.avisoInerciaTitulo',
    stripIcone: true,
  },
  {
    sel: '#secao-2-custo-inercia .barras-topo-sub',
    caminho: 'secaoSituacaoAtual.avisoInerciaSubtitulo',
  },
  // SEU SISTEMA
  {
    sel: '#secao-3-seu-sistema .badge-sistema',
    caminho: 'secaoSeuSistema.badge',
    stripIcone: true,
  },
  { sel: '#secao-3-seu-sistema h2', caminho: 'secaoSeuSistema.titulo' },
  { sel: '#secao-3-seu-sistema h2 + p', caminho: 'secaoSeuSistema.subtitulo' },
  {
    sel: '.col-como-funciona-70 .card-sistema-col-title',
    caminho: 'secaoSeuSistema.blocoComoFunciona.titulo',
    stripIcone: true,
  },
  {
    sel: '.col-como-funciona-70 p[style*="8.5pt"]',
    caminho: 'secaoSeuSistema.blocoComoFunciona.descricao',
  },
  {
    sel: '.col-como-funciona-70 div[style*="flex-wrap"] span',
    caminho: 'secaoSeuSistema.blocoComoFunciona.checklist.{i}',
    indicePai: '.col-como-funciona-70 div[style*="flex-wrap"]',
    stripIcone: true,
  },
  {
    sel: '.col-monitoramento-30 .card-sistema-col-title',
    caminho: 'secaoSeuSistema.blocoMonitoramentoDetalhado.titulo',
    stripIcone: true,
  },
  {
    sel: '.col-monitoramento-30 p[style*="8pt"]',
    caminho: 'secaoSeuSistema.blocoMonitoramentoDetalhado.descricao',
  },
  {
    sel: '.col-monitoramento-30 div[style*="flex-wrap"] span',
    caminho: 'secaoSeuSistema.blocoMonitoramentoDetalhado.checklist.{i}',
    indicePai: '.col-monitoramento-30 div[style*="flex-wrap"]',
    stripIcone: true,
  },
  // PROJEÇÃO 25 ANOS
  {
    sel: '#secao-4-projecao-25anos .badge-diagnostico',
    caminho: 'secaoProjecao25Anos.badge',
    stripIcone: true,
  },
  {
    sel: '#secao-4-projecao-25anos .secao-titulo-h2',
    caminho: 'secaoProjecao25Anos.titulo',
  },
  {
    sel: '#secao-4-projecao-25anos .secao-desc-sub',
    caminho: 'secaoProjecao25Anos.subtitulo',
  },
  {
    sel: '#secao-4-projecao-25anos div[style*="italic"]',
    caminho: 'secaoProjecao25Anos.avisoLegal',
  },
  // INVESTIMENTO
  {
    sel: '#secao-5-investimento-pagamento .hero-invest-label',
    caminho: 'secaoInvestimento.titulo',
  },
  {
    sel: '#secao-5-investimento-pagamento div[style*="letter-spacing: 0.04em"]',
    caminho: 'secaoInvestimento.subtituloCondicoes',
  },
  {
    sel: '#secao-5-investimento-pagamento span[style*="#6B7280"]',
    caminho: 'secaoInvestimento.prazoTextoComplementar',
  },
  {
    sel: '#secao-5-investimento-pagamento span[style*="#FEF3C7"]',
    caminho: 'secaoInvestimento.avisoPostergacaoTitulo',
  },
  {
    sel: '#secao-5-investimento-pagamento span[style*="#78350F"]',
    caminho: 'secaoInvestimento.avisoPostergacaoSubtitulo',
  },
  {
    sel: '#secao-5-investimento-pagamento p[style*="440px"]',
    caminho: 'secaoInvestimento.avisoPostergacaoTexto',
  },
  {
    sel: '#secao-5-investimento-pagamento div[style*="#1E40AF"]',
    caminho: 'secaoInvestimento.avisoLegalRodape',
  },
]

const ESTILO_EDICAO = `<style>
.edicao-alvo { cursor: text; }
.edicao-alvo:hover { outline: 1.5px dashed rgba(22,163,74,.85); outline-offset: 2px; border-radius: 3px; }
.edicao-alvo[contenteditable="true"] { outline: 2px solid #16A34A !important; background: rgba(22,163,74,.06) !important; }
.edicao-dica { position: fixed; top: 8px; right: 8px; z-index: 99999; background: #064E3B; color: #FFFFFF; font: 700 11px Arial, sans-serif; padding: 6px 10px; border-radius: 8px; opacity: .93; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
@media print {
  .edicao-dica { display: none !important; }
  .edicao-alvo, .edicao-alvo[contenteditable="true"] { outline: none !important; background: transparent !important; }
}
</style>`

const SCRIPT_EDICAO = String.raw`<script data-proposta-edicao>
(function () {
  var MAPA = ${JSON.stringify(MAPEAMENTO_EDICAO_PROPOSTA)};
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
      window.parent.postMessage({ tipo: 'proposta-edicao', caminho: caminho, valor: texto }, '*');
    }
  }

  MAPA.forEach(function (cfg, idxCfg) {
    var els = document.querySelectorAll(cfg.sel);
    Array.prototype.forEach.call(els, function (el) {
      el.classList.add('edicao-alvo');
      el.setAttribute('data-edit-cfg', String(idxCfg));
      el.setAttribute('title', 'Clique para editar');
    });
  });

  var dica = document.createElement('div');
  dica.className = 'edicao-dica';
  dica.setAttribute('data-proposta-edicao', '1');
  dica.textContent = 'Modo de edição: clique em um texto para editar (ESC cancela)';
  document.body.appendChild(dica);

  document.addEventListener('click', function (ev) {
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
 * Injeta o modo de edição no HTML do preview (idempotente).
 * O HTML de impressão/PDF NUNCA passa por aqui.
 */
export function injetarEdicaoNoPreview(html: string): string {
  if (!html || html.indexOf('data-proposta-edicao') >= 0) return html
  const idx = html.lastIndexOf('</body>')
  if (idx < 0) return html
  return html.slice(0, idx) + ESTILO_EDICAO + SCRIPT_EDICAO + html.slice(idx)
}

type Qualquer = Record<string, any>

/**
 * Atualização imutável de um caminho dentro de ConteudoProposta.
 * Ex.: setCaminhoConteudo(prev, 'secaoApresentacao.diferenciais.0.titulo', 'Novo')
 */
export function setCaminhoConteudo(raiz: Qualquer, caminho: string, valor: string): Qualquer {
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

  return clonar(raiz, 0)
}

const PAGINACAO_A4_STYLE = `
@page{size:A4;margin:0}
html,body{margin:0!important;padding:0!important;background:#E5E7EB!important}
.proposta-container.a4-paginada{width:210mm!important;max-width:none!important;margin:0 auto!important;padding:0!important;box-sizing:border-box}
.proposta-container.a4-paginada>.proposta-secao-page{display:none!important}
.a4-paginada .a4-pages{display:block;width:210mm;margin:0 auto}
.a4-paginada .a4-page{position:relative;display:flex;flex-direction:column;width:210mm;height:297mm;min-height:297mm;max-height:297mm;box-sizing:border-box;margin:0;padding:10mm 7mm 7mm;overflow:hidden;background:#fff;color:#1F2937;box-shadow:none;break-after:page;page-break-after:always}
.a4-paginada .a4-page:last-child{break-after:auto;page-break-after:auto}
.a4-paginada .a4-page-main{display:block;position:relative;flex:1 1 auto;min-height:0;height:auto;overflow:hidden}
.a4-paginada .a4-fragment{display:block;width:100%;height:auto;min-height:0;margin:0;padding:0;box-sizing:border-box;overflow:visible;background:#fff;box-shadow:none;border-radius:0}
.a4-paginada .a4-fragment>.secao-body{display:flex;flex-direction:column;width:100%;height:auto;min-height:0;overflow:visible}
.a4-paginada .a4-page:not([data-cover]) .a4-page-footer{display:block;flex:0 0 auto;width:100%;margin-top:2mm}
.a4-paginada .a4-page-footer .doc-footer{display:block!important;position:static!important;width:100%!important;margin:0!important;padding:0!important;break-inside:avoid!important;page-break-inside:avoid!important}
.a4-paginada .a4-page-footer .doc-footer-card{border-top:1.5px solid #86EFAC;background:#F9FAFB;box-shadow:none;border-radius:6px;padding:2mm 2.5mm 1.6mm}
.a4-paginada .a4-page[data-cover]{padding:0 0 29px}
.a4-paginada .a4-page[data-cover] .a4-page-main{display:flex;flex:1 1 0;min-height:0;overflow:hidden}
.a4-paginada .a4-page[data-cover] .a4-fragment,.a4-paginada .a4-page[data-cover] .a4-fragment>.secao-body{display:flex;flex:1 1 0;min-height:0;overflow:hidden}
.a4-paginada .a4-page[data-cover] .capa-wrapper{display:flex;flex:1 1 0!important;flex-direction:column;justify-content:flex-start;min-height:0!important;height:100%!important;overflow:hidden}
.a4-paginada .a4-page[data-cover] .capa-bottom-site-email{display:none!important}
.a4-paginada .a4-page[data-cover]>.a4-page-footer{display:block;flex:0 0 auto;box-sizing:border-box;width:100%;margin:0;padding:0 42px;background:#fff}
.a4-paginada .a4-page[data-cover]>.a4-page-footer .capa-bottom-site-email{display:block!important;margin:0!important}
.a4-paginada .a4-page[data-cover]>.a4-page-footer .doc-footer{width:100%}
.a4-paginada .a4-page[data-page="2"] .secao-header-card.institucional{padding:8px 12px;margin-bottom:6px}
.a4-paginada .a4-page[data-page="2"] .secao-header-card.institucional p{font-size:9.5pt;line-height:1.38;margin:5px 0 0}
.a4-paginada .a4-page[data-page="2"] .grid-diferenciais-cards{gap:5px;margin-top:5px}
.a4-paginada .a4-page[data-page="2"] .card-diferencial{padding:5px 6px;gap:3px}
.a4-paginada .a4-page[data-page="2"] .card-diferencial-icon{width:20px;height:20px}
.a4-paginada .a4-page[data-page="2"] .card-diferencial-tit{font-size:8pt}
.a4-paginada .a4-page[data-page="2"] .card-diferencial-desc{font-size:7.2pt;line-height:1.18}
.a4-paginada .a4-page[data-page="2"] .portfolio-wrapper{margin-top:7px}
.a4-paginada .a4-page[data-page="2"] .portfolio-header-row{margin-bottom:5px;padding-bottom:4px}
.a4-paginada .a4-page[data-page="2"] .portfolio-titulo-azul{font-size:12pt}
.a4-paginada .a4-page[data-page="2"] .portfolio-sub-cinza{font-size:8.3pt}
.a4-paginada .a4-page[data-page="2"] .grid-portfolio-6{gap:6px}
.a4-paginada .a4-page[data-page="2"] .card-portfolio-thumb-wrap{height:148px;padding:5px}
.a4-paginada .a4-page[data-page="2"] .card-portfolio-info{padding:4px 6px 5px}
.a4-paginada .a4-page[data-page="2"] .card-portfolio-titulo{font-size:9pt;line-height:1.25;margin-bottom:2px}
.a4-paginada .a4-page[data-page="2"] .card-portfolio-meta-row{font-size:7pt}
.a4-paginada .a4-page[data-page="6"] .assinaturas-grid-final{align-items:stretch}
.a4-paginada .a4-page[data-page="6"] .assinatura-bloco{min-height:190px;height:auto;justify-content:flex-start;padding:9px 12px}
.a4-paginada .a4-page[data-page="6"] .linha-assinatura-final{margin:50px 0 8px}
.a4-paginada .a4-page[data-page="6"] .assinatura-dados{margin-top:5px;padding-top:5px}
@media print{.proposta-container.a4-paginada~.print-fixed-footer{display:none!important}html,body{background:#fff!important}.a4-paginada .a4-page{margin:0;box-shadow:none}.a4-paginada .a4-page[data-cover]{padding:0 0 29px}.a4-paginada .a4-page-footer{break-inside:avoid;page-break-inside:avoid}}
`

const PAGINACAO_A4_SCRIPT = String.raw`<script data-proposta-paginacao-a4>
(function(){
  'use strict';
  if(window.__propostaA4Paginada)return;
  window.__propostaA4Paginada=true;
  function first(root,sel){return root.querySelector(sel)}
  function originalFooter(section){return section&&first(section,':scope>.doc-footer')}
  function fragment(source, selectors, includeHeader){
    var f=document.createElement('section');f.className='a4-fragment';f.dataset.sourceId=source.id;
    var body=document.createElement('div');body.className='secao-body';
    var sourceBody=first(source,':scope>.secao-body');
    if(includeHeader){var h=sourceBody&&first(sourceBody,':scope>.doc-header');if(h)body.appendChild(h.cloneNode(true))}
    var children=sourceBody?Array.from(sourceBody.children).filter(function(x){return !x.matches('.doc-header,.doc-footer')}):[];
    selectors.forEach(function(sel){
      if(sel==='@seasonality'){
        var graph=children.find(function(x){return (x.innerText||x.textContent||'').indexOf('Sazonalidade Solar')>=0});
        if(graph)body.appendChild(graph.cloneNode(true));
      }else{
        children.filter(function(x){return x.matches(sel)}).forEach(function(x){body.appendChild(x.cloneNode(true))});
      }
    });
    f.appendChild(body);return f;
  }
  function makePage(i,cover){var p=document.createElement('article');p.className='a4-page';p.dataset.page=String(i);if(cover)p.dataset.cover='true';var m=document.createElement('div');m.className='a4-page-main';p.appendChild(m);return {page:p,main:m}}
  function addFooter(page,footerSource,cover){if(!footerSource)return;var f=document.createElement('div');f.className='a4-page-footer';if(cover)f.classList.add('a4-cover-footer');var clone=footerSource.cloneNode(true);f.appendChild(clone);page.appendChild(f)}
  function build(){
    var root=document.querySelector('.proposta-container');if(!root)return;
    var sections=Array.from(root.querySelectorAll(':scope>.proposta-secao-page'));
    var byId={};sections.forEach(function(s){byId[s.id]=s});
    var pages=document.createElement('div');pages.className='a4-pages';
    var plan=[
      {ids:['secao-1-capa'],selectors:[['.capa-wrapper']],cover:true,footer:'secao-1-capa'},
      {ids:['secao-apresentacao-empresa'],selectors:[['.secao-header-card.institucional','.portfolio-wrapper']],header:true,footer:'secao-apresentacao-empresa'},
      {ids:['secao-2-custo-inercia'],selectors:[['*']],header:true,footer:'secao-2-custo-inercia'},
      {ids:['secao-3-seu-sistema'],selectors:[['.secao-header-card.sistema','.grid-sistema-cards','@seasonality']],header:true,footer:'secao-3-seu-sistema'},
      {ids:['secao-3-seu-sistema','secao-4-projecao-25anos'],selectors:[['.grid-sistema-duas-colunas'],['.secao-header-card.inercia','.cards-metricas-25anos','[style*="font-style: italic"]']],header:[false,true],footer:'secao-4-projecao-25anos'},
      {ids:['secao-5-investimento-pagamento'],selectors:[['*']],header:true,footer:'secao-5-investimento-pagamento'}
    ];
    var pageNo=0;
    plan.forEach(function(spec){
      pageNo+=1;var x=makePage(pageNo,!!spec.cover);
      spec.ids.forEach(function(id,j){var source=byId[id];if(!source)return;var f=fragment(source,spec.selectors[j],Array.isArray(spec.header)?spec.header[j]:spec.header);x.main.appendChild(f);});
      var sourceForFooter=byId[spec.ids[0]];
      if(spec.cover){var old=first(x.main,'.capa-bottom-site-email');if(old)old.remove()}
      var footerSource=originalFooter(byId[spec.footer]);if(spec.cover){var coverFooter=sourceForFooter&&first(sourceForFooter,'.capa-bottom-site-email');if(coverFooter){var wrap=document.createElement('div');wrap.className='doc-footer';wrap.appendChild(coverFooter.cloneNode(true));footerSource=wrap}}
      addFooter(x.page,footerSource,!!spec.cover);pages.appendChild(x.page);
    });
    root.classList.add('a4-paginada');
    root.replaceChildren(pages);
    root.dataset.a4Pages=String(pages.children.length);
    window.dispatchEvent(new CustomEvent('proposta-a4-paginada',{detail:{pages:pages.children.length}}));
  }
  function start(){if(document.readyState==='loading')return;var root=document.querySelector('.proposta-container');if(!root)return;var imgs=Array.from(document.images);Promise.all(imgs.map(function(i){return i.decode?i.decode().catch(function(){}):Promise.resolve()})).then(build)}
  if(document.readyState==='complete')setTimeout(start,0);else window.addEventListener('load',start,{once:true});
})();
</script>`

export function injetarPaginacaoA4(html: string): string {
  if (!html || html.includes('data-proposta-paginacao-a4')) return html
  const marker = '<style data-proposta-a4-paginacao>'
  const style = marker + PAGINACAO_A4_STYLE + '</style>'
  const at = html.lastIndexOf('</head>')
  const withStyle = at >= 0 ? html.slice(0, at) + style + html.slice(at) : style + html
  const bodyAt = withStyle.lastIndexOf('</body>')
  return bodyAt >= 0
    ? withStyle.slice(0, bodyAt) + PAGINACAO_A4_SCRIPT + withStyle.slice(bodyAt)
    : withStyle + PAGINACAO_A4_SCRIPT
}

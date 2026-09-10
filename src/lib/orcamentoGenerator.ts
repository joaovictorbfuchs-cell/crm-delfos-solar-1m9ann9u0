// Re-exporta o gerador de propostas e orçamentos solares
export * from './propostaSolarGenerator'
export {
  gerarHTMLPropostaSolar as gerarHTMLOrcamento,
  abrirPropostaSolarEmNovaAba as abrirOrcamentoEmNovaAba,
  baixarPropostaSolarHTML as baixarOrcamentoHTML,
  DADOS_EMPRESA_DELFOS_SOLAR as DADOS_EMPRESA_DELFOS_ORCAMENTO,
} from './propostaSolarGenerator'
export type {
  PropostaSolarPDFInput as OrcamentoSolarPDFInput,
  DadosEmpresaDelfosCompleto as DadosEmpresaOrcamento,
} from './propostaSolarGenerator'

// Componente de documento de Contrato O&M para renderização via @react-pdf/renderer
import React from 'react'
import { Document, Page, Text, View, StyleSheet, type DocumentProps } from '@react-pdf/renderer'
import {
  type DadosContratoOM,
  normalizarDadosContrato,
  getAnexoIPlanoConteudo,
  getAnexoIIServicos,
  DADOS_FIXOS_CONTRATADA_CONTRATO,
} from '@/lib/contratoGenerator'
import { formatCurrency } from '@/lib/formatters'

// 25mm em pontos: 25 * 72 / 25.4 = ~70.87pt
const MARGIN_25MM = 70.87

const styles = StyleSheet.create({
  page: {
    padding: MARGIN_25MM,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  headerInstitucional: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#16a34a',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 16,
  },
  headerLogo: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    color: '#15803d',
    letterSpacing: 0.5,
  },
  headerSubLogo: {
    fontFamily: 'Times-Roman',
    fontSize: 7.5,
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerRight: {
    textAlign: 'right',
    fontSize: 8,
    color: '#4b5563',
  },
  titulo: {
    fontFamily: 'Times-Bold',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    textAlign: 'center',
    color: '#374151',
    marginBottom: 16,
  },
  paragrafo: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.55,
    textAlign: 'justify',
    marginBottom: 10,
    color: '#000000',
  },
  bold: {
    fontFamily: 'Times-Bold',
  },
  italic: {
    fontFamily: 'Times-Italic',
  },
  blocoTecnico: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    borderStyle: 'solid',
    padding: 8,
    marginTop: 6,
    marginBottom: 10,
    fontSize: 9,
    lineHeight: 1.45,
  },
  blocoTecnicoTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    color: '#166534',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  clausulaTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 4,
    color: '#000000',
  },
  listaItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 12,
  },
  listaNumero: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    width: 18,
  },
  listaTexto: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: 'justify',
    flex: 1,
  },
  dataLocal: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    marginTop: 18,
    marginBottom: 24,
    textAlign: 'left',
    color: '#000000',
  },
  assinaturasLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 20,
  },
  assinaturaBloco: {
    flex: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  linhaAssinatura: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    borderTopStyle: 'solid',
    width: '100%',
    marginBottom: 4,
  },
  rotuloAssinatura: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    marginBottom: 1,
    textAlign: 'center',
  },
  subAssinatura: {
    fontFamily: 'Times-Roman',
    fontSize: 8.5,
    textAlign: 'center',
    color: '#374151',
  },
  anexoTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    textAlign: 'center',
    color: '#166534',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  anexoSubtitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    textAlign: 'center',
    color: '#374151',
    marginBottom: 12,
  },
  // Estilos da Tabela Anexo II
  tabela: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderStyle: 'solid',
    marginTop: 8,
    marginBottom: 10,
  },
  tabelaLinhaHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    borderBottomStyle: 'solid',
    alignItems: 'center',
  },
  tabelaLinha: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid',
  },
  colItem: {
    width: '7%',
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d1d5db',
    borderRightStyle: 'solid',
    textAlign: 'center',
    fontSize: 8,
    fontFamily: 'Times-Bold',
  },
  colServico: {
    width: '25%',
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d1d5db',
    borderRightStyle: 'solid',
    fontSize: 8,
    fontFamily: 'Times-Bold',
  },
  colDescricao: {
    width: '36%',
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d1d5db',
    borderRightStyle: 'solid',
    fontSize: 7.5,
    fontFamily: 'Times-Roman',
    lineHeight: 1.3,
  },
  colValor: {
    width: '12%',
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d1d5db',
    borderRightStyle: 'solid',
    textAlign: 'right',
    fontSize: 8,
    fontFamily: 'Times-Bold',
    color: '#166534',
  },
  colHora: {
    width: '10%',
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#d1d5db',
    borderRightStyle: 'solid',
    textAlign: 'center',
    fontSize: 7.5,
    fontFamily: 'Times-Roman',
  },
  colObs: {
    width: '10%',
    padding: 4,
    fontSize: 7,
    fontFamily: 'Times-Roman',
    color: '#4b5563',
  },
  rodapeAnexoII: {
    fontSize: 7.5,
    fontFamily: 'Times-Italic',
    color: '#4b5563',
    marginTop: 8,
    textAlign: 'justify',
  },
})

export interface ContratoOMPDFDocumentProps extends DocumentProps {
  dados: Partial<DadosContratoOM>
}

export const ContratoOMPDFDocument: React.FC<ContratoOMPDFDocumentProps> = ({
  dados: dadosInput,
  ...docProps
}) => {
  const dados = normalizarDadosContrato(dadosInput)
  const anexoI = getAnexoIPlanoConteudo(dados.planoSelecionado)
  const anexoIIItens = getAnexoIIServicos(dados.servicosAdicionais)

  return (
    <Document
      title={`CONTRATO O&M — ${dados.nomeRazaoSocial}`}
      author="DELFOS ENGENHARIA LTDA"
      subject={`Contrato de Prestação de Serviços O&M — Plano ${dados.planoSelecionado}`}
      {...docProps}
    >
      {/* ========================================================================= */}
      {/* PÁGINAS DO CORPO PRINCIPAL DO CONTRATO                                    */}
      {/* ========================================================================= */}
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho Institucional Delfos */}
        <View style={styles.headerInstitucional}>
          <View>
            <Text style={styles.headerLogo}>DELFOS ENGENHARIA</Text>
            <Text style={styles.headerSubLogo}>
              Operação, Manutenção & Eficiência Energética Solar
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text>CNPJ: {DADOS_FIXOS_CONTRATADA_CONTRATO.cnpj}</Text>
            <Text>Erechim/RS</Text>
          </View>
        </View>

        {/* Títulos do Contrato */}
        <Text style={styles.titulo}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</Text>
        <Text style={styles.subtitulo}>
          Acompanhamento, Análise de Performance e Manutenção de Gerador Fotovoltaico
        </Text>

        {/* Preâmbulo / Qualificação das Partes */}
        <Text style={styles.paragrafo}>
          Pelo presente instrumento particular, de um lado,{' '}
          <Text style={styles.bold}>DELFOS ENGENHARIA LTDA</Text>, pessoa jurídica de direito
          privado, inscrita no CNPJ sob o nº{' '}
          <Text style={styles.bold}>{DADOS_FIXOS_CONTRATADA_CONTRATO.cnpj}</Text>, com sede na{' '}
          {DADOS_FIXOS_CONTRATADA_CONTRATO.endereco}, neste ato representada por seu sócio
          administrador e responsável técnico{' '}
          <Text style={styles.bold}>{DADOS_FIXOS_CONTRATADA_CONTRATO.representanteNome}</Text>,{' '}
          {DADOS_FIXOS_CONTRATADA_CONTRATO.representanteCargo}, portador do CPF nº{' '}
          <Text style={styles.bold}>{DADOS_FIXOS_CONTRATADA_CONTRATO.representanteCpf}</Text>,
          doravante denominada <Text style={styles.bold}>CONTRATADA</Text>; e, de outro lado,{' '}
          <Text style={styles.bold}>{dados.nomeRazaoSocial}</Text>, portador do CPF/CNPJ nº{' '}
          <Text style={styles.bold}>{dados.cpfCnpj}</Text>, domiciliado no endereço{' '}
          <Text style={styles.bold}>{dados.enderecoInstalacao}</Text>,{' '}
          <Text style={styles.bold}>{dados.municipio}</Text> com contato no telefone{' '}
          <Text style={styles.bold}>{dados.telefone || 'não informado'}</Text> e e-mail{' '}
          <Text style={styles.bold}>{dados.email || 'não informado'}</Text>, doravante denominado{' '}
          <Text style={styles.bold}>CONTRATANTE</Text>, têm entre si, justo e contratado, o presente
          Contrato de Prestação de Serviços de Monitoramento.
        </Text>

        {/* Bloco de Dados Técnicos */}
        <View style={styles.blocoTecnico}>
          <Text style={styles.blocoTecnicoTitulo}>DADOS TÉCNICOS DO SISTEMA FOTOVOLTAICO:</Text>
          <Text>
            <Text style={styles.bold}>Número total de módulos fotovoltaicos:</Text>{' '}
            {dados.numeroModulos} painéis
          </Text>
          <Text>
            <Text style={styles.bold}>Fabricante e potência dos inversores:</Text>{' '}
            {dados.marcaInversores}
          </Text>
          <Text>
            <Text style={styles.bold}>Local de instalação:</Text> {dados.localInstalacao}
          </Text>
          <Text>
            <Text style={styles.bold}>Endereço da instalação:</Text>{' '}
            {dados.enderecoInstalacaoDiferente || dados.enderecoInstalacao}
          </Text>
        </View>

        {/* Plano Contratado e Anexos */}
        <Text style={styles.paragrafo}>
          <Text style={styles.bold}>PLANO CONTRATADO: {dados.planoSelecionado}</Text>
        </Text>

        <Text style={styles.paragrafo}>
          Fica desde logo definido que o presente contrato é composto e integrado, para todos os
          fins e efeitos de direito, pelos seguintes documentos:
        </Text>

        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>a)</Text>
          <Text style={styles.listaTexto}>O corpo principal, contendo as Cláusulas 1ª a 13ª;</Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>b)</Text>
          <Text style={styles.listaTexto}>
            O Anexo I — Detalhamento de Serviços e Tabela de Valores;
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>c)</Text>
          <Text style={styles.listaTexto}>O Anexo II — Tabela de Serviços Adicionais.</Text>
        </View>

        <Text style={styles.paragrafo}>
          A <Text style={styles.bold}>CONTRATANTE</Text> declara ter recebido, lido e concordado
          integralmente com o teor de todos os documentos acima referidos, que passam a fazer parte
          inseparável deste instrumento contratual.
        </Text>

        {/* Cláusula 1ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 1ª – OBJETO</Text>
        <Text style={styles.paragrafo}>
          O objeto do presente contrato é a prestação, pela{' '}
          <Text style={styles.bold}>CONTRATADA</Text> ao{' '}
          <Text style={styles.bold}>CONTRATANTE</Text>, de serviços de acompanhamento, análise de
          performance e manutenção preventiva de gerador fotovoltaico, conforme as especificações
          técnicas e operacionais descritas no Anexo I, bem como a realização de eventuais serviços
          adicionais previstos no Anexo II, quando solicitados pelo{' '}
          <Text style={styles.bold}>CONTRATANTE</Text>.
        </Text>

        {/* Cláusula 2ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 2ª – PRAZO E VIGÊNCIA</Text>
        <Text style={styles.paragrafo}>
          2.1 O presente contrato terá vigência de 12 (doze) meses, contados a partir da data de sua
          assinatura.
        </Text>
        <Text style={styles.paragrafo}>
          2.2 Ao término do prazo inicial, o contrato será automaticamente renovado por períodos
          sucessivos de 12 (doze) meses, salvo manifestação em contrário de qualquer das partes,
          comunicada por escrito com antecedência mínima de 30 (trinta) dias do término da vigência
          em curso.
        </Text>

        {/* Cláusula 3ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 3ª – OBRIGAÇÕES DA CONTRATADA</Text>
        <Text style={styles.paragrafo}>
          3.1 A <Text style={styles.bold}>CONTRATADA</Text> obriga-se a executar os serviços
          descritos no Anexo I, observando as diretrizes técnicas e os prazos ali estabelecidos.
        </Text>
        <Text style={styles.paragrafo}>
          3.2 A <Text style={styles.bold}>CONTRATADA</Text> se compromete a atuar em dias úteis e
          horário comercial (segunda a sexta-feira, das 08h00 às 17h30), salvo disposição em
          contrário expressamente acordada entre as partes.
        </Text>
        <Text style={styles.paragrafo}>
          3.3 Para manutenções e inspeções, o prazo máximo de atuação será de até 2 (dois) dias
          úteis, contados a partir da notificação de anomalia ou solicitação de serviço, desde que
          não haja necessidade de peças especiais ou condições excepcionais que justifiquem prazo
          superior, hipótese em que a <Text style={styles.bold}>CONTRATADA</Text> comunicará o novo
          prazo ao <Text style={styles.bold}>CONTRATANTE</Text>.
        </Text>

        {/* Cláusula 4ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 4ª – OBRIGAÇÕES DO CONTRATANTE</Text>
        <Text style={styles.paragrafo}>
          4.1 O <Text style={styles.bold}>CONTRATANTE</Text> obriga-se a:
        </Text>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>1.</Text>
          <Text style={styles.listaTexto}>
            Permitir o acesso irrestrito da <Text style={styles.bold}>CONTRATADA</Text> ao local de
            instalação do sistema fotovoltaico, para fins de monitoramento, inspeção, manutenção e
            reparo, em dias úteis e horário comercial, mediante agendamento prévio.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>2.</Text>
          <Text style={styles.listaTexto}>
            Fornecer à <Text style={styles.bold}>CONTRATADA</Text> todas as informações técnicas
            necessárias à execução dos serviços, incluindo manuais, diagramas elétricos, dados de
            garantia e histórico de manutenções anteriores.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>3.</Text>
          <Text style={styles.listaTexto}>
            Manter o ambiente da instalação em condições adequadas de segurança e limpeza.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>4.</Text>
          <Text style={styles.listaTexto}>
            Pagar pontualmente os valores devidos na forma da Cláusula 5ª.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>5.</Text>
          <Text style={styles.listaTexto}>
            Disponibilizar um ponto de acesso WiFi de alta qualidade de sinal próximo aos
            inversores, essencial para garantir o monitoramento remoto contínuo do sistema. O nome
            da rede (SSID) deve conter apenas letras ou números, sem espaços ou caracteres
            especiais. O <Text style={styles.bold}>CONTRATANTE</Text> deverá fornecer login e senha
            de acesso à <Text style={styles.bold}>CONTRATADA</Text>.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>6.</Text>
          <Text style={styles.listaTexto}>
            Comunicar imediatamente à <Text style={styles.bold}>CONTRATADA</Text> qualquer alteração
            nas condições de funcionamento do sistema ou ocorrência de eventos que possam afetar seu
            desempenho.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>7.</Text>
          <Text style={styles.listaTexto}>
            Informar as credenciais de acesso aos portais de monitoramento dos inversores.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>8.</Text>
          <Text style={styles.listaTexto}>
            Conceder acesso ao portal da concessionária/cooperativa de energia local para a
            contratada, a fim desta obter as informações para elaboração dos relatórios mensais.
          </Text>
        </View>

        {/* Cláusula 5ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 5ª – VALOR E CONDIÇÕES DE PAGAMENTO</Text>
        <Text style={styles.paragrafo}>
          5.1. Pelos serviços prestados, a <Text style={styles.bold}>CONTRATANTE</Text> pagará à{' '}
          <Text style={styles.bold}>CONTRATADA</Text> o valor total de{' '}
          <Text style={styles.bold}>{formatCurrency(dados.valorTotal)}</Text> (
          <Text style={styles.italic}>{dados.valorEscritoTotal}</Text>), dividido em 12 (doze)
          parcelas mensais, iguais e sucessivas, no valor unitário de{' '}
          <Text style={styles.bold}>{formatCurrency(dados.valorMensal)}</Text> (
          <Text style={styles.italic}>{dados.valorEscritoMensal}</Text>) cada, conforme plano
          contratado.
        </Text>
        <Text style={styles.paragrafo}>
          5.2 O pagamento será efetuado até o 10º (décimo) dia de cada mês, mediante boleto bancário
          ou PIX a ser emitido pela <Text style={styles.bold}>CONTRATADA</Text>.
        </Text>
        <Text style={styles.paragrafo}>
          5.3 Em caso de atraso no pagamento, incidirá multa de 2% (dois por cento) sobre o valor
          devido, além de juros de mora de 1% (um por cento) ao mês, e atualização monetária pelo
          índice IGP-M (e, na impossibilidade de sua apuração, pelo IPCA), calculados pro rata die.
        </Text>

        {/* Cláusula 6ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 6ª – REAJUSTE ANUAL</Text>
        <Text style={styles.paragrafo}>
          6.1 O valor dos serviços será reajustado anualmente, na data de aniversário do contrato,
          pelo índice IGP-M (ou, na falta deste, pelo IPCA), com base na variação acumulada nos
          últimos 12 meses.
        </Text>
        <Text style={styles.paragrafo}>
          6.2 Caso o sistema seja ampliado (aumento de módulos, inversores ou potência instalada), a{' '}
          <Text style={styles.bold}>CONTRATADA</Text> poderá solicitar reajuste proporcional do
          valor dos serviços, mediante apresentação de documentação técnica comprovando a ampliação.
          O novo valor entrará em vigor no mês subsequente à aprovação do reajuste pelo{' '}
          <Text style={styles.bold}>CONTRATANTE</Text>.
        </Text>

        {/* Cláusula 7ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 7ª – GARANTIA DOS SERVIÇOS</Text>
        <Text style={styles.paragrafo}>
          7.1 A <Text style={styles.bold}>CONTRATADA</Text> garante o trabalho realizado pelo prazo
          de 6 (seis) meses, contados da data de execução do serviço, excetuando-se defeitos
          decorrentes de uso inadequado, acidentes, intervenções de terceiros não autorizados ou
          condições climáticas extremas.
        </Text>
        <Text style={styles.paragrafo}>
          7.2 Os materiais empregados nos serviços serão cobertos pela garantia do respectivo
          fabricante, não assumindo a <Text style={styles.bold}>CONTRATADA</Text> qualquer
          responsabilidade adicional além daquelas previstas na garantia original.
        </Text>

        {/* Cláusula 8ª */}
        <Text style={styles.clausulaTitulo}>
          CLÁUSULA 8ª – CONFIDENCIALIDADE E PROTEÇÃO DE DADOS
        </Text>
        <Text style={styles.paragrafo}>
          8.1 As partes se comprometem a manter sigilo absoluto sobre todas as informações técnicas,
          comerciais e operacionais a que tiverem acesso em virtude deste contrato, incluindo dados
          de geração, parâmetros de inversores, dados cadastrais e financeiros do{' '}
          <Text style={styles.bold}>CONTRATANTE</Text>, durante e após a vigência contratual.
        </Text>
        <Text style={styles.paragrafo}>
          8.2 As partes se obrigam a cumprir integralmente as disposições da Lei nº 13.709/2018 (Lei
          Geral de Proteção de Dados Pessoais – LGPD), em especial quanto ao tratamento de dados
          pessoais eventualmente coletados, armazenados ou processados no âmbito da execução dos
          serviços, responsabilizando-se cada parte por suas respectivas obrigações como
          controladora ou operadora de dados.
        </Text>

        {/* Cláusula 9ª */}
        <Text style={styles.clausulaTitulo}>
          CLÁUSULA 9ª – DEFINIÇÃO DE ANOMALIA E PROTOCOLO OPERACIONAL DE DIAGNÓSTICA
        </Text>
        <Text style={styles.paragrafo}>
          9.1 Para os fins deste contrato, considera-se anomalia qualquer falha de equipamento
          detectada automaticamente pelo sistema de monitoramento (inversor desligado, perda de
          comunicação, queda abrupta de geração, funcionamento fora dos parâmetros previstos, etc.),
          bem como qualquer notificação feita pelo <Text style={styles.bold}>CONTRATANTE</Text>.
        </Text>
        <Text style={styles.paragrafo}>
          9.2 O protocolo operacional de diagnóstico integrado seguirá as seguintes etapas:
        </Text>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>1.</Text>
          <Text style={styles.listaTexto}>
            <Text style={styles.bold}>Detecção:</Text> O sistema de monitoramento detecta a anomalia
            automaticamente ou mediante comunicação do <Text style={styles.bold}>CONTRATANTE</Text>.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>2.</Text>
          <Text style={styles.listaTexto}>
            <Text style={styles.bold}>Solicitação de Informações:</Text> A{' '}
            <Text style={styles.bold}>CONTRATADA</Text> solicita ao{' '}
            <Text style={styles.bold}>CONTRATANTE</Text> o envio de fotos e/ou vídeos do equipamento
            afetado, bem como informações complementares (histórico de funcionamento, mensagens de
            erro, comportamento observado) para análise técnica preliminar.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>3.</Text>
          <Text style={styles.listaTexto}>
            <Text style={styles.bold}>Triagem Remota:</Text> A{' '}
            <Text style={styles.bold}>CONTRATADA</Text> realiza análise técnica remota com base nas
            informações, fotos e vídeos fornecidos, buscando identificar a causa provável da
            anomalia e tentar resolvê-la remotamente através de orientações técnicas, reconfiguração
            de parâmetros ou outras soluções que não exijam presença física.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>4.</Text>
          <Text style={styles.listaTexto}>
            <Text style={styles.bold}>Diagnóstico In Loco:</Text> Caso a triagem remota não seja
            suficiente para resolver a anomalia, a <Text style={styles.bold}>CONTRATADA</Text>{' '}
            agendará visita técnica in loco. O tempo despendido nesta visita será cobrado conforme a
            Tabela de Serviços Adicionais (Anexo II), sendo faturado por hora ou fração de hora
            conforme o item correspondente.
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>5.</Text>
          <Text style={styles.listaTexto}>
            <Text style={styles.bold}>Execução e Faturamento:</Text> Realizado o serviço conforme
            necessário, a <Text style={styles.bold}>CONTRATADA</Text> fornecerá relatório de
            conclusão contendo descrição do serviço realizado, peças utilizadas (se houver), tempo
            despendido e recomendações. O faturamento seguirá a Tabela de Serviços Adicionais (Anexo
            II), sendo o valor cobrado conforme o serviço efetivamente prestado.
          </Text>
        </View>

        {/* Cláusula 10ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 10ª – RESCISÃO CONTRATUAL</Text>
        <Text style={styles.paragrafo}>
          10.1 Rescisão por conveniência: Qualquer das partes poderá rescindir o presente contrato,
          a qualquer tempo, mediante comunicação escrita com aviso prévio de 30 (trinta) dias.
        </Text>
        <Text style={styles.paragrafo}>
          10.1.1 Caso a rescisão seja motivada pelo <Text style={styles.bold}>CONTRATANTE</Text>,
          este deverá pagar multa equivalente a 50% (cinquenta por cento) dos valores mensais
          remanescentes até o final do período contratado. Todos os valores em aberto (mensalidades
          vencidas, serviços adicionais realizados e multa rescisória) deverão ser quitados
          integralmente no prazo de 10 (dez) dias após a data de rescisão.
        </Text>
        <Text style={styles.paragrafo}>
          10.2 Rescisão por inadimplemento: A <Text style={styles.bold}>CONTRATADA</Text> poderá
          rescindir o contrato independentemente de aviso prévio, no caso de atraso no pagamento
          superior a 30 (trinta) dias. Nesta hipótese, o{' '}
          <Text style={styles.bold}>CONTRATANTE</Text> permanecerá obrigado ao pagamento das
          mensalidades vencidas e dos serviços adicionais eventualmente prestados.
        </Text>

        {/* Cláusula 11ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 11ª – FORÇA MAIOR E SEGURO</Text>
        <Text style={styles.paragrafo}>
          11.1 Nenhuma das partes será responsável por perdas ou atrasos no cumprimento de suas
          obrigações decorrentes de eventos de força maior ou caso fortuito, assim entendidos
          aqueles imprevisíveis ou, se previsíveis, inevitáveis, tais como guerras, greves,
          catástrofes naturais, tempestades com granizo, queda de raios, incêndios de grandes
          proporções, interrupções no fornecimento de energia elétrica pela concessionária, atos de
          autoridades públicas que impeçam a execução dos serviços, e outros eventos equivalentes,
          desde que devidamente comprovados.
        </Text>
        <Text style={styles.paragrafo}>
          11.2 O <Text style={styles.bold}>CONTRATANTE</Text> declara-se ciente da necessidade de
          manter seguro patrimonial adequado que cubra os riscos mencionados, bem como seguro de
          responsabilidade civil para danos a terceiros eventualmente causados pelo sistema. A{' '}
          <Text style={styles.bold}>CONTRATADA</Text> recomenda fortemente que o{' '}
          <Text style={styles.bold}>CONTRATANTE</Text> contrate seguro específico para a instalação
          fotovoltaica, com cobertura abrangente para eventos climáticos (granizo, tempestades,
          raios), furto e roubo, de modo a proteger adequadamente seu investimento e garantir a
          continuidade operacional do sistema em caso de sinistro.
        </Text>

        {/* Cláusula 12ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 12ª – RESPONSABILIDADE CIVIL</Text>
        <Text style={styles.paragrafo}>
          12.1 A <Text style={styles.bold}>CONTRATADA</Text> responderá exclusivamente por danos
          diretos comprovadamente causados ao <Text style={styles.bold}>CONTRATANTE</Text> em
          decorrência de negligência grave na execução dos serviços objeto deste contrato, desde que
          o <Text style={styles.bold}>CONTRATANTE</Text> tenha cumprido integralmente suas
          obrigações contratuais.
        </Text>
        <Text style={styles.paragrafo}>
          12.2 Ficam expressamente excluídos da responsabilidade da{' '}
          <Text style={styles.bold}>CONTRATADA</Text>:
        </Text>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>1.</Text>
          <Text style={styles.listaTexto}>
            Danos indiretos, lucros cessantes, perda de receita de energia, danos morais ou qualquer
            outro dano não-material;
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>2.</Text>
          <Text style={styles.listaTexto}>
            Força maior ou caso fortuito, conforme definido na Cláusula 11ª;
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>3.</Text>
          <Text style={styles.listaTexto}>
            Negligência, imperícia ou imprudência do <Text style={styles.bold}>CONTRATANTE</Text> ou
            de terceiros (incluindo, mas não se limitando a, outras empresas de manutenção,
            instaladores, concessionárias ou prestadores de serviços);
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>4.</Text>
          <Text style={styles.listaTexto}>
            Desgaste natural, uso inadequado, adulteração, modificação não autorizada ou falta de
            manutenção do sistema pelo <Text style={styles.bold}>CONTRATANTE</Text>;
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>5.</Text>
          <Text style={styles.listaTexto}>
            Eventos climáticos extremos, condições ambientais fora dos parâmetros normais de
            operação, ou falhas de equipamentos de fabricação de terceiros;
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>6.</Text>
          <Text style={styles.listaTexto}>
            Qualquer dano decorrente do não cumprimento das obrigações do{' '}
            <Text style={styles.bold}>CONTRATANTE</Text> (incluindo, mas não se limitando a, falta
            de WiFi adequado, falta de acesso ao local, falta de informações técnicas);
          </Text>
        </View>
        <View style={styles.listaItem}>
          <Text style={styles.listaNumero}>7.</Text>
          <Text style={styles.listaTexto}>
            Danos causados por falta de seguro patrimonial ou de responsabilidade civil do{' '}
            <Text style={styles.bold}>CONTRATANTE</Text>.
          </Text>
        </View>
        <Text style={styles.paragrafo}>
          12.3 Os serviços prestados são de natureza preventiva e de monitoramento, não sendo a{' '}
          <Text style={styles.bold}>CONTRATADA</Text> responsável por falhas de equipamentos de
          terceiros (fabricantes de módulos, inversores, string boxes, etc.), cuja responsabilidade
          permanece exclusivamente com os respectivos fabricantes e suas garantias.
        </Text>

        {/* Cláusula 13ª */}
        <Text style={styles.clausulaTitulo}>CLÁUSULA 13ª – FORO</Text>
        <Text style={styles.paragrafo}>
          As partes elegem o foro da Comarca de <Text style={styles.bold}>Erechim/RS</Text> como o
          único competente para dirimir quaisquer controvérsias oriundas do presente contrato, com
          renúncia expressa a qualquer outro, por mais privilegiado que seja.
        </Text>

        <Text style={styles.paragrafo}>
          E, por estarem justas e contratadas, as partes assinam o presente instrumento em 2 (duas)
          vias de igual teor e forma, na presença das testemunhas abaixo.
        </Text>

        {/* Bloco de Assinaturas das Partes */}
        <View style={styles.assinaturasLinha}>
          <View style={styles.assinaturaBloco}>
            <View style={styles.linhaAssinatura} />
            <Text style={styles.rotuloAssinatura}>{dados.nomeRazaoSocial}</Text>
            <Text style={styles.subAssinatura}>CPF/CNPJ: {dados.cpfCnpj}</Text>
            <Text style={styles.subAssinatura}>CONTRATANTE</Text>
          </View>
          <View style={styles.assinaturaBloco}>
            <View style={styles.linhaAssinatura} />
            <Text style={styles.rotuloAssinatura}>DELFOS ENGENHARIA LTDA</Text>
            <Text style={styles.subAssinatura}>CNPJ: {DADOS_FIXOS_CONTRATADA_CONTRATO.cnpj}</Text>
            <Text style={styles.subAssinatura}>CONTRATADA</Text>
          </View>
        </View>

        {/* Data e Local */}
        <Text style={styles.dataLocal}>
          {dados.cidadeAssinatura}/RS, {dados.dataPorExtenso}.
        </Text>
      </Page>

      {/* ========================================================================= */}
      {/* PÁGINA DO ANEXO I (Plano Selecionado)                                     */}
      {/* ========================================================================= */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerInstitucional}>
          <View>
            <Text style={styles.headerLogo}>DELFOS ENGENHARIA</Text>
            <Text style={styles.headerSubLogo}>
              Operação, Manutenção & Eficiência Energética Solar
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text>Contrato O&M • Anexo I</Text>
            <Text>Erechim/RS</Text>
          </View>
        </View>

        <Text style={styles.anexoTitulo}>{anexoI.titulo}</Text>
        <Text style={styles.anexoSubtitulo}>{anexoI.subtitulo}</Text>

        {anexoI.itens.map((it) => (
          <View key={it.numero} style={styles.listaItem}>
            <Text style={styles.listaNumero}>{it.numero}.</Text>
            <Text style={styles.listaTexto}>
              <Text style={styles.bold}>{it.titulo}</Text> — {it.descricao}
            </Text>
          </View>
        ))}
      </Page>

      {/* ========================================================================= */}
      {/* PÁGINA DO ANEXO II (Tabela de Serviços Adicionais)                         */}
      {/* ========================================================================= */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerInstitucional}>
          <View>
            <Text style={styles.headerLogo}>DELFOS ENGENHARIA</Text>
            <Text style={styles.headerSubLogo}>
              Operação, Manutenção & Eficiência Energética Solar
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text>Contrato O&M • Anexo II</Text>
            <Text>Erechim/RS</Text>
          </View>
        </View>

        <Text style={styles.anexoTitulo}>ANEXO II – TABELA INTEGRADA DE SERVIÇOS ADICIONAIS</Text>
        <Text style={styles.paragrafo}>
          Os serviços abaixo serão cobrados adicionalmente ao valor do plano contratado, mediante
          solicitação expressa do <Text style={styles.bold}>CONTRATANTE</Text> e aprovação do
          respectivo orçamento. Os valores unitários serão reajustados anualmente pelo mesmo índice
          previsto na Cláusula 6ª do contrato principal (IGP-M ou IPCA).
        </Text>

        <View style={styles.tabela}>
          <View style={styles.tabelaLinhaHeader}>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colServico}>Serviço</Text>
            <Text style={styles.colDescricao}>Descrição Detalhada</Text>
            <Text style={styles.colValor}>Valor (R$)</Text>
            <Text style={styles.colHora}>Hora Adic.</Text>
            <Text style={styles.colObs}>Observações</Text>
          </View>

          {anexoIIItens.map((it) => (
            <View key={it.item} style={styles.tabelaLinha}>
              <Text style={styles.colItem}>{it.item}</Text>
              <Text style={styles.colServico}>{it.servico}</Text>
              <Text style={styles.colDescricao}>{it.descricao}</Text>
              <Text style={styles.colValor}>{it.valor}</Text>
              <Text style={styles.colHora}>{it.horaAdicional}</Text>
              <Text style={styles.colObs}>{it.observacoes || '-'}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.rodapeAnexoII}>
          * Hora adicional padrão fixada em R$ 150,00 quando indicada na tabela acima. Deslocamentos
          e peças não inclusos no escopo preventivo ordinário serão previamente orçados e submetidos
          à aprovação formal do CONTRATANTE.
        </Text>
      </Page>
    </Document>
  )
}

export default ContratoOMPDFDocument

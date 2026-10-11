import React from 'react'
import { Document, Page, Text, View, StyleSheet, type DocumentProps } from '@react-pdf/renderer'
import {
  type DadosProcuracaoOM,
  DADOS_FIXOS_CONTRATADA_PROCURACAO,
  normalizarDadosProcuracao,
} from '@/lib/procuracaoGenerator'

// 25mm em pontos: 25 * 72 / 25.4 = ~70.866pt
const MARGIN_25MM = 70.87

const styles = StyleSheet.create({
  page: {
    padding: MARGIN_25MM,
    fontFamily: 'Times-Roman',
    fontSize: 12,
    lineHeight: 1.6,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  titulo: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  paragrafo: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: 'justify',
    marginBottom: 16,
    color: '#000000',
  },
  bold: {
    fontFamily: 'Times-Bold',
  },
  dataLocal: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    marginTop: 35,
    marginBottom: 50,
    textAlign: 'left',
    color: '#000000',
  },
  assinaturaBloco: {
    marginLeft: 'auto',
    width: 240, // equivalente aos 320px em 96dpi (~240pt)
    alignItems: 'center',
    textAlign: 'center',
  },
  linhaAssinatura: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    borderTopStyle: 'solid',
    width: '100%',
    marginBottom: 6,
  },
  rotuloAssinatura: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    marginBottom: 2,
    textAlign: 'center',
  },
  nomeAssinante: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    marginBottom: 2,
    textAlign: 'center',
  },
  cpfAssinante: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    textAlign: 'center',
  },
})

export interface ProcuracaoPDFDocumentProps extends DocumentProps {
  dados: Partial<DadosProcuracaoOM>
}

export const ProcuracaoPDFDocument: React.FC<ProcuracaoPDFDocumentProps> = ({
  dados: dadosInput,
  ...docProps
}) => {
  const dados = normalizarDadosProcuracao(dadosInput)
  const enderecoDelfos = DADOS_FIXOS_CONTRATADA_PROCURACAO.enderecoProfissional

  return (
    <Document
      title={`PROCURAÇÃO PARTICULAR — ${dados.nome}`}
      author="DELFOS ENGENHARIA LTDA"
      subject="Procuração Particular Delfos Solar"
      {...docProps}
    >
      <Page size="A4" style={styles.page}>
        {/* TÍTULO CENTRALIZADO */}
        <Text style={styles.titulo}>PROCURAÇÃO PARTICULAR</Text>

        {/* PARÁGRAFO OUTORGANTE */}
        <Text style={styles.paragrafo}>
          <Text style={styles.bold}>OUTORGANTE: {dados.nome},</Text> CPF nº {dados.cpf}, domiciliado
          na {dados.endereco}, {dados.municipio}.
        </Text>

        {/* PARÁGRAFO OUTORGADOS */}
        <Text style={styles.paragrafo}>
          <Text style={styles.bold}>OUTORGADOS</Text>:{' '}
          <Text style={styles.bold}>Daniel Rotava</Text>, brasileiro, inscrito no CPF sob nº.{' '}
          <Text style={styles.bold}>047.838.700-80</Text>, RG sob nº 1131962548;{' '}
          <Text style={styles.bold}>João Victor Bagetti Fuchs</Text>, brasileiro, inscrito no CPF
          sob nº <Text style={styles.bold}>811.562.780-15</Text>, RG sob nº 5073762014.; Todos com
          domicílio profissional na {enderecoDelfos}
        </Text>

        {/* PARÁGRAFO PODERES */}
        <Text style={styles.paragrafo}>
          <Text style={styles.bold}>PODERES:</Text> Pelo presente instrumento, a{' '}
          <Text style={styles.bold}>Outorgante</Text> acima qualificada nomeia e constitui seu
          bastante procurador a pessoa retro citada, outorgando-lhe os poderes específicos para
          praticar os atos consistentes nas alterações de titularidade, cadastro e alteração de
          unidades beneficiárias, protocolos em geral, com plenos poderes para assinar termos e
          documentos, dentre outros procedimentos correlatos requisitados perante a Concessionária
          de Energia RGE.
        </Text>

        {/* DATA E LOCAL */}
        <Text style={styles.dataLocal}>Erechim/RS, {dados.dataPorExtenso}.</Text>

        {/* BLOCO DE ASSINATURA */}
        <View style={styles.assinaturaBloco}>
          <View style={styles.linhaAssinatura} />
          <Text style={styles.rotuloAssinatura}>Assinatura do(a) Outorgante</Text>
          <Text style={styles.nomeAssinante}>{dados.nome}</Text>
          <Text style={styles.cpfAssinante}>CPF: {dados.cpf}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default ProcuracaoPDFDocument

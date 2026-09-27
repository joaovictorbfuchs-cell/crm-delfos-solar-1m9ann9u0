/**
 * Teste Sintético da Análise de Faturas de Energia RGE via Gemini API.
 * Gera dados sintéticos de teste (sem dados de clientes reais) e valida
 * o contrato da rota /backend/v1/analisar-fatura-rge.
 */

// Fatura RGE Sintética em formato texto com layout clássico da distribuidora
export const FATURA_RGE_EXEMPLO_TEXTO = `
================================================================================
RGE - RIO GRANDE ENERGIA S.A.
CPFL ENERGIA - DISTRIBUIÇÃO
CNPJ: 02.016.444/0001-56 - INSCRIÇÃO ESTADUAL: 096/2689580
================================================================================
CONTA DE ENERGIA ELÉTRICA / NOTA FISCAL Nº 084.192.301 - SÉRIE 01
CHAVE DE ACESSO NF3e: 4325 0302 0164 4400 0156 6601 0841 9230 1192 8419 2301

DADOS DO CLIENTE E UNIDADE CONSUMIDORA:
TITULAR: SILVA & OLIVEIRA COMERCIO DE ALIMENTOS LTDA
CNPJ: 18.234.567/0001-89
ENDEREÇO DA UNIDADE CONSUMIDORA:
AVENIDA SETE DE SETEMBRO, 1250 - SALA 02
BAIRRO: CENTRO - ERECHIM - RS - CEP: 99700-000

CÓDIGO DA INSTALAÇÃO / UNIDADE CONSUMIDORA (UC): 200.419.001-19
CÓDIGO DO CLIENTE: 70041289

CLASSIFICAÇÃO E DADOS TÉCNICOS:
CLASSIFICAÇÃO: Convencional B3 Comercial Outros Serviços
TIPO DE FORNECIMENTO: Trifásico
TENSÃO NOMINAL: 220V / 380V
TARIFA COM TRIBUTOS: R$ 0,924500 / kWh
MÊS DE REFERÊNCIA: Março/2025
VENCIMENTO: 15/04/2025
TOTAL A PAGAR: R$ 850,54

--------------------------------------------------------------------------------
HISTÓRICO DE CONSUMO (ÚLTIMOS 12 MESES)
MÊS/ANO      CONSUMO (kWh)    DIAS DO CICLO    MÉDIA DIÁRIA (kWh)
Mar/25       920              30               30.6
Fev/25       980              29               33.7
Jan/25       1050             31               33.8
Dez/24       890              31               28.7
Nov/24       820              30               27.3
Out/24       790              31               25.4
Set/24       750              30               25.0
Ago/24       710              31               22.9
Jul/24       680              31               21.9
Jun/24       690              30               23.0
Mai/24       740              31               23.8
Abr/24       780              30               26.0
--------------------------------------------------------------------------------
Soma anual esperada: 9800 kWh
Média mensal esperada: 816.67 kWh
Maior consumo: Jan/25 (1050 kWh)
Menor consumo: Jul/24 (680 kWh)
================================================================================
`

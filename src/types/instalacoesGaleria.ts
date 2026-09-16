import onGridAssetUrl from '@/assets/editedimage1789566225196-8e828.png'
import monitoramentoAssetUrl from '@/assets/generatedimage1789566526403-a7f37.png'

export interface InstalacaoGaleria {
  id: string
  titulo: string
  cidade?: string
  potencia_kwp?: number
  foto?: string
  foto_url?: string
  ordem?: number
  destaque?: boolean
  created?: string
  updated?: string
}

export interface ImagemIlustrativaProposta {
  id: 'como_funciona' | 'monitoramento'
  titulo: string
  subtitulo: string
  descricao: string
  url: string
}

export const IMAGENS_ILUSTRATIVAS_PADRAO: ImagemIlustrativaProposta[] = [
  {
    id: 'como_funciona',
    titulo: 'Como Funciona o Sistema Solar On-Grid',
    subtitulo: 'Geração Fotovoltaica Conectada à Rede',
    descricao:
      'Os módulos fotovoltaicos convertem a luz solar em energia elétrica contínua. O inversor transforma em corrente alternada e alimenta o imóvel. O excedente é injetado na rede da concessionária com medidor bidirecional, gerando créditos energéticos.',
    url: onGridAssetUrl,
  },
  {
    id: 'monitoramento',
    titulo: 'Monitoramento do Sistema Solar',
    subtitulo: 'Gestão Inteligente em Tempo Real',
    descricao:
      'O sistema de monitoramento permite ao usuário acessar remotamente o desempenho do seu sistema via aplicativo no smartphone e computador, acompanhando a geração diária em tempo real.',
    url: monitoramentoAssetUrl,
  },
]

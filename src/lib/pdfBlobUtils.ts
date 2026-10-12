/**
 * Utilitário leve para conversão de Blob de PDF em Data URI Base64.
 * Extraído para não arrastar referências ou dependências de componentes React/PDF.
 */
export function blobParaDataUriBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const res = reader.result
      if (typeof res === 'string') {
        resolve(res)
      } else {
        reject(new Error('Falha ao converter Blob para string base64.'))
      }
    }
    reader.onerror = () => {
      reject(reader.error || new Error('Erro ao ler Blob do PDF.'))
    }
    reader.readAsDataURL(blob)
  })
}

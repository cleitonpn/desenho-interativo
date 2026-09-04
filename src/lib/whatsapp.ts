import { MARCA } from '../config/marca'

/**
 * O wa.me não aceita anexo — só texto. Por isso a imagem vai como link (ela é
 * publicada no Storage antes) e, no celular, o botão de compartilhar nativo
 * manda o arquivo de verdade junto.
 */
export function linkWhatsApp(
  itens: string[], cor: string, personagem: string, urlImagem?: string,
): string {
  const linhas = [
    `Oi Vital! Montei ${artigo(personagem)} ${personagem.toLowerCase()} no ${MARCA.nomeCompleto}`,
    '',
    itens.length ? `Acessórios: ${itens.join(', ')}.` : 'Deixei ela sem acessório nenhum.',
    `Versão: ${cor}.`,
  ]
  if (urlImagem) linhas.push('', `Imagem: ${urlImagem}`)
  return `https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(linhas.join('\n'))}`
}

/** "uma galinha", "um gato": o recado sai em português, não em template. */
function artigo(personagem: string): string {
  return /a$/i.test(personagem.trim()) ? 'uma' : 'um'
}

export function podeCompartilharArquivo(arquivo: File): boolean {
  return typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function'
    && navigator.canShare({ files: [arquivo] })
}

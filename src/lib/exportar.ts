import { CORES, MARCA, type CorId } from '../config/marca'
import { caminhoDaPeca } from './catalogo'
import { camadasEmOrdem } from './composicao'
import type { Catalogo, Escolhas } from './tipos'

const cacheImg = new Map<string, HTMLImageElement>()

export function carregarImagem(src: string): Promise<HTMLImageElement> {
  const pronta = cacheImg.get(src)
  if (pronta?.complete) return Promise.resolve(pronta)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { cacheImg.set(src, img); resolve(img) }
    img.onerror = () => reject(new Error(`Não consegui carregar ${src}`))
    img.src = src
  })
}

/** Deixa as peças prontas em memória para o editor não piscar ao trocar item. */
export function preAquecer(catalogo: Catalogo): void {
  for (const p of catalogo.pecas) void carregarImagem(caminhoDaPeca(p)).catch(() => {})
}

interface OpcoesExport {
  /** Largura final em pixels. O padrão dá qualidade de impressão. */
  largura?: number
  /** Sem a tarja do @ embaixo — usado na prova de pele, onde ela atrapalha. */
  semAssinatura?: boolean
  /** Fundo transparente em vez de branco. */
  transparente?: boolean
}

/**
 * Desenha a galinha num canvas próprio, recortado no que de fato foi usado.
 * Uma galinha só de chapéu não vira uma imagem cheia de vazio embaixo.
 */
export async function renderizar(
  catalogo: Catalogo,
  escolhas: Escolhas,
  cor: CorId,
  opcoes: OpcoesExport = {},
): Promise<HTMLCanvasElement> {
  const { largura = 1600, semAssinatura = false, transparente = false } = opcoes
  const camadas = camadasEmOrdem(catalogo, escolhas)

  // Área ocupada por tudo que está em cena, com uma folga proporcional.
  const x0 = Math.min(...camadas.map((p) => p.x))
  const y0 = Math.min(...camadas.map((p) => p.y))
  const x1 = Math.max(...camadas.map((p) => p.x + p.w))
  const y1 = Math.max(...camadas.map((p) => p.y + p.h))
  const folga = Math.round((x1 - x0) * 0.1)

  const cx = x0 - folga
  const cy = y0 - folga
  const cw = x1 - x0 + folga * 2
  const rodape = semAssinatura ? 0 : Math.round(cw * 0.09)
  const ch = y1 - y0 + folga * 2 + rodape

  const escala = largura / cw
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cw * escala)
  canvas.height = Math.round(ch * escala)
  const ctx = canvas.getContext('2d')!

  if (!transparente) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.filter = CORES[cor].filtro
  for (const peca of camadas) {
    const img = await carregarImagem(caminhoDaPeca(peca))
    ctx.drawImage(img, (peca.x - cx) * escala, (peca.y - cy) * escala, peca.w * escala, peca.h * escala)
  }
  ctx.filter = 'none'

  if (!semAssinatura) {
    const tamanho = Math.round(rodape * escala * 0.32)
    ctx.font = `600 ${tamanho}px Inter, system-ui, sans-serif`
    ctx.fillStyle = cor === 'preto' ? '#191919' : CORES.vermelho.amostra
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(MARCA.arroba, canvas.width / 2, canvas.height - (rodape * escala) / 2)
  }

  return canvas
}

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem.'))), 'image/png')
  })
}

export function baixarCanvas(canvas: HTMLCanvasElement, nome: string): void {
  const link = document.createElement('a')
  link.download = nome
  link.href = canvas.toDataURL('image/png')
  link.click()
}

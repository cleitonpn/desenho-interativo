import { useMemo } from 'react'
import { CORES, type CorId } from '../config/marca'
import { caminhoDaPeca } from '../lib/catalogo'
import { camadasEmOrdem } from '../lib/composicao'
import type { Escolhas, Personagem } from '../lib/tipos'

interface Props {
  personagem: Personagem
  escolhas: Escolhas
  cor: CorId
  className?: string
  /**
   * Recorta no que está em cena. Bom para miniaturas, onde cada galinha deve
   * preencher seu quadro; ruim no editor, onde faria a galinha pular de
   * tamanho a cada troca de peça.
   */
  ajustado?: boolean
}

/**
 * Desenha um personagem montado: empilha os PNGs em posição absoluta. Como todas as peças foram recortadas
 * guardando o offset original, o encaixe sai do próprio dado — não há nenhum
 * ajuste manual por acessório.
 */
export function Desenho({ personagem, escolhas, cor, className = '', ajustado = false }: Props) {
  const camadas = useMemo(() => camadasEmOrdem(personagem, escolhas), [personagem, escolhas])

  const vista = useMemo(() => {
    if (!ajustado) return personagem.enquadramento
    const x0 = Math.min(...camadas.map((p) => p.x))
    const y0 = Math.min(...camadas.map((p) => p.y))
    const x1 = Math.max(...camadas.map((p) => p.x + p.w))
    const y1 = Math.max(...camadas.map((p) => p.y + p.h))
    const folga = (x1 - x0) * 0.08
    return { x: x0 - folga, y: y0 - folga, w: x1 - x0 + folga * 2, h: y1 - y0 + folga * 2 }
  }, [camadas, personagem.enquadramento, ajustado])

  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: `${vista.w} / ${vista.h}`, filter: CORES[cor].filtro }}
    >
      {camadas.map((peca) => (
        <img
          key={peca.id}
          src={caminhoDaPeca(peca)}
          alt={peca.rotulo ?? ''}
          draggable={false}
          className="absolute select-none"
          style={{
            left: `${((peca.x - vista.x) / vista.w) * 100}%`,
            top: `${((peca.y - vista.y) / vista.h) * 100}%`,
            width: `${(peca.w / vista.w) * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

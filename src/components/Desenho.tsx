import { useMemo } from 'react'
import { CORES, type CorId } from '../config/marca'
import { caminhoDaPeca } from '../lib/catalogo'
import { camadasEmOrdem } from '../lib/composicao'
import type { Escolhas, Peca, Personagem } from '../lib/tipos'

interface Vista { x: number; y: number; w: number; h: number }

/**
 * Quanto o tronco desce abaixo do quadril, só para não sobrar um fio de nada
 * na junção por arredondamento de subpixel.
 *
 * Tem de ser MÍNIMO. Essa sobra é um toco de perna desenhado parado no tronco;
 * quando a perna de verdade sobe, o toco fica para trás e sua borda cortada
 * aparece como um risco sobre a pata. Com 0,6% ele fica abaixo de um pixel na
 * tela e some.
 */
const EMENDA = 0.006

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
  /**
   * Anima as patas. Ausente — que é como o editor e as miniaturas usam — o
   * desenho sai exatamente como antes, parado e numa camada só.
   *
   * São só dois booleanos, e não uma fase por quadro: o ciclo do passo é
   * periódico e vai em CSS. Assim o React só refaz o desenho quando a galinha
   * de fato começa ou para de andar, e não 60 vezes por segundo.
   *
   * Só funciona em personagem que tenha a medida das pernas no catálogo; sem
   * ela, o desenho fica parado em vez de quebrar.
   */
  patas?: { andando: boolean; noAr: boolean }
}

/**
 * Desenha um personagem montado: empilha os PNGs em posição absoluta. Como todas as peças foram recortadas
 * guardando o offset original, o encaixe sai do próprio dado — não há nenhum
 * ajuste manual por acessório.
 */
export function Desenho({ personagem, escolhas, cor, className = '', ajustado = false, patas }: Props) {
  const camadas = useMemo(() => camadasEmOrdem(personagem, escolhas), [personagem, escolhas])

  const vista = useMemo<Vista>(() => {
    if (!ajustado) return personagem.enquadramento
    const x0 = Math.min(...camadas.map((p) => p.x))
    const y0 = Math.min(...camadas.map((p) => p.y))
    const x1 = Math.max(...camadas.map((p) => p.x + p.w))
    const y1 = Math.max(...camadas.map((p) => p.y + p.h))
    const folga = (x1 - x0) * 0.08
    return { x: x0 - folga, y: y0 - folga, w: x1 - x0 + folga * 2, h: y1 - y0 + folga * 2 }
  }, [camadas, personagem.enquadramento, ajustado])

  const pernas = patas && !ajustado ? personagem.pernas : undefined

  /** Só as peças que chegam abaixo do quadril entram nas camadas de perna:
   *  um chapéu não precisa ser desenhado três vezes. */
  const daPerna = useMemo(() => {
    if (!pernas) return []
    const quadrilY = vista.y + pernas.quadril * vista.h
    return camadas.filter((p) => p.y + p.h > quadrilY)
  }, [camadas, pernas, vista])

  return (
    <div
      data-desenho={personagem.id}
      className={`relative ${className}`}
      style={{ aspectRatio: `${vista.w} / ${vista.h}`, filter: CORES[cor].filtro }}
    >
      {pernas && patas ? (
        <>
          {/* As pernas vão primeiro, e o tronco por cima: assim a emenda do
              quadril some atrás do corpo em vez de aparecer como um risco. */}
          <Perna lado="esquerda" pernas={pernas} camadas={daPerna} vista={vista} patas={patas} />
          <Perna lado="direita" pernas={pernas} camadas={daPerna} vista={vista} patas={patas} />
          <div className="absolute inset-0"
               style={{ clipPath: `inset(0 0 ${(1 - pernas.quadril - EMENDA) * 100}% 0)` }}>
            {camadas.map((p) => <Camada key={p.id} peca={p} vista={vista} />)}
          </div>
        </>
      ) : (
        camadas.map((p) => <Camada key={p.id} peca={p} vista={vista} />)
      )}
    </div>
  )
}

/**
 * Uma perna: o desenho inteiro recortado na metade de baixo que lhe cabe, e
 * então erguido e girado. Recortar em vez de exportar a perna à parte é o que
 * faz meia e sapato acompanharem o passo sem nenhum arquivo novo — eles são as
 * mesmas peças, cortadas no mesmo lugar.
 */
function Perna({ lado, pernas, camadas, vista, patas }: {
  lado: 'esquerda' | 'direita'
  pernas: NonNullable<Personagem['pernas']>
  camadas: Peca[]
  vista: Vista
  patas: { andando: boolean; noAr: boolean }
}) {
  const esq = lado === 'esquerda'
  // Num desenho de frente, girar a perna só a arrasta de lado — parece
  // escorregar, não andar. O que lê como passo é uma perna SUBIR enquanto a
  // outra fica no chão; o giro entra só como tempero de desenho animado.
  const estilo: React.CSSProperties = {
    clipPath: `inset(${pernas.quadril * 100}% ${esq ? (1 - pernas.meio) * 100 : 0}% 0% ${
      esq ? 0 : pernas.meio * 100}%)`,
    transformOrigin: `${(esq ? pernas.esquerda : pernas.direita) * 100}% ${pernas.quadril * 100}%`,
    ['--fora' as string]: esq ? '-1' : '1',
  }
  if (patas.noAr) {
    // No ar as duas abrem e sobem um pouco: dá o salto sem precisar de ciclo.
    estilo.transform = `translateY(-1.9%) rotate(${11 * (esq ? -1 : 1)}deg)`
  } else if (patas.andando) {
    estilo.animation = 'pata .4s linear infinite'
    estilo.animationDelay = esq ? '0s' : '-.2s'
  }

  return (
    <div className="absolute inset-0" style={estilo}>
      {camadas.map((p) => <Camada key={p.id} peca={p} vista={vista} />)}
    </div>
  )
}

function Camada({ peca, vista }: { peca: Peca; vista: Vista }) {
  return (
    <img
      src={caminhoDaPeca(peca)}
      alt={peca.rotulo ?? ''}
      draggable={false}
      className="absolute select-none"
      style={{
        // Altura em % também, e não automática. Com a altura vindo da
        // proporção do arquivo, bastava o container fugir um pouco da
        // proporção do enquadramento para o topo de cada peça descer mais
        // que a peça crescia — e os acessórios escorregavam uns dos outros.
        // Fixando os quatro lados, cada peça ocupa o retângulo dela: se a
        // caixa distorcer, o desenho distorce inteiro, sem desmontar.
        left: `${((peca.x - vista.x) / vista.w) * 100}%`,
        top: `${((peca.y - vista.y) / vista.h) * 100}%`,
        width: `${(peca.w / vista.w) * 100}%`,
        height: `${(peca.h / vista.h) * 100}%`,
      }}
    />
  )
}

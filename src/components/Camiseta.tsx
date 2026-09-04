import { corSobreTecido } from '../config/marca'
import { AREAS, CAMISETA_MM, CORES_CAMISETA, type AreaId, type Arte, type CorCamiseta } from '../lib/loja'
import { Desenho } from './Desenho'
import type { Personagem } from '../lib/tipos'

interface Props {
  personagem: Personagem | null
  cor: CorCamiseta
  area: AreaId
  arte: Arte | null
  /** Marca a área de estampa mesmo sem arte, para a pessoa ver onde vai. */
  mostrarGuia?: boolean
  className?: string
}

/**
 * Mockup provisório, desenhado em SVG no traço do app até chegarem as fotos do
 * produto. O que importa aqui não é o realismo e sim a escala: o SVG está em
 * milímetros de camiseta de verdade, então os 29,7 × 42 cm das costas e os
 * 10 cm do peito aparecem do tamanho que vão sair impressos — e não "mais ou
 * menos ali".
 */
export function Camiseta({ personagem, cor, area, arte, mostrarGuia = false, className = '' }: Props) {
  const tecido = CORES_CAMISETA[cor]
  const alvo = AREAS[area]
  const { largura: L, altura: A } = CAMISETA_MM
  // Costas e frente diferem só pela gola; o corpo é o mesmo molde.
  const verso = alvo.face === 'costas'

  return (
    <div className={`relative ${className}`} style={{ aspectRatio: `${L} / ${A}` }}>
      <svg viewBox={`0 0 ${L} ${A}`} className="absolute inset-0 w-full h-full">
        {/* Corpo com as mangas: um caminho só, do ombro à barra. */}
        <path
          d={`M 270 30 L 175 55 L 20 190 L 105 240 L 130 182
              L 130 735 L 570 735 L 570 182 L 595 240 L 680 190
              L 525 55 L 430 30 Z`}
          fill={tecido.tecido} stroke="#111" strokeWidth="6" strokeLinejoin="round"
        />
        {/* Gola: rasa na frente, quase reta nas costas. */}
        <path d={verso ? 'M 270 30 Q 350 68 430 30' : 'M 270 30 Q 350 112 430 30'}
              fill="none" stroke="#111" strokeWidth="6" />
        <path d={verso ? 'M 270 30 Q 350 54 430 30' : 'M 270 30 Q 350 96 430 30'}
              fill="none" stroke={tecido.costura} strokeWidth="3" />
        {/* Barra e punhos, em linha fina para não competir com a arte. */}
        <line x1="130" y1="712" x2="570" y2="712" stroke={tecido.costura} strokeWidth="3" />
        <path d="M 105 240 L 130 182" stroke={tecido.costura} strokeWidth="3" fill="none" />
        <path d="M 595 240 L 570 182" stroke={tecido.costura} strokeWidth="3" fill="none" />

        {mostrarGuia && !arte && (
          <g>
            <rect x={alvo.x} y={alvo.y} width={alvo.largura} height={alvo.altura}
                  fill="none" stroke="#FF1A0E" strokeWidth="3" strokeDasharray="12 10" opacity="0.7" />
            <text x={alvo.x + alvo.largura / 2} y={alvo.y + alvo.altura / 2} textAnchor="middle"
                  fill="#FF1A0E" fontSize="20" fontWeight="600" opacity="0.85">
              {alvo.descricao}
            </text>
          </g>
        )}
      </svg>

      {/* A arte entra fora do SVG para reaproveitar o mesmo componente de
          galinha do editor — o desenho na camiseta é o mesmo do app. */}
      {arte && (
        <div className="absolute flex items-center justify-center pointer-events-none"
             style={{
               left: `${(alvo.x / L) * 100}%`, top: `${(alvo.y / A) * 100}%`,
               width: `${(alvo.largura / L) * 100}%`, height: `${(alvo.altura / A) * 100}%`,
             }}>
          {arte.tipo === 'galinha' && personagem ? (
            <Desenho personagem={personagem} escolhas={arte.escolhas}
                     cor={corSobreTecido(arte.cor, cor === 'preta')}
                     ajustado className="h-full" />
          ) : arte.tipo === 'pronta' ? (
            <img src={arte.arquivo} alt={arte.nome} className="max-h-full max-w-full object-contain" />
          ) : null}
        </div>
      )}
    </div>
  )
}

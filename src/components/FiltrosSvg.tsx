import { CURVA_PRETO } from '../config/marca'

/**
 * Define o filtro que a versão em preto usa. Fica montado uma vez na raiz do
 * app; as camadas o referenciam por `filter: url(#quintal-preto)`.
 *
 * saturate(0) tira a cor, e a tabela de transferência aplica a curva — é o
 * passo que mantém o branco das máscaras intacto, ao contrário de um
 * brightness/contrast, que escureceria tudo por igual.
 *
 * `color-interpolation-filters="sRGB"` não é opcional: sem ela o navegador
 * calcula em linearRGB e a curva sai em outro lugar.
 */
export function FiltrosSvg() {
  const tabela = CURVA_PRETO.join(' ')
  return (
    <svg aria-hidden className="absolute w-0 h-0 pointer-events-none" focusable="false">
      <defs>
        <filter id="quintal-preto" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={tabela} />
            <feFuncG type="table" tableValues={tabela} />
            <feFuncB type="table" tableValues={tabela} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  )
}

"""
Acha as patas dentro do PNG base, para o jogo poder girar cada uma.

O desenho do Vital e contorno: o interior e transparente, entao nao da para
achar as pernas por area preenchida. O que as denuncia e a LARGURA de cada
linha: o corpo e largo e vai afinando, e a partir do quadril a largura para de
mudar — sao duas tiras estreitas ate o chao. O quadril e onde essa faixa
constante termina e a largura volta a crescer depressa.
"""
import json, sys
from PIL import Image

def extensao(px, w, y):
    cols = [x for x in range(w) if px[x, y][3] > 20]
    return (cols[0], cols[-1], cols) if cols else None

def medir(caminho):
    im = Image.open(caminho).convert('RGBA')
    w, h = im.size
    px = im.load()

    # Largura tipica das pernas: medida no trecho entre 82% e 92%, que fica
    # abaixo do quadril e acima dos pes, onde eles ja se abrem.
    larguras = []
    for y in range(int(h * .82), int(h * .92)):
        e = extensao(px, w, y)
        if e: larguras.append(e[1] - e[0])
    if not larguras: return None
    larguras.sort()
    largura_perna = larguras[len(larguras) // 2]

    # Sobe do meio das pernas ate a largura estourar: ali esta o quadril.
    #
    # O limiar tem de ser APERTADO. Com folga, a ultima curva da barriga passa
    # por perna, entra na camada que se move e o traco aparece duplicado quando
    # a pata sobe. A margem extra para baixo garante que so perna entre ali.
    quadril_y = None
    for y in range(int(h * .87), int(h * .45), -1):
        e = extensao(px, w, y)
        if e and (e[1] - e[0]) > largura_perna * 1.12:
            quadril_y = y + 1 + int(h * .012)
            break
    if quadril_y is None: return None

    # O vao entre as duas pernas, medido logo abaixo do quadril.
    amostra = int(quadril_y + (h - quadril_y) * .35)
    e = extensao(px, w, amostra)
    if not e: return None
    _, _, cols = e
    maior, ini = 0, None
    ant = cols[0]
    for x in cols[1:]:
        if x - ant > maior: maior, ini = x - ant, ant
        ant = x
    if ini is None or maior < 8: return None
    meio_x = ini + maior / 2

    esq = [x for x in cols if x < meio_x]
    dir = [x for x in cols if x > meio_x]
    if not esq or not dir: return None
    return {
        'arquivo': (w, h),
        'quadril_y': quadril_y,
        'meio_x': meio_x,
        'centro_esq': (esq[0] + esq[-1]) / 2,
        'centro_dir': (dir[0] + dir[-1]) / 2,
    }

cat = json.load(open('public/pecas/catalogo.json'))
mudou = False
for p in cat['personagens']:
    base = next((x for x in p['pecas'] if x['slot'] == 'base'), None)
    if not base: continue
    m = medir('public/' + base['arquivo'])
    if not m:
        print(f"{p['id']}: nao achei as patas"); continue
    enq = p['enquadramento']
    # Tudo vira fracao do ENQUADRAMENTO, que e o que o componente desenha.
    pernas = {
        'quadril': round((base['y'] + m['quadril_y'] - enq['y']) / enq['h'], 4),
        'meio':    round((base['x'] + m['meio_x']    - enq['x']) / enq['w'], 4),
        'esquerda':round((base['x'] + m['centro_esq']- enq['x']) / enq['w'], 4),
        'direita': round((base['x'] + m['centro_dir']- enq['x']) / enq['w'], 4),
    }
    print(f"{p['id']}: quadril {m['quadril_y']}/{m['arquivo'][1]} "
          f"({m['quadril_y']/m['arquivo'][1]:.0%} do corpo) -> {pernas}")
    if p.get('pernas') != pernas:
        p['pernas'] = pernas; mudou = True

if mudou and '--gravar' in sys.argv:
    json.dump(cat, open('public/pecas/catalogo.json', 'w'), ensure_ascii=False, indent=2)
    print('catalogo.json atualizado')

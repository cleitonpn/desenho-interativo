import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import type { Peca, Personagem, SlotId } from './tipos'

/**
 * Peças que o Vital sobe pelo painel. Elas vivem no Firestore e no Storage, e
 * o catálogo as junta com as que vieram do PSD original — assim ele publica
 * acessório novo sem ninguém mexer em código nem fazer deploy.
 */
const COLECAO = 'pecas'

export interface PecaRemota extends Peca {
  /** URL pública no Storage, já que o arquivo não está em /public. */
  url: string
  caminhoStorage: string
}

/**
 * O id de uma peca tem barra ("cabeca/chapeu-cowboy"), e barra no Firestore
 * cria subcolecao. Guardamos com "__" e desfazemos na leitura.
 */
function paraDocId(id: string): string { return id.replace(/\//g, '__') }
function deDocId(docId: string): string { return docId.replace(/__/g, '/') }

export async function listarPecasRemotas(): Promise<PecaRemota[]> {
  try {
    const snap = await getDocs(collection(db, COLECAO))
    return snap.docs.map((d) => ({ ...(d.data() as PecaRemota), id: deDocId(d.id) }))
  } catch {
    // Sem permissão ou sem rede: o app segue com o catálogo do PSD.
    return []
  }
}

/**
 * Corrige o slot, o nome ou a visibilidade de qualquer peca — inclusive das
 * que vieram do PSD, que nao tem documento proprio. Nesse caso o ajuste grava
 * um registro com o mesmo id, e o catalogo o usa no lugar do estatico. O PNG
 * continua onde esta; muda so a ficha dele.
 */
export async function ajustarPeca(
  peca: Peca, mudancas: { slot?: SlotId; rotulo?: string; oculta?: boolean },
): Promise<void> {
  const atualizada = { ...peca, ...mudancas }
  await setDoc(doc(db, COLECAO, paraDocId(peca.id)), atualizada, { merge: true })
}

/**
 * Personagens que o Vital cria pelo painel. O Vital ja esta desenhando outros
 * bichos alem da galinha, e cada um chega com o proprio canvas — por isso o
 * personagem guarda as medidas dele em vez de herdar as de ninguem.
 */
export interface PersonagemRemoto extends Omit<Personagem, 'pecas'> {
  caminhoStorage: string
}

export async function listarPersonagensRemotos(): Promise<PersonagemRemoto[]> {
  try {
    const snap = await getDocs(collection(db, 'personagens'))
    return snap.docs.map((d) => ({ ...(d.data() as PersonagemRemoto), id: d.id }))
  } catch {
    return []
  }
}

const ORDEM_PADRAO: Personagem['ordemCamadas'] = [
  'base', 'meias', 'sapatos', 'roupa_baixo', 'roupa_cima',
  'pescoco', 'bolsa', 'cabeca', 'olhos', 'extras',
]

/** Cria um personagem a partir do PNG do corpo. As pecas dele entram depois. */
export async function criarPersonagem(
  id: string, nome: string, ordem: number, arquivo: File,
  medidas: Awaited<ReturnType<typeof prepararPeca>>,
): Promise<PersonagemRemoto> {
  const caminhoStorage = `pecas/${id}_base.png`
  const destino = ref(storage, caminhoStorage)
  await uploadBytes(destino, medidas.blob, { contentType: 'image/png' })
  const url = await getDownloadURL(destino)

  const personagem: PersonagemRemoto = {
    id, nome, ordem, caminhoStorage, base: url, oculto: false,
    canvas: { w: medidas.canvasW, h: medidas.canvasH },
    // Provisório: o enquadramento é recalculado a cada carregamento a partir
    // das peças que existirem, então ele acompanha o acervo crescendo.
    enquadramento: { x: medidas.x, y: medidas.y, w: medidas.w, h: medidas.h },
    ordemCamadas: ORDEM_PADRAO,
  }
  await setDoc(doc(db, 'personagens', id), personagem)

  // A base também é uma peça: é ela que o compositor empilha por baixo.
  await setDoc(doc(db, COLECAO, paraDocId(`${id}/corpo`)), {
    id: `${id}/corpo`, personagem: id, slot: 'base', rotulo: nome,
    arquivo: url, url, caminhoStorage,
    x: medidas.x, y: medidas.y, w: medidas.w, h: medidas.h,
    origem: arquivo.name, oculta: false,
  })
  return personagem
}

/**
 * Recorta o PNG ao conteúdo visível e devolve o blob junto do offset.
 *
 * É esse cálculo que dispensa qualquer posicionamento manual: como todas as
 * camadas saem do Procreate no mesmo canvas, o canto do desenho dentro do
 * arquivo já é a posição dele no corpo da galinha.
 */
export async function prepararPeca(arquivo: File): Promise<{
  blob: Blob; x: number; y: number; w: number; h: number; canvasW: number; canvasH: number
}> {
  const bitmap = await createImageBitmap(arquivo)
  const cheio = document.createElement('canvas')
  cheio.width = bitmap.width
  cheio.height = bitmap.height
  const ctx = cheio.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)

  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  let x0 = bitmap.width, y0 = bitmap.height, x1 = -1, y1 = -1
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      if (data[(y * bitmap.width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) throw new Error('Esse arquivo está todo transparente — não tem desenho nenhum.')

  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  const corte = document.createElement('canvas')
  corte.width = w
  corte.height = h
  corte.getContext('2d')!.drawImage(cheio, x0, y0, w, h, 0, 0, w, h)

  const blob = await new Promise<Blob>((resolve, reject) => {
    corte.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao recortar.'))), 'image/png')
  })
  return { blob, x: x0, y: y0, w, h, canvasW: bitmap.width, canvasH: bitmap.height }
}

export async function publicarPeca(
  personagem: string, slot: SlotId, rotulo: string, arquivo: File,
  medidas: Awaited<ReturnType<typeof prepararPeca>>,
): Promise<PecaRemota> {
  const chave = `${personagem}/${slot}/${gerarSlug(rotulo)}-${Date.now().toString(36)}`
  const caminhoStorage = `pecas/${chave.replace(/\//g, '_')}.png`
  const destino = ref(storage, caminhoStorage)
  await uploadBytes(destino, medidas.blob, { contentType: 'image/png' })
  const url = await getDownloadURL(destino)

  const peca: PecaRemota = {
    id: chave, personagem, slot, rotulo, arquivo: url, url, caminhoStorage,
    x: medidas.x, y: medidas.y, w: medidas.w, h: medidas.h,
    origem: arquivo.name, oculta: false,
  }
  await setDoc(doc(db, COLECAO, paraDocId(chave)), peca)
  return peca
}

export async function removerPecaRemota(peca: PecaRemota): Promise<void> {
  await deleteDoc(doc(db, COLECAO, paraDocId(peca.id)))
  try {
    await deleteObject(ref(storage, peca.caminhoStorage))
  } catch {
    // O documento já saiu; um arquivo órfão no Storage não quebra o app.
  }
}

function gerarSlug(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'peca'
}

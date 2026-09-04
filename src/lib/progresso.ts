import { arrayUnion, doc, getDoc, increment, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Escolhas, Personagem, SlotId } from './tipos'
import { pecasDoSlot, slotsDisponiveis } from './catalogo'

/**
 * O progresso de cada pessoa. Diferente da telemetria — que soma todo mundo
 * para o Vital decidir o que desenhar —, isto e pessoal e existe para dar a
 * quem usa um motivo de voltar.
 *
 * A ideia central e a descoberta: sao 99 acessorios, e ninguem ve todos numa
 * sentada. Mostrar quantos faltam transforma o acervo do Vital em algo para
 * explorar, em vez de uma lista que se esgota.
 */
export interface Progresso {
  uid: string
  /** Ids de peça que a pessoa já vestiu ao menos uma vez. */
  descobertas: string[]
  /** Bichos que a pessoa já montou. Com vários no catálogo, conhecer a turma
   *  toda passa a ser uma jornada em si. */
  personagensUsados: string[]
  salvas: number
  enviadas: number
  provasPele: number
  conquistas: string[]
}

export const VAZIO: Progresso = {
  uid: '', descobertas: [], personagensUsados: [],
  salvas: 0, enviadas: 0, provasPele: 0, conquistas: [],
}

export interface Conquista {
  id: string
  titulo: string
  descricao: string
  emoji: string
  /** Quanto falta, de 0 a 1, para o card mostrar progresso em vez de só travado. */
  progresso: (p: Progresso, total: Totais) => number
}

export interface Totais {
  pecas: number
  personagens: number
}

/**
 * Nenhuma conquista fala em galinha: o Vital ja desenha outros bichos, e um
 * titulo preso a um deles envelhece no dia em que o proximo entra. "Conheceu a
 * turma" so existe por causa disso — ela premia justamente experimentar os
 * bichos novos, que e o que o acervo crescendo pede.
 */
export const CONQUISTAS: Conquista[] = [
  { id: 'primeira', titulo: 'Primeira criação', descricao: 'Salvou o primeiro desenho', emoji: '✏️',
    progresso: (p) => Math.min(p.salvas, 1) },
  { id: 'mandou', titulo: 'Mandou pro Vital', descricao: 'Enviou um desenho para o estúdio', emoji: '📨',
    progresso: (p) => Math.min(p.enviadas, 1) },
  { id: 'na-pele', titulo: 'Viu na pele', descricao: 'Provou o desenho numa foto sua', emoji: '💪',
    progresso: (p) => Math.min(p.provasPele, 1) },
  { id: 'dez', titulo: 'Pegou o jeito', descricao: 'Salvou 10 criações', emoji: '🎨',
    progresso: (p) => Math.min(p.salvas / 10, 1) },
  { id: 'turma', titulo: 'Conheceu a turma', descricao: 'Montou todos os bichos do acervo', emoji: '🐾',
    progresso: (p, t) => (t.personagens > 1 ? Math.min(p.personagensUsados.length / t.personagens, 1) : 0) },
  { id: 'metade', titulo: 'Meio caminho', descricao: 'Experimentou metade dos acessórios', emoji: '🧭',
    progresso: (p, t) => Math.min(p.descobertas.length / (t.pecas / 2), 1) },
  { id: 'tudo', titulo: 'Viu tudo', descricao: 'Experimentou todos os acessórios', emoji: '👑',
    progresso: (p, t) => Math.min(p.descobertas.length / t.pecas, 1) },
]

/** Com um bicho só, "conheceu a turma" não teria graça: fica fora até haver dois. */
export function conquistasVisiveis(totais: Totais): Conquista[] {
  return CONQUISTAS.filter((c) => c.id !== 'turma' || totais.personagens > 1)
}

export async function carregarProgresso(uid: string): Promise<Progresso> {
  try {
    const snap = await getDoc(doc(db, 'progresso', uid))
    return snap.exists() ? { ...VAZIO, ...(snap.data() as Progresso), uid } : { ...VAZIO, uid }
  } catch {
    return { ...VAZIO, uid }
  }
}

/**
 * arrayUnion faz o Firestore ignorar o que ja esta la, entao vestir a mesma
 * peca dez vezes nao infla nada e duas abas abertas nao se atropelam.
 */
export async function registrarDescoberta(
  uid: string, pecaIds: string[], personagem?: string,
): Promise<void> {
  if (!pecaIds.length) return
  try {
    await setDoc(doc(db, 'progresso', uid), {
      uid,
      descobertas: arrayUnion(...pecaIds),
      ...(personagem ? { personagensUsados: arrayUnion(personagem) } : {}),
    }, { merge: true })
  } catch { /* progresso não pode atrapalhar quem está montando */ }
}

export async function registrarMarco(
  uid: string, campo: 'salvas' | 'enviadas' | 'provasPele',
): Promise<void> {
  try {
    await setDoc(doc(db, 'progresso', uid), { uid, [campo]: increment(1) }, { merge: true })
  } catch { /* idem */ }
}

/** Quantos acessórios existem ao todo, somando os personagens visíveis. */
export function totalDePecas(personagens: Personagem[]): number {
  return personagens.reduce(
    (t, p) => t + p.pecas.filter((x) => x.slot !== 'base' && !x.oculta).length, 0)
}

/**
 * O desenho do dia. A semente vem da data, entao todo mundo ve a mesma e ela
 * muda sozinha a meia-noite — um motivo de voltar que nao depende de notificar
 * ninguem.
 */
export function desenhoDoDia(personagem: Personagem, data = new Date()): Escolhas {
  const semente = Number(
    `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, '0')}${String(data.getDate()).padStart(2, '0')}`,
  )
  let estado = semente % 2147483647
  const rnd = () => { estado = (estado * 16807) % 2147483647; return estado / 2147483647 }

  const disponiveis = slotsDisponiveis(personagem).map((s) => s.id)
  const quantos = 4 + Math.floor(rnd() * 3)
  const escolhidos = [...disponiveis].sort(() => rnd() - 0.5).slice(0, quantos)

  const escolhas: Escolhas = {}
  for (const slot of escolhidos) {
    const opcoes = pecasDoSlot(personagem, slot as SlotId)
    escolhas[slot as SlotId] = opcoes[Math.floor(rnd() * opcoes.length)].id
  }
  return escolhas
}

import { doc, increment, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { SlotId } from './tipos'

/**
 * Telemetria caseira, para o Vital entender o que agrada antes de desenhar a
 * proxima leva de acessorios.
 *
 * Duas decisoes que valem registro:
 *
 * 1. Nada e enviado a cada clique. Os eventos se acumulam em memoria e sobem
 *    em lote — uma pessoa mexendo no editor gera dezenas de acoes por minuto, e
 *    uma escrita por acao seria lenta e cara sem melhorar nenhum numero.
 *
 * 2. Nao existe deteccao de print de tela em navegador nenhum. O que da para
 *    medir e a intencao equivalente: baixar, compartilhar e mandar no
 *    WhatsApp. O painel diz isso por extenso em vez de fingir que conta prints.
 */

type Acao =
  | 'sorteio' | 'escolha_manual' | 'remocao' | 'limpeza'
  | 'salvamento' | 'download' | 'compartilhamento' | 'whatsapp'
  | 'prova_pele' | 'troca_cor'

interface Contadores {
  /** Vezes que a peca foi vestida, por qualquer caminho. */
  escolhas: number
  /** Vezes que estava na galinha no momento de salvar. */
  salvamentos: number
  /** Vezes que saiu daqui para o mundo: download, share ou WhatsApp. */
  levadas: number
  /** Vezes que foi vestida e tirada sem sobreviver ate o fim. */
  descartes: number
}

const ZERO: Contadores = { escolhas: 0, salvamentos: 0, levadas: 0, descartes: 0 }

const INTERVALO_ENVIO = 20_000

let sessaoId = ''
let uid = ''
let inicioVisivel = 0
let segundosAtivos = 0
const acoes = new Map<Acao, number>()
const pecas = new Map<string, Contadores & { slot: SlotId }>()
let agendado: ReturnType<typeof setTimeout> | null = null

function contadoresDa(pecaId: string, slot: SlotId) {
  let c = pecas.get(pecaId)
  if (!c) { c = { ...ZERO, slot }; pecas.set(pecaId, c) }
  return c
}

/** Só conta o tempo em que a aba está de fato à vista. */
function pausarRelogio() {
  if (inicioVisivel) {
    segundosAtivos += (Date.now() - inicioVisivel) / 1000
    inicioVisivel = 0
  }
}

function retomarRelogio() {
  if (!inicioVisivel) inicioVisivel = Date.now()
}

export function iniciarSessao(usuarioId: string): void {
  if (sessaoId) return
  sessaoId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  uid = usuarioId
  retomarRelogio()

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pausarRelogio(); void enviar() } else retomarRelogio()
  })
  // pagehide é o único que dispara de forma confiável no Safari do iPhone.
  window.addEventListener('pagehide', () => { pausarRelogio(); void enviar() })
}

export function registrarAcao(acao: Acao): void {
  acoes.set(acao, (acoes.get(acao) ?? 0) + 1)
  agendarEnvio()
}

export function registrarPeca(pecaId: string, slot: SlotId, campo: keyof Contadores): void {
  contadoresDa(pecaId, slot)[campo] += 1
  agendarEnvio()
}

/** Registra de uma vez as peças presentes num salvamento ou envio. */
export function registrarConjunto(
  escolhas: Partial<Record<SlotId, string>>, campo: keyof Contadores,
): void {
  for (const [slot, id] of Object.entries(escolhas)) {
    if (id) contadoresDa(id, slot as SlotId)[campo] += 1
  }
  agendarEnvio()
}

function agendarEnvio() {
  if (agendado) return
  agendado = setTimeout(() => { agendado = null; void enviar() }, INTERVALO_ENVIO)
}

/**
 * Sobe o acumulado e zera o que foi enviado. Usa increment para que abas
 * simultaneas e pessoas diferentes somem em vez de sobrescrever.
 */
async function enviar(): Promise<void> {
  if (!sessaoId) return
  const tempo = segundosAtivos + (inicioVisivel ? (Date.now() - inicioVisivel) / 1000 : 0)
  const acoesEnviadas = new Map(acoes)
  const pecasEnviadas = new Map(pecas)
  acoes.clear()
  pecas.clear()
  segundosAtivos = 0
  if (inicioVisivel) inicioVisivel = Date.now()

  const nadaAFazer = !acoesEnviadas.size && !pecasEnviadas.size && tempo < 1
  if (nadaAFazer) return

  const gravacoes: Promise<unknown>[] = [
    setDoc(doc(db, 'sessoes', sessaoId), {
      uid,
      atualizadoEm: Date.now(),
      segundos: increment(Math.round(tempo)),
      ...Object.fromEntries([...acoesEnviadas].map(([a, n]) => [a, increment(n)])),
    }, { merge: true }),
  ]

  for (const [pecaId, c] of pecasEnviadas) {
    gravacoes.push(setDoc(doc(db, 'metricas', pecaId.replace(/\//g, '__')), {
      peca: pecaId, slot: c.slot,
      escolhas: increment(c.escolhas),
      salvamentos: increment(c.salvamentos),
      levadas: increment(c.levadas),
      descartes: increment(c.descartes),
    }, { merge: true }))
  }

  try {
    await Promise.all(gravacoes)
  } catch {
    // Métrica não pode atrapalhar quem está montando a galinha: se falhar,
    // o número se perde e o app segue.
  }
}

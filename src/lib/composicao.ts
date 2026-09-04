import type { Escolhas, Peca, Personagem, SlotId } from './tipos'
import { acharPeca, pecaBase, pecasDoSlot, slotsDisponiveis } from './catalogo'

/**
 * Devolve as pecas na ordem de empilhamento, da mais ao fundo para a mais a
 * frente. A ordem vem do catalogo (que espelha a ordem das camadas no PSD do
 * Vital), nao da ordem em que o cliente escolheu.
 */
export function camadasEmOrdem(personagem: Personagem, escolhas: Escolhas): Peca[] {
  const saida: Peca[] = [pecaBase(personagem)]
  for (const slot of personagem.ordemCamadas) {
    if (slot === 'base') continue
    const id = escolhas[slot as SlotId]
    if (!id) continue
    const peca = acharPeca(personagem, id)
    if (peca) saida.push(peca)
  }
  return saida
}

/**
 * Monta uma galinha aleatoria. Nao ha combinacao proibida — segundo o Vital,
 * misturar tudo e justamente a graca —, entao o unico controle e quantos slots
 * entram: uma galinha com todos os nove itens vira poluicao visual.
 */
export function sortear(personagem: Personagem): Escolhas {
  const disponiveis = slotsDisponiveis(personagem).map((s) => s.id)
  // Entre 3 e 6 pecas deixa o resultado legivel e ainda surpreendente.
  const quantos = 3 + Math.floor(Math.random() * 4)
  const embaralhados = [...disponiveis].sort(() => Math.random() - 0.5).slice(0, quantos)

  const escolhas: Escolhas = {}
  for (const slot of embaralhados) {
    const opcoes = pecasDoSlot(personagem, slot)
    escolhas[slot] = opcoes[Math.floor(Math.random() * opcoes.length)].id
  }
  return escolhas
}

export function contarPecas(escolhas: Escolhas): number {
  return Object.values(escolhas).filter(Boolean).length
}

/** Lista legivel dos itens escolhidos, para o texto do WhatsApp. */
export function descrever(personagem: Personagem, escolhas: Escolhas): string[] {
  return camadasEmOrdem(personagem, escolhas)
    .filter((p) => p.slot !== 'base')
    .map((p) => p.rotulo ?? p.id)
}

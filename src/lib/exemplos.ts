import type { Criacao } from './tipos'

/**
 * Enquanto ninguém criou nada, a vitrine da abertura não pode ficar vazia —
 * ela é a peça que explica o app antes de o visitante ler qualquer texto.
 * Estas combinações saem do ar assim que houver criações de gente de verdade.
 */
export const EXEMPLOS: Criacao[] = [
  { nome: 'Ana', cor: 'vermelho', escolhas: { cabeca: 'cabeca/chapeu-cowboy', pescoco: 'pescoco/bandana-xadrez', sapatos: 'sapatos/bota-country-cheia', roupa_cima: 'roupa_cima/casaco-franjas' } },
  { nome: 'Júnior', cor: 'preto', escolhas: { cabeca: 'cabeca/moicano-punk', olhos: 'olhos/oculos-escuros', pescoco: 'pescoco/coleira-espinhos', sapatos: 'sapatos/coturno-spikes' } },
  { nome: 'Bia', cor: 'vermelho', escolhas: { cabeca: 'cabeca/laco-bolinhas', roupa_baixo: 'roupa_baixo/tutu-cheio', sapatos: 'sapatos/sapatilha-ballet', pescoco: 'pescoco/colar-perolas' } },
  { nome: 'Rafa', cor: 'vermelho', escolhas: { cabeca: 'cabeca/bone-coracao', olhos: 'olhos/oculos-retangular', roupa_cima: 'roupa_cima/capa-estrela-cheia', sapatos: 'sapatos/tenis-plataforma' } },
  { nome: 'Duda', cor: 'preto', escolhas: { cabeca: 'cabeca/boina-xadrez', roupa_cima: 'roupa_cima/blazer', pescoco: 'pescoco/gravata-listrada', sapatos: 'sapatos/sapato-social' } },
  { nome: 'Léo', cor: 'vermelho', escolhas: { olhos: 'olhos/oculos-mascara', roupa_cima: 'roupa_cima/camiseta-banda', extras: 'extras/skate', meias: 'meias/meia-listrada' } },
  { nome: 'Nina', cor: 'vermelho', escolhas: { cabeca: 'cabeca/gorro-pompom', roupa_cima: 'roupa_cima/gola-tricot', sapatos: 'sapatos/pantufa-coelho', meias: 'meias/meia-bolinhas' } },
  { nome: 'Tom', cor: 'preto', escolhas: { olhos: 'olhos/oculos-coracao', roupa_cima: 'roupa_cima/camiseta-caveira', bolsa: 'bolsa/bolsa-coracao', sapatos: 'sapatos/tenis' } },
].map((e, i) => ({
  id: `exemplo-${i}`,
  uid: 'exemplo',
  autorNome: e.nome,
  escolhas: e.escolhas,
  cor: e.cor as Criacao['cor'],
  publica: true,
  criadoEm: Date.now() - i * 1000 * 60 * 37,
}))

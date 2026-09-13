export interface Referencia {
  id: string;
  nome: string;
  imagem?: string;
  ativo: boolean;
}
export interface CategoriaBicho {
  id: string;
  nome: string;
  opcoes: Referencia[];
}
export interface ConfigBicho {
  chanceFavoritos: number;
  repeticoes: number;
  animais: Referencia[];
  categorias: CategoriaBicho[];
}
const nomes = [
  "Avestruz",
  "Águia",
  "Burro",
  "Borboleta",
  "Cachorro",
  "Cabra",
  "Carneiro",
  "Camelo",
  "Cobra",
  "Coelho",
  "Cavalo",
  "Elefante",
  "Galo",
  "Gato",
  "Jacaré",
  "Leão",
  "Macaco",
  "Porco",
  "Pavão",
  "Peru",
  "Touro",
  "Tigre",
  "Urso",
  "Veado",
  "Vaca",
];
export const BICHO_PADRAO: ConfigBicho = {
  chanceFavoritos: 25,
  repeticoes: 3,
  animais: nomes.map((nome, i) => ({
    id: String(i + 1).padStart(2, "0"),
    nome,
    ativo: true,
  })),
  categorias: [
    ["Cabeça", ["Chapéu", "Boné", "Coroa", "Laço"]],
    ["Olhos", ["Óculos redondos", "Óculos de sol", "Estrela", "Sem acessório"]],
    ["Roupa", ["Camiseta", "Jardineira", "Jaqueta", "Sem roupa"]],
    ["Extras", ["Flor", "Coração", "Caneca", "Skate"]],
  ].map(([nome, opcoes], i) => ({
    id: `categoria-${i}`,
    nome: nome as string,
    opcoes: (opcoes as string[]).map((nome, j) => ({
      id: `${i}-${j}`,
      nome,
      ativo: true,
    })),
  })),
};
export function aleatorioSeguro() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}
/** A porcentagem pertence ao grupo inteiro de favoritos, nunca a cada item. */
export function sortearReferencia(
  opcoes: Referencia[],
  favoritos: string[],
  chance: number,
  random = aleatorioSeguro,
): Referencia {
  const ativas = opcoes.filter((o) => o.ativo);
  if (!ativas.length) throw Error("Nenhuma referência disponível nesta etapa.");
  const preferidas = ativas.filter((o) => favoritos.includes(o.id));
  const outras = ativas.filter((o) => !favoritos.includes(o.id));
  const grupo =
    !preferidas.length || !outras.length
      ? ativas
      : random() < Math.max(0, Math.min(100, chance)) / 100
        ? preferidas
        : outras;
  return grupo[Math.min(grupo.length - 1, Math.floor(random() * grupo.length))];
}
export function validarConfigBicho(c: ConfigBicho): ConfigBicho {
  if (
    !Number.isFinite(c.chanceFavoritos) ||
    c.chanceFavoritos < 0 ||
    c.chanceFavoritos > 100 ||
    !Number.isInteger(c.repeticoes) ||
    c.repeticoes < 0 ||
    c.repeticoes > 10
  )
    throw Error("Informe uma chance entre 0 e 100 e de 0 a 10 repetições.");
  if (!c.animais.some((a) => a.ativo))
    throw Error("Mantenha ao menos um animal ativo.");
  for (const grupo of [c.animais, ...c.categorias.map((cat) => cat.opcoes)]) {
    if (
      !grupo.some((o) => o.ativo) ||
      grupo.some(
        (o) => !o.nome.trim() || (o.imagem && !o.imagem.startsWith("https://")),
      ) ||
      new Set(grupo.map((o) => o.id)).size !== grupo.length
    )
      throw Error(
        "Cada etapa precisa de opções com nome, identificadores únicos e imagens HTTPS.",
      );
  }
  if (c.categorias.some((cat) => !cat.nome.trim()))
    throw Error("Dê um nome a cada categoria.");
  return c;
}

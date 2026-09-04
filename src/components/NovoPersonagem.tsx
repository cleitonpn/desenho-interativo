import { useState } from 'react'
import { AlertTriangle, Loader2, Upload, X } from 'lucide-react'
import { criarPersonagem, prepararPeca, type PersonagemRemoto } from '../lib/pecasRemotas'

interface Props {
  quantosJaExistem: number
  aoFechar: () => void
  aoCriar: (p: PersonagemRemoto) => void
}

type Medidas = Awaited<ReturnType<typeof prepararPeca>>

/**
 * Cria um bicho novo a partir do PNG do corpo. O canvas vem do proprio
 * arquivo, entao cada personagem pode ter a medida que o Vital usou no
 * Procreate — as acessorios dele so precisam sair do mesmo canvas que este.
 */
export function NovoPersonagem({ quantosJaExistem, aoFechar, aoCriar }: Props) {
  const [nome, setNome] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [medidas, setMedidas] = useState<Medidas | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const id = gerarId(nome)

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setErro(''); setArquivo(f); setMedidas(null); setPrevia(null)
    if (!nome) setNome(f.name.replace(/\.png$/i, '').replace(/[-_]+/g, ' '))
    try {
      const m = await prepararPeca(f)
      setMedidas(m)
      setPrevia(URL.createObjectURL(m.blob))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não consegui ler esse arquivo.')
    }
  }

  async function criar() {
    if (!arquivo || !medidas || !id) return
    setOcupado(true); setErro('')
    try {
      aoCriar(await criarPersonagem(id, nome.trim(), quantosJaExistem, arquivo, medidas))
    } catch {
      setErro('Não consegui criar. Confira se sua conta está marcada como admin.')
      setOcupado(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl border-[2.5px] border-ink w-full max-w-md
                      max-h-[92dvh] overflow-y-auto animate-scale-in">
        <div className="px-5 py-4 flex items-center justify-between border-b-2 border-ink/10">
          <h2 className="font-display text-xl">Novo bicho</h2>
          <button onClick={aoFechar} className="text-muted hover:text-ink" aria-label="Fechar"><X /></button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="etiqueta">Nome</span>
            <input className="campo mt-1" value={nome} placeholder="Gato"
                   onChange={(e) => setNome(e.target.value)} />
          </label>

          <label className="botao-neutro w-full cursor-pointer">
            <Upload size={18} /> {arquivo ? 'Trocar corpo' : 'PNG do corpo'}
            <input type="file" accept="image/png" className="hidden" onChange={escolher} />
          </label>

          <p className="text-xs text-muted leading-relaxed">
            Exporte só a camada do corpo, sem acessório nenhum. O canvas desse arquivo
            passa a ser a medida do bicho — todos os acessórios dele precisam sair do
            mesmo tamanho de canvas para encaixarem sozinhos.
          </p>

          {previa && medidas && (
            <div>
              <p className="etiqueta mb-2">
                Canvas {medidas.canvasW}×{medidas.canvasH}
              </p>
              <div className="papel moldura-sutil p-4 grid place-items-center">
                <img src={previa} alt="" className="max-h-48" />
              </div>
            </div>
          )}

          {nome && !id && (
            <p className="flex gap-2 text-sm text-brand font-medium">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              Esse nome não gera um identificador válido. Use letras.
            </p>
          )}
          {erro && <p className="text-brand text-sm">{erro}</p>}

          <button onClick={criar} disabled={!medidas || !id || ocupado}
                  className="botao-principal w-full disabled:opacity-40">
            {ocupado ? <Loader2 size={18} className="animate-spin" /> : null} Criar bicho
          </button>
        </div>
      </div>
    </div>
  )
}

function gerarId(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

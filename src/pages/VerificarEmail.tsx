import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, LogOut, MailCheck, RefreshCw } from 'lucide-react'
import { MARCA } from '../config/marca'
import { useAuth } from '../contexts/AuthContext'

/**
 * Confirmação do e-mail antes de entrar. É o que mantém o mailing do Vital
 * com endereços que existem de verdade — sem isso, qualquer texto com @ entra
 * na lista.
 *
 * Contas do Google não passam por aqui: o Google já confirmou o endereço.
 */
export function VerificarEmail() {
  const navegar = useNavigate()
  const { usuario, reenviarVerificacao, conferirVerificacao, sair } = useAuth()
  const [conferindo, setConferindo] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [reenviado, setReenviado] = useState(false)
  const [aviso, setAviso] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Clicar no link do e-mail acontece em outra aba (ou no celular), e nada
   * avisa esta tela. Em vez de exigir que a pessoa aperte um botão, a tela
   * pergunta ao servidor sozinha a cada 4s e segue quando confirma.
   */
  useEffect(() => {
    timer.current = setInterval(async () => {
      if (await conferirVerificacao()) {
        if (timer.current) clearInterval(timer.current)
        navegar('/tutorial', { replace: true })
      }
    }, 4000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [conferirVerificacao, navegar])

  async function conferirAgora() {
    setConferindo(true); setAviso('')
    try {
      if (await conferirVerificacao()) navegar('/tutorial', { replace: true })
      else setAviso('Ainda não chegou a confirmação. Veja também a caixa de spam.')
    } finally {
      setConferindo(false)
    }
  }

  async function reenviar() {
    setReenviando(true); setAviso('')
    try {
      await reenviarVerificacao()
      setReenviado(true)
      setTimeout(() => setReenviado(false), 5000)
    } catch {
      setAviso('Muitas tentativas seguidas. Espere alguns minutos antes de pedir de novo.')
    } finally {
      setReenviando(false)
    }
  }

  return (
    <div className="min-h-dvh px-6 py-8 safe-top safe-bottom grid place-items-center">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-brand-soft grid place-items-center mx-auto mb-5">
          <MailCheck size={28} className="text-brand" />
        </div>

        <p className="etiqueta">{MARCA.nomeCompleto}</p>
        <h1 className="font-display text-3xl mt-2 mb-3">Confirme seu e-mail</h1>
        <p className="text-muted leading-relaxed">
          Mandei um link para <strong className="text-ink break-all">{usuario?.email}</strong>.
          Abra e volte aqui — a tela segue sozinha assim que você confirmar.
        </p>

        {aviso && <p className="text-brand text-sm font-medium mt-5">{aviso}</p>}

        <button onClick={conferirAgora} disabled={conferindo} className="botao-principal w-full mt-7">
          {conferindo ? <Loader2 size={18} className="animate-spin" /> : null} Já confirmei
        </button>

        <button onClick={reenviar} disabled={reenviando || reenviado}
                className="botao-neutro w-full mt-2.5 disabled:opacity-60">
          {reenviando ? <Loader2 size={18} className="animate-spin" />
            : reenviado ? <Check size={18} className="text-brand" /> : <RefreshCw size={18} />}
          {reenviado ? 'Link reenviado' : 'Reenviar o link'}
        </button>

        <button onClick={async () => { await sair(); navegar('/', { replace: true }) }}
                className="w-full mt-7 py-3 text-sm font-semibold text-muted hover:text-brand
                           transition-colors inline-flex items-center justify-center gap-2">
          <LogOut size={16} /> Usar outro e-mail
        </button>
      </div>
    </div>
  )
}

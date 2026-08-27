import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
const p = await b.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 })
await p.addInitScript(() => { const s=document.createElement('style'); s.textContent='*{animation:none !important;transition:none !important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(s)) })
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'load' })
await p.waitForTimeout(3000)
// o Junior (galinha punk em preto) e o caso do moicano sobre a crista
const alvo = p.locator('figure', { hasText: 'JÚNIOR' }).first()
await alvo.scrollIntoViewIfNeeded()
await p.waitForTimeout(600)
await alvo.screenshot({ path: '/tmp/s-preto-corrigido.png' })
await b.close(); console.log('ok')

import { useId, useState } from 'react'
import type { CategoriaIPCA, AlocacaoUsuario } from '../types/ipca'
import { somaAlocacoes } from '../lib/calculator'

interface Props {
  categorias: CategoriaIPCA[]
  alocacoes: AlocacaoUsuario[]
  onAlocacoesChange: (a: AlocacaoUsuario[]) => void
  renda: string
  onRendaChange: (v: string) => void
  valoresReais: Record<string, string>
  onValoresReaisChange: (v: Record<string, string>) => void
  onCalcular: () => void
  periodoReferencia: string
}

type Modo = 'percentual' | 'real'

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtPeriodo(p: string) {
  const [ano, mes] = p.split('-')
  return `${MESES[parseInt(mes) - 1]}/${ano}`
}
function limpar(nome: string) { return nome.replace(/^\d+\./, '').trim() }
function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)) }
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ─── Category icon ──────────────────────────────────────────── */
function CatIcon({ nome }: { nome: string }) {
  const n = nome.toLowerCase()
  const s = { width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2 } as const

  if (n.includes('aliment') || n.includes('bebida'))
    return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
  if (n.includes('habita'))
    return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (n.includes('transport'))
    return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  if (n.includes('saúde') || n.includes('saude') || n.includes('cuidado'))
    return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  if (n.includes('educa'))
    return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
  if (n.includes('vest'))
    return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
  if (n.includes('comuni'))
    return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
  if (n.includes('artigo') || n.includes('residê') || n.includes('residencia'))
    return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2"/><path d="M2 11h20"/><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M12 11v10"/></svg>
  return <svg {...s} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
}

/* ─── Component ──────────────────────────────────────────────── */
export default function Onboarding({
  categorias, alocacoes, onAlocacoesChange,
  renda, onRendaChange, valoresReais, onValoresReaisChange,
  onCalcular, periodoReferencia,
}: Props) {
  const uid  = useId()
  const [modo, setModo] = useState<Modo>('real')

  /* R$ mode logic */
  const rendaNum = parseFloat(renda.replace(',', '.')) || 0

  function setValorReal(id: string, raw: string) {
    const novoValores = { ...valoresReais, [id]: raw }
    onValoresReaisChange(novoValores)
    const novo = categorias.map((c) => {
      const val = parseFloat(novoValores[c.id]?.replace(',', '.') || '0') || 0
      const pct = rendaNum > 0 ? (val / rendaNum) * 100 : 0
      return { categoriaId: c.id, percentual: Math.round(pct * 10) / 10 }
    })
    onAlocacoesChange(novo)
  }

  function setRendaERecalcula(raw: string) {
    onRendaChange(raw)
    const novaRenda = parseFloat(raw.replace(',', '.')) || 0
    const novo = categorias.map((c) => {
      const val = parseFloat(valoresReais[c.id]?.replace(',', '.') || '0') || 0
      const pct = novaRenda > 0 ? (val / novaRenda) * 100 : 0
      return { categoriaId: c.id, percentual: Math.round(pct * 10) / 10 }
    })
    onAlocacoesChange(novo)
  }

  const totalReais    = categorias.reduce((acc, c) => acc + (parseFloat(valoresReais[c.id]?.replace(',', '.') || '0') || 0), 0)
  const pctAlocadoReal = rendaNum > 0 ? (totalReais / rendaNum) * 100 : 0
  const somaOkReal    = rendaNum > 0 && Math.abs(pctAlocadoReal - 100) < 0.5

  /* % mode logic */
  function setPercentual(id: string, val: number) {
    onAlocacoesChange(alocacoes.map((a) => a.categoriaId === id ? { ...a, percentual: clamp(val) } : a))
  }

  const soma       = somaAlocacoes(alocacoes)
  const somaOkPct  = Math.abs(soma - 100) < 0.01

  /* Shared */
  const somaOk   = modo === 'real' ? somaOkReal : somaOkPct
  const progresso = modo === 'real' ? Math.min(pctAlocadoReal, 100) : Math.min(soma, 100)
  const isOver    = modo === 'real' ? pctAlocadoReal > 100.5 : soma > 100.1

  function trocarModo(novoModo: Modo) {
    setModo(novoModo)
    if (novoModo === 'real') {
      onValoresReaisChange(Object.fromEntries(categorias.map((c) => [c.id, ''])))
    }
    onAlocacoesChange(categorias.map((c) => ({ categoriaId: c.id, percentual: 0 })))
  }

  /* Progress hint */
  let progressHint = ''
  if (modo === 'real') {
    if (somaOkReal)            progressHint = 'Perfeito! Tudo alocado.'
    else if (isOver)           progressHint = `Reduza R$ ${fmtBRL(totalReais - rendaNum)} — passou da renda.`
    else if (pctAlocadoReal > 0 && rendaNum > 0) progressHint = `Faltam R$ ${fmtBRL(rendaNum - totalReais)} para completar 100%.`
    else                       progressHint = 'Preencha os valores por categoria.'
  } else {
    if (somaOkPct)  progressHint = 'Perfeito! Total em 100%.'
    else if (isOver) progressHint = `Reduza ${(soma - 100).toFixed(1)}% — passou de 100%.`
    else             progressHint = soma > 0 ? `Faltam ${(100 - soma).toFixed(1)}% para completar 100%.` : 'Ajuste os percentuais abaixo.'
  }

  /* Progress display value */
  const progressValue = modo === 'real'
    ? rendaNum > 0
      ? `R$ ${fmtBRL(totalReais)} de R$ ${fmtBRL(rendaNum)}`
      : `R$ ${fmtBRL(totalReais)}`
    : `${soma.toFixed(1)}%`

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: '1.375rem' }}>
        <h1 style={{ fontSize: 'clamp(1.375rem, 5vw, 1.625rem)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: '.375rem' }}>
          Como você gasta seu dinheiro?
        </h1>
        <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
          Dados de <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>{fmtPeriodo(periodoReferencia)}</strong>.
          {' '}Ajuste os valores e calcule a inflação do seu bolso.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="toggle-wrap" role="group" aria-label="Modo de entrada">
        <button className="toggle-btn" aria-pressed={modo === 'real'} onClick={() => trocarModo('real')}>
          Em reais (R$)
        </button>
        <button className="toggle-btn" aria-pressed={modo === 'percentual'} onClick={() => trocarModo('percentual')}>
          Em percentuais (%)
        </button>
      </div>

      {/* Income card — R$ mode only */}
      {modo === 'real' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <label
            htmlFor={`${uid}-renda`}
            style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '.5rem' }}
          >
            Renda mensal
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>R$</span>
            <input
              id={`${uid}-renda`}
              type="number"
              min={0}
              step={100}
              placeholder="0,00"
              value={renda}
              onChange={(e) => setRendaERecalcula(e.target.value)}
              aria-label="Renda mensal em reais"
              style={{
                flex: 1, width: 'auto', background: 'transparent', border: 'none',
                fontSize: '1.625rem', fontWeight: 800, color: 'var(--text)',
                letterSpacing: '-.025em', padding: 0, textAlign: 'left',
              }}
            />
          </div>
          {rendaNum <= 0 && (
            <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.375rem' }}>
              Informe sua renda para calcular os percentuais.
            </p>
          )}
        </div>
      )}

      {/* Allocation progress */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.5rem' }}>
          <span style={{ fontSize: '.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total alocado</span>
          <span style={{
            fontWeight: 700, fontSize: '.9375rem', fontVariantNumeric: 'tabular-nums',
            color: somaOk ? 'var(--success)' : isOver ? 'var(--danger)' : 'var(--text)',
            transition: 'color var(--t)',
          }}>
            {progressValue}
          </span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-bar${somaOk ? ' ok' : isOver ? ' over' : ''}`}
            style={{ width: `${progresso}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progresso)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progressValue} alocados`}
          />
        </div>
        {progresso > 0 && (
          <p role="status" style={{
            fontSize: '.75rem', marginTop: '.4375rem', fontWeight: 500,
            color: somaOk ? 'var(--success)' : isOver ? 'var(--danger)' : 'var(--text-muted)',
          }}>
            {progressHint}
          </p>
        )}
      </div>

      {/* Categories */}
      <p className="section-label">Categorias de gastos</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1rem' }}>
        {categorias.map((cat) => {
          const alocacao    = alocacoes.find((a) => a.categoriaId === cat.id)
          const pct         = alocacao?.percentual ?? 0
          const valorRealStr = valoresReais[cat.id] ?? ''
          const inputId     = `${uid}-in-${cat.id}`
          const sliderId    = `${uid}-sl-${cat.id}`
          const nome        = limpar(cat.nome)

          return (
            <div
              key={cat.id}
              className="card"
              style={{ padding: '.875rem 1rem', transition: 'box-shadow var(--t), border-color var(--t)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--r-sm)',
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CatIcon nome={nome} />
                </div>

                {/* Name + IBGE */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label htmlFor={inputId} style={{ display: 'block', fontWeight: 600, fontSize: '.875rem', color: 'var(--text)', cursor: 'pointer' }}>
                    {nome}
                  </label>
                  <span style={{ fontSize: '.6875rem', color: 'var(--text-muted)' }}>
                    IBGE {(cat.pesoOficial ?? 0).toFixed(1)}%
                  </span>
                </div>

                {/* Input area */}
                {modo === 'real' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '.8125rem', fontWeight: 500, color: 'var(--text-muted)' }}>R$</span>
                    <input
                      id={inputId}
                      type="number"
                      min={0}
                      step={10}
                      placeholder="0"
                      value={valorRealStr}
                      onChange={(e) => setValorReal(cat.id, e.target.value)}
                      aria-label={`Valor em reais para ${nome}`}
                      style={{ width: '5.5rem' }}
                    />
                    {rendaNum > 0 && (
                      <span style={{
                        fontSize: '.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                        minWidth: '3rem', textAlign: 'right',
                        color: pct > 0 ? 'var(--primary)' : 'var(--text-muted)',
                      }}>
                        {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem', flexShrink: 0 }}>
                    <input
                      id={inputId}
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={pct || ''}
                      placeholder="0"
                      onChange={(e) => setPercentual(cat.id, parseFloat(e.target.value) || 0)}
                      aria-label={`Percentual de ${nome}`}
                      style={{ width: '4.25rem' }}
                    />
                    <span style={{ fontSize: '.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>%</span>
                  </div>
                )}
              </div>

              {/* Slider — % mode */}
              {modo === 'percentual' && (
                <div style={{ marginTop: '.625rem', paddingLeft: '3rem' }}>
                  <input
                    id={sliderId}
                    type="range"
                    min={0} max={100} step={0.5}
                    value={pct}
                    aria-label={`Percentual de ${nome}: ${pct.toFixed(1)}%`}
                    onChange={(e) => setPercentual(cat.id, parseFloat(e.target.value))}
                  />
                </div>
              )}

              {/* Mini progress bar — R$ mode when value entered */}
              {modo === 'real' && rendaNum > 0 && pct > 0 && (
                <div style={{ marginTop: '.5rem', paddingLeft: '3rem' }}>
                  <div className="progress-track" style={{ height: 4 }} aria-hidden="true">
                    <div style={{
                      height: '100%', width: `${Math.min(pct, 100)}%`,
                      background: 'var(--primary)', borderRadius: 100,
                      transition: 'width var(--t)',
                    }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed CTA */}
      <div className="cta-wrap">
        <button
          className="btn-cta"
          onClick={onCalcular}
          disabled={!somaOk}
          aria-disabled={!somaOk}
        >
          Calcular minha inflação
        </button>
        <p style={{ fontSize: '.6875rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.3rem' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Tudo calculado no seu navegador — seus dados não saem daqui
        </p>
      </div>
    </div>
  )
}

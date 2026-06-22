import { useId, useState } from 'react'
import type { CategoriaIPCA, AlocacaoUsuario } from '../types/ipca'
import { somaAlocacoes } from '../lib/calculator'

interface Props {
  categorias: CategoriaIPCA[]
  alocacoes: AlocacaoUsuario[]
  onAlocacoesChange: (a: AlocacaoUsuario[]) => void
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

export default function Onboarding({ categorias, alocacoes, onAlocacoesChange, onCalcular, periodoReferencia }: Props) {
  const uid = useId()
  const [modo, setModo] = useState<Modo>('real')
  const [renda, setRenda] = useState<string>('')
  // valoresReais: Record<categoriaId, string> — strings para inputs controlados
  const [valoresReais, setValoresReais] = useState<Record<string, string>>(
    () => Object.fromEntries(categorias.map((c) => [c.id, '']))
  )

  // === Modo R$ ===
  const rendaNum = parseFloat(renda.replace(',', '.')) || 0

  function setValorReal(id: string, raw: string) {
    const novoValores = { ...valoresReais, [id]: raw }
    setValoresReais(novoValores)
    // Converte para percentuais e atualiza o pai
    const novo = categorias.map((c) => {
      const val = parseFloat(novoValores[c.id]?.replace(',', '.') || '0') || 0
      const pct = rendaNum > 0 ? (val / rendaNum) * 100 : 0
      return { categoriaId: c.id, percentual: Math.round(pct * 10) / 10 }
    })
    onAlocacoesChange(novo)
  }

  function setRendaERecalcula(raw: string) {
    setRenda(raw)
    const novaRenda = parseFloat(raw.replace(',', '.')) || 0
    const novo = categorias.map((c) => {
      const val = parseFloat(valoresReais[c.id]?.replace(',', '.') || '0') || 0
      const pct = novaRenda > 0 ? (val / novaRenda) * 100 : 0
      return { categoriaId: c.id, percentual: Math.round(pct * 10) / 10 }
    })
    onAlocacoesChange(novo)
  }

  const totalReais = categorias.reduce((acc, c) => {
    return acc + (parseFloat(valoresReais[c.id]?.replace(',', '.') || '0') || 0)
  }, 0)
  const pctAlocadoReal = rendaNum > 0 ? (totalReais / rendaNum) * 100 : 0
  const somaOkReal = rendaNum > 0 && Math.abs(pctAlocadoReal - 100) < 0.5

  // === Modo % ===
  function setPercentual(id: string, val: number) {
    onAlocacoesChange(alocacoes.map((a) => a.categoriaId === id ? { ...a, percentual: clamp(val) } : a))
  }

  const soma = somaAlocacoes(alocacoes)
  const somaOkPct = Math.abs(soma - 100) < 0.01

  // === Compartilhado ===
  const somaOk = modo === 'real' ? somaOkReal : somaOkPct
  const progresso = modo === 'real' ? Math.min(pctAlocadoReal, 100) : Math.min(soma, 100)
  const corSoma = progresso < 95 ? 'var(--c-warning)' : progresso > 100.5 ? 'var(--c-danger)' : 'var(--c-success)'

  function trocarModo(novoModo: Modo) {
    setModo(novoModo)
    // Ao trocar, zera tudo
    if (novoModo === 'real') {
      setValoresReais(Object.fromEntries(categorias.map((c) => [c.id, ''])))
      onAlocacoesChange(categorias.map((c) => ({ categoriaId: c.id, percentual: 0 })))
    } else {
      onAlocacoesChange(categorias.map((c) => ({ categoriaId: c.id, percentual: 0 })))
    }
  }

  return (
    <div>
      <header style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Sua inflação pessoal
        </h1>
        <p style={{ color: 'var(--c-text-muted)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '32rem' }}>
          Dados de <strong style={{ color: 'var(--c-text)' }}>{fmtPeriodo(periodoReferencia)}</strong>.
          Como você distribui seus gastos mensais?
        </p>
      </header>

      {/* Toggle de modo */}
      <div className="toggle-group" style={{ marginBottom: '1.5rem' }}>
        <button className="toggle-btn" onClick={() => trocarModo('real')} aria-pressed={modo === 'real'}>
          R$ Em reais
        </button>
        <button className="toggle-btn" onClick={() => trocarModo('percentual')} aria-pressed={modo === 'percentual'}>
          % Percentuais
        </button>
      </div>

      {/* Campo de renda (só modo R$) */}
      {modo === 'real' && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
          <label htmlFor={`${uid}-renda`} style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--c-text-muted)' }}>
            Renda (ou total de despesas) mensal
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--c-text-muted)', fontWeight: 500, fontSize: '1rem' }}>R$</span>
            <input
              id={`${uid}-renda`}
              type="number"
              min={0}
              step={100}
              placeholder="0,00"
              value={renda}
              onChange={(e) => setRendaERecalcula(e.target.value)}
              style={{ flex: 1, width: 'auto', padding: '0.5rem 0.75rem', fontSize: '1.125rem', fontWeight: 600 }}
              aria-label="Renda mensal em reais"
            />
          </div>
          {rendaNum <= 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>
              Informe sua renda para calcular os percentuais automaticamente.
            </p>
          )}
        </div>
      )}

      {/* Barra de progresso */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>Total alocado</span>
          <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: corSoma, fontVariantNumeric: 'tabular-nums' }}>
            {modo === 'real'
              ? `R$ ${fmtBRL(totalReais)}${rendaNum > 0 ? ` de R$ ${fmtBRL(rendaNum)}` : ''}`
              : `${soma.toFixed(1)}%`}
          </span>
        </div>
        <div style={{ height: '6px', background: 'var(--c-surface-2)', borderRadius: '3px', overflow: 'hidden' }}
             role="progressbar"
             aria-valuenow={Math.round(progresso)}
             aria-valuemin={0} aria-valuemax={100}
             aria-label={modo === 'real'
               ? `R$ ${fmtBRL(totalReais)} de R$ ${fmtBRL(rendaNum)} alocados`
               : `${soma.toFixed(1)}% de 100% alocados`}>
          <div style={{
            height: '100%', width: `${progresso}%`, borderRadius: '3px',
            background: somaOk ? 'var(--c-success)' : progresso > 100 ? 'var(--c-danger)' : 'var(--c-primary)',
            transition: 'width var(--t-base), background var(--t-base)',
          }} />
        </div>
        {!somaOk && progresso > 0 && (
          <p role="status" style={{ color: corSoma, fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            {modo === 'real'
              ? pctAlocadoReal < 99.5
                ? `Faltam R$ ${fmtBRL(rendaNum - totalReais)} para completar 100%.`
                : `Reduza R$ ${fmtBRL(totalReais - rendaNum)} — passou da renda.`
              : soma < 100
                ? `Faltam ${(100 - soma).toFixed(1)}% para completar 100%.`
                : `Reduza ${(soma - 100).toFixed(1)}% — passou de 100%.`}
          </p>
        )}
      </div>

      {/* Lista de categorias */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {categorias.map((cat) => {
          const alocacao = alocacoes.find((a) => a.categoriaId === cat.id)
          const pct = alocacao?.percentual ?? 0
          const valorRealStr = valoresReais[cat.id] ?? ''
          const sliderId = `${uid}-sl-${cat.id}`
          const inputId = `${uid}-in-${cat.id}`
          const nome = limpar(cat.nome)

          return (
            <div key={cat.id} className="card" style={{ padding: '0.875rem 1.125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <label htmlFor={inputId} style={{ fontWeight: 500, fontSize: '0.9375rem', flex: 1, minWidth: 0 }}>
                  {nome}
                </label>

                {modo === 'real' ? (
                  /* Modo R$: input de valor + percentual derivado */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ color: 'var(--c-text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>R$</span>
                    <input
                      id={inputId}
                      type="number"
                      min={0}
                      step={10}
                      placeholder="0"
                      value={valorRealStr}
                      onChange={(e) => setValorReal(cat.id, e.target.value)}
                      aria-label={`Valor em reais para ${nome}`}
                      style={{ width: '6rem', padding: '0.375rem 0.5rem', fontSize: '0.9375rem', textAlign: 'right' }}
                    />
                    {rendaNum > 0 && (
                      <span style={{ color: pct > 0 ? 'var(--c-primary)' : 'var(--c-text-muted)', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', minWidth: '3.25rem', textAlign: 'right' }}>
                        {pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ) : (
                  /* Modo %: slider + input numérico */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ color: 'var(--c-text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      IBGE {cat.pesoOficial.toFixed(1)}%
                    </span>
                    <input
                      id={inputId}
                      type="number"
                      min={0} max={100} step={0.5}
                      value={pct}
                      aria-label={`Percentual de ${nome}`}
                      onChange={(e) => setPercentual(cat.id, parseFloat(e.target.value) || 0)}
                      style={{ width: '4.5rem' }}
                    />
                  </div>
                )}
              </div>

              {/* Slider só no modo % */}
              {modo === 'percentual' && (
                <div style={{ marginTop: '0.625rem' }}>
                  <input
                    id={sliderId}
                    type="range"
                    min={0} max={100} step={0.5}
                    value={pct}
                    aria-label={`Deslize para ${nome}: ${pct.toFixed(1)}%`}
                    onChange={(e) => setPercentual(cat.id, parseFloat(e.target.value))}
                  />
                </div>
              )}

              {/* Barra de progresso por categoria no modo R$ */}
              {modo === 'real' && rendaNum > 0 && pct > 0 && (
                <div style={{ marginTop: '0.5rem', height: '3px', background: 'var(--c-surface-2)', borderRadius: '2px', overflow: 'hidden' }} aria-hidden="true">
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: 'var(--c-primary)', transition: 'width var(--t-base)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        className="btn-primary"
        onClick={onCalcular}
        disabled={!somaOk}
        aria-disabled={!somaOk}
      >
        Calcular minha inflação
      </button>

      <p style={{ color: 'var(--c-text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
        Nenhum dado seu é salvo — o cálculo acontece inteiramente no seu navegador.
      </p>
    </div>
  )
}

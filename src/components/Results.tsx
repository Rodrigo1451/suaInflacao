import type { DadosIPCA, AlocacaoUsuario, CampoVariacao, ContribuicaoCategoria } from '../types/ipca'
import { calcularComparacao, calcularContribuicoes } from '../lib/calculator'

interface Props {
  dados: DadosIPCA
  alocacoes: AlocacaoUsuario[]
  campo: CampoVariacao
  onCampoChange: (c: CampoVariacao) => void
  onVoltar: () => void
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtPeriodo(p: string) {
  const [ano, mes] = p.split('-')
  return `${MESES[parseInt(mes) - 1]}/${ano}`
}
function fmt(v: number, d = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function limpar(nome: string) { return nome.replace(/^\d+\./, '').trim() }
function sinal(v: number) { return v > 0 ? '+' : '' }

/* ─── Delta chart ────────────────────────────────────────────── */
function DeltaChart({ contribuicoes }: { contribuicoes: ContribuicaoCategoria[] }) {
  const ordered  = [...contribuicoes].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const maxAbs   = Math.max(...ordered.map((c) => Math.abs(c.delta)), 0.01)

  return (
    <>
      <div className="legend-row" aria-hidden="true">
        <span><span className="legend-dot" style={{ background: 'var(--danger)' }} />Você pagou mais</span>
        <span><span className="legend-dot" style={{ background: 'var(--success)' }} />Você pagou menos</span>
      </div>
      <div role="list" aria-label="Contribuição de cada categoria para a diferença de inflação">
        {ordered.map((c) => {
          const isPos = c.delta > 0
          const isNeg = c.delta < 0
          const pct   = (Math.abs(c.delta) / maxAbs) * 100
          return (
            <div key={c.categoriaId} className="bar-row" role="listitem">
              <span className="bar-name">{limpar(c.nome)}</span>
              <div className="bar-track">
                <div
                  className={`bar-fill${isPos ? ' pos' : isNeg ? ' neg' : ''}`}
                  style={{ width: `${pct}%`, minWidth: Math.abs(c.delta) < 0.001 ? 0 : 3 }}
                  aria-hidden="true"
                />
              </div>
              <span className={`bar-val${isPos ? ' pos' : isNeg ? ' neg' : ' neu'}`}>
                {sinal(c.delta)}{fmt(c.delta, 2)} p.p.
              </span>
            </div>
          )
        })}
      </div>
      {/* Accessible table for screen readers */}
      <table style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <caption>Contribuição de cada categoria para a diferença entre inflação pessoal e IPCA oficial</caption>
        <thead><tr><th>Categoria</th><th>Seu peso (%)</th><th>Peso IBGE (%)</th><th>Contribuição (p.p.)</th></tr></thead>
        <tbody>
          {ordered.map((c) => (
            <tr key={c.categoriaId}>
              <td>{limpar(c.nome)}</td>
              <td>{fmt(c.pesoUsuario, 1)}</td>
              <td>{fmt(c.pesoOficial, 1)}</td>
              <td>{sinal(c.delta)}{fmt(c.delta, 3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ─── Peso chart ─────────────────────────────────────────────── */
function PesoChart({ contribuicoes }: { contribuicoes: ContribuicaoCategoria[] }) {
  const ordered = [...contribuicoes].sort((a, b) => Math.abs(b.pesoUsuario - b.pesoOficial) - Math.abs(a.pesoUsuario - a.pesoOficial))
  const max     = Math.max(...contribuicoes.flatMap((c) => [c.pesoUsuario, c.pesoOficial]), 25)

  return (
    <div role="list" aria-label="Comparação de pesos por categoria">
      <div className="legend-row" aria-hidden="true">
        <span><span className="legend-dot" style={{ background: 'var(--primary)' }} />Seu perfil</span>
        <span><span className="legend-dot" style={{ background: 'var(--surface-3)' }} />Média IBGE</span>
      </div>
      {ordered.map((c) => (
        <div key={c.categoriaId} role="listitem" style={{ marginBottom: '.875rem' }}>
          <span style={{ display: 'block', fontSize: '.8125rem', fontWeight: 500, color: 'var(--text)', marginBottom: '.3125rem' }}>
            {limpar(c.nome)}
          </span>
          {/* User bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem', marginBottom: '.25rem' }}>
            <div className="bar-track" style={{ flex: 1 }}>
              <div
                aria-hidden="true"
                style={{
                  height: '100%', width: `${(c.pesoUsuario / max) * 100}%`,
                  background: 'var(--primary)', borderRadius: 100,
                  transition: 'width var(--t-slow)', minWidth: c.pesoUsuario > 0 ? 3 : 0,
                }}
              />
            </div>
            <span style={{ fontSize: '.75rem', color: 'var(--primary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: '2.75rem', textAlign: 'right' }}>
              {fmt(c.pesoUsuario, 1)}%
            </span>
          </div>
          {/* IBGE bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.375rem' }}>
            <div className="bar-track" style={{ flex: 1, height: 6 }}>
              <div
                aria-hidden="true"
                style={{
                  height: '100%', width: `${(c.pesoOficial / max) * 100}%`,
                  background: 'var(--surface-3)', borderRadius: 100,
                }}
              />
            </div>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: '2.75rem', textAlign: 'right' }}>
              {fmt(c.pesoOficial, 1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Results ────────────────────────────────────────────────── */
export default function Results({ dados, alocacoes, campo, onCampoChange, onVoltar }: Props) {
  const resultado    = calcularComparacao(alocacoes, dados.categorias, campo)
  const contribuicoes = calcularContribuicoes(alocacoes, dados.categorias, campo)

  const diff     = resultado.diferencaPP
  const isOver   = diff > 0
  const isUnder  = diff < 0
  const periodLabel = campo === 'variacaoMensal' ? fmtPeriodo(dados.periodoReferencia) : 'últimos 12 meses'

  const deltaClass  = isOver ? 'danger' : isUnder ? 'success' : ''
  const deltaVerb   = isOver ? 'mais' : isUnder ? 'menos' : 'igual à'
  const deltaIconPath = isOver
    ? 'M18 15l-6-6-6 6'   /* chevron-up */
    : 'M6 9l6 6 6-6'      /* chevron-down */

  return (
    <div>
      {/* Back */}
      <button className="back-btn" onClick={onVoltar} aria-label="Voltar para ajuste de perfil">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Ajustar perfil
      </button>

      {/* Period toggle */}
      <div className="toggle-wrap" role="group" aria-label="Período" style={{ marginBottom: '1.125rem' }}>
        {(['variacaoMensal', 'variacaoAcumulada12m'] as CampoVariacao[]).map((c) => (
          <button key={c} className="toggle-btn" aria-pressed={campo === c} onClick={() => onCampoChange(c)}>
            {c === 'variacaoMensal' ? 'Este mês' : '12 meses'}
          </button>
        ))}
      </div>

      {/* Hero */}
      <div className="result-hero" role="region" aria-label="Resultado principal">
        <p className="result-hero-label">Sua inflação pessoal</p>
        <p className="result-hero-number">{fmt(resultado.ipcaPessoal)}%</p>
        <p className="result-hero-desc">
          {diff === 0
            ? 'Sua inflação está igual à média nacional.'
            : <>
                Você está sendo afetado{' '}
                <strong>
                  {resultado.diferencaPercentual !== null
                    ? `${Math.abs(resultado.diferencaPercentual).toFixed(1)}% `
                    : ''}
                  {deltaVerb}
                </strong>{' '}
                que a média nacional em {periodLabel}.
              </>
          }
        </p>
      </div>

      {/* Comparison grid */}
      <div className="compare-grid">
        <div className="compare-card hi">
          <p className="compare-card-lbl">Sua inflação</p>
          <p className="compare-card-val">{fmt(resultado.ipcaPessoal)}%</p>
          <p className="compare-card-sub">No seu bolso</p>
        </div>
        <div className="compare-card">
          <p className="compare-card-lbl">IPCA oficial</p>
          <p className="compare-card-val">{fmt(resultado.ipcaOficial)}%</p>
          <p className="compare-card-sub">Média nacional</p>
        </div>
      </div>

      {/* Delta */}
      {diff !== 0 && (
        <div className="delta-card">
          <div className={`delta-icon ${deltaClass}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={isOver ? 'var(--danger)' : 'var(--success)'} strokeWidth="2.5"
              aria-hidden="true">
              <polyline points={deltaIconPath} />
            </svg>
          </div>
          <div>
            <p className={`delta-number ${deltaClass}`}>
              {sinal(diff)}{fmt(diff)} p.p. {isOver ? 'acima' : 'abaixo'} da média
            </p>
            <p className="delta-desc">
              {isOver
                ? 'Seu perfil de consumo amplifica a inflação em relação à cesta do IBGE.'
                : 'Seu perfil de consumo atenua a inflação em relação à cesta do IBGE.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Warning — ignored categories */}
      {resultado.categoriasIgnoradas.length > 0 && (
        <div role="alert" style={{
          background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,.3)',
          borderRadius: 'var(--r)', padding: '.875rem 1rem', marginBottom: '.875rem',
        }}>
          <p style={{ fontSize: '.875rem', color: 'var(--warning)', fontWeight: 500 }}>
            Dado indisponível para {resultado.categoriasIgnoradas.length} categoria(s). Resultado calculado com os demais grupos.
          </p>
        </div>
      )}

      {/* Chart — O que explica a diferença */}
      <div className="card" style={{ marginBottom: '.75rem' }}>
        <h2 style={{ fontSize: '.9375rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.25rem' }}>
          O que explica a diferença?
        </h2>
        <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
          Contribuição de cada categoria (em p.p.) para a diferença entre sua inflação e o IPCA.
        </p>
        <DeltaChart contribuicoes={contribuicoes} />
      </div>

      {/* Chart — Pesos */}
      <div className="card">
        <h2 style={{ fontSize: '.9375rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.25rem' }}>
          Seu perfil vs. média nacional
        </h2>
        <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
          Peso que você atribuiu a cada categoria comparado à cesta oficial do IBGE.
        </p>
        <PesoChart contribuicoes={contribuicoes} />
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '.6875rem', textAlign: 'center', marginTop: '1.375rem', lineHeight: 1.7 }}>
        Cálculo baseado nas variações oficiais do IBGE — Tabela SIDRA 7060.<br />
        Pesos reponderados com seu perfil; variações de preço são as mesmas para todos.<br />
        Nenhum dado seu é salvo.
      </p>
    </div>
  )
}

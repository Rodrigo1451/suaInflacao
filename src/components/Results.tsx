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

// Gráfico de contribuição (waterfall delta)
function DeltaChart({ contribuicoes }: { contribuicoes: ContribuicaoCategoria[] }) {
  const ordered = [...contribuicoes].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const maxAbs = Math.max(...ordered.map((c) => Math.abs(c.delta)), 0.01)

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--c-text-muted)', marginBottom: '0.875rem' }}>
        <span><span style={{ color: '#f87171' }}>■</span> Você pagou mais</span>
        <span><span style={{ color: '#4ade80' }}>■</span> Você pagou menos</span>
      </div>
      <div role="list" aria-label="Contribuição de cada categoria para a diferença de inflação">
        {ordered.map((c) => {
          const isPos = c.delta > 0
          const cor = isPos ? '#f87171' : c.delta < 0 ? '#4ade80' : 'var(--c-text-muted)'
          const largura = `${(Math.abs(c.delta) / maxAbs) * 100}%`
          const nomeLabel = limpar(c.nome)
          return (
            <div key={c.categoriaId} role="listitem"
              style={{ display: 'grid', gridTemplateColumns: '7.5rem 1fr 5rem', gap: '0.625rem', alignItems: 'center', marginBottom: '0.875rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--c-text)', lineHeight: 1.3 }}>{nomeLabel}</span>
              <div style={{ position: 'relative', height: '1.5rem', display: 'flex', alignItems: 'center' }}
                   aria-hidden="true">
                <div style={{
                  height: '0.875rem',
                  width: largura,
                  background: cor,
                  borderRadius: '3px',
                  opacity: 0.85,
                  transition: 'width var(--t-slow)',
                  minWidth: Math.abs(c.delta) < 0.001 ? 0 : '3px',
                }} />
              </div>
              <span style={{ fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums', color: cor, textAlign: 'right', fontWeight: 600 }}>
                {sinal(c.delta)}{fmt(c.delta, 2)} p.p.
              </span>
            </div>
          )
        })}
      </div>
      {/* Tabela acessível para leitores de tela */}
      <table style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <caption>Contribuição de cada categoria para a diferença entre inflação pessoal e IPCA oficial</caption>
        <thead><tr><th>Categoria</th><th>Seu peso (%)</th><th>Peso IBGE (%)</th><th>Contribuição para a diferença (p.p.)</th></tr></thead>
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
    </div>
  )
}

// Gráfico de pesos comparados
function PesoChart({ contribuicoes }: { contribuicoes: ContribuicaoCategoria[] }) {
  const ordered = [...contribuicoes].sort((a, b) => Math.abs(b.pesoUsuario - b.pesoOficial) - Math.abs(a.pesoUsuario - a.pesoOficial))
  const max = Math.max(...contribuicoes.flatMap((c) => [c.pesoUsuario, c.pesoOficial]), 25)

  return (
    <div role="list" aria-label="Comparação de pesos por categoria">
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--c-text-muted)', marginBottom: '0.875rem' }}>
        <span><span style={{ color: 'var(--c-primary)' }}>■</span> Seu perfil</span>
        <span><span style={{ color: 'var(--c-surface-2)' }}>■</span> Média IBGE</span>
      </div>
      {ordered.map((c) => (
        <div key={c.categoriaId} role="listitem"
          style={{ display: 'grid', gridTemplateColumns: '7.5rem 1fr', gap: '0.625rem', alignItems: 'center', marginBottom: '0.875rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--c-text)', lineHeight: 1.3 }}>{limpar(c.nome)}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
              <div style={{ height: '0.625rem', width: `${(c.pesoUsuario / max) * 100}%`, background: 'var(--c-primary)', borderRadius: '2px', minWidth: '2px', transition: 'width var(--t-slow)' }} aria-hidden="true" />
              <span style={{ fontSize: '0.75rem', color: 'var(--c-primary)', fontVariantNumeric: 'tabular-nums', minWidth: '2.75rem' }}>{fmt(c.pesoUsuario, 1)}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ height: '0.625rem', width: `${(c.pesoOficial / max) * 100}%`, background: 'var(--c-surface-2)', borderRadius: '2px', minWidth: '2px' }} aria-hidden="true" />
              <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: '2.75rem' }}>{fmt(c.pesoOficial, 1)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Results({ dados, alocacoes, campo, onCampoChange, onVoltar }: Props) {
  const resultado = calcularComparacao(alocacoes, dados.categorias, campo)
  const contribuicoes = calcularContribuicoes(alocacoes, dados.categorias, campo)

  const corDelta = resultado.diferencaPP > 0 ? 'var(--c-danger)' : resultado.diferencaPP < 0 ? 'var(--c-success)' : 'var(--c-text)'
  const textoDelta = resultado.diferencaPP > 0 ? 'mais' : resultado.diferencaPP < 0 ? 'menos' : 'igual a'
  const periodLabel = campo === 'variacaoMensal' ? fmtPeriodo(dados.periodoReferencia) : 'últimos 12 meses'

  return (
    <div>
      {/* Voltar */}
      <button
        onClick={onVoltar}
        style={{ background: 'none', border: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', padding: '0.25rem 0', minHeight: '44px' }}
        aria-label="Voltar para ajuste de perfil"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Ajustar perfil
      </button>

      {/* Toggle */}
      <div className="toggle-group" style={{ marginBottom: '1.75rem' }}>
        {(['variacaoMensal', 'variacaoAcumulada12m'] as CampoVariacao[]).map((c) => (
          <button key={c} className="toggle-btn" onClick={() => onCampoChange(c)} aria-pressed={campo === c}>
            {c === 'variacaoMensal' ? 'Este mês' : '12 meses'}
          </button>
        ))}
      </div>

      {/* Números principais */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="card">
          <p className="section-label">Sua inflação</p>
          <p className="stat-value" style={{ color: 'var(--c-text)' }}>{fmt(resultado.ipcaPessoal)}%</p>
        </div>
        <div className="card">
          <p className="section-label">IPCA oficial</p>
          <p className="stat-value" style={{ color: 'var(--c-text-muted)' }}>{fmt(resultado.ipcaOficial)}%</p>
        </div>
      </div>

      {/* Delta */}
      <div className="card" style={{ marginBottom: '1.75rem', borderLeft: `3px solid ${corDelta}` }}>
        <p className="section-label">Diferença ({periodLabel})</p>
        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: corDelta, fontVariantNumeric: 'tabular-nums', marginBottom: '0.25rem' }}>
          {sinal(resultado.diferencaPP)}{fmt(resultado.diferencaPP)} p.p.
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', lineHeight: 1.5 }}>
          Você está sendo afetado{' '}
          <strong style={{ color: corDelta }}>
            {resultado.diferencaPercentual !== null
              ? `${Math.abs(resultado.diferencaPercentual).toFixed(1)}% `
              : ''}
            {textoDelta}
          </strong>{' '}
          que a média nacional.
        </p>
      </div>

      {resultado.categoriasIgnoradas.length > 0 && (
        <div role="alert" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 'var(--r)', padding: '0.875rem', marginBottom: '1.75rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--c-warning)' }}>
            Dado indisponível para {resultado.categoriasIgnoradas.length} categoria(s). Resultado calculado com os demais grupos.
          </p>
        </div>
      )}

      {/* Gráfico: onde está a diferença */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1.125rem' }}>
          O que explica a diferença?
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', marginBottom: '1.125rem', lineHeight: 1.6 }}>
          Contribuição de cada categoria para a diferença entre sua inflação e o IPCA oficial, em pontos percentuais.
        </p>
        <DeltaChart contribuicoes={contribuicoes} />
      </div>

      {/* Gráfico: comparação de pesos */}
      <div className="card">
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1.125rem' }}>
          Seu perfil vs. média nacional (pesos)
        </h2>
        <PesoChart contribuicoes={contribuicoes} />
      </div>

      <p style={{ color: 'var(--c-text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem', lineHeight: 1.6 }}>
        Cálculo baseado nas variações oficiais do IBGE — Tabela SIDRA 7060.<br />
        Os pesos são reponderados com seu perfil; as variações de preço são as mesmas para todos.
      </p>
    </div>
  )
}

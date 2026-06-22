import { useState, useEffect, useRef } from 'react'
import type { DadosIPCA, AlocacaoUsuario, CampoVariacao } from './types/ipca'
import Onboarding from './components/Onboarding'
import Results from './components/Results'

type Tela = 'onboarding' | 'resultado'

export default function App() {
  const [dados, setDados] = useState<DadosIPCA | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [tela, setTela] = useState<Tela>('onboarding')
  const [alocacoes, setAlocacoes] = useState<AlocacaoUsuario[]>([])
  const [campo, setCampo] = useState<CampoVariacao>('variacaoMensal')
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetch('/ipca-data.json')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<DadosIPCA> })
      .then((d) => {
        setDados(d)
        // Começa tudo em zero
        setAlocacoes(d.categorias.map((c) => ({ categoriaId: c.id, percentual: 0 })))
        setCarregando(false)
      })
      .catch(() => { setErro('Não foi possível carregar os dados do IPCA. Tente novamente.'); setCarregando(false) })
  }, [])

  function navegar(destino: Tela) {
    setTela(destino)
    setTimeout(() => mainRef.current?.focus(), 50)
  }

  if (carregando) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
      <p style={{ color: 'var(--c-text-muted)' }}>Carregando dados do IPCA…</p>
    </div>
  )

  if (erro || !dados) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', padding: '1.5rem' }}>
      <p role="alert" style={{ color: 'var(--c-danger)', textAlign: 'center', maxWidth: '28rem' }}>{erro}</p>
    </div>
  )

  return (
    <main ref={mainRef} tabIndex={-1}
      style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.75rem 1rem 3rem', width: '100%' }}>
      <div className="page-enter" key={tela}>
        {tela === 'onboarding'
          ? <Onboarding
              categorias={dados.categorias}
              alocacoes={alocacoes}
              onAlocacoesChange={setAlocacoes}
              onCalcular={() => navegar('resultado')}
              periodoReferencia={dados.periodoReferencia}
            />
          : <Results
              dados={dados}
              alocacoes={alocacoes}
              campo={campo}
              onCampoChange={setCampo}
              onVoltar={() => navegar('onboarding')}
            />
        }
      </div>
    </main>
  )
}

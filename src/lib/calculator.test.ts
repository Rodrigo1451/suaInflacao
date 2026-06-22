import { describe, it, expect } from 'vitest'
import { calcularComparacao, somaAlocacoes } from './calculator'
import type { CategoriaIPCA, AlocacaoUsuario } from '../types/ipca'

const dadosMock: CategoriaIPCA[] = [
  {
    id: '7170',
    nome: 'Alimentação e bebidas',
    variacaoMensal: 1.0,
    variacaoAcumuladaAno: 3.0,
    variacaoAcumulada12m: 6.0,
    pesoOficial: 25.0,
  },
  {
    id: '7625',
    nome: 'Transportes',
    variacaoMensal: 2.0,
    variacaoAcumuladaAno: 5.0,
    variacaoAcumulada12m: 8.0,
    pesoOficial: 20.0,
  },
  {
    id: '7445',
    nome: 'Habitação',
    variacaoMensal: 0.5,
    variacaoAcumuladaAno: 2.0,
    variacaoAcumulada12m: 4.0,
    pesoOficial: 55.0,
  },
]

describe('calcularComparacao', () => {
  it('reproduz o IPCA oficial quando o usuário usa os pesos oficiais', () => {
    const alocacoes: AlocacaoUsuario[] = [
      { categoriaId: '7170', percentual: 25.0 },
      { categoriaId: '7625', percentual: 20.0 },
      { categoriaId: '7445', percentual: 55.0 },
    ]
    const resultado = calcularComparacao(alocacoes, dadosMock, 'variacaoMensal')
    expect(resultado.ipcaPessoal).toBeCloseTo(resultado.ipcaOficial, 10)
    expect(resultado.diferencaPP).toBeCloseTo(0, 10)
  })

  it('calcula corretamente quando usuário tem mais peso em categoria cara', () => {
    // Transportes variou 2% (acima da média); usuário aloca 80% lá
    const alocacoes: AlocacaoUsuario[] = [
      { categoriaId: '7170', percentual: 10.0 },
      { categoriaId: '7625', percentual: 80.0 },
      { categoriaId: '7445', percentual: 10.0 },
    ]
    const resultado = calcularComparacao(alocacoes, dadosMock, 'variacaoMensal')
    // IPCA pessoal = (10/100)*1 + (80/100)*2 + (10/100)*0.5 = 0.1 + 1.6 + 0.05 = 1.75
    expect(resultado.ipcaPessoal).toBeCloseTo(1.75, 5)
    // Deve ser maior que o oficial
    expect(resultado.ipcaPessoal).toBeGreaterThan(resultado.ipcaOficial)
    expect(resultado.diferencaPP).toBeGreaterThan(0)
  })

  it('normaliza corretamente quando categoria nao tem dado (ignora e reduz soma)', () => {
    const alocacoes: AlocacaoUsuario[] = [
      { categoriaId: '7170', percentual: 60.0 },
      { categoriaId: '9999', percentual: 40.0 }, // ID inexistente
    ]
    const resultado = calcularComparacao(alocacoes, dadosMock, 'variacaoMensal')
    // Categoria 9999 ignorada; apenas 7170 contribui: (60/100)*1.0 = 0.6
    expect(resultado.ipcaPessoal).toBeCloseTo(0.6, 5)
    expect(resultado.categoriasIgnoradas).toContain('9999')
  })

  it('retorna diferencaPercentual null quando IPCA oficial e zero', () => {
    const dadosComZero: CategoriaIPCA[] = [
      { ...dadosMock[0], variacaoMensal: 0, pesoOficial: 100 },
    ]
    const alocacoes: AlocacaoUsuario[] = [{ categoriaId: '7170', percentual: 100 }]
    const resultado = calcularComparacao(alocacoes, dadosComZero, 'variacaoMensal')
    expect(resultado.ipcaOficial).toBeCloseTo(0, 10)
    expect(resultado.diferencaPercentual).toBeNull()
  })

  it('aceita alocacao zero sem erros', () => {
    const alocacoes: AlocacaoUsuario[] = [
      { categoriaId: '7170', percentual: 0 },
      { categoriaId: '7625', percentual: 100 },
      { categoriaId: '7445', percentual: 0 },
    ]
    const resultado = calcularComparacao(alocacoes, dadosMock, 'variacaoMensal')
    // Apenas transportes com 100%: (100/100)*2.0 = 2.0
    expect(resultado.ipcaPessoal).toBeCloseTo(2.0, 5)
  })
})

describe('somaAlocacoes', () => {
  it('soma corretamente alocacoes que totalizam 100', () => {
    const alocacoes: AlocacaoUsuario[] = [
      { categoriaId: '7170', percentual: 30 },
      { categoriaId: '7625', percentual: 40 },
      { categoriaId: '7445', percentual: 30 },
    ]
    expect(somaAlocacoes(alocacoes)).toBe(100)
  })

  it('detecta soma diferente de 100', () => {
    const alocacoes: AlocacaoUsuario[] = [
      { categoriaId: '7170', percentual: 30 },
      { categoriaId: '7625', percentual: 40 },
    ]
    expect(somaAlocacoes(alocacoes)).toBe(70)
    expect(somaAlocacoes(alocacoes)).not.toBe(100)
  })
})

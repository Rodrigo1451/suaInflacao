import type {
  AlocacaoUsuario,
  CategoriaIPCA,
  CampoVariacao,
  ResultadoCalculo,
  ContribuicaoCategoria,
} from '../types/ipca'

function calcularIndicePonderado(
  pesos: Map<string, number>,
  dados: CategoriaIPCA[],
  campo: CampoVariacao,
): { valor: number; somaPesosUsados: number; categoriasIgnoradas: string[] } {
  let acumulado = 0
  let somaPesosUsados = 0
  const categoriasIgnoradas: string[] = []

  for (const dado of dados) {
    const peso = pesos.get(dado.id)
    if (peso === undefined) continue
    acumulado += (peso / 100) * dado[campo]
    somaPesosUsados += peso
  }

  for (const categoriaId of pesos.keys()) {
    if (!dados.some((d) => d.id === categoriaId)) {
      categoriasIgnoradas.push(categoriaId)
    }
  }

  return { valor: acumulado, somaPesosUsados, categoriasIgnoradas }
}

export function calcularComparacao(
  alocacoesUsuario: AlocacaoUsuario[],
  dados: CategoriaIPCA[],
  campo: CampoVariacao,
): ResultadoCalculo {
  const pesosUsuario = new Map(alocacoesUsuario.map((a) => [a.categoriaId, a.percentual]))
  const pesosOficiais = new Map(dados.map((d) => [d.id, d.pesoOficial]))

  const pessoal = calcularIndicePonderado(pesosUsuario, dados, campo)
  const oficial = calcularIndicePonderado(pesosOficiais, dados, campo)

  return {
    ipcaPessoal: pessoal.valor,
    ipcaOficial: oficial.valor,
    diferencaPP: pessoal.valor - oficial.valor,
    diferencaPercentual:
      oficial.valor !== 0 ? (pessoal.valor / oficial.valor - 1) * 100 : null,
    categoriasIgnoradas: pessoal.categoriasIgnoradas,
    somaPesosUsuario: pessoal.somaPesosUsados,
  }
}

export function calcularContribuicoes(
  alocacoesUsuario: AlocacaoUsuario[],
  dados: CategoriaIPCA[],
  campo: CampoVariacao,
): ContribuicaoCategoria[] {
  const pesosUsuario = new Map(alocacoesUsuario.map((a) => [a.categoriaId, a.percentual]))

  return dados.map((d) => {
    const pesoUsuario = pesosUsuario.get(d.id) ?? 0
    const variacao = d[campo]
    const contribuicaoPessoal = (pesoUsuario / 100) * variacao
    const contribuicaoOficial = (d.pesoOficial / 100) * variacao

    return {
      categoriaId: d.id,
      nome: d.nome,
      pesoUsuario,
      pesoOficial: d.pesoOficial,
      variacao,
      contribuicaoPessoal,
      contribuicaoOficial,
      delta: contribuicaoPessoal - contribuicaoOficial,
    }
  })
}

export function somaAlocacoes(alocacoes: AlocacaoUsuario[]): number {
  return alocacoes.reduce((acc, a) => acc + a.percentual, 0)
}

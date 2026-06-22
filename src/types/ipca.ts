export interface CategoriaIPCA {
  id: string
  nome: string
  variacaoMensal: number
  variacaoAcumuladaAno: number
  variacaoAcumulada12m: number
  pesoOficial: number
}

export interface DadosIPCA {
  periodoReferencia: string
  atualizadoEm: string
  categorias: CategoriaIPCA[]
}

export interface AlocacaoUsuario {
  categoriaId: string
  percentual: number
}

export type CampoVariacao = 'variacaoMensal' | 'variacaoAcumulada12m'

export interface ResultadoCalculo {
  ipcaPessoal: number
  ipcaOficial: number
  diferencaPP: number
  diferencaPercentual: number | null
  categoriasIgnoradas: string[]
  somaPesosUsuario: number
}

export interface ContribuicaoCategoria {
  categoriaId: string
  nome: string
  pesoUsuario: number
  pesoOficial: number
  variacao: number
  contribuicaoPessoal: number
  contribuicaoOficial: number
  delta: number
}

// scripts/sync-ipca.js
// Script de sincronizacao mensal: chama a API v3 do IBGE e gera public/ipca-data.json
// Codigos confirmados via chamada real a API (Fase 0 do plano)

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Codigos confirmados via API em 2026-06 — nao hardcoded sem verificacao
const AGREGADO = '7060'
const VAR_MENSAL = '63'
const VAR_ACUMULADA_ANO = '69'
const VAR_ACUMULADA_12M = '2265'
const VAR_PESO = '66'
const CLASSIFICACAO = '315'

// Codigos dos 9 grupos (+ indice geral) confirmados via API
const CODIGOS_GRUPOS = ['7170', '7445', '7486', '7558', '7625', '7660', '7712', '7766', '7786']

const BASE_URL = 'https://servicodados.ibge.gov.br/api/v3/agregados'

function limparNome(nome) {
  return nome.replace(/^\d+\./, '').trim()
}

function parsePeriodo(periodoStr) {
  const ano = periodoStr.slice(0, 4)
  const mes = periodoStr.slice(4, 6)
  return `${ano}-${mes}`
}

async function fetchDadosIPCA() {
  const variaveis = [VAR_MENSAL, VAR_ACUMULADA_ANO, VAR_ACUMULADA_12M, VAR_PESO].join('|')
  const classificacaoParam = `${CLASSIFICACAO}[${CODIGOS_GRUPOS.join(',')}]`
  const url = `${BASE_URL}/${AGREGADO}/periodos/-1/variaveis/${variaveis}?localidades=N1[all]&classificacao=${classificacaoParam}`

  console.log(`Buscando dados: ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`IBGE API retornou HTTP ${res.status}: ${await res.text()}`)
  }

  const payload = await res.json()

  // O payload e um array de objetos, um por variavel
  // Estrutura: [{id, variavel, resultados: [{classificacoes: [{categoria: {codigo: nome}}], series: [{localidade, serie: {YYYYMM: valor}}]}]}]
  const mapaVariaveis = {}
  for (const entrada of payload) {
    for (const resultado of entrada.resultados) {
      const categoriaObj = resultado.classificacoes[0]?.categoria ?? {}
      const codigoCategoria = Object.keys(categoriaObj)[0]
      if (!codigoCategoria) continue

      const serie = resultado.series[0]?.serie ?? {}
      const periodo = Object.keys(serie)[0]
      const valor = serie[periodo]
      const nome = categoriaObj[codigoCategoria]

      if (!mapaVariaveis[codigoCategoria]) {
        mapaVariaveis[codigoCategoria] = { id: codigoCategoria, nome, periodo }
      }
      const varId = entrada.id
      mapaVariaveis[codigoCategoria][varId] = valor !== null && valor !== '' ? parseFloat(valor) : null
    }
  }

  return mapaVariaveis
}

async function main() {
  try {
    const dados = await fetchDadosIPCA()

    const categorias = CODIGOS_GRUPOS.map((codigo) => {
      const d = dados[codigo]
      if (!d) {
        throw new Error(`Codigo ${codigo} nao encontrado na resposta da API. Verifique se os codigos ainda sao validos.`)
      }
      return {
        id: d.id,
        nome: limparNome(d.nome),
        variacaoMensal: d[VAR_MENSAL],
        variacaoAcumuladaAno: d[VAR_ACUMULADA_ANO],
        variacaoAcumulada12m: d[VAR_ACUMULADA_12M],
        pesoOficial: d[VAR_PESO],
      }
    })

    // Usa o periodo da primeira categoria como referencia
    const periodo = Object.values(dados)[0]?.periodo
    if (!periodo) throw new Error('Nao foi possivel determinar o periodo dos dados')

    const saida = {
      periodoReferencia: parsePeriodo(periodo),
      atualizadoEm: new Date().toISOString(),
      categorias,
    }

    const caminho = join(__dirname, '..', 'public', 'ipca-data.json')
    writeFileSync(caminho, JSON.stringify(saida, null, 2), 'utf-8')
    console.log(`Dados salvos em ${caminho}`)
    console.log(`Periodo: ${saida.periodoReferencia}`)
    console.log(`Categorias: ${categorias.length}`)
    categorias.forEach((c) => {
      console.log(`  ${c.nome}: mensal=${c.variacaoMensal}%, peso=${c.pesoOficial}%`)
    })
  } catch (err) {
    console.error('ERRO na sincronizacao:', err.message)
    process.exit(1)
  }
}

main()

# Sua Inflação

**Calculadora de inflação pessoal baseada nos dados oficiais do IPCA/IBGE.**

O IPCA oficial mede a inflação média de uma cesta de consumo definida pelo IBGE. Mas cada família gasta de forma diferente — quem gasta mais com alimentação sente mais quando os preços dos alimentos sobem. Esta ferramenta personaliza o cálculo usando o perfil de gastos do próprio usuário.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Fonte IBGE](https://img.shields.io/badge/Dados-IBGE%20SIDRA-009C3B)

---

## Como funciona

1. **Informe seus gastos** — distribua sua renda (em R$ ou %) pelos 9 grupos do IPCA: alimentação, habitação, transportes, saúde, etc.
2. **Calcule** — o app compara sua inflação pessoal com o IPCA oficial do mesmo período.
3. **Entenda a diferença** — veja quais categorias amplificam ou atenuam a sua inflação em relação à média nacional.

Tudo roda no navegador. Nenhum dado é enviado a nenhum servidor.

---

## Metodologia

### O que é o IPCA

O Índice Nacional de Preços ao Consumidor Amplo (IPCA) é calculado mensalmente pelo IBGE e mede a variação de preços para famílias com renda de 1 a 40 salários mínimos em regiões metropolitanas. Ele é o índice oficial de inflação do Brasil e a meta perseguida pelo Banco Central.

O IPCA é dividido em **9 grupos de consumo**, cada um com um **peso oficial** que representa a participação média daquele grupo no orçamento das famílias pesquisadas:

| Grupo | Peso oficial (ref. mai/2025) |
|---|---|
| Alimentação e bebidas | ~21,6% |
| Habitação | ~15,2% |
| Transportes | ~20,5% |
| Saúde e cuidados pessoais | ~13,7% |
| Despesas pessoais | ~10,2% |
| Educação | ~6,2% |
| Artigos de residência | ~3,5% |
| Vestuário | ~4,6% |
| Comunicação | ~4,5% |

> Os pesos são revisados periodicamente pelo IBGE com base na Pesquisa de Orçamentos Familiares (POF).

### Fórmula do IPCA pessoal

O cálculo segue a mesma lógica do índice oficial — uma **média ponderada das variações de preço de cada grupo** — mas substituindo os pesos do IBGE pelos pesos informados pelo usuário:

$$\text{IPCA pessoal} = \sum_{i=1}^{9} \frac{w_i^{\text{usuário}}}{100} \times v_i$$

Onde:
- $w_i^{\text{usuário}}$ = percentual que o usuário destina ao grupo $i$ (deve somar 100%)
- $v_i$ = variação de preço oficial do IBGE para o grupo $i$ no período selecionado (%)

O **IPCA oficial** é calculado da mesma forma, usando os pesos oficiais $w_i^{\text{IBGE}}$:

$$\text{IPCA oficial} = \sum_{i=1}^{9} \frac{w_i^{\text{IBGE}}}{100} \times v_i$$

A **diferença em pontos percentuais** entre os dois é:

$$\Delta = \text{IPCA pessoal} - \text{IPCA oficial}$$

### Contribuição por categoria

Para explicar de onde vem a diferença, calculamos a contribuição individual de cada grupo:

$$\delta_i = \left(\frac{w_i^{\text{usuário}}}{100} \times v_i\right) - \left(\frac{w_i^{\text{IBGE}}}{100} \times v_i\right) = \frac{v_i}{100} \times (w_i^{\text{usuário}} - w_i^{\text{IBGE}})$$

Um $\delta_i > 0$ significa que o usuário destina mais peso a esse grupo do que a média nacional e, portanto, sentiu mais aquela variação de preço. Um $\delta_i < 0$ significa o oposto.

### Períodos disponíveis

| Período | Variável IBGE | Descrição |
|---|---|---|
| Este mês | Variação mensal (var. 63) | Variação de preços no mês de referência |
| 12 meses | Variação acumulada 12 meses (var. 2265) | Variação acumulada nos últimos 12 meses |

### Limitações e simplificações

- **Média ponderada simples**: o cálculo usa a forma direta $\sum (w_i / 100) \times v_i$. O IBGE usa uma metodologia Laspeyres encadeada com deflação de quantidades — a diferença numérica entre as duas abordagens é pequena para fins de comparação relativa, mas o resultado pode divergir levemente do índice oficial publicado.
- **9 grupos agregados**: o IPCA tem mais de 400 subitens. Este app trabalha apenas com os 9 grandes grupos, o que é suficiente para capturar as diferenças de perfil mais relevantes.
- **Pesos fixos no período**: os pesos do usuário são tratados como fixos. O IBGE os atualiza anualmente com base na POF.
- **Mesmo universo de preços**: as variações de preço ($v_i$) são as mesmas para todos — o app não personaliza a cesta de bens dentro de cada grupo.

---

## Dados

Os dados são obtidos da **API v3 do IBGE (SIDRA)**, Agregado 7060:

| Variável | Código IBGE | Descrição |
|---|---|---|
| Variação mensal | 63 | Var. % no mês |
| Variação acumulada no ano | 69 | Var. % acumulada no ano |
| Variação acumulada 12 meses | 2265 | Var. % acumulada 12 meses |
| Peso | 66 | Peso do grupo no período |

Os 9 grupos correspondem aos seguintes códigos da classificação 315 do IBGE:
`7170, 7445, 7486, 7558, 7625, 7660, 7712, 7766, 7786`

Os dados são sincronizados mensalmente via `scripts/sync-ipca.js` e ficam em `public/ipca-data.json`, servido estaticamente junto com o app.

---

## Rodando localmente

**Requisitos:** Node.js 18+

```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev

# Rodar os testes
npm test

# Build de produção
npm run build
```

### Sincronizar os dados do IPCA

Para atualizar `public/ipca-data.json` com os dados mais recentes do IBGE:

```bash
npm run sync
```

O script busca automaticamente o último período disponível na API do IBGE. Se algum campo crítico (peso ou variação) vier nulo — o que pode ocorrer em janelas de manutenção da API — o script falha com mensagem clara em vez de salvar dados inválidos.

---

## Estrutura do projeto

```
src/
├── components/
│   ├── Onboarding.tsx   # Tela de entrada do perfil de gastos
│   └── Results.tsx      # Tela de resultado e comparação
├── lib/
│   └── calculator.ts    # Lógica de cálculo do IPCA pessoal
├── types/
│   └── ipca.ts          # Tipos TypeScript
├── App.tsx              # Roteamento entre telas e estado global
└── index.css            # Design system (tokens, componentes)

scripts/
└── sync-ipca.js         # Sincronização mensal com a API do IBGE

public/
└── ipca-data.json       # Dados estáticos do último período sincronizado
```

---

## Stack

- **React 19** + **TypeScript 5** — interface e tipagem
- **Vite 8** — build e dev server
- **Vitest** — testes unitários do calculador
- **Inter** (Google Fonts) — tipografia
- Sem dependências de UI externas — CSS puro com design system próprio

---

## Licença

ISC

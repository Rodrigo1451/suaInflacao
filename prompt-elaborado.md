# Plano de Implementação — Calculadora de Inflação Pessoal (IPCA)

> Documento de planejamento técnico para ser lido por um agente de codificação (Claude Code). Cobre conceito, fonte de dados do IBGE, lógica de cálculo, arquitetura e roadmap. Pontos marcados com ⚠️ precisam de verificação ativa contra a documentação oficial do IBGE antes de serem codificados como constantes fixas no sistema — eles não devem ser tratados como 100% definitivos só porque estão escritos aqui.

---

## 0. Notas sobre a confiabilidade dos dados deste documento

Antes de mais nada, uma transparência sobre o que está por trás de cada afirmação técnica abaixo:

- **Confirmado em múltiplas fontes independentes** (páginas oficiais do IBGE, documentação técnica da API, Banco Central, FGV/IBRE): estrutura hierárquica do IPCA, existência e número da Tabela SIDRA 7060, existência das duas APIs (legada e v3), base de pesos vigente (POF 2017‑2018), calendário de divulgação, lista dos 9 grupos.
- **Confirmado em uma fonte secundária confiável, mas não na documentação primária diretamente**: número exato de subitens (377, segundo blog técnico do FGV/IBRE), códigos numéricos específicos de classificação (vistos em exemplos de terceiros, não capturados por mim diretamente de uma chamada à API).
- **Não verificado por mim e que precisa ser confirmado pelo Claude Code antes de implementar**: mapeamento exato código→nome de cada grupo/subgrupo/item/subitem, formato exato do JSON retornado pela API v3 (descrevo a estrutura geral, mas não capturei uma resposta real), nomes exatos de variáveis adicionais.

Sempre que algo abaixo estiver marcado com ⚠️, o primeiro passo de implementação deve ser uma chamada real à API para confirmar o dado antes de hardcodá-lo.

---

## 1. Conceito do produto

### 1.1 O problema

O IPCA mede a variação de preços de uma **cesta média nacional**, ponderada pelos hábitos de consumo médios das famílias brasileiras (apurados pela Pesquisa de Orçamentos Familiares — POF). Mas a composição de gastos de uma pessoa real quase nunca é a média nacional: alguém que gasta uma fração grande da renda com transporte por aplicativo e pouco com alimentação no domicílio sente uma inflação diferente de alguém com o perfil inverso, mesmo que ambos estejam sujeitos exatamente às mesmas variações de preço por item.

### 1.2 A ideia central

O IPCA já é, em si, uma média ponderada das variações de preço de cada categoria, usando como peso a participação dessa categoria no orçamento médio das famílias (fórmula de Laspeyres modificado). A calculadora replica exatamente esse cálculo, mas troca o peso médio nacional pelo peso que o próprio usuário declarar para sua renda:

```
IPCA oficial   = Σ (peso_IBGE_categoria   × variação_de_preço_categoria)
IPCA pessoal   = Σ (peso_usuário_categoria × variação_de_preço_categoria)
```

As **variações de preço por categoria** são sempre as mesmas (números oficiais do IBGE — ninguém escolhe isso). O que muda é só o peso. Isso é importante de deixar explícito na interface: o produto não está inventando uma inflação alternativa, está reponderando os mesmos dados oficiais com o perfil de consumo do usuário.

### 1.3 O que o usuário recebe como resultado

- A inflação "pessoal" do usuário (no mês e/ou acumulada em 12 meses).
- O IPCA oficial no mesmo período.
- A diferença em pontos percentuais (p.p.) e em termos relativos ("você está sendo afetado X% mais/menos que a média nacional").
- Idealmente, quais categorias mais contribuíram para essa diferença (ex.: "seu maior desvio vem de Transportes, que pesa mais no seu orçamento do que na média nacional e subiu acima da média").

---

## 2. Estrutura de dados do IPCA (a fonte de verdade)

### 2.1 Hierarquia

O IBGE organiza o IPCA em 4 níveis de agregação, do mais geral ao mais granular:

```
Índice Geral
 └─ Grupo            (9 grupos)
     └─ Subgrupo
         └─ Item
             └─ Subitem   (nível mais desagregado — é aqui que os pesos "nascem")
```

Os pesos de qualquer nível superior (item, subgrupo, grupo) são apenas a soma dos pesos dos subitens que ele contém. Isso é confirmado na metodologia oficial do IBGE.

### 2.2 Os 9 grupos atuais

1. Alimentação e Bebidas
2. Habitação
3. Artigos de Residência
4. Vestuário
5. Transportes
6. Saúde e Cuidados Pessoais
7. Despesas Pessoais
8. Educação
9. Comunicação

Essa lista foi cruzada em várias fontes (IBGE, Banco Central, agregadores de notícia) e está estável há anos — é seguro tratá-la como praticamente fixa para o MVP. ⚠️ Ainda assim, o nome exato e a grafia oficial (maiúsculas, acentuação) devem ser confirmados na resposta real da API, não digitados de memória.

### 2.3 Quantos subitens existem

Uma fonte técnica do FGV/IBRE (não o IBGE diretamente) cita **377 subitens** na estrutura atual do IPCA. Não tenho uma fonte primária do IBGE confirmando esse número exato no momento em que escrevo isto, então trate como "aproximadamente 377" e deixe o sistema descobrir a contagem real dinamicamente (consultando a API), em vez de hardcodar esse número em qualquer lugar do código.

### 2.4 Base de ponderação vigente — e um risco real de mudança

A estrutura de pesos atual é derivada da **Pesquisa de Orçamentos Familiares (POF) 2017‑2018**, em vigor desde os resultados de **janeiro de 2020**, substituindo a base anterior (POF 2008‑2009, que vigorou de 2012 a 2019).

⚠️ **Isto é importante para o roadmap do produto**: a POF 2024/2025 já está em campo, com primeiros resultados esperados para meados de 2026, e há expectativa (de fonte do FGV/IBRE, não confirmação oficial do IBGE) de que a **nova estrutura de pesos do IPCA entre em vigor a partir de janeiro de 2027**. Isso significa que, em algum momento entre o fim de 2026 e início de 2027, os códigos de classificação, os nomes de subitens e os pesos-base podem mudar. O sistema **não deve hardcodar** códigos de categoria como constantes estáticas no frontend — eles devem ser buscados dinamicamente da API e cacheados com possibilidade de invalidação, exatamente para sobreviver a essa transição sem precisar de deploy manual.

### 2.5 Quem é coberto pelo IPCA (population alvo)

Famílias com rendimento mensal de 1 a 40 salários mínimos, residentes nas regiões metropolitanas de Belém, Fortaleza, Recife, Salvador, Belo Horizonte, Vitória, Rio de Janeiro, São Paulo, Curitiba, Porto Alegre, além do Distrito Federal e dos municípios de Goiânia, Campo Grande, Rio Branco, São Luís e Aracaju. Vale ter essa informação disponível como tooltip/FAQ no produto, porque alguém fora dessas regiões ou faixa de renda pode estranhar a comparação.

### 2.6 Coleta e divulgação

- Coleta de preços: aproximadamente 430 mil preços em 30 mil locais, do dia 1 ao dia 30 do mês de referência.
- Divulgação: entre os dias 8 e 11 do mês seguinte ao de referência (datas variam, há um calendário oficial divulgado pelo IBGE).
- Isso define a cadência natural de atualização do seu sistema: **uma sincronização mensal é suficiente**, idealmente agendada para o dia 12 (margem de segurança) de cada mês.

---

## 3. Fonte de dados: API do IBGE

### 3.1 A tabela certa: SIDRA 7060

A tabela que contém exatamente o que você precisa — variação mensal, acumulada no ano, acumulada em 12 meses **e peso mensal**, para índice geral, grupos, subgrupos, itens e subitens, com dados a partir de janeiro/2020 (POF 2017‑2018) — é a **Tabela 7060** do SIDRA/IBGE.

URL de referência (página humana, não API): `https://sidra.ibge.gov.br/tabela/7060`

### 3.2 Duas portas de entrada diferentes para os mesmos dados

O IBGE expõe os mesmos dados por dois caminhos:

| | API legada (SIDRA) | API de Agregados v3 |
|---|---|---|
| Base | `https://apisidra.ibge.gov.br/values/...` | `https://servicodados.ibge.gov.br/api/v3/agregados/...` |
| Limite por requisição | ~20.000 valores | ~100.000 valores |
| Metadados | scraping de página HTML | endpoints JSON dedicados (`/metadados`, `/periodos`, `/localidades/{nivel}`) |
| Formato de resposta | array onde a primeira posição é um "cabeçalho" textual, dados começam no índice 1 | JSON estruturado por agregado/variável |

**Recomendação**: use a **API v3** (`servicodados.ibge.gov.br/api/v3/agregados`). É a versão "padronizada" mais nova, tem metadados navegáveis via JSON (importante para descobrir os códigos certos sem depender de scraping) e tem limite de linhas maior. ⚠️ Não tenho uma captura real de uma resposta dela — antes de escrever o parser definitivo, faça uma chamada de teste manual e confirme a forma exata do JSON.

### 3.3 Parâmetros relevantes (API legada, só como referência de conceito — os nomes de parâmetro tendem a ser análogos na v3)

```
t   = código da tabela           → 7060
n1  = nível territorial nacional → all (ou um código específico de localidade)
v   = variáveis desejadas        → variação mensal e peso mensal
p   = período                    → all, ou um período específico (ex.: 202606)
c315 = classificação 315, que é a hierarquia de produtos/serviços do IPCA;
       dentro dela, cada grupo/subgrupo/item/subitem tem um código numérico próprio
```

### 3.4 Variáveis (⚠️ confirmar antes de usar)

Em exemplos de uso real da tabela 7060 encontrados em material técnico de terceiros, a variável **63** corresponde a "variação mensal (%)" e a variável **66** corresponde a "peso mensal (%)". Isso é consistente em mais de uma fonte que encontrei, mas eu não fiz a chamada eu mesmo à API para confirmar — o primeiro passo de implementação deve ser uma chamada ao endpoint de metadados/variáveis do agregado 7060 para validar esses números e descobrir os códigos das variáveis "acumulada no ano" e "acumulada em 12 meses" (que certamente existem, dado o nome da tabela, mas cujo código numérico exato eu não confirmei).

### 3.5 Classificação 315 — descubra os códigos, não adivinhe

A classificação 315 é a hierarquia de produtos/serviços. Em um exemplo real de terceiro, os 9 grupos apareceram com os códigos `7170, 7445, 7486, 7558, 7625, 7660, 7712, 7766, 7786`, e o código `7169` parece representar o "Índice geral" (a cesta completa, sem quebra por grupo).

⚠️ **Eu não tenho confirmação de qual código corresponde a qual grupo nomeado** (ex.: não sei dizer com certeza se `7170` é "Alimentação e Bebidas" ou outro grupo). Isso **precisa** ser resolvido programaticamente, chamando o endpoint de metadados/classificações do agregado 7060, que retorna o nome de cada categoria junto com seu código. Trate esse mapeamento código→nome como dado a ser buscado e cacheado a partir da própria API, nunca como uma tabela fixa escrita à mão no código-fonte.

### 3.6 Exemplo de chamada (ilustrativo — os códigos de classificação precisam ser confirmados antes do uso real)

```
GET https://servicodados.ibge.gov.br/api/v3/agregados/7060/periodos/-1/variaveis/63|66
    ?localidades=N1[all]
    &classificacao=315[7170,7445,7486,7558,7625,7660,7712,7766,7786]
```

Isso busca, para o último período disponível, a variação mensal (63) e o peso mensal (66) dos 9 grupos a nível nacional (N1). Repito: confirme os códigos antes de embutir essa URL no sistema.

### 3.7 Um número de exemplo real para dar escala (não use como constante!)

Em uma reportagem com dados de abril/2026, dois dos nove grupos apareciam com os seguintes pesos no orçamento médio do consumidor brasileiro: Transportes ≈ 20,61% e Alimentação e Bebidas ≈ 21,45% (restando ≈ 57,94% para os outros sete grupos somados). Esse número é **aproximado**, vem de uma fonte secundária (não a tabela SIDRA diretamente) e — mais importante — **muda todo mês**, porque o "peso mensal" da Tabela 7060 é recalculado a cada divulgação (ele reflete a estrutura de gastos da POF reponderada pelas variações de preço relativas acumuladas desde a base). Ou seja: nunca hardcode pesos de grupo no seu sistema — eles sempre devem vir da API, do mês mais recente disponível.

---

## 4. Granularidade do produto (decisão de design)

**Suposição assumida** (ajuste se quiser outra coisa): para o MVP, peça ao usuário a alocação percentual da renda apenas nos **9 grupos**, não nos ~377 subitens. Pedir 377 percentuais de uma pessoa comum é impraticável e a maior parte do valor analítico já aparece no nível de grupo.

- **MVP**: usuário distribui 100% da renda entre os 9 grupos (sliders ou inputs numéricos).
- **Modo avançado (Fase 4 do roadmap, seção 9)**: para o(s) grupo(s) que o usuário quiser detalhar (ex.: "Transportes"), permitir quebrar esse grupo em subgrupos/itens (ex.: combustível vs. transporte por aplicativo vs. financiamento de veículo), redistribuindo o percentual daquele grupo entre as subcategorias escolhidas.

Essa decisão também simplifica a parte de dados: no nível de grupo, são só ~9 categorias e 9 séries de peso/variação para sincronizar todo mês — muito mais barato do que lidar com 377 séries desde o primeiro release.

---

## 5. Lógica de cálculo

### 5.1 Fórmulas

Para um período de referência (mês, ou acumulado em 12 meses):

```
IPCA_pessoal = Σ_i ( peso_usuário_i / 100 ) × variação_categoria_i
IPCA_oficial = Σ_i ( peso_IBGE_i    / 100 ) × variação_categoria_i

diferença_pp         = IPCA_pessoal − IPCA_oficial
diferença_percentual = (IPCA_pessoal / IPCA_oficial − 1) × 100   [cuidado com IPCA_oficial perto de 0]
```

Onde `variação_categoria_i` é a mesma para os dois cálculos — vem do IBGE e não é editável pelo usuário. O que diverge é só o peso.

### 5.2 Mensal vs. acumulado em 12 meses

A Tabela 7060 já fornece, por categoria, tanto a variação mensal quanto a variação acumulada em 12 meses (ela já é o resultado de um encadeamento feito pelo próprio IBGE no nível da categoria). Isso simplifica a vida: para calcular o "IPCA pessoal acumulado em 12 meses", **não** é preciso encadear 12 valores mensais manualmente — basta aplicar a fórmula acima usando o campo "variação acumulada em 12 meses" de cada categoria, com os pesos do usuário mantidos fixos.

```
IPCA_pessoal_12m = Σ_i ( peso_usuário_i / 100 ) × variação_acumulada_12m_categoria_i
```

Isso é matematicamente válido porque a variação acumulada de 12 meses de uma categoria já é um relativo de preço daquela categoria especificamente — não depende de peso. Reponderar relativos de preço já calculados é diferente (e mais simples) de tentar recalcular um índice encadeado do zero.

### 5.3 Tratamento de soma ≠ 100%

Usuários vão errar a soma das alocações. Duas opções de design:

1. **Bloquear o cálculo** até a soma ser exatamente 100% (mais simples, mais rígido).
2. **Normalizar automaticamente**: dividir cada alocação pela soma total informada antes de calcular, e avisar visualmente que isso foi feito.

**Suposição assumida**: comece com a opção 1 (mais simples de implementar e mais transparente sobre o que está sendo calculado), com normalização automática como melhoria de UX na Fase 3 do roadmap (seção 9).

### 5.4 Categoria sem dado disponível no mês

Pode acontecer (atraso de divulgação, problema pontual do IBGE) de uma categoria não ter dado para o período pedido. Decisão recomendada: excluir essa categoria do cálculo daquele período e normalizar pelo peso restante, exibindo um aviso explícito ("dado de [categoria] indisponível para [mês]; resultado calculado com os demais grupos").

### 5.5 Pseudocódigo (TypeScript)

```typescript
interface AlocacaoUsuario {
  categoriaId: string;   // código IBGE da categoria (nível grupo, no MVP)
  percentual: number;    // 0–100
}

interface DadoIPCACategoria {
  categoriaId: string;
  nome: string;
  variacaoMensal: number;       // %
  variacaoAcumulada12m: number; // %
  pesoOficial: number;          // % — peso do IBGE para essa categoria, no período
}

type CampoVariacao = 'variacaoMensal' | 'variacaoAcumulada12m';

function calcularIndicePonderado(
  pesos: Map<string, number>,           // categoriaId -> peso (0–100)
  dados: DadoIPCACategoria[],
  campo: CampoVariacao
): { valor: number; somaPesosUsados: number; categoriasIgnoradas: string[] } {
  let acumulado = 0;
  let somaPesosUsados = 0;
  const categoriasIgnoradas: string[] = [];

  for (const dado of dados) {
    const peso = pesos.get(dado.categoriaId);
    if (peso === undefined) continue;
    acumulado += (peso / 100) * dado[campo];
    somaPesosUsados += peso;
  }

  // Detecta categorias com peso definido pelo usuário mas sem dado no IBGE
  for (const categoriaId of pesos.keys()) {
    if (!dados.some(d => d.categoriaId === categoriaId)) {
      categoriasIgnoradas.push(categoriaId);
    }
  }

  return { valor: acumulado, somaPesosUsados, categoriasIgnoradas };
}

function calcularComparacao(
  alocacoesUsuario: AlocacaoUsuario[],
  dados: DadoIPCACategoria[],
  campo: CampoVariacao
) {
  const pesosUsuario = new Map(alocacoesUsuario.map(a => [a.categoriaId, a.percentual]));
  const pesosOficiais = new Map(dados.map(d => [d.categoriaId, d.pesoOficial]));

  const pessoal = calcularIndicePonderado(pesosUsuario, dados, campo);
  const oficial = calcularIndicePonderado(pesosOficiais, dados, campo);

  return {
    ipcaPessoal: pessoal.valor,
    ipcaOficial: oficial.valor,
    diferencaPP: pessoal.valor - oficial.valor,
    diferencaPercentual: oficial.valor !== 0
      ? (pessoal.valor / oficial.valor - 1) * 100
      : null, // evita divisão por zero quando o IPCA oficial do período é 0
    avisos: pessoal.categoriasIgnoradas,
  };
}
```

Nenhuma função ou biblioteca externa foi inventada aqui — é só lógica aritmética simples em TypeScript puro. Roda direto no frontend, dado que os dados de entrada (pesos oficiais + variações) já vêm prontos do `ipca-data.json` estático (seção 6.2).

---

## 6. Arquitetura técnica

**Escopo confirmado pelo usuário**: o site é **só a calculadora**. Sem cadastro, sem login, sem perfil salvo, sem conta de usuário, e — por decisão explícita — **sem backend, sem banco de dados, sem Supabase**. O usuário abre o site, distribui a renda entre os 9 grupos, vê o resultado, e pronto. A alocação que ele digita existe só em memória (estado do React) durante a visita, e desaparece ao fechar a aba.

A única coisa que precisa ser atualizada de mês a mês são os dados do IPCA em si (variações e pesos), que vêm do IBGE. Como esse dado é público e igual para todo mundo (não é específico de cada usuário), ele não precisa de um banco — pode viver num **arquivo JSON estático**, atualizado uma vez por mês por um processo separado do runtime do site.

### 6.1 Visão geral

```
                     (1x por mês, ~dia 12 — fora do site, em CI)
IBGE (API v3) ──────────────▶ Script de sincronização (GitHub Action agendada)
                                       │
                                       ▼
                         ipca-data.json (commitado no repositório)
                                       │
                                       ▼ (push dispara redeploy automático
                                          no host estático — Vercel/Netlify/
                                          GitHub Pages, o que você já usa)
                                       │
                                       ▼
                    Site estático (React + TypeScript + Vite)
                    carrega o JSON ao abrir a página e calcula
                    tudo no navegador do usuário
```

Não existe servidor de aplicação, não existe API própria, não existe banco. O "backend" inteiro do projeto é um script que roda 1x por mês dentro de uma GitHub Action.

### 6.2 Formato do arquivo de dados (`ipca-data.json`)

Em vez de um schema de banco, o que existe é a forma desse arquivo, que fica em `public/ipca-data.json` (ou similar) e é importado/fetchado pelo frontend:

```json
{
  "periodoReferencia": "2026-05",
  "atualizadoEm": "2026-06-12T10:00:00Z",
  "categorias": [
    {
      "id": "7170",
      "nome": "Alimentação e Bebidas",
      "variacaoMensal": 1.33,
      "variacaoAcumuladaAno": 4.21,
      "variacaoAcumulada12m": 6.84,
      "pesoOficial": 21.45
    }
  ]
}
```

(Os valores numéricos acima são só ilustrativos do formato — não use como dado real. Os 9 objetos dentro de `categorias` são preenchidos pelo script de sincronização com os dados reais e atuais do IBGE a cada execução.) ⚠️ Os campos `id` (código IBGE do grupo) e os nomes ainda dependem da verificação da Fase 0 (seção 10) — o script de sincronização é quem vai descobrir e gravar os valores corretos, não algo digitado manualmente neste arquivo.

Se o IBGE descontinuar ou renomear uma categoria (risco real em torno de jan/2027, ver seção 2.4), o próprio script de sincronização reflete isso na próxima geração do JSON — não há necessidade de migração de banco nem nada parecido, é só um arquivo novo sobrescrevendo o antigo.

### 6.3 Script de sincronização mensal (a única automação do projeto)

Roda como uma **GitHub Action agendada** (`schedule` no `workflow.yml`, ex.: todo dia 12 do mês):

1. Chama a API v3 do IBGE para o agregado 7060, pedindo o período mais recente, variáveis de variação e peso, classificação 315.
2. Monta o JSON no formato da seção 6.2.
3. Sobrescreve `public/ipca-data.json` no repositório e faz commit + push automático.
4. O push dispara o redeploy automático do host estático (Vercel/Netlify/GitHub Pages — qualquer um que você for usar já faz isso por padrão ao detectar um push na branch principal). Nenhuma ação manual é necessária num mês normal.
5. Se a chamada à API falhar ou o IBGE ainda não tiver publicado o mês (calendário de divulgação varia entre os dias 8 e 11), a Action deve falhar de forma visível (notificação do GitHub) em vez de sobrescrever o JSON com dado vazio/quebrado — o site continua servindo o último JSON válido até a próxima tentativa.

Isso é literalmente a única "infraestrutura" do projeto. Não há servidor para manter no ar, não há banco para fazer backup, não há Auth para configurar.

### 6.4 Onde rodar o cálculo

100% no navegador do usuário. O React faz `fetch('/ipca-data.json')` ao carregar a página, guarda isso em estado, e a lógica de cálculo da seção 5.5 roda em cima desses dados em memória — sem nenhuma chamada de rede além desse único fetch inicial do JSON estático (que, sendo um arquivo estático servido pelo CDN do host, é praticamente instantâneo).

---

## 7. Fluxo de UX (alto nível)

1. **Onboarding**: usuário distribui 100% da renda entre os 9 grupos via sliders (ou inputs numéricos com soma exibida em tempo real, destacada em vermelho se ≠ 100%).
2. **Confirmação**: botão de calcular fica desabilitado até a soma bater 100%.
3. **Resultado**:
   - Número grande: "Sua inflação pessoal: X%" vs. "IPCA oficial: Y%".
   - Diferença destacada: "Você está sendo afetado Z p.p. (mais/menos) que a média nacional."
   - Gráfico de barras ou radar comparando, categoria a categoria, o peso do usuário vs. o peso médio nacional — isso é o que explica *por que* a diferença existe.
   - Toggle entre "este mês" e "acumulado em 12 meses".
4. **Recalcular**: usuário pode ajustar os sliders livremente e ver o resultado mudar em tempo real, sem precisar salvar nada — é uma sessão única, sem persistência.

---

## 8. Casos de borda e tratamento de erros

| Caso | Tratamento sugerido |
|---|---|
| Soma das alocações ≠ 100% | Bloquear cálculo (MVP) ou normalizar com aviso (Fase 3) |
| Categoria sem dado no mês mais recente | Excluir do cálculo, normalizar peso restante, avisar visualmente |
| IBGE fora do ar / erro de rede no job de sincronização | Manter o último dado cacheado válido, logar/alertar; nunca deixar o produto sem dado para mostrar |
| Código de categoria desaparece (mudança de classificação do IBGE, ex. em jan/2027) | O script de sincronização simplesmente não inclui mais essa categoria no próximo `ipca-data.json`; registrar isso no log da Action para revisão manual do mapeamento de categorias no frontend |
| Usuário sem nenhuma renda em uma categoria (0%) | Válido — só significa peso zero naquela categoria, sem tratamento especial |
| IPCA oficial do período igual a zero | Evitar divisão por zero ao calcular a diferença percentual relativa; usar só a diferença em p.p. nesse caso |

---

## 9. Roadmap de implementação sugerido

**Fase 0 — Descoberta (antes de codar)**
- Chamar manualmente a API v3 para o agregado 7060, confirmar: nomes exatos de variáveis (variação mensal, acumulada no ano, acumulada em 12 meses, peso mensal), códigos da classificação 315 para os 9 grupos com nome confirmado, formato exato da resposta JSON.

**Fase 1 — Sincronização de dados**
- Escrever o script de sincronização (seção 6.3) que chama a API do IBGE e gera `ipca-data.json` no formato da seção 6.2.
- Testar o script manualmente (rodando local) antes de transformar em GitHub Action agendada.
- Configurar a Action com `schedule` e confirmar que o push do JSON atualizado dispara o redeploy do host estático.

**Fase 2 — Cálculo e UI mínima**
- Implementar a lógica de cálculo (seção 5.5) com testes unitários usando dados fixos de exemplo.
- Tela de onboarding com sliders para os 9 grupos.
- Tela de resultado simples (números + diferença).

**Fase 3 — Refinamento de UX**
- Gráfico comparativo categoria a categoria.
- Toggle mensal vs. 12 meses.
- Polimento visual/responsividade (sem nenhuma persistência de dado do usuário — não há conta, não há "salvar").

**Fase 4 — Granularidade avançada (opcional)**
- Permitir detalhar grupos específicos em subgrupos/itens (exigiria expandir o `ipca-data.json` para incluir esses níveis, já que a API do IBGE também os fornece na mesma Tabela 7060).

---

## 10. Itens pendentes de verificação (checklist antes de codar de verdade)

- [ ] Confirmar, via chamada real à API v3, os códigos numéricos exatos da classificação 315 para cada um dos 9 grupos (e seus nomes oficiais como retornados pela API).
- [ ] Confirmar os códigos das variáveis de "variação acumulada no ano" e "variação acumulada em 12 meses" na tabela 7060 (só tenho confirmação razoável para variação mensal = 63 e peso mensal = 66).
- [ ] Capturar uma resposta real da API v3 para confirmar o formato exato do JSON antes de escrever o parser definitivo.
- [ ] Confirmar a data/calendário oficial de divulgação do IPCA para o mês corrente, para calibrar o agendamento do job de sincronização.
- [ ] Acompanhar, ao longo de 2026, qualquer anúncio oficial do IBGE sobre a nova estrutura de pesos (POF 2024/2025) — a expectativa de vigência a partir de janeiro/2027 vem de uma fonte secundária (FGV/IBRE), não de um comunicado oficial do IBGE que eu tenha visto diretamente.

---

## 11. Referências

- IBGE — Índice Nacional de Preços ao Consumidor Amplo (página oficial): https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-indice-nacional-de-precos-ao-consumidor-amplo.html
- SIDRA — Tabela 7060: https://sidra.ibge.gov.br/tabela/7060
- Documentação da API de Agregados do IBGE (v3): https://servicodados.ibge.gov.br/api/docs/agregados?versao=3
- Banco Central do Brasil — Nota técnica sobre atualização da estrutura de ponderação do IPCA (POF 2017‑2018): https://www.bcb.gov.br/conteudo/relatorioinflacao/EstudosEspeciais/EE069_Atualizacoes_da_estrutura_de_ponderacao_do_IPCA_e_repercussao_nas_suas_classificacoes.pdf
- Blog do IBRE/FGV — sobre estrutura de pesos e número de subitens do IPCA: https://blogdoibre.fgv.br/posts/inflacao-medida-com-pesos-atualizados-mensalmente
- FGV/IBRE — sobre cronograma da POF 2024/2025 e expectativa de nova base de ponderação em jan/2027: https://ibre.fgv.br/blog-da-conjuntura-economica/temas/o-novo-pib-e-algumas-sugestoes-para-aperfeicoar-agenda

---

*Este documento foi escrito com checagem ativa via busca na web (não só memória do modelo) para a parte factual sobre o IPCA e suas APIs, em junho de 2026. Trechos marcados com ⚠️ são exatamente os pontos onde a confiança é menor e onde uma verificação programática (chamando a API de verdade) deve substituir qualquer suposição antes da implementação final.*

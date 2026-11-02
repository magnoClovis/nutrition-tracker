# Trofia

## Documento 4 Mudanças desde 1º de setembro de 2026 para leitores não técnicos

**Data da comparação:** 01/11/2026
**Base anterior:** snapshot imutável de 01/09/2026
**Referência atual comprovável:** `origin/main` no commit `4e727679d8b556e89a590b2861acc1b7b53b8b72`
**Status do produto:** `0.11.0-beta`; sem evidência de lançamento público.

## 1. Conclusão principal

Entre os dois retratos, o Trofia ficou mais fácil de iniciar, registrar refeições, corrigir lançamentos e usar a câmera. Também recebeu reforços de segurança, testes e preparação de um ambiente separado. A mudança não transforma o aplicativo em produto aberto ao público: a distribuição Android comprovada continua interna, o staging está incompleto e etapas de segurança, lembretes, cobrança, documentação final e liberação pública continuam pendentes.

## 2. Primeiro acesso

### Antes

A pessoa entrava ou criava a conta por formulários tradicionais e completava o perfil obrigatório.

### Agora

- a abertura mostra a marca Trofia e uma espera mínima deliberada, com alternativa para movimento reduzido;
- o cadastro apresenta credenciais e sete decisões em etapas, com revisão antes de criar a conta;
- novas senhas exigem pelo menos 12 caracteres;
- na web, “Manter logado” decide se a sessão persiste; no Android, a sessão continua entre aberturas;
- perfis incompletos usam um fluxo progressivo de recuperação.

**Limite:** incidentes de reload e perfil ainda aparecem em investigação ou monitoramento; não há base para afirmar que toda causa intermitente foi eliminada.

## 3. Tema e aparência

### Antes

O aplicativo oferecia claro e escuro, mas a política histórica favorecia escuro em instalações antigas.

### Agora

Claro é o ponto de partida. Uma instalação antiga migra uma única vez e, depois disso, respeita a escolha Claro, Escuro ou Sistema. A preferência é local ao aparelho ou navegador; não viaja automaticamente com a conta.

## 4. Diário

### Antes

O Diário mostrava refeições e permitia as ações básicas de registro.

### Agora

- cada item pode abrir detalhes somente para leitura;
- quantidade e tipo de refeição podem ser editados sem criar uma identidade nova;
- um item pode ser movido para outra refeição, inclusive em data histórica;
- uma avaliação antiga é invalidada quando a composição muda;
- em telas largas há quatro cartões de resumo e uma área lateral para informações complementares.

## 5. Adicionar refeições

### Antes

As quatro formas de registro existiam, mas o acesso e a sequência eram mais fragmentados.

### Agora

O botão Adicionar explica os quatro caminhos: foto, descrição, montagem manual e refeição salva. A folha seguinte reúne refeição de destino e horário. Uma refeição recente pode ser repetida e desfeita; desfazer remove somente a cópia. Código de barras não foi incluído nesse menu.

## 6. Câmera e revisão do resultado

### Antes

O app já reconhecia uma refeição por fotografia e permitia revisar a estimativa.

### Agora

- a câmera ocupa um palco centralizado;
- o flash controla a iluminação real quando o aparelho oferece o recurso;
- a fotografia congelada permanece visível durante a análise;
- timeout, sessão expirada, indisponibilidade, resposta inválida e cota recebem mensagens diferentes;
- uma tentativa recuperável pode reutilizar a mesma fotografia;
- a revisão abre em uma folha expansível e recalcula nutrientes proporcionalmente;
- a busca manual usa a mesma apresentação do resultado.

**Limite:** a fotografia continua temporária; a análise depende de rede e não é uma avaliação clínica.

## 7. Alimentos e Despensa

### Antes

Alimentos, refeições salvas e suplementos apareciam em blocos expansíveis.

### Agora

A PR #340, mesclada em 01/11, introduziu contagens, busca permanente, segmentos Alimentos/Refeições/Suplementos/Categorias e categorias calculadas a partir dos dados reais. Itens sem categoria continuam visíveis.

**Lacuna documental:** os arquivos vivos ainda chamam essa fatia de “em andamento”. Portanto, o código está na linha principal, mas o fechamento documental não foi reconciliado no commit de referência.

## 8. Backup e histórico

Exportação e pré-visualização passaram a recusar estados incoerentes em vez de completar parcialmente. A prévia de importação reduziu leituras repetidas por data em uma medição documentada. Análises históricas reconhecem chaves antigas em português, inglês e espanhol sem reescrever os dados guardados.

## 9. Segurança percebida pela pessoa

- chamadas de inteligência artificial exigem tanto sessão válida quanto prova de que vieram do aplicativo reconhecido;
- o Android não permite backup automático dos dados do app, bloqueia tráfego sem proteção e limita arquivos compartilhados ao cache privado;
- o navegador aplica uma política mais restrita para destinos de rede;
- exclusão de conta e dados continuam com fluxo administrativo próprio.

Essas medidas foram implementadas e algumas receberam provas controladas em serviços reais. Elas não garantem ausência absoluta de falhas nem equivalem a auditoria externa concluída.

## 10. Staging, produção e lançamento

| Termo | O que existe em 01/11/2026 |
|---|---|
| Código mesclado | Funcionalidades descritas acima estão em `main`, ressalvada a divergência documental da I8-A. |
| Validação local e CI | Há matrizes unitárias, navegador legado/Vite, Worker, Functions e cutover; os gates citados nos históricos ficaram verdes em entregas específicas. |
| Produção controlada | Worker, Functions e Pages têm rollouts e provas controladas documentadas. |
| Staging | Projeto e identidades parciais existem, mas recursos, Android, CI e matriz completa não. |
| Android | Há builds de teste interno e provas em aparelho; não há prova de lançamento público. |
| Público geral | Não lançado conforme a evidência disponível. |

## 11. O que continua pendente

- concluir staging e a revisão de segurança C14;
- implementar toast seguro e lembretes locais;
- implementar planos, cobrança e direitos de acesso;
- concluir documentação operacional e o gate público;
- terminar frentes visuais de Diário, Semana, Métricas e Despensa;
- manter sob investigação incidentes de sessão/reload quando reaparecerem.

## 12. Resumo em linguagem direta

O Trofia de novembro é uma beta mais completa, coerente e protegida do que a de setembro. A experiência de cadastro, tema, Diário, Adicionar, câmera e Despensa mudou de forma visível. O projeto também separou melhor testes, segurança e staging. Ainda assim, beta, teste interno, staging parcial e produção controlada são estados diferentes de lançamento público; nenhum deles deve ser apresentado como disponibilidade geral.

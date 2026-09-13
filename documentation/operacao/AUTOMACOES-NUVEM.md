# Automações em nuvem do Trofia

As três frentes rodam no GitHub Actions, sem depender do Codex Desktop ou do computador local:

- alerta diário de PR parado: 09:00, `Europe/Madrid`;
- acompanhamento semanal de CI: domingo às 09:00, `Europe/Madrid`;
- relatório semanal: domingo às 10:00, `Europe/Madrid`;
- fechamento mensal de CI: 22:00 do último dia do mês. O workflow acorda nos dias 28–31 e o script envia apenas no último dia real.

## Configuração obrigatória

Cadastre em **Settings > Secrets and variables > Actions**:

### Secrets

- `TROFIA_GMAIL_CLIENT_ID`: client ID OAuth do projeto Google Cloud com Gmail API habilitada.
- `TROFIA_GMAIL_CLIENT_SECRET`: client secret correspondente.
- `TROFIA_GMAIL_REFRESH_TOKEN`: refresh token offline da conta `clovis.automatik@gmail.com`, autorizado com escopo de envio do Gmail.
- `TROFIA_OPENAI_API_KEY`: chave da API da OpenAI usada apenas pelo relatório semanal narrativo.

### Variable

- `TROFIA_OPENAI_MODEL`: modelo da API da OpenAI escolhido para a síntese. Se omitido, o executor usa `gpt-5-mini`.

O `GITHUB_TOKEN` é fornecido automaticamente pelo Actions. Nenhuma credencial deve ser gravada no repositório.

## Teste manual

Cada workflow aceita `workflow_dispatch` na aba Actions. O workflow de consumo de CI permite escolher `weekly` ou `monthly`; o modo mensal manual só envia se a data da execução for o último dia real do mês.

Mantenha as automações locais ativas até os três workflows em nuvem concluírem ao menos um teste manual com e-mail recebido. Depois disso, pause as versões locais para evitar duplicidade.

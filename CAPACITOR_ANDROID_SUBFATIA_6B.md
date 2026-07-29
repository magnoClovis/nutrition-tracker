# Capacitor Android — Subfatia 6B

## Escopo

Esta subfatia trata exclusivamente de:

- safe areas do Android;
- diagnóstico físico do teclado;
- retomada após segundo plano;
- regressão de links externos.

A renomeação comercial de Phrona para Trofia e a alteração do Application ID
para `com.hermegas.trofia` permanecem fora deste PR.

Também permanecem inalterados o scanner, Firebase, Open Food Facts, lógica de
domínio e configuração funcional de exportação/importação.

## Safe areas

O CSS agora expõe quatro aliases estáveis:

- `--app-safe-top`;
- `--app-safe-right`;
- `--app-safe-bottom`;
- `--app-safe-left`.

Cada alias prefere a variável `--safe-area-inset-*` fornecida pelo SystemBars
do Capacitor 8 e usa `env(safe-area-inset-*, 0px)` como fallback para
navegadores.

Os insets são aplicados seletivamente a:

- shell e conteúdo principal;
- cabeçalho sticky;
- navegação inferior fixa;
- aba Adicionar;
- rodapé e Métricas;
- tela de backup e seu cabeçalho;
- bottom sheet de Configurações;
- login e perfil obrigatório;
- diálogos de backup, privacidade, avaliação de refeição e template;
- aviso de versão e aviso visual.

Não foi adicionado padding global a `html` ou `body`. A apresentação do scanner
nativo continua usando seu CSS próprio, sem alteração.

O viewport também usa `viewport-fit=cover`, permitindo que a WebView temática
continue por baixo da barra de status enquanto os aliases acima mantêm o
conteúdo interativo abaixo do notch. Um adaptador Android injetável sincroniza
o contraste dos ícones da barra de status com o tema atual:

- tema escuro: ícones claros;
- tema claro: ícones escuros.

O adaptador observa a fonte de verdade já existente (`data-theme`) e permanece
inerte no navegador/PWA. Nenhuma dependência adicional foi instalada.

## Teclado

Nenhuma correção de teclado foi aplicada preventivamente:

- `android:windowSoftInputMode` continua ausente;
- `@capacitor/keyboard` não foi instalado;
- não existe listener global de foco nem `scrollIntoView`.

Qualquer mudança depende do resultado do teste físico descrito abaixo.

## Validação automatizada

- preflight: aprovado sem avisos;
- testes unitários: 743 aprovados;
- smoke legado: 20 aprovados e 17 autenticados ignorados por ausência das
  credenciais locais;
- smoke Vite: 20 aprovados e 17 autenticados ignorados pelo mesmo motivo;
- matriz visual de cutover: 60 de 60 aprovados. Uma divergência isolada de
  pixels em Métricas, inglês, mobile, tema escuro passou ao ser repetida
  imediatamente; os quatro casos interrompidos depois dela também passaram;
- `npx cap sync android`: quatro plugins encontrados;
- `:app:assembleDebug`: 150 tarefas executadas com sucesso usando Java 21 e
  saídas temporárias fora do OneDrive.

## APK de validação

- caminho:
  `android/app/build/outputs/apk/debug/phrona-subfatia-6b-status-bar-debug.apk`;
- tamanho: 35.557.106 bytes;
- SHA-256:
  `BC5D49C848213F11DD2596D1B8F8D9D3F2CD1FDEAB8D27D4C9FDC325098EFAF0`.

O APK ainda aparece como Phrona porque a renomeação para Trofia é uma mudança
separada.

## Roteiro físico

### Instalação

No PowerShell, a partir da raiz do repositório:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r ".\android\app\build\outputs\apk\debug\phrona-subfatia-6b-status-bar-debug.apk"
```

O primeiro comando deve mostrar o aparelho com status `device`. O segundo deve
terminar com `Success`.

Se aparecer `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, não desinstale o aplicativo:
isso apagaria seus dados locais e indica que a instalação existente usa outra
chave de debug.

### Teclado

Em retrato e depois em paisagem:

1. Login: testar e-mail, senha e recuperação de senha.
2. Cadastro: focar os últimos campos e confirmar que o botão final é
   alcançável, sem concluir um cadastro de teste.
3. Perfil obrigatório: testar apenas se ele aparecer naturalmente; não apagar
   o perfil atual para forçar o modal.
4. Cadastro e edição de alimento: testar especialmente o último campo
   nutricional e o botão de salvar.
5. Refeição: testar quantidade e edição de entrada.
6. Métricas: testar peso, metas e campos próximos da base.
7. Configurações: abrir a tela da chave de IA e testar os dois campos.
8. Salvar refeição como template: testar o campo de nome.

Em cada caso, registrar:

- se o campo focado permanece visível;
- se a tela pode ser rolada;
- se mensagens de validação e o botão principal ficam alcançáveis;
- se o valor digitado permanece após fechar o teclado;
- se há salto, corte ou sobreposição visual.

Uma correção será considerada necessária somente se um campo ou ação importante
não puder ser trazido acima do teclado.

### Safe areas

Executar a matriz:

- tema claro e escuro;
- retrato e paisagem;
- navegação por gestos e por três botões.

Em aparelhos Samsung, a troca normalmente fica em:
**Configurações > Visor > Barra de navegação > Botões/Gestos de deslizar**.

Verificar:

1. cabeçalho abaixo da câmera/notch e da barra de status;
2. navegação inferior acima da barra de gestos ou dos três botões;
3. conteúdo lateral não cortado em paisagem;
4. aba Adicionar, Configurações, Backup e Privacidade;
5. login, diálogos de importação/exportação e avaliação de refeição;
6. último controle de cada tela alcançável por rolagem;
7. ausência de faixas vazias ou padding duplicado após rotação.

### Retomada quente

Minimizar pelo seletor de aplicativos e retornar após cada cenário:

1. aba Semana ou Métricas;
2. data histórica no Diário;
3. formulário parcialmente preenchido;
4. edição aberta de uma entrada;
5. retorno do compartilhamento de backup;
6. retorno de um link externo aberto no navegador.

Confirmar que aba, data, modal, edição e valores ainda não salvos permanecem
íntegros e que nenhuma operação é duplicada.

### Recriação opcional

Opcionalmente, ativar **Opções do desenvolvedor > Não manter atividades** e
repetir um cenário representativo. Esse teste mede recriação da Activity, não
retomada quente. Estado apenas em memória pode ser perdido; dados persistidos e
autenticação não devem desaparecer.

Desativar **Não manter atividades** imediatamente após o teste.

## Resultados físicos

Validação informada em aparelho físico:

- teclado: aprovado, sem campo ou ação importante encoberto;
- safe areas por gestos: aprovado;
- safe areas por três botões: aprovado;
- temas e rotação: aprovado;
- retomada quente: aprovada;
- links externos: aprovados;
- recriação opcional com **Não manter atividades**: não reportada e não
  bloqueante.

Foi identificado apenas um acabamento visual: a faixa nativa da barra de status
continuava cinza nos dois temas. A causa era a ausência de
`viewport-fit=cover`; a correção descrita na seção **Safe areas** foi adicionada
ao mesmo PR. A continuidade do fundo sob o notch e o contraste dos ícones
precisam de uma última confirmação física no APK atualizado.

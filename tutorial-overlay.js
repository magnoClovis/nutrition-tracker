/**
 * Interactive, localized tutorial overlay for the Nutrition Tracker UI.
 *
 * The UMD module exposes a `createTutorialOverlay` factory. The host injects
 * its loaded React runtime and `normalizeLanguage` from `i18n.js`. The
 * component receives `lang`, `type`, and `onDone`, then returns React
 * elements while imperatively coordinating with the host DOM.
 *
 * DOM contract: tutorial targets are found through the existing
 * `[data-tutorial="..."]` attributes. The component locks
 * `document.body.style.overflow`, clicks tab/action elements, calls
 * `scrollIntoView` and `getBoundingClientRect`, and reads the viewport from
 * `window.innerWidth`/`window.innerHeight`.
 * Target keys include the tab buttons, `open-log-sheet`, `day-type`,
 * `suggest-meal-button`, `microLabel`, `add-modes`, the pantry/week/metrics
 * section keys declared by the step sets, and the final `menu-settings`
 * action. Those attributes remain owned by NutritionTracker.
 *
 * Known limitations preserved intentionally:
 * - `window.__tutorialNavigating` remains shared global state because
 *   NutritionTracker.openTab reads it outside this module.
 * - `tab-adicionar` does not currently exist, some pantry/metrics targets are
 *   conditionally absent, and week targets can miss the fixed measurement
 *   window. Missing targets keep `rect` null without retry.
 * - Timing is contractual: action click 0 ms, target measurement 80 ms,
 *   navigation-flag reset 180 ms. The host still starts tab tutorials after
 *   its existing 120 ms delay.
 *
 * @module TutorialOverlay
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TutorialOverlay = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /**
   * Creates the tutorial-overlay component with host dependencies supplied explicitly.
   *
   * @param {Object} dependencies Injected UI dependencies.
   * @param {Object} dependencies.React React runtime already loaded by the host application.
   * @param {function(string): string} dependencies.normalizeLanguage Language normalizer from `i18n.js`.
   * @returns {Object} API containing the tutorial overlay component.
   */
  function createTutorialOverlay({ React, normalizeLanguage }) {
    if (!React || typeof React.createElement !== "function" || typeof React.useEffect !== "function" || typeof normalizeLanguage !== "function") {
      throw new TypeError("TutorialOverlay requires React and normalizeLanguage");
    }

    /**
     * Renders and coordinates a localized tutorial over the host application.
     *
     * @param {Object} props Tutorial overlay props.
     * @param {string} props.lang Active application language.
     * @param {string} [props.type="main"] Tutorial step-set identifier.
     * @param {function(): void} props.onDone Callback used to close and persist completion.
     * @returns {Object} React fragment containing the mask, blocker, and tutorial tooltip.
     */
    function TutorialOverlay({ lang, type = 'main', onDone }) {
      const normalizedLang = normalizeLanguage(lang);
      const isPt = normalizedLang === 'pt';
      const isEs = normalizedLang === 'es';
      const [step, setStep] = React.useState(0);
      const [rect, setRect] = React.useState(null);

      const stepSets = isPt ? {
        main: [
          { title: 'Visão geral', text: 'O app é dividido em abas. Este primeiro guia é curto; cada aba terá uma explicação própria quando você abrir pela primeira vez.', highlight: null },
          { title: 'Diário', text: 'Aqui você acompanha o dia: refeições, água, metas, progresso e sugestões do que comer.', highlight: 'tab-diario' },
          { title: 'Registrar', text: 'Use os botões de adicionar nas refeições para montar uma refeição com vários itens ou descrever um prato.', highlight: 'open-log-sheet' },
          { title: 'Alimentos', text: 'Consulte alimentos salvos, crie novos itens, leia códigos de barras, organize refeições salvas e acompanhe suplementos.', highlight: 'tab-despensa' },
          { title: 'Semana', text: 'Veja tendências recentes, o banco de calorias, gráficos e médias por refeição.', highlight: 'tab-semana' },
          { title: 'Métricas', text: 'Registre medidas, acompanhe peso, IMC e TMB, ajuste metas e gere relatórios.', highlight: 'tab-metricas' },
          { title: 'Configurações e idiomas', text: 'Na engrenagem você pode escolher português, inglês ou espanhol. Nas Configurações também ficam backup, privacidade, recursos de IA e o envio de feedback.', highlight: 'menu-settings' },
          { title: 'Ajuda por aba', text: 'Em cada aba há um botão discreto com "i". Toque nele para rever o tutorial daquela área.', highlight: null }
        ],
        diario: [
          { title: 'Diário do dia', text: 'Esta aba mostra o que você registrou no dia selecionado e compara com as metas daquele dia.', tab: 'diario', highlight: 'tab-diario' },
          { title: 'Treino ou descanso', text: 'O tipo do dia altera a meta calórica. Use treino para dias ativos e descanso quando quiser aplicar a regra reduzida.', tab: 'diario', highlight: 'day-type' },
          { title: 'Sugerir o que comer', text: 'Este botão combina o que falta nas suas metas com os alimentos salvos. Cada sugestão mostra uma nota e o que favorece ou prejudica o resultado.', tab: 'diario', highlight: 'suggest-meal-button' },
          { title: 'Micronutrientes', text: 'Abra esta área para conferir vitaminas e minerais registrados pelos alimentos do dia.', tab: 'diario', highlight: 'microLabel' }
        ],
        adicionar: [
          { title: 'Adicionar refeições', text: 'Escolha entre montar uma refeição com vários itens ou descrever um prato.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Registrar ou avaliar', text: 'Registrar envia a refeição diretamente ao diário. Avaliar refeição é opcional e calcula uma nota de 0 a 5 antes do registro.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Entender e ajustar', text: 'Ao avaliar, a explicação destaca pontos positivos e o principal desvio. Você pode editar ingredientes ou quantidades, reavaliar ou registrar mesmo assim.', tab: 'adicionar', highlight: null }
        ],
        despensa: [
          { title: 'Criar alimento', text: 'Use + Novo alimento para abrir o cadastro. Comece por nome e unidade; depois preencha macros manualmente ou use preenchimento automático.', tab: 'despensa', highlight: 'pantry-food-name' },
          { title: 'Código de barras', text: 'Use a câmera para buscar no Open Food Facts. Se o navegador não permitir, digite o código manualmente.', tab: 'despensa', highlight: 'barcode-scan-button' },
          { title: 'Salvar alimento', text: 'Quando os valores estiverem corretos, salve para usar nos registros e sugestões.', tab: 'despensa', highlight: 'pantry-save-button' },
          { title: 'Itens salvos', text: 'A lista de alimentos fica aqui. Você pode buscar, editar e remover itens.', tab: 'despensa', highlight: 'pantry-saved-foods' },
          { title: 'Refeições salvas', text: 'Modelos guardam combinações frequentes para repetir depois com poucos toques.', tab: 'despensa', highlight: 'pantry-meal-templates' },
          { title: 'Suplementos', text: 'Suplementos ficam separados dos alimentos para facilitar o acompanhamento.', tab: 'despensa', highlight: 'pantry-supplements' }
        ],
        semana: [
          { title: 'Resumo semanal', text: 'Estes cartões mostram médias, dias que bateram proteína e o banco de calorias dos sete dias concluídos. O banco usa a meta específica de cada dia e informa quantos dias tinham registros.', tab: 'semana', highlight: 'week-summary' },
          { title: 'Dias da semana', text: 'Toque em um dia para abrir o diário daquele dia e ver os detalhes.', tab: 'semana', highlight: 'week-days' },
          { title: 'Proteína', text: 'Este gráfico mostra a ingestão de proteína e a linha de referência da meta.', tab: 'semana', highlight: 'week-protein-chart' },
          { title: 'Calorias', text: 'Aqui você acompanha a variação calórica recente em relação à meta. O dia atual aparece como andamento, separado dos sete dias já concluídos.', tab: 'semana', highlight: 'week-calories-chart' },
          { title: 'Médias por refeição', text: 'Quando houver dados suficientes, esta área mostra quais refeições concentram mais calorias, proteína e carboidratos.', tab: 'semana', highlight: 'week-meal-averages' }
        ],
        metricas: [
          { title: 'Acompanhamento e metas', text: 'A aba foi dividida em duas áreas: Acompanhamento para olhar a evolução e Metas para configurar objetivos.', tab: 'metricas', highlight: null },
          { title: 'Registro rápido', text: 'Em Acompanhamento, registre peso e medidas opcionais como gordura corporal, cintura e massa muscular. A altura fica como dado de perfil.', tab: 'metricas', highlight: 'metrics-measures' },
          { title: 'Atuais e gráficos', text: 'Veja peso, IMC e TMB atual em cartões organizados, além da composição corporal, evolução do peso e histórico.', tab: 'metricas', highlight: 'metrics-current' },
          { title: 'Evolução da TMB', text: 'A TMB é registrada junto às medidas corporais. Quando houver histórico suficiente, este gráfico mostra como ela mudou ao longo do tempo.', tab: 'metricas', highlight: 'bmr-chart' },
          { title: 'Composição corporal', text: 'Use gordura corporal, cintura e massa muscular como tendência. Esses dados são opcionais e podem variar conforme o método de medição.', tab: 'metricas', highlight: 'body-composition' },
          { title: 'Progresso e previsão', text: 'A seção mostra déficit, superávit, aderência semanal e tendência usando dias concluídos, sem contar o dia atual.', tab: 'metricas', highlight: 'metrics-progress' },
          { title: 'Metas', text: 'Na subárea Metas ficam atividade física, objetivo, meta de gordura, kg a perder, semanas, ajuste calórico, proteína por kg e metas personalizadas.', tab: 'metricas', highlight: 'nutrition-profile' },
          { title: 'Memória de cálculo', text: 'O resumo mostra TMB, base do dia, ajuste do objetivo, meta final e proteína calculada para manter transparência.', tab: 'metricas', highlight: 'metrics-target-summary' },
          { title: 'Relatórios', text: 'Gere relatórios HTML ou PDF para dia, semana, mês ou histórico completo.', tab: 'metricas', highlight: 'advanced-reports' }
        ],
        release080: [
          { title: 'Avaliação opcional', text: 'Refeições montadas e pratos descritos podem receber uma nota de 0 a 5 antes do registro. Se não quiser avaliar, use Registrar para enviá-las diretamente ao diário.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Sugestões com nota', text: 'As sugestões de refeição também mostram uma nota breve, indicando o que está puxando cada opção para cima ou para baixo.', tab: 'diario', highlight: 'suggest-meal-button' },
          { title: 'Banco de calorias', text: 'O resumo da Semana mostra sua folga ou excesso calórico nos sete dias concluídos, respeitando a meta individual de cada dia.', tab: 'semana', highlight: 'week-summary' },
          { title: 'TMB nas métricas', text: 'Acompanhamento agora destaca sua TMB atual e, quando houver registros suficientes, mostra também a evolução desse valor.', tab: 'metricas', highlight: 'metrics-current' },
          { title: 'Espanhol e feedback', text: 'O app agora está disponível em espanhol. Use a engrenagem para trocar o idioma e abra Configurações quando quiser enviar sugestões ou reportar erros.', highlight: 'menu-settings', action: 'menu-settings', done: 'Abrir menu' }
        ]
      } : {
        main: [
          { title: 'Overview', text: 'The app is organized into tabs. This first guide is short; each tab has its own tutorial the first time you open it.', highlight: null },
          { title: 'Diary', text: "Track today's meals, water, goals, progress, and food suggestions.", highlight: 'tab-diario' },
          { title: 'Log', text: 'Use the add buttons inside meals to build a multi-item meal or describe a dish.', highlight: 'open-log-sheet' },
          { title: 'Foods', text: 'Search saved foods, create new items, scan barcodes, organize saved meals, and track supplements.', highlight: 'tab-despensa' },
          { title: 'Week', text: 'Review recent trends, the calorie bank, charts, and meal averages.', highlight: 'tab-semana' },
          { title: 'Metrics', text: 'Log measurements, follow weight, BMI, and BMR, adjust goals, and generate reports.', highlight: 'tab-metricas' },
          { title: 'Settings and languages', text: 'Use the gear to choose Portuguese, English, or Spanish. Settings also contains backup, privacy, AI features, and feedback.', highlight: 'menu-settings' },
          { title: 'Help by tab', text: 'Each tab has a discreet "i" button. Tap it to reopen that tab tutorial.', highlight: null }
        ],
        diario: [
          { title: 'Daily diary', text: "This tab shows what you logged for the selected day and compares it with that day's goals.", tab: 'diario', highlight: 'tab-diario' },
          { title: 'Training or rest', text: 'Day type changes the calorie target. Use training for active days and rest for the reduced-day rule.', tab: 'diario', highlight: 'day-type' },
          { title: 'Suggest what to eat', text: 'This combines what is still missing from your goals with saved foods. Each suggestion shows a score and what helps or hurts the result.', tab: 'diario', highlight: 'suggest-meal-button' },
          { title: 'Micronutrients', text: "Open this area to review vitamins and minerals logged from the day's foods.", tab: 'diario', highlight: 'microLabel' }
        ],
        adicionar: [
          { title: 'Add meals', text: 'Choose between building a multi-item meal or describing a dish.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Log or evaluate', text: 'Log meal sends it directly to the diary. Evaluate meal is optional and calculates a 0-to-5 score first.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Understand and adjust', text: 'When you evaluate, the explanation highlights strengths and the main deviation. You can edit amounts, re-evaluate, or log anyway.', tab: 'adicionar', highlight: null }
        ],
        despensa: [
          { title: 'Create a food', text: 'Use + New food to open the form. Start with name and unit, then fill macros manually or use auto-fill.', tab: 'despensa', highlight: 'pantry-food-name' },
          { title: 'Barcode', text: 'Use the camera to search Open Food Facts. If the browser blocks it, type the code manually.', tab: 'despensa', highlight: 'barcode-scan-button' },
          { title: 'Save food', text: 'Once values look right, save it for logging and suggestions.', tab: 'despensa', highlight: 'pantry-save-button' },
          { title: 'Saved items', text: 'Your food list lives here. Search, edit, or remove items as needed.', tab: 'despensa', highlight: 'pantry-saved-foods' },
          { title: 'Saved meals', text: 'Templates save frequent combinations so you can repeat them with fewer taps.', tab: 'despensa', highlight: 'pantry-meal-templates' },
          { title: 'Supplements', text: 'Supplements are separate from foods so they are easier to track.', tab: 'despensa', highlight: 'pantry-supplements' }
        ],
        semana: [
          { title: 'Weekly summary', text: 'These cards show averages, protein-goal days, and the calorie bank for the seven completed days. The bank uses each day\'s own target and shows how many days had logs.', tab: 'semana', highlight: 'week-summary' },
          { title: 'Week days', text: "Tap a day to open that day's diary and inspect details.", tab: 'semana', highlight: 'week-days' },
          { title: 'Protein', text: 'This chart shows protein intake and the goal reference line.', tab: 'semana', highlight: 'week-protein-chart' },
          { title: 'Calories', text: 'Follow recent calorie variation against the goal. Today is shown as in progress, separate from the seven completed days.', tab: 'semana', highlight: 'week-calories-chart' },
          { title: 'Meal averages', text: 'When enough data exists, this area shows which meals concentrate more calories, protein, and carbs.', tab: 'semana', highlight: 'week-meal-averages' }
        ],
        metricas: [
          { title: 'Tracking and goals', text: 'The tab is split into two areas: Tracking for progress and Goals for objective settings.', tab: 'metricas', highlight: null },
          { title: 'Quick log', text: 'In Tracking, log weight and optional measurements like body fat, waist, and muscle mass. Height stays as profile data.', tab: 'metricas', highlight: 'metrics-measures' },
          { title: 'Current and charts', text: 'Review current weight, BMI, and BMR in organized cards, plus body composition, weight trend, and history.', tab: 'metricas', highlight: 'metrics-current' },
          { title: 'BMR trend', text: 'BMR is stored with body measurements. Once enough history exists, this chart shows how it changed over time.', tab: 'metricas', highlight: 'bmr-chart' },
          { title: 'Body composition', text: 'Use body fat, waist, and muscle mass as trends. These values are optional and can vary by measurement method.', tab: 'metricas', highlight: 'body-composition' },
          { title: 'Progress and forecast', text: 'This section shows deficit, surplus, weekly adherence, and trend using completed days, excluding today.', tab: 'metricas', highlight: 'metrics-progress' },
          { title: 'Goals', text: 'The Goals area contains activity, objective, body-fat target, kg to lose, weeks, calorie adjustment, protein per kg, and custom goals.', tab: 'metricas', highlight: 'nutrition-profile' },
          { title: 'Calculation memory', text: 'The summary shows BMR, day base, goal adjustment, final target, and calculated protein for transparency.', tab: 'metricas', highlight: 'metrics-target-summary' },
          { title: 'Reports', text: 'Generate HTML or PDF reports for day, week, month, or full history.', tab: 'metricas', highlight: 'advanced-reports' }
        ],
        release080: [
          { title: 'Optional assessment', text: 'Built meals and described dishes can receive a 0-to-5 score before logging. If you do not want an assessment, use Log meal to send it directly to the diary.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Scored suggestions', text: 'Meal suggestions now include a brief score showing what pulls each option up or down.', tab: 'diario', highlight: 'suggest-meal-button' },
          { title: 'Calorie bank', text: 'The Week summary shows your calorie buffer or excess across the seven completed days while respecting each day\'s individual target.', tab: 'semana', highlight: 'week-summary' },
          { title: 'BMR in Metrics', text: 'Tracking now highlights your current BMR and, when enough records exist, its trend over time.', tab: 'metricas', highlight: 'metrics-current' },
          { title: 'Spanish and feedback', text: 'The app is now available in Spanish. Use the gear to change language, and open Settings whenever you want to send suggestions or report a problem.', highlight: 'menu-settings', action: 'menu-settings', done: 'Open menu' }
        ]
      };
      const spanishStepSets = {
        main: [
          { title: 'Vista general', text: 'La app est\u00e1 organizada por pesta\u00f1as. Esta primera gu\u00eda es corta; cada pesta\u00f1a tendr\u00e1 su propia explicaci\u00f3n la primera vez que la abras.', highlight: null },
          { title: 'Diario', text: 'Aqu\u00ed sigues el d\u00eda: comidas, agua, metas, progreso y sugerencias de qu\u00e9 comer.', highlight: 'tab-diario' },
          { title: 'Registrar', text: 'Usa los botones de a\u00f1adir en las comidas para montar una comida con varios \u00edtems o describir un plato.', highlight: 'open-log-sheet' },
          { title: 'Alimentos', text: 'Consulta alimentos guardados, crea nuevos, escanea c\u00f3digos de barras, organiza comidas guardadas y registra suplementos.', highlight: 'tab-despensa' },
          { title: 'Semana', text: 'Revisa tendencias recientes, el banco de calor\u00edas, gr\u00e1ficos y promedios por comida.', highlight: 'tab-semana' },
          { title: 'M\u00e9tricas', text: 'Registra medidas, sigue peso, IMC y TMB, ajusta metas y genera informes.', highlight: 'tab-metricas' },
          { title: 'Configuraci\u00f3n e idiomas', text: 'Usa el engranaje para elegir portugu\u00e9s, ingl\u00e9s o espa\u00f1ol. En Configuraci\u00f3n tambi\u00e9n est\u00e1n la copia de seguridad, privacidad, funciones de IA y comentarios.', highlight: 'menu-settings' },
          { title: 'Ayuda por pesta\u00f1a', text: 'En cada pesta\u00f1a hay un bot\u00f3n discreto con "i". T\u00f3calo para volver a ver el tutorial de esa zona.', highlight: null }
        ],
        diario: [
          { title: 'Diario del d\u00eda', text: 'Esta pesta\u00f1a muestra lo que registraste en el d\u00eda seleccionado y lo compara con las metas de ese d\u00eda.', tab: 'diario', highlight: 'tab-diario' },
          { title: 'Entrenamiento o descanso', text: 'El tipo de d\u00eda cambia la meta cal\u00f3rica. Usa entrenamiento para d\u00edas activos y descanso para aplicar la regla reducida.', tab: 'diario', highlight: 'day-type' },
          { title: 'Sugerir qu\u00e9 comer', text: 'Combina lo que falta en tus metas con los alimentos guardados. Cada sugerencia muestra una nota y qu\u00e9 mejora o perjudica el resultado.', tab: 'diario', highlight: 'suggest-meal-button' },
          { title: 'Micronutrientes', text: 'Abre esta zona para revisar vitaminas y minerales registrados por los alimentos del d\u00eda.', tab: 'diario', highlight: 'microLabel' }
        ],
        adicionar: [
          { title: 'A\u00f1adir comidas', text: 'Elige entre montar una comida con varios \u00edtems o describir un plato.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Registrar o evaluar', text: 'Registrar env\u00eda la comida directamente al diario. Evaluar comida es opcional y calcula antes una nota de 0 a 5.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Entender y ajustar', text: 'Al evaluar, la explicaci\u00f3n destaca puntos fuertes y el principal desv\u00edo. Puedes editar cantidades, reevaluar o registrar igualmente.', tab: 'adicionar', highlight: null }
        ],
        despensa: [
          { title: 'Crear alimento', text: 'Usa + Nuevo alimento para abrir el formulario. Empieza por nombre y unidad, despu\u00e9s rellena macros manualmente o con IA.', tab: 'despensa', highlight: 'pantry-food-name' },
          { title: 'C\u00f3digo de barras', text: 'Usa la c\u00e1mara para buscar en Open Food Facts. Si el navegador lo bloquea, escribe el c\u00f3digo manualmente.', tab: 'despensa', highlight: 'barcode-scan-button' },
          { title: 'Guardar alimento', text: 'Cuando los valores est\u00e9n correctos, gu\u00e1rdalo para usarlo en registros y sugerencias.', tab: 'despensa', highlight: 'pantry-save-button' },
          { title: 'Alimentos guardados', text: 'Tu lista de alimentos vive aqu\u00ed. Puedes buscar, editar o eliminar \u00edtems.', tab: 'despensa', highlight: 'pantry-saved-foods' },
          { title: 'Comidas guardadas', text: 'Las plantillas guardan combinaciones frecuentes para repetirlas con pocos toques.', tab: 'despensa', highlight: 'pantry-meal-templates' },
          { title: 'Suplementos', text: 'Los suplementos est\u00e1n separados de los alimentos para facilitar el seguimiento.', tab: 'despensa', highlight: 'pantry-supplements' }
        ],
        semana: [
          { title: 'Resumen semanal', text: 'Estas tarjetas muestran promedios, d\u00edas que alcanzaron la prote\u00edna y el banco de calor\u00edas de los siete d\u00edas completados. El banco usa la meta propia de cada d\u00eda e indica cu\u00e1ntos ten\u00edan registros.', tab: 'semana', highlight: 'week-summary' },
          { title: 'D\u00edas de la semana', text: 'Toca un d\u00eda para abrir su diario y ver los detalles.', tab: 'semana', highlight: 'week-days' },
          { title: 'Prote\u00edna', text: 'Este gr\u00e1fico muestra la ingesta de prote\u00edna y la l\u00ednea de referencia de la meta.', tab: 'semana', highlight: 'week-protein-chart' },
          { title: 'Calor\u00edas', text: 'Sigue la variaci\u00f3n cal\u00f3rica reciente respecto a la meta. Hoy aparece como d\u00eda en curso, separado de los siete d\u00edas completados.', tab: 'semana', highlight: 'week-calories-chart' },
          { title: 'Promedios por comida', text: 'Cuando haya datos suficientes, esta zona muestra qu\u00e9 comidas concentran m\u00e1s calor\u00edas, prote\u00edna y carbohidratos.', tab: 'semana', highlight: 'week-meal-averages' }
        ],
        metricas: [
          { title: 'Seguimiento y metas', text: 'La pesta\u00f1a est\u00e1 dividida en dos \u00e1reas: Seguimiento para ver la evoluci\u00f3n y Metas para configurar objetivos.', tab: 'metricas', highlight: null },
          { title: 'Registro r\u00e1pido', text: 'En Seguimiento registra peso y medidas opcionales como grasa corporal, cintura y masa muscular. La altura queda como dato de perfil.', tab: 'metricas', highlight: 'metrics-measures' },
          { title: 'Actuales y gr\u00e1ficos', text: 'Revisa peso, IMC y TMB actual en tarjetas organizadas, adem\u00e1s de composici\u00f3n corporal, evoluci\u00f3n del peso e historial.', tab: 'metricas', highlight: 'metrics-current' },
          { title: 'Evoluci\u00f3n de la TMB', text: 'La TMB se guarda con las medidas corporales. Cuando haya historial suficiente, este gr\u00e1fico muestra c\u00f3mo cambi\u00f3 con el tiempo.', tab: 'metricas', highlight: 'bmr-chart' },
          { title: 'Composici\u00f3n corporal', text: 'Usa grasa corporal, cintura y masa muscular como tendencia. Son datos opcionales y pueden variar seg\u00fan el m\u00e9todo de medici\u00f3n.', tab: 'metricas', highlight: 'body-composition' },
          { title: 'Progreso y previsi\u00f3n', text: 'Muestra d\u00e9ficit, super\u00e1vit, adherencia semanal y tendencia usando d\u00edas completados, sin contar hoy.', tab: 'metricas', highlight: 'metrics-progress' },
          { title: 'Metas', text: 'En Metas est\u00e1n actividad, objetivo, meta de grasa, kg a perder, semanas, ajuste cal\u00f3rico, prote\u00edna por kg y metas personalizadas.', tab: 'metricas', highlight: 'nutrition-profile' },
          { title: 'Memoria de c\u00e1lculo', text: 'El resumen muestra TMB, base del d\u00eda, ajuste del objetivo, meta final y prote\u00edna calculada para mantener transparencia.', tab: 'metricas', highlight: 'metrics-target-summary' },
          { title: 'Informes', text: 'Genera informes HTML o PDF para d\u00eda, semana, mes o historial completo.', tab: 'metricas', highlight: 'advanced-reports' }
        ],
        release080: [
          { title: 'Evaluaci\u00f3n opcional', text: 'Las comidas montadas y los platos descritos pueden recibir una nota de 0 a 5 antes del registro. Si no quieres evaluarlas, usa Registrar para enviarlas directamente al diario.', tab: 'adicionar', highlight: 'add-modes' },
          { title: 'Sugerencias con nota', text: 'Las sugerencias de comida ahora incluyen una nota breve que indica qu\u00e9 mejora o perjudica cada opci\u00f3n.', tab: 'diario', highlight: 'suggest-meal-button' },
          { title: 'Banco de calor\u00edas', text: 'El resumen de Semana muestra tu margen o exceso cal\u00f3rico en los siete d\u00edas completados, respetando la meta individual de cada d\u00eda.', tab: 'semana', highlight: 'week-summary' },
          { title: 'TMB en M\u00e9tricas', text: 'Seguimiento ahora destaca tu TMB actual y, cuando haya registros suficientes, tambi\u00e9n muestra su evoluci\u00f3n.', tab: 'metricas', highlight: 'metrics-current' },
          { title: 'Espa\u00f1ol y comentarios', text: 'La app ya est\u00e1 disponible en espa\u00f1ol. Usa el engranaje para cambiar el idioma y abre Configuraci\u00f3n cuando quieras enviar sugerencias o reportar errores.', highlight: 'menu-settings', action: 'menu-settings', done: 'Abrir men\u00fa' }
        ]
      };
      const activeStepSets = isEs ? spanishStepSets : stepSets;
      const steps = activeStepSets[type] || activeStepSets.main;

      const current = steps[step];
      const isLast = step === steps.length - 1;
      const isFirst = step === 0;
      const doneLabel = current.done || (isPt ? 'Concluir' : isEs ? 'Finalizar' : 'Done');
      const PAD = 10;
      function finishTutorial() {
        const action = current.action;
        onDone();
        if (action) {
          setTimeout(() => {
            const el = document.querySelector('[data-tutorial="' + action + '"]');
            if (el) el.click();
          }, 0);
        }
      }

      // Measure element and lock scroll
      React.useEffect(() => {
        // Lock scroll
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
      }, []);

      // Navigate to the step tab, then measure the highlighted element.
      React.useEffect(() => {
        let cancelled = false;
        const measure = () => {
          if (cancelled) return;
          const key = current.highlight;
          if (!key) { setRect(null); return; }
          const el = document.querySelector('[data-tutorial="' + key + '"]');
          if (!el) { setRect(null); return; }
          el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        };
        if (current.tab) {
          const tabEl = document.querySelector('[data-tutorial="tab-' + current.tab + '"]');
          if (tabEl) {
            window.__tutorialNavigating = true;
            tabEl.click();
            setTimeout(() => { window.__tutorialNavigating = false; }, 180);
          }
          setRect(null);
          const timer = setTimeout(measure, 80);
          return () => { cancelled = true; clearTimeout(timer); };
        }
        measure();
        return () => { cancelled = true; };
      }, [step]);

      const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const R = 8;

      // SVG cutout path
      const cutout = rect
        ? 'M0,0 H' + vw + ' V' + vh + ' H0 Z ' +
          'M' + (rect.left - PAD + R) + ',' + (rect.top - PAD) + ' ' +
          'H' + (rect.left + rect.width + PAD - R) + ' ' +
          'Q' + (rect.left + rect.width + PAD) + ',' + (rect.top - PAD) + ' ' + (rect.left + rect.width + PAD) + ',' + (rect.top - PAD + R) + ' ' +
          'V' + (rect.top + rect.height + PAD - R) + ' ' +
          'Q' + (rect.left + rect.width + PAD) + ',' + (rect.top + rect.height + PAD) + ' ' + (rect.left + rect.width + PAD - R) + ',' + (rect.top + rect.height + PAD) + ' ' +
          'H' + (rect.left - PAD + R) + ' ' +
          'Q' + (rect.left - PAD) + ',' + (rect.top + rect.height + PAD) + ' ' + (rect.left - PAD) + ',' + (rect.top + rect.height + PAD - R) + ' ' +
          'V' + (rect.top - PAD + R) + ' ' +
          'Q' + (rect.left - PAD) + ',' + (rect.top - PAD) + ' ' + (rect.left - PAD + R) + ',' + (rect.top - PAD) + ' Z'
        : 'M0,0 H' + vw + ' V' + vh + ' H0 Z';

      // Tooltip positioning: prefer the open side of the highlight and avoid covering it.
      const TOOLTIP_W = Math.min(320, vw - 32);
      const TOOLTIP_H = Math.min(240, vh - 32);
      const GAP = 20; // gap between highlight and tooltip

      let tooltipTop, tooltipLeft;
      if (!rect) {
        tooltipTop = vh / 2 - TOOLTIP_H / 2;
        tooltipLeft = vw / 2 - TOOLTIP_W / 2;
      } else {
        const rectBottom = rect.top + rect.height;
        const spaceBelow = vh - (rectBottom + PAD);
        const spaceAbove = rect.top - PAD;
        if (spaceBelow >= TOOLTIP_H + GAP || spaceBelow >= spaceAbove) {
          tooltipTop = rectBottom + PAD + GAP;
        } else {
          tooltipTop = rect.top - PAD - GAP - TOOLTIP_H;
        }
        tooltipTop = Math.max(16, Math.min(tooltipTop, vh - TOOLTIP_H - 16));
        const overlapsHighlight = tooltipTop < rectBottom + GAP && tooltipTop + TOOLTIP_H > rect.top - GAP;
        if (overlapsHighlight) {
          tooltipTop = rect.top > vh / 2
            ? Math.max(16, rect.top - PAD - GAP - TOOLTIP_H)
            : Math.min(vh - TOOLTIP_H - 16, rectBottom + PAD + GAP);
        }
        tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16));
      }

      return React.createElement(React.Fragment, null,
        // SVG overlay with cutout
        React.createElement('svg', {
          style: { position:'fixed', inset:0, zIndex:100000, pointerEvents:'none', overflow:'visible' },
          width: vw, height: vh, viewBox: '0 0 ' + vw + ' ' + vh
        },
          React.createElement('path', { d: cutout, fill:'rgba(0,0,0,0.75)', fillRule:'evenodd' }),
          rect && React.createElement('rect', {
            x: rect.left - PAD, y: rect.top - PAD,
            width: rect.width + PAD*2, height: rect.height + PAD*2,
            rx: R, ry: R, fill:'none', stroke:'#7ec87e', strokeWidth:2
          })
        ),
        // Click/scroll blocker
        React.createElement('div', {
          style:{ position:'fixed', inset:0, zIndex:100001 },
          onClick: e => e.stopPropagation(),
          onMouseDown: e => e.stopPropagation(),
          onTouchMove: e => e.preventDefault(),
          onWheel: e => e.preventDefault()
        }),
        // Tooltip
        React.createElement('div', {
          style:{
            position:'fixed', zIndex:100002,
            top: tooltipTop, left: tooltipLeft,
            width: TOOLTIP_W,
            background:'var(--surface,#1a1a1a)',
            borderRadius:14, padding:'18px 18px 14px',
            boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
            border:'1px solid var(--border2,#333)',
            maxHeight: TOOLTIP_H,
            overflowY: 'auto',
            boxSizing: 'border-box'
          }
        },
          // Progress dots
          React.createElement('div', {style:{display:'flex',gap:4,marginBottom:12}},
            steps.map((_, i) => React.createElement('div', {key:i, style:{
              width: i===step?16:5, height:5, borderRadius:3,
              background: i===step?'#7ec87e':'var(--border2,#444)',
              transition:'all 0.25s'
            }}))
          ),
          React.createElement('div', {style:{fontSize:15,fontWeight:600,color:'var(--text,#fff)',marginBottom:6}}, current.title),
          React.createElement('div', {style:{fontSize:13,color:'var(--muted,#888)',lineHeight:1.5,marginBottom:16,whiteSpace:'pre-line'}}, current.text),
          React.createElement('div', {style:{display:'flex',gap:8,alignItems:'center'}},
            React.createElement('button', {
              onClick: onDone,
              style:{fontSize:12,color:'var(--muted,#888)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:'6px 0',marginRight:'auto'}
            }, isPt?'Pular':'Skip'),
            !isFirst && React.createElement('button', {
              onClick: () => setStep(s=>s-1),
              style:{fontSize:13,padding:'8px 14px',borderRadius:8,background:'none',border:'1px solid var(--border2,#444)',color:'var(--text2,#aaa)',cursor:'pointer',fontFamily:'inherit'}
            }, '<'),
            React.createElement('button', {
              onClick: isLast ? finishTutorial : ()=>setStep(s=>s+1),
              style:{fontSize:13,padding:'8px 18px',borderRadius:8,background:'#7ec87e',border:'none',color:'#111',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}
            }, isLast ? doneLabel : (isPt?'Próximo':'Next'))
          )
        )
      );
    }


    return { TutorialOverlay };
  }

  return { createTutorialOverlay };
});

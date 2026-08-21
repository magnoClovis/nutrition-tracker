# Política de Privacidad y Eliminación de Datos de Trofia

**Aplicación:** Trofia (`com.hermegas.trofia`)  
**Responsable:** Hermegas  
**Versión de referencia:** Trofia 0.9.0 Beta
**Última actualización del texto:** 21 de agosto de 2026
**Vigencia:** a partir de su publicación  
**Contacto de privacidad y solicitudes externas de eliminación:** nutritiontracker.beta@gmail.com  
**URL pública:** https://magnoclovis.github.io/nutrition-tracker/privacy/

## 1. Alcance y responsable

Esta política explica cómo Trofia recopila, utiliza, almacena, comparte y elimina datos personales. Trofia es una aplicación beta de seguimiento nutricional para registrar comidas, objetivos, consumo de agua, suplementos, métricas corporales e información relacionada.

El responsable del tratamiento es **Hermegas**. Esta política tiene en cuenta los derechos y principios del Reglamento General de Protección de Datos de la Unión Europea (**RGPD**) y de la Ley General de Protección de Datos Personales de Brasil (**LGPD**), según resulten aplicables al usuario y al tratamiento realizado.

## 2. Datos tratados

Trofia puede tratar:

- datos de cuenta: dirección de correo electrónico, identificador de Firebase, nombre visible, estado de verificación y fechas de acceso;
- datos de perfil: fecha de nacimiento, género, altura, idioma, nivel de actividad y preferencias;
- datos nutricionales: comidas, horarios, alimentos, nutrientes, despensa, plantillas, notas, agua, suplementos y objetivos;
- métricas corporales: peso, IMC calculado, porcentaje de grasa, cintura, masa muscular e historial;
- información sobre días de entrenamiento o descanso e historial de objetivos;
- prompts, fotos de comidas enviadas voluntariamente a funciones de inteligencia artificial, contexto nutricional necesario y respuestas generadas;
- códigos de barras consultados mediante el escáner;
- contenido y archivos enviados voluntariamente mediante el formulario de comentarios;
- configuración, cachés y estado de sesión almacenados en el dispositivo;
- metadatos técnicos necesarios para autenticación, seguridad y límites de uso de IA;
- material de atestación de integridad de la aplicación, tokens de Firebase App Check y metadatos técnicos de jobs administrativos de eliminación.

La contraseña es procesada por Firebase Authentication y no está disponible para Hermegas.

## 3. Finalidades

Los datos se utilizan para:

- crear, autenticar y mantener cuentas;
- sincronizar información entre sesiones y dispositivos;
- registrar y mostrar el diario nutricional;
- calcular objetivos, totales, gráficos e historiales;
- generar sugerencias y estimaciones mediante IA, incluido el reconocimiento de alimentos y la estimación de nutrientes a partir de fotos de comidas, cuando se soliciten;
- consultar productos mediante código de barras;
- exportar, importar y restaurar copias de seguridad;
- aplicar límites de uso y proteger el servicio;
- verificar que las solicitudes administrativas sensibles proceden de la aplicación legítima y procesar la eliminación segura de la cuenta;
- responder a comentarios, solicitudes de privacidad e incidentes;
- cumplir obligaciones legales y mantener la seguridad.

## 4. Bases jurídicas

De acuerdo con el RGPD, la LGPD y otras normas aplicables, el tratamiento podrá basarse en:

- la prestación del servicio solicitado por el usuario;
- el consentimiento, cuando sea necesario para funciones opcionales;
- el interés legítimo en la seguridad, estabilidad y prevención de abusos, después de considerar los derechos del usuario;
- el cumplimiento de obligaciones legales o reglamentarias;
- el ejercicio de derechos y la atención de solicitudes del titular.

Cuando el tratamiento se base en el consentimiento, este podrá retirarse en cualquier momento sin afectar al tratamiento realizado lícitamente antes de su retirada.

## 5. Inteligencia artificial

Cuando el usuario inicia una función de IA, Trofia envía el prompt y el contexto nutricional necesario a un Cloudflare Worker. Para el reconocimiento de comidas mediante imagen, el contenido también incluye la foto capturada o seleccionada por el usuario. El Worker valida la sesión de Firebase, aplica límites de uso y reenvía el contenido a la API Gemini de Google.

El código del Worker no guarda prompts, fotos ni respuestas en una base de datos y la observabilidad está desactivada. Para controlar los límites, el Durable Object mantiene registros técnicos con el identificador de Firebase y horarios recientes, además de contadores diarios agregados. Estos registros no contienen el texto del prompt, la foto ni la respuesta. La política técnica definida para la publicación limita los metadatos individualizados a un máximo de 24 horas.

Durante las pruebas beta, Trofia puede utilizar la cuota no pagada de la API Gemini. Según los términos de Google, en usos no pagados fuera del Espacio Económico Europeo, Suiza y el Reino Unido, las entradas, los archivos enviados — incluidas las imágenes — y las respuestas pueden utilizarse para ofrecer, mejorar y desarrollar productos de Google y pueden ser procesados por revisores humanos. Los términos de Google aplican condiciones diferentes a los servicios de pago y a los usuarios del Espacio Económico Europeo, Suiza y el Reino Unido. Como decisión adicional de privacidad, Trofia exige que la facturación esté activa en el proyecto Gemini antes de ofrecer el reconocimiento mediante foto a cualquier tester real de esas regiones; en los servicios de pago, Google declara que no utiliza prompts, archivos ni respuestas para mejorar sus productos, aunque puede conservar registros limitados por motivos de seguridad, prevención de abusos y obligaciones legales.

Las respuestas de IA pueden contener errores y no sustituyen el asesoramiento médico o nutricional profesional. El usuario no debe incluir diagnósticos, historiales clínicos, recetas u otra información confidencial innecesaria en los prompts.

## 6. Código de barras, cámara y fotos de comidas

Para escanear códigos de barras, la cámara se utiliza únicamente cuando el usuario inicia el escáner. Las imágenes de vídeo se procesan localmente para identificar el código y Trofia no las almacena ni las envía.

El código detectado puede enviarse a Open Food Facts para consultar información pública del producto. La precisión y disponibilidad dependen de esa base externa.

Para reconocer una comida mediante imagen, el usuario elige expresamente tomar una foto o seleccionar una imagen de la galería. Antes del envío, la aplicación corrige la orientación, redimensiona la imagen a un máximo de 1.280 píxeles, la convierte a JPEG con una calidad aproximada del 80% y la recodifica para eliminar metadatos incorporados. La versión procesada se envía por HTTPS, a través del Worker autenticado de Trofia, a la API Gemini, que identifica alimentos y estima cantidades y nutrientes.

La foto no se guarda en la cuenta, el diario ni las copias de seguridad de Trofia, y el Worker no la conserva ni la incluye en registros. La aplicación descarta su vista previa y su copia temporal al finalizar el flujo. El sistema operativo, el navegador o el plugin nativo pueden conservar temporalmente archivos de captura conforme a sus propias reglas, y la foto original seleccionada de la galería permanece bajo control del usuario. Si el usuario revisa y acepta el resultado, solo se guardan en el diario los datos nutricionales derivados y editados. Esta función es opcional; las demás formas de registrar comidas siguen disponibles sin enviar una foto.

## 7. Comentarios

Cuando el usuario selecciona “Enviar comentarios”, Trofia abre una página de Google Forms. El formulario puede recibir textos, datos de contacto e imágenes que el usuario decida proporcionar.

Esta información está sujeta a las políticas de Google. Hermegas pretende conservar las respuestas durante un máximo de **12 meses**, salvo que una necesidad legítima requiera un periodo mayor, y podrá eliminarlas antes a petición válida del usuario.

## 8. Proveedores y servicios externos

Trofia utiliza:

- Firebase Authentication para la autenticación;
- Firebase App Check, con Play Integrity en Android y reCAPTCHA Enterprise en la Web, para atestiguar el origen de solicitudes administrativas sensibles;
- Cloud Firestore para tratar y almacenar los datos de cuenta en la región `europe-southwest1` (Madrid, España, Unión Europea);
- Cloud Functions for Firebase para aceptar solicitudes autenticadas de eliminación en la región `europe-southwest1` (Madrid, España, Unión Europea);
- Google Cloud Tasks y Cloud Scheduler para procesar, reintentar y reconciliar jobs de eliminación en la región `europe-west1` (Bélgica, Unión Europea);
- Cloudflare Workers y Durable Objects para intermediar y limitar las llamadas de IA;
- Gemini API para procesar funciones de IA, incluidas las fotos de comidas enviadas voluntariamente;
- GitHub Pages para ofrecer la aplicación web y la política pública;
- Open Food Facts para las consultas de productos;
- Google Forms cuando se envían comentarios;
- Google Play para la distribución Android y el tratamiento propio de Google relacionado con instalación, seguridad y diagnóstico.

Cloud Firestore y la función que acepta solicitudes de eliminación tratan datos en la región `europe-southwest1`, en Madrid, España. La cola y el reconciliador de esas solicitudes operan en la región `europe-west1`, en Bélgica. Estas regiones se encuentran dentro de la Unión Europea. Fuera de esos servicios regionales, Firebase Authentication y servicios globales como Firebase App Check y sus proveedores de atestación, Gemini API, Cloudflare Workers, GitHub Pages, Google Forms y Google Play pueden tratar información fuera de la Unión Europea de acuerdo con la naturaleza de sus servicios, sus términos, políticas y mecanismos legales de transferencia internacional. A la API de Gemini también se aplican las condiciones específicas descritas en la sección 5.

Trofia no integra actualmente Firebase Analytics ni Firebase Crashlytics. Los datos de instalación o diagnóstico tratados directamente por Google Play siguen las políticas de Google y no significan necesariamente que Hermegas reciba datos individualizados.

## 9. Comunicación de datos

Trofia no vende datos personales ni los utiliza para publicidad comportamental.

Los datos se comunican únicamente cuando es necesario para prestar funciones solicitadas, operar la infraestructura, proteger el servicio, atender solicitudes o cumplir obligaciones legales.

## 10. Conservación

Los datos de cuenta permanecen en Firebase mientras exista la cuenta o hasta su eliminación.

El estado local de sesión y determinados cachés permanecen en el dispositivo hasta que sean sustituidos, eliminados por la aplicación o el sistema, o borrados al limpiar los datos o desinstalar la aplicación.

El código del Worker no almacena prompts, fotos de comidas ni respuestas. La aplicación mantiene una foto únicamente durante el flujo necesario para procesar y revisar el resultado y después la descarta, salvo los cachés temporales controlados por el sistema operativo, el navegador o el plugin nativo. La conservación realizada por Gemini y otros proveedores se rige por sus términos, incluidos los periodos limitados aplicables a seguridad, prevención de abusos y obligaciones legales. Los metadatos individualizados usados para limitar llamadas de IA deberán conservarse durante un máximo de 24 horas; los contadores globales agregados podrán conservarse durante el día de cuota correspondiente y durante el periodo técnico necesario para sustituirlos.

Firebase App Check no conserva el material de atestación recibido, pero lo envía al proveedor configurado para validarlo conforme a los términos de dicho proveedor. Los tokens App Check correctos tienen una validez configurada de una hora y se renuevan automáticamente; como Trofia no utiliza protección contra repetición, los servicios Firebase no conservan esos tokens después de la validación ordinaria.

Un job de eliminación completado se elimina inmediatamente. Si fallan todos los intentos automáticos, el job conserva únicamente el identificador Firebase, el identificador de la solicitud, la etapa y el código técnico saneado del fallo, para reconciliación y soporte, y queda marcado para expirar a los siete días. Tras una eliminación completada, el lock administrativo sellado también queda marcado para expirar a los siete días. La eliminación física mediante TTL puede producirse de forma asíncrona. Estos registros no contienen contraseñas ni datos nutricionales.

Las respuestas del formulario de comentarios se conservan durante un máximo de 12 meses, salvo que el cumplimiento legal, la seguridad, la investigación de un incidente o una solicitud válida de eliminación anticipada requieran otra cosa.

Las copias de seguridad exportadas permanecen bajo control del usuario. Trofia no puede eliminar archivos ya descargados, copiados o compartidos por el usuario.

Tras una solicitud válida de eliminación, Hermegas no pretende conservar deliberadamente datos asociados a la cuenta, excepto cuando la conservación sea necesaria para cumplir la ley, ejercer derechos, prevenir fraude o proteger la seguridad. Los proveedores pueden conservar copias transitorias o registros conforme a sus propios plazos legales y técnicos.

## 11. Copias de seguridad y exportación

El usuario puede exportar datos en JSON y otros formatos disponibles. Estos archivos pueden contener información personal y nutricional y deben almacenarse de forma segura.

La importación puede añadir o sustituir categorías seleccionadas según la opción mostrada en la aplicación.

Las fotos de comidas no se incluyen en las copias de seguridad. Cuando el usuario acepta un análisis mediante imagen, la copia de seguridad solo puede contener las entradas nutricionales derivadas que fueron revisadas y guardadas en el diario.

## 12. Eliminación de cuenta y datos

Dentro de la aplicación, la ruta es:

**Configuración → Privacidad y seguridad → Eliminar cuenta.**

El usuario debe volver a introducir su contraseña y escribir la confirmación mostrada. Después de una reautenticación reciente, la aplicación envía a la función administrativa una solicitud protegida por Firebase Authentication y Firebase App Check. Cuando el backend acepta el job, la aplicación suspende nuevas escrituras, borra los datos locales asociados a la cuenta — conservando únicamente las preferencias neutras de idioma y tema — y cierra la sesión. El mensaje “Eliminación iniciada” indica que el procesamiento continuará en segundo plano.

El backend aplica un lock que bloquea nuevas escrituras, elimina recursivamente de Firestore los datos nutricionales actuales e históricos del usuario, verifica que se hayan eliminado y solo entonces elimina la cuenta de Firebase Authentication. El procesamiento es idempotente, utiliza reintentos con backoff y dispone de un reconciliador periódico. Los jobs completados se eliminan inmediatamente; los fallos permanentes conservan únicamente los metadatos técnicos saneados descritos en la sección 10 y quedan marcados para expirar a los siete días.

Si la solicitud no puede aceptarse, no se borran datos locales y el usuario puede volver a intentarlo. Si un job ya aceptado no puede completarse automáticamente, el usuario debe contactar con **nutritiontracker.beta@gmail.com** para su investigación dentro del plazo aplicable.

También se puede solicitar la eliminación sin acceso a la aplicación enviando un mensaje a **nutritiontracker.beta@gmail.com** desde la dirección de la cuenta o proporcionando información suficiente para verificar la identidad. La solicitud será respondida y atendida en un plazo máximo de **30 días**, salvo que la legislación aplicable exija un plazo diferente.

Las copias de seguridad descargadas y otras copias conservadas por el usuario no se eliminan. El flujo aceptado borra de la aplicación los datos locales vinculados a la cuenta y conserva únicamente idioma y tema; los cachés del sistema operativo o las copias externas aún pueden requerir borrar los datos de la aplicación, desinstalarla o una acción del usuario. Los proveedores pueden conservar copias transitorias o registros necesarios por seguridad u obligaciones legales según sus políticas.

## 13. Derechos del usuario

Según corresponda conforme al RGPD, la LGPD u otra legislación, el usuario puede solicitar acceso, confirmación del tratamiento, rectificación, exportación, portabilidad, eliminación, anonimización, limitación u oposición, así como información sobre comunicaciones y bases jurídicas.

El usuario también puede retirar su consentimiento cuando esta sea la base utilizada y presentar una reclamación ante la autoridad de protección de datos competente.

Las solicitudes deben enviarse a **nutritiontracker.beta@gmail.com** y serán respondidas en un plazo máximo de 30 días, salvo que resulte aplicable otro plazo legal.

## 14. Seguridad

Trofia utiliza autenticación Firebase, reautenticación reciente para operaciones sensibles, Firebase App Check, tokens de sesión, reglas de acceso, un lock administrativo de escritura y conexiones HTTPS. El proxy de IA exige autenticación y aplica límites individuales y globales.

Ningún sistema está completamente libre de riesgos. El usuario debe proteger su contraseña y sus archivos de copia de seguridad.

## 15. Niños y menores

Trofia no está destinada a menores de **16 años**. Las personas de 16 o 17 años deberán utilizar el servicio de acuerdo con la legislación aplicable y, cuando sea necesario, con autorización y supervisión de un representante legal.

## 16. Limitaciones nutricionales

Trofia ofrece cálculos y estimaciones con fines informativos. Los resultados pueden variar debido a porciones, marcas, preparación, información introducida, bases externas y limitaciones de la IA.

La aplicación no proporciona diagnóstico, tratamiento ni seguimiento clínico y no sustituye a profesionales sanitarios.

## 17. Modificaciones

Esta política podrá actualizarse cuando cambien el producto, los proveedores o la legislación. Los cambios relevantes se comunicarán mediante la aplicación, la página pública u otro canal apropiado.

# Guía: qué se configuró, para qué sirve y qué te toca hacer

> Empezó el 26 de octubre de 2026 con la configuración inicial y **se actualiza al final de cada día** con una bitácora (sección 7). Última actualización: **28 de octubre de 2026**. Todo explicado sin tecnicismos.
>
> Para el estado actual del proyecto (qué hace la app, cómo funciona, qué falta y qué se puede cambiar del diseño), ver [`proyecto.md`](proyecto.md).

---

## Resumen en 30 segundos

**Cómo vamos (28 oct):** la app ya hace todo el camino de punta a punta:
1. Creas una factura de PayPal y tu cliente paga.
2. El **copiloto con IA** te avisa solo y te propone qué hacer.
3. Tu cliente deja sus datos fiscales **una vez**.
4. Le llega su **factura del SAT (CFDI)** por correo.
5. Tú apartas tus impuestos.

Además, un **tutorial de bienvenida** enseña toda la app la primera vez, sin gastar créditos de IA.

**Ya está en internet:** https://vnv-copilot.onrender.com

**Lo que falta:**
- el diseño de Vanessa;
- que los datos guardados no se borren en Render;
- el README en inglés, el video y Devpost;
- pasar todo a `main`.

Vamos **adelantados** al calendario.

---

## 1. La conexión de Claude Code con PayPal

### ¿Qué es?
PayPal tiene un plugin para Claude Code llamado **PayPal AI Toolkit**. Con él, Claude puede hacer cosas en PayPal directamente: crear facturas, revisar pagos, hacer reembolsos, etc.

Todo esto ocurre en el **Sandbox**, que es un PayPal de mentira para hacer pruebas. Nada de lo que pase ahí mueve dinero real.

### ¿Qué se hizo?
Se revisó que la conexión funcionara. Resultado: **conectado, con 46 herramientas disponibles**. Se hizo una prueba pidiendo la lista de facturas y respondió bien (está vacía porque todavía no hemos creado ninguna).

### ¿Por qué importa?
El hackathon pide usar PayPal "de forma significativa". Con esta conexión podemos crear datos de prueba (facturas, pagos) rápido y comprobar que todo funciona.

### ⚠️ Estado al 28 de octubre: el conector falla, pero no nos afecta
Desde el 27 de octubre, cada consulta del conector responde `Unsupported cache mode: default`. **Tu llave está bien**: la probamos directo con PayPal y responde 200. El problema es del servidor de PayPal. Víctor lo reportó en el Discord del hackathon y nadie ha respondido.

**Actualización (28 oct, noche):** el error cambió. Al abrir Claude Code ahora sale `SSE error: Non-200 status code (500)`. El servidor del conector ya responde cuando se le prueba directo, y el token se renovó con `npm run paypal:token`. **Falta probarlo:** cerrar Claude Code, volver a abrirlo y correr `/paypal:setup`. Si vuelve a fallar, para Discord: *"The Claude Code PayPal plugin (`mcp.sandbox.paypal.com/sse`) fails to connect with `SSE error: Non-200 status code (500)` (earlier: `Unsupported cache mode: default`), with a fresh sandbox token that works for the REST API."*

**La app no depende de este conector:** habla con PayPal por su cuenta, y todo funciona.

### ⚠️ Lo que debes saber
- La conexión usa una **"llave temporal"** (se llama *token*) que **caduca en unas 8 horas**.
- Cuando caduque, Claude te dirá algo como "401" o "no autorizado". Para renovarla:
  1. En la terminal, dentro de la carpeta del proyecto, escribe: `npm run paypal:token`
  2. Cierra Claude Code **por completo** y vuelve a abrirlo.
- Ese comando lo hicimos nosotros: toma tus claves de PayPal del archivo `.env`, pide una llave nueva a PayPal y la guarda donde Claude Code la busca. **Nunca muestra la llave en pantalla.**

---

## 2. Tu archivo `.env` (las claves secretas)

### ¿Qué es?
Es un archivo en la carpeta del proyecto que guarda las **claves de la app de PayPal** (`PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`). Es como la contraseña del proyecto ante PayPal.

### ¿Qué se hizo?
Solo se revisó que las dos claves estuvieran puestas. **Nunca se leyeron ni se mostraron sus valores.**

### ⚠️ Reglas de oro
- **Nunca** lo subas a GitHub (ya está configurado para que Git lo ignore).
- **Nunca** pegues esas claves en el chat, en Discord ni en el código.
- Si alguna se filtra por accidente, avisa para generar unas nuevas en el panel de PayPal Developer.

---

## 3. GitHub: cómo quedó organizado el proyecto

### La idea, como si fuera una casa 🏠

```
main      🏠 La sala: lo que verá el jurado. Siempre debe funcionar.
 └─ dev   🛋️ La mesa: aquí se junta el trabajo de los tres antes de pasarlo a la sala.
     ├─ victor    🚪 Tu cuarto: backend, PayPal, IA.
     ├─ natalia   🚪 Cuarto de Natalia: investigación, textos y pitch.
     └─ vanessa   🚪 Cuarto de Vanessa: diseño y pantallas.
```

A cada uno de estos "cuartos" se le llama **rama**. Una rama es una copia del proyecto donde puedes trabajar sin afectar a los demás.

### ¿Qué se hizo, paso a paso?

| # | Qué se hizo | Para qué |
|---|---|---|
| 1 | Se crearon las ramas `natalia` y `vanessa` | Para que cada una tenga su espacio de trabajo |
| 2 | Se abrió la **solicitud #2** (de `victor` a `dev`) y tú la aceptaste | Para pasar a la mesa tu comando `npm run paypal:token` |
| 3 | Se pusieron al día todas las ramas | Para que los tres empiecen con lo mismo |
| 4 | Se abrió la **solicitud #3** (de `dev` a `main`) y tú la aceptaste | Para que la sala (lo que ve el jurado) tenga todo el proyecto |
| 5 | Se comprobó que `main` funciona | Se descargó en una carpeta aparte y se compiló completo. Todo salió bien. |
| 6 | Se pusieron **candados** a `main` y `dev` (los aplicaste tú) | Para que nadie las cambie por accidente |

**Hoy las cinco ramas tienen el mismo contenido.**

### ¿Qué es una "solicitud" (Pull Request o PR)?
Es como decir: *"Oye, hice estos cambios en mi cuarto, ¿los pasamos a la mesa?"*. En GitHub aparece una página con los cambios y un botón verde **Merge pull request**. Al darle clic, los cambios se pasan.

### ¿Qué hacen los candados?
En `main` y `dev`:
- ❌ Nadie puede meter cambios directo, **ni siquiera tú** como administrador. Todo entra con una solicitud (PR).
- ✅ No hace falta que otra persona apruebe. Puedes aceptar tus propias solicitudes; así no se atora el trabajo si los demás no están.
- ❌ No se puede borrar la rama ni sobrescribir su historial.

Las ramas personales (`victor`, `natalia`, `vanessa`) **no tienen candado**: cada quien trabaja libre en la suya.

### ¿Por qué tú le diste clic a algunas cosas y no yo?
Claude Code tiene un sistema de seguridad que **no me deja aceptar solicitudes ni cambiar candados** en GitHub sin que tú lo hagas. Es a propósito: son acciones importantes y la decisión es tuya.

### El flujo de trabajo de aquí en adelante

```
1. Trabajas en tu rama   →   2. Abres una solicitud a dev   →   3. Cuando todo funciona, solicitud de dev a main
```

Tú no tienes que memorizar los comandos: cuando avancemos, yo hago esta parte y te aviso cuando haga falta que des clic en **Merge**.

---

## 4. Render (poner la app en internet)

### ¿Qué es?
Un servicio para **publicar la app en internet**, para que el jurado la abra con un link desde cualquier lugar.

### ¿Por qué?
- Las reglas piden que la demo **siga en línea y gratis hasta el 15 de diciembre**.
- Render es patrocinador del hackathon y da premios en créditos ($1,000, $750 o $500).

### Estado: ✅ publicada el 28 de octubre en https://vnv-copilot.onrender.com
- Cuenta de Render con tu GitHub (que tiene verificación en dos pasos). Servicio **VNV-Copilot**, plan **Free**, región Oregon.
- **Se actualiza sola:** Render publica lo que haya en `dev` cada vez que fusionas un PR (tarda unos 5 minutos). Antes de entregar se cambia a `main`.
- **Las claves** viven en Render → tu servicio → **Environment**. Solo tú las ves; Claude no tiene acceso. Si cambias una, Render reinicia la app solo.
- **Plan gratis:** se duerme si nadie la usa en 15 minutos (la primera visita espera ~1 minuto) y **puede borrar los apartados y los datos fiscales** al reiniciarse. Las facturas no se pierden: viven en PayPal. Pendiente de resolver.
- **En la versión pública no se usan correos reales:** cualquiera la puede ver.

---

## 5. APIMatic (el "manual oficial" de PayPal para la IA)

### ¿Qué es?
APIMatic hizo un plugin llamado **`acp-paypal`** que le da a la IA la documentación exacta y actualizada del SDK de PayPal para TypeScript (el lenguaje de nuestro proyecto). Sin esto, la IA a veces "adivina" cómo se usa PayPal; con esto, consulta el manual oficial.

### ¿Qué se hizo?
- Tú lo instalaste con los comandos `/plugin ...`.
- Se probó preguntándole cómo crear un pago, y respondió con el código correcto. ✅
- **No necesita cuenta ni clave.** Es gratis.

### ¿Por qué?
- El código de PayPal sale más correcto.
- APIMatic es patrocinador: da **3 premios de $1,000** a quien lo use mejor.

### ¿Dónde lo usa la app?
El SDK oficial de PayPal para servidor (`@paypal/paypal-server-sdk`) **lo genera APIMatic**. La app lo usa para saber **qué dinero te entró** (Transaction Search), en `server/src/paypal/transactions.ts`. De ahí salen el "cobrado este mes" de Home, los pagos de Savings, el ticket de pagos y, desde el 30 de octubre, el **historial de pagos** del copiloto. Las facturas van directo a la API de PayPal, porque el SDK no incluye Invoicing.

### ⚠️ Cosas a tener en cuenta
- **El mes gratis:** llenaste un formulario de APIMatic, pero todavía no llega el correo. Revisa spam y la pestaña "Promociones". Si en 1 o 2 días no llega, escribe a developer@apimatic.io o pregunta en el Discord del hackathon. **El plugin funciona igual sin ese mes.**
- Si ves otro plugin llamado `paypal-sdk`, **no lo instales**: es para otro lenguaje (.NET) y choca con el que ya tenemos.

---

## 6. Algo importante sobre los premios

Según las reglas que leímos, **solo se puede ganar un premio de patrocinador** (Render, APIMatic, AG Grid, etc.) además de uno de los premios generales.

- **Premios generales que nos quedan bien:** Best Use of PayPal + AI, Most Impactful y Best Demo Delivery.
- **Patrocinador con más potencial: AG Grid** (hasta $5,000; 5 ganadores). Uno de sus ejemplos es casi nuestra app: *"un agente que lee las facturas sin pagar y muestra quién debe qué"*. Su prueba gratis dura 45 días: hay que activarla **entre el 1 y el 5 de noviembre** para que llegue al 15 de diciembre.
- **Ya usamos:** APIMatic (el SDK de PayPal en el Inicio) y pronto Render.

**Fecha límite de entrega:** 12 de noviembre de 2026, 2:00 p. m. hora de CDMX.

---

## 7. Bitácora: lo que se hizo cada día

> Una entrada por día, al final de la jornada. Primero lo simple (🍎) y luego el detalle técnico (🔧). Las solicitudes (PR) están en GitHub, y el detalle de cada pantalla está en [`proyecto.md`](proyecto.md).

### 📅 27 de octubre de 2026

**🍎 En simple:** la app pasó de "maqueta" a **funcionar de verdad con PayPal**.

- **Facturas reales de PayPal** (PR #7): creas una factura, PayPal se la manda por correo a tu cliente, y él paga con PayPal o tarjeta. Lo probaste con un pago de prueba. ✅
- **El chat con IA** (PR #8): le dices *"cóbrale 12,500 a Acme"* y te prepara la factura, pero **solo la crea si aprietas Approve**.
- **Revisión de seguridad** (PR #9): límites para que nadie abuse de la demo pública.
- **Números reales en el Inicio** (PR #10): cuánto te deben y cuánto cobraste este mes. Aquí se usó por primera vez el **SDK oficial de PayPal** (el de APIMatic), que cuenta para su premio.
- **Webhooks: todo se actualiza solo** (PR #11): en cuanto alguien paga, la pantalla cambia a "Paid" sin recargar. Para eso se instaló el **túnel** (cloudflared).
- **Modo personal: apartados** (PR #12): cada vez que te pagan, la app te pregunta *"¿apartas X para impuestos?"*. Es una cuenta virtual: no se mueve dinero.
- **Documentos del equipo** (PR #13 y #14): se corrigieron los papeles (Vanessa: diseño; Natalia: estrategia y pitch) y nació `proyecto.md`.
- **Tutorial de bienvenida** (PR #15): la primera vez que entras, el copiloto te enseña la app en 6 pasos, sin gastar créditos.

**Decisiones del día:**
- Primero lo del plan original; las ideas nuevas se guardan para después.
- Los apartados **preguntan con cada pago** (opción B), en vez de apartar solos.
- El tutorial va escrito a mano y no con IA, para ahorrar créditos.

### 📅 28 de octubre de 2026

**🍎 En simple:** la app se ve **terminada**, hace **facturas del SAT** y la IA ahora **da el primer paso**.

- **Diseño más terminado y dos modos** (PR #16): un interruptor arriba para **Business (morado)**, que es cobrar a clientes, y **Personal (naranja)**, que es organizar lo que te pagan. El Inicio es nuevo: el número grande, botones rápidos, las últimas facturas y ejemplos que se pueden presionar. También hay letra nueva (Inter), íconos y un menú abajo en celular. Víctor llevó el diseño este día con permiso de Vanessa; desde el 29 de octubre vuelve a ella.
- **Facturas del SAT, nivel 1** (PR #17): cada factura tiene un **link** para que tu cliente deje sus datos fiscales **una sola vez**.
- **Facturas del SAT, nivel 2** (PR #18): con un clic, **Facturama** (en modo prueba) sella la factura y **le llega al cliente por correo**, con PDF y XML. La cuenta de Facturama la configuró Claude por la API, porque su formulario no aceptaba el código postal de prueba. **Lo probaste y te llegó la factura a tu correo** (no a spam). ✅
- **El link va dentro del correo de PayPal** (PR #19): al crear una factura en pesos, la nota dice *"¿Necesitas factura? Deja tus datos aquí"*. La página dice **quién** pide los datos (`BUSINESS_NAME`) y trae un aviso de privacidad.
- **El copiloto da el primer paso** (PR #20): cuando te pagan, la IA se da cuenta sola y te propone emitir la factura y apartar tus impuestos. Tú solo apruebas. Tarda unos 5 segundos.
- **Memoria del proyecto** (PR #22 y #23): esta bitácora diaria y un archivo `CLAUDE.md` en la raíz, que Claude lee solo al abrirse. Así cada día arranca sabiendo las reglas, cómo prender todo y dónde quedamos. Si Vanessa o Natalia usan Claude, también les sirve.
- **La guía que te acompaña** (PR #21): un "GPS" sin IA que sigue a tu factura más reciente (envíala → espera el pago → pide datos → emite el CFDI). Va en todas las pantallas, tiene **"Show me"**, que ilumina el botón exacto, y se puede apagar cuando ya te acostumbraste.

**Decisiones del día:**
- **No copiar a PayPal:** las reglas lo prohíben. Usamos un estilo parecido, con marca propia.
- **Facturama en vez de Facturapi:** su prueba no vence y no hay que esperar respuesta de nadie.
- **El perfil fiscal compartido** (cada quien inicia sesión y comparte sus datos) queda **para después**: se sale del tiempo y del video.
- **Historia del proyecto:** *"el copiloto que ayuda a los freelancers a cobrar y cumplir con el SAT"*. La IA tiene que tomar la iniciativa, no solo esperar.

**Lo aprendido:**
- Tu observación fue clave: la IA "pasaba a segundo plano" porque solo esperaba. Ahora habla primero.
- Pendiente para el 29 de octubre: justo después de un pago **hablan la guía y el copiloto al mismo tiempo**, y puede abrumar. Hay que hacer que solo hable uno.

**🔧 En técnico:** `server/src/facturama.ts` (PAC sandbox), `server/src/taxInfo.ts` (datos fiscales y CFDI), `server/src/ai/proactive.ts` (sugerencias al pagar), `client/src/lib/journey.ts` (reglas de la guía) y `client/src/lib/mode.ts` (modos). Hay variables nuevas en el `.env`: `FACTURAMA_USER`, `FACTURAMA_PASSWORD` y `BUSINESS_NAME` (ver `.env.example`).

### 📅 28 de octubre de 2026 (segunda parte, en la noche)

**🍎 En simple:** la app **ya está en internet**, la IA cuesta **~1 centavo por mensaje** y hay un **tutorial completo** que funciona bien en celular.

- **La IA, más barata** (PR #24): el copiloto pasó de Opus 5.5 a **Sonnet 5.5** (la mitad de precio) y usa **caché**: lo que se repite en cada mensaje (instrucciones, herramientas, la plática) se cobra ~90% más barato. Medido: **~1 centavo por mensaje**, así que los ~$10 de créditos alcanzan para la revisión del jurado. Tú sigues usando Opus en Claude Code con tu Claude Pro: son cuentas separadas.
- **Tutorial de bienvenida detallado** (PR #25), idea tuya: al entrar por primera vez, **14 pasos** explican toda la app (Business, Personal y el copiloto). Se puede omitir y volver a ver con el botón **Tour**. **La guía (el GPS) ahora empieza apagada**, y quien la quiera la prende en Home. Así, cuando te pagan, **solo habla el copiloto**. Esto resolvió el pendiente de la mañana.
- **Publicada en Render**: https://vnv-copilot.onrender.com. Configuraste la cuenta con tu GitHub, las variables y el webhook de PayPal para esa dirección. El copiloto contestó desde internet ✅ (falló al principio por un guion de más en una clave).
- **Arreglos para celular** (PR #26): la lista de facturas era una tabla que no cabía; ahora en celular **cada factura es una tarjeta**. El mensaje del tutorial se acomoda arriba o abajo para no tapar lo que explica, y espera a que lleguen las facturas de PayPal.

**Decisiones del día:**
- **Sonnet 5.5** para el copiloto de la app (pendiente desde el 27).
- **Render antes que funciones nuevas:** sin link, el jurado no puede probar nada.
- **Apartados con meta** (por ejemplo "Laptop: $15,000") y que el copiloto proponga cuánto meter cuando te pagan: **sí, pero chiquito y máximo 1 día**, después de Render. Quedó en "Ideas guardadas" de `proyecto.md`.
- **AWS Bedrock** (para usar tus $100 de créditos de AWS): **en pausa**. Te suscribiste a Sonnet 5.5 en AWS, pero tu cuenta todavía dice "no disponible". Abriste un caso con AWS pidiendo acceso y límite de 6 millones de tokens al día. Mientras tanto, la app sigue con Anthropic directo.
- Mientras Vanessa y Natalia no estén, **las decisiones las tomas tú**; en las reuniones se ajusta lo que ellas opinen.

**Lo aprendido:**
- Probar en el celular de verdad descubre cosas que en la compu no se ven.
- Las cuentas nuevas de AWS vienen muy limitadas: los modelos nuevos y los límites se piden con un caso de soporte.
- Un error de dedo en una clave (un guion) basta para que la IA no conteste. Los logs de Render dicen el motivo sin mostrar la clave.

**Revisión de cierre (todo bien):** el `.env` no está en GitHub y no hay claves en el repositorio. La app publicada tiene HTTPS obligatorio y protecciones de página activas. Un aviso de pago **falso** (sin firma de PayPal) se contesta con "recibido" pero **se descarta**: el servidor verifica la firma con PayPal antes de hacer algo. Tu GitHub tiene verificación en dos pasos, y eso protege también tu Render.

**Pendientes que salieron en la revisión** (no están rotos):
- **Datos que se borran en Render** (tarea 6b). En el plan gratis, el servidor es como un cuarto de hotel: cada reinicio (al fusionar un PR, al despertar tras 15 minutos dormido o por mantenimiento) te dan uno limpio. Se pierden el plan de apartados y lo apartado, los datos fiscales de los clientes, la marca de "CFDI emitido" y las pláticas del copiloto. **No se pierden** las facturas ni los pagos (viven en PayPal), ni los CFDI ya enviados por correo. Importa porque un juez podría dejar algo a medias, regresar y ver que desapareció.
- **Invoices pide la lista de facturas varias veces** al abrir (se vieron 4 pedidos seguidos en vez de 1). No rompe nada; revisar.
- **Llaves de AWS:** si las del `.env` son de tu usuario principal, antes de subirlas a Render crear un usuario en IAM que **solo** pueda usar Bedrock.
- El copiloto contestó una vez en **español a una pregunta en inglés**. Hay que vigilarlo: el jurado es internacional.

**🔧 En técnico:** `callClaude` en `server/src/ai/copilot.ts` manda `cache_control: { type: 'ephemeral' }` y anota en el log `[claude] modelo in= cache_read= cache_write= out=` (sin contenido). Modelo por defecto `claude-sonnet-5-5` en `server/src/config/env.ts`. Tutorial: `client/src/lib/tour.ts` (14 pasos; un `target` con `*` ilumina el primero que empiece así), `Tour.tsx` busca la copia **visible** de cada parte, en celular pone el mensaje arriba si lo iluminado está abajo y espera hasta ~10 s. Guía: clave `localStorage` `vnv-guide-on` (sin ella, apagada). Invoices: `InvoiceActions` y `TaxNote` compartidos entre la tabla (compu) y las tarjetas (`sm:hidden`). Render: build `npm ci --include=dev && npm run build`, start `npm start`, rama `dev`. El webhook de Render se registró con `npm run paypal:webhook -- https://vnv-copilot.onrender.com` (el script solo borra webhooks viejos de `trycloudflare.com`).

### 📅 29 de octubre de 2026

Día sin reunión: Vanessa y Natalia no pudieron. Vanessa pasó su rama a `main` (#29). Su rama era una copia de `dev`, así que `main` quedó con lo del 28 de octubre, todavía sin diseño nuevo. AWS contestó el caso de Bedrock, pero hubo complicaciones y se decidió **no usarlo**.

### 📅 30 de octubre de 2026

**🍎 En simple:** probamos un pago **de punta a punta en internet** y funcionó. Los datos **ya no se borran** en Render, y el copiloto aprendió a **ponerte al día con varios pagos de un jalón** y a **contestar sobre pagos pasados**.

- **Adiós a AWS:** se borró todo lo que quedaba (`test.js`, la librería y las llaves del `.env`), y tú desactivaste y borraste la llave en AWS. La IA sigue con Anthropic.
- **Invoices más ligera** (PR #30): pedía la lista de facturas 4 veces al abrir; ahora 1. La guía apagada ya no carga nada.
- **Prueba de pago en Render ✅:** factura #0014 de $10 → la pagaste con tu cuenta de prueba → cambió sola a **Paid** → salió la sugerencia del copiloto. Así se confirmó que el aviso de PayPal (webhook) sí llega a internet.
- **"Your copilot is on it"** (PR #31): la sugerencia tarda unos segundos en pensarse. Ahora, en cuanto te pagan, sale un aviso con puntitos y luego cambia a "Your copilot has a suggestion".
- **Links del chat** (PR #32): ya se pueden presionar, por ejemplo el de datos fiscales.
- **Los datos ya no se borran** (PR #32): los apartados y los datos fiscales se guardan en **Neon**, una base de datos gratis. Abriste la cuenta con tu GitHub y pusiste la dirección en Render. Lo confirmamos: el apartado de $10 que aceptaste quedó guardado en Neon. En tu compu se siguen usando archivos, para no mezclar pruebas con la demo.
- **Varios pagos en un solo ticket** (PR #33 y #34), idea tuya: en vez de aceptar pago por pago, el copiloto arma **una tarjeta tipo ticket** con todos los pagos pendientes, palomea los que recomienda con una razón corta, y tú cambias las casillas y apruebas una vez. En **Savings** hay un botón **"Review all with AI"** que lo abre en ~5 segundos (escribiéndolo en el chat tarda ~23).
- **La sugerencia te pone al día** (PR #35): si cuando te pagan ya tenías pagos sin responder, la misma sugerencia trae el ticket con el pago nuevo arriba y los viejos abajo.
- **Historial de pagos** (PR #35): le puedes preguntar *"¿cuándo me pagó Juan?"* y contesta con fecha, número de transacción y lo que apartaste. No es memoria: lo busca en PayPal cada vez.
- **IA más barata** (PR #35): las pláticas nuevas ya reusan el "manual de instrucciones" guardado en caché. Ahorra ~1 centavo por plática.
- **Datos fiscales una sola vez** (PR #36): al probar viste que el copiloto pedía otra vez los datos de Test Buyer. Era un error: si el cliente llenaba el link de **una** factura, sus otras facturas que ya existían se quedaban "esperando". Ahora todas quedan listas, y las que estaban atoradas se corrigen solas cuando Render arranca. Si Test Buyer llenó sus datos antes de las ~6:25 p. m. del 30 oct, se borraron con el cambio a Neon y hay que llenarlos una vez más.

**Decisiones del día:**
- **Neon gratis** en vez de pagar Render (~$11). Si algo falla en diciembre, se puede pagar Render solo esas dos semanas.
- **Un "despertador"** para que Render no se duerma, pero **solo** al grabar el video y del 1 al 15 de diciembre: despierta todo el mes gasta casi todas las horas gratis.
- **Memoria entre pláticas: no.** La demo es pública y todos los jueces comparten la cuenta, así que un juez vería lo que habló otro. Además, cada mensaje costaría más. Para lo que se necesita basta el historial de pagos.
- **No se guardan las respuestas de PayPal unos segundos para acelerar:** medido, ahorraba menos de 1 segundo y podía retrasar que apareciera un pago nuevo.
- **Antes de agregar o quitar algo, Claude dice primero si conviene o no,** con sinceridad, y espera tu OK.
- **Desde el 31 de octubre: no más funciones nuevas.** Lo que sigue es README, video, Devpost y el diseño de Vanessa.

**Lo aprendido:**
- Un juez **no puede pagar** una factura (no tiene cuenta de prueba de PayPal). La sugerencia al pagar se luce en el **video**; lo que el juez sí prueba en vivo es lo que ya está en la app (el ticket, el chat, el historial). Por eso hay que dejar pagos sin responder antes del 1 de diciembre.
- Neon y la app "duermen" de forma distinta: Neon despierta en menos de un segundo; Render tarda ~1 minuto.
- A la IA hay que pedirle el mensaje **al principio** de la instrucción: cuando se le pidió al final, ponía las tarjetas sin explicar nada.

**🔧 En técnico:**
- `server/src/store.ts`: con `DATABASE_URL` guarda en Neon (`@neondatabase/serverless` por HTTP, tabla `app_store` con una fila por "archivo", creada sola); sin ella, archivos. Si Neon falla al leer, lanza error en vez de empezar en blanco. El log de arranque dice `data in postgres` o `data in files`.
- Evento en vivo `copilot.thinking` (`status: 'failed'` si no pudo) en `proactive.ts` y `Layout.tsx`.
- Ticket: herramienta `review_payments` (tarjeta con `choices`; al aprobar, el cliente manda `selected`, y el servidor solo acepta ids de la tarjeta), `decidePayments` en `savings.ts` (una consulta y una escritura) y `PaymentTicket` en `Copilot.tsx`. Botón: `POST /api/copilot/review-payments` → `pendingPaymentsFacts` → `startFromEvent` (`effort: low`).
- Historial: herramienta de solo lectura `list_payments` → `getPaymentsSince` en `overview.ts` (Transaction Search en ventanas de 31 días, hasta 93, más pagos de facturas).
- Caché: `cache_control` explícito en el bloque `system`, junto al automático. Medido: la 2.ª y la 3.ª plática nueva leen 4,471 tokens del caché.
- `invoicesApi.list` comparte los pedidos iguales que están en camino; `useJourney(mode, off)` no carga nada con la guía apagada.
- Datos fiscales: `fillFromKnownClients` en `server/src/taxInfo.ts` completa los links "waiting" de un cliente conocido (por correo). Se usa en `submitTaxInfo` y al cargar el archivo o la fila de Neon.

---

## ✅ ¿Qué te toca hacer a ti?

**Esta semana (del 31 de oct al 5 de nov):**
- [ ] **Decidir si van por el premio de AG Grid.** Si sí, activar su prueba gratis **entre el 1 y el 5 de noviembre** (dura 45 días y debe llegar al 15 de diciembre).
- [ ] Reunión con Vanessa y Natalia: enseñarles la app en Render (modos, tutorial, ticket de pagos, historial). **Desde ahí el diseño lo decide Vanessa.** Pedirles que `main` solo se actualice desde `dev`.
- [ ] Pedirle a Natalia la frase de la historia (por ejemplo *"el copiloto que ayuda a los freelancers mexicanos a cobrar y cumplir con el SAT"*) y que empiece a pensar el video.
- [ ] Preguntarles si quieren aparecer en el aviso de autoría del código (`LICENSE`).

**Con Claude (desde el 31 de oct, sin funciones nuevas):**
- [ ] **README en inglés** y el texto de **Devpost**.
- [ ] Guion y grabación del **video** (menos de 3 minutos). Mientras se graba, prender el "despertador" de Render.
- [ ] Revisar los detalles de **cómo se ve en celular** (tarea 6d).
- [ ] Cerrar y abrir Claude Code y correr `/paypal:setup`, para ver si el conector de PayPal ya funciona.
- [x] ~~Prueba de pago completa en Render~~ (30 oct)
- [x] ~~Que los apartados y los datos fiscales no se borren en Render~~ (30 oct, Neon)

**Antes del 1 de diciembre (revisión del jurado):**
- [ ] Dejar **3 o 4 pagos sin responder** en Render, para que el jurado vea el ticket y el botón "Review all with AI".
- [ ] Prender el **"despertador"** (cron-job.org o UptimeRobot) del 1 al 15 de dic, y revisar las horas en Render → **Billing**.
- [ ] Cambiar Render para que publique desde `main` en vez de `dev`.

**Siempre:**
- [ ] Dar clic en **Merge** cuando te pida aceptar una solicitud.
- [ ] Para prender la app: `npm run dev`. Para que los pagos se actualicen solos también hace falta el túnel; dile a Claude *"prende todo"*.
- [ ] En tu compu, **no** pongas `DATABASE_URL` en el `.env`: esa variable solo va en Render.

**Para la asesoría de finanzas:** las preguntas están en [`proyecto.md`](proyecto.md), sección 6. Por ejemplo, si el IVA va incluido en el precio y cuándo hay retenciones.

---

## 🆘 Problemas comunes

| Si pasa esto... | Haz esto |
|---|---|
| Una pantalla dice "Not found" o no carga después de cambios grandes | Detén la app (Ctrl+C) y vuelve a correr `npm run dev` |
| Pagas en Sandbox, pero la app no se actualiza sola | El túnel está apagado o cambió de link. Dile a Claude *"prende todo"*: vuelve a registrar el webhook |
| El link de datos fiscales empieza con `localhost` | Es normal mientras la app corre en tu computadora. En Render tiene la dirección real |
| En Render el copiloto dice "unavailable right now" | Alguna variable de Anthropic está mal copiada en Render. Busca en **Logs** la línea `[claude] ...`: 401 = clave mal, 404 = modelo mal |
| La app de Render tarda en abrir | El plan gratis se duerme a los 15 minutos sin uso: la primera visita espera ~1 minuto |
| En Render, Savings o los datos fiscales salen vacíos después de un reinicio | En Render → **Logs**, busca `Server listening ... data in ...`. Si dice `data in files`, falta o está mal `DATABASE_URL` en **Environment** (la dirección de Neon) |
| Neon dice que la base de datos está "suspended" o "idle" | Es normal: se duerme sola y despierta en menos de un segundo cuando la app le pide algo |
| Probaste pagos en tu compu y ahora en local no llegan | El webhook de tu compu cambia con cada túnel. Dile a Claude *"prende todo"*; el de Render no se afecta |
| No te llega el correo de la factura del SAT | Revisa que en el formulario se haya puesto un correo real (el de prueba, `facturas@example.com`, no existe) y revisa spam |
| Claude dice "401" o "no autorizado" con PayPal | La llave caducó: `npm run paypal:token` y reinicia Claude Code |
| GitHub no te deja subir cambios a `main` o `dev` | Es normal, son los candados. Trabaja en tu rama y abre una solicitud |
| Un error que no entiendes | Pégalo en el chat (¡sin claves!) y lo revisamos juntos |

---

## 📖 Mini diccionario

| Palabra | Qué significa |
|---|---|
| **Sandbox** | PayPal de pruebas. Nada es dinero real. |
| **Token** | Llave temporal para entrar a PayPal. Caduca en unas 8 horas. |
| **`.env`** | Archivo con las claves secretas. Nunca se sube a GitHub. |
| **Rama** | Copia del proyecto donde alguien trabaja sin afectar a los demás. |
| **PR (Pull Request) / solicitud** | Pedir que los cambios de una rama pasen a otra. |
| **Merge** | Aceptar la solicitud y juntar los cambios. |
| **Plugin** | Algo que se le instala a Claude Code para darle nuevas habilidades. |
| **MCP** | La forma técnica en que Claude Code se conecta con servicios como PayPal o APIMatic. |
| **Render** | Servicio para publicar la app en internet. |
| **APIMatic** | Empresa que hizo el "manual oficial" de PayPal para la IA. |
| **Webhook** | El "timbre": PayPal le avisa a la app cuando alguien paga. |
| **Túnel (cloudflared)** | Un puente temporal para que PayPal pueda tocar ese timbre en tu computadora. Su link cambia cada vez. |
| **CFDI** | La factura oficial del SAT en México. |
| **RFC** | La "CURP" de impuestos: identifica a quien paga impuestos. |
| **PAC / Facturama** | La "oficina" autorizada por el SAT que sella las facturas. Usamos Facturama en modo prueba. |
| **Copiloto proactivo** | La IA que te habla primero cuando pasa algo importante (te pagaron), siempre pidiendo permiso. |
| **Guía** | El "GPS" de la app: te dice el siguiente paso con reglas fijas, sin gastar créditos de IA. |

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
- Las reglas piden que la demo **siga en línea hasta que anuncien a los ganadores, el 21 de diciembre** (según un correo de Devpost). También las cuentas de prueba y los créditos.
- Render es patrocinador del hackathon y da premios en créditos ($1,000, $750 o $500).

### Estado: ✅ publicada el 28 de octubre en https://vnv-copilot.onrender.com
- Cuenta de Render con tu GitHub (que tiene verificación en dos pasos). Servicio **VNV-Copilot**, plan **Free**, región Oregon.
- **Se actualiza sola:** Render publica lo que haya en `dev` cada vez que fusionas un PR (tarda unos 5 minutos). Antes de entregar se cambia a `main`.
- **Las claves** viven en Render → tu servicio → **Environment**. Solo tú las ves; Claude no tiene acceso. Si cambias una, Render reinicia la app solo.
- **Plan gratis:** se duerme si nadie la usa en 15 minutos (la primera visita espera ~1 minuto). Antes, cada reinicio borraba los apartados y los datos fiscales; **desde el 30 de octubre se guardan en Neon** (base de datos gratis, variable `DATABASE_URL` en Environment) y ya no se pierden. Las facturas viven en PayPal. Para que no se duerma mientras se graba el video y del 1 al 21 de diciembre, se usará un "despertador" gratis.
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
- **Patrocinador con más potencial: AG Grid** (hasta $5,000; 5 ganadores). Uno de sus ejemplos es casi nuestra app: *"un agente que lee las facturas sin pagar y muestra quién debe qué"*. Su prueba gratis dura 45 días, así que cualquier fecha desde el 6 de noviembre llega al 21 de diciembre. **Decisión del 4 nov: por ahora no;** se reconsidera el 9 de noviembre, solo si el video y Devpost ya están.
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
- **El video:** Claude hace el guion, las tomas limpias de la app y los subtítulos. Natalia (o tú) narra con su voz y edita en CapCut o Clipchamp. La toma del pago se graba en pantalla. Detalle en `proyecto.md` → "Ideas guardadas".
- **App en español o inglés:** buena idea, pero va después del rediseño de Vanessa y solo si sobra tiempo. Mientras, en el README y el video se destaca que el copiloto ya habla español.
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

### 📅 4 de noviembre de 2026

**🍎 En simple:** nos preguntamos en serio si alguien usaría la app. Decidimos **terminarla y entregarla**, pero enfocada en freelancers mexicanos con **clientes en el extranjero**. Hoy ya se puede cobrar en dólares y **emitir el CFDI en dólares**, y lo probaste con una cuenta de prueba de Estados Unidos. Hay un **README nuevo**.

- **La duda de fondo:** hablaste con tu equipo y con dos freelancers, y ellos prefieren la transferencia porque PayPal cobra comisión. Conclusión: con clientes mexicanos, la idea tiene poco sentido como negocio. Con clientes en el extranjero puede tenerlo, pero **nadie lo ha comprobado todavía**.
- **México pasa a segundo lugar:** la historia ahora es *"el copiloto da el primer paso cuando te pagan"*. Abre con un cliente de Texas y luego muestra a un cliente de Monterrey. Falta que Natalia la revise.
- **README nuevo** (PR #39): cuenta esa historia, la regla de aprobación, cómo probar la demo y las limitaciones, sin prometer de más.
- **CFDI en dólares** (PR #40): decisión tuya, como excepción a "no más funciones". Al cliente no se le pide ni se le manda nada. Tú eliges el IVA y el país, y la app agrega el tipo de cambio.
- **Textos más claros** (PR #41): tú emites el CFDI para reportar tu ingreso. Tú sales como emisor, el cliente como receptor, y tú te quedas con la copia.
- **La pregunta del CFDI ya sale siempre** (PR #42): en tu prueba, el copiloto puso la tarjeta sin preguntar. Ahora esa pregunta la agrega la app.
- **Prueba de punta a punta en Render ✅:** factura #0028 de $20 USD a "Texas Client", pagada con la cuenta de prueba de Estados Unidos. Se vio en dólares, cambió sola a **Paid**, y el copiloto propuso apartar y preguntó por el CFDI. El CFDI en dólares también se emitió y se descargó en la #0025 y la #0027.

**Decisiones del día:**
- **Entregar sí o sí.** Si la idea sigue como negocio se decide después del 12 de noviembre.
- **No tenemos asesoría de finanzas ni un grupo de freelancers.** Por eso no decimos que la app cumpla con el SAT ni que haya usuarios que la pidan.
- **La app no decide el IVA.** Según blogs de contadores (no es fuente oficial), que el cliente esté fuera no basta para el 0%: depende del servicio. En el video conviene el ejemplo de un **programador**.
- **Facturar en otros países:** no se hace. Quedó en "Ideas guardadas", y como visión en el README.
- **AG Grid:** por ahora no. Se reconsidera el 9 de noviembre, solo si el video y Devpost ya están.
- **Tipo de cambio de los freelancers** (idea tuya): mostrar cuánto se pierde en la conversión. Quedó en "Ideas guardadas".

**Lo aprendido:**
- **Corrección sobre AG Grid:** se dijo que la prueba vencía el 5 de noviembre, y no es cierto. Dura 45 días, así que activarla después también llega al 15 de diciembre. El límite real es tener tiempo de construirlo.
- **Con la cuenta mexicana, PayPal muestra el cobro en pesos**, aunque la factura esté en dólares. Con la de Estados Unidos sale en dólares, y además aparecen sus opciones, como Pay in 4. Eso son datos de prueba de PayPal, no de la app. **Para el video hay que usar la cuenta de Estados Unidos.**
- **Escribir en el chat con una tarjeta pendiente la rechaza.** Por eso la pregunta dice *"After you answer the card above"*.
- **Con esfuerzo bajo, Claude a veces pone tarjetas sin escribir nada,** aunque se le pida el mensaje primero. Lo que debe salir siempre, lo agrega la app.

**🔧 En técnico:**
- `server/src/exchangeRate.ts`: Banxico (serie `SF60653`) con `BANXICO_TOKEN`, sin token o si falla usa la referencia del BCE (frankfurter); caché de 1 hora. **El camino de Banxico aún no se prueba.**
- `prepareCfdi(invoiceId, foreign?)` e `issueCfdi(invoiceId, foreign?)` en `taxInfo.ts`. USD: `CurrencyExchangeRate` (Facturama rechaza `ExchangeRate`), `Exportation: 01`, RFC `XEXX010101000`, régimen `616`, uso `S01`, código postal del emisor, `TaxResidence` y `TaxRegistrationNumber` (sin guiones). Se guarda en `cfdi.foreign`.
- `issue_cfdi` acepta `vat_rate`, `client_country` y `client_tax_id`. `createSuggestion(title, event, note?)` agrega el texto fijo después de las tarjetas.
- Ventana de **Tax info** en USD: `CfdiSection` con IVA sin valor por defecto (el botón sigue apagado), país y número fiscal opcional.
- Probado en Facturama sandbox: 0% y 16%, XML revisado, negativas (sin IVA, país inválido, doble emisión), número con guion, y regresión en MXN.
- Las pruebas locales dejaron las facturas #0020–#0024 ("QA ...") en el Sandbox; se ven en Render.

### 📅 7 de noviembre de 2026

**🍎 En simple:** llegó un correo de Devpost con dos noticias: la demo debe seguir viva **hasta el 21 de diciembre**, y **después de entregar no se puede tocar nada**. Además, ya creaste el proyecto en Devpost y quedó como **borrador**: solo le falta el video. Y hay un **primer borrador del guion** del video, que queda en pausa hasta hablar con Vanessa y Natalia.

- **El correo de Devpost:** la demo, las cuentas de prueba y los créditos deben seguir activos hasta que anuncien a los ganadores, el **21 de diciembre**. Después de la entrega, Devpost bloquea el proyecto y pide **no editar el repo, el video ni nada enlazado** hasta esa fecha. Es como entregar un examen: ya no se puede corregir.
- **Qué cambia por eso:** dejar la demo presentable (pagos esperando, una factura pagada en dólares y sin las facturas "QA") pasa del 1 de diciembre al **11 de noviembre**. Tampoco habrá PRs de bitácora después del 12.
- **¿Alcanzan los servicios gratis hasta el 21?** Sí: Render despierto del 1 al 21 de diciembre gasta 504 de 750 horas, Neon no se despierta con el "despertador" (toca `/api/health`, que no usa la base de datos), y PayPal y Facturama Sandbox son gratis. **El único riesgo son los créditos de la IA:** con el tope de 200 mensajes al día, un mal día costaría ~$2. **Ya lo bajaste a 50** en Render (7 nov): el peor día cuesta ~$0.50.
- **Proyecto en Devpost ✅ (borrador):** nombre, frase corta, historia completa, "Built with", links, patrocinadores (APIMatic y Render) e instrucciones para el jurado. Al darle Submit, Devpost no dejó mandarlo **porque falta el video**. Todo se puede editar hasta el 12 a las 14:00, incluso después de mandarlo.
- **Equipo en Devpost:** invitaste a tu hermana. Tiene que **aceptar** antes de entregar y ser mayor de edad (lo pide la regla).
- **Guion del video (borrador 1):** en `docs/video-script.md`. Son 8 escenas en 2:48, con el cliente de Texas, la IA hablando primero al pagar y el CFDI en dólares. **En pausa:** antes se espera lo último del diseño de Vanessa y la opinión de Natalia sobre qué historia contar.

**Decisiones del día:**
- **Esperar a Vanessa y Natalia** antes de seguir con el guion y de grabar.
- **APIMatic:** el SDK oficial de PayPal (hecho por APIMatic) sí se usa en la app. El "Context Plugin" se instaló y se probó, pero en Devpost solo se dice lo que sabemos que pasó.

**Lo aprendido:**
- En Devpost, el video es **obligatorio para mandar** el proyecto: sin él no se puede dar Submit.
- Las respuestas de Devpost (pasos 1 a 4) se guardan solas como borrador; no hace falta terminarlas el mismo día.

**🔧 En técnico:**
- `CHAT_DAILY_LIMIT=50` en Render (antes 200, el valor por defecto del código).
- PR #44 (fusionado): fechas del jurado (activo hasta el 21 dic), regla de no editar después de la entrega, limpieza de la demo movida al 11 nov y "despertador" del 1 al 21 dic (504 h).
- PR #45: esta bitácora y el guion. El #44 se fusionó antes de subir esta parte, por eso van separados.
- `docs/video-script.md`: guion con escenas, tiempos, narración en inglés (~290 palabras) y lista de tomas (Claude: tomas limpias con navegador automático; Víctor: el pago en pantalla con OBS).
- Los textos de Devpost quedaron en `~/Documentos/devpost-about.txt` y `~/Documentos/devpost-paso4.txt` (fuera del repo).

---

### 📅 8 de noviembre de 2026

**🍎 En simple:** día grande. Llegó el diseño de Vanessa y quedó en la app: **colores nuevos** (vino para Business y amarillo para Personal), **logo nuevo** y **Zaytun**, la mascota, que ahora es la cara del copiloto. Los **apartados** quedaron como en la app del banco, y **Zaytun propone cuánto apartar** cuando te pagan. Pusimos la clave de **Banxico** para el tipo de cambio oficial. Al final hicimos un repaso sincero de la app y decidimos: **no entra ninguna función más**. Mañana empezamos con el **video**.

- **Apartados a la medida (#46):** cada pago se puede repartir con montos que tú eliges ("$100 a Luz, $50 a Ahorro"), a mano con **Choose amounts** o pidiéndoselo a Zaytun, siempre con tarjeta de aprobación. Cada apartado muestra lo **juntado desde el principio**, como un saldo del banco. Son **virtuales**, como una libreta: no se mueve dinero.
- **PayPal México y el saldo:** revisamos que, desde el 25 sep 2019, PayPal México no deja tener saldo guardado y lo manda solo al banco (CLABE). Lo dicen notas de prensa de 2019; la página oficial no se pudo abrir. Por eso se corrigieron dos textos que decían que el dinero "se queda en PayPal".
- **Revisión en celular (#46):** nada se sale de lo ancho. Se arreglaron los ceros que salían en pesos ("MX$0.00") junto a montos en dólares y el campo Description, que era muy angosto. **USD quedó por defecto** (MXN se sigue pudiendo elegir) y el paso 1 del tutorial habla de clientes en el extranjero.
- **Colores y logo (#47):** toda la app toma el color del modo, ya no el azul marino estilo PayPal (eso también nos aleja de su marca). El amarillo es tan claro que con letra blanca no se lee, así que en lo amarillo la letra va oscura y los links van en mostaza oscuro. El logo pasó a azul marino muy oscuro con un punto amarillo.
- **Zaytun (#48):** un Cinnyris dibujado por Vanessa. Flota en la esquina de todas las pantallas, avisa con un **globito** y un puntito rojo cuando tiene una sugerencia, y es el mismo de la pestaña Copilot (su cara en el menú, en el chat y en el tutorial). La IA se presenta como Zaytun y el tutorial lo da él.
- **% opcional (#49):** en Edit plan el porcentaje ya no es obligatorio. Si un apartado no tiene %, Zaytun propone montos redondos al llegar un pago (en total, entre 10% y 20%). Para impuestos **nunca inventa** un monto: usa tu % o te pregunta.
- **Banxico (#50):** pusiste la clave en el `.env` y en Render, y funciona (18.6297 pesos por dólar). La fecha venía como "10/11/2026" y se corrigió a "2026-11-10" para que el jurado no la lea como 11 de octubre.
- **Repaso sincero:** como proyecto de hackathon, la app está por encima del promedio (IA que da el primer paso con permiso, uso a fondo de PayPal, el ángulo del CFDI). Como negocio todavía no está validada y depende de PayPal. Lo que más puede afectar ahora es un video confuso, no la app.
- **Guion del video, borrador 2:** una sola historia (te paga un cliente de Texas → Zaytun aparece → propone cuánto apartar y tu CFDI en dólares → apruebas), con Zaytun de protagonista.

**Decisiones del día:**
- **Ya no entra ninguna función nueva.** Solo video, Devpost, README, limpiar la demo y arreglar lo que esté roto.
- **Cómo se graba el video:** Claude graba la app con el navegador automático y tú pagas la factura a mano con la cuenta de prueba de Estados Unidos mientras se graba. La voz la graba una persona con el celular y se arma en CapCut; Claude hace los subtítulos. Primero, una grabación de prueba de una escena corta.
- **Saldo de Anthropic:** $14.65, alcanza hasta el 21 dic aun en el peor caso. No hace falta recargar por ahora.
- La versión completa de Zaytun (el chat abriéndose encima de cualquier pantalla) quedó en "Ideas guardadas".
- La "segunda duda" del 7 nov se quitó de la lista: no la recordabas.

**Lo aprendido:**
- Un color muy claro (como el amarillo) no aguanta letra blanca: hay que revisar el contraste antes de usarlo en botones.
- Cuando un comando trae un programa largo pegado adentro, Claude Code avisa de un posible borrado (`rm`) aunque no lo haya: es mejor crear el archivo primero y correrlo aparte.

**🔧 En técnico:**
- **#46:** `customAllocations` e `InvalidAllocationError` en `server/src/savings.ts`; `allocations` opcional en `POST /api/savings/payments/:id`; `review_payment` con `amounts`; total de siempre (`total`) por apartado. `DEFAULT_CURRENCY = 'USD'` en `client/src/lib/config.ts`.
- **#47:** tokens `brand-solid`, `brand-solid-hover` y `on-brand` en `client/src/index.css`, y la clase `on-brand-scope`, que convierte el "blanco" de adentro en la letra correcta del modo. `favicon.svg` en `#001435` con punto `#fcee52`.
- **#48:** `client/src/components/Zaytun.tsx` (`ZaytunAvatar`, `ZaytunBuddy`), imagen `client/public/zaytun.webp` (recorte de 256 px, 11 KB; el dibujo original no está en el repo). La IA se presenta como Zaytun (`server/src/ai/copilot.ts`).
- **#49:** `review_payments` acepta `amounts` por pago; `splitPayment` en `server/src/ai/tools.ts` valida nombres y totales; reglas para sugerir montos en el prompt; `planFacts` y `proposalFacts` en `server/src/ai/proactive.ts`. Probado con la IA de verdad y con un plan todo en 0%: propuso $1 por apartado en pagos de $20 y $4/$2/$4 en el de $50, y dejó fuera Taxes.
- **#50:** `server/src/exchangeRate.ts` convierte `DD/MM/AAAA` a `AAAA-MM-DD`.
- **#51:** esta bitácora, `docs/proyecto.md`, `CLAUDE.md` y `docs/video-script.md` (borrador 2).
- Las pruebas movieron datos solo en la compu (`server/data/savings.json`), siempre con respaldo, y quedaron como estaban. Render no se tocó.

### 📅 9 de noviembre de 2026

**🍎 En simple:** hicimos un **clip de prueba del video** con efectos estilo comercial (la app dentro de un celular en 3D, textos animados, acercamiento a Zaytun) y te encantó: es la base del video final. Luego **limpiamos las pantallas** para que no saturen: mismo diseño, menos cosas repetidas. Tu hermana lo aprobó con un "antes y después" en celular y computadora, y después pidieron regresar la tarjeta de preguntas para Zaytun, ahora del mismo alto que lo que tiene al lado. El tutorial se probó completo y no se rompió. Al final hicimos un repaso sincero: el proyecto está bien hecho, ganar es difícil (32 mil inscritos), pero vale la pena entregarlo bien.

- **Clip de prueba (12 s):** Claude grabó la app de Render (solo lectura) y le puso efectos con Remotion. Quedó guardado fuera del repo en `~/Documentos/vnv-video/` (el video, la "receta" y un `LEEME.md`). Reemplaza la idea de grabar la pantalla tal cual con OBS.
- **Pantallas más limpias (#52):** en Home se quitaron la etiqueta "BUSINESS/PERSONAL", el subtítulo largo y el botón Refresh grande (ahora es un icono); el link de la guía bajó al final. En Home Personal se quitaron la nota de "virtual" (sigue en Savings) y el aviso "You got paid!" (lo dice el botón de la tarjeta). En Savings, la nota quedó en una línea, "Collected" y "Left to spend" en una sola tarjeta y los apartados viejos agrupados.
- **Apartados viejos visibles (#53):** a pedido de tu hermana, "past set-asides" se ve abierto si son 3 o menos; con más, empieza cerrado. Se cuenta por cantidad porque la app no guarda cuándo se quitó cada uno.
- **Volvió "Try asking Zaytun" (#54):** la tarjeta grande regresó tal cual, con más preguntas (4 en Business, 5 en Personal) y del mismo alto que la columna de al lado. Para que ese alto no cambie, Home muestra siempre las **5 facturas** y los **3 pagos** más nuevos; lo demás se ve en "See all".
- **Una confusión aclarada:** la app de tu compu y la de Render guardan datos en lugares distintos (archivo contra Neon). Tus apartados (Saving, Gas, Suscriptions) siguen en Render; no se borró nada.
- **Premios:** los requisitos generales se cumplen todos. Los de patrocinador solo dicen "mejor uso": APIMatic es el más defendible (el SDK da los números de la app); Render es más débil. AG Grid queda fuera.

**Decisiones del día:**
- El video sigue el **estilo del clip de prueba** (efectos con Remotion); Claude graba la app y tú pagas a mano.
- El guion borrador 2 te gustó; antes de grabar lo revisas con tu hermana y hacen cambios. **El video empieza mañana.**
- Sugerencia para el guion: abrir con "Zaytun habla primero cuando te pagan", no con "crear una factura".
- AG Grid no entra (no estaban listos el video ni Devpost y ya no entran funciones nuevas).

**Lo aprendido:**
- Para cambios de diseño, un "antes y después" con los mismos datos hace fácil que el equipo apruebe.
- Una pantalla quieta no genera cuadros en la grabación automática: hay que grabar algo que se mueva.
- Siempre aclarar si se está viendo la app local o la de Render: tienen datos distintos.

**🔧 En técnico:**
- **#52:** `HomeHeader` sin `eyebrow`; `RefreshButton` (icono) en `client/src/components/ui.tsx`; `GuideToggle` en `Guide.tsx` (el link va al final de Home y `Guide` regresa `null` si está apagada). Savings: una tarjeta con `sumTotals`, apartados `percent === null` en un `<details>`.
- **#53:** `PAST_OPEN_MAX = 3` en `Savings.tsx` (`<details open>`).
- **#54:** `TryAsking` de vuelta (`Card` con `flex flex-col` para estirarse; la nota con `mt-auto`); `RECENT_INVOICES = 5` y `RECENT_PAYMENTS = 3` en `Overview.tsx`; "See all" de pagos lleva a `/invoices`.
- Pruebas con Chrome sin ventana (`puppeteer-core` en el scratchpad): los 14 pasos del tutorial encuentran su objetivo a 390×844 y 1440×900, y el link de la guía la prende. Typecheck y `oxlint` limpios en cada PR.
- Los datos de Render no se modificaron; solo se leyeron (`GET /api/savings`).

---

### 📅 10 de noviembre de 2026

**🍎 En simple:** día del video. Primero dejamos el **guion final** con tus palabras (sin tecnicismos: "las apps de dinero son confusas, la nuestra no"). Después mejoramos a Zaytun: ahora **explica las pantallas** de la app y **no contesta cosas que no tienen que ver** (le pediste un programa en Python y ya dice que no, amable). Cambiamos la licencia a **VNV Tech** con los tres nombres y arreglamos la **fecha de Banxico** en el CFDI. Luego **grabamos todo**: tú pagaste con OBS y Claude grabó la app sola. Salieron tres versiones del video: la **2 (celular en 3D) es la buena**; la 3 (app a pantalla completa) no te gustó. Mañana: tu voz, música, subtítulos y entregar.

- **Guion (borrador 3):** en `docs/video-script.md`. Unas 150 palabras de voz (≈1:10), armadas con lo que tú quieres que se sienta: bonita, simple, para freelancers, "el inicio de algo grande". Se quitó "cumplir con el SAT" de la voz (no lo podemos afirmar).
- **Zaytun explica la app (#56):** sabe qué hay en cada pantalla y qué botón tocar, y nombra los botones en inglés, como salen en la app, aunque le escribas en español.
- **Zaytun no se sale del tema (#58):** programas, recetas o tareas → una frase amable y ofrece algo de la app. Saludos y "¿qué es un CFDI?" sí los contesta.
- **Licencia (#57):** "VNV Tech (Víctor, Vanessa and Natalia)", solo nombres de pila.
- **Banxico (#59):** antes salía un tipo de cambio con fecha de pasado mañana (Banxico lo fecha por el día de pago); ahora usa el de hoy o antes.
- **Demo de Render:** plan de apartados *Taxes 30%*, *Savings* y *Electricity* (adiós Gas y "Suscriptions"). Facturas nuevas de *Lone Star Apps*: #0029 y #0031 ($1,000 c/u, pagadas, con CFDI en USD) y #0030 ($450, **sin pagar a propósito**, para que el jurado vea "quién te debe"). Noviembre: $2,090 cobrados.
- **Video:** todo fuera del repo, en `~/Documentos/vnv-video/final/` (`out/vnv-copilot-v2.mp4` es la buena; dura 2:18). El pago lo grabaste con OBS; se recortaron la barra de favoritos y el aviso de pantalla completa.
- **Reglas de Devpost (revisadas):** menos de 3 min, mostrar la app funcionando, en YouTube **público**, sin marcas ni música con copyright.

**Decisiones del día:**
- Guion final: el borrador 3, con tus palabras. Narras tú.
- El video base es la **versión 2** (celular en 3D).
- **Diciembre:** sin tocar código. El 1 de dic pagas 3–4 facturas chicas con la cuenta de EE. UU. y **no las respondes**, para que el jurado vea dinero en Home y pruebe el ticket de Zaytun; a mitad de mes, revisar y pagar 2 más.
- Las facturas "QA" se quedan (PayPal no deja borrar facturas pagadas).

**Lo aprendido:**
- Escribir el guion con las palabras del equipo funciona mejor que adivinar "la esencia".
- Al grabar con órdenes automáticas, nunca repetir el nombre de una toma: se graba encima y se pierde la buena.
- Un "rechazar" a medias puede haber hecho ya parte del trabajo: revisar antes de repetir.

**🔧 En técnico:**
- **#56/#58:** `systemPrompt()` en `server/src/ai/copilot.ts` con un mapa de pantallas y botones, la regla de citar la interfaz en inglés y la de quedarse en tema. Probado en local con preguntas buenas y malas.
- **#59:** `server/src/exchangeRate.ts` pide `SF60653/datos/{hoy-10}/{hoy}` (hora de CDMX) y usa el último dato válido, en vez de `oportuno`.
- **Video:** Remotion 4.0.542 (`src/Video.jsx` v1/v2, `src/Journey.jsx` v3) + `live.mjs` / `live-desk.mjs` (grabadoras de `puppeteer-core` manejadas por órdenes en un archivo). Render ~20 min por versión.
- Typecheck y `oxlint` limpios en cada PR.

---

## ✅ ¿Qué te toca hacer a ti?

**Mañana, 11 nov (entregar con un día de margen):**
- [ ] Grabar la **voz** con el celular (texto en `docs/video-script.md`, partes "Narración"), en un cuarto sin eco, con 2 segundos de pausa entre escenas. Decirle a Claude dónde quedó el archivo.
- [ ] Decirle a Claude **qué no te gustó** de la versión 3 y qué retocar de la 2.
- [ ] Elegir **música** sin copyright (Biblioteca de audio de YouTube) o dejar que Claude proponga.
- [ ] Subir el video final a **YouTube como Público** (Claude te dice el título y la descripción).
- [ ] Devpost: link del video, capturas, marcar premios y **Submit**.
- [ ] Cambiar Render para que publique desde `main`.
- [x] ~~Guion final~~ · ~~Limpieza de la demo~~ · ~~Qué hacer en diciembre~~ · ~~Grabar las tomas~~ (10 nov)

**1 de diciembre (en la mañana):**
- [ ] Prender el **"despertador"** de Render.
- [ ] Pagar **3–4 facturas chicas** con la cuenta de EE. UU. y **no responderlas** (para que el jurado tenga qué probar). A mitad de mes, revisar y pagar 2 más si ya las respondieron.

**Para seguir:**
- [ ] Enseñarles a **Vanessa** y **Natalia** cómo quedaron los colores, el logo y Zaytun.
- [ ] Que tu hermana **acepte la invitación** en Devpost antes del 11 de noviembre.
- [ ] Revisar en Render → **Billing** las horas usadas y que no haya otro servicio gratis prendido.
- [ ] Opcional: poner una **alerta de gasto** en console.anthropic.com → Billing.
- [ ] Preguntarles a Vanessa y Natalia si quieren aparecer en el aviso de autoría del código (`LICENSE`).
- [x] ~~Lo último del diseño de Vanessa~~ (8 nov: colores, logo y Zaytun)
- [x] ~~Decirle a Claude el saldo de Anthropic~~ (8 nov: $14.65, alcanza)
- [x] ~~Token de Banxico en el `.env` y en Render~~ (8 nov)
- [x] ~~La "segunda duda"~~ (se quitó: no la recordabas)
- [x] ~~`CHAT_DAILY_LIMIT` = 50 en Render~~ (7 nov)

**Con Claude:**
- [ ] **10–11 nov:** grabar todo con el estilo del clip de prueba (Claude la app con efectos, tú el pago).
- [ ] Grabar la voz y armar el video; Claude hace los subtítulos en inglés.
- [ ] **Devpost:** borrador listo (7 nov); falta el link del video, las capturas, los párrafos de APIMatic y Render, marcar los premios y darle **Submit**.
- [x] ~~Grabación de prueba~~ (9 nov: clip de 12 s en `~/Documentos/vnv-video/`)
- [x] ~~Pantallas más limpias~~ (9 nov, #52–#54)
- [ ] Agregar al **README** el link del video y capturas.
- [ ] **11 de noviembre:** limpiar la demo, pasar todo a `main` y entregar, con un día de margen.
- [ ] AG Grid: solo si el video y Devpost ya están.
- [x] ~~Guion borrador 2 con Zaytun~~ (8 nov)
- [x] ~~Revisar cómo se ve en celular (6d)~~ (8 nov; quedan detalles menores)
- [x] ~~README en inglés~~ (4 nov) y al día con Zaytun (8 nov)
- [x] ~~CFDI en dólares y prueba completa con cuenta de Estados Unidos~~ (4 nov)

**Antes de entregar (después ya no se puede tocar nada) y durante la revisión del jurado (1–21 dic):**
- [ ] Dejar la demo presentable: que las facturas "QA ..." (#0020–#0024) no estorben, **3 o 4 pagos sin responder** y una factura pagada en dólares, para que el jurado pruebe el ticket y el CFDI.
- [ ] Prender el **"despertador"** (cron-job.org o UptimeRobot) del 1 al 21 de dic, y revisar las horas en Render → **Billing**.
- [ ] Cambiar Render para que publique desde `main` en vez de `dev`.

**Siempre:**
- [ ] Dar clic en **Merge** cuando te pida aceptar una solicitud.
- [ ] Para prender la app: `npm run dev`. Para que los pagos se actualicen solos también hace falta el túnel; dile a Claude *"prende todo"*.
- [ ] En tu compu, **no** pongas `DATABASE_URL` en el `.env`: esa variable solo va en Render.

**Sobre impuestos:** el equipo no tiene asesoría de finanzas por ahora. Las preguntas pendientes están en [`proyecto.md`](proyecto.md), sección 6, por si algún día consiguen un contador.

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

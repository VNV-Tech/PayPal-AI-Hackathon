# VNV Copilot: contexto para Claude

Claude Code lee este archivo solo al empezar cada sesión. Aquí van las reglas
que no cambian y cómo arrancar. **Qué se hizo y qué sigue** está en la
bitácora de `docs/guia-lo-que-se-hizo.md` (sección 7): léela al empezar el día.
Este archivo es público (el repo es público): nada secreto aquí.

## Qué es

Copiloto financiero con IA para freelancers mexicanos, hecho para el PayPal AI
Hackathon (Devpost). La IA da el primer paso cuando te pagan. Cobra con PayPal
Invoicing, se actualiza solo con webhooks, aparta impuestos (modo Personal) y
emite facturas del SAT (CFDI) con Facturama. **Desde el 4 nov**, el caso
principal son clientes en el extranjero que pagan en USD; México va en segundo lugar. Entrega: **12 nov 2026, 12:00 PT
(14:00 CDMX)**. El jurado revisa del 1 al 15 dic, pero **la demo, las cuentas
de prueba y los créditos deben seguir activos hasta el 21 dic** (anuncio de
ganadores; correo de Devpost).

Detalle de pantallas, arquitectura y reglas de diseño: `docs/proyecto.md`.

## Equipo

- **Víctor**: líder técnico. Aprueba y fusiona los PRs. Explicarle en
  **español sencillo** (con ejemplos "de manzanas") y terminar siempre con
  **qué tiene que hacer él**.
- **Vanessa**: dirección creativa al 100%. Ella decide cómo se ve la app. No
  rediseñar por cuenta propia.
- **Natalia**: estrategia, historia, pitch y video.

## Reglas que no se rompen

- **Solo PayPal Sandbox, nunca live.** Está bloqueado en `server/src/config/env.ts`.
  Facturama también es solo sandbox (`server/src/facturama.ts`).
- **La IA nunca ejecuta acciones sola**: lee libremente, pero todo lo que
  cambia algo va como tarjeta de aprobación (`ACTION_TOOLS` en `server/src/ai/tools.ts`).
- **Secretos**: nunca imprimir ni subir el `.env`. Revisar si una variable está
  puesta sin mostrar su valor. Nunca poner `ANTHROPIC_API_KEY` en el perfil de
  la terminal ni en `~/.claude/settings.json`.
- **No copiar la marca de PayPal** (logo, diseño tal cual): las reglas del
  hackathon lo prohíben. Estilo parecido, marca propia.
- **Datos personales**: la demo es pública. Usar datos de prueba del SAT; nada
  de correos o RFC reales en la versión publicada.
- **Enfoque**: seguir el plan; las ideas nuevas se anotan en `docs/proyecto.md`
  ("Ideas guardadas") en vez de construirlas. **Desde el 8 nov no entra
  ninguna función nueva** (decisión final de Víctor, tras los PRs #46–#49):
  solo video, Devpost, README, limpiar la demo y arreglar lo que esté roto.
- **Después del 12 nov (14:00 CDMX) no se toca el repo ni el video** hasta el
  21 dic: Devpost bloquea la entrega y pide no editar nada enlazado. Tampoco
  hay PRs de bitácora; si hace falta, se anota fuera del repo.
- **Antes de agregar o quitar algo**, decirle a Víctor con sinceridad si
  conviene o no (beneficio contra tiempo, costo y riesgo) y esperar su OK.

## Cómo trabajamos

- Ramas: `main` ← `dev` ← `victor` / `vanessa` / `natalia`. Claude trabaja en
  `victor`, abre PR a `dev` y Víctor lo fusiona. Después: fast-forward de
  `victor` y, si no tienen commits propios, también de `natalia` y `vanessa` a `dev`.
- Cada PR actualiza `docs/proyecto.md` si cambia algo visible o del plan.
- **Al terminar el día**: entrada nueva en la bitácora de
  `docs/guia-lo-que-se-hizo.md` (simple primero, luego técnico), en un PR solo de docs.
- Antes de un PR: `npm run typecheck` y `npx oxlint` dentro de `client/`.
- Código: comentarios en español, como el resto del código. Textos de la
  interfaz en inglés (jurado internacional), salvo la página pública del
  cliente para el CFDI (`/factura/:token`), que va en español.

## Arrancar todo ("prende todo")

1. `npm run dev`: servidor en :3000 y cliente en :5173.
2. Webhooks (para que los pagos se actualicen solos): `npm run tunnel`, copiar
   la URL `https://….trycloudflare.com` y correr
   `npm run paypal:webhook -- <url>`. La URL cambia cada vez, así que hay que
   repetirlo siempre.
3. Al cerrar: apagar el túnel. Mientras está prendido, la app local es accesible desde internet.

El script del webhook reescribe `PAYPAL_WEBHOOK_ID` en el `.env` local, pero
solo borra webhooks viejos de `trycloudflare.com`: el de Render no se toca.

## La versión publicada (Render)

- https://vnv-copilot.onrender.com · servicio **VNV-Copilot** (plan Free,
  Oregon). Publica sola la rama `dev` al fusionar un PR (~5 min). Antes de
  entregar: cambiarla a `main`.
- Build `npm ci --include=dev && npm run build` · start `npm start`.
- Las variables viven en Render → Environment y **solo Víctor** las ve o
  cambia; Claude no tiene acceso. Si el chat dice "unavailable", pedirle la
  línea `[claude] ...` de los Logs (401 = clave, 404 = modelo).
- Plan gratis: se duerme a los 15 min (750 h gratis al mes; dormida no gasta).
  Plan: un "despertador" externo solo para el video y del 1 al 21 de dic
  (504 h; cada mes se cuenta aparte).
- Apartados y datos fiscales se guardan en **Neon** (Postgres gratis, proyecto
  `vnv-copilot`, Oregon) con `DATABASE_URL` en Render. En local, dejarla
  vacía: así se usan archivos y las pruebas no se mezclan con la demo. Al
  arrancar, el log dice `data in postgres` o `data in files`.
- Para revisar cómo se ve en celular: Chrome headless con `puppeteer-core`
  (instalado en el scratchpad, no en el proyecto) a 390×844. La app tiene
  conexiones en vivo (SSE): esperar con `waitUntil: 'load'`, no `networkidle`.

Si una pantalla dice "Not found" tras cambios grandes, reiniciar `npm run dev`.

## Mapa rápido

- `server/src/paypal/`: Invoicing (REST), Transaction Search (SDK oficial
  `@paypal/paypal-server-sdk`, cuenta para el premio de APIMatic), overview.
- `server/src/ai/`: `copilot.ts` (chat + aprobaciones + sugerencias; Sonnet
  5.5 con caché de prompts, anota `[claude] ...` con los tokens de cada llamada),
  `tools.ts` (herramientas; `review_payments` = ticket con casillas,
  `list_payments` = historial de pagos), `proactive.ts` (la IA da el primer
  paso al pagar y arma el ticket del botón "Review all with AI" de Savings).
- `server/src/taxInfo.ts` + `facturama.ts`: datos fiscales y CFDI (en MXN, y en
  USD para clientes en el extranjero, con `exchangeRate.ts`).
- `server/src/savings.ts`: apartados. `server/src/store.ts`: guardado en Neon
  (tabla `app_store`, una fila por "archivo") o, sin `DATABASE_URL`, en
  `server/data/*.json` (no se sube a git).
- `client/src/lib/tour.ts`: tutorial de bienvenida (14 pasos, sale la primera
  vez; es la forma principal de enseñar la app). `lib/journey.ts`: la guía
  (reglas, sin IA; **apagada por defecto**, se prende en Home). `lib/mode.ts`:
  modos Business (vino) / Personal (amarillo). `index.css`: colores y letra.
- `client/src/components/Zaytun.tsx`: **Zaytun**, la mascota (un Cinnyris de
  Vanessa). Es el copiloto: flota en todas las pantallas, avisa con un globito
  y es su cara en el chat. La IA también se presenta como Zaytun.

## Estado conocido

- **Costos de IA:** la app usa ~$10 de créditos de la API de Anthropic
  (~1 centavo por mensaje, tope `CHAT_DAILY_LIMIT`: 50 al día en Render desde
  el 7 nov, ~$0.50 el peor día). Víctor programa con
  Claude Pro: son cuentas separadas.
- **AWS Bedrock descartado (30 oct):** AWS contestó el caso, pero hubo
  complicaciones y no se usará; la IA sigue con Anthropic directo. Los restos
  (`test.js`, `@anthropic-ai/bedrock-sdk` y las llaves de AWS del `.env`) ya
  se borraron.
- Mientras Vanessa y Natalia no estén disponibles, **Víctor decide** (también
  el diseño); en sus reuniones se ajusta lo que ellas pidan.
- **Diseño de Vanessa (8 nov), ya en la app:** vino `#882336` (Business) y
  amarillo `#FCEE52` (Personal) en toda la app (barra y tarjeta grande
  incluidas), logo en azul marino muy oscuro con punto amarillo y **Zaytun**,
  la mascota (un Cinnyris), que es la cara del copiloto. En lo amarillo la
  letra va oscura (con blanca no se lee).
- El conector MCP de PayPal (plugin) falla desde el 27 oct (`Unsupported cache
  mode: default`; el 28 en la noche, `SSE error ... (500)` al abrir). Es del
  lado de PayPal. El token se renueva con `npm run paypal:token` (dura ~8 h y
  Claude Code solo lo lee al abrirse); probar con `/paypal:setup`. La app no
  depende de él.
- Pendiente chico: el copiloto contestó una vez en español a una pregunta en
  inglés.
- **Jurado en diciembre (decidido el 10 nov):** Home y Savings solo cuentan
  pagos del mes en curso. Sin tocar código: el 1 de dic Víctor prende el
  "despertador" y paga 3–4 facturas chicas con la cuenta de EE. UU. sin
  responderlas (el jurado no puede pagar; prueba el ticket y el CFDI). A
  mitad de mes, revisar y pagar 2 más.
- `main` recibió una copia de `dev` el 29 oct (#29, desde la rama de Vanessa).
  `main` solo debe actualizarse desde `dev`.
- **Validación (4 nov):** no hay asesoría de finanzas ni grupo de freelancers.
  Dos freelancers prefieren transferencia con clientes mexicanos. No afirmar
  que la app cumple con el SAT ni que hay usuarios que la pidan. Entregar sí o
  sí; si sigue como negocio se decide después del 12 nov.
- **CFDI en USD:** excepción a "no más funciones", decisión de Víctor. El
  usuario elige IVA y país; la app nunca decide el IVA. `BANXICO_TOKEN`
  puesto en el `.env` y en Render (8 nov) y probado: tipo de cambio FIX
  oficial; si Banxico falla, usa una referencia del BCE.
- **Para el video:** pagar con la cuenta de prueba de **Estados Unidos**; con
  Test Buyer (mexicana), PayPal muestra el cobro en pesos.
- **Demo de Render (10 nov):** plan *Taxes 30%*, *Savings*, *Electricity*.
  Lone Star Apps: #0029 y #0031 pagadas con CFDI en USD; #0030 ($450) sin
  pagar a propósito. Las "QA" #0020–#0024 se quedan (PayPal no borra pagadas).
- **Saldo de Anthropic (8 nov): $14.65.** Alcanza hasta el 21 dic aun en el
  peor caso (~$10.50). Recargar solo si baja de ~$11 antes del 1 dic.
- **Video final (12 nov): público en YouTube,
  <https://youtu.be/8-Zf7jrJ-nc>** (2:27). Es la **v4** (`src/Promo.jsx`):
  fondo blanco, palabras grandes, la app en una ventana inclinada en 3D.
  **Con voz** (la hermana de Víctor lee lo que sale en pantalla) sobre
  *Good Mornin' Miss Eliza* a volumen fijo. Todo fuera del repo en
  `~/Documentos/vnv-video/final/` (`LEEME.md` dice cómo rehacerlo); el
  archivo subido es `out/VNV-Copilot-FINAL.mp4`. El guion final está en
  `docs/video-script.md`. El README ya trae el video y capturas
  (`docs/img/`). Falta: Devpost y Submit.
- **Premios de patrocinador:** solo dicen "mejor uso". APIMatic (SDK de
  Transaction Search) es el más defendible; Render, más débil. Explicarlos en
  Devpost y marcar las casillas de premios al dar Submit.
- **Pendiente de Víctor:** que su hermana acepte la invitación de Devpost.
- **Devpost:** proyecto en borrador; falta pegar el link del video y dar
  Submit. Textos fuera del repo en `~/Documentos/devpost-*.txt`.
- Premio de AG Grid: **descartado** (9 nov): el video y Devpost no estaban
  listos y ya no entran funciones nuevas.

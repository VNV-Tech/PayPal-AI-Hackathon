# VNV Copilot: contexto para Claude

Claude Code lee este archivo solo al empezar cada sesión. Aquí van las reglas
que no cambian y cómo arrancar. **Qué se hizo y qué sigue** está en la
bitácora de `docs/guia-lo-que-se-hizo.md` (sección 7): léela al empezar el día.
Este archivo es público (el repo es público): nada secreto aquí.

## Qué es

Copiloto financiero con IA para freelancers en México, hecho para el PayPal AI
Hackathon (Devpost). Cobra con PayPal Invoicing, se actualiza solo con webhooks,
aparta impuestos (modo Personal), emite facturas del SAT (CFDI) con Facturama y
la IA da el primer paso cuando te pagan. Entrega: **12 nov 2026, 12:00 PT
(14:00 CDMX)**. El jurado revisa del 1 al 15 dic: la demo debe seguir en línea.

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
  ("Ideas guardadas") en vez de construirlas.

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

Si una pantalla dice "Not found" tras cambios grandes, reiniciar `npm run dev`.

## Mapa rápido

- `server/src/paypal/`: Invoicing (REST), Transaction Search (SDK oficial
  `@paypal/paypal-server-sdk`, cuenta para el premio de APIMatic), overview.
- `server/src/ai/`: `copilot.ts` (chat + aprobaciones + sugerencias),
  `tools.ts` (herramientas), `proactive.ts` (la IA da el primer paso al pagar).
- `server/src/taxInfo.ts` + `facturama.ts`: datos fiscales y CFDI.
- `server/src/savings.ts`: apartados. `server/src/store.ts`: guardado en
  `server/data/*.json` (no se sube a git; en Render se borra al redesplegar).
- `client/src/lib/journey.ts`: la guía (reglas, sin IA). `lib/mode.ts`: modos
  Business/Personal. `lib/tour.ts`: tutorial. `index.css`: colores y letra.

## Estado conocido

- El conector MCP de PayPal (plugin) falla con `Unsupported cache mode: default`
  desde el 27 oct. Es del lado de PayPal: el token responde 200 por REST. La app
  no depende de él.
- Premio de AG Grid: activar su prueba de 45 días **entre el 1 y el 5 de
  noviembre** para que dure hasta el 15 de diciembre (si el equipo va por él).

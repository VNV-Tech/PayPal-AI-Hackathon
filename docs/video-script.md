# Guion del video (borrador 3, 10 nov)

> **Cambios contra el borrador 2 (8 nov):** misma historia y mismas tomas,
> pero la narración ya **no tiene tecnicismos**: se escribe para alguien que
> quiere comprar la app, no para un programador. Fuera de la voz quedan
> "webhook", "SDK", "CFDI", "set-aside", "VAT" y "Banxico". Lo técnico sigue
> en el video, pero **solo como texto chiquito en pantalla** (el jurado sí
> califica cómo está hecho, y el premio de APIMatic necesita ver el SDK).
> El video abre con Zaytun hablando primero, no con "crear una factura".
>
> **10 nov:** Víctor no pudo reunirse con su hermana; el guion queda en sus
> manos. Narra probablemente Víctor.
>
> **Estilo aprobado (9 nov):** el del clip de prueba en `~/Documentos/vnv-video/`
> (la app dentro de un celular en 3D, textos animados y acercamientos, hecho
> con Remotion).

- **Duración objetivo:** 2:45 (el jurado solo ve 3:00; dejamos 15 s de margen).
- **La esencia (10 nov, en palabras de Víctor):** las apps de pago son confusas (muchas pantallas y cosas que no sabes para qué son); la nuestra es bonita, simple e intuitiva, para cualquier persona. Facturar sin pasos extra, saber cuánto dinero tienes de verdad, tus datos fiscales una sola vez, y todo protegido. Hecha para freelancers: un mercado chico que puede ser el inicio de algo grande. Que la gente **disfrute entender sus finanzas**.
- **Escena 1 (idea visual):** un remolino de pantallas y botones genéricos, sin marcas reales, que se limpia y deja solo nuestra app.
- **Narración:** ~150 palabras (≈ 1:10 de voz). Menos voz, más app: que la pantalla, los textos animados y la música cuenten el resto. Frases cortas, con pausas.
- **Una sola historia:** *te paga un cliente de Texas → Zaytun habla primero → te propone cuánto guardar y tu factura para el SAT → dices que sí.* Todo lo demás se ve de pasada.
- **Regla de la voz:** si tu mamá no lo entendería, no va en la voz. Va como texto chiquito en pantalla o en Devpost.
- **Voz:** una persona del equipo, grabada con el celular en un cuarto sin eco.
- **Música:** sin copyright (la biblioteca gratis de CapCut o de YouTube), bajita.
- **Datos de la demo:** todo de prueba. Nada de correos ni RFC reales.
- **Honestidad:** no decir que la app "cumple con el SAT" ni que hay usuarios. Se dice lo que hace, no lo que promete.

---

## Escena 1. El gancho (0:00–0:12)

**En pantalla:** la app en el celular 3D. Le sale a Zaytun el globito
*"Zaytun has a suggestion"* con el puntito rojo. Texto grande encima:
*"You just got paid. Now what?"*

**Narración:**
> Money apps are confusing. Too many screens, too many buttons… and you never
> know what half of them are for. We wanted the opposite.

## Escena 2. Conoce a Zaytun (0:12–0:25)

**En pantalla:**
1. Zoom suave a Zaytun flotando en la esquina.
2. Corte al paso 1 del tutorial: *"Hi! I'm Zaytun, your copilot 👋"*.

Texto: *"Zaytun makes the first move. You make the call."*

**Narración:**
> This is VNV Copilot, made for freelancers. And this is Zaytun: your first
> time here, it shows you around, screen by screen.

## Escena 3. Cobrar con un mensaje (0:25–0:50)

**En pantalla:**
1. Tocar a Zaytun → se abre el chat. Escribir:
   *"Invoice Lone Star Apps at (correo de la cuenta de prueba de EE. UU.) for
   1000 USD for backend development, due in 15 days"*.
2. Aparece la **tarjeta de aprobación**. Pausa de 1 segundo sobre ella.
3. Clic en **Approve** → *"Invoice sent"*.
4. Ir a **Invoices**: la factura aparece como **Sent**.

**Texto en pantalla (chico):** *"Real PayPal invoice"*

**Narración:**
> Bill a client with one message. Zaytun writes the PayPal invoice… and
> waits for your OK.

## Escena 4. Te pagan y Zaytun habla primero (0:50–1:28) ⭐

**En pantalla:**
1. Corte: la página de pago de PayPal con la **cuenta de prueba de Estados
   Unidos**. Pagar.
2. Volver a la app **sin recargar**: la factura cambia sola a **Paid**.
3. A Zaytun le sale el globito *"Zaytun is on it…"* y luego *"Zaytun has a
   suggestion"* con el puntito rojo.
4. Tocar a Zaytun: su mensaje con la **tarjeta para apartar** (montos para
   cada apartado) y la pregunta de la factura del SAT.

**Texto en pantalla:** grande *"You didn't lift a finger."* · chico
*"PayPal webhooks"*

**Narración:**
> When they pay, Zaytun speaks first: here's what to set aside, and here's
> your tax invoice. No extra steps.

## Escena 5. Decir que sí y listo (1:28–2:02)

**En pantalla:**
1. Clic en **Approve** en la tarjeta del apartado.
2. Contestar en el chat: *"Yes, 0% VAT, the client is in the United States"*.
3. Aparece la tarjeta **Issue CFDI** (se ve el tipo de cambio) → **Approve**.
4. Abrir **Tax info** de esa factura: *CFDI issued ✓*, abrir el **PDF** y
   mostrarlo 2 segundos.

**Texto en pantalla:** grande *"Seconds, not an afternoon."* · chico
*"Sandbox: test documents, no legal validity."*

**Narración:**
> Client abroad? Your invoice comes out in dollars. Client in Mexico? Enter
> your tax info once, and that's it.

## Escena 6. Lo que de verdad es tuyo (2:02–2:20)

**En pantalla:**
1. Cambiar a modo **Personal** (toda la app se pone amarilla, Zaytun viene
   también).
2. **Savings:** los apartados con *"Saved so far"*.
3. Home Personal: *"Left to spend"* en grande.

**Narración:**
> And in Personal mode, you finally know how much money is really in your
> hands.

## Escena 7. Por qué confiar (2:20–2:37)

**En pantalla:** el diagrama simple, con texto chico y rápido para el jurado:
*PayPal Invoicing · PayPal Server SDK · Webhooks · Claude · Facturama*.
Resaltar en grande: *"Your approval is built in."*

**Narración:**
> Built on PayPal, and protected by your approval: nothing happens without
> you.

## Escena 8. Cierre (2:37–2:45)

**En pantalla:** Zaytun grande, nombre de la app, link de la demo y del repo.
*"VNV Copilot — vnv-copilot.onrender.com"*

**Narración:**
> Simple. Beautiful. Made for freelancers… and maybe the start of something
> bigger. VNV Copilot, with Zaytun. The AI makes the first move. You make the
> call.

---

## Antes de grabar (checklist)

- [ ] Prender el **"despertador"** de Render y abrir la app una vez para que despierte.
- [x] Dónde se graba: **Render** (decidido el 9 nov: el webhook ya está fijo, no hace falta túnel).
- [ ] **Plan de apartados** para el video: *Taxes 30%*, *Savings* y *Electricity* sin % (así se ve que Zaytun propone montos). Hoy Render tiene Saving, Gas y "Suscriptions": cambiarlo al limpiar la demo, con OK de Víctor.
- [ ] **Responder los pagos que esperan** en Savings antes de grabar. Si no, Zaytun los mete al mismo ticket y la escena 4 se alarga.
- [ ] Tutorial ya visto y la guía apagada (para que no salgan solos).
- [ ] Navegador limpio (sin pestañas ni favoritos personales), pantalla 1920×1080, zoom 110–125%.
- [ ] Usuario y contraseña de la **cuenta de prueba de Estados Unidos** a la mano (no salen en el video).
- [ ] Ensayar una vez completo sin grabar. El chat tiene tope de 50 mensajes al día en Render.

## Lista de tomas

| Toma | Quién la graba | Cómo |
| --- | --- | --- |
| Escenas 3, 4 y 5 (el flujo completo) | Claude graba la app, Víctor paga | Claude graba con el navegador automático (no hay OBS) mientras Víctor paga a mano con la cuenta de prueba de EE. UU.: cobrar → pagar → Zaytun → aprobar → CFDI |
| Escenas 1, 2 y 6 | Claude | Tomas cortas con el navegador automático |
| Efectos (celular en 3D, textos animados, acercamientos) | Claude | Con Remotion, como el clip de prueba del 9 nov |
| Escena 7 (diagrama) | Claude | Imagen limpia del diagrama |
| Escenas 2 y 8 (títulos) | Claude | Animados en Remotion |
| Narración | Probablemente Víctor | Voz con el celular; se pone encima del video ya armado |
| Subtítulos en inglés (`.srt`) | Claude | A partir de esta narración, ya con los tiempos finales |

## Por decidir

- [x] Revisión de la historia: queda en manos de Víctor (10 nov; no hubo reunión).
- [ ] Víctor aprueba el borrador 3 (sin tecnicismos).
- [ ] Quién narra (probablemente Víctor).
- [x] Nombre del cliente de Texas: *Lone Star Apps* (inventado; 9 nov).
- [x] Grabar en Render (9 nov).

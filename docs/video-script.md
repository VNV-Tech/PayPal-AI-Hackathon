# Guion del video (borrador 2, 8 nov)

> **Cambios contra el borrador 1 (7 nov):** Zaytun es el protagonista, una
> sola historia (cliente de Texas), colores nuevos (vino y amarillo), Zaytun
> propone cuánto apartar y el tipo de cambio sale de Banxico. Se quitó la
> escena de clientes en México: queda en una frase.
>
> **Para Natalia:** la historia la puedes cambiar; las notas en español son
> para el equipo y la narración va en inglés. Mientras no estés, decide Víctor.

- **Duración objetivo:** 2:45 (el jurado solo ve 3:00; dejamos 15 s de margen).
- **Narración:** ~270 palabras, a ritmo tranquilo (~130 por minuto ≈ 2:05 de voz; el resto son pausas y tomas).
- **Una sola historia:** *te paga un cliente de Texas → Zaytun aparece → te propone cuánto apartar y tu CFDI en dólares → apruebas.* Todo lo demás se ve de pasada.
- **Voz:** una persona del equipo, grabada con el celular en un cuarto sin eco.
- **Música:** sin copyright (la biblioteca gratis de CapCut o de YouTube), bajita.
- **Datos de la demo:** todo de prueba. Nada de correos ni RFC reales.

---

## Escena 1. El problema (0:00–0:12)

**En pantalla:** Home en modo Business (barra vino), quieta. Texto grande
encima: *"You just got paid. Now what?"*

**Narración:**
> You're a freelance developer in Mexico, and a client in Texas just paid you
> a thousand dollars. Great. But the job isn't done: you still need to set
> money aside, and issue a Mexican tax invoice to report that income.

## Escena 2. Conoce a Zaytun (0:12–0:25)

**En pantalla:**
1. Zoom suave a Zaytun flotando en la esquina.
2. Corte al paso 1 del tutorial: *"Hi! I'm Zaytun, your copilot 👋"*.

Texto: *"The AI makes the first move. You make the call."*

**Narración:**
> Meet Zaytun, the AI copilot inside VNV Copilot, built on PayPal. Zaytun
> makes the first move when you get paid. But it never acts on its own: every
> change needs your approval.

## Escena 3. Cobrar hablando con Zaytun (0:25–0:50)

**En pantalla:**
1. Tocar a Zaytun → se abre el chat. Escribir:
   *"Invoice Lone Star Apps at (correo de la cuenta de prueba de EE. UU.) for
   1000 USD for backend development, due in 15 days"*.
2. Aparece la **tarjeta de aprobación**. Pausa de 1 segundo sobre ella.
3. Clic en **Approve** → *"Invoice sent"*.
4. Ir a **Invoices**: la factura aparece como **Sent**.

**Narración:**
> I just tell Zaytun who to bill. It drafts a real PayPal invoice, in dollars,
> and shows me an approval card. Nothing happens until I press Approve. Now
> the invoice is on its way through PayPal.

## Escena 4. Te pagan y Zaytun habla primero (0:50–1:28) ⭐

**En pantalla:**
1. Corte: la página de pago de PayPal con la **cuenta de prueba de Estados
   Unidos**. Pagar.
2. Volver a la app **sin recargar**: la factura cambia sola a **Paid**.
3. A Zaytun le sale el globito *"Zaytun is on it…"* y luego *"Zaytun has a
   suggestion"* con el puntito rojo.
4. Tocar a Zaytun: su mensaje con la **tarjeta para apartar** (montos para
   cada apartado) y la pregunta del CFDI.

**Texto en pantalla:** *"No refresh. PayPal webhook → Zaytun."*

**Narración:**
> My client pays on PayPal, as usual. I don't refresh anything: PayPal
> notifies the app, the invoice turns to Paid on its own… and Zaytun speaks
> first. It suggests how much of this payment to put in each of my
> set-asides, and asks if I need a tax invoice.

## Escena 5. Aprobar y emitir el CFDI en dólares (1:28–2:02)

**En pantalla:**
1. Clic en **Approve** en la tarjeta del apartado.
2. Contestar en el chat: *"Yes, 0% VAT, the client is in the United States"*.
3. Aparece la tarjeta **Issue CFDI** (se ve *"Exchange rate … (Banxico,
   2026-11-…)"*) → **Approve**.
4. Abrir **Tax info** de esa factura: *CFDI issued ✓*, abrir el **PDF** y
   mostrarlo 2 segundos.

**Texto en pantalla (pequeño):** *"Sandbox: test documents, no legal validity."*

**Narración:**
> I approve the set-aside. For the tax invoice, I choose the VAT rate and the
> country: the app never decides my taxes for me. One more approval, and the
> CFDI is stamped in US dollars, with Banxico's official exchange rate.

## Escena 6. Lo que de verdad puedes gastar (2:02–2:20)

**En pantalla:**
1. Cambiar a modo **Personal** (toda la app se pone amarilla, Zaytun viene
   también).
2. **Savings:** los apartados con *"Saved so far"* y el botón **Choose
   amounts** en un pago.
3. Home Personal: *"Left to spend"* en grande.

**Narración:**
> In Personal mode, set-asides work like a notebook: no money moves, but I
> always know what's really mine to spend. And it works with clients in
> Mexico too, in pesos and in Spanish.

## Escena 7. Cómo está hecho (2:20–2:37)

**En pantalla:** el diagrama del README (o una versión simple):
PayPal Invoicing · Transaction Search (PayPal Server SDK) · Webhooks · Claude ·
Facturama · Banxico · Render. Resaltar *"Approval enforced by the server"*.

**Narración:**
> Under the hood: PayPal Invoicing, Transaction Search through the official
> PayPal Server SDK, and webhooks, with Claude as Zaytun's brain. The approval
> rule isn't just a prompt: the server enforces it.

## Escena 8. Cierre (2:37–2:45)

**En pantalla:** Zaytun grande, nombre de la app, link de la demo y del repo.
*"VNV Copilot — vnv-copilot.onrender.com"*

**Narración:**
> VNV Copilot, with Zaytun. The AI makes the first move. You make the call.

---

## Antes de grabar (checklist)

- [ ] Prender el **"despertador"** de Render y abrir la app una vez para que despierte.
- [ ] Decidir dónde se graba: **Render** (recomendado: el webhook ya está fijo, no hace falta túnel) o en local con túnel.
- [ ] **Plan de apartados** para el video: *Taxes 30%*, *Savings* y *Electricity* sin % (así se ve que Zaytun propone montos).
- [ ] **Responder los pagos que esperan** en Savings antes de grabar. Si no, Zaytun los mete al mismo ticket y la escena 4 se alarga.
- [ ] Tutorial ya visto y la guía apagada (para que no salgan solos).
- [ ] Navegador limpio (sin pestañas ni favoritos personales), pantalla 1920×1080, zoom 110–125%.
- [ ] Usuario y contraseña de la **cuenta de prueba de Estados Unidos** a la mano (no salen en el video).
- [ ] Ensayar una vez completo sin grabar. El chat tiene tope de 50 mensajes al día en Render.

## Lista de tomas

| Toma | Quién la graba | Cómo |
| --- | --- | --- |
| Escenas 3, 4 y 5 (el flujo completo) | Víctor | **Una sola grabación seguida** con OBS: cobrar → pagar → Zaytun → aprobar → CFDI. Se ve más real y no hay que empatar tomas |
| Escenas 1, 2 y 6 | Claude o Víctor | Tomas cortas; Claude puede sacarlas con el navegador automático |
| Escena 7 (diagrama) | Claude | Imagen limpia del diagrama |
| Escenas 2 y 8 (títulos) | Quien edite | Texto en CapCut o Clipchamp |
| Narración | Natalia o Víctor | Voz con el celular |
| Subtítulos en inglés (`.srt`) | Claude | A partir de esta narración, ya con los tiempos finales |

## Por decidir

- [ ] Natalia revisa la historia y la narración (si no está, decide Víctor).
- [ ] Quién narra.
- [ ] Nombre del cliente de Texas (propuesta: *Lone Star Apps*, inventado).
- [ ] Grabar en Render o en local.

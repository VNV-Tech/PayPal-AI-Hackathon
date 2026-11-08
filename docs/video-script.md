# Guion del video (borrador 1, 7 nov)

> **Para Natalia:** la historia es decisión tuya. Cambia lo que quieras; las
> notas en español son para el equipo, la narración va en inglés.

- **Duración objetivo:** 2:45 (el jurado solo ve 3:00; dejamos 15 s de margen).
- **Narración:** ~290 palabras, a ritmo tranquilo (~130 por minuto ≈ 2:15 de voz; el resto son pausas y tomas).
- **Voz:** una persona del equipo, grabada con el celular en un cuarto sin eco.
- **Música:** sin copyright (la biblioteca gratis de CapCut o de YouTube), bajita.
- **Datos de la demo:** todo de prueba. Nada de correos ni RFC reales.
- **Antes de grabar:** prender el "despertador" de Render, abrir la app una vez
  para que despierte, y tener lista la cuenta de prueba **de Estados Unidos**.

---

## Escena 1. El problema (0:00–0:15)

**En pantalla:** la pantalla de Home de la app, quieta. Texto grande encima:
*"You just got paid. Now what?"*

**Narración:**
> You're a freelance developer in Mexico. A client in Texas just paid you a
> thousand dollars. Great. But getting paid isn't the end of the job: you
> still have to set money aside for taxes, and issue a Mexican tax invoice to
> report that income.

## Escena 2. La idea (0:15–0:28)

**En pantalla:** logo / nombre "VNV Copilot" y la frase.
Texto: *"The AI makes the first move. You make the call."*

**Narración:**
> VNV Copilot is an AI copilot built on PayPal. When you get paid, it makes the
> first move. But it never acts on its own: every change needs your approval.

## Escena 3. Cobrar desde el chat (0:28–0:58)

**En pantalla (toma limpia, Claude la graba):**
1. Abrir **Copilot** y escribir:
   *"Invoice Lone Star Apps at (correo de la cuenta de prueba de EE. UU.) for
   1000 USD for backend development, due in 15 days"*.
2. Aparece la **tarjeta de aprobación**. Pausa de 1 segundo sobre ella.
3. Clic en **Approve** → mensaje verde *"Invoice sent"*.
4. Ir a **Invoices**: la factura aparece como **Sent**.

**Narración:**
> I just tell the copilot who to bill. It drafts a real PayPal invoice, in
> dollars, and shows me an approval card. Nothing happens until I press
> Approve. Now the invoice is sent through PayPal.

## Escena 4. Te pagan y la IA da el primer paso (0:58–1:38) ⭐

**En pantalla (grabación en pantalla con OBS; la hace Víctor):**
1. Pantalla dividida o corte: el correo de PayPal / la página de pago abierta
   con la **cuenta de prueba de Estados Unidos**. Pagar.
2. Volver a la app **sin recargar**: la factura cambia sola a **Paid**.
3. Sale *"Your copilot is on it"* y luego el mensaje del copiloto con las
   tarjetas (apartar para impuestos) y la pregunta del CFDI.

**Texto en pantalla:** *"No refresh. PayPal webhook → AI."*

**Narración:**
> Now my client pays, on PayPal, as usual. I don't refresh anything. PayPal
> notifies the app, the invoice turns to Paid on its own… and the copilot
> speaks first. It looks at the payment and proposes setting aside part of it
> for taxes. It also asks if I need a tax invoice to report this income.

## Escena 5. Aprobar y emitir el CFDI en dólares (1:38–2:10)

**En pantalla:**
1. Clic en **Approve** en la tarjeta del apartado.
2. Contestar en el chat: *"Yes, 0% VAT, the client is in the United States"*.
3. Aparece la tarjeta **Issue CFDI** → **Approve**.
4. Abrir **Tax info** de esa factura: *CFDI issued ✓*, descargar el **PDF** y
   mostrarlo 2 segundos (tipo de cambio visible).

**Texto en pantalla (pequeño):** *"Sandbox: test documents, no legal validity."*

**Narración:**
> I approve the set-aside. For the tax invoice, I choose the VAT rate and the
> country — the app never decides my taxes for me. One more approval, and the
> CFDI is stamped in US dollars, with the day's exchange rate, ready to
> download.

## Escena 6. También en México y en español (2:10–2:25)

**En pantalla (rápido, 3 cortes):**
1. Escribir en el chat en español: *"¿Cuánto cobré este mes?"* y la respuesta.
2. La página `/factura/...` en español que llena un cliente de Monterrey.
3. El botón **Review all with AI** en Savings con el ticket de casillas.

**Narración:**
> It works for clients in Mexico too: they fill in their tax details once, in
> Spanish, and the copilot speaks Spanish. And when several payments are
> waiting, one ticket lets me review them all at once.

## Escena 7. Cómo está hecho (2:25–2:40)

**En pantalla:** el diagrama del README (o una versión simple):
PayPal Invoicing · Transaction Search (PayPal Server SDK) · Webhooks · Claude ·
Facturama · Render. Resaltar *"Approval enforced by the server"*.

**Narración:**
> Under the hood: PayPal Invoicing, Transaction Search through the official
> PayPal Server SDK, and webhooks, with Claude as the brain. The approval rule
> isn't just a prompt: the server enforces it.

## Escena 8. Cierre (2:40–2:48)

**En pantalla:** nombre de la app, link de la demo y del repo.
*"VNV Copilot — vnv-copilot.onrender.com"*

**Narración:**
> VNV Copilot. The AI makes the first move. You make the call.

---

## Lista de tomas

| Toma | Quién la graba | Cómo |
| --- | --- | --- |
| Escenas 1, 3, 5, 6 y 7 | Claude | Navegador automático, sin errores ni mouse temblando |
| Escena 4 (el pago) | Víctor | En pantalla (OBS), con la cuenta de prueba de EE. UU. |
| Escenas 2 y 8 (títulos) | Quien edite | Texto en CapCut o Clipchamp |
| Narración | Natalia o Víctor | Voz con el celular |
| Subtítulos en inglés (`.srt`) | Claude | A partir de esta narración |

## Por decidir

- [ ] Natalia revisa la historia y la narración.
- [ ] Quién narra.
- [ ] Nombre del cliente de Texas (propuesta: *Lone Star Apps*, inventado).
- [ ] Si se muestra un logo o solo el nombre "VNV Copilot".

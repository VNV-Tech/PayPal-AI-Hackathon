# Guía: qué se configuró, para qué sirve y qué te toca hacer

> Escrita el 26 de octubre de 2026. Explica todo lo que se hizo en la sesión de configuración, sin tecnicismos.

---

## Resumen en 30 segundos

1. **Claude Code ya puede hablar con PayPal** (en modo de pruebas, sin dinero real).
2. **El proyecto en GitHub quedó ordenado:** cada integrante tiene su propio espacio y las versiones importantes tienen candado.
3. **Se instaló el plugin de APIMatic**, un "manual oficial" de PayPal que usa la IA al programar y que nos permite concursar por su premio.
4. **Falta:** subir la app a internet con Render (más adelante) y esperar el correo del mes gratis de APIMatic.

---

## 1. La conexión de Claude Code con PayPal

### ¿Qué es?
PayPal tiene un plugin para Claude Code llamado **PayPal AI Toolkit**. Con él, Claude puede hacer cosas en PayPal directamente: crear facturas, revisar pagos, hacer reembolsos, etc.

Todo esto ocurre en el **Sandbox**, que es un PayPal de mentira para hacer pruebas. Nada de lo que pase ahí mueve dinero real.

### ¿Qué se hizo?
Se revisó que la conexión funcionara. Resultado: **conectado, con 46 herramientas disponibles**. Se hizo una prueba pidiendo la lista de facturas y respondió bien (está vacía porque todavía no hemos creado ninguna).

### ¿Por qué importa?
El hackathon pide usar PayPal "de forma significativa". Con esta conexión podemos crear datos de prueba (facturas, pagos) rápido y comprobar que todo funciona.

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
     ├─ natalia   🚪 Cuarto de Natalia: diseño y pantallas.
     └─ vanessa   🚪 Cuarto de Vanessa: investigación, textos y pitch.
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

### Estado: ⏳ pendiente
Lo haremos cuando la app esté más avanzada. **Tú tendrás que crear una cuenta en [render.com](https://render.com)** (puedes entrar con tu GitHub). Te guiaré cuando llegue el momento.

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

### ⚠️ Cosas a tener en cuenta
- **El mes gratis:** llenaste un formulario de APIMatic, pero todavía no llega el correo. Revisa spam y la pestaña "Promociones". Si en 1 o 2 días no llega, escribe a developer@apimatic.io o pregunta en el Discord del hackathon. **El plugin funciona igual sin ese mes.**
- Si ves otro plugin llamado `paypal-sdk`, **no lo instales**: es para otro lenguaje (.NET) y choca con el que ya tenemos.

---

## 6. Algo importante sobre los premios

Según las reglas que leímos, **solo se puede ganar un premio de patrocinador** (Render, APIMatic, etc.) además de uno de los premios generales. Conviene usar ambos, pero en la entrega destacaremos el que más luzca en el proyecto.

**Fecha límite de entrega:** 12 de noviembre de 2026, 2:00 p. m. hora de CDMX.

---

## ✅ ¿Qué te toca hacer a ti?

**Ahora:**
- [ ] Mandarle este mensaje a Natalia y Vanessa:
  > Ya está listo el proyecto en GitHub. Cada una tiene su rama. Para entrar a la suya, abran la terminal en la carpeta del proyecto y escriban:
  > `git fetch`
  > `git switch natalia` (o `git switch vanessa`)
- [ ] Revisar spam y "Promociones" por el correo de APIMatic.

**Más adelante:**
- [ ] Crear tu cuenta en Render (cuando te avise).
- [ ] Dar clic en **Merge** cuando te pida aceptar una solicitud.
- [ ] Renovar la llave de PayPal cuando caduque (`npm run paypal:token` y reiniciar Claude Code).

---

## 🆘 Problemas comunes

| Si pasa esto... | Haz esto |
|---|---|
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

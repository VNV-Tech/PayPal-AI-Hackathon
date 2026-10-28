# Cómo trabajamos (equipo VNV-Tech)

## Ramas

```
main      ← versión estable: lo que ve el jurado. Solo recibe merges desde dev.
 └─ dev   ← integración: aquí se junta el trabajo de todos.
     ├─ victor    backend, PayPal, IA, despliegue
     ├─ vanessa   UI/UX y componentes de React (client/)
     └─ natalia   investigación, textos y pitch (docs/)
```

**Reglas:**

1. Nadie trabaja directamente en `main` ni en `dev`.
2. Cada quien trabaja en su rama y abre un **Pull Request hacia `dev`**.
3. Cuando `dev` funciona bien, se abre un PR de `dev` → `main`.
4. Antes de abrir un PR, trae lo último de `dev` para evitar conflictos.

## Flujo diario

```bash
# 1. Cambiarte a tu rama y traer lo último de dev
git switch vanessa            # tu nombre
git pull origin dev

# 2. Trabajar y guardar cambios
git add client/src/pages/Invoices.tsx   # agrega archivos concretos, no "git add ."
git commit -m "Diseño de la tabla de facturas"

# 3. Subir tu rama
git push origin vanessa

# 4. En GitHub: abrir Pull Request  vanessa → dev
```

## Dónde toca cada quien

| Carpeta / archivo           | Quién        | Qué hay                                   |
| --------------------------- | ------------ | ----------------------------------------- |
| `client/src/index.css`      | Vanessa      | Colores y tipografía (variables `@theme`) |
| `client/src/components/`    | Vanessa      | Botones, tarjetas, layout                 |
| `client/src/pages/`         | Vanessa/Víctor | Pantallas                               |
| `server/`                   | Víctor       | API, PayPal, IA                           |
| `docs/`                     | Natalia      | Investigación, pitch, guion del video     |
| `README.md`                 | Todos        | Debe estar en **inglés** (regla del hackathon) |

## Seguridad

- **Nunca** subas el archivo `.env` ni pegues claves en el código, issues o Discord.
- Si una clave se filtra por accidente, avisa de inmediato para regenerarla.
- Todos los materiales para el jurado (README, video, descripción) van en **inglés**.

## Comandos útiles

```bash
npm ci          # instalar dependencias (primera vez)
npm run dev     # levantar server + client
npm run build   # compilar todo (verifica que no haya errores de TypeScript)
```

> Si `npm install <paquete>` falla con `Cannot read properties of null (reading 'edgesOut')`,
> usa `npx npm@11 install <paquete>` (bug de npm 10 con workspaces).

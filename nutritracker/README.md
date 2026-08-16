# NutriTracker

Webapp personal para registrar comidas, proteína y entrenamientos durante un plan de 4 meses.

Es un proyecto **independiente** dentro de este repositorio: tiene su propio `package.json`
y no comparte código, dependencias ni build con la landing de Carvi que vive en la raíz.

## Qué hace

- **Metas automáticas.** Calcula tu gasto diario (Mifflin-St Jeor + factor de actividad) y
  reparte calorías, proteína, carbohidratos y grasas según tu objetivo. Podés pisarlas a mano.
- **Registro por texto o voz.** Escribís o dictás *"2 huevos con 60 g de avena y una banana"*
  y lo convierte en alimentos con sus gramos. Entiende gramos, kilos, mililitros, unidades
  ("2 huevos"), porciones ("una taza", "2 rebanadas") y fracciones ("medio kilo").
- **Base de ~120 alimentos** con porciones habituales, más los tuyos propios con los valores
  del envase.
- **Gym.** Rutina semanal (o una plantilla armada: full body, PPL, torso/pierna), registro de
  series con reps y kilos, volumen por sesión y tu récord por ejercicio a la vista.
- **Progreso.** Curva de peso real contra el ritmo objetivo del plan, calorías de los últimos
  14 días, racha de días registrados y semana actual del plan.
- **Instalable** en el teléfono como PWA, con modo claro y oscuro.

## Cuenta y sincronización

La app es *offline-first*: siempre escribe primero en el `localStorage` del dispositivo, así
funciona sin señal. Si además configurás la sincronización, los datos se comparten entre el
celular y la web con una sola contraseña.

Cómo funciona:

- **Una sola cuenta**, protegida por la contraseña que guardes en `APP_PASSWORD`. No hay
  registro ni usuarios múltiples: es una app personal.
- La contraseña vive **sólo en el servidor**, nunca se incluye en el bundle del cliente.
- Al entrar, el servidor devuelve un token firmado (HMAC-SHA256, 180 días de validez) con una
  clave derivada de la contraseña. Cambiar la contraseña invalida todos los tokens.
- Los datos se guardan en Vercel Blob **cifrados con AES-256-GCM**, con clave derivada de la
  misma contraseña: aunque la URL del blob se filtrara, el archivo no se puede leer.
- Los cambios se suben con un debounce de 1,5 s y se bajan al abrir la app o al volver a la
  pestaña. Si editaste en dos aparatos a la vez, **gana la versión guardada más tarde**; el
  servidor rechaza cualquier escritura más vieja que la que ya tiene.

### Activarla (dos pasos en el panel de Vercel)

1. **Storage → Create Database → Blob**, y conectalo al proyecto `nutritracker`. Eso agrega
   solo la variable `BLOB_READ_WRITE_TOKEN`.
2. **Settings → Environment Variables**, agregá `APP_PASSWORD` con la contraseña que quieras
   (usá una larga; es la única llave de todo). Marcala para todos los entornos.

Volvé a desplegar y listo. Mientras falte cualquiera de las dos, la app sigue funcionando en
modo local y avisa en **Perfil → Sincronización** que no está activa.

Igual conviene bajar de vez en cuando una copia con **Perfil → Exportar**.

## Desarrollo

```bash
cd nutritracker
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build a dist/
npm run preview  # sirve dist/
```

## Deploy

En línea: **https://nutritracker-psi.vercel.app**

El proyecto de Vercel (`nutritracker`, team `carvi1v`) ya está linkeado a este
repositorio con **Root Directory = `nutritracker`**, así que la landing de Carvi de la
raíz queda fuera del build. El resto de la configuración sale de `vercel.json`:
framework Vite, `npm run build`, salida en `dist`.

Cada push genera un deployment automático. La rama de producción es `main`: los pushes a
otras ramas crean *preview deployments* con su propia URL, y la URL de producción de
arriba se actualiza al mergear a `main`.

## Aviso

Las calorías y los macros son estimaciones generales para orientarte, no una indicación
médica ni nutricional. Si tenés alguna condición de salud, consultá con un profesional.

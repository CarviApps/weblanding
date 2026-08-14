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

## Dónde se guardan los datos

Todo queda en el `localStorage` del navegador: no hay servidor, cuenta ni base de datos, y
nada sale del dispositivo. Como contrapartida, si borrás los datos del sitio o cambiás de
teléfono se pierde, así que en **Perfil → Tus datos guardados** hay exportar/importar a JSON.

## Desarrollo

```bash
cd nutritracker
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build a dist/
npm run preview  # sirve dist/
```

## Deploy en Vercel

El proyecto vive en un subdirectorio, así que hay que apuntarle a Vercel:

1. Importá el repositorio en Vercel.
2. En **Root Directory** elegí `nutritracker`.
3. El resto lo toma de `vercel.json` (framework Vite, build `npm run build`, salida `dist`).

Desde la CLI, parado en esta carpeta: `npx vercel --prod`.

## Aviso

Las calorías y los macros son estimaciones generales para orientarte, no una indicación
médica ni nutricional. Si tenés alguna condición de salud, consultá con un profesional.

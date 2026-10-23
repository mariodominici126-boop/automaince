# AutoMaince

Aplicación web para gestión, mantenimiento y análisis de flotas, con una aplicación JavaFX de escritorio que muestra la misma interfaz web. El navegador y el escritorio comparten las mismas pantallas y el mismo servidor.

## Ejecución

Requiere Node.js 18 o superior y Java 21. La aplicación JavaFX abre por defecto la web publicada en Render; por tanto, no es necesario iniciar Node.js para usarla con conexión a internet.

Para trabajar en desarrollo local, inicie el servidor desde la raíz:

```bash
npm start
```

Abra `http://localhost:3000` para usar la aplicación web local. Para que JavaFX use esa misma instancia local, configure la URL y ejecute:

```bash
AUTOMAINCE_WEB_URL=http://localhost:3000 ./mvnw javafx:run
```

En Windows PowerShell, configure `$env:AUTOMAINCE_WEB_URL = 'http://localhost:3000'`. Luego ejecute `npm start` en una terminal y `mvnw.cmd javafx:run` en otra. Si no configura esta variable, JavaFX abre `https://automaince.onrender.com`.

Para validar la lógica principal: `npm test`.

## Acceso provisional GTG

Para revisión local, el usuario temporal es `admin.gtg` y la contraseña `GtgDemo2026!`. El servidor permite cambiarlos con las variables `GTG_DEMO_USER` y `GTG_DEMO_PASSWORD`. Este acceso es solo de demostración; antes de publicar el login en producción, configure credenciales privadas en el entorno del servidor y conecte la autenticación corporativa.

El espacio GTG está enfocado exclusivamente en la flota de camionetas. El registro de vehículos asigna el tipo `Camioneta` automáticamente; el módulo de combustible no forma parte de la experiencia GTG.

Las vistas activas se editan una sola vez en `frontend/`; esos mismos HTML, CSS y JavaScript se ven en el navegador y dentro del escritorio. Los cambios hechos al código local se publican en la web y en JavaFX cuando se despliega la nueva versión en Render. Los FXML anteriores quedan como prototipos sin uso en el inicio de la aplicación.

## Módulos por empresa

La aplicación sigue siendo un solo producto web con un solo servidor y un área común de mantenimiento. Cada empresa tiene su propia carpeta para evitar mezclar logotipos, configuración, estilos, login y autenticación:

```text
frontend/companies/gtg/             Identidad, login y logo GTG
frontend/companies/notions/         Identidad, login y logos Notions
frontend/companies/now-logistics/   Identidad, login y logo NOW
frontend/companies/printpilot/      Identidad, login y logo PrintPilot
backend/companies/<empresa>/        Autenticación y lógica propia del servidor
src/main/java/.../companies/<empresa>/  Controller JavaFX del login
src/main/resources/.../Vistas/companies/<empresa>/  FXML del login
src/main/resources/.../images/companies/<empresa>/  Recursos de escritorio
```

`frontend/pages/access/` y `backend/server.js` coordinan las empresas. `frontend/components/` y `frontend/pages/` contienen las vistas compartidas de flota; `backend/services/`, `backend/models/`, `database/` y `data/` contienen la lógica y los datos compartidos. La aplicación JavaFX abre la misma web con WebView, así que se despliega y se edita una sola interfaz.

Cada módulo web registra sus datos desde `company.js`, sus colores desde `login.css` y sus imágenes desde `assets/`. La autenticación GTG está separada en `backend/companies/gtg/auth.js`. Los módulos Notions, NOW y PrintPilot dejan claro dónde conectar sus servicios; sus autenticaciones corporativas todavía no están integradas.

## Subir cambios a GitHub y mantener la web pública

El repositorio ya tiene configurado un remoto `origin` para GitHub. Este trabajo corresponde a la rama `empresa/gtg`. Desde PowerShell, en la carpeta que abres en IntelliJ:

```powershell
cd C:\Users\disla\IdeaProjects\automaince
git status
git add .
git commit -m "Ajusta sistema GTG para camionetas"
git push origin empresa/gtg
```

Antes de confirmar, revisa `git status` y no subas `.env`, contraseñas reales, llaves ni tokens. `.gitignore` excluye esos archivos y conserva `.env.example` como plantilla. GitHub documenta el flujo para subir un repositorio local con `git add`, `git commit` y `git push`.

La web necesita el **servidor Node**, así que en Render debe ser un **Web Service**, no un Static Site. Si el servicio AutoMaince existente está conectado al repositorio y a la rama `main`, Render puede desplegar automáticamente cada `git push`; revisa el despliegue en su panel y luego abre `https://automaince.onrender.com`. Si el servicio no está conectado, en Render elige **New → Web Service**, conecta el repositorio, deja la raíz en el directorio del proyecto, usa `npm install` como build command y `npm start` como start command, y habilita los despliegues automáticos de `main`.

Antes del primer despliegue de esta versión, configura en **Render → servicio → Environment** los valores privados `GTG_DEMO_USER` y `GTG_DEMO_PASSWORD`. En producción el login GTG queda deshabilitado si faltan; no uses la contraseña de demostración local. La página seguirá siendo pública para visitar, aunque el acceso a las funciones de gestión requiere iniciar sesión. Una cuenta provisional no es un sistema de autenticación corporativo.

Con el plan gratuito de Render, una web inactiva puede suspenderse y volver a arrancar cuando recibe otra visita, por lo que la primera carga tras un periodo sin tráfico podría tardar.

## Arquitectura compartida

- `frontend/`: interfaz web responsiva, componentes, páginas, estilos y navegación. Es la fuente visual única para web y escritorio.
- `src/main/java/com/example/automaince/application/`: inicio de JavaFX WebView que carga la interfaz web compartida.
- `backend/server.js`: servidor HTTP y API REST, que delega las rutas de login en los módulos de empresa.
- `backend/services/`: reglas compartidas de alertas, órdenes y métricas.
- `backend/models/`: contratos de entidades del dominio.
- `database/adapters/localRepository.js`: adaptador para los datos simulados, reemplazable por PostgreSQL, MySQL, SQL Server o una API interna.
- `data/mock/fleetData.js`: datos simulados intercambiables.
- `intelligence/`: anomalías y priorización explicables basadas en reglas y estadísticas simples.

## Datos e integración futura

Los datos iniciales viven en `data/mock/fleetData.js`. Para conectar PostgreSQL, MySQL, SQL Server o una API interna, sustituya ese origen por un repositorio/adaptador en `database/adapters/`, conservando las respuestas que consumen los servicios. Esto permite mantener el frontend y la lógica de negocio sin cambios importantes.

## Alcance experimental

El módulo **AutoMaince Intelligence** no pretende ser IA entrenada: explica las anomalías y calcula el riesgo mediante costos, fallas, mantenimiento y documentos. Sus estimaciones no son recomendaciones mecánicas certificadas.

## V2: operación de mantenimiento

La V2 agrega **órdenes de mantenimiento**, separadas de los registros históricos. El flujo de una orden es: `CREADA → PENDIENTE DE REVISIÓN → AUTORIZADA → EN PROCESO → COMPLETADA → CERRADA`. La información sigue siendo temporal durante la ejecución del prototipo; una base de datos conservará los cambios al sustituir el adaptador local.

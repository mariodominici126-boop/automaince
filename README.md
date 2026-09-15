# AutoMaince

Prototipo cliente-servidor de gestión, mantenimiento y análisis inteligente de flotas. Funciona sin servicios externos mediante una API Node.js y datos locales simulados.

## Ejecución

Requiere Node.js 18 o superior. Desde la raíz:

```bash
npm start
```

Abra `http://localhost:3000`. Para validar la lógica principal: `npm test`.

## Arquitectura

- `frontend/`: interfaz web responsiva, componentes, páginas y utilidades de navegación.
- `backend/server.js`: servidor HTTP y API REST local.
- `backend/services/`: reglas de alertas y métricas de negocio.
- `backend/models/`: contratos de entidades del dominio.
- `data/mock/fleetData.js`: repositorio simulado intercambiable.
- `intelligence/`: anomalías y priorización explicables, basadas en reglas y estadísticas simples.
- `database/`: reservado para adaptadores, modelos y migraciones de una base de datos futura.

## Datos e integración futura

Los datos iniciales viven en `data/mock/fleetData.js`. Para conectar PostgreSQL, MySQL, SQL Server o una API interna, sustituya ese origen por un repositorio/adaptador en `database/adapters/`, conservando las respuestas que consumen los servicios. Esto permite mantener el frontend y la lógica de negocio sin cambios importantes.

## Alcance experimental

El módulo **AutoMaince Intelligence** no pretende ser IA entrenada: explica las anomalías y calcula el riesgo mediante umbrales de consumo, costos, fallas, mantenimiento y documentos. Sus estimaciones no son recomendaciones mecánicas certificadas.

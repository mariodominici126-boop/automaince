# AutoMaince · mantenimiento de flota y equipos

Aplicación web con interfaz compartida con el cliente JavaFX. El módulo PrintPilot trabaja con activos de producción y usa PostgreSQL.

## Iniciar PostgreSQL local

Requiere Node.js 22 o superior y Docker Desktop con Compose.

1. En PowerShell, abre la carpeta del proyecto.
2. Instala las dependencias y copia la plantilla de variables una sola vez:

```powershell
npm install
npm run db:up
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

3. Inicia la aplicación:

```powershell
npm start
```

4. Abre `http://localhost:3000` y entra a PrintPilot con:

```text
Usuario: emmanuel
Contraseña temporal: PP-Emmanuel-2026!
```

La primera ejecución crea el esquema y los 19 activos del inventario PDF. La contraseña se conserva en PostgreSQL como hash scrypt con sal aleatoria, nunca en texto plano. El campo de cédula de esta cuenta queda pendiente; los técnicos nuevos deben registrar nombre, cédula y empresa.

La base nueva importa los datos de muestra GTG y crea el espacio de PrintPilot. El archivo SQLite anterior no se borra, pero los datos que se hayan agregado ahí no se transfieren automáticamente; guarda una copia de ese archivo antes de cambiar de base.

PostgreSQL guarda sus datos en el volumen Docker `automaince-postgres-data`, así que reiniciar el servidor no los borra. Para detener solo la base sin borrar los datos: `npm run db:down`. No elimines el volumen si quieres conservar la base.

## Gmail para Compras

El módulo de insumos no registra una orden de gas hasta que el correo se envía. Configura en `.env` el Gmail remitente (`GMAIL_USER`) y su contraseña de aplicación (`GMAIL_APP_PASSWORD`). El destinatario ya está configurado como `printpilot@notions.com.do`; se puede cambiar mediante `PURCHASE_EMAIL`. Nunca compartas ni subas la contraseña de aplicación. Sin esa configuración, la solicitud informa el error y no aparece como enviada.

El botón **Enviar por Gmail** de Contramedidas abre un borrador con el informe para que el usuario revise el destinatario y lo envíe.

## Módulos PrintPilot

- Panel y agenda con mantenimientos de la semana y los próximos 30 días.
- Activos separados en menú: Aires, Filtros, Impresoras, Hornos y secadoras, Infraestructura y Cortadoras.
- Plan preventivo de filtros mensual y semestral asociado a los equipos de aire.
- Registro de mantenimientos completados, checklist obligatorio, técnico, fechas, materiales, horas, costos, hallazgos y recomendaciones.
- Contramedidas para reparaciones y hallazgos, incluidos cambios electrónicos y repuestos.
- Insumos de gas y tinta con entradas y consumos; el pedido de gas notifica por email a Compras.
- Documentos para SDS, manuales, facturas y evidencias (PDF, imágenes, texto y Word hasta 8 MB), almacenados en PostgreSQL.
- Informes filtrables, exportación CSV, impresión del navegador a PDF, informes por Gmail y bitácora con antes/después.
- Registro de técnicos con nombre, cédula y empresa.

## PostgreSQL alojado

La conexión del proyecto usa `DATABASE_URL`. En un proveedor PostgreSQL, crea una base y establece `DATABASE_URL` como variable secreta del servidor, y `PGSSLMODE=require` cuando el proveedor requiera TLS. Configura también `GMAIL_USER`, `GMAIL_APP_PASSWORD` y `PURCHASE_EMAIL` en el servidor. Los despliegues que usan almacenamiento efímero necesitan una base PostgreSQL administrada para conservar los datos.

El esquema inicial está en `database/postgres/schema.sql`; el adaptador crea las tablas y carga los datos iniciales de GTG y PrintPilot al arrancar.

## Pruebas

```powershell
npm test
```

La aplicación no contiene ni expone la contraseña de correo. No subas `.env` al repositorio.

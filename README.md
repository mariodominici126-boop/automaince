# AutoMaince · mantenimiento de flota y equipos

Aplicación web con interfaz compartida con el cliente JavaFX. El módulo PrintPilot trabaja con activos de producción y usa PostgreSQL.

## Iniciar PostgreSQL y la aplicación en Windows

No se requiere Docker. Instala Node.js 22 o superior y PostgreSQL para Windows desde el [instalador oficial enlazado por PostgreSQL](https://www.postgresql.org/download/windows/). Durante la instalación incluye pgAdmin y recuerda la contraseña que asignes al usuario `postgres`.

En CMD, en la carpeta del proyecto, copia la plantilla local si aún no tienes `.env`:

```cmd
if not exist .env copy .env.example .env
npm install
```

En el menú Inicio, abre **SQL Shell (psql)**. Conéctate al servidor local (puedes aceptar los valores por defecto con Enter) e inicia sesión como `postgres` usando la contraseña elegida durante la instalación. Ejecuta estas instrucciones SQL, una por una:

```sql
CREATE USER automaince WITH PASSWORD 'automaince_dev';
CREATE DATABASE automaince OWNER automaince;
```

Si PostgreSQL ya tiene ese usuario o esa base, no los crees de nuevo. La conexión se configura en `.env` mediante `DATABASE_URL`; el valor de plantilla es `postgresql://automaince:automaince_dev@127.0.0.1:5432/automaince`.

Comprueba que el servicio PostgreSQL esté iniciado desde la aplicación **Servicios** de Windows (su nombre comienza con `postgresql`). Luego, en CMD:

```cmd
npm start
```

Abre `http://localhost:3000` y entra a PrintPilot con:

```text
Usuario: emmanuel
Contraseña temporal: PP-Emmanuel-2026!
```

La primera ejecución crea el esquema y los 19 activos del inventario PDF. La contraseña se conserva en PostgreSQL como hash scrypt con sal aleatoria, nunca en texto plano. El campo de cédula de esta cuenta queda pendiente; los técnicos nuevos deben registrar nombre, cédula y empresa.

La primera ejecución crea el esquema y carga los datos iniciales en PostgreSQL. El servicio PostgreSQL de Windows guarda la base localmente y se inicia por separado del servidor web. El archivo SQLite anterior no se borra, pero sus datos no se transfieren automáticamente; guarda una copia antes de cambiar de base.

## Ver la base de datos

Abre pgAdmin 4 y conéctate al servidor local con el usuario `automaince` y la contraseña `automaince_dev`. En el árbol, abre **Databases → automaince → Schemas → public → Tables**. Las tablas aparecen después del primer inicio correcto del servidor AutoMaince.

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

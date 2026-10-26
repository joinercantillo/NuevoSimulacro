# Simulacro · Prueba de desempeño NestJS

## API REST de reservas hoteleras — Arenosa Hoteles S.A.S.

API para registrar y consultar reservas de habitaciones durante la temporada del
Carnaval de Barranquilla, con control de roles, ciclo de vida de estados,
protección por API Key y documentación Swagger.

---

## 1. Stack

| Tecnología | Uso |
| --- | --- |
| Node.js 24 + TypeScript (ESM) | Runtime y lenguaje |
| NestJS 12 + Nest CLI | Framework y estructura (módulos, controladores, servicios, guards, interceptores, filters) |
| TypeORM + SQLite (`better-sqlite3`) | Persistencia de las reservas |
| class-validator + class-transformer | DTO y validación global (`ValidationPipe`) |
| @nestjs/swagger | Documentación OpenAPI |
| @nestjs/config + zod | Variables de entorno validadas al arrancar |
| Vitest + Supertest | Pruebas unitarias y e2e |
| oxlint + Prettier | Lint y formato |

---

## 2. Requisitos previos

- Node.js 20 o superior (probado con Node 24).
- npm.

## 3. Instalación

```bash
npm install
cp .env.example .env      # Windows: Copy-Item .env.example .env
```

Revise `.env`:

```env
PORT=3000
DB_PATH=./data/reservas.sqlite
API_KEYS=clave-ficticia-sede-via40, clave-ficticia-sede-malecon, clave-ficticia-sede-norte
```

`API_KEYS` admite **varias claves separadas por coma** (una por sede). Los espacios
alrededor de las comas se ignoran. Las claves del ejemplo son ficticias y no deben
usarse en producción. La aplicación no arranca si la variable falta o no contiene
ninguna clave (validación con zod en `src/config/env.validation.schema.ts`).

## 4. Ejecución

```bash
npm run start:dev     # desarrollo con recarga automática
npm run build         # compilar a dist/
npm run start:prod    # node dist/main
```

Al arrancar se crea la carpeta de la base de datos si no existe y se genera el
archivo SQLite (`synchronize: true` solo para este simulacro).

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

## 5. Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run start:dev` | Servidor en modo desarrollo con watch |
| `npm run build` | Compila el proyecto |
| `npm run lint` | Análisis estático con oxlint |
| `npm run format` | Formateo con Prettier |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:e2e` | Pruebas e2e con Supertest (35 escenarios) |
| `npm run test:cov` | Cobertura de pruebas |

---

## 6. Usuarios de prueba

La identidad viaja en el encabezado **`x-user`** y el rol **siempre lo resuelve el
servidor** (nunca se acepta un rol enviado por el cliente). Son usuarios en memoria:
el simulacro no exige login ni entidad de usuario.

| `x-user` | Nombre | Rol |
| --- | --- | --- |
| `admin-1` | Ana Admin | `admin` |
| `coord-1` | Carlos Coordinador | `coordinador` |
| `recep-1` | María Recepcionista | `recepcionista` |
| `recep-2` | Luis Recepcionista | `recepcionista` |

Los dos recepcionistas existen para demostrar que un recepcionista **no** accede a
las reservas del otro.

> El mecanismo `x-user` es exclusivamente académico y no es un mecanismo de
> autenticación válido para producción.

---

## 7. Endpoints

Todos exigen `x-api-key` y `x-user`.

| Método | Endpoint | Función |
| --- | --- | --- |
| `POST` | `/reservas` | Registrar una reserva (estado inicial `PENDIENTE`) |
| `GET` | `/reservas` | Consultar las reservas permitidas para el usuario, con filtro opcional `?estado=` |
| `GET` | `/reservas/resumen` | Conteo de reservas por estado (admin y coordinador) |
| `GET` | `/reservas/:id` | Consultar una reserva individual |
| `PATCH` | `/reservas/:id/estado` | Cambiar el estado de una reserva |

`GET /reservas/resumen` es un endpoint adicional (el enunciado pide "como mínimo"
los cuatro principales) y existe para demostrar el decorador `@Roles(...)`
restringiendo un recurso a `admin` y `coordinador`.

### Ejemplos con curl (PowerShell: use comillas dobles para las claves)

```bash
# Registrar una reserva como recepcionista (el campo recepcionista se ignora)
curl -X POST http://localhost:3000/reservas \
  -H "Content-Type: application/json" \
  -H "x-api-key: clave-ficticia-sede-via40" \
  -H "x-user: recep-1" \
  -d '{"huesped":"Juan Perez","documentoHuesped":"12345678","tipoHabitacion":"SUITE","fechaIngreso":"2027-02-13","fechaSalida":"2027-02-17"}'

# Registrar como admin indicando el recepcionista responsable
curl -X POST http://localhost:3000/reservas \
  -H "Content-Type: application/json" \
  -H "x-api-key: clave-ficticia-sede-malecon" \
  -H "x-user: admin-1" \
  -d '{"huesped":"Maria Lopez","documentoHuesped":"87654321","tipoHabitacion":"DOBLE","fechaIngreso":"2027-03-01","fechaSalida":"2027-03-05","recepcionista":"recep-2"}'

# Listado filtrado por estado
curl "http://localhost:3000/reservas?estado=CONFIRMADA" \
  -H "x-api-key: clave-ficticia-sede-via40" -H "x-user: admin-1"

# Cambiar el estado
curl -X PATCH http://localhost:3000/reservas/{id}/estado \
  -H "Content-Type: application/json" \
  -H "x-api-key: clave-ficticia-sede-via40" -H "x-user: coord-1" \
  -d '{"estado":"CONFIRMADA"}'
```

### Formato de las respuestas

Exitosa (interceptor `RespuestaInterceptor`):

```json
{ "success": true, "data": { "id": "…", "estado": "PENDIENTE" } }
```

Error (filtro `HttpExceptionFilter`):

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Transición de estado inválida: la reserva está en \"PENDIENTE\" y se solicitó \"EN_CURSO\"",
  "error": "Conflict",
  "path": "/reservas/3f1c…/estado",
  "timestamp": "2026-10-25T15:04:05.000Z"
}
```

Los errores de validación agregan `details` con la lista de mensajes de class-validator.

---

## 8. Reglas de negocio y dónde están implementadas

| Regla | Implementación |
| --- | --- |
| **RN-01** Registro | `ReservasService.crear()` + `resolverRecepcionistaResponsable()`. El estado siempre es `PENDIENTE`; un recepcionista se asigna a sí mismo (ignora el valor enviado); admin/coordinador deben enviar un `recepcionista` existente con ese rol. Las fechas se validan en `CrearReservaDto` (validador de clase `FechasEstadiaValidator` sobre `reglas-estadia.ts`). |
| **RN-02** Consulta | `ReservasService.listar()` agrega `recepcionista = usuario.id` al `where` de TypeORM cuando el rol es `recepcionista` (el filtro se aplica **en la consulta**, no después) y combina ese criterio con `?estado=`. `obtenerPorId()` aplica la misma restricción. |
| **RN-03** Cambio de estado | `ReservasService.cambiarEstado()` sobre la máquina de estados `reglas-estado.ts` (`TRANSICIONES_PERMITIDAS`, `puedeCancelar`, `esEstadoFinal`). La lógica vive en el servicio, no en el controlador. |
| **RN-04** Protección | `ApiKeyGuard` (global): exige `x-api-key` y la compara contra las claves de `API_KEYS` con comparación en tiempo constante. Ninguna clave está escrita en el código. |
| **RN-05** Validación | `ValidationPipe` global con `whitelist` + `forbidNonWhitelisted` + `transform`: rechaza campos faltantes, con tipos o formatos incorrectos y **campos que no corresponden** (por ejemplo `estado` o `id` en el registro). |
| **RN-06** Respuestas | `RespuestaInterceptor` para el éxito y `HttpExceptionFilter` para todos los errores. |

Orden de los guards globales (registrados con `APP_GUARD` en `AppModule`):
`ApiKeyGuard` → `UsuarioGuard` → `RolesGuard`. Si falla la clave no se ejecuta
ninguna lógica del endpoint.

Decoradores personalizados:

- `@Roles(...)` (`src/common/decorators/roles.decorator.ts`) declara los roles
  permitidos; `RolesGuard` los lee con `Reflector` y responde `403` si no coinciden.
- `@CurrentUser()` (`src/common/decorators/current-user.decorator.ts`) entrega el
  usuario ya validado desde la petición.

---

## 9. Justificación de los códigos HTTP

| Código | Cuándo | Por qué |
| --- | --- | --- |
| **401 Unauthorized** | Falta `x-api-key` o `x-user`, clave inválida, usuario inexistente | El problema es la **identidad**: no se pudo autenticar quién hace la petición. La convención de HTTP distingue "no me identificó" (401) de "me identificó pero no puede" (403). `401` además se acompaña del encabezado `WWW-Authenticate` implícito del framework. |
| **403 Forbidden** | Rol no autorizado (`@Roles`), recepcionista accediendo a una reserva ajena, recepcionista intentando cancelar | La identidad **sí** es válida y conocida; lo que falta es permiso sobre el recurso. Devolver 404 aquí ocultaría el motivo real y dificultaría el diagnóstico del cliente. |
| **400 Bad Request** | DTO inválido: campos faltantes o mal tipados, fechas imposibles o fuera de formato, `?estado=` fuera del catálogo, campos no permitidos, `recepcionista` inexistente o con otro rol | El cuerpo o la query **no cumplen el contrato** de la operación. Aunque un dato hace referencia a un usuario inexistente, el fallo ocurre al validar la semántica del cuerpo, por eso se responde 400 y no 404 (el recurso solicitado sigue siendo la reserva, que no llegó a crearse). |
| **404 Not Found** | `GET /reservas/:id` con un id inexistente | El recurso pedido no existe. |
| **409 Conflict** | Transición inválida: salto de estado, `EN_CURSO → CANCELADA`, o cualquier cambio sobre `FINALIZADA`/`CANCELADA` | La petición es sintácticamente correcta y el usuario está autorizado, pero **entra en conflicto con el estado actual del recurso**. El mensaje siempre nombra el estado actual y el solicitado, p. ej. `Transición de estado inválida: la reserva está en "FINALIZADA" y se solicitó "CONFIRMADA"`. Un `400` perdería la noción de que el recurso existe; un `403` sugeriría un problema de permisos que no existe. |
| **500 Internal Server Error** | Solo errores no controlados (excepciones ajenas a `HttpException`) | Nunca se usa para validación, autorización, no encontrado ni conflictos: el filtro conserva el código real de cada `HttpException` y registra en el log los errores de verdad inesperados. |

Orden de evaluación en `PATCH /reservas/:id/estado`: primero identidad/propiedad
(`403`), luego transición (`409`) y finalmente la prohibición de cancelar (`403`).
Por ejemplo, un recepcionista que intenta `EN_CURSO → CANCELADA` recibe `409` porque
la transición no está permitida para nadie.

---

## 10. Estructura del proyecto

```
src/
├── common/
│   ├── decorators/      # @Roles, @CurrentUser
│   ├── dto/             # ErrorRespuestaDto (documentado en Swagger)
│   ├── enums/           # Rol
│   ├── filters/         # HttpExceptionFilter
│   └── guards/          # ApiKeyGuard, UsuarioGuard, RolesGuard
├── config/              # env.config.ts, env.validation.schema.ts (zod), swagger.config.ts
├── modules/
│   ├── reservas/
│   │   ├── dto/         # CrearReservaDto, ActualizarEstadoDto, FiltrarReservasDto
│   │   ├── entities/    # Reserva (TypeORM)
│   │   ├── enums/       # EstadoReserva, TipoHabitacion
│   │   ├── reglas-estado.ts    # máquina de estados (RN-03)
│   │   ├── reglas-estadia.ts   # reglas de fechas (RN-01)
│   │   ├── reservas.service.ts # toda la lógica de negocio
│   │   ├── reservas.controller.ts
│   │   └── reservas.module.ts
│   └── usuarios/        # usuarios en memoria y su rol
├── app.module.ts        # ConfigModule, TypeORM, guards globales
└── main.ts              # ValidationPipe, interceptor, filtro, Swagger, puerto
scripts/evidencias.ps1   # suite de escenarios con curl
test/reservas.e2e-spec.ts
docs/evidencias/evidencias.txt
```

---

## 11. Pruebas y evidencias

```bash
npm test          # unitarias: reglas de estado y de fechas
npm run test:e2e  # 35 escenarios e2e (Supertest + SQLite en memoria)
```

Las e2e cubren los criterios de aceptación: protección por API Key y por usuario,
validación de DTO y fechas, persistencia en TypeORM, visibilidad por rol en listado
y por id, transiciones válidas e inválidas, cancelación restringida, filtro por
estado, estandarización de respuestas y presencia del documento OpenAPI.

Evidencias con curl (requiere la API corriendo):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/evidencias.ps1
```

El script ejecuta 44 escenarios contra `http://localhost:3000`, imprime método,
encabezados, cuerpo, código HTTP esperado/obtenido y respuesta, y guarda el resultado
en `docs/evidencias/evidencias.txt`. Sale con código distinto de 0 si algún escenario
no produce el código esperado.

---

## 12. Notas de implementación

- **Swagger** documenta los cuerpos de petición con ejemplos, los parámetros de ruta
  y de consulta, los códigos de respuesta relevantes y los encabezados `x-api-key` y
  `x-user` (esquemas `API Key` y `Usuario`, usables desde el botón *Authorize*).
- El DTO de registro **no** contiene `id`, `estado`, `creadaEn` ni `actualizadaEn`:
  los genera el sistema (`uuid`, `default`/lógica de negocio y columnas
  `@CreateDateColumn` / `@UpdateDateColumn`) y cualquier intento de enviarlos
  responde `400`.
- Las claves, la ruta de la base de datos y el puerto **solo** viven en `.env`,
  que está incluido en `.gitignore`.
- `GET /` no está definida a propósito: responde `404` con el formato normalizado.

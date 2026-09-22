# Plataforma de Eventos e Inscripciones

API REST en Node.js + Express + MongoDB para gestionar eventos, inscripciones y usuarios, construida en capas: **DAO → Repository → Service → Controller → DTO**, con autenticación centralizada en **Passport.js** (JWT en cookie httpOnly) y autorización por roles.

## Instalación

```bash
git clone <url-del-repo>
cd eventos-api
npm install
cp .env.example .env   # completar MONGO_URL, JWT_SECRET y (opcional) SMTP
npm run seed            # datos de prueba
npm run dev              # o npm start
```

Requiere Node 20+ y una instancia de MongoDB (local o Atlas). Si no se configuran las variables de mail, la app funciona igual y el envío de notificaciones se omite con un warning.

### Datos de prueba

```bash
npm run seed
```

Crea 4 usuarios (contraseña `123456` en todos):

| Email | Rol |
|---|---|
| `admin@mail.com` | admin |
| `laura@mail.com` | organizer |
| `pedro@mail.com` | user |
| `sofia@mail.com` | user |

Y dos eventos ya publicados (uno con cupo 2, para probar el caso de "sin cupos"). El script es idempotente: si los usuarios ya existen, los omite.

### Publicar en GitHub

```bash
git init
git add .
git commit -m "Plataforma de eventos: arquitectura en capas + Passport + roles"
git branch -M main
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```

`.gitignore` ya excluye `node_modules/` y `.env`. Verificá con `git status` antes de pushear.

## Arquitectura en capas

```
request
  ↓
routes/         define las rutas y aplica middlewares (auth, roles)
  ↓
controllers/    extrae body/params/query, llama al service, responde
  ↓
services/       reglas de negocio (cupos, estados, duplicados, permisos, email) + DTO
  ↓
repositories/   métodos orientados al dominio (findByEmail, sumConfirmedQuantityByEvent…)
  ↓
dao/            único acceso a Mongoose (findById, create, update, count, aggregate…)
  ↓
models/         esquemas de Mongoose
```

| Capa | Responsabilidad | Qué NO hace |
|---|---|---|
| **models** | Esquemas y validaciones de Mongoose (`users`, `events`, `tickets`). | No contiene lógica de negocio. |
| **dao** | `UserDAO`, `EventDAO`, `TicketDAO`. **Únicos archivos que importan modelos de Mongoose.** Operaciones genéricas: `findById`, `find`, `create`, `updateById`, `count`, `sumQuantity` (aggregate). | No conoce reglas de negocio. |
| **repositories** | `UserRepository`, `EventRepository`, `TicketRepository`. Traducen el dominio a acceso a datos: `findByEmail`, `findPublishedEvents`, `sumConfirmedQuantityByEvent`, `cancelTicket`. Populan con `select` acotado. | No importan modelos ni Mongoose. |
| **services** | `AuthService`, `EventService`, `TicketService`, `UserService`. Concentran toda la lógica: hash de contraseñas, validación de cupos y estados, duplicados, permisos, envío de email. | No importan DAOs ni modelos; no tocan `req`/`res`. |
| **controllers** | Solo coordinan: leen `body`/`params`/`query`, llaman al service, devuelven la respuesta. | No importan modelos ni repositories, no calculan reglas de negocio. |
| **dto** | `UserDTO`, `EventDTO`, `TicketDTO`. Definen qué campos salen de la API. Filtran también los documentos relacionados por `populate`. | Nunca exponen `password`, `__v` ni campos internos. |
| **middlewares** | `authenticate`/`optionalAuthenticate` (401), `authorize` (403, en archivo separado), y el manejador central de errores. | — |

### Passport.js: cómo se integra sin romper las capas

`src/config/passport.config.js` centraliza **tres estrategias**, inicializadas en `app.js` (`passport.initialize()`) y nunca definidas ahí:

- **`register`** (Local Strategy): recibe el body, llama a `AuthService.registerCore()` — que hace toda la validación, normalización, hash y alta — y deja el usuario creado en `req.user`. La ruta solo hace `passport.authenticate("register", ...)`.
- **`login`** (Local Strategy): llama a `AuthService.validateCredentials()`. Si las credenciales no matchean, responde con el mensaje genérico `"Credenciales invalidas"` sin aclarar si falló el email o la contraseña. **El JWT se genera en el controller**, nunca en la estrategia.
- **`current`** (JWT Strategy): lee el JWT desde la cookie `currentUser`, lo verifica y deja el usuario en `req.user`.

Las estrategias son **adaptadores delgados**: la lógica real vive en los services (capa que ya exige la arquitectura del proyecto), así que agregar un provider externo (Google, GitHub) más adelante es agregar un `passport.use(new GoogleStrategy(...))` en este mismo archivo y una ruta nueva — sin tocar `app.js` ni el resto de las capas.

## Autenticación (JWT + cookie)

- El JWT se firma y verifica en `src/utils/jwt.js` (único lugar), con payload `{ id, email, role }`.
- Se guarda en una cookie llamada **`currentUser`**, con `httpOnly: true`, `sameSite: "lax"`, `maxAge: 3600000` (1 hora) y `secure: true` solo en producción.
- `POST /api/sessions/logout` no pasa por Passport: solo limpia la cookie.

## Roles y autorización

`role` en el modelo `User` acepta `user` (default), `organizer` y `admin`. **El registro público nunca permite elegir rol**: `POST /api/sessions/register` siempre crea usuarios `user`, sin importar qué venga en el body. Asignar otro rol es una operación administrativa (`userRepository.updateRole`), usada solo por el script `seed`.

### Matriz de permisos

| Acción | user | organizer | admin |
|---|---|---|---|
| Consultar eventos publicados | ✅ | ✅ | ✅ |
| Crear eventos | ❌ | ✅ | ✅ |
| Modificar/cancelar eventos propios | ❌ | ✅ | ✅ |
| Modificar cualquier evento | ❌ | ❌ | ✅ |
| Ver todos los usuarios (`GET /api/users`) | ❌ | ❌ | ✅ |

### 401 vs 403

- **401 (`"No autenticado"`)**: no hay cookie, o el token es inválido/expiró. Lo produce el middleware `authenticate`.
- **403 (`"No tenes permisos para realizar esta accion"`)**: hay sesión válida, pero el rol no alcanza, o el recurso no le pertenece. Lo produce el middleware `authorize` (roles) o el `service` (propiedad del recurso, ej. editar el evento de otro organizador).

Ambos middlewares están en archivos separados y son reutilizables: `middlewares/auth.middleware.js` (autenticación) y `middlewares/authorize.middleware.js` (autorización por rol).

## Manejo de errores

Un único middleware (`src/middlewares/error.middleware.js`) es la salida de todos los errores de la API, con formato consistente:

```jsonc
// éxito
{ "status": "success", "payload": { /* ... */ } }
// o, para acciones sin payload (login, logout)
{ "status": "success", "message": "Login correcto" }

// error (siempre el mismo formato)
{ "status": "error", "message": "No quedan cupos disponibles para este evento" }
```

| Código | Cuándo | Ejemplo |
|---|---|---|
| 400 | Datos inválidos o faltantes | registro sin email, `capacity` no entero |
| 401 | Sin sesión o token expirado | `GET /api/sessions/current` sin cookie |
| 403 | Autenticado pero sin permisos | `user` intentando `POST /events`, cancelar un ticket ajeno |
| 404 | Recurso inexistente | evento o ticket con id válido pero no encontrado |
| 409 | Conflicto de estado | email ya registrado, sin cupos, inscripción duplicada, evento ya cancelado |
| 500 | Error interno no previsto | se loguea con stack, nunca se usa como respuesta genérica de negocio |

## Endpoints

### Sesiones — `/api/sessions`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/register` | — | Crea usuario (siempre `role: "user"`) |
| POST | `/login` | — | Valida credenciales, setea cookie `currentUser` |
| GET | `/current` | cookie | Devuelve `{ id, email, role }` |
| POST | `/logout` | — | Limpia la cookie (no pasa por Passport) |

**Ejemplos:**

`POST /sessions/login` → `200` + cookie `currentUser` httpOnly:
```json
{ "status": "success", "message": "Login correcto" }
```
Credenciales inválidas → `401`:
```json
{ "status": "error", "message": "Credenciales invalidas" }
```
`GET /sessions/current` (con cookie) → `200`:
```json
{ "status": "success", "payload": { "id": "665f2a...", "email": "ana@mail.com", "role": "user" } }
```
Sin cookie → `401`:
```json
{ "status": "error", "message": "No autenticado" }
```

### Usuarios — `/api/users`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | admin | Lista todos los usuarios (paginado, sin password) |

### Eventos — `/api/events`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | — | Eventos publicados; filtros `search`, `category`, `location`, `dateFrom`, `dateTo`; orden con `sort` (`date`, `-date`, `price`, `-price`, etc.); paginado |
| GET | `/mine` | organizer/admin | Eventos propios |
| GET | `/:eid` | opcional | Detalle con `availableSeats`; si no está publicado, solo lo ve el organizador |
| POST | `/` | organizer/admin | Crea evento (`organizer` se toma del usuario autenticado, nunca del body) |
| PUT | `/:eid` | dueño/admin | Edita campos (no permite bajar el cupo por debajo de lo ya confirmado) |
| PATCH | `/:eid/status` | dueño/admin | Único endpoint de cambio de estado: `draft` → `published` → `cancelled`/`finished` |
| GET | `/:eid/tickets` | dueño/admin | Inscriptos del evento |
| POST | `/:eid/tickets` | JWT | Inscribe al usuario autenticado |

El modelo `Event` no expone ningún endpoint de borrado físico: cancelar (`status: "cancelled"`) es la única forma de dar de baja un evento, tal como pide la regla de negocio.

Respuesta de listado (`GET /events`):
```json
{ "status": "success", "payload": { "data": [ /* eventos */ ], "page": 1, "limit": 20, "total": 2, "totalPages": 1 } }
```

### Tickets — `/api/tickets`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/` | JWT | Alias plano de inscripción, recibe `{ "eventId": "..." }` |
| GET | `/my-tickets` | JWT | Tickets propios (alias: `/mine`) |
| GET | `/:tid` | dueño/admin | Detalle del ticket |
| PATCH | `/:tid/cancel` | dueño/admin | Cancela la inscripción (`status: "cancelled"`, `cancelledAt` seteado) |

Estados de ticket: `pending`, `confirmed` (default al inscribirse), `cancelled`. Solo los `confirmed` ocupan cupo — un ticket cancelado libera el lugar automáticamente.

## Reglas de negocio (en services)

- El cupo se calcula sumando el campo `quantity` de todos los tickets `confirmed` del evento (no la cantidad de documentos), vía `TicketDAO.sumQuantity` (aggregate de Mongo).
- No se puede inscribir a un evento inexistente (404), no publicado, cancelado o finalizado (409), ni si ya pasó la fecha.
- Inscripción duplicada: un usuario no puede tener dos tickets `confirmed` del mismo evento.
- El organizador no puede inscribirse a su propio evento.
- Un evento en estado `cancelled` o `finished` es inmutable: no admite más cambios de estado ni ediciones.
- Ver, cancelar o editar recursos ajenos → 403.
- Al confirmar la inscripción se envía un email (Nodemailer) con el código de reserva; si el SMTP falla, la inscripción no se pierde (se loguea el error).

## Variables de entorno

```
PORT, NODE_ENV
MONGO_URL
JWT_SECRET, JWT_EXPIRES_IN, COOKIE_NAME
MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM
```

Ver `.env.example` para el detalle completo. Nunca se hardcodean credenciales ni el `JWT_SECRET` en el código.

## Casos de prueba sugeridos

1. **Flujo completo**: registro → login → `/current` → logout → `/current` da 401.
2. Registro con email duplicado → 409. Login con contraseña incorrecta → 401 con mensaje genérico.
3. `POST /events` con rol `user` → 403; con `organizer` → 201.
4. `GET /users` con rol `organizer` → 403; con `admin` → 200.
5. Crear evento con `capacity: 0` o fecha pasada → 400.
6. `organizer` modificando evento ajeno → 403; `admin` modificando cualquiera → 200.
7. Inscribirse dos veces al mismo evento → 409. Evento con cupo 2 y dos inscripciones de `quantity: 2` → la segunda da 409 por falta de cupo.
8. Cancelar un ticket propio → cupo liberado (una nueva inscripción por ese cupo funciona). Cancelar un ticket ajeno como `user` → 403.
9. `GET /events?category=tecnologia&dateFrom=2027-01-01&sort=-date` → filtra y ordena correctamente.

`docs/requests.http` tiene la colección lista para ejecutar desde VS Code (extensión REST Client).

## Estructura del proyecto

```
src/
├── app.js               # configuración de Express y middlewares
├── server.js             # arranque: conexión a Mongo + listen
├── config/                # env, conexión a DB, estrategias de Passport
├── models/                # esquemas de Mongoose
├── dao/                    # única capa con acceso a Mongoose
├── repositories/           # capa de dominio sobre los DAO
├── services/               # reglas de negocio
├── controllers/            # request/response
├── dto/                     # forma de las respuestas
├── routes/                  # definición de rutas
├── middlewares/             # auth, authorize, 404 y errores
├── scripts/                 # seed de datos de demo
└── utils/                   # errores, hash, jwt, validaciones, mailer, logger
```

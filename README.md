# Plataforma de Eventos e Inscripciones — Pre-entrega 8

API REST en Node.js + Express + MongoDB refactorizada a una **arquitectura profesional en capas**: DAO, Repository, Service, Controller y DTO. El comportamiento externo de los endpoints no cambió: las mismas rutas de sesiones, eventos y tickets siguen funcionando igual.

## Instalación

```bash
git clone <url-del-repo>
cd eventos-api
npm install
cp .env.example .env   # completar MONGO_URI, JWT_SECRET y (opcional) SMTP
npm run dev            # o npm start
```

Requiere Node 20+ y una instancia de MongoDB (local o Atlas). Si no se configuran las variables de mail, la app funciona igual y el envío de notificaciones se omite con un warning.

### Datos de prueba

```bash
npm run seed
```

Crea un organizador (`laura@mail.com`), dos asistentes (`pedro@mail.com`, `sofia@mail.com`) — todos con contraseña `123456` — y dos eventos publicados, uno de ellos con cupo 2 para probar el caso de "sin cupos". El script es idempotente: si los usuarios ya existen, los omite.

### Publicar en GitHub

```bash
git init
git add .
git commit -m "Pre-entrega 8: arquitectura con DAO, Repository y DTO"
git branch -M main
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```

`.gitignore` ya excluye `node_modules/` y `.env`. Antes de pushear, verificá con `git status` que `.env` no aparezca y que sí estén `.env.example`, `package.json` y este README.

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
repositories/   métodos orientados al dominio (findByEmail, countActiveTickets…)
  ↓
dao/            único acceso a Mongoose (findById, create, update, count…)
  ↓
models/         esquemas de Mongoose
```

### Responsabilidad de cada capa

| Capa | Qué hace | Qué NO hace |
|---|---|---|
| **models** | Definen los esquemas y validaciones de Mongoose (`users`, `events`, `tickets`). | No contienen lógica de negocio. |
| **dao** | `UserDAO`, `EventDAO`, `TicketDAO`. Son los **únicos archivos que importan modelos de Mongoose**. Exponen operaciones genéricas: `findById`, `findOne`, `find`, `create`, `updateById`, `deleteById`, `count`. | No conocen reglas de negocio ni arman respuestas. |
| **repositories** | `UserRepository`, `EventRepository`, `TicketRepository`. Usan el DAO y traducen el dominio a acceso a datos: `findByEmail`, `findPublishedEvents`, `countActiveTicketsByEvent`, `findActiveTicketByUserAndEvent`, `cancelTicket`. Definen los `populate` con `select` acotado. | No importan modelos ni Mongoose. |
| **services** | `AuthService`, `EventService`, `TicketService`. Concentran **toda** la lógica: hash de contraseñas, emisión de JWT, validación de cupos y estados, inscripciones duplicadas, permisos sobre recursos propios, envío de email. Devuelven DTOs. | No importan DAOs ni modelos; nunca tocan `req`/`res`. |
| **controllers** | Sólo coordinan: leen `body`/`params`/`query`, llaman al service y devuelven la respuesta con el formato común. | No importan modelos, no calculan cupos ni validan reglas. |
| **dto** | `UserDTO`, `EventDTO`, `TicketDTO`. Definen exactamente qué campos salen de la API. Filtran también los documentos relacionados por `populate`. | Nunca exponen `password` (ni hasheada), `__v` ni campos internos. |
| **middlewares** | `authenticate` / `optionalAuthenticate` / `authorize` (roles) y el **manejador central de errores**. | — |

### Cambiar de motor de persistencia

Como Mongoose está confinado a `src/dao`, migrar a otro motor implica escribir un nuevo DAO con la misma interfaz e inyectarlo en el repository (`new UserRepository(nuevoDao)`). Services, controllers y DTOs no se tocan.

## Manejo de errores

Un único middleware (`src/middlewares/error.middleware.js`) es la salida de todos los errores. Los services lanzan `AppError` mediante los helpers de `src/utils/errors.js` y el middleware traduce además errores técnicos conocidos (`CastError` → 400, `ValidationError` → 400, clave duplicada `11000` → 409, errores de JWT → 401).

| Código | Cuándo | Ejemplo |
|---|---|---|
| 400 | Datos inválidos o faltantes | registro sin email, `capacity` no entero, id con formato inválido |
| 401 | Sin sesión o token expirado | `GET /api/sessions/current` sin cookie |
| 403 | Autenticado pero sin permisos | cancelar un ticket ajeno, editar un evento de otro organizador |
| 404 | Recurso inexistente | evento o ticket con id válido pero no encontrado |
| 409 | Conflicto de estado | email ya registrado, evento sin cupos, inscripción duplicada, ticket ya cancelado |
| 500 | Error interno no previsto | fallo inesperado (se loguea con stack) |

**Formato de respuesta** (consistente en toda la API):

```jsonc
// éxito
{ "status": "success", "payload": { /* ... */ } }

// error
{ "status": "error", "error": { "code": "CONFLICT", "message": "No quedan cupos disponibles para este evento" } }
```

## Endpoints

### Sesiones — `/api/sessions`
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/register` | — | Registra usuario (`role`: `user` u `organizer`) y devuelve JWT en cookie httpOnly |
| POST | `/login` | — | Inicia sesión |
| GET | `/current` | JWT | Usuario autenticado **sin** `password` |
| POST | `/logout` | JWT | Cierra sesión y limpia la cookie |

### Eventos — `/api/events`
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | — | Eventos publicados, con paginación y filtros `search` y `location` |
| GET | `/mine` | organizer/admin | Eventos propios |
| GET | `/:eid` | opcional | Detalle con `availableSeats`; si no está publicado, sólo el organizador |
| POST | `/` | organizer/admin | Crea evento |
| PUT | `/:eid` | organizer/admin dueño | Edita (no permite bajar el cupo por debajo de las inscripciones activas) |
| POST | `/:eid/publish` | organizer/admin dueño | Publica |
| POST | `/:eid/cancel` | organizer/admin dueño | Cancela |
| DELETE | `/:eid` | organizer/admin dueño | Elimina (409 si tiene inscripciones activas) |
| GET | `/:eid/tickets` | organizer/admin dueño | Inscriptos del evento |
| POST | `/:eid/inscriptions` | JWT | Inscribe al usuario autenticado |

### Tickets — `/api/tickets`
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/` | JWT | Inscripción enviando `{ "eventId": "..." }` |
| GET | `/mine` | JWT | Tickets propios (filtro opcional `status`) |
| GET | `/:tid` | JWT dueño | Detalle del ticket |
| PUT | `/:tid/cancel` | JWT dueño | Cancela la inscripción |

## Reglas de negocio (en services)

- No se puede inscribir a un evento inexistente (404), en borrador o cancelado (409), o ya finalizado (409).
- Cupos: se cuentan los tickets **activos** del evento; si llegan a `capacity`, la inscripción devuelve 409.
- Inscripción duplicada: un usuario no puede tener dos tickets activos del mismo evento (409).
- El organizador no puede inscribirse a su propio evento (409).
- Ver, cancelar o editar recursos ajenos devuelve 403.
- Al confirmar la inscripción se envía un email con el código del ticket; si el SMTP falla, la inscripción no se pierde.

## Casos de prueba sugeridos

1. **Flujo completo**: registro → login → crear evento → publicar → inscribirse → `GET /tickets/mine` → cancelar.
2. `GET /api/sessions/current` → la respuesta no contiene `password`.
3. `GET /api/tickets/mine` → el `user` populado sólo trae id, nombre, email y rol.
4. Inscribirse dos veces al mismo evento → **409**, no 500. Evento con `capacity: 1` y dos usuarios → el segundo recibe **409**.
5. `GET /api/sessions/current` sin cookie → **401**. Cancelar el ticket de otro usuario → **403**.

En `docs/requests.http` está la colección lista para ejecutar desde VS Code (extensión REST Client) o para importar a Postman.

## Estructura del proyecto

```
src/
├── app.js               # configuración de Express y middlewares
├── server.js            # arranque: conexión a Mongo + listen
├── config/              # env, conexión a DB, estrategia JWT de Passport
├── models/              # esquemas de Mongoose
├── dao/                 # única capa con acceso a Mongoose
├── repositories/        # capa de dominio sobre los DAO
├── services/            # reglas de negocio
├── controllers/         # request/response
├── dto/                 # forma de las respuestas
├── routes/              # definición de rutas
├── middlewares/         # auth, roles, 404 y errores
├── scripts/             # seed de datos de demo
└── utils/               # errores, hash, validaciones, mailer, logger
```

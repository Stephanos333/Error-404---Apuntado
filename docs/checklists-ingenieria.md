# Checklists de ingeniería aplicadas (Richards & Ford, 2025, cap. 24)

Entregable 3, MVP del Sistema Apuntado. Rama `feature/entregable-3-mvp`.

Las checklists del capítulo 24 sirven para que el equipo no olvide pasos obvios pero fáciles de
saltar. Se aplicaron tres: **completitud de código**, **pruebas unitarias y funcionales** y
**liberación**. Cada ítem tiene un estado y la evidencia verificable en el repositorio.

Convenciones: ✅ cumplido · ⚠️ cumplido con observación · ❌ pendiente (bloquea o se registra como deuda).

---

## Checklist 1. Developer Code-Completion Checklist

Se revisa antes de dar por terminado cualquier cambio y antes de abrir el Pull Request.

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| 1.1 | No quedan `console.log` de depuración en el backend | ✅ | `findstr /s "console." backend/src/*.ts backend/plugins/*.ts`: 0 resultados. El backend registra con `Logger` de NestJS. El único `console.log` que existía (liquidación en segundo plano en `player.controller.ts`) se eliminó en la fase 2. |
| 1.2 | No quedan `console.log` de depuración en el frontend | ✅ | Se retiraron los tres que había. `websocket.provider.tsx` ya no imprime "Socket connected." y ahora informa `connect_error` con `console.error`. `backend.utils.tsx` ya no imprime todos los errores: usa el *callback* de la pantalla y, si no hay *callback*, `console.error`. `card-design-article.component.tsx` ya no imprime "Not implemented yet": el clic solo actúa si el diseño es seleccionable. |
| 1.3 | Sin código muerto | ✅ | Se buscaron archivos que ningún módulo de producción importa (análisis de imports con `ts.preProcessFile`). Se eliminaron: las tablas `allowed-trips.ts` y `allowed-quads.ts`, `card-value.constants.ts` y `carta.mapper.ts` (fase 1); el flujo `Match` (dominio, servicio, esquemas, 6 eventos y sus *handlers*) y los *requests* de los endpoints antiguos (fase 2); `card-with-design.ts`, `CardWithDesignApiDTO` y 5 excepciones de jugador sin uso (fase 3); en el frontend, el modelo del tablero del prototipo (`game.board.utils.ts`, `card.type.ts`, `player.type.ts`, `match.type.ts`, `card-deck.type.ts`, `discarded-cards.type.ts`, los tipos de `pass-shift`, `pull-from-*`, `win-match` y `get-current-player`, `card-component-type.constants.ts` y `player.constants.ts`) (fase 4). |
| 1.4 | Sin excepciones absorbidas en silencio (*swallowed exceptions*) | ✅ | Ver la tabla 1.4 más abajo. Cada `catch` del backend relanza, traduce a una excepción de dominio o registra con `Logger.error` por una decisión documentada. En el frontend, el `.catch()` vacío de `refreshAccessToken` se eliminó: no capturaba nada y aparentaba manejar el error. |
| 1.5 | Errores de dominio explícitos y con código estable | ✅ | `ExceptionMessagesConstants` (`RONDA_YA_CERRADA`, `TURNO_NO_CORRESPONDE`, `VERSION_DESACTUALIZADA`, `GRUPOS_INVALIDOS`...). `PartidaConflictException` responde HTTP 409 y `PartidaInvalidaException` HTTP 400. `DomainException` (pura, en `card/`) se traduce a 400 en `AppExceptionFilter`. |
| 1.6 | Complejidad ciclomática dentro del umbral | ✅ | FF-04: ningún método del evaluador, los plug-ins, `dominio/partida` ni `aplicacion/partida` supera CC 10; el resto del backend no supera CC 15. |
| 1.7 | Sin dependencias cíclicas y motor de reglas sin framework | ✅ | FF-03 y FF-05 en modo estricto (`npm run test:estricto`): 0 violaciones con `linea-base.json` vacío. |
| 1.8 | Secretos fuera del código | ✅ | Los JWT se leen del entorno. `.env` está en `.gitignore` (raíz, backend y frontend). `start.sh` y `start.bat` generan secretos aleatorios con `openssl rand` o `RandomNumberGenerator`. `docker-compose.yml` falla si faltan (`${JWT_SECRET:?...}`). |
| 1.9 | Dependencias usadas declaradas explícitamente | ✅ | `uuid` se importaba (`card-design-id.ts`, ids de dominio) pero solo llegaba como dependencia transitiva; se agregó a `dependencies`. `typescript` se fijó en `~5.4.5` porque `"*"` resolvía TS 7 e impedía instalar. |
| 1.10 | Código con estilo del proyecto | ⚠️ | ESLint del backend y del frontend: el único error restante es `linebreak-style` (CRLF), que es un artefacto del *checkout* en Windows con `core.autocrlf=true`; en el índice de git los archivos están en LF. Los dos errores reales de comillas del frontend (`app.router.tsx` y `profile-config.component.tsx`) se corrigieron. |

### 1.4 Inventario de bloques `catch` del backend

| Archivo | Comportamiento | Justificación |
|---|---|---|
| `aplicacion/partida/turn-orchestrator.service.ts` | Solo intercepta `EscrituraSinCoincidencia` (otro comando ganó la carrera) para responder `RONDA_YA_CERRADA`, `TURNO_NO_CORRESPONDE` o `VERSION_DESACTUALIZADA`. Cualquier otro error se **relanza**. | R03: el perdedor recibe un error controlado y explícito. |
| `game/events/*/…event-handler.ts` (3 archivos) | Registran con `Logger.error` y no relanzan. | ADR-05: un suscriptor (notificación por WebSocket) no puede alterar un comando ya confirmado. El estado persistido es la fuente de verdad y el cliente lo recupera con `GET /api/partidas/actual`. |
| `security/guards/game.guard.ts` | Registra y lanza `UserIsNotPartOfAGameException`. | Traduce cualquier fallo de la guardia en un 403 de negocio. |
| `security/guards/jwt.socket.strategy.ts` | Devuelve `false`, y `JwtGuard` lanza `UnauthorizedException`. | Un token inválido en el *handshake* se rechaza de forma explícita. |
| `security/session.service.ts` | Lanza `InvalidCredentialsException(INVALID_REFRESH_TOKEN_ERROR)`. | No filtra detalles de la verificación del JWT. |
| `shared/exceptions/app.exception-filter.ts` | Filtro global: transforma toda excepción en una respuesta HTTP o WebSocket con `code` y `message`. | Punto único de traducción de errores. |

---

## Checklist 2. Unit & Functional Testing Checklist

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| 2.1 | Pruebas unitarias de cada regla de negocio | ✅ | `reglas/evaluador/evaluador-manos.spec.ts`, `reglas/registro/registro-reglas.spec.ts`, `plugins/clasica/*.spec.ts`, `plugins/apuntado/*.spec.ts`, `dominio/partida/comandos-partida.spec.ts`. Este último cubre tocar y la ronda extra (fase 4): tocar válido abre `RONDA_EXTRA` con los rivales pendientes en orden de turno, el último descarte liquida la ronda para todos (el tocador paga su sobrante), tocar otra vez en la ronda extra da `CIERRE_NO_PERMITIDO` y el 4-3-3 sigue permitido. |
| 2.2 | Oráculo de regresión contra el prototipo | ✅ | El evaluador acepta exactamente las 260 ternas y las 299 cuartas de las tablas eliminadas. Se recorren todas las combinaciones con repetición de 3 y 4 cartas. |
| 2.3 | Suite de contrato común a todos los plug-ins | ✅ | `backend/plugins/contrato.spec.ts` ejecuta la misma batería contra Clásica y Apuntado (ADR-03). |
| 2.4 | **Caso borde A**: mano con 3 ternas incompletas | ✅ | Ver la tabla de casos borde. |
| 2.5 | **Caso borde B**: sobrante de exactamente 5 puntos al tocar | ✅ | Ver la tabla de casos borde. |
| 2.6 | **Caso borde C**: fin de partida exactamente en 101 y victoria en -51 | ✅ | Ver la tabla de casos borde. |
| 2.7 | Pruebas de concurrencia e idempotencia | ✅ | `backend/test/concurrencia-cierre.e2e-spec.ts`: replica set real en memoria y validadores de `docs/schemas`. Cubre dos cierres simultáneos (uno gana y el pozo se paga una vez), doble clic (`RONDA_YA_CERRADA`), mismo `idComando` (idempotente), Apuntado (una sola liquidación), versión desactualizada y doble inicio (apuestas cobradas una vez). |
| 2.8 | Seguridad: sin fuga de cartas por WebSocket (R04) | ✅ | `game/socket/notificaciones-partida.spec.ts` revisa en profundidad cada mensaje de la sala `partida:{id}` (sin `manos`, `mazo`, `cartas`, `cardsMap`, ...) y comprueba que cada sala `usuario:{id}` solo reciba su mano. |
| 2.9 | Persistir antes de notificar (ADR-05) | ✅ | `aplicacion/partida/turn-orchestrator.service.spec.ts`: si `guardar()` falla o pierde la carrera, no se publica ningún evento. |
| 2.10 | Pruebas de arquitectura (fitness functions) | ✅ | `tests/architecture`: 28 pruebas (FF-01 a FF-06) en modo trinquete y en modo estricto. |
| 2.11 | Pruebas funcionales de la interfaz | ✅ | `frontend/src/utils/partida/partida.utils.test.ts` (Vitest, `yarn test`) prueba la lógica de la que depende el tablero: `idComando` UUID v4, traducción de las intenciones (`fuente`, cartas, grupos y declaración) a los índices del contrato REST (incluidas dos cartas iguales de barajas distintas), rechazo local con `GRUPOS_INVALIDOS` de una declaración que no cubre exactamente la mano, forma del cierre (4-3-3 o tocar), conservación de la organización local al llegar una mano nueva, regla de versiones (nunca retroceder, releer ante un salto) y errores que obligan a releer el estado. El recorrido completo con dos navegadores se ejecuta en el flujo de humo del `README.md` (ver 3.11). |

### Casos borde exigidos por la guía

| Caso | Prueba | Qué verifica |
|---|---|---|
| **A.** Mano con 3 ternas incompletas | `backend/plugins/casos-borde.spec.ts` (contrato) y `backend/src/dominio/partida/casos-borde.spec.ts` (agregado) | Tocar con 3 "ternas" en las que la tercera carta rompe la combinación se rechaza con motivo; un 4-3-3 con grupos incompletos se rechaza en Clásica y en Apuntado; los grupos de 2 cartas no cuentan como ternas. De punta a punta, el intento devuelve `CIERRE_FALLIDO`, suma el castigo (+3), la ronda sigue en el mismo turno y queda `intentoCierre: true`. |
| **B.** Sobrante de exactamente 5 puntos | `backend/plugins/casos-borde.spec.ts` | Con 3 ternas válidas, la sobrante de 5 se **rechaza** ("La sobrante debe valer menos de 5 puntos"). La de 4 se acepta (frontera inferior). El A, que vale 10, se rechaza. |
| **C.** Umbrales de fin de partida | `backend/plugins/casos-borde.spec.ts` y `backend/src/dominio/partida/casos-borde.spec.ts` | Regla: 100 no elimina y 101 exactos elimina; con 2 jugadores eso termina la partida. Con 3 jugadores, 101 elimina pero la partida continúa. -50 no gana y -51 exactos gana. En el agregado: si el rival queda en 100 se reparte la ronda 2; si llega a 101 exactos la partida pasa a `FINALIZADA` con el marcador `eliminado: true`; si quien cierra baja a -51 exactos gana la partida. |

### Resultados de la última ejecución

| Suite | Comando | Resultado |
|---|---|---|
| Unitarias, de contrato y casos borde | `cd backend && npx jest` | 10 suites, **102/102** |
| Lógica del tablero del frontend | `cd frontend && yarn test` | 1 suite, **16/16** |
| Concurrencia (MongoDB replica set en memoria) | `cd backend && npm run test:e2e` | 1 suite, **8/8** |
| Fitness functions, modo trinquete | `cd tests/architecture && npm test` | 7 suites, **28/28** |
| Fitness functions, modo estricto | `cd tests/architecture && npm run test:estricto` | 7 suites, **28/28** |

---

## Checklist 3. Software Release Checklist

Se revisa antes de liberar una versión (merge a `main` y despliegue).

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| 3.1 | Script de creación de colecciones e índices versionado | ✅ | `docs/schemas/crear-colecciones.mongodb.js` crea las 8 colecciones del modelo documental con validador e índices. Destacan `asientos_tokens.referencia` único (sin doble cobro ni doble premio) y `partidas.codigoInvitacion` único. |
| 3.2 | El script se ejecuta automáticamente al desplegar | ✅ | El servicio `mongo-init` de `docker-compose.yml` ejecuta `docker/mongo/init.sh` después de que el replica set es PRIMARY. El backend no arranca hasta que esa tarea termina con código 0 (`service_completed_successfully`). |
| 3.3 | Índices garantizados también por la aplicación | ✅ | `PartidaRepository.onModuleInit` y `AsientosTokensRepository.onModuleInit` crean sus índices al arrancar. Es idempotente y protege los despliegues que no ejecutan el script. |
| 3.4 | Validadores JSON Schema aplicados y verificados | ✅ | `validationLevel: strict` y `validationAction: error`. FF-06 compila los esquemas, acepta los ejemplos y rechaza estados inválidos. La e2e crea `partidas` y `asientos_tokens` con esos validadores, así que cualquier documento fuera del esquema haría fallar la prueba. |
| 3.5 | Datos semilla requeridos | ✅ | `docker/mongo/seed-disenos-carta.js` (idempotente) carga los diseños `DEFAULT`, `BLUE`, `RED`, `RETRO` y `NIGHT_VISION` en `card-designs`. Sin el diseño por defecto no se pueden registrar usuarios. |
| 3.6 | Base de datos con transacciones disponible | ✅ | MongoDB con `--replSet rs0`. El *healthcheck* inicia el replica set y solo reporta sano en PRIMARY. En la nube se usa MongoDB Atlas (el M0 ya es replica set). |
| 3.7 | Variables de entorno documentadas | ✅ | Ver la tabla 3.7 más abajo. Hay tres plantillas comentadas: `.env.example` (raíz, para docker-compose), `backend/.env.example` y `frontend/.env.example`. Ningún archivo `.env` se versiona. |
| 3.8 | Compilación del backend en verde | ✅ | `npx tsc --noEmit`: 0 errores. `npx nest build` genera `dist/src/main.js`. El `Dockerfile` repite `npm run build` en la etapa `build`. |
| 3.9 | Compilación del frontend en verde | ✅ | `yarn build` (`tsc && vite build`) termina en verde. Aviso no bloqueante: el *bundle* principal pesa 530 kB (170 kB gzip); conviene dividirlo con `import()`. |
| 3.10 | Imágenes de contenedor optimizadas y seguras | ✅ | Ambos Dockerfiles son multi-stage. El backend poda las dependencias de desarrollo (`npm prune --omit=dev`), corre como usuario `node` y tiene `HEALTHCHECK`. El frontend sirve estáticos con Nginx, que hace de proxy de `/api`, `/socket.io` y `/docs`. `.dockerignore` excluye `node_modules`, `dist` y `.env`. |
| 3.11 | Arranque con un solo comando | ⚠️ | `start.sh` / `start.bat` → `docker compose up --build`. `.gitattributes` fuerza LF en los `.sh`. Observación: el YAML se validó sintácticamente y cada paso de compilación se ejecutó localmente, pero `docker compose up` no se pudo ejecutar en el entorno de desarrollo de esta fase porque no tenía Docker. Antes del merge hay que ejecutarlo una vez y comprobar `docker compose ps` (todos *healthy*). |
| 3.12 | Flujo funcional completo desde la interfaz | ✅ | Fase 4. El tablero (`frontend/src/pages/game`) carga con `GET /api/partidas/actual` y juega con `POST /api/partidas/actual/comandos/{robar,descartar,cerrar}` (cliente `utils/partida/partida.client.ts`, `idComando` UUID v4 y `version` del último estado). Al conectar emite `GAME_CONNECTION_EVENT` y recibe la vista pública de `partida:{id}` y la mano de `usuario:{id}` (`PRIVATE_HAND_LISTENER`); tras un 409 o un salto de versión relee el estado. La mano se organiza en hasta 4 grupos; el botón de cierre depende de la modalidad ("Cerrar con 4-3-3" en Clásica, "Cerrar / Tocar (< 5 pts)" en Apuntado). `RONDA_YA_CERRADA`, `TURNO_NO_CORRESPONDE`, `GRUPOS_INVALIDOS` y los demás errores controlados se muestran en español. Al finalizar se muestra el ganador y el marcador. La pantalla de crear partida permite elegir la modalidad. |
| 3.13 | Instalación reproducible | ⚠️ | El frontend usa `yarn.lock` con `--frozen-lockfile`. El backend no versiona `package-lock.json` (está en `backend/.gitignore`): se recomienda versionarlo y cambiar a `npm ci`. |
| 3.14 | ADRs y documentación actualizados | ⚠️ | `README.md` incluye la ficha técnica, la guía de inicio rápido (local y nube) y las limitaciones. Falta registrar en un ADR la organización por capas de `src/` adoptada para romper los ciclos (fase 1) y actualizar los diagramas (fase de documentación). |
| 3.15 | Pipeline de CI con las fitness functions | ⚠️ | `.github/workflows/architecture-fitness.yml` ejecuta el modo trinquete como bloqueante. El modo estricto ya pasa, pero sigue como informativo (`continue-on-error`). Se recomienda volverlo bloqueante y agregar *jobs* de `jest`, `test:e2e` y los dos *builds*. |

### 3.7 Variables de entorno

| Variable | Dónde | Obligatoria | Por defecto | Uso |
|---|---|---|---|---|
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | raíz, backend | Sí | (las generan los scripts de arranque) | Firma de los tokens de acceso y de refresco |
| `JWT_EXPIRATION_TIME` / `JWT_REFRESH_EXPIRATION_TIME` | raíz, backend | No | `6h` / `10d` | Vigencia de los tokens |
| `MONGODB_URI` | raíz, backend | Sí (backend) | `mongodb://mongodb:27017/apuntado?replicaSet=rs0` | Debe ser un replica set (transacciones) |
| `APP_PORT`, `APP_GLOBAL_PREFIX`, `APP_DOCS_URI`, `APP_URL` | backend | Sí (backend) | `3000`, `api`, `docs` | Puerto, prefijo REST y ruta de Swagger |
| `APP_DEFAULT_TOKENS` | raíz, backend | No | `100` | Saldo inicial al registrarse |
| `APP_BONUS_POINTS` / `APP_FALSE_WIN_PENALTY_POINTS` | raíz, backend | No | `10` / `3` | PS-04 y PS-03, que se congelan en cada partida y se entregan al plug-in Apuntado |
| `FRONTEND_PORT`, `BACKEND_PORT`, `MONGO_PORT` | raíz | No | `5173`, `3000`, `27017` | Puertos publicados en el host |
| `VITE_BACKEND_BASE_URL` | raíz (*build arg*), frontend | No | vacío en Docker (mismo origen) | URL del backend incrustada en el *bundle* |
| `VITE_FRONTEND_BASE_URL` | raíz, frontend | No | `http://localhost:5173` | Enlaces de invitación a salas |
| `VITE_PROFILE_IMAGES_URL` / `VITE_CARD_IMAGES_URL` | frontend | No | `/assets/images/profile/` y `/assets/images/card/` | Rutas de las imágenes en `public/` |

### Procedimiento de liberación

1. `cd backend && npx jest && npm run test:e2e` y `cd frontend && yarn test`
2. `cd tests/architecture && npm test && npm run test:estricto`
3. `cd backend && npm run build` y `cd frontend && yarn build`
4. `./start.sh -d`, luego `docker compose ps` (todos *healthy*) y el flujo de humo del `README.md`
5. Revisar que no quede ningún ❌ en las tres checklists antes del merge a `main`

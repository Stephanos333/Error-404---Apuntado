# Sistema Apuntado: MVP (Entregable 3)

Juego de cartas **Apuntado** en línea con dos modalidades, **Clásica 4-3-3** y **Apuntado a 101**,
construido como un monolito modular con núcleo **microkernel** de reglas (Richards & Ford, 2025).

- Decisiones de arquitectura: [`docs/adrs/`](docs/adrs/README.md)
- Fitness functions: [`tests/architecture/`](tests/architecture/README.md)
- Checklists de ingeniería (cap. 24): [`docs/checklists-ingenieria.md`](docs/checklists-ingenieria.md)

## Ficha técnica del MVP

| Aspecto | Detalle |
|---|---|
| Estilo arquitectónico | Monolito modular por capas (ADR-01) con núcleo microkernel y plug-ins de reglas (ADR-02, ADR-03) |
| Backend | Node.js 20, NestJS 10, TypeScript 5.4, Socket.IO 4 (namespace `/game`), Swagger en `/docs` |
| Frontend | React 18, Vite 5, Material UI 5, socket.io-client 4; servido por Nginx 1.27 |
| Persistencia | MongoDB 7 como replica set (Atlas en la nube). Agregado `partidas`, libro `asientos_tokens` y validadores `$jsonSchema` (ADR-04) |
| Plug-ins de reglas | `backend/plugins/clasica` (una ronda, 4-3-3) y `backend/plugins/apuntado` (multironda, 4-3-3 y tocar, eliminación en 101 o más y victoria en -51 o menos) |
| Consistencia | Cierre y liquidación en memoria y una sola escritura atómica; transacciones `snapshot`/`majority` para apuestas y pozo; concurrencia optimista con `version` e idempotencia con `idComando` |
| Tiempo real | Sala pública `partida:{id}` (vista pública) y sala privada `usuario:{id}` (solo la mano del usuario); eventos publicados después del commit (ADR-05) |
| Seguridad | JWT de acceso y refresco, guardias por juego, barajado con `crypto.randomInt`, contenedores sin privilegios de root |
| Pruebas | 106 unitarias y de contrato (Jest), 8 de integración de concurrencia con replica set en memoria, 28 fitness functions (FF-01 a FF-06) y 16 del tablero del frontend (Vitest) |
| Ejecución | `docker compose up --build` (o `start.sh` / `start.bat`): MongoDB, inicialización de la base, backend y frontend |

### Servicios y puertos

| Servicio | Imagen / build | Puerto en el host | Descripción |
|---|---|---|---|
| `frontend` | `frontend/Dockerfile` (Vite build y Nginx) | `5173` | SPA y proxy inverso de `/api`, `/socket.io` y `/docs` |
| `backend` | `backend/Dockerfile` (multi-stage) | `3000` | API REST `/api`, WebSockets `/socket.io` y Swagger `/docs` |
| `mongodb` | `mongo:7.0 --replSet rs0` | `27017` | Replica set de un nodo (requerido por las transacciones) |
| `mongo-init` | `mongo:7.0` (tarea única) | — | Validadores, índices (`docs/schemas`) y catálogo de diseños de carta |

## Guía de inicio rápido

### 1. Requisitos

- Docker Desktop 4.x (Windows/macOS) o Docker Engine 24+ con el plugin Compose v2 (Linux).
- Puertos libres: 5173, 3000 y 27017. Se pueden cambiar en `.env`.

### 2. Ejecución local con un solo comando

```bash
git clone <url-del-repositorio> && cd Error-404---Apuntado
./start.sh          # Linux / macOS
start.bat           # Windows (CMD o doble clic)
```

Los scripts verifican que Docker esté instalado. Si no existe `.env`, lo crean desde `.env.example`
con secretos JWT aleatorios. Luego ejecutan `docker compose up --build`. Si prefiere hacerlo a
mano:

```bash
cp .env.example .env              # y reemplace JWT_SECRET y JWT_REFRESH_SECRET
docker compose up --build
```

Orden de arranque, garantizado con `healthcheck` y `depends_on`:

1. `mongodb` inicia el replica set `rs0` y queda *healthy* cuando el nodo es PRIMARY.
2. `mongo-init` aplica `docs/schemas/crear-colecciones.mongodb.js` (validadores estrictos e
   índices) y carga los diseños de carta. Es idempotente.
3. `backend` arranca cuando la base está lista y queda *healthy* cuando responde `/docs`.
4. `frontend` arranca cuando el backend está sano.

### 3. Verificar

| Qué | URL |
|---|---|
| Aplicación | http://localhost:5173 |
| API (Swagger) | http://localhost:3000/docs (también http://localhost:5173/docs) |
| Estado de los contenedores | `docker compose ps` (todos *healthy*; `mongo-init` termina con código 0) |
| Registros | `docker compose logs -f backend` |

Flujo de humo con dos navegadores (o una ventana normal y una privada):

1. Registrar dos usuarios. El primero crea un juego y elige la modalidad (Clásica o Apuntado).
2. El segundo se une con el enlace de invitación y el anfitrión inicia la partida.
3. En su turno, cada jugador roba (clic en el mazo o en el pozo), selecciona cartas sueltas y
   pulsa "Formar grupo", y descarta seleccionando una sola carta. El otro navegador ve el cambio
   de turno, el tope del pozo y el tamaño de las manos sin recargar.
4. Cerrar: con 1 cuarta + 2 ternas formadas, seleccionar la carta de descarte y pulsar el botón
   de cierre. En Apuntado también se puede tocar con 3 ternas + 1 sobrante de menos de 5 puntos;
   el rival juega su último turno y la ronda se liquida.
5. Al terminar la partida se muestra el ganador y el marcador.

Para detener: `docker compose down`. Para borrar también los datos: `docker compose down -v`.

### 4. Desarrollo sin Docker

```bash
# Base de datos: solo el replica set del compose
docker compose up -d mongodb mongo-init

# Backend (http://localhost:3000)
cd backend
cp .env.example .env     # MONGODB_URI=mongodb://localhost:27017/apuntado?directConnection=true y secretos JWT
npm install
npm run start:dev

# Frontend (http://localhost:5173)
cd ../frontend
cp .env.example .env     # VITE_BACKEND_BASE_URL=http://localhost:3000
yarn install
yarn dev
```

### 5. Pruebas

```bash
cd backend && npx jest                      # unitarias, de contrato y casos borde
cd backend && npm run test:e2e              # concurrencia de cierres con replica set en memoria
cd tests/architecture && npm ci && npm test && npm run test:estricto   # fitness functions
cd frontend && yarn test                    # lógica del tablero (traducción de comandos, versiones)
```

### 6. Despliegue en la nube

El backend necesita un host con **WebSockets persistentes**; los entornos *serverless* no sirven
(ADR-05, R06). Topología recomendada:

1. **Base de datos: MongoDB Atlas.** Un clúster M0 ya es un replica set.
   - Cree la base `apuntado` y un usuario de aplicación con permisos `readWrite`.
   - Aplique los validadores y la semilla una vez:
     ```bash
     mongosh "<URI_ATLAS>/apuntado" --file docs/schemas/crear-colecciones.mongodb.js
     mongosh "<URI_ATLAS>/apuntado" --file docker/mongo/seed-disenos-carta.js
     ```
2. **Backend: Render, Railway o Fly.io, como servicio Docker.**
   - Contexto `backend/`, puerto 3000 y *health check* en `/docs`.
   - Variables: `MONGODB_URI` (Atlas), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `APP_PORT=3000`,
     `APP_GLOBAL_PREFIX=api` y `APP_DOCS_URI=docs`.
3. **Frontend**, con una de estas dos opciones:
   - **Mismo contenedor Nginx** (`frontend/Dockerfile`) en el mismo proveedor. Cambie el
     `proxy_pass` de `frontend/nginx.conf` a la URL privada del backend.
   - **Vercel** (ya existe `frontend/vercel.json`). Configure
     `VITE_BACKEND_BASE_URL=https://<backend-publico>` y
     `VITE_FRONTEND_BASE_URL=https://<frontend-publico>`. Estas variables se incrustan al compilar.
4. Pruebe el flujo de humo contra las URLs públicas y revise
   [`docs/checklists-ingenieria.md`](docs/checklists-ingenieria.md#checklist-3-software-release-checklist).

## Estado del MVP y limitaciones conocidas

- **Flujo de juego.** El tablero (`frontend/src/pages/game`) usa `GET /api/partidas/actual` y
  `POST /api/partidas/actual/comandos/{robar|descartar|cerrar}` con `version` e `idComando`, y
  escucha la sala pública `partida:{id}` y la privada `usuario:{id}`. Clásica cierra con 4-3-3;
  Apuntado cierra con 4-3-3 o toca (3 ternas + 1 sobrante de menos de 5 puntos), lo que abre una
  ronda extra en la que cada rival juega un último turno antes de liquidar.
- Reenganche y la bitácora `jugadas` están diseñados (ADR-03, ADR-04), pero no están disponibles en
  el MVP.
- El backend no versiona `package-lock.json` (está en `backend/.gitignore`), así que la imagen
  instala con rangos semver. El frontend sí usa `yarn.lock`.
